import { getChangelog } from "@/lib/changelog.mjs";

// RSS 2.0 feed of the public changelog, so RSS readers (and Discord RSS bots) can subscribe to Zee Hood
// product updates and auto-post them. Cached like the changelog page.
export const revalidate = 600;

function esc(s) {
  return String(s == null ? "" : s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
}

export async function GET() {
  let items = [];
  try {
    const groups = await getChangelog();
    items = groups.flatMap((g) => g.items).slice(0, 50);
  } catch { /* empty feed on failure */ }

  const now = new Date().toUTCString();
  const entries = items.map((it) => {
    const link = it.url || "https://zhd.lol/changelog";
    const pub = it.date ? `\n      <pubDate>${new Date(it.date).toUTCString()}</pubDate>` : "";
    return `    <item>
      <title>${esc(`[${it.label}] ${it.text}`)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="false">${esc((link + "#" + it.text).slice(0, 300))}</guid>
      <category>${esc(it.label)}</category>${pub}
      <description>${esc(it.text)}</description>
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Zee Hood — Product Updates</title>
    <link>https://zhd.lol/changelog</link>
    <atom:link href="https://zhd.lol/feed.xml" rel="self" type="application/rss+xml" />
    <description>What's new across Zee Hood — the bot, dashboard, game site, transcripts and perks API.</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
${entries}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
