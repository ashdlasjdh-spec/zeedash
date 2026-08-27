"use client";
import { useEffect, useState } from "react";

// Visual editor for zeehood.org content. Loads the live config, lets a super owner edit the game/Discord
// links, place ID, game passes and staff roles as rows, and powers as validated JSON, then saves. The
// game site picks the change up on its next revalidate.
const box = { display: "flex", flexDirection: "column", gap: 6 };
const input = {
  width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid var(--line)",
  background: "var(--surface-2)", color: "var(--text)", fontSize: 14,
};
const label = { fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" };

export default function GameSiteClient() {
  const [cfg, setCfg] = useState(null);
  const [powersText, setPowersText] = useState("[]");
  const [powersErr, setPowersErr] = useState("");
  const [status, setStatus] = useState({ kind: "", msg: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/game-config")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setCfg(d);
        setPowersText(JSON.stringify(d.powers || [], null, 2));
      })
      .catch(() => setStatus({ kind: "err", msg: "Could not load the current config." }));
    return () => { alive = false; };
  }, []);

  if (!cfg) return <div className="card" style={{ margin: "6vh auto", maxWidth: 760 }}>Loading game site config…</div>;

  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));
  const setPass = (i, k, v) => setCfg((c) => { const passes = c.passes.map((p, j) => (j === i ? { ...p, [k]: v } : p)); return { ...c, passes }; });
  const addPass = () => setCfg((c) => ({ ...c, passes: [...c.passes, { id: "", item: "" }] }));
  const delPass = (i) => setCfg((c) => ({ ...c, passes: c.passes.filter((_, j) => j !== i) }));
  const setRole = (i, k, v) => setCfg((c) => { const roles = c.roles.map((r, j) => (j === i ? (k === 0 ? [v, r[1]] : [r[0], v]) : r)); return { ...c, roles }; });
  const addRole = () => setCfg((c) => ({ ...c, roles: [...c.roles, ["", ""]] }));
  const delRole = (i) => setCfg((c) => ({ ...c, roles: c.roles.filter((_, j) => j !== i) }));
  const shop = cfg.shop || [];
  const setShop = (i, k, v) => setCfg((c) => { const s = (c.shop || []).map((r, j) => (j === i ? (k === 0 ? [v, r[1]] : [r[0], v]) : r)); return { ...c, shop: s }; });
  const addShop = () => setCfg((c) => ({ ...c, shop: [...(c.shop || []), ["", ""]] }));
  const delShop = (i) => setCfg((c) => ({ ...c, shop: (c.shop || []).filter((_, j) => j !== i) }));

  async function save() {
    setPowersErr("");
    let powers;
    try {
      powers = JSON.parse(powersText || "[]");
      if (!Array.isArray(powers)) throw new Error("Powers must be a JSON array.");
    } catch (e) {
      setPowersErr(e.message || "Invalid JSON.");
      return;
    }
    setSaving(true);
    setStatus({ kind: "", msg: "" });
    try {
      const r = await fetch("/api/game-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...cfg, powers }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save failed.");
      setCfg(d.config);
      setPowersText(JSON.stringify(d.config.powers || [], null, 2));
      setStatus({ kind: "ok", msg: "Saved. The game site updates within a few minutes." });
    } catch (e) {
      setStatus({ kind: "err", msg: e.message || "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 style={{ margin: "0 0 4px" }}>Game site</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          Edit what shows on <a className="inl" href="https://zeehood.org" target="_blank" rel="noreferrer">zeehood.org</a> —
          links, place ID, passes, roles and powers. Changes go live within a few minutes.
        </p>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={box}><span style={label}>Game link (Roblox)</span>
          <input style={input} value={cfg.gameUrl} onChange={(e) => set("gameUrl", e.target.value)} placeholder="https://www.roblox.com/games/…" /></div>
        <div style={box}><span style={label}>Place ID (used for live player count & media)</span>
          <input style={input} value={cfg.placeId} onChange={(e) => set("placeId", e.target.value.replace(/\D/g, ""))} placeholder="122577517724086" /></div>
        <div style={box}><span style={label}>Discord invite</span>
          <input style={input} value={cfg.discordUrl} onChange={(e) => set("discordUrl", e.target.value)} placeholder="https://discord.gg/…" /></div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="between"><h2 style={{ margin: 0, fontSize: 16 }}>Game passes</h2>
          <button className="btn ghost" onClick={addPass}>+ Add pass</button></div>
        {cfg.passes.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input style={{ ...input, width: 160 }} value={p.id} onChange={(e) => setPass(i, "id", e.target.value.replace(/\D/g, ""))} placeholder="Pass ID" />
            <input style={input} value={p.item} onChange={(e) => setPass(i, "item", e.target.value)} placeholder="Item (e.g. Armor)" />
            <button className="btn ghost" style={{ padding: "8px 10px" }} onClick={() => delPass(i)} aria-label="Remove">✕</button>
          </div>
        ))}
        {!cfg.passes.length && <p style={{ color: "var(--muted)", margin: 0 }}>No passes — the page will be empty until you add some.</p>}
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="between"><h2 style={{ margin: 0, fontSize: 16 }}>Staff roles</h2>
          <button className="btn ghost" onClick={addRole}>+ Add role</button></div>
        {cfg.roles.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input style={input} value={r[0]} onChange={(e) => setRole(i, 0, e.target.value)} placeholder="Role name" />
            <input style={{ ...input, width: 120 }} value={r[1]} onChange={(e) => setRole(i, 1, e.target.value)} placeholder="$Price" />
            <button className="btn ghost" style={{ padding: "8px 10px" }} onClick={() => delRole(i)} aria-label="Remove">✕</button>
          </div>
        ))}
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="between"><h2 style={{ margin: 0, fontSize: 16 }}>Shop extras</h2>
          <button className="btn ghost" onClick={addShop}>+ Add item</button></div>
        {shop.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input style={input} value={r[0]} onChange={(e) => setShop(i, 0, e.target.value)} placeholder="Item name" />
            <input style={{ ...input, width: 120 }} value={r[1]} onChange={(e) => setShop(i, 1, e.target.value)} placeholder="$Price" />
            <button className="btn ghost" style={{ padding: "8px 10px" }} onClick={() => delShop(i)} aria-label="Remove">✕</button>
          </div>
        ))}
        {!shop.length && <p style={{ color: "var(--muted)", margin: 0 }}>No shop items.</p>}
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Powers</h2>
        <p style={{ color: "var(--muted)", margin: "0 0 4px", fontSize: 13 }}>
          Structured as JSON: <code>[ ["Category", [ ["Power name", "$Price", unavailable?], … ] ], … ]</code>.
          The third value is optional and marks a power as unavailable.
        </p>
        <textarea
          style={{ ...input, minHeight: 220, fontFamily: "var(--mono, monospace)", fontSize: 13, whiteSpace: "pre" }}
          value={powersText}
          onChange={(e) => setPowersText(e.target.value)}
          spellCheck={false}
        />
        {powersErr && <span style={{ color: "var(--danger)", fontSize: 13 }}>{powersErr}</span>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button className="btn" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        {status.msg && <span style={{ color: status.kind === "ok" ? "var(--good, #16a34a)" : "var(--danger)", fontSize: 14 }}>{status.msg}</span>}
      </div>
    </div>
  );
}
