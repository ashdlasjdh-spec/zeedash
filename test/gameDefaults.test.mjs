import test from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GAME_DEFAULTS, clean } from "../lib/gameDefaults.mjs";

// Drift guard — the mirror of zee-hood-game/test/defaults.test.mjs. The dashboard's GAME_DEFAULTS and the
// game site's bundled fallbacks both render zeehood.org, so they must agree. Both repos pin to a shared,
// byte-identical snapshot; changing one side without the other (and this snapshot) fails a build.
const snapshot = JSON.parse(readFileSync(fileURLToPath(new URL("./game-defaults.snapshot.json", import.meta.url)), "utf8"));

test("GAME_DEFAULTS match the shared game-config snapshot", () => {
  const { _comment, ...expected } = snapshot;
  // The snapshot holds the content shared with the game site; announcement/socials/liveStats are
  // dashboard-only runtime toggles the game site doesn't bundle, so compare only the shared keys.
  const shared = {};
  for (const k of Object.keys(expected)) shared[k] = GAME_DEFAULTS[k];
  assert.deepEqual(shared, expected);
});

// clean() is the sanitizer that keeps a bad edit from breaking the site — worth locking down.
test("clean() falls back to defaults for a malformed / empty payload", () => {
  assert.deepEqual(clean(null), GAME_DEFAULTS);
  assert.deepEqual(clean({}), GAME_DEFAULTS);
});

test("clean() rejects a non-numeric placeId but keeps a valid one", () => {
  assert.equal(clean({ placeId: "abc" }).placeId, GAME_DEFAULTS.placeId);
  assert.equal(clean({ placeId: "12345" }).placeId, "12345");
  assert.equal(clean({ placeId: 678 }).placeId, "678");
});

test("clean() strips non-digits from pass ids and drops empty rows", () => {
  const out = clean({ passes: [{ id: "abc123", item: "X" }, { id: "999", item: "" }, { id: "", item: "Y" }] });
  assert.deepEqual(out.passes, [{ id: "123", item: "X" }]);
});

test("clean() keeps an intentionally empty announcement (not defaulted)", () => {
  assert.equal(clean({ announcement: "" }).announcement, "");
  assert.equal(clean({ announcement: "  hi  " }).announcement, "hi");
});

test("clean() caps oversized lists and strings", () => {
  const many = Array.from({ length: 200 }, (_, i) => [`role${i}`, "$1"]);
  assert.equal(clean({ roles: many }).roles.length, 100);
  assert.ok(clean({ tagline: "x".repeat(500) }).tagline.length <= 160);
});
