"use client";
import { useEffect, useState } from "react";
export default function SettingsPanel() {
  const [cfg, setCfg] = useState(null);
  const [apiKey, setKey] = useState(""); const [universeId, setUni] = useState(""); const [groupId, setGid] = useState("");
  const [busy, setB] = useState(false); const [toast, setT] = useState(null);
  async function load() { const r = await fetch("/api/config"); const d = await r.json(); if (r.ok) { setCfg(d); setUni(d.universeId || ""); setGid(d.groupId || ""); } }
  useEffect(() => { load(); }, []);
  async function save() {
    setB(true); setT(null);
    const body = {}; if (apiKey) body.apiKey = apiKey; if (universeId) body.universeId = universeId; if (groupId) body.groupId = groupId;
    const r = await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) setT({ bad: true, msg: d.error }); else { setT({ ok: true, msg: "Saved. New actions use these immediately." }); setKey(""); load(); }
    setB(false);
  }
  if (!cfg) return <div className="card">Loading…</div>;
  return (
    <div className="card">
      <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>Swap the Open Cloud key, universe and group here. Overrides are stored in the database and take effect immediately — no redeploy.</p>
      <div className="grid" style={{ gap: 18 }}>
        <div>
          <label>Open Cloud API key <span style={{ color: cfg.apiKeySet ? "var(--ok)" : "var(--danger)" }}>({cfg.apiKeySet ? `set · ${cfg.apiKeySource} · ${cfg.apiKeyMasked}` : "not set"})</span></label>
          <input className="mono" type="password" value={apiKey} onChange={e => setKey(e.target.value)} placeholder="paste a new key to replace it" />
        </div>
        <div className="grid g2">
          <div><label>Universe ID <span style={{ color: "var(--muted)" }}>({cfg.universeSource})</span></label>
            <input className="mono" value={universeId} onChange={e => setUni(e.target.value)} placeholder="10604778261" /></div>
          <div><label>Group ID <span style={{ color: "var(--muted)" }}>({cfg.groupSource})</span></label>
            <input className="mono" value={groupId} onChange={e => setGid(e.target.value)} placeholder="1099600954" /></div>
        </div>
      </div>
      <div className="row" style={{ marginTop: 16 }}><button className="btn" style={{ width: "auto" }} disabled={busy} onClick={save}>Save config</button></div>
      {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
    </div>
  );
}
