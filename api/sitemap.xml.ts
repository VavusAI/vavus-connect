import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

export default async function handler(_req: VercelRequest, res: VercelResponse) {
    const SITE = process.env.VITE_SITE_URL || 'https://www.example.com';

    const staticPaths = ['','/vavus-ai','/translate','/ai','/vavus-apps','/about','/timeline','/join','/contact','/business','/blog'];
    const { data } = await supabase
        .from('posts')
        .select('slug, updated_at')
        .eq('published', true)
        .order('updated_at', { ascending: false })
        .limit(2000);

    const urls = [
        ...staticPaths.map(
            (p) => `<url><loc>${SITE}${p ? p : '/'}</loc></url>`
        ),
        ...(data || []).map(
            (p) => `<url><loc>${SITE}/blog/${p.slug}</loc><lastmod>${new Date(p.updated_at || Date.now()).toISOString()}</lastmod></url>`
        ),
    ].join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
}
