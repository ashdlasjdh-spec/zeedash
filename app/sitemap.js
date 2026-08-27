const BASE = "https://zhd.lol";
const DOCS = ["", "access", "architecture", "automation", "crew-tags", "emojis", "game", "levels", "moderation", "pages", "security", "server", "stats", "tickets"];

// Public, indexable pages only — the dashboard/bot/api are private and excluded (see robots.js).
export default function sitemap() {
  const now = new Date();
  const top = ["", "/catalog", "/status", "/bot/commands"];
  const docs = DOCS.map((d) => (d ? `/docs/${d}` : "/docs"));
  return [...top, ...docs].map((r) => ({
    url: `${BASE}${r}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: r === "" ? 1 : 0.6,
  }));
}
