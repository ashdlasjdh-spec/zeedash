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
// readDefs returns the current tag map. CRITICAL: it distinguishes "key genuinely empty"
// (dsGet returns null on 404) from a read that returned something unusable. If the read
// throws (network / auth / 5xx), we must NOT silently fall back to {} — merging onto {} and
// writing would WIPE every existing tag. dsGet already throws on non-404 errors, so we let
// that propagate; the write paths catch it and abort rather than nuke the datastore.
async function readDefs() {
  const d = await dsGet(STORE, KEY); // throws on real errors; null only on 404 (truly empty)
  return d && typeof d === "object" && !Array.isArray(d) ? d : {};
}

// Guard against clobbering a populated datastore with a near-empty write. If the store already
// held many tags but this write would shrink it drastically, that signals the merge base was
// lost (e.g. a failed read or a universe swap). Callers pass the pre-write count so we can bail.
function wouldClobber(prevCount, nextCount) {
  // allow normal deletes; only block a catastrophic drop (had lots, about to write almost none)
  return prevCount >= 20 && nextCount < Math.max(5, Math.floor(prevCount * 0.5));
}

function normTag(def) {
  return {
    name: String(def.name || "").slice(0, 40),
    colors: toRgbList(def.colors),
    iconId: def.iconId ? String(def.iconId).replace(/\D/g, "") : "",
    animated: def.animated !== false,
    dir: ["down", "up", "left", "right", "diagonal"].includes(def.dir) ? def.dir : "diagonal",
    speed: def.speed != null && !Number.isNaN(Number(def.speed)) ? Math.max(0.05, Math.min(4, Number(def.speed))) : 0.5,
  };
}

// Create/update a tag in-game. rank null/blank = the group-wide default tag; a number
// = a per-rank tag. Existing tags for the group are preserved (mirror of bot makeTag).
export async function pushTag(groupId, rank, def, by) {
  const gid = String(parseInt(groupId, 10));
  if (gid === "NaN") throw new Error("Group ID must be numeric.");
  const rk = normRank(rank);
  const tag = normTag(def);
  const defs = await readDefs();
  let entry = defs[gid];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) entry = {};
  if (rk === null) {
    entry.name = tag.name; entry.colors = tag.colors; entry.iconId = tag.iconId; entry.animated = tag.animated; entry.dir = tag.dir; entry.speed = tag.speed;
  } else {
    if (!entry.rankTags || typeof entry.rankTags !== "object") entry.rankTags = {};
    entry.rankTags[rk] = tag;
  }
  entry.by = by || "web";
  entry.at = Math.floor(Date.now() / 1000);
  defs[gid] = entry;
  await dsSet(STORE, KEY, defs);
  // Best-effort live ping: if MessagingService is momentarily unavailable the tag is
  // still saved (the game re-subscribes and the next edit re-pings). Don't fail the save.
  try { await publish(TOPIC, {}); } catch (e) { console.error('[crewtags] live ping failed:', e.message); }
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
  // Best-effort live ping: if MessagingService is momentarily unavailable the tag is
  // still saved (the game re-subscribes and the next edit re-pings). Don't fail the save.
  try { await publish(TOPIC, {}); } catch (e) { console.error('[crewtags] live ping failed:', e.message); }
}

// Push MANY tags in one shot — one DataStore write + ONE CrewTagUpdate publish,
// instead of a write+publish per tag. Used by the DB -> game sync so restoring
// dozens of tags doesn't spam the in-game loader with refresh after refresh
// (each of which used to make the tag renderer rebuild + restart animations).
// tagsMap shape = perks-api listTags(): { [groupId]: { name, colors, iconId,
// animated, rankTags: { [rank]: tag } } }. Returns { pushed, errors }.
export async function pushTagsBulk(tagsMap, by) {
  const defs = await readDefs();
  const prevCount = Object.keys(defs).length;
  let pushed = 0;
  const errors = [];
  for (const [groupId, def] of Object.entries(tagsMap || {})) {
    const gid = String(parseInt(groupId, 10));
    if (gid === "NaN") { errors.push(`${groupId}: bad group id`); continue; }
    let entry = defs[gid];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) entry = {};
    try {
      if (def?.name || (def?.colors || []).length) {
        const tag = normTag(def);
        entry.name = tag.name; entry.colors = tag.colors; entry.iconId = tag.iconId; entry.animated = tag.animated; entry.dir = tag.dir; entry.speed = tag.speed;
        pushed++;
      }
      for (const [rank, rt] of Object.entries(def?.rankTags || {})) {
        const rk = normRank(rank);
        if (rk === null) continue;
        if (!entry.rankTags || typeof entry.rankTags !== "object") entry.rankTags = {};
        entry.rankTags[rk] = normTag(rt);
        pushed++;
      }
      entry.by = by || "web";
      entry.at = Math.floor(Date.now() / 1000);
      defs[gid] = entry;
    } catch (e) {
      errors.push(`${groupId}: ${e.message}`);
    }
  }
  // Safety: never write a drastically smaller set over a populated one (indicates a lost base).
  if (wouldClobber(prevCount, Object.keys(defs).length)) {
    throw new Error(`Refusing to sync: would shrink CrewTagDefs from ${prevCount} to ${Object.keys(defs).length} tags (merge base looks lost). Datastore left unchanged.`);
  }
  await dsSet(STORE, KEY, defs);
  // Best-effort live ping: if MessagingService is momentarily unavailable the tag is
  // still saved (the game re-subscribes and the next edit re-pings). Don't fail the save.
  try { await publish(TOPIC, {}); } catch (e) { console.error('[crewtags] live ping failed:', e.message); }
  return { pushed, errors };
}
