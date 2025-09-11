// /api/ai.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callRunpod, bad, allowCORS } from './_runpod.js';
import { supabaseAdmin } from './_utils/supabaseAdmin.js';
import { requireUser } from './_utils/auth.js';

const MAX_TURNS = 16;
const MAX_TOKENS = 1024;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    allowCORS(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return bad(res, 405, 'Use POST');

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    let { conversationId, message, temperature = 0.3, system } = body as {
        conversationId?: string;
        message?: string;
        temperature?: number;
        system?: string;
    };

    if (!message) return bad(res, 400, 'message required');

    // Optional auth (allow anonymous)
    let userId: string | null = null;
    try { userId = requireUser(req).userId; } catch {}

    // Create conversation lazily if missing
    if (!conversationId) {
        const { data, error } = await supabaseAdmin
            .from('conversations')
            .insert({ user_id: userId })
            .select('id')
            .single();
        if (error) return bad(res, 500, `DB error: ${error.message}`);
        conversationId = data.id;
    }

    // Load prior messages for context
    const { data: prior, error: histErr } = await supabaseAdmin
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (histErr) return bad(res, 500, `DB error: ${histErr.message}`);

    const history =
        (prior || []).map(m => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content as string,
        })) ?? [];

    if (system) {
        history.unshift({ role: 'system', content: system });
    }

    const messages = [
        ...history.slice(-MAX_TURNS),
        { role: 'user' as const, content: message },
    ];

    // ==== STUB FALLBACK (no Runpod configured) ====
    const RUNPOD_CHAT_URL = process.env.RUNPOD_CHAT_URL;
    const RUNPOD_CHAT_TOKEN = process.env.RUNPOD_CHAT_TOKEN;
    const RUNPOD_CHAT_TIMEOUT = Number(process.env.RUNPOD_CHAT_TIMEOUT || 90000);

    if (!RUNPOD_CHAT_URL || !RUNPOD_CHAT_TOKEN) {
        const assistantText = `(stub) ${message}`;

        // Store both turns (so your DB behaves normally in dev)
        const { error: umErr } = await supabaseAdmin.from('messages').insert({
            conversation_id: conversationId, user_id: userId, role: 'user', content: message,
        });
        if (umErr) return bad(res, 500, umErr.message);

        const { error: amErr } = await supabaseAdmin.from('messages').insert({
            conversation_id: conversationId, user_id: userId, role: 'assistant', content: assistantText,
        });
        if (amErr) return bad(res, 500, amErr.message);

        await supabaseAdmin.from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);

        return res.status(200).json({ conversationId, reply: assistantText, raw: { stub: true } });
    }
    // ==============================================

    // Real Runpod call
    const input = {
        task: 'chat-completions',
        model: 'glm-4.5-air',
        messages,
        temperature,
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

        await supabaseAdmin.from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);

        return res.status(200).json({ conversationId, reply: assistantText, raw: data });
    } catch (e: any) {
        return bad(res, 502, e?.message || 'Upstream chat error');
    }
}
