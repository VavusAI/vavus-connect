export type WebSnippet = { title?: string; url?: string; snippet?: string };

export async function searchAndSummarize(query: string, maxResults = 5): Promise<WebSnippet[]> {
    const url = process.env.SEARCH_API_URL;
    if (!url) return [];
    try {
        const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, max_results: maxResults }),
        });
        if (!r.ok) return [];
        const data = await r.json().catch(() => null);
        const items: any[] = Array.isArray(data) ? data : data?.results || [];
        return items.slice(0, maxResults).map((it) => ({
            title: it?.title,
            url: it?.url,
            snippet: it?.snippet,
        }));
    } catch {
        return [];
    }
}
