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
        const { conversationId, message, model = 'glm-4.5-air' } = body;

        if (!message || typeof message !== 'string') {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'message required' }));
            return;
        }

        // create conversation if missing
        let convId = conversationId;
        if (!convId) {
            const title = message.slice(0, 60);
            const { data, error } = await supabaseAdmin
                .from('conversations')
                .insert({ user_id: userId, title, model })
                .select('id')
                .single();
            if (error) throw error;
            convId = data.id;
        }

        // save user message
        const { error: umErr } = await supabaseAdmin.from('messages').insert({
            conversation_id: convId,
            user_id: userId,
            role: 'user',
            content: message,
        });
        if (umErr) throw umErr;

        // TODO: call your real AI endpoint here
        const assistantText = `Echo: ${message}`;

        // save assistant message
        const { error: amErr } = await supabaseAdmin.from('messages').insert({
            conversation_id: convId,
            user_id: userId,
            role: 'assistant',
            content: assistantText,
        });
        if (amErr) throw amErr;

        // update conversation timestamp
        await supabaseAdmin
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', convId);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ conversationId: convId, reply: assistantText }));
    } catch (e: any) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e?.message ?? 'Unauthorized' }));
    }
}
