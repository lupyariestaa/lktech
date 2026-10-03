import { getArticles } from "@/lib/articles";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";
export const revalidate = 3600;

/** Escape entitas XML untuk teks & atribut. */
function xmlEscape(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * GET /blog/rss.xml
 * Feed RSS 2.0 artikel blog (published terbaru lebih dulu).
 */
export async function GET() {
  const articles = await getArticles();
  const feedUrl = `${SITE.url}/blog/rss.xml`;
  const blogUrl = `${SITE.url}/blog`;

  const items = articles
    .map((a) => {
      const link = `${SITE.url}/blog/${a.slug}`;
      const pubDate = new Date(a.publishedAt).toUTCString();
      const categories = [a.category, ...a.tags]
        .map((c) => `      <category>${xmlEscape(c)}</category>`)
        .join("\n");
      return `    <item>
      <title>${xmlEscape(a.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${xmlEscape(a.excerpt)}</description>
${categories}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(`${SITE.name} Blog`)}</title>
    <link>${blogUrl}</link>
    <description>${xmlEscape(SITE.description)}</description>
    <language>id-ID</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
