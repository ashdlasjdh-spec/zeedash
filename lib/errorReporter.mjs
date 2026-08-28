// Server-side error tracking → Discord webhook (ERROR_WEBHOOK_URL). No dependency, no external service.
// Dedupes identical errors (5 min), rate-limits (a few/min) so a loop can't spam, and never throws.
// No-ops when ERROR_WEBHOOK_URL is unset. Import only from server code (route handlers, instrumentation).
const DEDUP_MS = 5 * 60 * 1000;
const MAX_PER_MIN = 5;
const seen = new Map();
let winStart = 0;
let winCount = 0;

export function reportError(err, context = {}) {
  const url = process.env.ERROR_WEBHOOK_URL;
  if (!url) return;
  try {
    const msg = String((err && err.message) || err || "Unknown error");
    const where = String(context.where || "unknown");
    const now = Date.now();
    const sig = `${where}|${msg.slice(0, 120)}`;
    const last = seen.get(sig);
    if (last && now - last < DEDUP_MS) return;
    seen.set(sig, now);
    if (seen.size > 500) seen.clear();
    if (now - winStart > 60000) { winStart = now; winCount = 0; }
    if (winCount >= MAX_PER_MIN) return;
    winCount += 1;

    const stack = String((err && err.stack) || "").split("\n").slice(0, 6).join("\n");
    const fields = [{ name: "Where", value: where.slice(0, 256) }];
    for (const [k, v] of Object.entries(context)) {
      if (k === "where" || k === "service") continue;
      fields.push({ name: k.slice(0, 40), value: String(v).slice(0, 200), inline: true });
    }
    const body = {
      username: "ZHD Error Monitor",
      embeds: [{
        title: `${context.service || "Dashboard"} error`,
        description: "```\n" + (stack || msg).slice(0, 1800) + "\n```",
        color: 0xe01f1f,
        fields,
        timestamp: new Date().toISOString(),
      }],
    };
    fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  } catch { /* never throw */ }
}
