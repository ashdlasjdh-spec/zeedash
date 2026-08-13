import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// Two jobs:
//   1. API guards on state-changing requests that carry our SESSION COOKIE — a CSRF Origin check and a
//      per-IP write rate limit. Scoped to cookie-authed mutations, so the bot (Bearer secret, no
//      cookie) and all reads are never touched; both fail open.
//   2. A strict, per-request-nonce Content-Security-Policy on document responses, so script-src can
//      drop 'unsafe-inline' (nonce + 'strict-dynamic'): Next reads the nonce from the request CSP
//      header and stamps it onto its own <script> tags. style-src keeps 'unsafe-inline' because inline
//      style={} props can't carry a nonce.
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const SESSION_COOKIE = "zhd_session";
const DEV = process.env.NODE_ENV !== "production";

function buildCSP(nonce) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "form-action 'self'",
    // nonce + strict-dynamic = only Next's nonce'd bootstrap (and the chunks it loads) run. 'self' is
    // kept as a fallback for browsers that ignore strict-dynamic. 'unsafe-eval' only in dev (HMR).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${DEV ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${DEV ? " ws:" : ""}`,
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

export async function middleware(req) {
  const isApi = req.nextUrl.pathname.startsWith("/api/");

  // 1) API guards — only mutating, cookie-bearing requests are ever considered.
  if (isApi) {
    if (MUTATING.has(req.method) && req.cookies.get(SESSION_COOKIE)) {
      const origin = req.headers.get("origin");
      if (origin) {
        let originHost = null;
        try { originHost = new URL(origin).host; } catch { originHost = null; }
        if (originHost && originHost !== req.nextUrl.host) {
          return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
        }
      }
      const rl = await rateLimit(`apiwrite:${clientIp(req)}`, { max: 120, windowSec: 60 });
      if (!rl.ok) {
        return NextResponse.json({ error: "Too many requests — slow down a moment." }, { status: 429, headers: { "retry-after": "30" } });
      }
    }
    return NextResponse.next();
  }

  // 2) Document response — attach a fresh nonce'd CSP (set on both the request headers, so Next can
  //    read the nonce for its scripts, and the response headers, so the browser enforces it).
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildCSP(nonce);
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-nonce", nonce);
  reqHeaders.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers: reqHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

// Run on API routes (guards) and document routes (CSP), but skip static assets & the metadata icons —
// they don't need a nonce and shouldn't pay the middleware cost.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)"],
};
