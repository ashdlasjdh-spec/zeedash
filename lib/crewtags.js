// Publishes crew tags INTO the game via Open Cloud — the same contract the bot and
// the zeehood.org tag maker use. The game's CrewTagLoader reads the "CrewTagDefs"
// DataStore (entry "defs") and refreshes when the "CrewTagUpdate" topic is pinged.
// Colors are stored as [r,g,b] arrays (what the loader expects). The perks-api DB is
// only a durable mirror — the game never reads it, so a tag that isn't written here
// never shows up in-game (which is exactly why dashboard-saved tags weren't applying).
import { dsGet, dsSet, publish } from "./roblox";

const STORE = "CrewTagDefs";
const KEY = "defs";
const TOPIC = "CrewTagUpdate";

function hexToRgb(hex) {
  if (Array.isArray(hex)) return hex.map((n) => Math.max(0, Math.min(255, n | 0)));
  let m = String(hex).trim().replace(/^#/, "");
  if (m.length === 3) m = m.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(m)) throw new Error(`Bad hex color: ${hex}`);
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}
function toRgbList(colors) {
  const list = (colors || []).map(hexToRgb);
  if (!list.length) throw new Error("Provide at least one color.");
  return list.slice(0, 8);
}
function normRank(rank) {
  if (rank === null || rank === undefined || rank === "") return null;
  const n = parseInt(rank, 10);
  if (Number.isNaN(n) || n < 0 || n > 255) throw new Error("Rank must be a number 0-255.");
  return String(n);
}
async function readDefs() {
  const d = await dsGet(STORE, KEY);
  return d && typeof d === "object" && !Array.isArray(d) ? d : {};
}

// Create/update a tag in-game. rank null/blank = the group-wide default tag; a number
// = a per-rank tag. Existing tags for the group are preserved (mirror of bot makeTag).
export async function pushTag(groupId, rank, def, by) {
  const gid = String(parseInt(groupId, 10));
  if (gid === "NaN") throw new Error("Group ID must be numeric.");
  const rk = normRank(rank);
  const tag = {
    name: String(def.name || "").slice(0, 40),
    colors: toRgbList(def.colors),
    iconId: def.iconId ? String(def.iconId).replace(/\D/g, "") : "",
    animated: def.animated !== false,
  };
  const defs = await readDefs();
  let entry = defs[gid];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) entry = {};
  if (rk === null) {
    entry.name = tag.name; entry.colors = tag.colors; entry.iconId = tag.iconId; entry.animated = tag.animated;
  } else {
    if (!entry.rankTags || typeof entry.rankTags !== "object") entry.rankTags = {};
    entry.rankTags[rk] = tag;
  }
  entry.by = by || "web";
  entry.at = Math.floor(Date.now() / 1000);
  defs[gid] = entry;
  await dsSet(STORE, KEY, defs);
  await publish(TOPIC, {});
}

// Remove a tag in-game. rank null/blank = the whole group; a number = just that rank.
export async function unpushTag(groupId, rank) {
  const gid = String(parseInt(groupId, 10));
  const rk = normRank(rank);
  const defs = await readDefs();
  const entry = defs[gid];
  if (!entry) return;
  if (rk === null) {
    delete defs[gid];
  } else {
    if (entry.rankTags) {
      delete entry.rankTags[rk];
      if (Object.keys(entry.rankTags).length === 0) delete entry.rankTags;
    }
    if (!entry.name && !entry.rankTags) delete defs[gid];
  }
  await dsSet(STORE, KEY, defs);
  await publish(TOPIC, {});
}
