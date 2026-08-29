// Single source of truth for the Server Management feature catalogue. The sidebar nav, the at-a-glance
// Feature Overview, and the permission allow-list all derive from this one list — so a feature is
// added/renamed/regrouped in exactly one place instead of three drifting copies.
//
// Each item: { label, slug, security?, overview? }
//   security: managed through the antinuke-admin path (Antinuke/Antiraid), not plain feature perms.
//   overview: set false to keep a non-toggle page (e.g. Message Builder) out of the on/off overview.
export const FEATURE_GROUPS = [
  { label: "Settings", overview: false, items: [
    { label: "General", slug: "settings-general" },
    { label: "Customize", slug: "customize" },
    { label: "AutoPFP", slug: "autopfp" },
    { label: "Restrict", slug: "restrict" },
    { label: "Disable", slug: "disable" },
  ] },
  { label: "Security", items: [
    { label: "Fake Permissions", slug: "fake-permissions" },
    { label: "Automod", slug: "automod" },
    { label: "Antiraid", slug: "antiraid", security: true },
    { label: "Antinuke", slug: "antinuke", security: true },
    { label: "Honeypot", slug: "honeypot" },
  ] },
  { label: "Automation", items: [
    { label: "Autoresponder", slug: "autoresponder" },
    { label: "Autoreact", slug: "autoreact" },
    { label: "Autorole", slug: "autorole" },
    { label: "Ping on Join", slug: "pingonjoin" },
    { label: "Tracking", slug: "tracking", overview: false },
  ] },
  { label: "Utility", items: [
    { label: "Message Builder", slug: "message-builder", overview: false },
    { label: "Embeds", slug: "embeds", overview: false },
    { label: "Bump Reminder", slug: "bump" },
    { label: "Button Roles", slug: "button-roles" },
    { label: "Levels", slug: "levels" },
    { label: "Reaction Roles", slug: "reaction-roles" },
    { label: "Sticky Message", slug: "sticky" },
  ] },
  { label: "Server", items: [
    { label: "Starboard", slug: "starboard" },
    { label: "Welcome", slug: "welcome" },
    { label: "Goodbye", slug: "goodbye" },
    { label: "Aliases", slug: "aliases" },
    { label: "Logs", slug: "logs" },
    { label: "VoiceMaster", slug: "voicemaster" },
    { label: "Tickets", slug: "tickets" },
  ] },
  { label: "Economy & Fun", items: [
    { label: "Economy", slug: "economy" },
    { label: "Booster Role", slug: "boosterrole" },
    { label: "Giveaways", slug: "giveaways" },
    { label: "Counter Channels", slug: "counters" },
    { label: "Timers", slug: "timers" },
  ] },
];

// Top-of-nav links that aren't toggleable features (their own routes, always shown when reachable).
export const TOP_LINKS = [
  { href: "/bot", label: "Overview" },
  { href: "/bot/onboarding", label: "Get Started" },
  { href: "/bot/leaderboard", label: "Leaderboard" },
];

export const SECURITY_SLUGS = ["antinuke", "antiraid"];
export const ALL_FEATURE_SLUGS = FEATURE_GROUPS.flatMap((g) => g.items.map((i) => i.slug));
export const NONSECURITY_FEATURES = ALL_FEATURE_SLUGS.filter((s) => !SECURITY_SLUGS.includes(s));

// Groups for the at-a-glance overview: drop non-overview groups and non-toggle items.
export const OVERVIEW_GROUPS = FEATURE_GROUPS
  .filter((g) => g.overview !== false)
  .map((g) => ({ label: g.label, items: g.items.filter((i) => i.overview !== false) }))
  .filter((g) => g.items.length);
