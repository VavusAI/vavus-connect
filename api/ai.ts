/* eslint-disable import/no-unused-modules */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = { runtime: 'nodejs' };

function safeParseJSON<T = any>(t: string): T | null {
    try { return JSON.parse(t); } catch { return null; }
}
function stripHeuristics(s: string) {
    if (!s) return s;
    let out = s;
    out = out.replace(/```(?:think|thinking|reasoning)[\s\S]*?```/gi, '');
    out = out.replace(/<think>[\s\S]*?<\/think>/gi, '');
    out = out.replace(/<\|think\|>[\s\S]*?(?=<\|assistant\|>)/gi, '');
    out = out.replace(/^\s*reasoning:\s*[\s\S]*?(?=^\S|\Z)/gim, '');
    out = out.replace(
        /^\s*(okay|so|hmm|i'?m|let'?s|i think|i will|i should|the user|they said)\b[\s\S]*?(?=\n{2,}|$)/i,
        ''
    );
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
        if (inner && typeof inner.final === 'string' && inner.final.trim()) {
            return inner.final.trim();
        }
        const t = content.match(/<final>([\s\S]*?)<\/final>/i);
        if (t && t[1]?.trim()) return t[1].trim();
        return stripHeuristics(content);
    }

    if (content && typeof content === 'object' && typeof content.final === 'string') {
        return content.final.trim();
    }

    const embedded = (rawJson.match(/\{[\s\S]*\}/) || [])[0];
    const inner2 = embedded ? safeParseJSON<any>(embedded) : null;
    if (inner2 && typeof inner2.final === 'string' && inner2.final.trim()) {
        return inner2.final.trim();
    }
    return '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const url = (process.env.RUNPOD_CHAT_URL || '').replace(/\/+$/, '');
    const token = process.env.RUNPOD_CHAT_TOKEN || '';
    if (!url || !token) return res.status(500).json({ error: 'Missing RUNPOD_CHAT_URL or RUNPOD_CHAT_TOKEN' });

    const { conversationId, message } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message is required' });

    const messages = [
        { role: 'system', content: 'You are VAVUS AI. Be concise, actionable, and accurate.' },
        { role: 'user', content: message },
        {
            role: 'system',
            content:
                'Reply ONLY as a single JSON object with this exact shape and nothing else:\n' +
                '{ "final": "<the final answer shown to the user>" }',
        },
    ] as const;

    try {
        const upstream = await fetch(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                model: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B',
                messages,
                temperature: 0.3,
                stream: false,
                response_format: { type: 'json_object' },
            }),
        });

        const raw = await upstream.text();
        if (!upstream.ok) return res.status(upstream.status).send(raw || `Upstream ${upstream.status}`);

        const assistantText = extractFinalFromOpenAI(raw);

        // TODO: insert into Supabase (persist conversation/messages)
        return res.status(200).json({ conversationId: conversationId ?? null, reply: assistantText });
    } catch (e: any) {
        return res.status(500).json({ error: String(e?.message || e) });
    }
}
