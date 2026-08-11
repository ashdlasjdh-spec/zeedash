import { getConfig } from "./config";

// ALL game bans over time — straight from Roblox, not just the ones done on this dashboard.
// Uses Open Cloud's user-restriction LOGS endpoint, which records every ban/unban event on the
// universe regardless of who or what issued it. We page back far enough to cover the window and
// bucket ban (and unban) events per day. Cached a few minutes so page loads don't re-page Roblox.
//
// The logs endpoint's field names have shifted across Open Cloud revisions, so parsing is
// defensive: we accept the state flag and timestamp under either the flat or nested shape.
let cache = { at: 0, key: "", data: null };

function dayKeys(days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400000);
    out.push({ key: dt.toISOString().slice(0, 10), label: dt.toLocaleDateString([], { month: "short", day: "numeric" }) });
  }
  return out;
}
function emptySeries(days) {
  return dayKeys(days).map((d) => ({ ...d, bans: 0, unbans: 0 }));
}

// Pull the state (active=ban, inactive=unban) and the event timestamp from a log entry, tolerating
// both the flat shape and the `gameJoinRestriction`-nested shape.
function readLog(e) {
  const g = e.gameJoinRestriction || e;
  const active = typeof e.active === "boolean" ? e.active : g.active;
  const ts = e.activeTimestamp || e.createTime || e.updateTime || g.startTime || g.activeTimestamp || e.startTime;
  const t = Date.parse(ts);
  return { active, t: Number.isFinite(t) ? t : null };
}

export async function getBanTrends(days = 14) {
  const c = await getConfig();
  const key = c.banApiKey || c.apiKey;
  const universeId = c.universeId;
  const ck = `${universeId}:${days}`;
  if (cache.data && cache.key === ck && Date.now() - cache.at < 5 * 60_000) return cache.data;
  if (!key || !universeId) return cache.data || { series: emptySeries(days), scannedAt: null, ok: false };

  const cutoff = Date.now() - days * 86400000;
  const deadline = Date.now() + 9000; // hard budget so a slow/rate-limited Roblox can't stall the page
  const banByDay = new Map(), unbanByDay = new Map();
  let pageToken = "", ok = false, total = 0;
  try {
    for (let i = 0; i < 12 && Date.now() < deadline; i++) { // up to ~1200 events — far more than a 14-day window at this game's volume
      const url = `https://apis.roblox.com/cloud/v2/universes/${universeId}/user-restrictions:listLogs?maxPageSize=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
      const r = await fetch(url, { headers: { "x-api-key": key }, cache: "no-store", signal: AbortSignal.timeout(6000) });
      if (!r.ok) break;
      ok = true;
      const d = await r.json().catch(() => ({}));
      const logs = d.logs || d.userRestrictionLogs || [];
      let anyInWindow = false;
      for (const e of logs) {
        const { active, t } = readLog(e);
        if (t == null) continue;
        total++;
        if (t < cutoff) continue;
        anyInWindow = true;
        const dk = new Date(t).toISOString().slice(0, 10);
        const bucket = active ? banByDay : unbanByDay;
        bucket.set(dk, (bucket.get(dk) || 0) + 1);
      }
      pageToken = d.nextPageToken || "";
      // Newest-first: once a whole page falls outside the window, everything older does too.
      if (!pageToken || (!anyInWindow && total > 0)) break;
    }
  } catch { /* keep whatever we gathered */ }

  const series = dayKeys(days).map((d) => ({ ...d, bans: banByDay.get(d.key) || 0, unbans: unbanByDay.get(d.key) || 0 }));
  const data = { series, scannedAt: new Date().toISOString(), ok };
  if (ok) cache = { at: Date.now(), key: ck, data };
  return data;
}
