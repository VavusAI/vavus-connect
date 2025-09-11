export async function POST(req: Request) {
    const body = await req.json();
    const r = await fetch(`${process.env.OPENAI_BASE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return new Response(r.body, { status: r.status, headers: r.headers });
}
