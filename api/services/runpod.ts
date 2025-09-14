// api/services/runpod.ts
import { Msg } from './prompt.js';
import { callRunpod, RunpodError } from '../_runpod.js';

type Args = {
    model: string;
    messages: Msg[];
    temperature?: number;
    max_tokens?: number;
    logger?: (info: { url: string; status?: number; body?: string; error?: any }) => void;
};

export async function runpodChat({ model, messages, temperature, max_tokens, logger }: Args) {
    const url = process.env.RUNPOD_CHAT_URL?.trim();
    const token = process.env.RUNPOD_CHAT_TOKEN?.trim();
    if (!url || !token) {
        const miss = !url && !token ? 'RUNPOD_CHAT_URL & RUNPOD_CHAT_TOKEN' : (!url ? 'RUNPOD_CHAT_URL' : 'RUNPOD_CHAT_TOKEN');
        throw new Error(`Missing env: ${miss}`);
    }

    const isOpenAI = /\/v1\/chat\/completions\/?$/.test(url);

    if (isOpenAI) {
        // Speak OpenAI JSON directly
        const headers: Record<string, string> = {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
        };
        let resp: Response, text: string;
        try {
            resp = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({ model, messages, temperature, max_tokens, stream: false }),
            });
            text = await resp.text();
            logger?.({ url, status: resp.status, body: text.slice(0, 800) });
        } catch (error) {
            logger?.({ url, error });
            throw new RunpodError({ status: 599, body: String(error), url });
        }
        if (!resp.ok) throw new RunpodError({ status: resp.status, body: text, url });

        const data: any = text ? JSON.parse(text) : {};
        const assistantText =
            data?.choices?.[0]?.message?.content ??
            data?.choices?.[0]?.delta?.content ?? // defensive
            data?.text ?? '';
        return { data, assistantText: String(assistantText ?? '') };
    }

    // Otherwise treat as Runpod "runsync" worker (expects { input: ... })
    const payload = { model, messages, temperature, max_tokens };
    const data: any = await callRunpod({ url, token, input: payload, logger });
    const assistantText =
        data?.choices?.[0]?.message?.content ??
        data?.output?.choices?.[0]?.message?.content ??
        data?.output?.text ??
        data?.text ?? '';
    return { data, assistantText: String(assistantText ?? '') };
}
