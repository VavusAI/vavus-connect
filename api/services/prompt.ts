export type Msg = { role: 'system' | 'user' | 'assistant'; content: string };
export type WebSource = { id: string; title: string; url: string; snippet: string };

export const GLOBAL_SYSTEM = 'You are VAVUS AI. Be concise, actionable, and accurate.';
export const FAST_MAX_TOKENS = 1024;
export const THINK_MAX_TOKENS = 2048;
export const WINDOW_TURNS_FAST = 8;
export const WINDOW_TURNS_LONG = 16;

export const norm = (s?: string | null) => (s ?? '').trim().replace(/\s+/g, ' ');
const bullets = (arr: string[], cap = 5) =>
    arr.filter(Boolean).slice(0, cap).map(s => `- ${s}`).join('\n');

export function stripReasoning(s?: string, skipStrip = false): string {
    if (!s) return '';
    if (skipStrip) return s.trim();
    let out = s;
    out = out.replace(/<think>[\s\S]*?<\/think>/gi, '');
    out = out.replace(/```(?:thinking|reasoning)[\s\S]*?```/gi, '');
    out = out.replace(/<\/?think>/gi, '');
    return out.trim();
}

async function fetchSearx(message: string, cap: number, url?: string, timeoutMs = 8000): Promise<WebSource[]> {
    if (!url) return [];
    const q = encodeURIComponent(message.slice(0, 200));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const r = await fetch(
            `${url}/search?q=${q}&format=json&language=en&categories=general`,
            { signal: ctrl.signal }
        );
        const j: any = await r.json();
        const items: WebSource[] = (j?.results || [])
            .slice(0, cap)
            .map((it: any, i: number) => ({
                id: `S${i + 1}`,
                title: norm(it.title || ''),
                url: it.url || it.link || '',
                snippet: norm(it.content || it.snippet || ''),
            }))
            .filter(x => x.url && (x.title || x.snippet));
        return items;
    } catch {
        return [];
    } finally {
        clearTimeout(timer);
    }
}

export async function assemblePrompt({
                                         message,
                                         system,
                                         history = [],
                                         persona = '',
                                         workspace = '',
                                         summary = '',
                                         mode = 'normal',
                                         useInternet = false,
                                         longMode = false,
                                         searxngUrl = process.env.SEARXNG_URL,
                                         searxngTimeoutMs = 8000,
                                     }: {
    message: string;
    system?: string;
    history?: Msg[];
    persona?: string;
    workspace?: string;
    summary?: string;
    mode?: 'normal' | 'thinking';
    useInternet?: boolean;
    longMode?: boolean;
    searxngUrl?: string;
    searxngTimeoutMs?: number;
}) : Promise<{ messages: Msg[]; sources: WebSource[]; isThinking: boolean }> {
    const stableParts: string[] = [GLOBAL_SYSTEM];
    if (persona) stableParts.push(`User profile: ${persona}`);
    const GLOBAL_PREFIX = norm(stableParts.join(' '));

    const signalBullets: string[] = [];
    if (persona) signalBullets.push(...persona.split('\n').map(norm).filter(Boolean).slice(0, 3));
    if (summary) signalBullets.push(...summary.split(/[\n•\-]+/).map(norm).filter(Boolean).slice(0, 2));

    const msgs: Msg[] = [{ role: 'system', content: GLOBAL_PREFIX }];
    if (signalBullets.length) msgs.push({ role: 'system', content: `Signal Hub:\n${bullets(signalBullets, 5)}` });
    if (workspace) msgs.push({ role: 'system', content: `Workspace Memory:\n${workspace}` });
    if (system) msgs.push({ role: 'system', content: norm(system) });

    const recentTurns = longMode ? WINDOW_TURNS_LONG : WINDOW_TURNS_FAST;
    msgs.push(...history.slice(-recentTurns));

    const focusCandidates = history.slice(-4).map(m => norm(m.content)).filter(Boolean);
    if (focusCandidates.length) msgs.push({ role: 'system', content: `Focus Box:\n${bullets(focusCandidates, 5)}` });

    let sources: WebSource[] = [];
    if (useInternet && searxngUrl) {
        const cap = longMode ? 8 : (mode === 'thinking' ? 5 : 3);
        sources = await fetchSearx(message, cap, searxngUrl, searxngTimeoutMs);
        if (sources.length) {
            const note = sources
                .map(s => `[${s.id}] ${s.title} — ${s.url}\n${s.snippet}`)
                .join('\n\n')
                .slice(0, longMode ? 8000 : 4000);
            msgs.push({ role: 'system', content: `Web snippets:\n${note}` });
        }
    }

    const isThinking = mode === 'thinking';
    const modeContent = isThinking
        ? 'Start your response immediately with <think>\n and perform step-by-step reasoning inside it. End with </think>. Then output ONLY the final answer without any extra text or bullets.'
        : 'If you need to reason step-by-step, enclose it in <think> ... </think>. Otherwise, respond directly with only the final answer. Do not add extra text or formatting unless asked.';
    msgs.push({ role: 'system', content: modeContent });

    msgs.push({ role: 'user', content: message });

    return { messages: msgs, sources, isThinking };
}
