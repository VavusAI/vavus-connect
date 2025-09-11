// /api/_runpod.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

type RunpodReq = {
    input: any;               // model-specific payload
    // for serverless "runsync": { input: {...} }
};

export async function callRunpod({
                                     url,
                                     token,
                                     input,
                                     timeoutMs = 90000,
                                 }: {
    url: string;
    token: string;
    input: any;
    timeoutMs?: number;
}) {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ input } as RunpodReq),
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Runpod error ${res.status}: ${text}`);
        }

        // Runpod "runsync" typically returns { output: ... }
        const data = await res.json();
        return data;
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
