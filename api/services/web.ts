// api/services/web.ts
// Minimal SearxNG helper to fetch web snippets for grounding.

export type WebResult = { title: string; url: string; snippet: string };

function timeoutSignal(ms: number) {
    const c = new AbortController();
    const id = setTimeout(() => c.abort(), ms);
    return { signal: c.signal, cancel: () => clearTimeout(id) };
}

function dedupe<T>(arr: T[], key: (x: T) => string) {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const x of arr) {
        const k = key(x);
        if (!seen.has(k)) {
            seen.add(k);
            out.push(x);
        }
    }
    return out;
}

export async function searchWeb(userText: string, {
    topK = 5,
    language = 'en',
    engines = 'bing,ddg,wikipedia',
}: { topK?: number; language?: string; engines?: string } = {}) {
    const base = (process.env.SEARX_URL || '').replace(/\/+$/, '');
    if (!base) return { results: [] as WebResult[], snippetsText: '' };

    const q = userText.trim().slice(0, 300);
    const url = `${base}/search?q=${encodeURIComponent(q)}&engines=${encodeURIComponent(
        engines
    )}&format=json&language=${encodeURIComponent(language)}&categories=general`;

    const { signal, cancel } = timeoutSignal(6000);
    try {
        const r = await fetch(url, { method: 'GET', signal, headers: { 'accept': 'application/json' } });
        const j = await r.json().catch(() => ({}));
        const resultsRaw = Array.isArray(j?.results) ? j.results : [];
        const mapped: WebResult[] = resultsRaw
            .map((r: any) => ({
                title: String(r?.title || '').trim(),
                url: String(r?.url || '').trim(),
                snippet: String(r?.content || r?.snippet || '').replace(/\s+/g, ' ').trim(),
            }))
            .filter((x: WebResult) => x.title && x.url);
        const results = dedupe(mapped, x => x.url).slice(0, topK);

        const snippetsText =
            results.length === 0
                ? ''
                : [
                    '[Web snippets]',
                    ...results.map((r, i) => `${i + 1}) ${r.title} — ${r.url} — ${r.snippet.slice(0, 240)}`)
                ].join('\n');

        return { results, snippetsText };
    } catch {
        return { results: [] as WebResult[], snippetsText: '' };
    } finally {
        cancel();
    }
}
