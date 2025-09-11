/* eslint-disable import/no-unused-modules */
// /api/ai.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callRunpod, bad, allowCORS } from './_runpod.js';
import { supabaseAdmin } from './_utils/supabaseAdmin.js';
import { requireUser } from './_utils/auth.js';

const GLOBAL_SYSTEM = 'You are VAVUS AI. Be concise, actionable, and accurate.';
const FAST_MAX_TOKENS = 1024;
const THINK_MAX_TOKENS = 2048;
const WINDOW_TURNS_FAST = 8;
const WINDOW_TURNS_LONG = 12;
const SUMMARY_REFRESH_EVERY = 8;
const CORE_REFRESH_EVERY = 10;
const APPENDIX_REFRESH_EVERY = 18;

const SEARXNG_URL = process.env.SEARXNG_URL;          // e.g. http://127.0.0.1:8080
const SEARXNG_TIMEOUT_MS = 8000;

const norm = (s?: string | null) => (s ?? '').trim().replace(/\s+/g, ' ');
const bullets = (arr: string[], cap = 5) => arr.filter(Boolean).slice(0, cap).map(s => `- ${s}`).join('\n');

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };
type WebSource = { id: string; title: string; url: string; snippet: string };

async function fetchSearx(message: string, cap: number): Promise<WebSource[]> {
    if (!SEARXNG_URL) return [];
    const q = encodeURIComponent(message.slice(0, 200));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), SEARXNG_TIMEOUT_MS);
    try {
        const r = await fetch(`${SEARXNG_URL}/search?q=${q}&format=json&language=en&categories=general`, { signal: ctrl.signal });
        const j: any = await r.json();
        const items: WebSource[] = (j?.results || [])
            .slice(0, cap)
            .map((it: any, i: number) => ({
                id: `S${i + 1}`,
                title: norm(it.title || ''),
                url: it.url || it.link || '',
                snippet: norm(it.content || it.snippet || ''),
            }))
            .filter(x => x.url && (x.title || x.snippet));
        return items;
    } catch {
        return [];
    } finally {
        clearTimeout(timer);
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    allowCORS(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return bad(res, 405, 'Use POST');

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    let {
        conversationId,
        message,
        temperature = 0.3,
        system,
        mode = 'normal',
        longMode,
        useInternet = false,
        usePersona,
        useWorkspace
    } = body as {
        conversationId?: string;
        message?: string;
        temperature?: number;
        system?: string;
        mode?: 'normal' | 'thinking';
        longMode?: boolean;
        useInternet?: boolean;
        usePersona?: boolean;
        useWorkspace?: boolean;
    };

    if (!message) return bad(res, 400, 'message required');

    let userId: string | null = null;
    try { userId = requireUser(req).userId; } catch {}

    // Create conversation if needed
    if (!conversationId) {
        const { data, error } = await supabaseAdmin
            .from('conversations')
            .insert({ user_id: userId })
            .select('id, summary, turns_count, last_summary_turn, long_mode_enabled, core_summary, extended_appendix, last_core_turn, last_appendix_turn')
            .single();
        if (error) return bad(res, 500, `DB error: ${error.message}`);
        conversationId = data.id;
    }

    // History
    const { data: prior, error: histErr } = await supabaseAdmin
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
    if (histErr) return bad(res, 500, `DB error: ${histErr.message}`);

    const history: Msg[] = (prior || []).map(m => ({
        role: m.role as Msg['role'],
        content: String(m.content ?? ''),
    }));

    // Conversation row
    let conv: any = { summary: '', turns_count: 0, last_summary_turn: 0, long_mode_enabled: false };
    try {
        const { data, error } = await supabaseAdmin
            .from('conversations')
            .select('summary, turns_count, last_summary_turn, long_mode_enabled, core_summary, extended_appendix, last_core_turn, last_appendix_turn')
            .eq('id', conversationId)
            .single();
        if (!error && data) conv = data;
    } catch {}

    // Persist longMode override if provided
    if (typeof longMode === 'boolean') {
        try { await supabaseAdmin.from('conversations').update({ long_mode_enabled: longMode }).eq('id', conversationId); } catch {}
    }
    const longModeEnabled = typeof longMode === 'boolean' ? longMode : !!conv.long_mode_enabled;

    // Persona / workspace (opt-in)
    let personaSummary = '';
    let workspaceNote = '';
    let settings: { use_persona?: boolean; use_workspace?: boolean } = {};
    if (userId) {
        try {
            const [{ data: mem }, { data: ws }, { data: stg }] = await Promise.all([
                supabaseAdmin.from('user_memory').select('persona_summary').eq('user_id', userId).single(),
                supabaseAdmin.from('workspace_memory').select('note').eq('user_id', userId).single(),
                supabaseAdmin.from('user_settings').select('use_persona, use_workspace').eq('user_id', userId).single(),
            ]);
            personaSummary = norm(mem?.persona_summary);
            workspaceNote = norm(ws?.note);
            settings = stg || {};
        } catch {}
    }
    const personaEnabled = typeof usePersona === 'boolean' ? usePersona : !!settings.use_persona;
    const workspaceEnabled = typeof useWorkspace === 'boolean' ? useWorkspace : !!settings.use_workspace;

    // Stable, cacheable prefix
    const stableParts: string[] = [GLOBAL_SYSTEM];
    if (personaEnabled && personaSummary) stableParts.push(`User profile: ${personaSummary}`);
    const GLOBAL_PREFIX = norm(stableParts.join(' '));

    // Signal Hub
    const shortSummary = norm(conv.summary);
    const signalBullets: string[] = [];
    if (personaEnabled && personaSummary) {
        signalBullets.push(...personaSummary.split('\n').map(norm).filter(Boolean).slice(0, 3));
    }
    if (shortSummary) {
        signalBullets.push(...shortSummary.split(/[\n•\-]+/).map(norm).filter(Boolean).slice(0, 2));
    }

    // Long-memory blocks
    const coreSummary = norm(conv.core_summary);
    const appendix = norm(conv.extended_appendix);

    // Build prompt
    const msgs: Msg[] = [];
    msgs.push({ role: 'system', content: GLOBAL_PREFIX });
    if (signalBullets.length) msgs.push({ role: 'system', content: `Signal Hub:\n${bullets(signalBullets, 5)}` });
    if (workspaceEnabled && workspaceNote) msgs.push({ role: 'system', content: `Workspace Memory:\n${workspaceNote}` });
    if (longModeEnabled) {
        if (coreSummary) msgs.push({ role: 'system', content: `Core Summary:\n${coreSummary}` });
        if (appendix) msgs.push({ role: 'system', content: `Extended Appendix:\n${appendix}` });
    } else if (shortSummary) {
        msgs.push({ role: 'system', content: `Conversation summary:\n${shortSummary}` });
    }
    if (system) msgs.push({ role: 'system', content: norm(system) });

    const recentTurns = longModeEnabled ? WINDOW_TURNS_LONG : WINDOW_TURNS_FAST;
    msgs.push(...history.slice(-recentTurns));

    const focusCandidates = history.slice(-4).map(m => norm(m.content)).filter(Boolean);
    if (focusCandidates.length) msgs.push({ role: 'system', content: `Focus Box:\n${bullets(focusCandidates, 5)}` });

    // Internet snippets (optional)
    let sources: WebSource[] = [];
    if (useInternet && SEARXNG_URL) {
        const cap = longModeEnabled ? 8 : (mode === 'thinking' ? 5 : 3);
        sources = await fetchSearx(message, cap);
        if (sources.length) {
            const note = sources.map(s => `[${s.id}] ${s.title} — ${s.url}\n${s.snippet}`).join('\n\n').slice(0, 4000);
            msgs.push({ role: 'system', content: `Web snippets:\n${note}` });
        }
    }

    // User question
    msgs.push({ role: 'user', content: message });

    // Mode params
    const isThinking = mode === 'thinking';
    const MAX_TOKENS = isThinking ? THINK_MAX_TOKENS : FAST_MAX_TOKENS;
    const modelTemp = isThinking ? Math.min(0.5, temperature) : temperature;
    if (isThinking) {
        msgs.splice(1, 0, { role: 'system',
            content: 'Think internally. Return a clear final answer plus up to 3 compact bullets with key steps/assumptions.' });
    }

    const RUNPOD_CHAT_URL = process.env.RUNPOD_CHAT_URL;
    const RUNPOD_CHAT_TOKEN = process.env.RUNPOD_CHAT_TOKEN;
    const RUNPOD_CHAT_TIMEOUT = Number(process.env.RUNPOD_CHAT_TIMEOUT || 90000);

    const turnsNext = Number(conv.turns_count || 0) + 1;

    // Stub
    if (!RUNPOD_CHAT_URL || !RUNPOD_CHAT_TOKEN) {
        const assistantText = `(stub) ${message}`;

        const { error: umErr } = await supabaseAdmin.from('messages').insert({
            conversation_id: conversationId, user_id: userId, role: 'user', content: message,
        });
        if (umErr) return bad(res, 500, umErr.message);

        const { error: amErr } = await supabaseAdmin.from('messages').insert({
            conversation_id: conversationId, user_id: userId, role: 'assistant', content: assistantText,
        });
        if (amErr) return bad(res, 500, amErr.message);

        await supabaseAdmin.from('conversations').update({
            updated_at: new Date().toISOString(),
            turns_count: turnsNext
        }).eq('id', conversationId);

        return res.status(200).json({
            conversationId,
            reply: assistantText,
            mode,
            longMode: longModeEnabled,
            usedInternet: !!sources.length,
            sources
        });
    }

    // Real Runpod call
    const input = {
        task: 'chat-completions',
        model: 'glm-4.5-air',
        session_id: conversationId, // helps server-side KV reuse
        messages: msgs,
        temperature: modelTemp,
        max_tokens: MAX_TOKENS,
    };

    try {
        const data = await callRunpod({
            url: RUNPOD_CHAT_URL!,
            token: RUNPOD_CHAT_TOKEN!,
            input,
            timeoutMs: RUNPOD_CHAT_TIMEOUT,
        });

        const assistantText =
            data?.output?.text ??
            data?.output?.choices?.[0]?.message?.content ??
            data?.output?.choices?.[0]?.text ??
            data?.text ?? '';

        // Store both turns
        const { error: umErr } = await supabaseAdmin.from('messages').insert({
            conversation_id: conversationId, user_id: userId, role: 'user', content: message,
        });
        if (umErr) return bad(res, 500, umErr.message);

        const { error: amErr } = await supabaseAdmin.from('messages').insert({
            conversation_id: conversationId, user_id: userId, role: 'assistant', content: assistantText,
        });
        if (amErr) return bad(res, 500, amErr.message);

        // Summary refresh cadence (best-effort)
        const doShort = turnsNext - Number(conv.last_summary_turn || 0) >= SUMMARY_REFRESH_EVERY;
        const doCore  = longModeEnabled && turnsNext - Number(conv.last_core_turn || 0) >= CORE_REFRESH_EVERY;
        const doAppx  = longModeEnabled && turnsNext - Number(conv.last_appendix_turn || 0) >= APPENDIX_REFRESH_EVERY;

        const updates: Record<string, any> = {
            turns_count: turnsNext,
            updated_at: new Date().toISOString(),
        };

        try {
            if (doShort) {
                const sumMsgs: Msg[] = [
                    { role: 'system', content:
                            'Summarize the conversation so far into 200–400 words: goals, decisions (+why), constraints, open tasks. ' +
                            'Use short bullets; compact and durable; no quotes.' },
                    ...history.slice(-12),
                    { role: 'user', content: 'Update the running summary now.' }
                ];
                const s = await callRunpod({
                    url: RUNPOD_CHAT_URL!, token: RUNPOD_CHAT_TOKEN!,
                    input: { task: 'chat-completions', model: 'glm-4.5-air', messages: sumMsgs, temperature: 0.1, max_tokens: 600 },
                    timeoutMs: RUNPOD_CHAT_TIMEOUT,
                });
                const newSummary = norm(s?.output?.text ?? s?.output?.choices?.[0]?.message?.content ?? '');
                if (newSummary) {
                    updates.summary = newSummary.slice(0, 6000);
                    updates.last_summary_turn = turnsNext;
                }
            }

            if (doCore) {
                const coreMsgs: Msg[] = [
                    { role: 'system', content:
                            'Produce a Core Summary (≤1000 tokens): curated, deduped recap of goals, decisions (+why), constraints, ' +
                            'key definitions, and open tasks. No redundancy.' },
                    ...history.slice(-16),
                    { role: 'user', content: 'Update the Core Summary now.' }
                ];
                const c = await callRunpod({
                    url: RUNPOD_CHAT_URL!, token: RUNPOD_CHAT_TOKEN!,
                    input: { task: 'chat-completions', model: 'glm-4.5-air', messages: coreMsgs, temperature: 0.1, max_tokens: 1200 },
                    timeoutMs: RUNPOD_CHAT_TIMEOUT,
                });
                const coreText = norm(c?.output?.text ?? c?.output?.choices?.[0]?.message?.content ?? '');
                if (coreText) {
                    updates.core_summary = coreText.slice(0, 16000);
                    updates.last_core_turn = turnsNext;
                }
            }

            if (doAppx) {
                const appMsgs: Msg[] = [
                    { role: 'system', content:
                            'Produce an Extended Appendix (≤1500 tokens): stable addendum with canonical definitions, pivotal examples, ' +
                            'brief rationale trails, and key IDs/links. Avoid duplication with Core Summary.' },
                    ...history.slice(-20),
                    { role: 'user', content: 'Update the Extended Appendix now.' }
                ];
                const a = await callRunpod({
                    url: RUNPOD_CHAT_URL!, token: RUNPOD_CHAT_TOKEN!,
                    input: { task: 'chat-completions', model: 'glm-4.5-air', messages: appMsgs, temperature: 0.1, max_tokens: 1600 },
                    timeoutMs: RUNPOD_CHAT_TIMEOUT,
                });
                const appText = norm(a?.output?.text ?? a?.output?.choices?.[0]?.message?.content ?? '');
                if (appText) {
                    updates.extended_appendix = appText.slice(0, 24000);
                    updates.last_appendix_turn = turnsNext;
                }
            }
        } catch {}

        try { await supabaseAdmin.from('conversations').update(updates).eq('id', conversationId); } catch {}

        return res.status(200).json({
            conversationId,
            reply: assistantText,
            mode,
            longMode: longModeEnabled,
            usedInternet: !!sources.length,
            sources,
            raw: data
        });
    } catch (e: any) {
        return bad(res, 502, e?.message || 'Upstream chat error');
    }
}
