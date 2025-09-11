import { supabaseAdmin } from './_utils/supabaseAdmin';
import { requireUser } from './_utils/auth';

export default async function handler(req: any, res: any) {
    try {
        if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end();
            return;
        }

        const { userId } = requireUser(req);
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        const { text, sourceLang = 'auto', targetLang, model = 'madlad-400' } = body;

        if (!text) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'text required' }));
            return;
        }

        // TODO: call your real translator here
        const output = text;

        const { error } = await supabaseAdmin.from('translations').insert({
            user_id: userId,
            source_lang: sourceLang,
            target_lang: targetLang ?? null,
            input_text: text,
            output_text: output,
            model,
        });
        if (error) throw error;

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ output }));
    } catch (e: any) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e?.message ?? 'Unauthorized' }));
    }
}
