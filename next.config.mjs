// NOTE: the Content-Security-Policy is set in middleware.js, not here — it needs a fresh per-request
// nonce so script-src can drop 'unsafe-inline' entirely (nonce + 'strict-dynamic'). All the other,
// static security headers stay below.
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep visited/prefetched route segments in the client Router Cache briefly, so hopping back and
  // forth between dashboard sections re-uses the last render instead of a fresh server round-trip
  // (dynamic pages default to 0s = never cached). Live data still refreshes: the client components on
  // each page fetch/poll their own data on mount, so only the static shell is reused.
  experimental: {
    staleTimes: { dynamic: 30, static: 180 },
  },
  // The /docs area is a prebuilt Zensical (Material-style) static site copied into public/docs by
  // scripts/build-docs.mjs. Those pages use directory URLs (/docs/access/), whose relative links only
  // resolve when the trailing slash is preserved — so we must NOT strip it. This disables Next's
  // automatic trailing-slash redirect app-wide (it only removes the canonical redirect; routes still
  // render either way), letting /docs/<page>/ stay as-is and be rewritten to its index.html below.
  skipTrailingSlashRedirect: true,
  // Only the bare /docs entry point (linked from the app without a slash) needs normalising to the
  // slash form the static site expects; every in-docs link already carries the trailing slash.
  async redirects() {
    return [{ source: "/docs", destination: "/docs/", permanent: false }];
  },
  async rewrites() {
    return [
      // Keep the public /selfbot URL but render it inside the dashboard layout
      // (Topbar + Sidebar + mobile nav) so it matches the rest of the site.
      { source: "/selfbot", destination: "/dashboard/selfbot" },
      // Serve the Zensical docs from public/docs with directory-index resolution. The :page pattern
      // matches a single extensionless segment (a doc page) so real asset files (/docs/assets/**,
      // /docs/sitemap.xml, …) fall through to the static file server untouched.
      { source: "/docs/", destination: "/docs/index.html" },
      { source: "/docs/:page([^./]+)/", destination: "/docs/:page/index.html" },
      { source: "/docs/:page([^./]+)", destination: "/docs/:page/index.html" },
    ];
  },
  // Security headers on every response. The dashboard performs privileged actions,
  // so deny framing (clickjacking), block MIME sniffing, trim the referrer, and
  // disable device APIs it never uses.
  async headers() {
    return [
      {
        // The /docs area is a static Zensical site and is excluded from the middleware nonce-CSP
        // (its theme uses inline <script>/<style>, and Mermaid needs eval). Give it its own tight,
        // self-hosted policy instead — everything it loads is same-origin, plus https/data images.
        source: "/docs/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "style-src 'self' 'unsafe-inline'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "worker-src 'self' blob:",
              "connect-src 'self'",
              "manifest-src 'self'",
            ].join("; "),
          },
        ],
      },
      {
        // Discord domain verification fetches this file and expects plain text. A file with no
        // extension is otherwise served as application/octet-stream, which its validator rejects —
        // so pin text/plain explicitly. Short cache so a re-verify always sees the current token.
        source: "/.well-known/discord",
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=300" },
        ],
      },
      {
        // The public landing is session-aware (logged-in vs not), so it must never be served from a
        // shared/edge cache — otherwise a stale copy (e.g. the old login page that redirected to
        // /dashboard) can linger after a deploy. force-dynamic already sets this; pin it explicitly.
        source: "/",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
      {
        source: "/login",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), bluetooth=()" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          // Cross-origin isolation: put this page in its own browsing-context group so another origin
          // can't grab a handle to our window (XS-Leaks / cross-window attacks). Safe here because our
          // OAuth flow is a top-level redirect, not a popup that relies on window.opener.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // Pair with COOP: stop other origins from embedding/reading our responses as a subresource
          // (image, script, fetch). Safe — this login-gated dashboard is never legitimately embedded
          // cross-origin, and server-side crawlers (Discord unfurls) aren't affected by CORP.
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          // Legacy Adobe cross-domain policy files are never valid for this site.
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        ],
      },
    ];
  },
  // Disable webpack's persistent filesystem cache. It tries to serialize a CSS
  // module-warning it can't ("No serializer registered for Warning"), which can
  // stall/fail the build on Vercel right after "Compiled with warnings".
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};
export default nextConfig;
