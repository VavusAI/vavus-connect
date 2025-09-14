// /api/ai-stream.ts
import { RunpodError } from './_runpod.js';
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

    let r: Response;
    try {
        r = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(upstreamBody),
        });

        if (!r.ok) {
            const text = await r.text().catch(() => '');
            throw new Error(`Runpod ${r.status}: ${text}`);
        }
    } catch (err: any) {
        const headers = new Headers();
        headers.set('Content-Type', 'text/event-stream; charset=utf-8');
        headers.set('Cache-Control', 'no-cache, no-transform');
        headers.set('Connection', 'keep-alive');
        headers.set('X-Accel-Buffering', 'no');

        const encoder = new TextEncoder();
        const body = new ReadableStream({
            start(controller) {
                const msg = JSON.stringify({ error: err?.message || 'fetch failed' });
                controller.enqueue(encoder.encode(`event: error\ndata: ${msg}\n\n`));
                controller.close();
            },
        });

        return new Response(body, { status: 200, headers });
    }

    const headers = new Headers();
    headers.set('Content-Type', 'text/event-stream; charset=utf-8');
    headers.set('Cache-Control', 'no-cache, no-transform');
    headers.set('Connection', 'keep-alive');
    headers.set('X-Accel-Buffering', 'no');

    const encoder = new TextEncoder();
    const upstream = r.body!.getReader();

    let heartbeat: ReturnType<typeof setInterval>;
    const stream = new ReadableStream({
        start(controller) {
            heartbeat = setInterval(() => {
                controller.enqueue(encoder.encode(':heartbeat\n\n'));
            }, 15000);

            async function pump() {
                try {
                    while (true) {
                        const { value, done } = await upstream.read();
                        if (done) break;
                        if (value) controller.enqueue(value);
                    }
                } finally {
                    clearInterval(heartbeat);
                    controller.enqueue(encoder.encode('event: end\ndata: {}\n\n'));
                    controller.close();
                }
            }

            pump();
        },
        cancel(reason) {
            clearInterval(heartbeat);
            upstream.cancel(reason);
        },
    });

    return new Response(stream, { status: 200, headers });
}