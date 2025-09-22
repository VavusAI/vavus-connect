// /api/translate.ts
// Vercel Node serverless route that proxies to your Runpod /translate endpoint.
// Accepts either {text, source, target} or {text, sourceLang, targetLang} from the client,
// forwards {text, source, target} to Runpod, and cleans junk tags from the model output.

import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
    runtime: 'nodejs', // ensure Node runtime (not Edge) so process.env works
};

type Ok = { output: string; raw?: string };
type Err = { error: string; detail?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // --- 1) Safe body parse ---
    let body: any = {};
    try {
        // Depending on Next/Vercel config, req.body may already be an object
        body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    // --- 2) Accept aliases; forward canonical { text, source, target } ---
    const text = String(body.text ?? '').trim();
    const source = String(
        body.source ?? body.sourceLang ?? body.source_lang ?? body.src ?? ''
    ).trim();
    const target = String(
        body.target ?? body.targetLang ?? body.target_lang ?? body.tgt ?? ''
    ).trim();

    if (!text || !source || !target) {
        return res.status(400).json({ error: 'Missing text/source/target' });
    }

    // --- 3) Normalize & validate upstream URL from env ---
    let endpoint = (process.env.MADLAD_RUNPOD_URL ?? '').trim().replace(/\/+$/, '');
    if (!endpoint) {
        return res.status(500).json({ error: 'MADLAD_RUNPOD_URL not set' });
    }
    if (!/^https?:\/\//i.test(endpoint)) {
        endpoint = 'https://' + endpoint; // only add scheme if missing
    }
    try {
        // throws on invalid URL (e.g., "https://https://...")
        // eslint-disable-next-line no-new
        new URL(endpoint);
    } catch {
        return res.status(500).json({ error: 'MADLAD_RUNPOD_URL invalid' });
    }

    // --- 4) Build upstream payload and headers ---
    const payload = { text, source, target };
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    const apiKey = process.env.MADLAD_API_KEY?.trim();
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    // --- 5) Call Runpod /translate and handle errors clearly ---
    try {
        const r = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        const rawText = await r.text(); // read once (can be json or plain text)
        if (!r.ok) {
            return res.status(502).json({ error: `Upstream ${r.status}`, detail: rawText });
        }

        // Some pods return JSON { translation: "..." }, others just plain text
        let data: any = {};
        try {
            data = JSON.parse(rawText);
        } catch {
            data = { translation: rawText };
        }

        const raw = String(data.translation ?? data.output ?? data.text ?? '');

        // --- 6) Clean junk tags: leading "(ro)", "<ro>", "<2en>", etc. ---
        const output = raw
            .replace(/^\s*\([^)]+\)\s*/i, '') // drop leading "(ro)" or "(en-US)" style hints
            .replace(/<[^>]+>/g, '')          // drop any tokenizer tags like <ro>, <2en>, <xx>
            .replace(/\s+/g, ' ')
            .trim();

        return res.status(200).json({ output, raw });
    } catch (err: any) {
        console.error('Translate upstream error:', err);
        return res.status(502).json({
            error: 'Upstream translate error',
            detail: String(err?.message || err),
        });
    }
}
