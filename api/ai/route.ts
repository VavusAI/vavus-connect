export const runtime = 'nodejs';

export async function POST(req: Request) {
    const { messages, temperature = 0.2, max_tokens = 1024, model } = await req.json();

    const url   = process.env.RUNPOD_CHAT_URL?.trim();
    const token = process.env.RUNPOD_CHAT_TOKEN?.trim();
    if (!url || !token) {
        const missing = !url && !token ? 'RUNPOD_CHAT_URL & RUNPOD_CHAT_TOKEN'
            : !url ? 'RUNPOD_CHAT_URL' : 'RUNPOD_CHAT_TOKEN';
        return new Response(JSON.stringify({ error: `Missing env: ${missing}` }), { status: 500 });
    }

    const effectiveModel = model || process.env.OPENAI_MODEL || 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B';

    const rpBody = {
        input: {
            task: 'chat-completions',
            model: effectiveModel,
            messages,
            temperature,
            max_tokens,
        },
    };

    const r = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(rpBody),
    });

    if (!r.ok) {
        const text = await r.text();
        return new Response(JSON.stringify({ error: `Runpod ${r.status}: ${text}` }), { status: 502 });
    }

    const j = await r.json();
    const text =
        j?.output?.text ??
        j?.output?.choices?.[0]?.message?.content ??
        j?.output?.choices?.[0]?.text ?? '';

    return Response.json({ reply: text, raw: j });
}