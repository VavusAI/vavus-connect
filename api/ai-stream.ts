export const config = { runtime: 'edge' };

type Role = 'system' | 'user' | 'assistant';
type ChatMsg = { role: Role; content: string };

type ReqBody = {
    conversationId: string;
    messages: ChatMsg[];            // will already include system + rollup + recent turns + user
    mode?: 'fast' | 'thinking';
    longMode?: boolean;
    temperature?: number;
    model?: string;                 // default GLM 4.5 Air (free)
};

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'z-ai/glm-4.5-air:free';

function buildReasoning(mode?: 'fast' | 'thinking') {
    // GLM-4.5-Air supports unified "reasoning" control.
    // We exclude chain-of-thought from output to avoid leakage.
    if (mode === 'thinking') {
        return { enabled: true, effort: 'medium', exclude: true };
    }
    return { enabled: false };
}

/** Parse SSE 'data:' lines to collect assistant delta text only */
function extractDeltaFromSSEChunk(chunkText: string): string {
    let acc = '';
    const blocks = chunkText.split('\n\n');
    for (const block of blocks) {
        const line = block.split('\n').find(l => l.startsWith('data:'));
        if (!line) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
            const json = JSON.parse(payload);
            const delta =
                json?.choices?.[0]?.delta?.content ??
                json?.choices?.[0]?.message?.content ??
                '';
            if (delta) acc += delta;
        } catch {
            // ignore non-JSON keepalives
        }
    }
    return acc;
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') return new Response('Only POST', { status: 405 });

    const body = (await req.json().catch(() => ({}))) as ReqBody;
    const {
        conversationId,
        messages = [],
        mode = 'fast',
        longMode = false,
        temperature = 0.3,
        model = DEFAULT_MODEL,
    } = body;

    if (!conversationId) {
        return new Response('Missing conversationId', { status: 400 });
    }

    const key = process.env.OPENROUTER_API_KEY;
    if (!key) return new Response('Missing OPENROUTER_API_KEY', { status: 500 });

    const site = process.env.OPENROUTER_SITE_URL || req.headers.get('origin') || 'https://shopvavus.com';
    const title = process.env.OPENROUTER_APP_NAME || 'VAVUS AI';

    const maxTokens = longMode ? 2048 : 1024;
    const reasoning = buildReasoning(mode);

    // Call OpenRouter
    const upstream = await fetch(OPENROUTER_API, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': site,
            'X-Title': title,
        },
        body: JSON.stringify({
            model,
            stream: true,
            temperature,
            max_tokens: maxTokens,
            reasoning,
            messages,
        }),
    });

    if (!upstream.ok || !upstream.body) {
        const text = await upstream.text().catch(() => '');
        return new Response(`OpenRouter error ${upstream.status}: ${text}`, { status: 500 });
    }

    // We need to both stream to the client and capture the final assistant text to save + rollup.
    const { readable, writable } = new TransformStream();
    const reader = upstream.body.getReader();
    const writer = writable.getWriter();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    let assistantFull = '';

    (async () => {
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                if (value) {
                    // Tee to client
                    await writer.write(value);
                    // Accumulate assistant text for DB save
                    const chunkText = decoder.decode(value, { stream: true });
                    assistantFull += extractDeltaFromSSEChunk(chunkText);
                }
            }
        } catch {
            // swallow streaming errors; client already gets partial
        } finally {
            try { await writer.close(); } catch {}
            // Save assistant message and trigger rollup logic in the background (no await)
            // Fire-and-forget: call our own edge endpoint for persistence.
            fetch('/api/rollup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Include assistant text to be saved, then compute rollup server-side
                body: JSON.stringify({
                    conversationId,
                    assistantText: assistantFull,
                    mode,
                    longMode,
                    // We assume the *user* message has already been saved by the client pre-send,
                    // or server has logic to save both; if not, extend your client to POST user msg first.
                    // If you already save inside this route, you can wire directly to Supabase here instead
                    // of hitting /api/rollup; this indirection avoids blocking the stream end.
                    action: 'save_and_maybe_rollup',
                }),
            }).catch(() => {});
        }
    })();

    return new Response(readable, {
        status: 200,
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}
