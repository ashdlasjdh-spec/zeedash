import { getSession } from "@/lib/session";
import { canConfig } from "@/lib/permissions";
import { INTEGRATION_FIELDS, getIntegrations, setIntegration } from "@/lib/config";
import { logAudit } from "@/lib/db";
import { NextResponse } from "next/server";
import { forbidden } from "@/lib/api";

export const dynamic = "force-dynamic";

const mask = (v) => (v ? (v.length > 12 ? v.slice(0, 4) + "…" + v.slice(-4) : "••••") : "");

// Global bot integration keys/endpoints (OpenAI, Last.fm, Fortnite, Lavalink, Spotify, media, social).
// Co-founder+ (canConfig) only — the same gate as the Open Cloud config. GET returns metadata with
// secret values masked; POST saves any provided fields. The bot reads these via /api/integrations/bot.
export async function GET() {
  const s = await getSession();
  if (!s || !canConfig(s.level)) return forbidden();
  const { values, sources } = await getIntegrations();
  const fields = INTEGRATION_FIELDS.map((f) => ({
    env: f.env, label: f.label, group: f.group, secret: !!f.secret, placeholder: f.placeholder || "",
    source: sources[f.env], set: !!values[f.env],
    value: f.secret ? "" : values[f.env],       // non-secrets are shown for editing; secrets never leave masked
    masked: f.secret ? mask(values[f.env]) : "",
  }));
  return NextResponse.json({ fields });
}

export async function POST(req) {
  const s = await getSession();
  if (!s || !canConfig(s.level)) return forbidden();
  const body = await req.json().catch(() => ({}));
  const updates = body && typeof body.updates === "object" ? body.updates : {};
  let n = 0;
  for (const [env, value] of Object.entries(updates)) {
    if (typeof value !== "string") continue;
    if (await setIntegration(env, value, s.id)) n++;
  }
  if (n) await logAudit({ actorId: s.id, actorName: s.name, action: "config", detail: `updated ${n} integration key(s)` });
  return NextResponse.json({ ok: true, saved: n });
}
