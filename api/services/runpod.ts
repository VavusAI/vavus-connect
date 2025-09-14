import { Msg } from './prompt.js';
import { callRunpod, RunpodError } from '../_runpod.js';

export async function runpodChat({ model, messages, temperature, max_tokens, logger }:{
    model: string;
    messages: Msg[];
    temperature?: number;
    max_tokens?: number;
    logger?: (info: { url: string; status?: number; body?: string; error?: any }) => void;
}) {
    const url = process.env.RUNPOD_CHAT_URL?.trim();
    const token = process.env.RUNPOD_CHAT_TOKEN?.trim();
    if (!url || !token) {
        const miss = !url && !token
            ? 'RUNPOD_CHAT_URL & RUNPOD_CHAT_TOKEN'
            : (!url ? 'RUNPOD_CHAT_URL' : 'RUNPOD_CHAT_TOKEN');
        throw new Error(`Missing env: ${miss}`);
    }

    try {
        const data = await callRunpod({ url, token, input: { model, messages, temperature, max_tokens }, logger });        const assistantText =
            data?.choices?.[0]?.message?.content ??
            data?.output?.choices?.[0]?.message?.content ??
            data?.output?.text ??
            data?.text ?? '';
        return { data, assistantText: String(assistantText ?? '') };
    } catch (e: any) {
        if (e instanceof RunpodError) {
            throw new RunpodError({ status: e.status, body: e.body, url });
        }
        throw e;
    }
}