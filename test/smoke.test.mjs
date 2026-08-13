// Smoke tests for pure dashboard logic. Run: npm test
// Covers the XP curve and the per-server permission helpers (the security-sensitive gates).
import test from "node:test";
import assert from "node:assert";
import { levelFromXp, xpForNext } from "../lib/levels.js";
import {
  canManageGuild, canAccessServerSection, guildOwnerOf, isSecurityFeature, SECURITY_FEATURES,
  canManageFeature, manageableFeatures, hasManualPerm, canReachGuild, featurePerm, NONSECURITY_FEATURES,
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

test("Discord admin manages every non-security feature, and none of the security ones", () => {
  const admin = { serverPerms: { "111": { a: true, o: false } }, serverGuildIds: ["111"] };
  for (const f of NONSECURITY_FEATURES) assert.ok(canManageFeature(admin, "111", f), `admin manages ${f}`);
  // canManageFeature never resolves security features — those go through the antinuke path.
  assert.ok(!canManageFeature(admin, "111", "antinuke"));
  assert.ok(!canManageFeature(admin, "111", "antiraid"));
  // An admin's manageable set is exactly the non-security list.
  assert.deepStrictEqual(new Set(manageableFeatures(admin, "111")), new Set(NONSECURITY_FEATURES));
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

test("a narrow manual perm unlocks only its features", () => {
  const roles = { serverPerms: {}, manualPerms: { "111": ["manage_roles"] }, serverGuildIds: ["111"] };
  assert.ok(hasManualPerm(roles, "111", "manage_roles"));
  assert.ok(!hasManualPerm(roles, "111", "manage_messages"));
  assert.ok(canManageFeature(roles, "111", "autorole"), "manage_roles unlocks autorole");
  assert.ok(canManageFeature(roles, "111", "button-roles"), "manage_roles unlocks button-roles");
  assert.ok(canManageFeature(roles, "111", "reaction-roles"), "manage_roles unlocks reaction-roles");
  assert.ok(!canManageFeature(roles, "111", "welcome"), "manage_roles does NOT unlock welcome (needs administrator)");
  assert.ok(!canManageFeature(roles, "111", "automod"), "manage_roles does NOT unlock automod (needs manage_messages)");
  // Its manageable set is exactly the role-management features.
  assert.deepStrictEqual(new Set(manageableFeatures(roles, "111")), new Set(["autorole", "button-roles", "reaction-roles"]));
});

test("feature -> permission mapping: named ones map, everything else needs administrator", () => {
  assert.strictEqual(featurePerm("automod"), "manage_messages");
  assert.strictEqual(featurePerm("autorole"), "manage_roles");
  assert.strictEqual(featurePerm("welcome"), "administrator");
  assert.strictEqual(featurePerm("not-a-real-feature"), "administrator");
});

test("manual perm in one guild does not leak to another", () => {
  const u = { serverPerms: {}, manualPerms: { "111": ["administrator"] }, serverGuildIds: ["111"] };
  assert.ok(canManageFeature(u, "111", "welcome"));
  assert.ok(!canManageFeature(u, "222", "welcome"), "no standing in 222");
  assert.ok(!canReachGuild(u, "222"));
});
