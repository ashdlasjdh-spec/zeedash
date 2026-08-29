// Role-Access item sanitization — the pure logic behind saving/loading Role Access grants, in its own
// module so it can be unit-tested (this persistence path regressed twice, so it's pinned by a test).
import { GROUP_ACTIONS, RANK_ASSIGN_ACTIONS, SECTION_GRANTS } from "./permissions.js";

// Sanitize one stored/posted item into { role?, user?, group:{ actions, maxRank }, transcripts, sections }
// or null. An item targets EITHER a Discord role OR a specific user id. Returns null only when it
// targets no one, or grants nothing — NEVER because a role isn't in some live role list (that check
// lives in the route and only annotates, it never drops).
export function cleanItem(it) {
  const role = String(it?.role || "").match(/^\d{5,}$/)?.[0] || null;
  const user = String(it?.user || "").match(/^\d{5,}$/)?.[0] || null;
  if (!role && !user) return null; // must target someone
  const g = it?.group || {};
  const actions = [...new Set((Array.isArray(g.actions) ? g.actions : []).map(String).filter((a) => GROUP_ACTIONS.includes(a)))];
  const transcripts = !!it?.transcripts; // may view ticket transcripts for this server
  const sections = [...new Set((Array.isArray(it?.sections) ? it.sections : []).map(String).filter((s) => SECTION_GRANTS.includes(s)))];
  if (!actions.length && !transcripts && !sections.length) return null; // grants nothing
  // A ceiling only matters when the role can lift people up; store it as a plain rank number.
  const needsCeiling = actions.some((a) => RANK_ASSIGN_ACTIONS.has(a));
  const mr = Number(g.maxRank);
  const maxRank = needsCeiling && Number.isFinite(mr) ? Math.max(0, Math.min(255, Math.floor(mr))) : null;
  const out = { group: { actions, maxRank }, transcripts, sections };
  if (role) out.role = role;
  if (user) out.user = user;
  return out;
}

// Sanitize + deduplicate a posted list into what actually gets stored. This is the exact transform the
// save path applies — persisting EXACTLY what was set (minus junk/dupes), never dropping a valid grant.
export function sanitizeItems(items) {
  const seen = new Set();
  const clean = [];
  for (const raw of Array.isArray(items) ? items : []) {
    const it = cleanItem(raw);
    if (!it) continue;
    const key = it.role ? `r:${it.role}` : `u:${it.user}`;
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push(it);
  }
  return clean;
}
