// /api/ai-stream.ts
export const config = { runtime: 'edge' };

type Role = 'system' | 'user' | 'assistant';
type ChatMsg = { role: Role; content: string };

type ReqBody = {
    conversationId?: string;              // now optional
    messages: ChatMsg[];                  // should already include system + rollup + recent + user
    mode?: 'fast' | 'thinking';
    longMode?: boolean;
    temperature?: number;
    model?: string;
    serverPersist?: boolean;              // opt-in: if true AND conversationId present, save+rollup server-side
};

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'z-ai/glm-4.5-air:free';

function buildReasoning(mode?: 'fast' | 'thinking') {
    // GLM-4.5-Air supports unified reasoning control. Exclude CoT from output.
    if (mode === 'thinking') return { enabled: true, effort: 'medium', exclude: true };
    return { enabled: false };
}

/** Parse SSE 'data:' lines to collect assistant delta text only */
function extractDeltaFromSSEChunk(chunkText: string): string {
    let acc = '';
    const blocks = chunkText.split('\n\n');
    for (const block of blocks) {
        const line = block.split('\n').find((l) => l.startsWith('data:'));
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
        conversationId,                 // optional now
        messages = [],
        mode = 'fast',
        longMode = false,
        temperature = 0.3,
        model = DEFAULT_MODEL,
        serverPersist = false,          // OFF by default
    } = body;

    // Basic validation
    if (!Array.isArray(messages) || messages.length === 0) {
        return new Response('Missing messages', { status: 400 });
    }

    const key = process.env.OPENROUTER_API_KEY;
    if (!key) return new Response('Missing OPENROUTER_API_KEY', { status: 500 });

    const site = process.env.OPENROUTER_SITE_URL || req.headers.get('origin') || 'https://shopvavus.com';
    const title = process.env.OPENROUTER_APP_NAME || 'VAVUS AI';

    const maxTokens = longMode ? 2048 : 1024;
    const reasoning = buildReasoning(mode);

    // Upstream request to OpenRouter (OpenAI-compatible)
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

    // Stream to client while accumulating assistant text for optional persistence
    const { readable, writable } = new TransformStream();
    const reader = upstream.body.getReader();
    const writer = writable.getWriter();
    const decoder = new TextDecoder();

    let assistantFull = '';

    (async () => {
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                if (value) {
                    // Tee upstream bytes to client
                    await writer.write(value);
                    // Accumulate assistant text for saving/rollup
                    assistantFull += extractDeltaFromSSEChunk(decoder.decode(value, { stream: true }));
                }
            }
        } catch {
            // ignore streaming errors; client already got partial tokens
        } finally {
            try { await writer.close(); } catch {}
            // Fire-and-forget persistence ONLY if explicitly requested and we have an id
            if (serverPersist && conversationId && assistantFull) {
                fetch('/api/rollup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'save_and_maybe_rollup',
                        conversationId,
                        assistantText: assistantFull,
                        mode,
                        longMode,
                    }),
                }).catch(() => {});
            }
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
