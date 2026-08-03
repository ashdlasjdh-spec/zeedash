import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { publish, resolveUsername } from "@/lib/roblox";
import { findItem } from "@/lib/catalog";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

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
    } else if (category === "stand") {
      if (key === "TW") await publish(revoke ? t.powerRemove : t.power, { UserId: uid, Power: key, Admin: by });
      else await publish("DashboardGrant", { action, userId: uid, category, key, by: s.id }); // StandsHandler (Wonder of U / D4C)
    } else if (category === "gamepass" || category === "tool" || category === "perk") {
      await publish(revoke ? t.itemRemove : t.item, { UserId: uid, Item: key, Admin: by });
    } else {
      return NextResponse.json({ error: "Unhandled category" }, { status: 400 });
    }
    await query(`insert into audit_log (actor_id, actor_name, action, category, item_key, target) values ($1,$2,$3,$4,$5,$6)`,
      [s.id, s.name, action, category, key, `${user.username} (${uid})`]);
    return NextResponse.json({ ok: true, target: user });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
