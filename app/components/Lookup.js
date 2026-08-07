"use client";
import { useState } from "react";
import Avatar from "./Avatar";

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleString();
}
// pull "[RD-XXXX-XXXX]" and the reason out of an audit detail string
function parseDetail(detail) {
  const s = String(detail || "");
  const caseId = (s.match(/\[(RD-[A-Z0-9-]+)\]/) || [])[1] || "";
  const reason = s.replace(/\s*\[RD-[A-Z0-9-]+\]\s*$/, "").trim();
  return { caseId, reason };
}

export default function Lookup() {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("user"); // user | case
  const [data, setData] = useState(null); // { user, history }
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function find(e) {
    e?.preventDefault();
    const term = q.trim();
    if (!term) return;
    setBusy(true); setErr(null); setData(null);
    try {
      const param = mode === "case" ? `case=${encodeURIComponent(term)}` : `user=${encodeURIComponent(term)}&full=1`;
      const r = await fetch(`/api/bans?${param}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Not found");
      setData(d);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  const u = data?.user;
  const history = data?.history || [];
  const current = u ? parseDetail(history.find((h) => h.action === "ban")?.detail) : { caseId: "", reason: "" };

  return (
    <>
      <div className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <button className={`btn ${mode === "user" ? "" : "ghost"}`} onClick={() => setMode("user")}>By player</button>
          <button className={`btn ${mode === "case" ? "" : "ghost"}`} onClick={() => setMode("case")}>By case ID</button>
        </div>
        <form onSubmit={find} style={{ display: "flex", gap: 10 }}>
          <input style={{ flex: 1 }} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={mode === "case" ? "RD-XXXXXXXX-XXXXXX" : "Username, user ID, or Roblox profile link"} />
          <button className="btn" style={{ width: "auto" }} disabled={busy}>{busy ? "Searching…" : "Find"}</button>
        </form>
        {err && <div className="toast bad">{err}</div>}
      </div>

      {u && (
        <>
          {/* user card */}
          <div className="card" style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 16 }}>
            <Avatar userId={u.userId} size={64} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{u.displayName}</div>
              <div className="muted">@{u.username} · ID {u.userId}</div>
              <a className="muted" style={{ fontSize: 13 }} href={`https://www.roblox.com/users/${u.userId}/profile`} target="_blank" rel="noreferrer">Open Roblox profile ↗</a>
            </div>
            <span className="pill" style={{ background: u.active ? "var(--danger)" : "var(--panel2,#222)", color: u.active ? "#fff" : "var(--muted)", fontWeight: 700 }}>
              {u.active ? "ACTIVE BAN" : "No active ban"}
            </span>
          </div>

          {/* current snapshot */}
          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Current snapshot</div>
            <table className="table">
              <tbody>
                <tr><td className="muted" style={{ width: 180 }}>Current restriction</td><td>{u.active ? "Banned" : "None"}</td></tr>
                <tr><td className="muted">Reason</td><td>{u.reason || current.reason || "—"}</td></tr>
                <tr><td className="muted">Since</td><td>{fmtDate(u.startTime)}</td></tr>
                <tr><td className="muted">Duration</td><td>{u.duration || (u.active ? "Permanent" : "—")}</td></tr>
                <tr><td className="muted">Latest case</td><td className="mono">{current.caseId || "—"}</td></tr>
                <tr><td className="muted">Recorded actions</td><td>{u.historyCount}</td></tr>
              </tbody>
            </table>
          </div>

          {/* history */}
          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Historical entries</div>
            {history.length === 0 ? (
              <p className="muted">No recorded moderation history.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr><th>Date</th><th>Action</th><th>Reason</th><th>Case</th><th>Moderator</th></tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => {
                      const p = parseDetail(h.detail);
                      return (
                        <tr key={i}>
                          <td className="muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(h.created_at)}</td>
                          <td style={{ color: h.action === "ban" || h.action === "kick" ? "var(--danger)" : h.action === "warn" ? "#e0a53a" : "var(--ok)", fontWeight: 700, textTransform: "capitalize" }}>{h.action}</td>
                          <td>{p.reason || "—"}</td>
                          <td className="mono">{p.caseId || "—"}</td>
                          <td className="muted">{h.actor_name || h.actor_id || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
