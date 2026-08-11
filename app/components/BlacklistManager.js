"use client";
import { useState, useEffect } from "react";

// Co founders+ block/unblock Discord users from the whole site.
export default function BlacklistManager() {
  const [list, setList] = useState(null);
  const [discordId, setDiscordId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  async function load() {
    try { const r = await fetch("/api/blacklist"); const d = await r.json(); if (r.ok) setList(d.list || []); else setToast({ bad: true, msg: d.error }); }
    catch (e) { setToast({ bad: true, msg: e.message }); }
  }
  useEffect(() => { load(); }, []);

  async function add() {
    setBusy(true); setToast(null);
    try {
      const r = await fetch("/api/blacklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ discordId: discordId.trim(), note }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      setToast({ ok: true, msg: `Blocked ${discordId.trim()} from the site.` });
      setDiscordId(""); setNote(""); load();
    } catch (e) { setToast({ bad: true, msg: e.message }); }
    setBusy(false);
  }
  async function remove(id) {
    if (typeof window !== "undefined" && !window.confirm(`Restore site access for ${id}?`)) return;
    setBusy(true); setToast(null);
    try {
      const r = await fetch("/api/blacklist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ discordId: id }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      setToast({ ok: true, msg: `Restored access for ${id}.` });
      load();
    } catch (e) { setToast({ bad: true, msg: e.message }); }
    setBusy(false);
  }

  return (
    <div className="card" style={{ marginTop: 16, borderColor: "rgba(255,107,107,.4)" }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: "var(--danger)" }}>Blacklist</div>
      <div className="muted" style={{ fontSize: 13, margin: "4px 0 14px" }}>
        Block a Discord user from the dashboard entirely — they can't sign in or use any page, regardless of their roles. Paste their <b>Discord user ID</b>.
      </div>
      <div className="row" style={{ gap: 8 }}>
        <div style={{ flex: "0 0 auto", minWidth: 200 }}><label>Discord user ID</label>
          <input value={discordId} onChange={(e) => setDiscordId(e.target.value)} placeholder="e.g. 183605754593411072" inputMode="numeric" /></div>
        <div style={{ flex: 1, minWidth: 180 }}><label>Note (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why they're blocked" /></div>
        <button className="btn" style={{ width: "auto", background: "var(--danger)", borderColor: "var(--danger)" }} disabled={busy || !discordId.trim()} onClick={add}>{busy ? "…" : "Block"}</button>
      </div>

      {list && (
        list.length === 0 ? <p className="muted" style={{ marginTop: 16 }}>No one is blacklisted.</p> : (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead><tr><th>Discord ID</th><th>Note</th><th>By</th><th>When</th><th></th></tr></thead>
              <tbody>
                {list.map((b) => (
                  <tr key={b.discord_id}>
                    <td className="mono">{b.discord_id}</td>
                    <td>{b.note || "—"}</td>
                    <td className="muted mono">{b.added_by || "—"}</td>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>{new Date(b.added_at).toLocaleDateString()}</td>
                    <td style={{ textAlign: "right" }}><button className="btn ghost" style={{ width: "auto" }} disabled={busy} onClick={() => remove(b.discord_id)}>Unblock</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
      {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`} style={{ marginTop: 12 }}>{toast.msg}</div>}
    </div>
  );
}
