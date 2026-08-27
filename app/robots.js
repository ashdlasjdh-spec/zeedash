// zhd.lol is a staff control panel with a public marketing/docs front. Let crawlers index the public
// pages, but keep the dashboard, bot config, API and auth flows out of search results.
export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard/", "/api/", "/login", "/preview"] }],
    sitemap: "https://zhd.lol/sitemap.xml",
    host: "https://zhd.lol",
  };
}
