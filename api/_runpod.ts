// /api/_runpod.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

type RunpodReq = {
    input: any; // model-specific payload
};

export class RunpodError extends Error {
    status: number;
    body: string;
    url: string;

    constructor({ status, body, url }: { status: number; body: string; url: string }) {
        super(`Runpod ${status}: ${body}`);
        this.status = status;
        this.body = body;
        this.url = url;
    }
}

export async function callRunpod({
                                     url,
                                     token,
                                     input,
                                     timeoutMs = 90000,
                                     logger,
                                 }: {
    url: string;
    token?: string;   // now optional
    input: any;
    timeoutMs?: number;
    logger?: (info: { url: string; status?: number; body?: string; error?: any }) => void;
}) {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token && token.trim()) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(url, {
            method: 'POST',
            signal: controller.signal,
            headers,
            body: JSON.stringify({ input } as RunpodReq),
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            const info = { url, status: res.status, body: text };
            console.error('Runpod request failed', info);
            logger?.(info);
            throw new RunpodError({ status: res.status, body: text, url });
        }

        return await res.json(); // Runpod "runsync" typically returns { output: ... }
    } catch (e: any) {
        if (e.name === 'AbortError') {
            const info = { url, error: 'aborted' };
            console.error('Runpod request aborted', info);
            logger?.(info);
            throw new RunpodError({ status: 0, body: 'aborted', url });
        }
        throw e;
    } finally {
        clearTimeout(to);
    }
}

export function bad(res: VercelResponse, code: number, msg: string) {
    return res.status(code).json({ error: msg });
}

export function allowCORS(res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}