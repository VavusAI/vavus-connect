// api/ai-stream.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
    runtime: 'nodejs', // ← 'nodejs20' is invalid on Vercel; use 'nodejs' or remove this
};

function setCORS(res: VercelResponse) {
    // Tighten this to your origin if you don't need wildcard
    res.setHeader('Access-Control-Allow-Origin', '*');
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

    // Keepalive comments so proxies don’t terminate the stream
    const keepalive = setInterval(() => {
        try {
            res.write(': ping\n\n');
        } catch {
            clearInterval(keepalive);
        }
    }, 15000);

    // Abort if client disconnects
    res.on('close', () => {
        try { clearInterval(keepalive); } catch {}
    });

    // Call upstream (OpenAI-compatible chat completions)
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
        clearInterval(keepalive);
        res.status(upstream.status).end(text || 'Upstream failed');
        return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder('utf-8');

    // Inline chain-of-thought filter
    let inThink = false;
    let carry = '';

    const forward = (chunk: string) => {
        res.write(
            `data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`
        );
    };

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });

            // Upstream already uses SSE; split frames and forward
            const frames = (carry + text).split('\n\n');
            carry = frames.pop() || '';

            for (const f of frames) {
                const line = f.split('\n').find((l) => l.startsWith('data:'));
                if (!line) continue;
                const payload = line.slice(5).trim();

                if (payload === '[DONE]') {
                    clearInterval(keepalive);
                    res.write('data: [DONE]\n\n');
                    res.end();
                    return;
                }

                try {
                    const json = JSON.parse(payload);
                    const delta: string = json?.choices?.[0]?.delta?.content ?? '';
                    if (!delta) continue;

                    // strip <think>…</think>
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

        clearInterval(keepalive);
        res.write('data: [DONE]\n\n');
        res.end();
    } catch {
        clearInterval(keepalive);
        res.end();
    }
}
