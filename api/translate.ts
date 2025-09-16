// /api/translate.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callRunpod, bad, allowCORS, logRunpod } from './_runpod.js';
import { supabaseAdmin } from './_utils/supabaseAdmin.js';
import { requireUser } from './_utils/auth.js';

export const config = { runtime: 'nodejs' };

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

const MAX_CHARS = Number(process.env.TRANSLATE_MAX_CHARS || 8000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    allowCORS(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return bad(res, 405, 'Use POST');

    // Auth
    let userId: string | null = null;
    try {
        userId = requireUser(req).userId;
    } catch {
        return bad(res, 401, 'Missing or invalid bearer token');
    }

    // Body
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    let {
        text,
        sourceLang = 'auto',
        targetLang,
        model = 'madlad-400',
    }: {
        text?: string;
        sourceLang?: string;
        targetLang?: string;
        model?: string;
    } = body;

    if (!text || !text.trim()) return bad(res, 400, 'text required');
    if (!targetLang || typeof targetLang !== 'string') return bad(res, 400, 'targetLang required');

    // Trim/Cap input defensively
    if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);

    // Normalize to BCP-47 (keep legacy UI words as fallback)
    const normSource = (UI_TO_ISO[sourceLang?.toLowerCase?.()] ?? sourceLang ?? 'auto').trim();
    const normTarget = (UI_TO_ISO[targetLang?.toLowerCase?.()] ?? targetLang).trim();

    const RUNPOD_TRANSLATE_URL = process.env.RUNPOD_TRANSLATE_URL;
    const RUNPOD_TRANSLATE_TOKEN = process.env.RUNPOD_TRANSLATE_TOKEN;
    const RUNPOD_TRANSLATE_TIMEOUT = Number(process.env.RUNPOD_TRANSLATE_TIMEOUT || 90000);

    // Stub fallback if not configured
    if (!RUNPOD_TRANSLATE_URL || !RUNPOD_TRANSLATE_TOKEN) {
        const output = `(stub) ${text}`;
        const { error } = await supabaseAdmin.from('translations').insert({
            user_id: userId,
            source_lang: normSource,
            target_lang: normTarget,
            input_text: text,
            output_text: output,
            model,
        });
        if (error) return bad(res, 500, error.message);
        return res.status(200).json({ output, raw: { stub: true } });
    }

    // Real call to RunPod translator microservice
    const input = {
        task: 'translate',
        model,
        text,
        source_lang: normSource,  // 'auto' allowed here
        target_lang: normTarget,  // REQUIRED
    };

    const started = Date.now();
    try {
        const data = await callRunpod({
            url: RUNPOD_TRANSLATE_URL!,
            token: RUNPOD_TRANSLATE_TOKEN!,
            input,
            timeoutMs: RUNPOD_TRANSLATE_TIMEOUT,
            logger: logRunpod,
        });

        // Normalize output field names
        const output =
            data?.output?.translated_text ??
            data?.output?.text ??
            data?.translated ??
            data?.text ??
            '';

        const latency_ms = Date.now() - started;

        const { error } = await supabaseAdmin.from('translations').insert({
            user_id: userId,
            source_lang: normSource,
            target_lang: normTarget,
            input_text: text,
            output_text: output,
            model,
            latency_ms,
        });
        if (error) return bad(res, 500, error.message);

        return res.status(200).json({ output, raw: data });
    } catch (e: any) {
        return bad(res, 502, e?.message || 'Upstream translate error');
    }
}
