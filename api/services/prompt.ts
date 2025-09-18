// --- Types expected by tests ---
export type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

// Strip any chain-of-thought style blocks before showing/saving
export function stripReasoning(s: string): string {
    if (!s) return s;
    let out = s;
    out = out.replace(/<think>[\s\S]*?<\/think>/gi, '');
    out = out.replace(/```(?:thinking|reasoning)[\s\S]*?```/gi, '');
    out = out.replace(/<\/?think>/gi, '');
    return out.trim();
}

import type { DbMessage } from './conversation';

export function baseSystemPrompt() {
    return 'You are VAVUS AI. Be concise, actionable, and accurate. Do not reveal internal notes or chain-of-thought.';
}

/** Build the final prompt list: system → [rollup?] → lastN → user */
export function buildPrompt({
                                system = baseSystemPrompt(),
                                rollupText,
                                recent,
                                userMessage,
                            }: {
    system?: string;
    rollupText?: string | null;
    recent: Pick<DbMessage, 'role' | 'content'>[];
    userMessage: string;
}) {
    const msgs: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
    msgs.push({ role: 'system', content: system });

    if (rollupText) {
        msgs.push({
            role: 'system',
            content:
                `Conversation summary (older context, concise):\n${rollupText}\n\nUse this to stay consistent. Do not restate it verbatim.`,
        });
    }

    for (const m of recent) {
        msgs.push({ role: m.role, content: m.content });
    }

    msgs.push({ role: 'user', content: userMessage });
    return msgs;
}

/** Prompt for generating rollups of a target size */
export function buildRollupPrompt({
                                      chunkMessages,
                                      targetTokens,
                                  }: {
    chunkMessages: Pick<DbMessage, 'role' | 'content'>[];
    targetTokens: number;
}) {
    const intro =
        `Summarize the following conversation turns into ~${targetTokens} tokens. ` +
        `Keep it neutral, factual, and compact. Emphasize goals, decisions, facts, named entities, and important Q&A. ` +
        `Do NOT include chain-of-thought.`;

    const stitched = chunkMessages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');

    return [
        { role: 'system' as const, content: 'You are a careful AI summarizer. Output only the summary.' },
        { role: 'user' as const, content: `${intro}\n\n---\n${stitched}` },
    ];
}
