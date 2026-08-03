"use client";
import { useState } from "react";

export default function GrantForm({ category, items, verb = "Grant" }) {
  const [sel, setSel] = useState(null);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

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
      setToast({ ok: true, msg: `${action === "revoke" ? "Revoked" : "Granted"} ${sel} ${action === "revoke" ? "from" : "to"} ${data.target.username}.` });
    } catch (e) { setToast({ bad: true, msg: e.message }); }
    setBusy(false);
  }

  return (
    <div className="card">
      <label>Choose {category}</label>
      <div className="item-grid">
        {items.map((it) => (
          <button key={it.key} className={`item ${sel === it.key ? "sel" : ""}`} onClick={() => setSel(it.key)}>{it.name}</button>
        ))}
      </div>
      <div className="row" style={{marginTop:18}}>
        <div style={{flex:1}}>
          <label>Roblox username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. Builderman" />
        </div>
        <button className="btn" style={{width:"auto"}} disabled={busy} onClick={() => submit("grant")}>{busy ? "…" : verb}</button>
        <button className="btn ghost" style={{width:"auto"}} disabled={busy} onClick={() => submit("revoke")}>Revoke</button>
      </div>
      {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
    </div>
  );
}
