// /api/translate.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callRunpod, bad, allowCORS } from './_runpod.js';
import { supabaseAdmin } from './_utils/supabaseAdmin.js';
import { requireUser } from './_utils/auth.js';

const UI_TO_ISO: Record<string, string> = {
    spanish: 'es',
    french: 'fr',
    german: 'de',
    italian: 'it',
    portuguese: 'pt',
    japanese: 'ja',
    korean: 'ko',
    chinese: 'zh',
    arabic: 'ar',
    russian: 'ru',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    allowCORS(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return bad(res, 405, 'Use POST');

    // Strict auth (as in your original translate endpoint)
    let userId: string | null = null;
    try { userId = requireUser(req).userId; } catch (e: any) {
        return bad(res, 401, 'Missing or invalid bearer token');
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    let { text, sourceLang = 'auto', targetLang, model = 'madlad-400' } = body as {
        text?: string;
        sourceLang?: string;
        targetLang?: string;
        model?: string;
    };

    if (!text) return bad(res, 400, 'text required');

    // Normalize UI labels → ISO
    const normSource = UI_TO_ISO[sourceLang?.toLowerCase?.()] ?? sourceLang ?? 'auto';
    const normTarget = targetLang
        ? (UI_TO_ISO[targetLang?.toLowerCase?.()] ?? targetLang)
        : undefined;

    // ==== STUB FALLBACK (no Runpod configured) ====
    const RUNPOD_TRANSLATE_URL = process.env.RUNPOD_TRANSLATE_URL;
    const RUNPOD_TRANSLATE_TOKEN = process.env.RUNPOD_TRANSLATE_TOKEN;
    const RUNPOD_TRANSLATE_TIMEOUT = Number(process.env.RUNPOD_TRANSLATE_TIMEOUT || 90000);

    if (!RUNPOD_TRANSLATE_URL || !RUNPOD_TRANSLATE_TOKEN) {
        const output = `(stub) ${text}`;

        const { error } = await supabaseAdmin.from('translations').insert({
            user_id: userId,
            source_lang: normSource,
            target_lang: normTarget ?? null,
            input_text: text,
            output_text: output,
            model,
        });
        if (error) return bad(res, 500, error.message);

        return res.status(200).json({ output, raw: { stub: true } });
    }
    // ==============================================

    // Real Runpod call
    const input = {
        task: 'translate',
        model,
        text,
        source_lang: normSource,
        target_lang: normTarget,
    };

    try {
        const data = await callRunpod({
            url: RUNPOD_TRANSLATE_URL!,
            token: RUNPOD_TRANSLATE_TOKEN!,
            input,
            timeoutMs: RUNPOD_TRANSLATE_TIMEOUT,
        });

        const output =
            data?.output?.translated_text ??
            data?.output?.text ??
            data?.translated ??
            data?.text ??
            '';

        const { error } = await supabaseAdmin.from('translations').insert({
            user_id: userId,
            source_lang: normSource,
            target_lang: normTarget ?? null,
            input_text: text,
            output_text: output,
            model,
        });
        if (error) return bad(res, 500, error.message);

        return res.status(200).json({ output, raw: data });
    } catch (e: any) {
        return bad(res, 502, e?.message || 'Upstream translate error');
    }
}
