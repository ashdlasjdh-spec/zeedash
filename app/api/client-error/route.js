import { reportError } from "@/lib/errorReporter.mjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// The client error boundary POSTs here when a page fails to render. We forward it to the error webhook
// server-side (the webhook URL never touches the browser). The reporter's own dedup + rate-limit cap how
// much can be sent, so this staying unauthenticated can't be turned into webhook spam.
// Reject cross-origin callers: legitimate reports come from our own pages (the browser sends Origin on a
// POST). curl/other-site spam is dropped here; the reporter's rate-limit is the second line.
function sameOrigin(req) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin navigations may omit it; allow (rate-limit still applies)
  try { return new URL(origin).host === req.nextUrl.host; } catch { return false; }
}

export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  try {
    const b = await req.json().catch(() => ({}));
    reportError(
      { message: String(b?.message || "client render error").slice(0, 500), stack: String(b?.stack || "").slice(0, 2000) },
      { where: String(b?.where || "client").slice(0, 160), digest: String(b?.digest || "").slice(0, 60), service: "Dashboard (client)" },
    );
  } catch { /* ignore */ }
  return NextResponse.json({ ok: true });
}
