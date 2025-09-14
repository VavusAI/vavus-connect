import { Msg } from './prompt.js';

export async function runpodChat({ model, messages, temperature, max_tokens }:{
    model: string;
    messages: Msg[];
    temperature?: number;
    max_tokens?: number;
}) {
    const url = process.env.RUNPOD_CHAT_URL?.trim();
    const token = process.env.RUNPOD_CHAT_TOKEN?.trim();
    if (!url || !token) {
        const miss = !url && !token
            ? 'RUNPOD_CHAT_URL & RUNPOD_CHAT_TOKEN'
            : (!url ? 'RUNPOD_CHAT_URL' : 'RUNPOD_CHAT_TOKEN');
        throw new Error(`Missing env: ${miss}`);
    }

    const r = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ model, messages, temperature, max_tokens }),
    });

    if (!r.ok) {
        const text = await r.text().catch(() => '');
        throw new Error(`Runpod ${r.status}: ${text || 'no body'}`);
    }

    const data = await r.json();
    const assistantText =
        data?.choices?.[0]?.message?.content ??
        data?.output?.choices?.[0]?.message?.content ??
        data?.output?.text ??
        data?.text ?? '';
    return { data, assistantText: String(assistantText ?? '') };
}
