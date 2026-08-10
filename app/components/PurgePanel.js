"use client";
import { useState } from "react";

// Every grant section that can be mass-removed (mirrors PERK_FIELD server-side).
const SECTIONS = [
  { category: "power", label: "Powers" },
  { category: "stand", label: "Stands" },
  { category: "shazam", label: "Shazam" },
  { category: "car", label: "SVJ Car" },
  { category: "tool", label: "Tools" },
  { category: "gamepass", label: "Gamepasses" },
  { category: "startbr", label: "Start BR" },
];

export default function PurgePanel() {
  const [busy, setBusy] = useState(null);   // category currently running
  const [toast, setToast] = useState(null);
  const [granter, setGranter] = useState("");
  const [gBusy, setGBusy] = useState(false);

  async function purge(category, label) {
    if (typeof window !== "undefined") {
      const typed = window.prompt(`This removes EVERY ${label} grant from EVERY player who has one. Type "${category}" to confirm.`);
      if (typed !== category) { setToast({ bad: true, msg: "Cancelled — nothing removed." }); return; }
    }
    setBusy(category); setToast(null);
    try {
      const res = await fetch("/api/grant/purge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setToast({ ok: !d.warn, msg: `Removed ${d.removed.items} ${label} grant(s) from ${d.removed.users} player(s).` + (d.warn ? " ⚠ " + d.warn : "") });
    } catch (e) { setToast({ bad: true, msg: e.message }); }
    setBusy(null);
  }

  // Undo every grant a specific staff member made — for cleaning up a dashboard abuser.
  async function purgeByGranter() {
    const g = granter.trim();
    if (!g) { setToast({ bad: true, msg: "Enter the granter's Discord ID or name." }); return; }
    if (typeof window !== "undefined") {
      const typed = window.prompt(`This revokes EVERYTHING granted by "${g}" from every player they gave to. Type REVOKE to confirm.`);
      if (typed !== "REVOKE") { setToast({ bad: true, msg: "Cancelled — nothing removed." }); return; }
    }
    setGBusy(true); setToast(null);
    try {
      const res = await fetch("/api/grant/purge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ granter: g }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setToast({ ok: !d.warn, msg: `Revoked ${d.removed.items} grant(s) made by ${g} across ${d.removed.users} player(s).` + (d.warn ? " ⚠ " + d.warn : "") });
    } catch (e) { setToast({ bad: true, msg: e.message }); }
    setGBusy(false);
  }

  return (
    <div className="card" style={{ borderColor: "var(--danger)" }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--danger)" }}>Danger zone — mass removal</div>
      <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
        Each button revokes that grant from <b>every player</b> who currently has one — in-game, in the datastores, and in the shared database. This cannot be undone.
      </div>
      <table style={{ marginTop: 6 }}>
        <thead><tr><th>Section</th><th></th></tr></thead>
        <tbody>
          {SECTIONS.map((s) => (
            <tr key={s.category}>
              <td style={{ fontWeight: 600 }}>{s.label}</td>
              <td style={{ textAlign: "right" }}>
                <button
                  className="btn"
                  style={{ width: "auto", background: "var(--danger)", borderColor: "var(--danger)" }}
                  disabled={!!busy}
                  onClick={() => purge(s.category, s.label)}
                >
                  {busy === s.category ? "Removing…" : `Remove all ${s.label}`}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 18, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--danger)" }}>Revoke everything a user granted</div>
        <div className="muted" style={{ fontSize: 13, margin: "4px 0 10px" }}>
          If a staff member abused the dashboard, pull back <b>every</b> grant they ever made — powers, tools, gamepasses, stands, shazam, SVJ car, start-BR — from every player they gave to. Matched from the audit log by their <b>Discord ID</b> or <b>name</b>.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={granter}
            onChange={(e) => setGranter(e.target.value)}
            placeholder="Granter Discord ID or name"
            style={{ flex: 1, minWidth: 200 }}
          />
          <button
            className="btn"
            style={{ width: "auto", background: "var(--danger)", borderColor: "var(--danger)" }}
            disabled={gBusy}
            onClick={purgeByGranter}
          >
            {gBusy ? "Revoking…" : "Revoke their grants"}
          </button>
        </div>
      </div>

      {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`} style={{ marginTop: 12 }}>{toast.msg}</div>}
    </div>
  );
}
