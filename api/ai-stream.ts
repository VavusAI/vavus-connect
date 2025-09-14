/* eslint-disable import/no-unused-modules */
// /api/ai-stream.ts (Vercel edge/node function)
import type { VercelRequest, VercelResponse } from '@vercel/node';

const GLOBAL_SYSTEM = 'You are VAVUS AI. Be concise, actionable, and accurate.';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B';
const RUNPOD_CHAT_URL = process.env.RUNPOD_CHAT_URL!;
const RUNPOD_CHAT_TOKEN = process.env.RUNPOD_CHAT_TOKEN || '';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'POST only' });
        return;
    }
    if (!RUNPOD_CHAT_URL) {
        res.status(500).json({ error: 'RUNPOD_CHAT_URL not set' });
        return;
    }

    // Input from client
    const body = (req.body || {}) as {
        messages?: Msg[];
        max_tokens?: number;
        temperature?: number;
        system?: string;
    };

    const msgs: Msg[] = [
        { role: 'system', content: body.system || GLOBAL_SYSTEM },
        ...(body.messages || []),
    ];

    // Open an SSE stream to client
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    // Call Runpod (OpenAI-compatible /v1/chat/completions)
    const upstream = await fetch(RUNPOD_CHAT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(RUNPOD_CHAT_TOKEN ? { Authorization: `Bearer ${RUNPOD_CHAT_TOKEN}` } : {}),
        },
        body: JSON.stringify({
            model: DEFAULT_MODEL,
            stream: true,
            temperature: body.temperature ?? 0.3,
            max_tokens: body.max_tokens ?? 1024,
            messages: msgs,
        }),
    });

    if (!upstream.ok || !upstream.body) {
        const text = await upstream.text().catch(() => '');
        res.status(upstream.status).json({ error: text || 'Runpod upstream failed' });
        return;
    }

    // Think stripping state
    let inThink = false;
    let carry = '';

    const send = (chunk: string) => {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`);
    };

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder('utf-8');

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            const frames = (carry + text).split('\n\n');
            carry = frames.pop() || '';

            for (const f of frames) {
                const line = f.split('\n').find((l) => l.startsWith('data:'));
                if (!line) continue;
                const payload = line.slice(5).trim();
                if (payload === '[DONE]') {
                    res.write('data: [DONE]\n\n');
                    res.end();
                    return;
                }
                try {
                    const json = JSON.parse(payload);
                    const delta: string = json?.choices?.[0]?.delta?.content ?? '';
                    if (!delta) continue;

                    // Strip <think>…</think> while streaming
                    let out = '';
                    let i = 0;
                    while (i < delta.length) {
                        if (!inThink && delta.slice(i).toLowerCase().startsWith('<think>')) {
                            inThink = true;
                            i += 7;
                            continue;
                        }
                        if (inThink) {
                            const end = delta.slice(i).toLowerCase().indexOf('</think>');
                            if (end === -1) { i = delta.length; continue; }
                            i += end + 8;
                            inThink = false;
                            continue;
                        }
                        out += delta[i];
                        i += 1;
                    }
                    if (out) send(out);
                } catch {
                    // ignore non-JSON keepalives
                }
            }
        }
    } catch (e) {
        // fall through
    }

    res.write('data: [DONE]\n\n');
    res.end();
}
