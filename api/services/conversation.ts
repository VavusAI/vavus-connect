import { runpodChat } from './runpod.js';
import { stripReasoning, norm, Msg } from './prompt.js';

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B';
const SUMMARY_REFRESH_EVERY = 8;

export async function ensureConversation(conversationId: string | undefined, userId: string | null) {
    const { supabaseAdmin } = await import('../_utils/supabaseAdmin.js');
    if (!conversationId) {
        const { data, error } = await supabaseAdmin
            .from('conversations')
            .insert({ user_id: userId })
            .select('*')
            .single();
        if (error) throw new Error(`DB error: ${error.message}`);
        conversationId = (data as any).id as string;
    }

    const { data: prior, error: histErr } = await supabaseAdmin
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
    if (histErr) throw new Error(`DB error: ${histErr.message}`);

    const history: Msg[] = (prior || []).map(m => ({
        role: (m as any).role as Msg['role'],
        content: String((m as any).content ?? ''),
    }));

    let conv: any = { summary: '', turns_count: 0, long_mode_enabled: false };
    try {
        const { data } = await supabaseAdmin
            .from('conversations')
            .select('*')
            .eq('id', conversationId)
            .single();
        if (data) conv = data;
    } catch {}

    return { conversationId, conv, history };
}

export async function persistTurn(conversationId: string, userId: string | null, message: string, reply: string) {
    const { supabaseAdmin } = await import('../_utils/supabaseAdmin.js');
    const { error: umErr } = await supabaseAdmin.from('messages').insert({
        conversation_id: conversationId,
        user_id: userId,
        role: 'user',
        content: message,
    });
    if (umErr) throw new Error(umErr.message);

    const { error: amErr } = await supabaseAdmin.from('messages').insert({
        conversation_id: conversationId,
        user_id: userId,
        role: 'assistant',
        content: reply,
    });
    if (amErr) throw new Error(amErr.message);
}

export async function summarize(history: Msg[], longMode: boolean, chat = runpodChat): Promise<string> {
    const sumMsgs: Msg[] = [
        { role: 'system', content:
                'Summarize the conversation so far into 200–400 words: goals, decisions (+why), constraints, open tasks. Use short bullets; compact and durable; no quotes.' },
        ...history,
        { role: 'user', content: 'Update the running summary now.' },
    ];
    const { assistantText } = await chat({
        model: DEFAULT_MODEL,
        messages: sumMsgs,
        temperature: 0.1,
        max_tokens: longMode ? 1200 : 600,
    });
    return stripReasoning(norm(assistantText));
}

export async function maybeSummarize(conversationId: string, history: Msg[], turnsNext: number, longMode: boolean) {
    const { supabaseAdmin } = await import('../_utils/supabaseAdmin.js');
    const updates: Record<string, any> = { turns_count: turnsNext, updated_at: new Date().toISOString() };
    if (turnsNext > 4 && turnsNext % SUMMARY_REFRESH_EVERY === 0) {
        try {
            const summary = await summarize(history, longMode);
            if (summary) updates.summary = summary.slice(0, longMode ? 12000 : 6000);
        } catch {
            // ignore summarization errors
        }
    }
    await supabaseAdmin.from('conversations').update(updates).eq('id', conversationId);
}
