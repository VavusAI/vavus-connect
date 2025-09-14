// api/ai-stream.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
    runtime: 'nodejs20',
};

/** Minimal CORS helper so preflight (OPTIONS) doesn't return 405 */
function setCORS(res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*'); // same-origin? you can lock this down
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCORS(res);

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).send('POST only');
        return;
    }

    const RUNPOD_CHAT_URL = process.env.RUNPOD_CHAT_URL;
    const RUNPOD_CHAT_TOKEN = process.env.RUNPOD_CHAT_TOKEN;
    if (!RUNPOD_CHAT_URL || !RUNPOD_CHAT_TOKEN) {
        res.status(500).send('Runpod not configured');
        return;
    }

    const {
        model = 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B',
        temperature = 0.3,
        max_tokens = 1024,
        messages = [],
    } = (req.body ?? {}) as {
        model?: string;
        temperature?: number;
        max_tokens?: number;
        messages?: { role: 'system' | 'user' | 'assistant'; content: string }[];
    };

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    // Call upstream (Runpod chat completions compatible with OpenAI stream format)
    const upstream = await fetch(RUNPOD_CHAT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RUNPOD_CHAT_TOKEN}`,
        },
        body: JSON.stringify({
            model,
            stream: true,
            temperature,
            max_tokens,
            messages,
        }),
    });

    if (!upstream.ok || !upstream.body) {
        const text = await upstream.text().catch(() => '');
        res.status(upstream.status).end(text || 'Upstream failed');
        return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder('utf-8');

    // Optional: keepalive ping so proxies don’t close the pipe
    const keepalive = setInterval(() => {
        try {
            res.write(': ping\n\n');
        } catch {
            clearInterval(keepalive);
        }
    }, 15000);

    const forward = (chunk: string) => {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`);
    };

    // Strip <think>…</think> on the fly so the UI never sees chain-of-thought
    let inThink = false;

    try {
        let carry = '';
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });

            // Upstream is already SSE. Split frames and relay.
            const frames = (carry + text).split('\n\n');
            carry = frames.pop() || '';

            for (const f of frames) {
                const line = f.split('\n').find((l) => l.startsWith('data:'));
                if (!line) continue;
                const payload = line.slice(5).trim();
                if (payload === '[DONE]') {
                    res.write('data: [DONE]\n\n');
                    clearInterval(keepalive);
                    res.end();
                    return;
                }
                try {
                    const json = JSON.parse(payload);
                    const delta: string = json?.choices?.[0]?.delta?.content ?? '';
                    if (!delta) continue;

                    // filter reasoning
                    let out = '';
                    let i = 0;
                    while (i < delta.length) {
                        if (!inThink && delta.slice(i).toLowerCase().startsWith('<think>')) {
                            inThink = true;
                            i += 7;
                            continue;
                        }
                        if (inThink) {
                            const closeIdx = delta.slice(i).toLowerCase().indexOf('</think>');
                            if (closeIdx === -1) {
                                i = delta.length; // swallow until we see </think>
                                continue;
                            }
                            i += closeIdx + 8;
                            inThink = false;
                            continue;
                        }
                        out += delta[i];
                        i += 1;
                    }

                    if (out) forward(out);
                } catch {
                    // ignore malformed frames
                }
            }
        }

        // graceful end
        clearInterval(keepalive);
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (e: any) {
        clearInterval(keepalive);
        // If the client disconnects, write will throw; just end.
        try {
            res.write(`data: ${JSON.stringify({ error: e?.message || 'stream aborted' })}\n\n`);
        } catch {}
        res.end();
    }
}
