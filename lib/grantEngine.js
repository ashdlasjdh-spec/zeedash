// Shared grant/revoke engine. The single-item grant route (/api/grant) and the
// owner-only mass purge (/api/grant/purge) both go through applyGrant so their
// in-game + datastore + shared-DB effects are IDENTICAL — one source of truth.
import { publish, dsGet, dsSet } from "@/lib/roblox";
import { grantPerks, revokePerks } from "@/lib/perksApi";

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

// The shared perks-DB field each grant category writes to. Also drives which
// categories the "Currently granted" list and the mass purge can enumerate.
export const PERK_FIELD = { power: "powers", gamepass: "gamepasses", shazam: "shazam", tool: "tools", startbr: "startbr", stand: "stand", car: "car" };

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

// Merge/remove a shazam variant in the user's PlayerPerks DataStore entry — the
// SAME entry PerkReceiver.lua reads on every spawn (perks.shazam), so the grant
// persists and re-applies on join without any new game code. Then ping PerkGrant
// so an online player gets it immediately.
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

// Apply a single grant/revoke everywhere it needs to land (MessagingService +
// datastores + shared perks DB). Throws on a hard in-game failure; a soft
// shared-DB sync failure is returned as { warn } (the in-game grant still stuck).
// `by` = actor display name, `byId` = actor Discord id.
export async function applyGrant({ category, key, uid, by, byId, action = "grant" }) {
  const t = T(), revoke = action === "revoke";

  let inGameErr = null;
  try {
    if (category === "power") {
      await publish(revoke ? t.powerRemove : t.power, { UserId: uid, Power: key, Admin: by });
      await publish("DashboardGrant", { action, userId: uid, category, key, by: byId });
      await patchWhitelistStore(uid, key, revoke);
    } else if (category === "stand" || category === "car" || category === "tool" || category === "startbr") {
      await publish("DashboardGrant", { action, userId: uid, category, key, by: byId });
    } else if (category === "shazam") {
      await publish("DashboardGrant", { action, userId: uid, category, key: `Shazam:${key}`, by: byId });
      await patchPlayerPerksShazam(uid, key, revoke);
    } else if (category === "gamepass") {
      await publish(revoke ? t.itemRemove : t.item, { UserId: uid, Item: key, Admin: by });
    } else {
      throw new Error("Unhandled category");
    }
  } catch (e) {
    // GRANT: an in-game failure is fatal — nothing was granted, so throw. REVOKE (incl. temp-grant
    // expiry): DON'T throw on an in-game hiccup — we still want the shared-DB entry removed below,
    // otherwise the perk lingers in the DB and re-applies. Surface it as a warning instead.
    if (!revoke) throw e;
    inGameErr = e.message;
  }

  // Persist to the shared perks DB so it's in sync with the bot. Always attempted for a revoke.
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

  if (inGameErr) warn = warn ? `${warn}; in-game: ${inGameErr}` : `Removed from DB, but an in-game step failed: ${inGameErr}`;
  return { warn };
}
