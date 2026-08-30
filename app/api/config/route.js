import { getSession } from "@/lib/session";
import { canConfig, canBanKey, isSuperOwner } from "@/lib/permissions";
import { getConfig, setConfig } from "@/lib/config";
import { logAudit } from "@/lib/db";
import { NextResponse } from "next/server";
import { forbidden } from "@/lib/api";

const mask = (k) => (k ? k.slice(0, 6) + "…" + k.slice(-4) : "");

export async function GET() {
  const s = await getSession();
  if (!s || !canConfig(s.level)) return forbidden();
  const c = await getConfig();
  return NextResponse.json({
    universeId: c.universeId, universeSource: c.universeSource,
    groupId: c.groupId, groupSource: c.groupSource,
    apiKeySet: !!c.apiKey, apiKeyMasked: mask(c.apiKey), apiKeySource: c.apiKeySource,
    // Bans key — only co founders+ may change it (canEditBanKey drives the Settings UI).
    banApiKeySet: !!c.banApiKey, banApiKeyMasked: mask(c.banApiKey), banApiKeySource: c.banApiKeySource,
    canEditBanKey: canBanKey(s.level),
    // Ban-log webhook — super owners only (it can post to a Discord channel). Never return the full URL.
    banWebhookSet: !!c.banWebhook, banWebhookMasked: mask(c.banWebhook), banWebhookSource: c.banWebhookSource,
    canEditBanWebhook: isSuperOwner(s.id),
  });
}
export async function POST(req) {
  const s = await getSession();
  if (!s || !canConfig(s.level)) return forbidden();
  const { apiKey, universeId, groupId, banApiKey, banWebhook } = await req.json();
  if (apiKey) await setConfig("roblox_api_key", apiKey, s.id);
  if (universeId) await setConfig("roblox_universe_id", String(universeId), s.id);
  if (groupId) await setConfig("roblox_group_id", String(groupId), s.id);
  if (banApiKey) {
    if (!canBanKey(s.level)) return forbidden("Only co founders+ can change the Bans API key.");
    await setConfig("roblox_ban_api_key", banApiKey, s.id);
  }
  if (banWebhook !== undefined) {
    if (!isSuperOwner(s.id)) return forbidden("Only super owners can change the ban webhook.");
    const url = String(banWebhook || "").trim();
    // Allow clearing (empty), otherwise require a real Discord webhook URL so a typo can't silently break logging.
    if (url && !/^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(url)) {
      return NextResponse.json({ error: "That doesn't look like a Discord webhook URL." }, { status: 400 });
    }
    await setConfig("ban_webhook", url, s.id);
  }
  await logAudit({ actorId: s.id, actorName: s.name, action: "config", detail: "updated open cloud config" });
  return NextResponse.json({ ok: true });
}
