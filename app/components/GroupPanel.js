"use client";
import { useEffect, useState } from "react";
export default function GroupPanel() {
  const [roles, setRoles] = useState([]); const [groupId, setGid] = useState("");
  const [username, setU] = useState(""); const [status, setStatus] = useState(null);
  const [roleId, setRoleId] = useState(""); const [busy, setB] = useState(false);
  const [toast, setT] = useState(null); const [err, setErr] = useState(null);

  useEffect(() => { (async () => {
    const r = await fetch("/api/group"); const d = await r.json();
    if (r.ok) { setRoles(d.roles); setGid(d.groupId); } else setErr(d.error);
  })(); }, []);

  async function act(action) {
    setB(true); setT(null);
    try {
      const r = await fetch("/api/group", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, username, roleId }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      if (action === "lookup") {
        setStatus(d); if (d.roleId) setRoleId(d.roleId);
        setT({ ok: true, msg: d.inGroup ? `${d.target.username} is in the group.` : `${d.target.username} is NOT in the group.` });
      } else if (action === "rank") setT({ ok: true, msg: `Changed ${d.target.username}'s rank.` });
      else if (action === "kick") setT({ ok: true, msg: `Kicked ${d.target.username} from the group.` });
    } catch (e) { setT({ bad: true, msg: e.message }); }
    setB(false);
  }

  if (err) return <div className="card"><div className="toast bad">{err}</div></div>;
  return (
    <div className="card">
      <div className="row">
        <div style={{ flex: 1 }}><label>Roblox username</label>
          <input value={username} onChange={e => { setU(e.target.value); setStatus(null); }} placeholder="Builderman" /></div>
        <button className="btn ghost" style={{ width: "auto" }} disabled={busy} onClick={() => act("lookup")}>Look up</button>
      </div>
      {status && (
        <div style={{ marginTop: 18 }}>
          <div className="grid g2">
            <div><label>Set rank</label>
              <select value={roleId} onChange={e => setRoleId(e.target.value)}>
                <option value="">Choose a role…</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.rank} — {r.name}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "end", gap: 10 }}>
              <button className="btn" style={{ width: "auto" }} disabled={busy || !roleId} onClick={() => act("rank")}>Change rank</button>
              <button className="btn danger" style={{ width: "auto" }} disabled={busy || !status.inGroup} onClick={() => act("kick")}>Kick from group</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
      <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 16 }}>Group <span className="mono">{groupId}</span>. Rank changes and kicks are logged.</p>
    </div>
  );
}
