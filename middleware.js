import { NextResponse } from "next/server";

// Defense-in-depth CSRF guard for the API. On a STATE-CHANGING request that carries our session
// COOKIE, require the browser's Origin to match this site's own host. SameSite=Lax already stops the
// session cookie from riding along on a cross-site request, so this is a deliberate second layer.
//
// It is written to FAIL OPEN on every ambiguous case, so it can't break the app or the bot:
//   - only POST/PUT/PATCH/DELETE are ever considered (never GET/HEAD/navigation),
//   - a request WITHOUT our session cookie is let through (the bot authenticates with a Bearer secret
//     and sends no cookie — its polling/ingest is untouched),
//   - a request with no Origin header, or an unparseable one, is let through,
//   - a same-origin request is let through.
// Only a mutating, cookie-bearing request whose Origin is a *different* host is rejected — the exact
// shape of a cross-site forgery.
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const SESSION_COOKIE = "zhd_session";

export function middleware(req) {
  if (!MUTATING.has(req.method)) return NextResponse.next();
  if (!req.cookies.get(SESSION_COOKIE)) return NextResponse.next(); // not cookie-authed (e.g. the bot)
  const origin = req.headers.get("origin");
  if (!origin) return NextResponse.next(); // nothing to compare against
  let originHost;
  try { originHost = new URL(origin).host; } catch { return NextResponse.next(); }
  if (originHost === req.nextUrl.host) return NextResponse.next(); // same origin — fine
  return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
}

// Only run on API routes — never on page navigations or static assets.
export const config = { matcher: ["/api/:path*"] };
