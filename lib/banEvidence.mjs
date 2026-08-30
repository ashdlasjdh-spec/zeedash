// Turn the free-text ban "evidence" field into the pieces the webhook needs to actually SHOW it, not
// just print a text line. Pure (no imports) so it's unit-tested and shared by both the site path
// (app/api/bans/route.js) and the bot path (lib/bans.js).
//
// Discord limitation: a webhook rich embed can show an inline IMAGE (embed.image.url) but CANNOT set a
// playable video — that only appears when a link is dropped in the message CONTENT (Discord unfurls
// YouTube/Streamable/Medal/Twitch and direct video files into a player) or when the file itself is
// uploaded as an attachment (not handled here — that needs an upload field). So we route a direct image
// URL to embed.image, and a video/known-provider URL to message content for its player.
const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|avif)(\?|#|$)/i;
const VIDEO_RE = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;
const PROVIDER_RE = /(?:youtube\.com|youtu\.be|streamable\.com|medal\.tv|twitch\.tv|clips\.twitch\.tv|imgur\.com|gyazo\.com)/i;

export function evidenceParts(evidenceText) {
  const text = String(evidenceText || "").trim();
  if (!text) return { line: "", imageUrl: null, contentUrl: null };
  // First http(s) URL in the field; strip trailing punctuation that isn't part of the link.
  const m = text.match(/https?:\/\/\S+/i);
  const url = m ? m[0].replace(/[)\].,>]+$/, "") : null;
  const isImage = !!url && IMAGE_RE.test(url);
  const isVideo = !!url && VIDEO_RE.test(url);
  const isProvider = !!url && PROVIDER_RE.test(url);
  return {
    // The text line for the embed (URLs auto-link inside an embed description) — unchanged behavior.
    line: `> Evidence: ${text}`,
    // Direct image → big inline preview in the embed.
    imageUrl: isImage ? url : null,
    // Video file or a provider Discord can unfurl → put in message content so it renders a player/preview
    // below the embed. Non-media links (a Google Doc, a plain page) stay as the auto-linked text line only.
    contentUrl: url && !isImage && (isVideo || isProvider) ? url : null,
  };
}
