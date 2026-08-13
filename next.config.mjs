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
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
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
