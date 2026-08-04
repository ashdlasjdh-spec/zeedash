import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { publish, resolveUsername, dsGet, dsSet } from "@/lib/roblox";
import { findItem } from "@/lib/catalog";
import { grantPerks, revokePerks } from "@/lib/perksApi";
import { logAudit } from "@/lib/db";
import { NextResponse } from "next/server";

// Categories that live in the shared perks table (so they persist + show up on
// the bot). power + gamepass + shazam — stand/car/tool apply in-game via DashboardGrant.
function dbPatch(category, key) {
  if (category === "power") return { powers: [key] };
  if (category === "gamepass") return { gamepasses: [key] };
  if (category === "shazam") return { shazam: [key] };
  if (category === "tool") return { tools: [key] };
  if (category === "startbr") return { startbr: [key] };
  return null;
}
function dbRevokeWhat(category, key) {
  if (["power", "gamepass", "shazam", "tool", "startbr"].includes(category)) return `${category}:${key}`;
  return null;
}

// Merge/remove a shazam variant in the user's PlayerPerks DataStore entry — the
// SAME entry PerkReceiver.lua reads on every spawn (perks.shazam), so the grant
// persists and re-applies on join without any new game code. Then ping PerkGrant
// so an online player gets it immediately.
// Merge/remove a UserId in the "DashboardWhitelist" DataStore (entry "powers" =
// { [PowerName]: [userIds] }). DashboardWhitelistSync.lua merges this into the
// WhitelistTools table on every server boot, so whitelist-gated powers (Flash,
// Fly, Magic, the flame powers) — and the tool-gate entries for every other
// power — persist across servers and republishes.
async function patchWhitelistStore(uid, key, revoke) {
  const cur = (await dsGet("DashboardWhitelist", "powers")) || {};
  const list = Array.isArray(cur[key]) ? cur[key].map(Number) : [];
  const id = Number(uid);
  cur[key] = revoke ? list.filter((v) => v !== id) : [...new Set([...list, id])];
  await dsSet("DashboardWhitelist", "powers", cur);
}

async function patchPlayerPerksShazam(uid, key, revoke) {
  const entryKey = String(uid);
  const cur = (await dsGet("PlayerPerks", entryKey)) || {};
  const list = Array.isArray(cur.shazam) ? cur.shazam : [];
  cur.shazam = revoke ? list.filter((v) => v !== key) : [...new Set([...list, key])];
  await dsSet("PlayerPerks", entryKey, cur);
  await publish("PerkGrant", { userId: uid });
}

// Same MessagingService topics your bot uses (overridable via env).
const T = () => ({
  power:       process.env.POWER_GRANT_TOPIC        || "DiscordAdminPowerGrantV1",
  powerRemove: process.env.POWER_REMOVE_TOPIC       || "DiscordAdminPowerRemoveV1",
  item:        process.env.ADMIN_GRANT_TOPIC        || "DiscordAdminGrantV1",
  itemRemove:  process.env.ADMIN_GRANT_REMOVE_TOPIC || "DiscordAdminGrantRemoveV1",
});

export async function POST(req) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { category, key, username, action = "grant" } = await req.json();
  if (!category || !key || !username) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (!can(s.level, category)) return NextResponse.json({ error: "Your role can't grant this" }, { status: 403 });
  if (!findItem(category, key)) return NextResponse.json({ error: "Unknown item" }, { status: 400 });

  const user = await resolveUsername(username);
  if (!user) return NextResponse.json({ error: `No Roblox user "${username}"` }, { status: 404 });
  const uid = user.userId, by = s.name, t = T(), revoke = action === "revoke";

  try {
    if (category === "power") {
      await publish(revoke ? t.powerRemove : t.power, { UserId: uid, Power: key, Admin: by });
      // Also feed the WhitelistTools gate: live via DashboardGrant
      // (DashboardWhitelistSync mutates the table in running servers) and
      // persisted via the DashboardWhitelist DataStore (re-merged on boot).
      // For Flash / Fly / Magic / OrangeFlameOn / PurpleFlameOn this IS the
      // grant — the admin topic above doesn't handle them.
      await publish("DashboardGrant", { action, userId: uid, category, key, by: s.id });
      await patchWhitelistStore(uid, key, revoke);
    } else if (category === "stand" || category === "car" || category === "tool" || category === "startbr") {
      // DashboardGrant topic → _G.DashboardGrants:HasGrant → StandsHandler / SVJCarManager apply on spawn.
      await publish("DashboardGrant", { action, userId: uid, category, key, by: s.id });
    } else if (category === "shazam") {
      // ShazamManager.getColor checks HasGrant(uid, "Shazam:<variant>"), so the
      // DashboardGrant key MUST be prefixed. (PlayerPerks/DB below keep the bare key.)
      await publish("DashboardGrant", { action, userId: uid, category, key: `Shazam:${key}`, by: s.id });
      // ... and persist in PlayerPerks so PerkReceiver re-applies it every spawn.
      await patchPlayerPerksShazam(uid, key, revoke);
    } else if (category === "gamepass") {
      await publish(revoke ? t.itemRemove : t.item, { UserId: uid, Item: key, Admin: by });
    } else {
      return NextResponse.json({ error: "Unhandled category" }, { status: 400 });
    }
    // Persist to the shared perks DB so it's in sync with the bot (best-effort).
    let warn = null;
    try {
      if (revoke) {
        const what = dbRevokeWhat(category, key);
        if (what) await revokePerks(uid, what, by);
      } else {
        const patch = dbPatch(category, key);
        if (patch) await grantPerks(uid, patch, by);
      }
    } catch (e) { warn = `Applied in-game, but DB sync failed: ${e.message}`; }

    await logAudit({ actorId: s.id, actorName: s.name, action, category, itemKey: key, target: `${user.username} (${uid})` });
    return NextResponse.json({ ok: true, target: user, warn });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
