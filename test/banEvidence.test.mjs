import test from "node:test";
import assert from "node:assert";
import { evidenceParts } from "../lib/banEvidence.mjs";

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
