import crypto from "node:crypto";

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
