"use client";
import { useState, useEffect } from "react";
import Dropdown from "./Dropdown";
import { DiscordLink } from "./ProfileLinks";
import { AreaChart } from "./chart";

const RANGES = [{ value: 7, label: "Last 7 days" }, { value: 30, label: "Last 30 days" }, { value: 90, label: "Last 90 days" }];

// "YYYY-MM-DD" -> "Sep 1" (the AreaChart uses the part after the space for the x-axis tick).
const fmtDay = (s) => { const d = new Date(s + "T00:00:00"); return isNaN(d) ? String(s) : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); };

export default function CommandStats() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [staff, setStaff] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    setData(null); setStaff(null); setErr(null);
    fetch(`/api/command-usage?days=${days}`).then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (!alive) return; if (!ok) setErr(j.error || "Failed"); else setData(j); })
      .catch((e) => { if (alive) setErr(e.message); });
    fetch(`/api/staff-activity?days=${days}`).then((r) => (r.ok ? r.json() : { staff: [] }))
      .then((j) => { if (alive) setStaff(Array.isArray(j.staff) ? j.staff : []); }).catch(() => { if (alive) setStaff([]); });
    return () => { alive = false; };
  }, [days]);

  const maxCmd = Math.max(1, ...((data?.byCommand || []).map((c) => c.count)));
  const daySeries = (data?.byDay || []).map((d) => ({ label: fmtDay(d.day), count: d.count }));

  return (
    <>
      <div className="card">
        <div className="between">
          <div><div style={{ fontWeight: 800, fontSize: 15 }}>Usage</div><div className="muted" style={{ fontSize: 13 }}>{data ? `${data.total.toLocaleString()} commands run` : "Loading…"}</div></div>
          <div style={{ minWidth: 170 }}><Dropdown value={days} onChange={(e) => setDays(Number(e.target.value))} options={RANGES} /></div>
        </div>
        {err && <div className="toast bad" style={{ marginTop: 12 }}>{err}</div>}
        {data && daySeries.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <AreaChart series={daySeries} label="commands" accessor={(s) => s.count} color="#f87171" />
          </div>
        )}
      </div>

      <div className="grid g2" style={{ marginTop: 16, gap: 16 }}>
        <div className="card">
          <div style={{ fontWeight: 750, marginBottom: 12 }}>Top commands</div>
          {!data ? <p className="muted">Loading…</p> : data.byCommand.length === 0 ? <p className="muted">No usage recorded yet.</p> : (
            <div className="stack" style={{ gap: 8 }}>
              {data.byCommand.map((c) => (
                <div key={c.command}>
                  <div className="between" style={{ marginBottom: 3 }}><span className="mono" style={{ fontSize: 13 }}>{c.command}</span><span className="muted" style={{ fontSize: 12 }}>{c.count.toLocaleString()}</span></div>
                  <div style={{ height: 6, borderRadius: 4, background: "var(--surface-3)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(c.count / maxCmd) * 100}%`, background: "linear-gradient(90deg,var(--brand),var(--brand-2))" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ fontWeight: 750, marginBottom: 12 }}>Staff activity</div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Mod/grant actions + commands per staff member.</div>
          {!staff ? <p className="muted">Loading…</p> : staff.length === 0 ? <p className="muted">No activity recorded yet.</p> : (
            <div className="stack" style={{ gap: 8 }}>
              {staff.map((u, i) => (
                <div key={u.actor_id} className="between" style={{ padding: "7px 11px", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 10 }}>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span className="muted" style={{ marginRight: 8 }}>#{i + 1}</span>
                    {u.actor_id ? <DiscordLink id={u.actor_id}>{u.actor_name || u.actor_id}</DiscordLink> : (u.actor_name || "—")}
                  </span>
                  <span className="muted" style={{ fontSize: 11.5, flex: "0 0 auto" }}>{u.actions} actions · {u.commands} cmds</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ fontWeight: 750, marginBottom: 12 }}>Top users</div>
          {!data ? <p className="muted">Loading…</p> : data.byUser.length === 0 ? <p className="muted">No usage recorded yet.</p> : (
            <div className="stack" style={{ gap: 8 }}>
              {data.byUser.map((u, i) => (
                <div key={u.actor_id} className="between" style={{ padding: "7px 11px", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 10 }}>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span className="muted" style={{ marginRight: 8 }}>#{i + 1}</span>
                    {u.actor_id ? <DiscordLink id={u.actor_id}>{u.actor_name || u.actor_id}</DiscordLink> : (u.actor_name || "—")}
                  </span>
                  <span className="muted mono" style={{ fontSize: 12 }}>{u.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
