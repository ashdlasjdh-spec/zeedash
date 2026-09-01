const BASE = "https://zhd.lol";

// Public, indexable pages only — the dashboard/bot/api are private and excluded (see robots.js).
// The docs live under /docs as a separately-built Zensical static site, which publishes its own
// /docs/sitemap.xml — so we only advertise the docs home here and let that sitemap cover the rest.
export default function sitemap() {
  const now = new Date();
  const top = ["", "/catalog", "/status", "/bot/commands", "/changelog", "/docs/"];
  return [...top].map((r) => ({
    url: `${BASE}${r}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: r === "" ? 1 : 0.6,
  }));
}
