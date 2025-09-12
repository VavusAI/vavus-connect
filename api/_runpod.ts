// /api/_runpod.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

type RunpodReq = {
    input: any; // model-specific payload
};

export async function callRunpod({
                                     url,
                                     token,
                                     input,
                                     timeoutMs = 90000,
                                 }: {
    url: string;
    token?: string;   // now optional
    input: any;
    timeoutMs?: number;
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
            const text = await res.text();
            throw new Error(`Runpod error ${res.status}: ${text}`);
        }

        return await res.json(); // Runpod "runsync" typically returns { output: ... }
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
