// /api/chat.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callRunpod, bad, allowCORS } from './_runpod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    allowCORS(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return bad(res, 405, 'Use POST');

    const RUNPOD_CHAT_URL = process.env.RUNPOD_CHAT_URL!;
    const RUNPOD_CHAT_TOKEN = process.env.RUNPOD_CHAT_TOKEN!;
    const RUNPOD_CHAT_TIMEOUT = Number(process.env.RUNPOD_CHAT_TIMEOUT || 90000);

    if (!RUNPOD_CHAT_URL || !RUNPOD_CHAT_TOKEN) {
        return bad(res, 500, 'Chat model not configured on the server.');
    }

    // Expecting: { messages: [{role:'user'|'assistant'|'system', content:string}], temperature?: number }
    const { messages, temperature = 0.3 } = req.body || {};
    if (!Array.isArray(messages)) return bad(res, 400, 'Missing messages[]');

    // Adapt the "input" object to match your Runpod handler schema.
    // Common pattern for custom handlers:
    const input = {
        task: 'chat-completions',
        model: 'glm-4.5-air',
        messages,
        temperature,
        max_tokens: 1024,
    };

    try {
        const data = await callRunpod({
            url: RUNPOD_CHAT_URL,
            token: RUNPOD_CHAT_TOKEN,
            input,
            timeoutMs: RUNPOD_CHAT_TIMEOUT,
        });

        // Normalize to { text, raw }
        const text =
            data?.output?.text ??
            data?.output?.choices?.[0]?.message?.content ??
            data?.output?.choices?.[0]?.text ??
            data?.text ??
            '';

        return res.status(200).json({ text, raw: data });
    } catch (e: any) {
        return bad(res, 502, e.message || 'Upstream chat error');
    }
}
