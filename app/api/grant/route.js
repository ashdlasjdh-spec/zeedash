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
  if (category === "stand") return { stand: [key] };
  if (category === "car") return { car: [key] };
  return null;
}
function dbRevokeWhat(category, key) {
  if (["power", "gamepass", "shazam", "tool", "startbr", "stand", "car"].includes(category)) return `${category}:${key}`;
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
  const prevKeys = Object.keys(cur).length;
  const list = Array.isArray(cur[key]) ? cur[key].map(Number) : [];
  const id = Number(uid);
  cur[key] = revoke ? list.filter((v) => v !== id) : [...new Set([...list, id])];
  // Anti-clobber: modifying one power should not drop other powers' lists. If the map lost
  // most of its keys, the read came back empty/partial — abort rather than wipe the whitelist.
  const nextKeys = Object.keys(cur).length;
  if (prevKeys >= 3 && nextKeys < Math.max(2, Math.floor(prevKeys * 0.5))) {
    throw new Error(`Refusing whitelist write: would drop from ${prevKeys} to ${nextKeys} powers (read looks lost). Left unchanged.`);
  }
  await dsSet("DashboardWhitelist", "powers", cur);
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
    // ---- 1) apply LIVE in running servers ----
    if (category === "power") {
      await publish(revoke ? t.powerRemove : t.power, { UserId: uid, Power: key, Admin: by });
      // WhitelistTools gate: live via DashboardGrant (DashboardWhitelistSync mutates the
      // table in running servers) + persisted via the DashboardWhitelist DataStore. For
      // Flash / Fly / Magic / the flames this IS the grant (the admin topic ignores them).
      await publish("DashboardGrant", { action, userId: uid, category, key, by: s.id });
      await patchWhitelistStore(uid, key, revoke);
    } else if (category === "stand" || category === "car" || category === "tool" || category === "startbr") {
      // DashboardGrant → _G.DashboardGrants:HasGrant → StandsHandler / SVJCarManager on spawn.
      await publish("DashboardGrant", { action, userId: uid, category, key, by: s.id });
    } else if (category === "shazam") {
      // ShazamManager.getColor checks HasGrant(uid, "Shazam:<variant>") — key MUST be prefixed.
      await publish("DashboardGrant", { action, userId: uid, category, key: `Shazam:${key}`, by: s.id });
    } else if (category === "gamepass") {
      await publish(revoke ? t.itemRemove : t.item, { UserId: uid, Item: key, Admin: by });
    } else {
      return NextResponse.json({ error: "Unhandled category" }, { status: 400 });
    }

    // ---- 2) SAVE to the shared DB (source of truth), then project the WHOLE record into
    // PlayerPerks so it re-applies on every spawn and survives universe swaps. Writing the
    // full DB record (rather than a read-modify-write of the DataStore) avoids lost-update
    // races when several grants hit the same user quickly — the "sometimes doesn't save".
    let warn = null;
    try {
      let record = null;
      if (revoke) {
        const what = dbRevokeWhat(category, key);
        if (what) record = await revokePerks(uid, what, by);
      } else {
        const patch = dbPatch(category, key);
        if (patch) record = await grantPerks(uid, patch, by);
      }
      if (record) {
        await dsSet("PlayerPerks", String(uid), {
          gamepasses: record.gamepasses || [], powers: record.powers || [],
          tools: record.tools || [], shazam: record.shazam || [],
          stand: record.stand || [], car: record.car || [], startbr: record.startbr || [],
          armor: record.armor || 0, grantedBy: by, updatedAt: Math.floor(Date.now() / 1000),
        });
        await publish("PerkGrant", { userId: uid });
      }
    } catch (e) { warn = `Applied in-game, but save failed: ${e.message}`; }

    await logAudit({ actorId: s.id, actorName: s.name, action, category, itemKey: key, target: `${user.username} (${uid})` });
    return NextResponse.json({ ok: true, target: user, warn });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
