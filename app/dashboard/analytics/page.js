import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import PageHeader from "../../components/PageHeader";
import BanTrendChart from "../../components/BanTrendChart";
import { getBanTrends } from "@/lib/bantrends";

export const dynamic = "force-dynamic";

const rows = async (sql) => { try { return await query(sql); } catch { return []; } };
const one = async (sql) => { try { const r = await query(sql); return Number(r?.[0]?.n) || 0; } catch { return 0; } };
function agoStr(iso) {
  const t = Date.parse(iso); if (!Number.isFinite(t)) return "live from Roblox";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `scanned ${s}s ago`;
  if (s < 3600) return `scanned ${Math.round(s / 60)}m ago`;
  if (s < 86400) return `scanned ${Math.round(s / 3600)}h ago`;
  return `scanned ${Math.round(s / 86400)}d ago`;
}

// Moderation-only: bans / unbans / kicks / warns. Grants, config, etc. are excluded.
const MOD = "action in ('ban','unban','kick','warn')";

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");

  const [ban7, kick7, warn7, mod30, byAction, dailyBans, topMods] = await Promise.all([
    one("select count(*)::int n from audit_log where action='ban' and created_at >= now() - interval '7 days'"),
    one("select count(*)::int n from audit_log where action='kick' and created_at >= now() - interval '7 days'"),
    one("select count(*)::int n from audit_log where action='warn' and created_at >= now() - interval '7 days'"),
    one(`select count(*)::int n from audit_log where ${MOD} and created_at >= now() - interval '30 days'`),
    rows(`select action, count(*)::int n from audit_log where ${MOD} and created_at >= now() - interval '30 days' group by action order by n desc`),
    rows(`select to_char(date_trunc('day', created_at),'YYYY-MM-DD') d, count(*)::int n from audit_log where action='ban' and created_at >= now() - interval '13 days' group by d order by d`),
    rows(`select actor_name, count(*)::int n from audit_log where ${MOD} and created_at >= now() - interval '30 days' group by actor_name order by n desc limit 8`),
  ]);

  // Fallback for the trend chart — daily bans recorded on-site. The chart prefers the live Roblox
  // restriction-log data (every game ban), and falls back to this if Roblox can't be reached.
  const banDayMap = new Map(dailyBans.map((r) => [r.d, r.n]));
  const banFallback = [];
  for (let i = 13; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400000);
    const key = dt.toISOString().slice(0, 10);
    banFallback.push({ key, label: dt.toLocaleDateString([], { month: "short", day: "numeric" }), bans: banDayMap.get(key) || 0 });
  }
  const actMax = Math.max(1, ...byAction.map((r) => r.n));

  // Live game-ban trend (ALL bans on the Roblox game, via Open Cloud restriction logs). Powers
  // both the chart's initial data and an accurate "New bans · 7d". Falls back to on-site bans.
  const fallbackTotal = banFallback.reduce((s, r) => s + r.bans, 0);
  const trend = await getBanTrends(14).catch(() => null);
  // Every on-site ban is also a Roblox restriction, so the live total must be >= the on-site total.
  // If it isn't (endpoint shape drifted / parse miss), the on-site series is the safer thing to show.
  const trendTotal = trend?.series?.reduce((s, r) => s + (Number(r.bans) || 0), 0) || 0;
  const useLive = !!(trend?.ok && trend.series?.length && trendTotal >= fallbackTotal);
  const liveSeries = useLive ? trend.series : null;
  const chartSeries = liveSeries || banFallback;
  const ban7Accurate = liveSeries ? liveSeries.slice(-7).reduce((s, r) => s + (Number(r.bans) || 0), 0) : ban7;
  const modMax = Math.max(1, ...topMods.map((r) => r.n));

  // Live active-ban total straight from Roblox (recorded by the ban scan). Headline stat.
  const cfg = Object.fromEntries((await rows("select key, value from config where key in ('bans_count','bans_scanned_at')")).map((r) => [r.key, r.value]));
  const bansLive = Number(cfg.bans_count) || 0;

  const stats = [
    { n: bansLive, l: "Active game bans", hint: cfg.bans_scanned_at ? agoStr(cfg.bans_scanned_at) : "live from Roblox" },
    { n: ban7Accurate, l: "New bans · 7d", hint: liveSeries ? "all game bans" : "on-site only" },
    { n: kick7, l: "Kicks · 7d" },
    { n: warn7, l: "Warns · 7d" },
  ];

  const Bars = ({ data, max, empty }) => (
    data.length === 0 ? <p className="muted" style={{ padding: "8px 0" }}>{empty}</p> : (
      <div className="an-hbars">
        {data.map((r, i) => (
          <div className="an-hrow" key={i}>
            <span className="an-hlabel">{r.label}</span>
            <span className="an-htrack"><span className="an-hbar" style={{ width: `${Math.max(4, Math.round((r.n / max) * 100))}%` }} /></span>
            <span className="an-hval">{r.n}</span>
          </div>
        ))}
      </div>
    )
  );

  return (
    <div className="fullbleed">
      <PageHeader icon="ban" title="Moderation analytics" subtitle="Live game bans straight from Roblox — every ban on the game, not just on-site actions — plus moderation activity over time. Management+." />

      <div className="ov-stats">
        {stats.map((s, i) => (
          <div className="ov-stat" key={i}>
            <div className="ov-n">{s.n.toLocaleString()}</div>
            <div className="ov-l">{s.l}</div>
            {s.hint && <div className="ov-hint">{s.hint}</div>}
          </div>
        ))}
      </div>

      <BanTrendChart initial={chartSeries} liveInitial={!!liveSeries} minTotal={fallbackTotal} />

      <div className="ov-grid" style={{ marginTop: 16 }}>
        <div className="card">
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>By action <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>· 30d</span></div>
          <Bars data={byAction.map((r) => ({ label: r.action, n: r.n }))} max={actMax} empty="No moderation actions yet." />
        </div>
        <div className="card">
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Top moderators <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>· 30d</span></div>
          <Bars data={topMods.map((r) => ({ label: r.actor_name || "—", n: r.n }))} max={modMax} empty="No moderation activity this month." />
        </div>
      </div>
    </div>
  );
}
