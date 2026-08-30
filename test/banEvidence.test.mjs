import test from "node:test";
import assert from "node:assert";
import { evidenceParts, selectBanFiles, sanitizeFileName, isDiscordCdnUrl, MAX_BAN_FILE_BYTES } from "../lib/banEvidence.mjs";

test("empty evidence → nothing to embed", () => {
  assert.deepEqual(evidenceParts(""), { line: "", imageUrl: null, contentUrl: null });
  assert.deepEqual(evidenceParts("   "), { line: "", imageUrl: null, contentUrl: null });
});

test("plain-text note → text line only, no media", () => {
  const p = evidenceParts("caught speed-hacking, see clip");
  assert.equal(p.line, "> Evidence: caught speed-hacking, see clip");
  assert.equal(p.imageUrl, null);
  assert.equal(p.contentUrl, null);
});

test("direct image URL → inline embed image (not content)", () => {
  const p = evidenceParts("https://cdn.example.com/proof.png");
  assert.equal(p.imageUrl, "https://cdn.example.com/proof.png");
  assert.equal(p.contentUrl, null);
});

test("direct video file → message content for a player", () => {
  const p = evidenceParts("https://cdn.example.com/clip.mp4");
  assert.equal(p.imageUrl, null);
  assert.equal(p.contentUrl, "https://cdn.example.com/clip.mp4");
});

test("known providers unfurl via content", () => {
  for (const u of [
    "https://youtu.be/abc123",
    "https://www.youtube.com/watch?v=abc",
    "https://streamable.com/xyz",
    "https://medal.tv/games/roblox/clips/abc",
    "https://clips.twitch.tv/Foo",
  ]) {
    assert.equal(evidenceParts(u).contentUrl, u, `should unfurl ${u}`);
  }
});

test("non-media link → text line only (auto-links in the embed), no content unfurl", () => {
  const p = evidenceParts("https://docs.google.com/document/d/abc");
  assert.equal(p.contentUrl, null);
  assert.equal(p.imageUrl, null);
  assert.match(p.line, /docs\.google\.com/);
});

test("URL embedded in a sentence is extracted and trailing punctuation trimmed", () => {
  const p = evidenceParts("proof here: https://cdn.example.com/x.mp4.");
  assert.equal(p.contentUrl, "https://cdn.example.com/x.mp4");
  assert.match(p.line, /proof here:/); // the human note is preserved in the line
});

test("query string / fragment after a media extension still detected", () => {
  assert.equal(evidenceParts("https://x.io/a.png?token=1").imageUrl, "https://x.io/a.png?token=1");
  assert.equal(evidenceParts("https://x.io/a.mp4#t=3").contentUrl, "https://x.io/a.mp4#t=3");
});

// --- evidence file selection --------------------------------------------------------------------
const CDN = "https://cdn.discordapp.com/attachments/1/2/clip.mp4";

test("isDiscordCdnUrl: only https Discord CDN hosts pass", () => {
  assert.equal(isDiscordCdnUrl("https://cdn.discordapp.com/x.png"), true);
  assert.equal(isDiscordCdnUrl("https://media.discordapp.net/x.mp4"), true);
  assert.equal(isDiscordCdnUrl("http://cdn.discordapp.com/x.png"), false); // not https
  assert.equal(isDiscordCdnUrl("https://evil.com/x.png"), false);
  assert.equal(isDiscordCdnUrl("https://cdn.discordapp.com.evil.com/x"), false);
  assert.equal(isDiscordCdnUrl("not a url"), false);
});

test("sanitizeFileName: strips paths and unsafe chars, never empty", () => {
  assert.equal(sanitizeFileName("../../etc/passwd"), "passwd");
  assert.equal(sanitizeFileName("my clip!.mp4"), "my clip_.mp4");
  assert.equal(sanitizeFileName(""), "evidence");
  assert.equal(sanitizeFileName(null), "evidence");
});

test("selectBanFiles: keeps valid Discord files, sanitized", () => {
  const out = selectBanFiles([{ url: CDN, name: "clip.mp4", contentType: "video/mp4", size: 1000 }]);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], { url: CDN, name: "clip.mp4", contentType: "video/mp4", size: 1000 });
});

test("selectBanFiles: drops non-Discord urls (SSRF guard) and caps at 3", () => {
  const files = [
    { url: "https://evil.com/a.mp4", size: 10 },
    { url: CDN, name: "a", size: 10 },
    { url: CDN, name: "b", size: 10 },
    { url: CDN, name: "c", size: 10 },
    { url: CDN, name: "d", size: 10 },
  ];
  const out = selectBanFiles(files);
  assert.equal(out.length, 3); // evil dropped, then capped to 3
  assert.deepEqual(out.map((f) => f.name), ["a", "b", "c"]);
});

test("selectBanFiles: drops a file whose declared size exceeds the per-file cap", () => {
  assert.equal(selectBanFiles([{ url: CDN, size: MAX_BAN_FILE_BYTES + 1 }]).length, 0);
});

test("selectBanFiles: stops adding once the running total would exceed the cap", () => {
  const big = Math.floor(MAX_BAN_FILE_BYTES * 0.6);
  const out = selectBanFiles([{ url: CDN, name: "a", size: big }, { url: CDN, name: "b", size: big }]);
  assert.equal(out.length, 1); // second would blow the combined total
});

test("selectBanFiles: handles missing / non-array input", () => {
  assert.deepEqual(selectBanFiles(undefined), []);
  assert.deepEqual(selectBanFiles(null), []);
  assert.deepEqual(selectBanFiles("nope"), []);
});
