/* eslint-disable import/no-unused-modules */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowCORS, bad } from './_runpod.js';
import { requireUser } from './_utils/auth.js';
import { supabaseAdmin } from './_utils/supabaseAdmin.js';
import { assemblePrompt, stripReasoning, Msg } from './services/prompt.js';
import { runpodChat } from './services/runpod.js';
import { ensureConversation, persistTurn, maybeSummarize } from './services/conversation.js';

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B';
const FAST_MAX_TOKENS = 1024;
const THINK_MAX_TOKENS = 2048;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    allowCORS(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return bad(res, 405, 'Use POST');

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    let {
        conversationId,
        message,
        assistantText,
        temperature = 0.3,
        system,
        mode = 'normal',
        longMode,
        useInternet = false,
        usePersona,
        useWorkspace,
        skipStrip = false,
        noPersist = false,
    } = body as any;

    if (!message) return bad(res, 400, 'message required');

    let userId: string | null = null;
    try { userId = requireUser(req).userId; } catch {}

    const { conversationId: convId, conv, history } = await ensureConversation(conversationId, userId);

    if (typeof longMode === 'boolean') {
        await supabaseAdmin.from('conversations').update({ long_mode_enabled: longMode }).eq('id', convId);
    }
    const longModeEnabled = typeof longMode === 'boolean' ? longMode : !!conv.long_mode_enabled;

    let personaSummary = '', workspaceNote = '', settings: any = {};
    if (userId) {
        try {
            const [{ data: mem }, { data: ws }, { data: stg }] = await Promise.all([
                supabaseAdmin.from('user_memory').select('persona_summary').eq('user_id', userId).single(),
                supabaseAdmin.from('workspace_memory').select('note').eq('user_id', userId).single(),
                supabaseAdmin.from('user_settings').select('use_persona, use_workspace').eq('user_id', userId).single(),
            ]);
            personaSummary = mem?.persona_summary || '';
            workspaceNote = ws?.note || '';
            settings = stg || {};
        } catch {}
    }
    const persona = (typeof usePersona === 'boolean' ? usePersona : !!settings.use_persona) ? personaSummary : '';
    const workspace = (typeof useWorkspace === 'boolean' ? useWorkspace : !!settings.use_workspace) ? workspaceNote : '';

    const { messages: promptMsgs, sources, isThinking } = await assemblePrompt({
        message,
        system,
        history,
        persona,
        workspace,
        summary: conv.summary,
        mode,
        useInternet,
        longMode: longModeEnabled,
    });

    const maxTokens = (isThinking ? THINK_MAX_TOKENS : FAST_MAX_TOKENS) * (longModeEnabled ? 2 : 1);
    const temp = isThinking ? 0.2 : temperature;

    let replyText = assistantText ? String(assistantText) : '';
    let data: any = null;
    if (!replyText) {
        try {
            const runRes = await runpodChat({
                model: DEFAULT_MODEL,
                messages: promptMsgs,
                temperature: temp,
                max_tokens: maxTokens,
            });
            data = runRes.data;
            replyText = runRes.assistantText;
        } catch (e: any) {
            return bad(res, 502, e?.message || 'Upstream chat error');
        }
    }

    replyText = stripReasoning(replyText, skipStrip);

    if (!noPersist) {
        await persistTurn(convId, userId, message, replyText);
        history.push({ role: 'user', content: message }, { role: 'assistant', content: replyText } as Msg);
        const turnsNext = Number(conv.turns_count || 0) + 1;
        await maybeSummarize(convId, history, turnsNext, longModeEnabled);
    }

    return res.status(200).json({
        conversationId: convId,
        reply: replyText,
        mode,
        longMode: longModeEnabled,
        usedInternet: !!sources.length,
        sources,
        raw: data,
    });
}
