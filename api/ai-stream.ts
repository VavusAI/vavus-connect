// /api/ai-stream.ts
export const runtime = 'nodejs';

export async function POST(req: Request) {
    const url   = process.env.RUNPOD_CHAT_URL?.trim();
    const token = process.env.RUNPOD_CHAT_TOKEN?.trim();
    if (!url || !token) {
        return new Response(JSON.stringify({ error: 'Missing RUNPOD_CHAT_URL or RUNPOD_CHAT_TOKEN' }), { status: 500 });
    }

    const body = await req.json();
    const { max_tokens, ...rest } = body || {};

    // Always request a stream and respect client-provided max_tokens
    const upstreamBody = {
        ...rest,
        max_tokens: max_tokens ?? 4096,
        stream: true,
    };

    const r = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(upstreamBody),
    });

    if (!r.ok) {
        const text = await r.text().catch(() => '');
        return new Response(JSON.stringify({ error: `Runpod ${r.status}: ${text}` }), { status: 502 });
    }

    // Pass through SSE stream unchanged
    const headers = new Headers();
    headers.set('Content-Type', 'text/event-stream; charset=utf-8');
    headers.set('Cache-Control', 'no-cache, no-transform');
    headers.set('Connection', 'keep-alive');
    headers.set('X-Accel-Buffering', 'no');

    return new Response(r.body, { status: 200, headers });
}
