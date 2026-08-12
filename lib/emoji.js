import { dsGet, dsSet, publish, resolveUsername } from "@/lib/roblox";
import { setEmoji as dbSetEmoji } from "@/lib/perksApi";
import { logAudit } from "@/lib/db";

// Split into individual emojis (grapheme clusters), dropping stray brackets/space.
function splitEmojis(input) {
  if (!input) return [];
  let parts;
  try {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    parts = [...seg.segment(String(input))].map((s) => s.segment);
  } catch {
    parts = Array.from(String(input));
  }
  return parts.filter((s) => s.trim() !== "" && s !== "[" && s !== "]");
}
const bracket = (list) => list.map((e) => "[" + e + "]").join(" ");

// Set / add / remove a user's custom emoji string in the CustomEmojis datastore (mirrored to the DB).
// Returns { ok, target, value } or { error, status }.
export async function applyEmoji({ username, userId, emojis, action = "set", actorName, actorId }) {
  let user;
  if (userId && action === "remove") user = { userId: String(userId), username: String(userId) };
  else { user = await resolveUsername(username); if (!user) return { error: "No such Roblox user", status: 404 }; }

  const defs = (await dsGet("CustomEmojis", "emojis")) || {};
  const prevCount = Object.keys(defs).length;
  const uid = String(user.userId);
  let stored = "";
  if (action === "remove") delete defs[uid];
  else if (action === "add") { const merged = [...new Set([...splitEmojis(defs[uid] || ""), ...splitEmojis(emojis)])]; stored = bracket(merged); defs[uid] = stored; }
  else { stored = bracket(splitEmojis(emojis)); defs[uid] = stored; }

  // Anti-clobber: a single-user op should change the entry count by at most 1.
  const nextCount = Object.keys(defs).length;
  if (prevCount >= 5 && nextCount < prevCount - 1) {
    return { error: `Aborted: emoji store would shrink from ${prevCount} to ${nextCount} entries (read looks lost). Left unchanged.`, status: 409 };
  }
  await dsSet("CustomEmojis", "emojis", defs);
  try { await dbSetEmoji(user.userId, action === "remove" ? "" : stored, actorName); } catch (e) { console.error("[emoji] db mirror failed:", e.message); }
  await publish("CustomEmojiUpdate", { userId: user.userId }).catch(() => {});
  await logAudit({
    actorId, actorName, action: action === "remove" ? "revoke" : "grant", category: "emoji",
    target: `${user.username} (${user.userId})`, detail: action === "remove" ? "removed emojis" : stored,
  });
  return { ok: true, target: user, value: stored };
}
