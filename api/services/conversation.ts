import { supabaseAdmin } from '../_utils/supabaseAdmin';
import type { Msg } from './prompt';

export type Role = 'system' | 'user' | 'assistant';

export type DbMessage = {
    id: string;
    conversation_id: string;
    role: Role;
    content: string;
    created_at: string;
};

export type Rollup = {
    id: string;
    conversation_id: string;
    mode: 'regular' | 'long';
    up_to_message_id: string;
    summary_text: string;
    input_tokens: number | null;
    output_tokens: number | null;
    created_at: string;
};

export async function saveMessage(
    conversationId: string,
    role: Role,
    content: string,
) {
    const { data, error } = await supabaseAdmin
        .from('messages')
        .insert([{ conversation_id: conversationId, role, content }])
        .select()
        .single();

    if (error) throw error;
    return data as DbMessage;
}

export async function getRecentMessages(conversationId: string, n: number) {
    const { data, error } = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    const all = (data || []) as DbMessage[];
    return all.slice(-n);
}

export async function getAllMessages(conversationId: string) {
    const { data, error } = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as DbMessage[];
}

export async function getLatestRollup(conversationId: string, mode: 'regular' | 'long') {
    const { data, error } = await supabaseAdmin
        .from('conversation_rollups')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('mode', mode)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) throw error;
    return (data?.[0] as Rollup) || null;
}

export async function upsertRollup(params: {
    conversationId: string;
    mode: 'regular' | 'long';
    upToMessageId: string;
    summaryText: string;
    inputTokens?: number;
    outputTokens?: number;
}) {
    const { conversationId, mode, upToMessageId, summaryText, inputTokens, outputTokens } = params;

    const { data, error } = await supabaseAdmin
        .from('conversation_rollups')
        .insert([{
            conversation_id: conversationId,
            mode,
            up_to_message_id: upToMessageId,
            summary_text: summaryText,
            input_tokens: inputTokens ?? null,
            output_tokens: outputTokens ?? null,
        }])
        .select()
        .single();

    if (error) throw error;
    return data as Rollup;
}

export async function countUserTurnsSinceLastRollup(conversationId: string, mode: 'regular' | 'long') {
    const latest = await getLatestRollup(conversationId, mode);
    const sinceFilter = latest?.up_to_message_id;

    const { data, error } = await supabaseAdmin
        .from('messages')
        .select('role,id,created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    const all = (data || []) as Pick<DbMessage, 'role' | 'id' | 'created_at'>[];

    let counting = !sinceFilter;
    let userTurns = 0;

    for (const m of all) {
        if (!counting) {
            if (m.id === sinceFilter) counting = true;
            continue;
        }
        if (m.role === 'user') userTurns++;
    }

    return userTurns;
}

export async function getLastMessageId(conversationId: string) {
    const { data, error } = await supabaseAdmin
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) throw error;
    return data?.[0]?.id as string | undefined;
}

/**
 * Legacy helper expected by tests:
 * Summarize a set of messages to approximately targetTokens.
 * Uses OpenRouter GLM-4.5-Air (non-streaming).
 */
export async function summarize(messages: Msg[], targetTokens = 500): Promise<string> {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error('Missing OPENROUTER_API_KEY');

    const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
    const model = 'z-ai/glm-4.5-air:free';
    const site = process.env.OPENROUTER_SITE_URL || 'https://shopvavus.com';
    const title = process.env.OPENROUTER_APP_NAME || 'VAVUS AI';

    const intro =
        `Summarize the following messages into ~${targetTokens} tokens. ` +
        `Be concise, factual, and preserve key decisions, entities, and Q&A. ` +
        `Do NOT include chain-of-thought. Output only the summary.`;

    const stitched = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

    const resp = await fetch(OPENROUTER_API, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': site,
            'X-Title': title,
        },
        body: JSON.stringify({
            model,
            stream: false,
            temperature: 0.1,
            max_tokens: Math.round(targetTokens * 1.2),
            messages: [
                { role: 'system', content: 'You are a careful AI summarizer. Output only the summary.' },
                { role: 'user', content: `${intro}\n\n---\n${stitched}` },
            ],
        }),
    });

    if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`OpenRouter ${resp.status}: ${text}`);
    }

    const data = await resp.json().catch(() => ({}));
    return data?.choices?.[0]?.message?.content ?? '';
}
