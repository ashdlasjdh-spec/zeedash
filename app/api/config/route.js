import { getSession } from "@/lib/session";
import { canConfig } from "@/lib/permissions";
import { getConfig, setConfig } from "@/lib/config";
import { logAudit } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const s = await getSession();
  if (!s || !canConfig(s.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const c = await getConfig();
  return NextResponse.json({
    universeId: c.universeId, universeSource: c.universeSource,
    groupId: c.groupId, groupSource: c.groupSource,
    apiKeySet: !!c.apiKey, apiKeyMasked: c.apiKey ? c.apiKey.slice(0, 6) + "…" + c.apiKey.slice(-4) : "", apiKeySource: c.apiKeySource,
  });
}
export async function POST(req) {
  const s = await getSession();
  if (!s || !canConfig(s.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { apiKey, universeId, groupId } = await req.json();
  if (apiKey) await setConfig("roblox_api_key", apiKey, s.id);
  if (universeId) await setConfig("roblox_universe_id", String(universeId), s.id);
  if (groupId) await setConfig("roblox_group_id", String(groupId), s.id);
  await logAudit({ actorId: s.id, actorName: s.name, action: "config", detail: "updated open cloud config" });
  return NextResponse.json({ ok: true });
}
