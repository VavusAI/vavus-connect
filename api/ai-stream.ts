// api/ai-stream.ts
/* eslint-disable import/no-unused-modules */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowCORS, logRunpod } from './_runpod.js';
import { runpodChat } from './services/runpod.js'; // uses RUNPOD_CHAT_URL + RUNPOD_CHAT_TOKEN

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B';

export const config = {
    runtime: 'nodejs', // Node 20 on Vercel
};

function openSSE(res: VercelResponse) {
    // CORS is set by allowCORS; these are SSE specifics:
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
}

function sendDelta(res: VercelResponse, chunk: string) {
    const frame = {
        id: `chatcmpl_${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: DEFAULT_MODEL,
        choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }],
    };
    res.write(`data: ${JSON.stringify(frame)}\n\n`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    allowCORS(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { messages, model, temperature, max_tokens } = (req.body || {}) as {
            messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
            model?: string;
            temperature?: number;
            max_tokens?: number;
        };

        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'messages[] is required' });
        }

        // Start SSE right away so the connection stays alive while Runpod works.
        openSSE(res);
        res.write(':ok\n\n'); // initial comment frame
        const keepalive = setInterval(() => res.write(': keepalive\n\n'), 15000);
        req.on('close', () => clearInterval(keepalive));

        // Call your Runpod worker (runsync). This returns the full text.
        const { assistantText } = await runpodChat({
            model: model || DEFAULT_MODEL,
            messages,
            temperature,
            max_tokens,
            logger: logRunpod,
        });

        // Stream the answer as OpenAI-style delta chunks.
        const text = String(assistantText || '');
        if (text.length === 0) {
            // still send a minimal frame so the client completes cleanly
            sendDelta(res, '');
        } else {
            // chunk by ~80–160 chars, respecting word boundaries
            const target = Math.max(80, Math.min(160, Math.floor(text.length / 40) || 120));
            let i = 0;
            while (i < text.length) {
                const nextCut = Math.min(i + target, text.length);
                let j = nextCut;
                if (j < text.length) {
                    const space = text.lastIndexOf(' ', nextCut);
                    if (space > i + 20) j = space;
                }
                const chunk = text.slice(i, j);
                sendDelta(res, chunk);
                i = j;
                // tiny delay improves UX and prevents buffer coalescing
                await new Promise(r => setTimeout(r, 10));
            }
        }

        // Send final assistant message wrapper (compat) and close.
        res.write(
            `data: ${JSON.stringify({
                id: `chatcmpl_${Date.now()}`,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: model || DEFAULT_MODEL,
                choices: [{ index: 0, message: { role: 'assistant', content: '' }, finish_reason: 'stop' }],
            })}\n\n`
        );

        clearInterval(keepalive);
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (err: any) {
        try {
            res.write(`data: ${JSON.stringify({ error: String(err?.message || err) })}\n\n`);
            res.write('data: [DONE]\n\n');
        } finally {
            res.end();
        }
    }
}
