"use client";
import { useEffect, useState } from "react";
export default function SettingsPanel() {
  const [cfg, setCfg] = useState(null);
  const [apiKey, setKey] = useState(""); const [universeId, setUni] = useState(""); const [groupId, setGid] = useState("");
  const [busy, setB] = useState(false); const [toast, setT] = useState(null);
  const [syncing, setS] = useState(false); const [syncToast, setST] = useState(null);
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
  async function syncDb() {
    if (!confirm("Push everything in the shared database (perks + crew tags) into the CURRENT universe's DataStores? Run this after swapping the game / universe ID.")) return;
    setS(true); setST(null);
    try {
      const r = await fetch("/api/sync", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Sync failed");
      const bits = [`${d.perksSynced} perk entries written`, `${d.whitelistPowers ?? 0} power whitelists rebuilt`, `${d.tagsSynced} tags pushed`, `${d.pinged} online pings sent`];
      if (d.perksSkipped) bits.push(`${d.perksSkipped} empty rows skipped`);
      setST({ ok: !(d.errors || []).length, msg: `Synced — ${bits.join(", ")}.` + ((d.errors || []).length ? ` ⚠ ${d.errors.length} errors: ${d.errors.slice(0, 3).join(" · ")}` : " Players get perks on next spawn.") });
    } catch (e) { setST({ bad: true, msg: e.message }); }
    setS(false);
  }
  if (!cfg) return <div className="card">Loading…</div>;
  return (
    <>
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

    <div className="card">
      <div style={{ fontWeight: 700, fontSize: 15 }}>Sync database → game</div>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>
        The shared Postgres DB is the source of truth and is universe-independent. After you swap
        games or change the universe ID above, the new universe's DataStores are empty — this button
        writes every perk grant (powers, gamepasses, tools, Shazam variants, armor) back into the
        <span className="mono"> PlayerPerks</span> store and re-publishes every crew tag, using the
        universe currently saved in the config. Online players are pinged; everyone else re-applies
        on their next spawn.
      </p>
      <div className="row">
        <button className="btn" style={{ width: "auto" }} disabled={syncing} onClick={syncDb}>
          {syncing ? "Syncing…" : "Sync DB to game"}
        </button>
      </div>
      {syncToast && <div className={`toast ${syncToast.ok ? "ok" : "bad"}`}>{syncToast.msg}</div>}
    </div>
    </>
  );
}
