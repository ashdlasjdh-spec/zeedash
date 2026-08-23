// Shared model for the Fake Permissions feature — used by the API (validation + audit diff) and the
// dashboard editor so the storage shape never drifts. A config item is:
//   { role: "id", perms: "administrator,manage_roles", features: [ { slug, access:"view"|"manage", channels:[] } ] }
// `perms` stays a comma-string for back-compat; `features` is the richer array (a legacy comma-string
// is still accepted on read and upgraded to full "manage" grants).
import { MANUAL_PERMS, MANUAL_PERM_LABELS, FEATURE_PERM, GROUP_ACTIONS } from "./permissions";
import { FEATURE_GROUPS, SECURITY_SLUGS } from "./serverFeatures";

export const FEATURE_LABEL = Object.fromEntries(FEATURE_GROUPS.flatMap((g) => g.items).map((i) => [i.slug, i.label]));
const NO_GRANT = new Set([...SECURITY_SLUGS, "fake-permissions"]);
export const GRANTABLE_FEATURE_SLUGS = FEATURE_GROUPS.flatMap((g) => g.items).map((i) => i.slug).filter((s) => !NO_GRANT.has(s));
const GRANTABLE = new Set(GRANTABLE_FEATURE_SLUGS);

// Normalize one feature grant (object or bare slug string) → { slug, access, channels } or null.
export function normalizeFeatureGrant(f) {
  const slug = String(f?.slug ?? f ?? "").trim();
  if (!GRANTABLE.has(slug)) return null;
  const access = f?.access === "view" ? "view" : "manage";
  const channels = Array.isArray(f?.channels)
    ? f.channels.map(String).filter(Boolean)
    : String(f?.channels || "").split(/[\s,]+/).filter(Boolean);
  return { slug, access, channels: [...new Set(channels)] };
}

// Normalize a whole items array to the canonical shape, dropping junk & duplicate roles.
export function normalizeItems(items) {
  const out = [];
  const seen = new Set();
  for (const it of Array.isArray(items) ? items : []) {
    const role = String(it?.role || "").match(/^\d{5,}$/)?.[0];
    if (!role || seen.has(role)) continue;
    const perms = [...new Set(String(it?.perms || "").split(/[\s,]+/).filter((p) => MANUAL_PERMS.has(p)))];
    const feats = [];
    const fseen = new Set();
    for (const f of Array.isArray(it?.features) ? it.features : String(it?.features || "").split(/[\s,]+/).filter(Boolean)) {
      const g = normalizeFeatureGrant(f);
      if (g && !fseen.has(g.slug)) { fseen.add(g.slug); feats.push(g); }
    }
    if (!perms.length && !feats.length) continue; // an empty row grants nothing
    seen.add(role);
    out.push({ role, perms: perms.join(","), features: feats });
  }
  return out;
}

// Quick-start presets — one click fills a role's perms + features. Feature slugs must be grantable.
export const PRESETS = [
  { key: "moderator", label: "Moderator", perms: ["manage_messages", "moderate_members", "kick_members"], features: ["automod", "logs", "restrict"] },
  { key: "admin", label: "Admin", perms: ["ban_members", "manage_roles", "manage_channels", "manage_messages", "moderate_members", "kick_members"], features: [] },
  { key: "event_host", label: "Event Host", perms: ["manage_events"], features: ["giveaways", "timers"] },
  { key: "support", label: "Support", perms: ["manage_channels"], features: ["tickets"] },
  { key: "roles_manager", label: "Roles Manager", perms: ["manage_roles"], features: ["autorole", "reaction-roles", "button-roles", "boosterrole"] },
  { key: "greeter", label: "Greeter", perms: [], features: ["welcome", "goodbye", "pingonjoin"] },
];

// A human line describing a preset (for the audit + tooltips).
export function presetSummary(p) {
  const perms = p.perms.map((x) => MANUAL_PERM_LABELS[x] || x);
  const feats = p.features.map((x) => FEATURE_LABEL[x] || x);
  return [...perms, ...feats].join(", ");
}

// Resolve what a set of role IDs unlocks from a fake-permissions config → { perms, manage, view }.
// `manage` = features fully manageable (perm buckets + manage grants); `view` = view-only grants.
export function resolveFakeForRoles(config, roleIds) {
  const ids = new Set((roleIds || []).map(String));
  const perms = new Set();
  const grants = {}; // slug -> "manage" | "view"
  for (const it of normalizeItems(config?.items)) {
    if (!ids.has(String(it.role))) continue;
    for (const p of String(it.perms || "").split(/[\s,]+/).filter(Boolean)) perms.add(p);
    for (const f of it.features) {
      grants[f.slug] = grants[f.slug] === "manage" || f.access === "manage" ? "manage" : "view";
    }
  }
  const isAdmin = perms.has("administrator");
  const manage = new Set();
  for (const slug of GRANTABLE_FEATURE_SLUGS) {
    const need = FEATURE_PERM[slug] || "administrator";
    if (isAdmin || perms.has(need)) manage.add(slug);
  }
  const view = new Set();
  for (const [slug, acc] of Object.entries(grants)) {
    if (acc === "manage" || manage.has(slug)) manage.add(slug);
    else view.add(slug);
  }
  return { perms: [...perms], manage: [...manage], view: [...view] };
}

// Resolve what a set of role IDs unlocks from a role-access (group delegation) config, or null.
export function resolveGroupForRoles(config, roleIds) {
  const ids = new Set((roleIds || []).map(String));
  const actions = new Set();
  let maxRank = null;
  for (const it of Array.isArray(config?.items) ? config.items : []) {
    if (!ids.has(String(it.role))) continue;
    const g = it.group || {};
    for (const a of Array.isArray(g.actions) ? g.actions : []) if (GROUP_ACTIONS.includes(a)) actions.add(a);
    const mr = Number(g.maxRank);
    if (Number.isFinite(mr)) maxRank = maxRank == null ? mr : Math.max(maxRank, mr);
  }
  return actions.size ? { actions: [...actions], maxRank } : null;
}

// Diff two fake-permissions configs → human audit lines (added/removed perms & features per role).
export function diffFakePerms(prev, next) {
  const byRole = (cfg) => {
    const m = new Map();
    for (const it of normalizeItems(cfg?.items)) m.set(it.role, it);
    return m;
  };
  const a = byRole(prev), b = byRole(next);
  const lines = [];
  const permSet = (it) => new Set(String(it?.perms || "").split(/[\s,]+/).filter(Boolean));
  const featSet = (it) => new Set((it?.features || []).map((f) => `${f.slug}${f.access === "view" ? " (view)" : ""}`));
  const roles = new Set([...a.keys(), ...b.keys()]);
  for (const role of roles) {
    const oa = a.get(role), ob = b.get(role);
    if (!oa && ob) { lines.push(`Added role <@&${role}>: ${[...permSet(ob)].map((p) => MANUAL_PERM_LABELS[p] || p).join(", ") || "—"}${ob.features.length ? ` + features: ${ob.features.map((f) => FEATURE_LABEL[f.slug] || f.slug).join(", ")}` : ""}`); continue; }
    if (oa && !ob) { lines.push(`Removed role <@&${role}>`); continue; }
    const pa = permSet(oa), pb = permSet(ob);
    const addedP = [...pb].filter((x) => !pa.has(x)).map((p) => MANUAL_PERM_LABELS[p] || p);
    const remP = [...pa].filter((x) => !pb.has(x)).map((p) => MANUAL_PERM_LABELS[p] || p);
    const fa = featSet(oa), fb = featSet(ob);
    const addedF = [...fb].filter((x) => !fa.has(x));
    const remF = [...fa].filter((x) => !fb.has(x));
    const parts = [];
    if (addedP.length) parts.push(`+perms ${addedP.join(", ")}`);
    if (remP.length) parts.push(`-perms ${remP.join(", ")}`);
    if (addedF.length) parts.push(`+features ${addedF.map((s) => FEATURE_LABEL[s.replace(/ \(view\)$/, "")] ? (FEATURE_LABEL[s.replace(/ \(view\)$/, "")] + (s.endsWith("(view)") ? " (view)" : "")) : s).join(", ")}`);
    if (remF.length) parts.push(`-features ${remF.map((s) => FEATURE_LABEL[s.replace(/ \(view\)$/, "")] || s).join(", ")}`);
    if (parts.length) lines.push(`Role <@&${role}>: ${parts.join("; ")}`);
  }
  return lines;
}
