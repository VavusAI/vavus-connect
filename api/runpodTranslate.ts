// /api/runpodTranslate.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callRunpod, bad, allowCORS } from './_runpod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    allowCORS(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return bad(res, 405, 'Use POST');

    const RUNPOD_TRANSLATE_URL = process.env.RUNPOD_TRANSLATE_URL!;
    const RUNPOD_TRANSLATE_TOKEN = process.env.RUNPOD_TRANSLATE_TOKEN!;
    const RUNPOD_TRANSLATE_TIMEOUT = Number(process.env.RUNPOD_TRANSLATE_TIMEOUT || 90000);

    if (!RUNPOD_TRANSLATE_URL || !RUNPOD_TRANSLATE_TOKEN) {
        return bad(res, 500, 'Translator not configured on the server.');
    }

    // Expecting: { text: string, target: string, source?: string }
    const { text, target, source = 'auto' } = req.body || {};
    if (!text || !target) return bad(res, 400, 'Missing { text, target }');

    // Adapt the "input" object to match your Runpod handler schema.
    const input = {
        task: 'translate',
        model: 'madlad-400',
        text,
        source_lang: source,
        target_lang: target,
    };

    try {
        const data = await callRunpod({
            url: RUNPOD_TRANSLATE_URL,
            token: RUNPOD_TRANSLATE_TOKEN,
            input,
            timeoutMs: RUNPOD_TRANSLATE_TIMEOUT,
        });

        // Normalize to { translated, raw }
        const translated =
            data?.output?.translated_text ??
            data?.output?.text ??
            data?.translated ??
            data?.text ??
            '';

        return res.status(200).json({ translated, raw: data });
    } catch (e: any) {
        return bad(res, 502, e.message || 'Upstream translate error');
    }
}
