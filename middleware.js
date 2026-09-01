import { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
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

// Session lifetime + sliding refresh. The login cookie is short-lived (3 days) so a stolen token dies
// on its own, but an ACTIVE staff member never gets logged out: once a valid token is more than a third
// of the way through its life, we silently re-issue it with a fresh 3-day window on the response. Result
// — a token is only truly dead 3 days after its owner stops using the dashboard.
const SESSION_TTL_S = 60 * 60 * 24 * 3; // 3 days
const SLIDE_AFTER_S = 60 * 60 * 24;     // re-issue once the token is older than 1 day
function sessionSecret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return new TextEncoder().encode(s);
  // No secure secret in production → don't touch the cookie at all (getSession() refuses to run anyway).
  if (!DEV) return null;
  return new TextEncoder().encode("dev-insecure-secret-change-me");
}
// Best-effort: verify the current cookie and, if it's aged past the slide point, set a fresh one on the
// response. Any failure leaves the existing cookie exactly as it was — we never log a valid user out.
async function slideSession(req, res) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return;
  const secret = sessionSecret();
  if (!secret) return;
  let payload;
  try { ({ payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] })); }
  catch { return; } // invalid/expired — leave it; getSession() treats it as signed out
  const iat = Number(payload.iat) || 0;
  if (!iat || Date.now() / 1000 - iat < SLIDE_AFTER_S) return; // still fresh — no reissue needed
  try {
    const fresh = await new SignJWT({ id: payload.id, name: payload.name, level: payload.level, role: payload.role, avatar: payload.avatar })
      .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${SESSION_TTL_S}s`).sign(secret);
    res.cookies.set(SESSION_COOKIE, fresh, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_TTL_S });
  } catch { /* leave the existing cookie untouched */ }
}

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
  // Slide the session forward for active users (re-issues an aged-but-valid cookie). Best-effort.
  await slideSession(req, res);
  return res;
}

// Run on API routes (guards) and document routes (CSP), but skip static assets & the metadata icons —
// they don't need a nonce and shouldn't pay the middleware cost. `docs` is skipped too: it's the
// prebuilt Zensical static site (public/docs), which carries its own CSP (see next.config.mjs) and
// must not get the strict nonce policy — that would block its inline theme scripts.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|opengraph-image|twitter-image|\\.well-known|docs(?:/|$)).*)"],
};
