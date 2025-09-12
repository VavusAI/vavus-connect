// /app/api/ai/route.ts
export const runtime = 'nodejs';

export async function POST(req: Request) {
    const { messages, temperature = 0.3, max_tokens = 1024, model, session_id } = await req.json();

    const url   = process.env.RUNPOD_CHAT_URL?.trim();
    const token = process.env.RUNPOD_CHAT_TOKEN?.trim();
    if (!url || !token) {
        const miss = !url && !token ? 'RUNPOD_CHAT_URL & RUNPOD_CHAT_TOKEN' : (!url ? 'RUNPOD_CHAT_URL' : 'RUNPOD_CHAT_TOKEN');
        return new Response(JSON.stringify({ error: `Missing env: ${miss}` }), { status: 500 });
    }

    const effectiveModel = model || process.env.OPENAI_MODEL || 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B';

    // NOTE: no "input" wrapper here
    const body = { task: 'chat-completions', model: effectiveModel, session_id, messages, temperature, max_tokens };

    const r = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });

    if (!r.ok) {
        const text = await r.text();
        return new Response(JSON.stringify({ error: `Runpod ${r.status}: ${text}` }), { status: 502 });
    }

    const j = await r.json();
    const reply =
        j?.output?.text ??
        j?.output?.choices?.[0]?.message?.content ??
        j?.choices?.[0]?.message?.content ??
        j?.text ?? '';

    return Response.json({ reply, raw: j });
}
