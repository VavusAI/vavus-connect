import { supabaseAdmin } from '../_utils/supabaseAdmin';
import {
    saveMessage,
    getRecentMessages,
    getAllMessages,
    getLatestRollup,
    upsertRollup,
    countUserTurnsSinceLastRollup,
    getLastMessageId,
    type DbMessage,
} from './conversation';
import { buildRollupPrompt } from './prompt';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'z-ai/glm-4.5-air:free';

async function callOpenRouterJSON(body: any) {
    const key = process.env.OPENROUTER_API_KEY!;
    const site = process.env.OPENROUTER_SITE_URL || 'https://shopvavus.com';
    const title = process.env.OPENROUTER_APP_NAME || 'VAVUS AI';

    const r = await fetch(OPENROUTER_API, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': site,
            'X-Title': title,
        },
        body: JSON.stringify(body),
    });

    if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error(`OpenRouter ${r.status}: ${t}`);
    }
    return r.json();
}

/** Save assistant text and, based on user-turn count, create/refresh rollup */
export async function saveAssistantAndMaybeRollup(params: {
    conversationId: string;
    assistantText: string;
    mode: 'fast' | 'thinking';
    longMode: boolean;
}) {
    const { conversationId, assistantText, longMode } = params;

    // Save assistant message
    await saveMessage(conversationId, 'assistant', assistantText);

    // Determine which mode bucket to evaluate for rollup
    const bucket: 'regular' | 'long' = longMode ? 'long' : 'regular';
    const turns = await countUserTurnsSinceLastRollup(conversationId, bucket);

    // Thresholds: every 4 user turns (regular) / 8 user turns (long)
    const threshold = bucket === 'regular' ? 4 : 8;

    if (turns >= threshold) {
        await computeAndSaveRollup({ conversationId, mode: bucket });
    }
}

/** Force a rollup by recomputing summary over the older messages not covered yet */
export async function forceRollup(params: { conversationId: string; longMode: boolean }) {
    const { conversationId, longMode } = params;
    const bucket: 'regular' | 'long' = longMode ? 'long' : 'regular';
    const roll = await computeAndSaveRollup({ conversationId, mode: bucket });
    return { mode: bucket, rollupId: roll?.id };
}

async function computeAndSaveRollup({ conversationId, mode }: { conversationId: string; mode: 'regular' | 'long' }) {
    // Gather all messages; if you want to cap, you can slice older subset, but
    // GLM-4.5-AIR has a large context, and we're summarizing only the *new* chunk.
    const all = await getAllMessages(conversationId);
    if (!all.length) return null;

    // Determine target token size
    const targetTokens = mode === 'regular' ? 500 : 1000;

    // Determine which chunk to summarize: since the last rollup up_to_message_id (exclusive) to the latest
    const latestRollup = await getLatestRollup(conversationId, mode);
    let startIdx = 0;
    if (latestRollup?.up_to_message_id) {
        const idx = all.findIndex((m) => m.id === latestRollup.up_to_message_id);
        if (idx >= 0) startIdx = idx + 1;
    }

    // We want to summarize *user+assistant* turns since last rollup, but it’s fine to include all roles.
    const chunk = all.slice(startIdx);
    if (!chunk.length) return latestRollup ?? null;

    // Build a summary prompt
    const rollupPrompt = buildRollupPrompt({
        chunkMessages: chunk.map((m) => ({ role: m.role, content: m.content })),
        targetTokens,
    });

    const json = await callOpenRouterJSON({
        model: DEFAULT_MODEL,
        stream: false,
        temperature: 0.1,
        max_tokens: Math.round(targetTokens * 1.2), // headroom
        messages: rollupPrompt,
    });

    const summaryText: string = json?.choices?.[0]?.message?.content ?? '';
    const upTo = await getLastMessageId(conversationId);
    if (!upTo || !summaryText) return latestRollup ?? null;

    const saved = await upsertRollup({
        conversationId,
        mode,
        upToMessageId: upTo,
        summaryText,
        inputTokens: json?.usage?.prompt_tokens ?? null,
        outputTokens: json?.usage?.completion_tokens ?? null,
    });

    return saved;
}
