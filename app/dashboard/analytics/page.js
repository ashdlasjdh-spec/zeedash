import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import PageHeader from "../../components/PageHeader";

export const dynamic = "force-dynamic";

const rows = async (sql) => { try { return await query(sql); } catch { return []; } };
const one = async (sql) => { try { const r = await query(sql); return Number(r?.[0]?.n) || 0; } catch { return 0; } };

// Moderation-only: bans / unbans / kicks / warns. Grants, config, etc. are excluded.
const MOD = "action in ('ban','unban','kick','warn')";

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");

  const [ban7, kick7, warn7, mod30, byAction, daily, topMods] = await Promise.all([
    one("select count(*)::int n from audit_log where action='ban' and created_at >= now() - interval '7 days'"),
    one("select count(*)::int n from audit_log where action='kick' and created_at >= now() - interval '7 days'"),
    one("select count(*)::int n from audit_log where action='warn' and created_at >= now() - interval '7 days'"),
    one(`select count(*)::int n from audit_log where ${MOD} and created_at >= now() - interval '30 days'`),
    rows(`select action, count(*)::int n from audit_log where ${MOD} and created_at >= now() - interval '30 days' group by action order by n desc`),
    rows(`select to_char(date_trunc('day', created_at),'YYYY-MM-DD') d, count(*)::int n from audit_log where ${MOD} and created_at >= now() - interval '13 days' group by d order by d`),
    rows(`select actor_name, count(*)::int n from audit_log where ${MOD} and created_at >= now() - interval '30 days' group by actor_name order by n desc limit 8`),
  ]);

  const dayMap = new Map(daily.map((r) => [r.d, r.n]));
  const series = [];
  for (let i = 13; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 86400000);
    const key = dt.toISOString().slice(0, 10);
    series.push({ key, label: dt.toLocaleDateString([], { month: "short", day: "numeric" }), n: dayMap.get(key) || 0 });
  }
  const dayMax = Math.max(1, ...series.map((s) => s.n));
  const actMax = Math.max(1, ...byAction.map((r) => r.n));
  const modMax = Math.max(1, ...topMods.map((r) => r.n));

  const stats = [
    { n: ban7, l: "Bans · 7 days" },
    { n: kick7, l: "Kicks · 7 days" },
    { n: warn7, l: "Warns · 7 days" },
    { n: mod30, l: "Mod actions · 30d" },
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
      <PageHeader icon="ban" title="Moderation analytics" subtitle="Bans, kicks, warns, and unbans over time — volume by day, the action mix, and who's actioning most. Management+." />

      <div className="ov-stats">
        {stats.map((s, i) => (
          <div className="ov-stat" key={i}><div className="ov-n">{s.n.toLocaleString()}</div><div className="ov-l">{s.l}</div></div>
        ))}
      </div>

      <div className="card">
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>Moderation actions per day</div>
        <div className="muted" style={{ fontSize: 12.5, marginBottom: 16 }}>Bans · unbans · kicks · warns — last 14 days.</div>
        <div className="an-chart-wrap">
          <div className="an-chart">
            {series.map((s) => (
              <div className="an-col" key={s.key} title={`${s.label}: ${s.n}`}>
                <div className="an-col-bar" style={{ height: `${Math.round((s.n / dayMax) * 100)}%` }}><span className="an-col-n">{s.n || ""}</span></div>
                <div className="an-col-l">{s.label.split(" ")[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
