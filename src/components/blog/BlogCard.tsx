import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';

type Props = {
    slug: string;
    title: string;
    excerpt?: string | null;
    cover_url?: string | null;
    created_at: string;
    tags?: string[] | null;
};

export default function BlogCard(p: Props) {
    return (
        <Card className="overflow-hidden group hover:shadow-lg transition">
            <Link to={`/blog/${p.slug}`} className="block">
                <div className="aspect-[16/9] bg-surface overflow-hidden">
                    {p.cover_url ? (
                        <img
                            src={p.cover_url}
                            alt={p.title}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-hero" />
                    )}
                </div>
                <div className="p-4">
                    <h3 className="font-semibold text-lg">{p.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        {new Date(p.created_at).toLocaleDateString()}
                    </p>
                    {p.excerpt && (
                        <p className="text-sm text-foreground/80 mt-3 line-clamp-3">{p.excerpt}</p>
                    )}
                    {p.tags && p.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {p.tags.slice(0, 4).map(t => (
                                <span key={t} className="text-xs rounded-full px-2 py-1 bg-surface">
                  #{t}
                </span>
                            ))}
                        </div>
                    )}
                </div>
            </Link>
        </Card>
    );
}
