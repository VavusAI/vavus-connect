import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { customAlphabet } from 'nanoid';
import { useIsAdmin } from '@/hooks/useIsAdmin';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

function slugify(str: string) {
    return str.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

function stripMarkdown(md: string) {
    // very light markdown → text
    return md
        .replace(/```[\s\S]*?```/g, '')      // code fences
        .replace(/`[^`]*`/g, '')             // inline code
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')// images
        .replace(/\[[^\]]*\]\([^)]*\)/g, '') // links
        .replace(/[#>*_\-\+~`]/g, '')        // md symbols
        .replace(/\n{2,}/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

export default function BlogNew() {
    const nav = useNavigate();
    const isAdmin = useIsAdmin();

    const [userId, setUserId] = useState<string | null>(null);

    // MAIN FIELDS
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('# New post\n\nWrite in **Markdown**.');
    const [excerpt, setExcerpt] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [tagsStr, setTagsStr] = useState(''); // comma-separated
    const [canonicalUrl, setCanonicalUrl] = useState('');

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    }, []);

    // Live slug preview (not editable here, generated from title)
    const slugPreview = useMemo(() => slugify(title) || 'post', [title]);

    // If no excerpt provided, derive one from content (first ~160 chars of plain text)
    const autoExcerpt = useMemo(() => {
        if (excerpt.trim()) return excerpt.trim();
        const txt = stripMarkdown(content);
        return txt.slice(0, 160);
    }, [excerpt, content]);

    const parsedTags = useMemo(
        () =>
            tagsStr
                .split(',')
                .map(t => t.trim().toLowerCase())
                .filter(Boolean)
                .slice(0, 10),
        [tagsStr]
    );

    const submit = async () => {
        if (!isAdmin) return;
        if (!userId || !title.trim() || !content.trim()) return;

        setSaving(true);
        let base = slugify(title) || 'post';
        let candidate = base;

        for (let i = 0; i < 3; i++) {
            const { data, error } = await supabase
                .from('posts')
                .insert({
                    author_id: userId,
                    title: title.trim(),
                    slug: candidate,
                    content: content.trim(),
                    excerpt: autoExcerpt || null,
                    cover_url: coverUrl.trim() || null,
                    tags: parsedTags.length ? parsedTags : null,
                    canonical_url: canonicalUrl.trim() || null,
                    published: true,
                })
                .select('slug')
                .single();

            if (!error && data) {
                nav(`/blog/${data.slug}`);
                return;
            }
            candidate = `${base}-${nanoid()}`;
        }

        setSaving(false);
        alert('Could not save post. Try a different title.');
    };

    if (isAdmin === null) {
        return <div className="max-w-3xl mx-auto p-6">Loading…</div>;
    }
    if (!isAdmin) {
        return (
            <div className="max-w-3xl mx-auto p-6">
                <h1>403 – Not allowed</h1>
                <p className="text-muted-foreground">Only the site owner can publish posts.</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-4">
            <h1>New Post</h1>

            <Card className="p-6 space-y-6">
                {/* Title + Slug preview */}
                <div>
                    <label className="block text-sm font-medium mb-1">Title *</label>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Awesome announcement"
                        required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Slug: <code className="px-1 rounded bg-surface">{slugPreview}</code>
                    </p>
                </div>

                {/* Excerpt */}
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Excerpt <span className="text-muted-foreground">(~150–160 characters)</span>
                    </label>
                    <Textarea
                        rows={3}
                        value={excerpt}
                        onChange={(e) => setExcerpt(e.target.value)}
                        placeholder="Short description for cards and social previews."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        {autoExcerpt.length}/160 {excerpt ? '' : '(auto-generated from content if left blank)'}
                    </p>
                </div>

                {/* Cover image */}
                <div>
                    <label className="block text-sm font-medium mb-1">Cover image URL</label>
                    <Input
                        value={coverUrl}
                        onChange={(e) => setCoverUrl(e.target.value)}
                        placeholder="https://…"
                    />
                    {coverUrl.trim() ? (
                        <div className="mt-3 rounded-lg overflow-hidden border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={coverUrl}
                                alt="Cover preview"
                                className="w-full h-48 object-cover"
                                onError={(e) => ((e.currentTarget.style.display = 'none'))}
                            />
                        </div>
                    ) : null}
                </div>

                {/* Tags */}
                <div>
                    <label className="block text-sm font-medium mb-1">Tags</label>
                    <Input
                        value={tagsStr}
                        onChange={(e) => setTagsStr(e.target.value)}
                        placeholder="ai, announcement, research"
                    />
                    {parsedTags.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Parsed tags:&nbsp;
                            {parsedTags.map((t, i) => (
                                <span key={t}>
                  <code className="px-1 rounded bg-surface">#{t}</code>
                                    {i < parsedTags.length - 1 ? ', ' : ''}
                </span>
                            ))}
                        </p>
                    )}
                </div>

                {/* Canonical URL */}
                <div>
                    <label className="block text-sm font-medium mb-1">Canonical URL</label>
                    <Input
                        value={canonicalUrl}
                        onChange={(e) => setCanonicalUrl(e.target.value)}
                        placeholder="https://www.vavusai.com/blog/your-post"
                    />
                </div>

                {/* Content */}
                <div>
                    <label className="block text-sm font-medium mb-1">Content (Markdown) *</label>
                    <Textarea
                        rows={16}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                    />
                </div>

                <div className="flex justify-end">
                    <Button onClick={submit} disabled={saving}>
                        {saving ? 'Publishing…' : 'Publish'}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
