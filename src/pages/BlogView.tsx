import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabase';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

type Post = {
    id: string; title: string; slug: string;
    content: string; excerpt: string | null; cover_url: string | null;
    created_at: string; updated_at: string; tags: string[] | null; canonical_url: string | null;
};

type Comment = { id: string; content: string; created_at: string; author_id: string };

export default function BlogView() {
    const { slug } = useParams<{ slug: string }>();
    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [comment, setComment] = useState('');
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    }, []);

    useEffect(() => {
        if (!slug) return;
        (async () => {
            const { data } = await supabase
                .from('posts')
                .select('id,title,slug,content,excerpt,cover_url,created_at,updated_at,tags,canonical_url')
                .eq('slug', slug).maybeSingle();
            setPost(data ?? null);

            if (data) {
                const { data: cmts } = await supabase
                    .from('comments')
                    .select('id,content,created_at,author_id')
                    .eq('post_id', data.id)
                    .order('created_at', { ascending: true });
                setComments(cmts ?? []);
            }
        })();
    }, [slug]);

    const html = useMemo(
        () => (post ? DOMPurify.sanitize(marked.parse(post.content) as string) : ''),
        [post]
    );

    const SITE = import.meta.env.VITE_SITE_URL || '';
    const url = `${SITE}/blog/${slug ?? ''}`;
    const metaTitle = post ? `${post.title} – VAVUS Blog` : 'Loading…';
    const metaDesc = post?.excerpt || 'VAVUS AI blog article.';
    const jsonLd = post
        ? {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            datePublished: post.created_at,
            dateModified: post.updated_at || post.created_at,
            image: post.cover_url ? [post.cover_url] : undefined,
            author: { '@type': 'Organization', name: 'VAVUS AI' },
            publisher: { '@type': 'Organization', name: 'VAVUS AI' },
            mainEntityOfPage: url,
            description: metaDesc,
        }
        : null;

    const addComment = async () => {
        if (!userId || !post || !comment.trim()) return;
        const { data, error } = await supabase
            .from('comments')
            .insert({ post_id: post.id, author_id: userId, content: comment.trim() })
            .select()
            .single();
        if (!error && data) {
            setComments((prev) => [...prev, data]);
            setComment('');
        }
    };

    if (!post) {
        return <div className="max-w-3xl mx-auto p-6">Loading…</div>;
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
            <Helmet>
                <title>{metaTitle}</title>
                <meta name="description" content={metaDesc} />
                <link rel="canonical" href={post.canonical_url || url} />
                <meta property="og:title" content={post.title} />
                <meta property="og:description" content={metaDesc} />
                <meta property="og:type" content="article" />
                <meta property="og:url" content={url} />
                {post.cover_url && <meta property="og:image" content={post.cover_url} />}
                {jsonLd && (
                    <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
                )}
            </Helmet>

            {post.cover_url && (
                <div className="rounded-xl overflow-hidden border">
                    <img src={post.cover_url} alt={post.title} className="w-full object-cover" />
                </div>
            )}

            <header>
                <h1 className="mb-2">{post.title}</h1>
                <p className="text-sm text-muted-foreground">
                    {new Date(post.created_at).toLocaleString()}
                </p>
            </header>

            <Card className="p-6 prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: html }} />
            </Card>

            <div className="flex items-center gap-2">
                <a
                    className="text-sm underline"
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title)}`}
                    target="_blank" rel="noreferrer"
                >
                    Share on X
                </a>
                <span className="text-muted-foreground">·</span>
                <Link className="text-sm underline" to="/blog">Back to Blog</Link>
            </div>

            <section className="space-y-3">
                <h2 className="text-xl font-semibold">Comments</h2>
                {comments.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No comments yet.</p>
                ) : (
                    comments.map((c) => (
                        <Card key={c.id} className="p-3">
                            <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {new Date(c.created_at).toLocaleString()}
                            </p>
                        </Card>
                    ))
                )}
                {userId ? (
                    <div className="space-y-2">
                        <Textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Write a comment…"
                            rows={3}
                        />
                        <Button onClick={addComment}>Post Comment</Button>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">Sign in to comment.</p>
                )}
            </section>
        </div>
    );
}
