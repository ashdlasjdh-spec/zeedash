"use client";
import { useState } from "react";
import Avatar from "./Avatar";

export default function EmojiForm() {
  const [username, setU] = useState(""); const [emojis, setE] = useState("");
  const [busy, setB] = useState(false); const [toast, setT] = useState(null);
  const [list, setList] = useState(null); const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  async function go(action) {
    setB(true); setT(null);
    try {
      const r = await fetch("/api/emoji", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, emojis, action }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setT({ ok: true, msg: `${action === "remove" ? "Cleared emojis for" : action === "add" ? "Added to" : "Set emojis for"} ${d.target.username}${d.value ? ` — now: ${d.value}` : ""}.` });
      if (list) load();
    } catch (e) { setT({ bad: true, msg: e.message }); } setB(false);
  }
  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/emoji"); const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setList(Object.entries(d.emojis || {}).map(([userId, e]) => ({ userId, emojis: e })));
    } catch (e) { setT({ bad: true, msg: e.message }); } setLoading(false);
  }
  async function remove(userId) {
    try {
      const r = await fetch("/api/emoji", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, action: "remove" }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setT({ ok: true, msg: `Cleared emojis for ${userId}.` }); load();
    } catch (e) { setT({ bad: true, msg: e.message }); }
  }

  return (
    <>
      <div className="card">
        <div className="grid g2">
          <div><label>Roblox username</label><input value={username} onChange={(e) => setU(e.target.value)} placeholder="Builderman" /></div>
          <div><label>Emojis (paste any)</label><input value={emojis} onChange={(e) => setE(e.target.value)} placeholder="⭐💖🔥" /></div>
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn" disabled={busy} onClick={() => go("add")}>Add to existing</button>
          <button className="btn ghost" disabled={busy} onClick={() => go("set")}>Set (replace all)</button>
          <button className="btn ghost" disabled={busy} onClick={() => go("remove")}>Remove all</button>
        </div>
        {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
      </div>

      <div className="card">
        <div className="between">
          <div><div style={{ fontWeight: 700, fontSize: 15 }}>Players with custom emojis</div><div className="muted" style={{ fontSize: 13 }}>Everyone in the emoji datastore.</div></div>
          <button className="btn ghost" style={{ width: "auto" }} disabled={loading} onClick={load}>{loading ? "Loading…" : list ? "Refresh" : "Load"}</button>
        </div>
        {list && (list.length === 0 ? <p className="muted" style={{ marginTop: 14 }}>No custom emojis set yet.</p> : (() => {
          const s = q.trim().toLowerCase();
          const shown = s ? list.filter((r) => String(r.userId).toLowerCase().includes(s) || String(r.emojis || "").includes(q.trim())) : list;
          return (
          <>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${list.length} players — user ID or emoji…`} style={{ marginTop: 14 }} />
          {shown.length === 0 ? <p className="muted" style={{ marginTop: 12 }}>No players match “{q}”.</p> : (
          <table style={{ marginTop: 12 }}>
            <thead><tr><th>User</th><th>Emojis</th><th></th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.userId}>
                  <td><a className="mono" href={`https://www.roblox.com/users/${r.userId}/profile`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}><Avatar userId={r.userId} size={26} />{r.userId}</a></td>
                  <td style={{ fontSize: 18 }}>{r.emojis}</td>
                  <td style={{ textAlign: "right" }}><button className="btn ghost" style={{ width: "auto", color: "var(--danger)" }} onClick={() => remove(r.userId)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
          </>
          );
        })())}
      </div>
    </>
  );
}
