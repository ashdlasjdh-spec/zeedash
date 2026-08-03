"use client";
import { useState } from "react";

const FIELD = { power: "powers", gamepass: "gamepasses", shazam: "shazam" };

export default function GrantForm({ category, items, verb = "Grant" }) {
  const [sel, setSel] = useState(null);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [list, setList] = useState(null);
  const [loadingList, setLoadingList] = useState(false);

  async function submit(action) {
    if (!sel || !username) { setToast({ bad: true, msg: "Pick an item and enter a username." }); return; }
    setBusy(true); setToast(null);
    try {
      const res = await fetch("/api/grant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, key: sel, username, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setToast({ ok: !data.warn, msg: `${action === "revoke" ? "Revoked" : "Granted"} ${sel} ${action === "revoke" ? "from" : "to"} ${data.target.username}.` + (data.warn ? " ⚠ " + data.warn : "") });
      if (list) loadGranted();
    } catch (e) { setToast({ bad: true, msg: e.message }); }
    setBusy(false);
  }

  async function loadGranted() {
    setLoadingList(true);
    try {
      const r = await fetch("/api/perks");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      const field = FIELD[category];
      let rows = [];
      if (field) rows = (d.perks || []).filter((p) => (p[field] || []).length).map((p) => ({ userId: p.userId, items: p[field], by: p.grantedBy }));
      setList(rows);
    } catch (e) { setToast({ bad: true, msg: e.message }); }
    setLoadingList(false);
  }

  const dbBacked = !!FIELD[category];

  return (
    <>
      <div className="card">
        <label>Choose {category}</label>
        <div className="item-grid">
          {items.map((it) => (
            <button key={it.key} className={`item ${sel === it.key ? "sel" : ""}`} onClick={() => setSel(it.key)}>{it.name}</button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 18 }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label>Roblox username or ID</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. Builderman or 156" />
          </div>
          <button className="btn" disabled={busy} onClick={() => submit("grant")}>{busy ? "…" : verb}</button>
          <button className="btn ghost" disabled={busy} onClick={() => submit("revoke")}>Revoke</button>
        </div>
        {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
      </div>

      {dbBacked && (
        <div className="card">
          <div className="between">
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Currently granted</div>
              <div className="muted" style={{ fontSize: 13 }}>Everyone with a {category} in the shared database.</div>
            </div>
            <button className="btn ghost" style={{ width: "auto" }} disabled={loadingList} onClick={loadGranted}>
              {loadingList ? "Loading…" : list ? "Refresh" : "Load"}
            </button>
          </div>
          {list && (
            list.length === 0 ? (
              <p className="muted" style={{ marginTop: 14 }}>No {category}s granted yet.</p>
            ) : (
              <table style={{ marginTop: 14 }}>
                <thead><tr><th>User</th><th>Items</th><th>Granted by</th></tr></thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.userId}>
                      <td><a className="mono" href={`https://www.roblox.com/users/${r.userId}/profile`} target="_blank" rel="noreferrer">{r.userId}</a></td>
                      <td>{r.items.join(", ")}</td>
                      <td className="muted">{r.by || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      )}
    </>
  );
}
