// Content-Security-Policy. 'unsafe-inline' is kept ONLY for script/style: this app renders inline
// style={} props pervasively (which can't carry a nonce) and Next injects inline hydration scripts, so
// a nonce/strict-dynamic policy would need per-request middleware wiring and live testing or it white-
// screens the app. Everything else is locked down: no plugins/embeds, no <base> hijack, no framing,
// forms only post to us, connections only to us, and images limited to https/data/blob (embed previews
// and Discord/Roblox avatars use arbitrary https hosts, so https: is intentional). Verified there are no
// external client scripts/styles/fetches, so 'self' is safe for script/style/connect.
// In dev, `next dev` HMR needs 'unsafe-eval' (React Refresh) and a websocket connection — allow them
// only there so local development isn't broken; production stays strict.
const DEV = process.env.NODE_ENV !== "production";
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${DEV ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${DEV ? " ws:" : ""}`,
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

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
  // Security headers on every response. The dashboard performs privileged actions,
  // so deny framing (clickjacking), block MIME sniffing, trim the referrer, and
  // disable device APIs it never uses.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: CSP },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), bluetooth=()" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          // Cross-origin isolation: put this page in its own browsing-context group so another origin
          // can't grab a handle to our window (XS-Leaks / cross-window attacks). Safe here because our
          // OAuth flow is a top-level redirect, not a popup that relies on window.opener.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
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
