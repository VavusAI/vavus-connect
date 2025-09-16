import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabase';
import BlogCard from '@/components/blog/BlogCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useIsAdmin } from '@/hooks/useIsAdmin';

type Post = {
    id: string; slug: string; title: string; excerpt: string | null;
    cover_url: string | null; created_at: string; tags: string[] | null;
};

const PAGE_SIZE = 9;

export default function BlogList() {
    const isAdmin = useIsAdmin();
    const [sp, setSp] = useSearchParams();
    const q = sp.get('q') ?? '';
    const page = Math.max(1, Number(sp.get('page') ?? '1'));

    const [posts, setPosts] = useState<Post[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    useEffect(() => {
        setLoading(true);
        (async () => {
            let query = supabase
                .from('posts')
                .select('id,slug,title,excerpt,cover_url,created_at,tags', { count: 'exact' })
                .eq('published', true)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (q.trim()) {
                // simple search on title/content/excerpt
                query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%,excerpt.ilike.%${q}%`);
            }

            const { data, error, count } = await query;
            if (!error) {
                setPosts(data ?? []);
                setTotal(count ?? 0);
            }
            setLoading(false);
        })();
    }, [q, page]);

    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const heroTitle = useMemo(
        () => (q ? `Search “${q}” – Blog` : 'Blog – VAVUS AI'),
        [q]
    );
    const heroDesc =
        'Official VAVUS updates, engineering notes, and behind-the-scenes on privacy-first AI.';

    return (
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
            <Helmet>
                <title>{heroTitle}</title>
                <meta name="description" content={heroDesc} />
                <link rel="canonical" href={`${import.meta.env.VITE_SITE_URL || ''}/blog`} />
            </Helmet>

            <section className="rounded-2xl border p-8 bg-white">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                        <h1 className="mb-2">VAVUS Blog</h1>
                        <p className="text-muted-foreground">{heroDesc}</p>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Search posts…"
                            defaultValue={q}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const v = (e.target as HTMLInputElement).value;
                                    const next = new URLSearchParams(sp);
                                    v ? next.set('q', v) : next.delete('q');
                                    next.delete('page');
                                    setSp(next, { replace: true });
                                }
                            }}
                        />
                        {isAdmin ? (
                            <Link to="/blog/new">
                                <Button>New Post</Button>
                            </Link>
                        ) : null}
                    </div>
                </div>
            </section>

            {loading ? (
                <p className="text-muted-foreground">Loading…</p>
            ) : posts.length === 0 ? (
                <div className="rounded-xl border p-10 text-center">
                    <p className="text-muted-foreground">
                        {q ? 'No results.' : 'No posts yet.'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {posts.map((p) => (
                            <BlogCard key={p.id} {...p} />
                        ))}
                    </div>

                    {pageCount > 1 && (
                        <div className="flex justify-center gap-2 pt-6">
                            <Button
                                variant="outline"
                                disabled={page <= 1}
                                onClick={() => {
                                    const next = new URLSearchParams(sp);
                                    next.set('page', String(page - 1));
                                    setSp(next, { replace: true });
                                }}
                            >
                                Prev
                            </Button>
                            <div className="px-4 py-2 text-sm">
                                Page {page} / {pageCount}
                            </div>
                            <Button
                                variant="outline"
                                disabled={page >= pageCount}
                                onClick={() => {
                                    const next = new URLSearchParams(sp);
                                    next.set('page', String(page + 1));
                                    setSp(next, { replace: true });
                                }}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
