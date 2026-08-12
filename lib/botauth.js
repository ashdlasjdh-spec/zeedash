import crypto from "node:crypto";
import { NextResponse } from "next/server";

// Constant-time check of the Bearer CRON_SECRET on bot-facing endpoints. Hashing both sides means
// neither the length nor the number of matching characters leaks through timing — so the shared
// secret can't be brute-forced a byte at a time. Returns false if the secret is unset/too weak.
export function botAuthed(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false; // refuse to run with a missing/weak secret
  const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = crypto.createHash("sha256").update(got).digest();
  const b = crypto.createHash("sha256").update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

// Brute-force guard: only FAILED auth attempts are throttled per IP, so a leaked/guessed CRON_SECRET
// can't be hammered at scale. Successful (authenticated) traffic is never limited, so the bot's
// polling / ingest is unaffected. In-memory + per-instance (serverless) — a coarse but cheap
// backstop that mirrors the perks-api guard. Returns a 401/429 NextResponse to short-circuit, or
// null when the request is authorized and should proceed.
const FAIL_WINDOW_MS = 60_000;
const FAIL_MAX = 30; // failed auths per IP per minute before a temp 429
const authFails = new Map(); // ip -> { count, resetAt }
function clientIp(req) {
  return (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown").split(",")[0].trim();
}
export function guardBot(req) {
  const ip = clientIp(req);
  const now = Date.now();
  let rec = authFails.get(ip);
  if (rec && now >= rec.resetAt) { authFails.delete(ip); rec = undefined; }
  if (rec && rec.count >= FAIL_MAX) {
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429, headers: { "retry-after": String(Math.ceil((rec.resetAt - now) / 1000)) } });
  }
  if (!botAuthed(req)) {
    if (!rec) { rec = { count: 0, resetAt: now + FAIL_WINDOW_MS }; authFails.set(ip, rec); }
    rec.count++;
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }
  authFails.delete(ip); // good secret — clear any streak
  return null;
}
