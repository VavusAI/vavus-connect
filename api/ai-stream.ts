/* eslint-disable import/no-unused-modules */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = { runtime: 'nodejs' };

// Remove any model "thinking" before sending to the client.
function stripThinkAll(s: string) {
    if (!s) return s;
    let out = s;
    // <think> ... </think>
    out = out.replace(/<think>[\s\S]*?<\/think>/gi, '');
    // <|think|> ... <|assistant|>
    out = out.replace(/<\|think\|>[\s\S]*?(?=<\|assistant\|>)/gi, '');
    // ```think ... ```
    out = out.replace(/```(?:think|thinking|reasoning|chain[- ]?of[- ]?thought)[\s\S]*?```/gi, '');
    // Any leftover explicit “Reasoning:” blocks at line starts
    out = out.replace(/^\s*Reasoning:\s*[\s\S]*?(?=^\S|\Z)/gim, '');
    return out.trim();
}

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const url = (process.env.RUNPOD_CHAT_URL || '').replace(/\/+$/, '');
    const token = process.env.RUNPOD_CHAT_TOKEN || '';
    if (!url || !token) return res.status(500).json({ error: 'Missing RUNPOD_CHAT_URL or RUNPOD_CHAT_TOKEN' });

    // Parse body
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const messages = body?.messages;
    const model = body?.model || 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B';
    const temperature = body?.temperature ?? 0.3;
    const max_tokens = body?.max_tokens;

    if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages[] is required' });

    // Open SSE to the browser immediately (spinner shows while we wait)
    setSSE(res);
    res.write(': connected\n\n');
    const keepalive = setInterval(() => res.write(': ping\n\n'), 15000);

    const abort = new AbortController();
    req.on('close', () => abort.abort());

    try {
        // IMPORTANT: ask upstream for a single, non-streamed result.
        const upstream = await fetch(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                max_tokens,
                stream: false,
            }),
            signal: abort.signal,
        });

        const raw = await upstream.text();
        if (!upstream.ok) {
            clearInterval(keepalive);
            res.status(upstream.status).end(raw || `Upstream ${upstream.status}`);
            return;
        }

        // Support several shapes (OpenAI-compat, Runpod wrappers, etc.)
        let data: any = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch {}
        const output = data?.output ?? data;

        let finalText =
            output?.choices?.[0]?.message?.content ??
            output?.choices?.[0]?.delta?.content ?? // some gateways
            output?.text ??
            '';

        finalText = stripThinkAll(String(finalText || ''));

        // Now "fake-stream" the clean text as OpenAI delta frames.
        const target = Math.max(80, Math.min(160, Math.floor(finalText.length / 40) || 120));
        let i = 0;
        while (i < finalText.length) {
            const next = Math.min(i + target, finalText.length);
            let j = next;
            if (j < finalText.length) {
                const space = finalText.lastIndexOf(' ', next);
                if (space > i + 20) j = space;
            }
            const chunk = finalText.slice(i, j);
            writeDelta(res, model, chunk);
            i = j;
            // small delay so the UI feels live
            // eslint-disable-next-line no-await-in-loop
            await new Promise(r => setTimeout(r, 10));
        }

        // Finish frame + DONE
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
