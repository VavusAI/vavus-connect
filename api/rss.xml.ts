import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

export default async function handler(_req: VercelRequest, res: VercelResponse) {
    const SITE = process.env.VITE_SITE_URL || 'https://www.example.com';

    const { data } = await supabase
        .from('posts')
        .select('title, slug, excerpt, created_at')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(50);

    const items = (data || [])
        .map(
            (p) => `
<item>
  <title><![CDATA[${p.title}]]></title>
  <link>${SITE}/blog/${p.slug}</link>
  <guid>${SITE}/blog/${p.slug}</guid>
  <pubDate>${new Date(p.created_at).toUTCString()}</pubDate>
  <description><![CDATA[${p.excerpt || ''}]]></description>
</item>`
        )
        .join('');

    const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>VAVUS Blog</title>
    <link>${SITE}/blog</link>
    <description>VAVUS AI updates & research</description>
    ${items}
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
}
