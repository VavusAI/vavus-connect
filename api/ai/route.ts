// /app/api/ai/route.ts
export const runtime = 'nodejs';

export async function POST(req: Request) {
    const body = await req.json();

    const url   = process.env.RUNPOD_CHAT_URL?.trim();
    const token = process.env.RUNPOD_CHAT_TOKEN?.trim();
    if (!url || !token) {
        return new Response(JSON.stringify({ error: 'Missing Runpod env vars' }), { status: 500 });
    }

    const r = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),   // <-- send body directly
    });

    if (!r.ok) {
        const text = await r.text();
        console.error('Runpod error body:', text.slice(0,200));
        return new Response(JSON.stringify({ error: `Runpod ${r.status}: ${text}` }), { status: 502 });
    }

    return new Response(r.body, { status: r.status, headers: r.headers });
}
