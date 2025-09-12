/* eslint-disable import/no-unused-modules */
// /api/ai.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { bad, allowCORS } from './_runpod.js';
import { supabaseAdmin } from './_utils/supabaseAdmin.js';
import { requireUser } from './_utils/auth.js';

const GLOBAL_SYSTEM = 'You are VAVUS AI. Be concise, actionable, and accurate.';
const FAST_MAX_TOKENS = 1024;
const THINK_MAX_TOKENS = 2048;
const WINDOW_TURNS_FAST = 8;
const WINDOW_TURNS_LONG = 12;
const SUMMARY_REFRESH_EVERY = 8;

const SEARXNG_URL = process.env.SEARXNG_URL;
const SEARXNG_TIMEOUT_MS = 8000;

const DEFAULT_MODEL =
    process.env.OPENAI_MODEL || 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };
type WebSource = { id: string; title: string; url: string; snippet: string };

const norm = (s?: string | null) => (s ?? '').trim().replace(/\s+/g, ' ');
const bullets = (arr: string[], cap = 5) =>
    arr.filter(Boolean).slice(0, cap).map(s => `- ${s}`).join('\n');

// -------- Schema auto-detect cache --------
let convColsCache: Set<string> | null = null;

async function getConversationColumns(): Promise<Set<string>> {
    if (convColsCache) return convColsCache;
    const q = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'conversations');

    if (q.error) {
        convColsCache = new Set(['id', 'summary', 'turns_count', 'long_mode_enabled', 'updated_at', 'created_at']);
        return convColsCache;
    }
    convColsCache = new Set<string>((q.data || []).map((r: any) => r.column_name));
    return convColsCache;
}

// -------- Search helper --------
async function fetchSearx(message: string, cap: number): Promise<WebSource[]> {
    if (!SEARXNG_URL) return [];
    const q = encodeURIComponent(message.slice(0, 200));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), SEARXNG_TIMEOUT_MS);
    try {
        const r = await fetch(
            `${SEARXNG_URL}/search?q=${q}&format=json&language=en&categories=general`,
            { signal: ctrl.signal }
        );
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

// --- OpenAI-style call to your Runpod endpoint (non-streaming) ---
async function runpodChat({
                              url, token, body,
                          }: {
    url: string;
    token: string;
    body: { model: string; messages: Msg[]; temperature?: number; max_tokens?: number; };
}) {
    const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
    });

    if (!r.ok) {
        const text = await r.text().catch(() => '');
        console.error('Runpod error body:', (text || '').slice(0, 200));
        throw new Error(`Runpod ${r.status}: ${text || 'no body'}`);
    }

    const data = await r.json();
    const assistantText =
        data?.choices?.[0]?.message?.content ??
        data?.output?.choices?.[0]?.message?.content ??
        data?.output?.text ??
        data?.text ?? '';

    return { data, assistantText: String(assistantText ?? '') };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    allowCORS(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return bad(res, 405, 'Use POST');

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    let {
        conversationId,
        message,
        assistantText, // optional: save exact streamed text
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
        assistantText?: string;
        temperature?: number;
        system?: string;
        mode?: 'normal' | 'thinking';
        longMode?: boolean;
        useInternet?: boolean;
        usePersona?: boolean;
        useWorkspace?: boolean;
    };

    if (!message) return bad(res, 400, 'message required');

    // envs
    const RUNPOD_CHAT_URL = process.env.RUNPOD_CHAT_URL?.trim();
    const RUNPOD_CHAT_TOKEN = process.env.RUNPOD_CHAT_TOKEN?.trim();
    if (!RUNPOD_CHAT_URL || !RUNPOD_CHAT_TOKEN) {
        const miss = !RUNPOD_CHAT_URL && !RUNPOD_CHAT_TOKEN
            ? 'RUNPOD_CHAT_URL & RUNPOD_CHAT_TOKEN'
            : (!RUNPOD_CHAT_URL ? 'RUNPOD_CHAT_URL' : 'RUNPOD_CHAT_TOKEN');
        return bad(res, 500, `Missing env: ${miss}`);
    }

    // detect available columns once per cold start
    const convCols = await getConversationColumns();
    const hasLastSummaryTurn = convCols.has('last_summary_turn');

    // auth (best-effort)
    let userId: string | null = null;
    try { userId = requireUser(req).userId; } catch {}

    // ---- create conversation if needed (TS-safe: select '*') ----
    if (!conversationId) {
        const { data, error } = await supabaseAdmin
            .from('conversations')
            .insert({ user_id: userId })
            .select('*') // avoid typed parser errors with dynamic columns
            .single();
        if (error) return bad(res, 500, `DB error: ${error.message}`);
        conversationId = (data as any).id as string;
    }

    // ---- load history ----
    const { data: prior, error: histErr } = await supabaseAdmin
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
    if (histErr) return bad(res, 500, `DB error: ${histErr.message}`);

    const history: Msg[] = (prior || []).map(m => ({
        role: (m as any).role as Msg['role'],
        content: String((m as any).content ?? ''),
    }));

    // ---- load conversation (TS-safe: select '*') ----
    let conv: any = {
        summary: '',
        turns_count: 0,
        long_mode_enabled: false,
        ...(hasLastSummaryTurn ? { last_summary_turn: 0 } : {}),
    };
    try {
        const { data, error } = await supabaseAdmin
            .from('conversations')
            .select('*')
            .eq('id', conversationId)
            .single();
        if (!error && data) conv = data;
    } catch {}

    // ---- persist longMode override if provided ----
    if (typeof longMode === 'boolean') {
        try {
            await supabaseAdmin
                .from('conversations')
                .update({ long_mode_enabled: longMode })
                .eq('id', conversationId);
        } catch {}
    }
    const longModeEnabled = typeof longMode === 'boolean' ? longMode : !!conv.long_mode_enabled;

    // ---- persona / workspace (best-effort) ----
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
            personaSummary = norm((mem as any)?.persona_summary);
            workspaceNote = norm((ws as any)?.note);
            settings = (stg as any) || {};
        } catch {}
    }
    const personaEnabled = typeof usePersona === 'boolean' ? usePersona : !!settings.use_persona;
    const workspaceEnabled = typeof useWorkspace === 'boolean' ? useWorkspace : !!settings.use_workspace;

    // ---- system prelude ----
    const stableParts: string[] = [GLOBAL_SYSTEM];
    if (personaEnabled && personaSummary) stableParts.push(`User profile: ${personaSummary}`);
    const GLOBAL_PREFIX = norm(stableParts.join(' '));

    // ---- signal hub ----
    const shortSummary = norm(conv.summary);
    const signalBullets: string[] = [];
    if (personaEnabled && personaSummary) {
        signalBullets.push(...personaSummary.split('\n').map(norm).filter(Boolean).slice(0, 3));
    }
    if (shortSummary) {
        signalBullets.push(...shortSummary.split(/[\n•\-]+/).map(norm).filter(Boolean).slice(0, 2));
    }

    // ---- build prompt ----
    const msgs: Msg[] = [];
    msgs.push({ role: 'system', content: GLOBAL_PREFIX });
    if (signalBullets.length) msgs.push({ role: 'system', content: `Signal Hub:\n${bullets(signalBullets, 5)}` });
    if (workspaceEnabled && workspaceNote) msgs.push({ role: 'system', content: `Workspace Memory:\n${workspaceNote}` });
    if (!longModeEnabled && shortSummary) {
        msgs.push({ role: 'system', content: `Conversation summary:\n${shortSummary}` });
    }
    if (system) msgs.push({ role: 'system', content: norm(system) });

    const recentTurns = longModeEnabled ? WINDOW_TURNS_LONG : WINDOW_TURNS_FAST;
    msgs.push(...history.slice(-recentTurns));

    const focusCandidates = history.slice(-4).map(m => norm(m.content)).filter(Boolean);
    if (focusCandidates.length) {
        msgs.push({ role: 'system', content: `Focus Box:\n${bullets(focusCandidates, 5)}` });
    }

    // ---- optional web snippets ----
    let sources: WebSource[] = [];
    if (useInternet && SEARXNG_URL) {
        const cap = longModeEnabled ? 8 : (mode === 'thinking' ? 5 : 3);
        sources = await fetchSearx(message, cap);
        if (sources.length) {
            const note = sources
                .map(s => `[${s.id}] ${s.title} — ${s.url}\n${s.snippet}`)
                .join('\n\n')
                .slice(0, 4000);
            msgs.push({ role: 'system', content: `Web snippets:\n${note}` });
        }
    }

    // ---- user message ----
    msgs.push({ role: 'user', content: message });

    // ---- mode params ----
    const isThinking = mode === 'thinking';
    const MAX_TOKENS = isThinking ? THINK_MAX_TOKENS : FAST_MAX_TOKENS;
    const modelTemp = isThinking ? Math.min(0.5, temperature) : temperature;
    if (isThinking) {
        msgs.splice(1, 0, {
            role: 'system',
            content: 'Think internally. Return a clear final answer plus up to 3 compact bullets with key steps/assumptions.',
        });
    }

    const turnsNext = Number(conv.turns_count || 0) + 1;

    // ----- LLM call (or accept provided assistantText) -----
    let replyText = assistantText ? String(assistantText) : '';
    let data: any = null;
    if (!replyText) {
        try {
            const runpodRes = await runpodChat({
                url: RUNPOD_CHAT_URL!,
                token: RUNPOD_CHAT_TOKEN!,
                body: { model: DEFAULT_MODEL, messages: msgs, temperature: modelTemp, max_tokens: MAX_TOKENS },
            });
            data = runpodRes.data;
            replyText = runpodRes.assistantText;
        } catch (e: any) {
            return bad(res, 502, e?.message || 'Upstream chat error');
        }
    }

    // ----- persist both turns -----
    const { error: umErr } = await supabaseAdmin.from('messages').insert({
        conversation_id: conversationId, user_id: userId, role: 'user', content: message,
    });
    if (umErr) return bad(res, 500, umErr.message);

    const { error: amErr } = await supabaseAdmin.from('messages').insert({
        conversation_id: conversationId, user_id: userId, role: 'assistant', content: replyText,
    });
    if (amErr) return bad(res, 500, amErr.message);

    // update local history for summary
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: replyText });

    // ---- short summary cadence (auto: column-aware) ----
    const doShort = hasLastSummaryTurn
        ? (turnsNext - Number(conv.last_summary_turn || 0) >= SUMMARY_REFRESH_EVERY)
        : (turnsNext % SUMMARY_REFRESH_EVERY === 0);

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
                { role: 'user', content: 'Update the running summary now.' },
            ];

            const { assistantText: newSummary } = await runpodChat({
                url: RUNPOD_CHAT_URL!, token: RUNPOD_CHAT_TOKEN!,
                body: { model: DEFAULT_MODEL, messages: sumMsgs, temperature: 0.1, max_tokens: 600 },
            });

            const summaryClean = norm(newSummary);
            if (summaryClean) {
                updates.summary = summaryClean.slice(0, 6000);
                if (hasLastSummaryTurn) (updates as any).last_summary_turn = turnsNext;
            }
        }
    } catch {
        // best-effort; ignore summary failures
    }

    try {
        await supabaseAdmin.from('conversations').update(updates).eq('id', conversationId);
    } catch {}

    return res.status(200).json({
        conversationId,
        reply: replyText,
        mode,
        longMode: longModeEnabled,
        usedInternet: !!sources.length,
        sources,
        raw: data,
    });
}
