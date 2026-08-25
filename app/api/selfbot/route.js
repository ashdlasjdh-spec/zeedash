import { getSession } from "@/lib/session";
import { isSuperOwner } from "@/lib/permissions";
import { NextResponse } from "next/server";

// Server-side proxy from the zeedash dashboard to the self-bot's control API.
// Gated to super owners; talks to the bot with a shared Bearer secret so the
// secret and the bot's URL never reach the browser.
export const dynamic = "force-dynamic";

const base = () => (process.env.SELFBOT_URL || "").replace(/\/+$/, "");
const secret = () => process.env.CONTROL_SECRET || process.env.SELFBOT_SECRET || "";

async function requireOwner() {
  const s = await getSession();
  return s && isSuperOwner(s.id) ? s : null;
}

async function proxy(path, init) {
  const b = base();
  const sec = secret();
  if (!b || !sec) {
    return NextResponse.json(
      { error: "Self-bot link not configured — set SELFBOT_URL and CONTROL_SECRET in this app's env." },
      { status: 503 },
    );
  }
  try {
    const r = await fetch(b + path, {
      ...init,
      headers: { Authorization: `Bearer ${sec}`, "Content-Type": "application/json", ...(init && init.headers) },
      cache: "no-store",
    });
    const text = await r.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      data = { raw: text };
    }
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: `Self-bot unreachable: ${e.message}` }, { status: 502 });
  }
}

export async function GET() {
  if (!(await requireOwner())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return proxy("/api/state", { method: "GET" });
}

export async function POST(req) {
  if (!(await requireOwner())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const map = { settings: "/api/settings", secrets: "/api/secrets", action: "/api/action" };
  const path = map[body && body.kind];
  if (!path) return NextResponse.json({ error: "unknown kind" }, { status: 400 });
  return proxy(path, { method: "POST", body: JSON.stringify(body.payload || {}) });
}
