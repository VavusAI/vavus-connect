// api/ai-stream.ts
/* eslint-disable import/no-unused-modules */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = { runtime: 'nodejs' };

function setSSE(res: VercelResponse) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const url = (process.env.RUNPOD_CHAT_URL || '').replace(/\/+$/, '');
    const token = process.env.RUNPOD_CHAT_TOKEN || '';
    if (!url || !token) return res.status(500).json({ error: 'Missing RUNPOD_CHAT_URL or RUNPOD_CHAT_TOKEN' });

    // parse body
    const { messages, model, temperature, max_tokens } =
    (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};

    if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages[] is required' });

    // open SSE to the browser early
    setSSE(res);
    res.write(': connected\n\n');

    const abort = new AbortController();
    req.on('close', () => abort.abort());

    try {
        // Always POST to OpenAI-compat with stream:true
        const upstream = await fetch(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                model: model || 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B',
                messages,
                temperature,
                max_tokens,
                stream: true,
            }),
            signal: abort.signal,
        });

        if (!upstream.ok || !upstream.body) {
            const body = await upstream.text().catch(() => '');
            res.status(upstream.status).end(body || `Upstream ${upstream.status}`);
            return;
        }

        // pipe upstream SSE -> client
        const reader = (upstream.body as any).getReader();
        const keepalive = setInterval(() => res.write(': ping\n\n'), 15000);

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value)); // pass through raw SSE bytes
        }

        clearInterval(keepalive);
        res.end();
    } catch (err: any) {
        if (abort.signal.aborted) return; // client disconnected
        res.write(`data: ${JSON.stringify({ error: String(err?.message || err) })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
    }
}
