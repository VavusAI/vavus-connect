/* eslint-disable import/no-unused-modules */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { searchWeb } from './services/web.js';

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

function safeParseJSON<T = any>(t: string): T | null { try { return JSON.parse(t); } catch { return null; } }

function stripHeuristics(s: string) {
    if (!s) return s;
    let out = s;
    out = out.replace(/```(?:think|thinking|reasoning)[\s\S]*?```/gi, '');
    out = out.replace(/<think>[\s\S]*?<\/think>/gi, '');
    out = out.replace(/<\|think\|>[\s\S]*?(?=<\|assistant\|>)/gi, '');
    out = out.replace(/^\s*reasoning:\s*[\s\S]*?(?=^\S|\Z)/gim, '');
    out = out.replace(/^\s*(okay|so|hmm|i'?m|let'?s|i think|i will|i should|the user|they said)\b[\s\S]*?(?=\n{2,}|$)/i, '');
    return out.trim();
}

function extractFinalFromOpenAI(rawJson: string): string {
    const data = safeParseJSON<any>(rawJson) ?? {};
    const output = data?.output ?? data;

    let content: any =
        output?.choices?.[0]?.message?.content ??
        output?.choices?.[0]?.delta?.content ??
        output?.text ?? '';

    if (typeof content === 'string') {
        const inner = safeParseJSON<any>(content);
        if (inner && typeof inner.final === 'string' && inner.final.trim()) return inner.final.trim();
        const t = content.match(/<final>([\s\S]*?)<\/final>/i);
        if (t && t[1]?.trim()) return t[1].trim();
        return stripHeuristics(content);
    }

    if (content && typeof content === 'object' && typeof content.final === 'string') {
        return content.final.trim();
    }

    const embedded = (rawJson.match(/\{[\s\S]*\}/) || [])[0];
    const inner2 = embedded ? safeParseJSON<any>(embedded) : null;
    if (inner2 && typeof inner2.final === 'string' && inner2.final.trim()) return inner2.final.trim();
    return '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const url = (process.env.RUNPOD_CHAT_URL || '').replace(/\/+$/, '');
    const token = process.env.RUNPOD_CHAT_TOKEN || '';
    if (!url || !token) return res.status(500).json({ error: 'Missing RUNPOD_CHAT_URL or RUNPOD_CHAT_TOKEN' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const messages = body?.messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    const web = Boolean(body?.web ?? body?.useInternet);
    const model = body?.model || 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B';
    const temperature = body?.temperature ?? 0.3;
    const max_tokens = body?.max_tokens;

    if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages[] is required' });

    // Build prompt with optional web snippets
    const userText = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    let webSnippets = '';
    let sources: { title: string; url: string }[] = [];

    if (web && userText) {
        const { results, snippetsText } = await searchWeb(userText, { topK: 5, language: 'en' });
        webSnippets = snippetsText;
        sources = results.map(r => ({ title: r.title, url: r.url }));
    }

    const outputContract: { role: 'system'; content: string } = {
        role: 'system',
        content:
            (webSnippets ? `${webSnippets}\n\n` : '') +
            'Reply ONLY as a single JSON object with this exact shape and nothing else:\n' +
            '{ "final": "<the final answer shown to the user>" }\n' +
            (sources.length
                ? `When composing the final answer, ensure it is grounded in the snippets above.`
                : 'Do not invent facts.'),
    };

    setSSE(res);
    res.write(': connected\n\n');
    const keepalive = setInterval(() => res.write(': ping\n\n'), 15000);

    const abort = new AbortController();
    req.on('close', () => abort.abort());

    try {
        // Non-stream upstream call (prevents reasoning leakage)
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
                stream: false,
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

        const final = extractFinalFromOpenAI(String(raw || ''));

        // Stream the clean final
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

        // (Optional) send a metadata frame with sources — harmless for clients that ignore it
        if (sources.length) {
            res.write(`data: ${JSON.stringify({ meta: { sources } })}\n\n`);
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
