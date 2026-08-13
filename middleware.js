import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";

// API guard for state-changing requests. Two layers, both scoped to POST/PUT/PATCH/DELETE and only to
// requests that carry our SESSION COOKIE — so the bot (which authenticates with a Bearer secret and
// sends no cookie) and all GET/navigation traffic are never touched:
//
//   1. CSRF: require the browser's Origin to match this site's host. SameSite=Lax already stops the
//      session cookie riding along cross-site; this is a deliberate second layer.
//   2. Rate limit: a generous per-IP cap on user-driven writes, to stop a runaway client or a hijacked
//      session from hammering the write endpoints. Distributed via Upstash (see lib/ratelimit.js) —
//      completely inert until the Upstash env vars are set, and it fails open, so it can't break anything.
//
// Both fail open on every ambiguous case, so they cannot break the app or the bot.
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const SESSION_COOKIE = "zhd_session";

export async function middleware(req) {
  if (!MUTATING.has(req.method)) return NextResponse.next();
  if (!req.cookies.get(SESSION_COOKIE)) return NextResponse.next(); // not cookie-authed (e.g. the bot)

  // 1) CSRF — reject only a mutating, cookie-bearing request whose Origin is a *different* host.
  const origin = req.headers.get("origin");
  if (origin) {
    let originHost = null;
    try { originHost = new URL(origin).host; } catch { originHost = null; }
    if (originHost && originHost !== req.nextUrl.host) {
      return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
    }
  }

  // 2) Rate limit user-driven writes per IP (2/sec sustained — far above any human, catches loops/abuse).
  const rl = await rateLimit(`apiwrite:${clientIp(req)}`, { max: 120, windowSec: 60 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests — slow down a moment." }, { status: 429, headers: { "retry-after": "30" } });
  }
  return NextResponse.next();
}

// Only run on API routes — never on page navigations or static assets.
export const config = { matcher: ["/api/:path*"] };
