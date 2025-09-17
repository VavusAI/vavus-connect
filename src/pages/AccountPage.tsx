import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

type Row = Record<string, any>;

function formatDate(d?: string) {
    if (!d) return '';
    try {
        const dt = new Date(d);
        return dt.toLocaleString();
    } catch { return d; }
}

function extractAssistantText(raw: any) {
    if (typeof raw !== 'string') return String(raw ?? '');
    const s = raw.trim();
    // Try JSON payloads (OpenAI/vLLM-style)
    if (s.startsWith('{') || s.startsWith('[')) {
        try {
            const j = JSON.parse(s);
            if (j?.choices?.[0]?.message?.content) return j.choices[0].message.content;
            if (j?.output_text) return j.output_text;
            if (typeof j?.content === 'string') return j.content;
            if (Array.isArray(j?.content)) return j.content.map((c: any) => c?.text ?? '').join('\n');
        } catch {/* fall through */}
    }
    return s;
}

function previewText(t: string, n = 180) {
    const one = t.replace(/\s+/g, ' ').trim();
    return one.length > n ? one.slice(0, n - 1) + '…' : one;
}

function SectionCard({
                         title, description, action, children,
                     }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border bg-white shadow-sm">
            <div className="flex items-start justify-between p-5 border-b">
                <div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                    {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
                </div>
                {action}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

async function trySelect<T = Row>(
    userId: string,
    candidates: {
        table: string;
        select?: string;
        where?: (qb: any) => any;
        orderBy?: string;
        limit?: number;
    }[]
): Promise<T[]> {
    for (const c of candidates) {
        try {
            let qb: any = supabase.from(c.table).select(c.select || '*');
            qb = c.where ? c.where(qb) : qb.eq('user_id', userId);
            if (c.orderBy) qb = qb.order(c.orderBy, { ascending: false });
            if (c.limit) qb = qb.limit(c.limit);
            const { data, error } = await qb;
            if (!error && data) return data as T[];
        } catch {/* next candidate */}
    }
    return [];
}

export default function AccountPage() {
    const navigate = useNavigate();

    const [email, setEmail] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'ai' | 'translate' | 'blog'>('ai');

    const [aiRows, setAiRows] = useState<Row[] | null>(null);
    const [translations, setTranslations] = useState<Row[] | null>(null);
    const [blog, setBlog] = useState<Row[] | null>(null);

    const [convMeta, setConvMeta] = useState<Record<string, { title?: string; updated_at?: string }>>({});

    useEffect(() => {
        let isMounted = true;

        supabase.auth.getSession().then(async ({ data }) => {
            const session = data.session;
            if (!session?.user) {
                navigate('/auth?next=/account', { replace: true });
                return;
            }
            if (!isMounted) return;
            setEmail(session.user.email || '');
            const uid = session.user.id;

            // AI messages (assistant only, newest first)
            const ai = await trySelect(uid, [
                {
                    table: 'ai_messages',
                    where: (qb) => qb.eq('user_id', uid).eq('role', 'assistant').order('created_at', { ascending: false }),
                    limit: 100,
                },
                {
                    table: 'messages',
                    where: (qb) =>
                        qb.eq('user_id', uid).eq('role', 'assistant').order('created_at', { ascending: false }),
                    limit: 100,
                },
            ]);

            // Conversation titles (optional table)
            const convIds = Array.from(new Set(ai.map((m: any) => m.conversation_id).filter(Boolean)));
            if (convIds.length) {
                const { data: convs } =
                    await supabase.from('conversations')
                        .select('id,title,updated_at')
                        .in('id', convIds);
                if (convs?.length) {
                    const map: Record<string, any> = {};
                    convs.forEach((c: any) => (map[c.id] = { title: c.title, updated_at: c.updated_at }));
                    if (isMounted) setConvMeta(map);
                }
            }

            const tr = await trySelect(uid, [
                { table: 'translations', select: 'id,source_lang,target_lang,input_text,output_text,created_at', orderBy: 'created_at', limit: 20 },
                { table: 'translation_logs', select: 'id,source_lang,target_lang,input_text,output_text,created_at', orderBy: 'created_at', limit: 20 },
                { table: 'transcripts', select: 'id,source_lang,target_lang,input_text,output_text,created_at', orderBy: 'created_at', limit: 20 },
            ]);

            const br = await trySelect(uid, [
                { table: 'blog_responses', select: 'id,title,slug,created_at,published', orderBy: 'created_at', limit: 20 },
                { table: 'responses', select: 'id,title,slug,created_at,published', orderBy: 'created_at', limit: 20 },
                { table: 'posts', select: 'id,title,slug,created_at,published,author_id', where: (qb) => qb.eq('author_id', uid).order('created_at', { ascending: false }), limit: 20 },
            ]);

            if (!isMounted) return;
            setAiRows(ai);
            setTranslations(tr);
            setBlog(br);
        });

        return () => { isMounted = false; };
    }, [navigate]);

    // Group AI messages by conversation_id and take the latest assistant message as preview
    const aiConversations = useMemo(() => {
        if (!aiRows) return null;
        const groups: Record<string, Row[]> = {};
        for (const m of aiRows) {
            const key = m.conversation_id || m.conversation || 'solo:' + m.id;
            (groups[key] ||= []).push(m);
        }
        const list = Object.entries(groups).map(([cid, msgs]) => {
            const latest = [...msgs].sort((a, b) =>
                String(b.created_at || b.id).localeCompare(String(a.created_at || a.id))
            )[0];
            const text = extractAssistantText(latest?.content ?? '');
            const title = convMeta[cid]?.title || text.split('\n')[0] || 'Conversation';
            return {
                conversation_id: cid,
                title: title.length > 80 ? title.slice(0, 79) + '…' : title,
                preview: previewText(text),
                updated_at: convMeta[cid]?.updated_at || latest?.created_at,
            };
        });
        // newest first
        return list.sort((a, b) =>
            String(b.updated_at || '').localeCompare(String(a.updated_at || ''))
        );
    }, [aiRows, convMeta]);

    const headerChips = useMemo(
        () => [
            { id: 'ai', label: 'AI History' as const },
            { id: 'translate', label: 'Translations' as const },
            { id: 'blog', label: 'Blog Responses' as const },
        ],
        []
    );

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <section className="relative overflow-hidden bg-gradient-subtle">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent-brand/5" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
                        <div>
                            <h1 className="mb-2">
                                <span className="gradient-text">Your Account</span>
                            </h1>
                            <p className="text-muted-foreground">
                                Signed in as <span className="font-medium">{email || '—'}</span>
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Link to="/ai"><Button className="btn-secondary">Open AI Chat</Button></Link>
                            <Button variant="outline" onClick={() => supabase.auth.signOut().then(() => (window.location.href = '/'))}>
                                Sign out
                            </Button>
                        </div>
                    </div>

                    {/* Pills */}
                    <div className="mt-6 flex flex-wrap gap-2">
                        {headerChips.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setActiveTab(c.id as typeof activeTab)}
                                className={[
                                    'px-3 py-1.5 rounded-full border text-sm',
                                    activeTab === c.id
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white text-muted-foreground border-muted hover:border-foreground/20',
                                ].join(' ')}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

                {activeTab === 'ai' && (
                    <SectionCard
                        title="Recent Conversations"
                        description="Click any row to continue the thread."
                        action={<Link to="/ai"><Button variant="outline">Go to AI</Button></Link>}
                    >
                        {aiConversations === null ? (
                            <div className="text-muted-foreground">Loading…</div>
                        ) : aiConversations.length === 0 ? (
                            <div className="text-muted-foreground">No conversations yet.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                    <tr className="text-left text-muted-foreground border-b">
                                        <th className="py-2 pr-6 font-medium">Title</th>
                                        <th className="py-2 pr-6 font-medium">Latest message</th>
                                        <th className="py-2 pr-6 font-medium">Updated</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {aiConversations.map((c) => (
                                        <tr
                                            key={c.conversation_id}
                                            className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                                            onClick={() => navigate(`/ai?c=${encodeURIComponent(c.conversation_id)}`)}
                                            title="Open conversation"
                                        >
                                            <td className="py-2 pr-6">{c.title}</td>
                                            <td className="py-2 pr-6 text-muted-foreground">{c.preview}</td>
                                            <td className="py-2 pr-6 text-muted-foreground">{formatDate(c.updated_at)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>
                )}

                {activeTab === 'translate' && (
                    <SectionCard
                        title="Recent Translations"
                        description="Your latest speech/text translations."
                        action={<Link to="/translate"><Button variant="outline">Open Translator</Button></Link>}
                    >
                        {translations === null ? (
                            <div className="text-muted-foreground">Loading…</div>
                        ) : translations.length === 0 ? (
                            <div className="text-muted-foreground">No translations yet.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                    <tr className="text-left text-muted-foreground border-b">
                                        <th className="py-2 pr-6 font-medium">From → To</th>
                                        <th className="py-2 pr-6 font-medium">Input</th>
                                        <th className="py-2 pr-6 font-medium">Output</th>
                                        <th className="py-2 pr-6 font-medium">When</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {translations.map((r, i) => (
                                        <tr key={i} className="border-b last:border-0">
                                            <td className="py-2 pr-6">{r.source_lang || '—'} → {r.target_lang || '—'}</td>
                                            <td className="py-2 pr-6 text-muted-foreground">{previewText(String(r.input_text ?? ''), 120)}</td>
                                            <td className="py-2 pr-6">{previewText(String(r.output_text ?? ''), 160)}</td>
                                            <td className="py-2 pr-6 text-muted-foreground">{formatDate(r.created_at)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>
                )}

                {activeTab === 'blog' && (
                    <SectionCard
                        title="Blog Responses"
                        description="Drafts, posts, or response logs associated with your account."
                        action={<Link to="/blog"><Button variant="outline">Go to Blog</Button></Link>}
                    >
                        {blog === null ? (
                            <div className="text-muted-foreground">Loading…</div>
                        ) : blog.length === 0 ? (
                            <div className="text-muted-foreground">No entries yet.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                    <tr className="text-left text-muted-foreground border-b">
                                        <th className="py-2 pr-6 font-medium">Title</th>
                                        <th className="py-2 pr-6 font-medium">Slug</th>
                                        <th className="py-2 pr-6 font-medium">Published</th>
                                        <th className="py-2 pr-6 font-medium">When</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {blog.map((r, i) => (
                                        <tr key={i} className="border-b last:border-0">
                                            <td className="py-2 pr-6">{r.title || '—'}</td>
                                            <td className="py-2 pr-6 text-muted-foreground">{r.slug || '—'}</td>
                                            <td className="py-2 pr-6">{String(r.published ?? '').replace('true','Yes').replace('false','No') || '—'}</td>
                                            <td className="py-2 pr-6 text-muted-foreground">{formatDate(r.created_at)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>
                )}
            </div>
        </div>
    );
}
