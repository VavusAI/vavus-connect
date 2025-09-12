export const runtime = 'nodejs';

export async function POST(req: Request) {
    const { messages, temperature = 0.3, max_tokens = 1024, model, session_id } = await req.json();

    const url   = process.env.RUNPOD_CHAT_URL?.trim();
    const token = process.env.RUNPOD_CHAT_TOKEN?.trim();
    if (!url || !token) {
        const missing = !url && !token ? 'RUNPOD_CHAT_URL & RUNPOD_CHAT_TOKEN'
            : !url ? 'RUNPOD_CHAT_URL' : 'RUNPOD_CHAT_TOKEN';
        return new Response(JSON.stringify({ error: `Missing env: ${missing}` }), { status: 500 });
    }

    const effectiveModel = model || process.env.OPENAI_MODEL || 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B';

    const common = { task: 'chat-completions', model: effectiveModel, session_id, messages, temperature, max_tokens };

    // Attempt 1: RunPod runsync format (expects { input: {...} })
    let r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ input: common }),
    });

    // If the pod says "messages missing", retry with direct body (OpenAI-style servers)
    let j: any;
    try { j = await r.json(); } catch { /* ignore */ }

    const missingMessages =
        r.status === 400 &&
        (j?.error?.message?.some?.((e: any) => e?.loc?.[0] === 'body' && e?.loc?.[1] === 'messages') ||
            /messages.*required/i.test(JSON.stringify(j)));

    if (missingMessages) {
        r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(common),
        });
        try { j = await r.json(); } catch { /* ignore */ }
    }

    if (!r.ok) {
        return new Response(JSON.stringify({ error: `Runpod ${r.status}: ${typeof j === 'object' ? JSON.stringify(j) : await r.text()}` }), { status: 502 });
    }

    const text =
        j?.output?.text ??
        j?.output?.choices?.[0]?.message?.content ??
        j?.output?.choices?.[0]?.text ??
        j?.choices?.[0]?.message?.content ?? // OpenAI-style
        j?.text ?? '';

    return Response.json({ reply: text, raw: j });
}
