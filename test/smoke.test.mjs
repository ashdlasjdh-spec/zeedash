// Smoke tests for pure dashboard logic. Run: npm test
// Covers the XP curve and the per-server permission helpers (the security-sensitive gates).
import test from "node:test";
import assert from "node:assert";
import { levelFromXp, xpForNext } from "../lib/levels.js";
import { canManageGuild, canAccessServerSection, guildOwnerOf, isSecurityFeature, SECURITY_FEATURES } from "../lib/permissions.js";

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

test("canManageGuild: Roblox staff (canGroup) manage every guild; a plain member manages none", () => {
  const staff = { level: 242, serverPerms: {}, serverGuildIds: [] };   // head of staff
  assert.ok(canManageGuild(staff, "999"), "staff override manages any guild");
  assert.ok(canAccessServerSection(staff));

  const nobody = { level: 0, serverPerms: {}, serverGuildIds: [] };
  assert.ok(!canManageGuild(nobody, "111"));
  assert.ok(!canAccessServerSection(nobody));
});

test("guild owner is recognised", () => {
  const owner = { level: 0, serverPerms: { "111": { a: true, o: true } }, serverGuildIds: ["111"] };
  assert.ok(guildOwnerOf(owner, "111"));
});
