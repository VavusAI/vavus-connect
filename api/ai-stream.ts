/* eslint-disable import/no-unused-modules */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = { runtime: 'nodejs' };

function setSSE(res: VercelResponse) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
}

function writeDelta(res: VercelResponse, model: string, chunk: string) {
    const frame = {
        id: `chatcmpl_${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }],
    };
    res.write(`data: ${JSON.stringify(frame)}\n\n`);
}

function stripHeuristics(s: string) {
    if (!s) return s;
    let out = s;

    // Remove obvious self-talk/openings
    out = out.replace(
        /^\s*(okay|so|hmm|i'?m|let'?s|i think|i will|i should|the user|they said)\b[\s\S]*?(?=\n{2,}|$)/i,
        ''
    );

    // Remove “Reasoning:” blocks
    out = out.replace(/^\s*reasoning:\s*[\s\S]*?(?=^\S|\Z)/gim, '');

    // Remove markdown think fences or tags if present
    out = out.replace(/```(?:think|thinking|reasoning)[\s\S]*?```/gi, '');
    out = out.replace(/<think>[\s\S]*?<\/think>/gi, '');
    out = out.replace(/<\|think\|>[\s\S]*?(?=<\|assistant\|>)/gi, '');

    return out.trim();
}

function extractFinalFromText(raw: string) {
    if (!raw) return '';

    // 1) JSON path: {"final": "..."}
    try {
        const j = JSON.parse(raw);
        if (typeof j?.final === 'string' && j.final.trim()) return j.final.trim();
    } catch {
        // maybe the model returned text with a JSON object embedded; try to snip it
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) {
            try {
                const j = JSON.parse(m[0]);
                if (typeof j?.final === 'string' && j.final.trim()) return j.final.trim();
            } catch {}
        }
    }

    // 2) Tag path: <final> ... </final>
    const t = raw.match(/<final>([\s\S]*?)<\/final>/i);
    if (t && t[1]?.trim()) return t[1].trim();

    // 3) Heuristic fallback
    return stripHeuristics(raw);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const url = (process.env.RUNPOD_CHAT_URL || '').replace(/\/+$/, '');
    const token = process.env.RUNPOD_CHAT_TOKEN || '';
    if (!url || !token) return res.status(500).json({ error: 'Missing RUNPOD_CHAT_URL or RUNPOD_CHAT_TOKEN' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const messages = body?.messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    const model = body?.model || 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B';
    const temperature = body?.temperature ?? 0.3;
    const max_tokens = body?.max_tokens;

    if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages[] is required' });

    // Enforce a contract: ONLY JSON with {"final": "..."} — no other text.
    const outputContract: { role: 'system'; content: string } = {
        role: 'system',
        content:
            'You MUST reply ONLY as a single JSON object with this exact shape and nothing else:\n' +
            '{ "final": "<the final answer shown to the user>" }\n' +
            'Never include analysis, explanations, or self-talk outside the JSON. Think silently.',
    };

    setSSE(res);
    res.write(': connected\n\n');
    const keepalive = setInterval(() => res.write(': ping\n\n'), 15000);

    const abort = new AbortController();
    req.on('close', () => abort.abort());

    try {
        const upstream = await fetch(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                model,
                messages: [...messages, outputContract],
                temperature,
                max_tokens,
                stream: false, // single shot to avoid leaking any interim text
                // Some gateways honor this; harmless if ignored:
                response_format: { type: 'json_object' },
            }),
            signal: abort.signal,
        });

        const raw = await upstream.text();
        if (!upstream.ok) {
            clearInterval(keepalive);
            res.status(upstream.status).end(raw || `Upstream ${upstream.status}`);
            return;
        }

        const final = extractFinalFromText(String(raw || ''));

        // Fake-stream only the clean final content
        const target = Math.max(80, Math.min(160, Math.floor(final.length / 40) || 120));
        let i = 0;
        while (i < final.length) {
            const next = Math.min(i + target, final.length);
            let j = next;
            if (j < final.length) {
                const space = final.lastIndexOf(' ', next);
                if (space > i + 20) j = space;
            }
            writeDelta(res, model, final.slice(i, j));
            i = j;
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => setTimeout(r, 10));
        }

        res.write(
            `data: ${JSON.stringify({
                id: `chatcmpl_${Date.now()}`,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model,
                choices: [{ index: 0, message: { role: 'assistant', content: '' }, finish_reason: 'stop' }],
            })}\n\n`
        );
        res.write('data: [DONE]\n\n');
    } catch (err: any) {
        if (!abort.signal.aborted) {
            res.write(`data: ${JSON.stringify({ error: String(err?.message || err) })}\n\n`);
            res.write('data: [DONE]\n\n');
        }
    } finally {
        clearInterval(keepalive);
        res.end();
    }
}
