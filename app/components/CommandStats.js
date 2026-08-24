"use client";
import { useState, useEffect } from "react";
import Dropdown from "./Dropdown";
import { DiscordLink } from "./ProfileLinks";

const RANGES = [{ value: 7, label: "Last 7 days" }, { value: 30, label: "Last 30 days" }, { value: 90, label: "Last 90 days" }];

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
  const maxDay = Math.max(1, ...((data?.byDay || []).map((d) => d.count)));

  return (
    <>
      <div className="card">
        <div className="between">
          <div><div style={{ fontWeight: 800, fontSize: 15 }}>Usage</div><div className="muted" style={{ fontSize: 13 }}>{data ? `${data.total.toLocaleString()} commands run` : "Loading…"}</div></div>
          <div style={{ minWidth: 170 }}><Dropdown value={days} onChange={(e) => setDays(Number(e.target.value))} options={RANGES} /></div>
        </div>
        {err && <div className="toast bad" style={{ marginTop: 12 }}>{err}</div>}
        {data && data.byDay?.length > 0 && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 90, marginTop: 16, overflowX: "auto" }}>
            {data.byDay.map((d) => (
              <div key={d.day} title={`${d.day}: ${d.count}`} style={{ flex: "1 0 6px", minWidth: 6, height: `${Math.max(4, (d.count / maxDay) * 90)}px`, background: "linear-gradient(180deg,var(--brand-2),var(--brand))", borderRadius: 3 }} />
            ))}
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
