"use client";
import { useEffect, useState } from "react";
import Dropdown from "./Dropdown";
import { RANKS, pillClassForLevel } from "@/lib/permissions";

export default function WhitelistManager({ myLevel }) {
  // Only ranks at or below your own level are assignable.
  const assignable = RANKS.filter((r) => r.level <= Number(myLevel));
  const [list, setList] = useState([]);
  const [f, setF] = useState({ discordId: "", level: assignable[assignable.length - 1]?.level ?? 1, note: "" });
  const [toast, setT] = useState(null);

  async function load() { const r = await fetch("/api/whitelist"); const d = await r.json(); if (r.ok) setList(d.list); }
  useEffect(() => { load(); }, []);

  async function add() {
    setT(null);
    const r = await fetch("/api/whitelist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, level: Number(f.level) }) });
    const d = await r.json(); if (!r.ok) { setT({ bad: true, msg: d.error }); return; }
    setF({ discordId: "", level: f.level, note: "" }); load();
  }
  async function del(discordId) { await fetch("/api/whitelist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ discordId }) }); load(); }

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
      <table style={{ marginTop: 20 }}>
        <thead><tr><th>Discord ID</th><th>Level</th><th>Note</th><th>By</th><th></th></tr></thead>
        <tbody>{list.map((w) => (
          <tr key={w.discord_id}>
            <td className="mono">{w.discord_id}</td>
            <td><span className={`role-pill role-${pillClassForLevel(w.level)}`}>{w.roleLabel} ({w.level})</span></td>
            <td>{w.note || "—"}</td><td>{w.added_by || "—"}</td>
            <td><button className="btn danger" style={{ width: "auto", padding: "5px 10px", fontSize: 12 }} onClick={() => del(w.discord_id)}>Remove</button></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
