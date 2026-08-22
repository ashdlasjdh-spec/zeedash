"use client";
import { useState } from "react";
import Dropdown from "./Dropdown";
import { RANKS, roleTone } from "@/lib/permissions";
import { useCachedResource } from "@/lib/clientCache";

export default function WhitelistManager({ myLevel }) {
  // Only ranks at or below your own level are assignable.
  const assignable = RANKS.filter((r) => r.level <= Number(myLevel));
  const { data: list, loading, refresh, mutate } = useCachedResource("whitelist", () =>
    fetch("/api/whitelist").then((r) => r.json()).then((d) => (Array.isArray(d.list) ? d.list : []))
  );
  const [f, setF] = useState({ discordId: "", level: assignable[assignable.length - 1]?.level ?? 1, note: "" });
  const [toast, setT] = useState(null);

  async function add() {
    setT(null);
    const r = await fetch("/api/whitelist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, level: Number(f.level) }) });
    const d = await r.json(); if (!r.ok) { setT({ bad: true, msg: d.error }); return; }
    setF({ discordId: "", level: f.level, note: "" }); refresh();
  }
  async function del(discordId) {
    // Optimistic remove so the row disappears instantly, then confirm with the server.
    mutate((prev) => (prev || []).filter((w) => w.discord_id !== discordId));
    await fetch("/api/whitelist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ discordId }) });
    refresh();
  }

  const rows = list || [];
  return (
    <div className="card">
      <div className="row">
        <div style={{ flex: 1 }}><label>Discord user id</label><input className="mono" value={f.discordId} onChange={(e) => setF((s) => ({ ...s, discordId: e.target.value }))} placeholder="1234567890" /></div>
        <div><label>Level</label>
          <Dropdown value={f.level} onChange={(e) => setF((s) => ({ ...s, level: Number(e.target.value) }))} options={assignable.map((r) => ({ value: r.level, label: `${r.name} (${r.level})` }))} />
        </div>
        <button className="btn" style={{ width: "auto" }} onClick={add}>Add / update</button>
      </div>
      {toast && <div className="toast bad">{toast.msg}</div>}
      <div className="table-wrap" style={{ marginTop: 20 }}>
        <table>
          <thead><tr><th>Discord ID</th><th>Level</th><th>Note</th><th>By</th><th></th></tr></thead>
          <tbody>
            {loading && rows.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="skeleton-row"><td colSpan={5}><span className="skeleton-bar" /></td></tr>
                ))
              : rows.length === 0
                ? <tr><td colSpan={5} style={{ color: "var(--muted)", textAlign: "center", padding: "18px 0" }}>No whitelist entries yet.</td></tr>
                : rows.map((w) => (
                    <tr key={w.discord_id}>
                      <td className="mono">{w.discord_id}</td>
                      <td><span className={`role-pill role-t-${roleTone(w.level)}`}>{w.roleLabel} ({w.level})</span></td>
                      <td>{w.note || "—"}</td><td>{w.added_by || "—"}</td>
                      <td><button className="btn danger" style={{ width: "auto", padding: "5px 10px", fontSize: 12 }} onClick={() => del(w.discord_id)}>Remove</button></td>
                    </tr>
                  ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
