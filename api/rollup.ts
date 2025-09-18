export const config = { runtime: 'edge' };

// A tiny facade endpoint so the streaming route can fire-and-forget persistence & rollups
// without blocking the SSE close. It delegates to services/rollup.ts functions.

type Req = {
    action: 'save_and_maybe_rollup' | 'force_rollup';
    conversationId: string;
    assistantText?: string;                 // required for save_and_maybe_rollup
    mode?: 'fast' | 'thinking';            // for metadata only
    longMode?: boolean;                     // determines 4 vs 8 turns & 500 vs 1000 tokens
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') return new Response('Only POST', { status: 405 });

    const { action, conversationId, assistantText, mode, longMode } = (await req.json().catch(() => ({}))) as Req;

    if (!conversationId) return new Response('Missing conversationId', { status: 400 });

    try {
        // Dynamically import to keep Edge bundle lean
        const { saveAssistantAndMaybeRollup, forceRollup } = await import('./services/rollup');

        if (action === 'save_and_maybe_rollup') {
            if (typeof assistantText !== 'string') {
                return new Response('assistantText required', { status: 400 });
            }
            await saveAssistantAndMaybeRollup({ conversationId, assistantText, mode: mode ?? 'fast', longMode: !!longMode });
            return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
        }

        if (action === 'force_rollup') {
            const out = await forceRollup({ conversationId, longMode: !!longMode });
            return new Response(JSON.stringify({ ok: true, ...out }), { headers: { 'Content-Type': 'application/json' } });
        }

        return new Response('Unknown action', { status: 400 });
    } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: e?.message || 'rollup failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
