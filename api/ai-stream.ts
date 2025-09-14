// api/ai-stream.ts
/* eslint-disable import/no-unused-modules */
import type { VercelRequest, VercelResponse } from '@vercel/node';

function setSSE(res: VercelResponse) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
}

// Stateful filter that removes model "thinking" across chunks.
// Handles <think>...</think>, <|think|> ... <|assistant|>, and ```think ... ```
function createThinkStripper() {
    let inThink = false;
    let inThinkFence = false; // ```think ... ```
    return (chunk: string) => {
        if (!chunk) return '';
        let out = '';
        let i = 0;

        const take = (from: number, to: number) => (to > from ? (out += chunk.slice(from, to)) : undefined);

        while (i < chunk.length) {
            if (inThink || inThinkFence) {
                // search for an end marker
                const endThink = inThink ? chunk.indexOf('</think>', i) : -1;
                const endAssistant = inThink ? chunk.indexOf('<|assistant|>', i) : -1;
                const endFence = inThinkFence ? chunk.indexOf('```', i) : -1;

                let nextEnd = -1, endLen = 0;
                if (inThink) {
                    if (endThink !== -1) { nextEnd = endThink; endLen = '</think>'.length; }
                    else if (endAssistant !== -1) { nextEnd = endAssistant; endLen = '<|assistant|>'.length; }
                }
                if (inThinkFence && endFence !== -1 && (nextEnd === -1 || endFence < nextEnd)) {
                    nextEnd = endFence; endLen = '```'.length;
                }

                if (nextEnd === -1) return out; // consume rest; still inside think
                // skip the end marker and exit think mode
                i = nextEnd + endLen;
                inThink = false; inThinkFence = false;
                continue;
            }

            // not in think: look for any start marker
            const s1 = chunk.indexOf('<think>', i);
            const s2 = chunk.indexOf('<|think|>', i);
            const s3 = chunk.indexOf('```think', i);

            let nextStart = -1, startLen = 0, kind: 'tag' | 'pipe' | 'fence' | null = null;
            if (s1 !== -1) { nextStart = s1; startLen = '<think>'.length; kind = 'tag'; }
            if (s2 !== -1 && (nextStart === -1 || s2 < nextStart)) { nextStart = s2; startLen = '<|think|>'.length; kind = 'pipe'; }
            if (s3 !== -1 && (nextStart === -1 || s3 < nextStart)) { nextStart = s3; startLen = '```think'.length; kind = 'fence'; }

            if (nextStart === -1) {
                // no markers → everything is visible
                take(i, chunk.length);
                break;
            }

            // emit visible text up to the marker
            take(i, nextStart);
            // enter think mode and skip the marker
            if (kind === 'fence') inThinkFence = true; else inThink = true;
            i = nextStart + startLen;
        }
        return out;
    };
}

export const config = { runtime: 'nodejs' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const url = (process.env.RUNPOD_CHAT_URL || '').replace(/\/+$/, '');
    const token = process.env.RUNPOD_CHAT_TOKEN || '';
    if (!url || !token) return res.status(500).json({ error: 'Missing RUNPOD_CHAT_URL or RUNPOD_CHAT_TOKEN' });

    const { messages, model, temperature, max_tokens } =
    (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) || {};
    if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages[] is required' });

    setSSE(res);
    res.write(': connected\n\n'); // comment frame for keepalive-able clients

    const abort = new AbortController();
    req.on('close', () => abort.abort());

    let sentAnyVisible = false;
    const strip = createThinkStripper();

    try {
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

        // Periodic keepalive so proxies don't close idle "thinking" phase
        const keepalive = setInterval(() => res.write(': ping\n\n'), 15000);

        const reader = (upstream.body as any).getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let sepIdx;
            while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
                const rawEvent = buffer.slice(0, sepIdx);
                buffer = buffer.slice(sepIdx + 2);

                // Only handle "data:" lines; ignore comments/fields
                const dataLine = rawEvent.split('\n').find(l => l.startsWith('data:'));
                if (!dataLine) continue;

                const payload = dataLine.slice(5).trim();
                if (payload === '[DONE]') {
                    res.write('data: [DONE]\n\n');
                    break;
                }

                let frame: any;
                try { frame = JSON.parse(payload); } catch { continue; }

                // OpenAI-style: frame.choices[].delta.content
                const choices = Array.isArray(frame?.choices) ? frame.choices : [];
                for (const c of choices) {
                    if (c?.delta?.content) {
                        const visible = strip(String(c.delta.content));
                        if (visible) {
                            c.delta.content = visible;
                            sentAnyVisible = true;
                        } else {
                            // Drop empty deltas (pure thinking)
                            delete c.delta.content;
                        }
                    }
                    // Some reasoning models use c.delta.reasoning — drop it
                    if (c?.delta?.reasoning) delete c.delta.reasoning;
                }

                // If nothing visible in this frame, skip forwarding
                const hasVisible =
                    choices.some((c: any) => typeof c?.delta?.content === 'string' && c.delta.content.length > 0) ||
                    choices.some((c: any) => c?.finish_reason);

                if (hasVisible) {
                    res.write(`data: ${JSON.stringify(frame)}\n\n`);
                } else if (!sentAnyVisible) {
                    // still thinking — keep connection alive via keepalive
                }
            }
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
