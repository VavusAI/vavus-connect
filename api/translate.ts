// /api/translate.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { codeForApi } from '../src/lib/languages/madlad';
export const config = { runtime: 'nodejs' };

function bad(res: VercelResponse, status: number, msg: string) {
    return res.status(status).json({ error: msg });
}

const MAX_CHARS = Number(process.env.TRANSLATE_MAX_CHARS || 8000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return bad(res, 405, 'Use POST');

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    let { text, sourceLang = 'auto', targetLang, source, target, maxNewTokens = 256, beamSize = 4, temperature = 0.2 } = body;

    const requestedSource = typeof source === 'string' && source.trim() ? source : sourceLang;
    const requestedTarget = typeof target === 'string' && target.trim() ? target : targetLang;

    if (!text || !requestedTarget) return bad(res, 400, 'Missing text/targetLang');

    const safeSource = requestedSource ? codeForApi(requestedSource) : 'auto';
    const safeTarget = codeForApi(requestedTarget);

    if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);

    const endpoint = (process.env.MADLAD_RUNPOD_URL || '').replace(/\/+$/, '');
    if (!endpoint) return bad(res, 500, 'MADLAD_RUNPOD_URL not set');

    const isTGI = /\/generate$/.test(endpoint);

    // --- Build payload for the detected server type ---
    let fetchBody: any;
    if (isTGI) {
        // Text Generation Inference expects "inputs"
        const prompt =
            safeSource === 'auto'
                ? `Translate to ${safeTarget}. Output ONLY the translation.\nText: ${text}`
                : `Translate from ${safeSource} to ${safeTarget}. Output ONLY the translation.\nText: ${text}`;
        fetchBody = {
            inputs: prompt,
            parameters: {
                max_new_tokens: maxNewTokens,
                temperature,
                return_full_text: false
            }
        };
    } else {
        // Custom FastAPI /translate expects top-level fields
        fetchBody = {
            source: safeSource,
            target: safeTarget,

            text,
            max_new_tokens: maxNewTokens,
            beam_size: beamSize,
        };
    }

    try {
        const r = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(process.env.MADLAD_API_KEY ? { Authorization: `Bearer ${process.env.MADLAD_API_KEY}` } : {}),
            },
            body: JSON.stringify(fetchBody),
        });

        const txt = await r.text();
        if (!r.ok) return bad(res, r.status, `Upstream ${r.status}: ${txt}`);

        let data: any = {};
        try { data = JSON.parse(txt); } catch { /* sometimes servers return plain text */ }

        // Normalize outputs
        const output =
            data?.translation ??
            data?.translated ??
            data?.output?.text ??
            data?.output?.translated_text ??
            data?.generated_text ??         // TGI single output
            (Array.isArray(data) && data[0]?.generated_text) ?? // TGI batch
            data?.text ??
            (typeof data === 'string' ? data : '');

        return res.status(200).json({ output, raw: data });
    } catch (e: any) {
        return bad(res, 502, e?.message || 'Upstream translate error');
    }
}
