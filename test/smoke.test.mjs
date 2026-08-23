// Smoke tests for pure dashboard logic. Run: npm test
// Covers the XP curve and the per-server permission helpers (the security-sensitive gates).
import test from "node:test";
import assert from "node:assert";
import { levelFromXp, xpForNext } from "../lib/levels.js";
import {
  canManageGuild, canAccessServerSection, guildOwnerOf, isSecurityFeature, SECURITY_FEATURES,
  canManageFeature, manageableFeatures, hasManualPerm, canReachGuild, featurePerm, NONSECURITY_FEATURES,
  isSuperOwner, canPurge, hasFeatureGrant,
} from "../lib/permissions.js";

test("levelFromXp is monotonic and starts at 0", () => {
  assert.strictEqual(levelFromXp(0), 0);
  let prev = 0, total = 0;
  for (let l = 0; l < 30; l++) { total += xpForNext(l); const lvl = levelFromXp(total); assert.ok(lvl >= prev, `level should not decrease at ${total}xp`); prev = lvl; }
  assert.ok(levelFromXp(1_000_000) > levelFromXp(1000));
});

test("security feature set is exactly antinuke + antiraid", () => {
  assert.ok(isSecurityFeature("antinuke"));
  assert.ok(isSecurityFeature("antiraid"));
  assert.ok(!isSecurityFeature("automod"));
  assert.ok(!isSecurityFeature("welcome"));
  assert.strictEqual(SECURITY_FEATURES.size, 2);
});

test("canManageGuild: Discord admin of a guild, but not of others", () => {
  const admin = { level: 0, serverPerms: { "111": { a: true, o: false } }, serverGuildIds: ["111"] };
  assert.ok(canManageGuild(admin, "111"), "admin of 111 can manage 111");
  assert.ok(!canManageGuild(admin, "222"), "not admin of 222");
  assert.ok(!guildOwnerOf(admin, "111"), "admin is not owner");
  assert.ok(canAccessServerSection(admin), "has server section access");
});

test("Roblox rank grants NO server access without Discord perms in that guild", () => {
  // A director (high Roblox staff) with no Discord admin anywhere must not reach the Server section
  // or any guild's config — access is purely per-Discord-server.
  const director = { level: 249, serverPerms: {}, serverGuildIds: [] };
  assert.ok(!canManageGuild(director, "999"), "no Discord perms → no manage, regardless of rank");
  assert.ok(!canAccessServerSection(director), "no Discord perms → no Server section");

  // Same director, but a Discord admin of guild 111 only: sees 111, not 222.
  const director2 = { level: 249, serverPerms: { "111": { a: true, o: false } }, serverGuildIds: ["111"] };
  assert.ok(canManageGuild(director2, "111"));
  assert.ok(!canManageGuild(director2, "222"));

  const nobody = { level: 0, serverPerms: {}, serverGuildIds: [] };
  assert.ok(!canManageGuild(nobody, "111"));
  assert.ok(!canAccessServerSection(nobody));
});

test("guild owner is recognised", () => {
  const owner = { level: 0, serverPerms: { "111": { a: true, o: true } }, serverGuildIds: ["111"] };
  assert.ok(guildOwnerOf(owner, "111"));
});

test("Discord admin manages every non-security feature except fake-permissions, and none of the security ones", () => {
  const admin = { serverPerms: { "111": { a: true, o: false } }, serverGuildIds: ["111"] };
  // Fake permissions mints who the bot treats as admin, so it's server-owner (or super-owner) only —
  // a plain Discord admin can manage everything else non-security, but not that.
  for (const f of NONSECURITY_FEATURES) {
    if (f === "fake-permissions") assert.ok(!canManageFeature(admin, "111", f), "admin can't manage fake-permissions");
    else assert.ok(canManageFeature(admin, "111", f), `admin manages ${f}`);
  }
  // canManageFeature never resolves security features — those go through the antinuke path.
  assert.ok(!canManageFeature(admin, "111", "antinuke"));
  assert.ok(!canManageFeature(admin, "111", "antiraid"));
  // An admin's manageable set is the non-security list minus fake-permissions.
  const expected = new Set(NONSECURITY_FEATURES.filter((f) => f !== "fake-permissions"));
  assert.deepStrictEqual(new Set(manageableFeatures(admin, "111")), expected);
  // The guild OWNER, however, can manage fake-permissions.
  const owner = { serverPerms: { "111": { a: true, o: true } }, serverGuildIds: ["111"] };
  assert.ok(canManageFeature(owner, "111", "fake-permissions"), "server owner manages fake-permissions");
});

test("manual 'administrator' perm == admin for non-security features, but not for fake-permissions itself", () => {
  const u = { serverPerms: {}, manualPerms: { "111": ["administrator"] }, serverGuildIds: ["111"] };
  assert.ok(canReachGuild(u, "111"), "manual perm makes the guild reachable");
  assert.ok(canAccessServerSection(u));
  assert.ok(canManageFeature(u, "111", "welcome"), "administrator unlocks welcome");
  assert.ok(canManageFeature(u, "111", "levels"), "administrator unlocks levels");
  assert.ok(canManageFeature(u, "111", "autorole"), "administrator unlocks autorole");
  // But a manually-elevated admin cannot rewrite the manual-permission map (no minting more).
  assert.ok(!canManageFeature(u, "111", "fake-permissions"), "manual admin can't edit fake-permissions");
  // Security stays locked regardless of a manual administrator perm.
  assert.ok(!canManageFeature(u, "111", "antinuke"));
});

test("an antinuke admin (security standing) can manage fake-permissions, a plain admin cannot", () => {
  const antinukeAdmin = { serverPerms: {}, securityGuildIds: ["111"], serverGuildIds: ["111"] };
  assert.ok(canManageFeature(antinukeAdmin, "111", "fake-permissions"), "antinuke admin manages fake-permissions");
  const plainAdmin = { serverPerms: { "111": { a: true, o: false } }, serverGuildIds: ["111"] };
  assert.ok(!canManageFeature(plainAdmin, "111", "fake-permissions"), "plain admin cannot");
  // A super owner manages it everywhere.
  assert.ok(canManageFeature({ isOwner: true }, "999", "fake-permissions"));
});

test("a direct per-feature grant unlocks exactly that feature, per guild, and never fake-permissions", () => {
  const u = { serverPerms: {}, manualPerms: {}, featurePerms: { "111": ["tickets", "autorole"] }, serverGuildIds: ["111"] };
  assert.ok(hasFeatureGrant(u, "111", "tickets"));
  assert.ok(canManageFeature(u, "111", "tickets"), "granted feature is manageable");
  assert.ok(canManageFeature(u, "111", "autorole"));
  assert.ok(!canManageFeature(u, "111", "welcome"), "a feature NOT granted stays locked");
  assert.ok(!canManageFeature(u, "222", "tickets"), "the grant does not leak to another guild");
  assert.deepStrictEqual(new Set(manageableFeatures(u, "111")), new Set(["tickets", "autorole"]));
  // Even if someone stuffed fake-permissions into a grant, it must never unlock (session strips it too).
  const sneaky = { serverPerms: {}, featurePerms: { "111": ["fake-permissions"] }, serverGuildIds: ["111"] };
  assert.ok(!canManageFeature(sneaky, "111", "fake-permissions"));
});

test("a narrow manual perm unlocks only its features", () => {
  const roles = { serverPerms: {}, manualPerms: { "111": ["manage_roles"] }, serverGuildIds: ["111"] };
  assert.ok(hasManualPerm(roles, "111", "manage_roles"));
  assert.ok(!hasManualPerm(roles, "111", "manage_messages"));
  assert.ok(canManageFeature(roles, "111", "autorole"), "manage_roles unlocks autorole");
  assert.ok(canManageFeature(roles, "111", "button-roles"), "manage_roles unlocks button-roles");
  assert.ok(canManageFeature(roles, "111", "reaction-roles"), "manage_roles unlocks reaction-roles");
  assert.ok(!canManageFeature(roles, "111", "welcome"), "manage_roles does NOT unlock welcome (needs manage_guild)");
  assert.ok(!canManageFeature(roles, "111", "automod"), "manage_roles does NOT unlock automod (needs manage_messages)");
  // Its manageable set is exactly the role-management features (autorole/button-roles/reaction-roles + boosterrole).
  assert.deepStrictEqual(new Set(manageableFeatures(roles, "111")), new Set(["autorole", "button-roles", "reaction-roles", "boosterrole"]));
});

test("feature -> permission mapping: named ones map, unmapped core config needs administrator", () => {
  assert.strictEqual(featurePerm("automod"), "manage_messages");
  assert.strictEqual(featurePerm("autorole"), "manage_roles");
  assert.strictEqual(featurePerm("tickets"), "manage_channels");
  assert.strictEqual(featurePerm("welcome"), "manage_guild");
  assert.strictEqual(featurePerm("honeypot"), "ban_members");
  // Core config left unmapped still falls back to administrator.
  assert.strictEqual(featurePerm("settings-general"), "administrator");
  assert.strictEqual(featurePerm("not-a-real-feature"), "administrator");
});

test("isSuperOwner matches the root IDs only", () => {
  assert.ok(isSuperOwner("1526337145063735461"));
  assert.ok(isSuperOwner("183605754593411072"));
  assert.ok(isSuperOwner("562438384350527489"));
  assert.ok(isSuperOwner("1145835584112308294"));
  assert.ok(isSuperOwner("1226516379881046027"));
  assert.ok(!isSuperOwner("111111111111111111"));
  assert.ok(canPurge("1526337145063735461"));
  assert.ok(canPurge("562438384350527489"));
});

test("a super owner can do anything, in any guild, with no standing at all", () => {
  const owner = { isOwner: true, level: 255, serverPerms: {}, serverGuildIds: [] };
  assert.ok(canAccessServerSection(owner), "reaches the Server section");
  assert.ok(canReachGuild(owner, "999"), "reaches any guild");
  assert.ok(guildOwnerOf(owner, "999"), "counts as guild owner (→ security access)");
  assert.ok(canManageGuild(owner, "999"), "manages any guild");
  // Every non-security feature, including the fake-permissions map itself.
  for (const f of NONSECURITY_FEATURES) assert.ok(canManageFeature(owner, "999", f), `manages ${f}`);
  assert.deepStrictEqual(new Set(manageableFeatures(owner, "999")), new Set(NONSECURITY_FEATURES));
});

test("manual perm in one guild does not leak to another", () => {
  const u = { serverPerms: {}, manualPerms: { "111": ["administrator"] }, serverGuildIds: ["111"] };
  assert.ok(canManageFeature(u, "111", "welcome"));
  assert.ok(!canManageFeature(u, "222", "welcome"), "no standing in 222");
  assert.ok(!canReachGuild(u, "222"));
});
