import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { publish, resolveUsername } from "@/lib/roblox";
import { findItem } from "@/lib/catalog";
import { grantPerks, revokePerks } from "@/lib/perksApi";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

// Categories that live in the shared perks table (so they persist + show up on
// the bot). power + gamepass only — stand/car/tool apply in-game via DashboardGrant.
function dbPatch(category, key) {
  if (category === "power") return { powers: [key] };
  if (category === "gamepass") return { gamepasses: [key] };
  return null;
}
function dbRevokeWhat(category, key) {
  if (["power", "gamepass"].includes(category)) return `${category}:${key}`;
  return null;
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
  if (!can(s.role, category)) return NextResponse.json({ error: "Your role can't grant this" }, { status: 403 });
  if (!findItem(category, key)) return NextResponse.json({ error: "Unknown item" }, { status: 400 });

  const user = await resolveUsername(username);
  if (!user) return NextResponse.json({ error: `No Roblox user "${username}"` }, { status: 404 });
  const uid = user.userId, by = s.name, t = T(), revoke = action === "revoke";

  try {
    if (category === "power") {
      await publish(revoke ? t.powerRemove : t.power, { UserId: uid, Power: key, Admin: by });
    } else if (category === "stand" || category === "car" || category === "tool") {
      // DashboardGrant topic → _G.DashboardGrants:HasGrant → StandsHandler / SVJCarManager apply on spawn.
      await publish("DashboardGrant", { action, userId: uid, category, key, by: s.id });
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

    await query(`insert into audit_log (actor_id, actor_name, action, category, item_key, target) values ($1,$2,$3,$4,$5,$6)`,
      [s.id, s.name, action, category, key, `${user.username} (${uid})`]);
    return NextResponse.json({ ok: true, target: user, warn });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
