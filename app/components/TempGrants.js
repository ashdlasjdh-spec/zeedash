"use client";
import { useState, useEffect, useCallback } from "react";
import Avatar from "./Avatar";

function fmtRemaining(ms) {
  if (ms <= 0) return "expiring…";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

const EXTEND = [["+1h", 3600], ["+1d", 86400], ["+1w", 604800]];

export default function TempGrants() {
  const [grants, setGrants] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null); // `${userId}:${category}:${itemKey}`
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(Date.now());

  // tick the countdowns every second
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await fetch("/api/grant/expiring");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      setGrants(d.grants || []);
    } catch (e) { if (!silent) setToast({ bad: true, msg: e.message }); }
    if (!silent) setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  // Refresh in the background so expiries the sweep removes drop off on their own.
  useEffect(() => { const iv = setInterval(() => load(true), 20000); return () => clearInterval(iv); }, [load]);

  const keyOf = (g) => `${g.userId}:${g.category}:${g.itemKey}`;

  async function act(g, action, seconds) {
    setBusy(keyOf(g)); setToast(null);
    try {
      const r = await fetch("/api/grant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: g.category, key: g.itemKey, username: g.userId, action, seconds }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      const who = g.username || g.userId;
      setToast({ ok: !d.warn, msg: action === "revoke" ? `Revoked ${g.itemKey} from ${who}.` : `Extended ${g.itemKey} for ${who}${d.expiresIn ? ` (now ${d.expiresIn})` : ""}.` + (d.warn ? " ⚠ " + d.warn : "") });
      load(true);
    } catch (e) { setToast({ bad: true, msg: e.message }); }
    setBusy(null);
  }

  // Extend = new duration is whatever's left plus the added window (so it truly extends).
  function extend(g, add) {
    const remaining = Math.max(0, Math.floor((new Date(g.expiresAt).getTime() - Date.now()) / 1000));
    act(g, "grant", remaining + add);
  }

  return (
    <>
      <div className="card">
        <div className="between" style={{ marginBottom: 4 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="livedot" /> Active temporary grants
            </div>
            <div className="muted" style={{ fontSize: 13 }}>Everything counting down to auto-expiry. Revoke now or extend the timer.</div>
          </div>
          <button className="btn ghost" style={{ width: "auto" }} disabled={loading} onClick={() => load()}>{loading ? "Loading…" : grants ? "Refresh" : "Load"}</button>
        </div>
        {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}

        {grants == null ? (
          <p className="muted" style={{ marginTop: 14 }}>Loading…</p>
        ) : grants.length === 0 ? (
          <p className="muted" style={{ marginTop: 14 }}>No temporary grants are pending — everything active is permanent.</p>
        ) : (
          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table>
              <thead><tr><th>Player</th><th>Item</th><th>Expires in</th><th>Granted by</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
              <tbody>
                {grants.map((g) => {
                  const remaining = new Date(g.expiresAt).getTime() - now;
                  const soon = remaining <= 60000;
                  const k = keyOf(g);
                  return (
                    <tr key={k}>
                      <td>
                        <a className="mono" href={`https://www.roblox.com/users/${g.userId}/profile`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                          <Avatar userId={g.userId} size={26} />{g.username || g.userId}
                        </a>
                      </td>
                      <td><span className="pill">{g.category}</span> <b>{g.itemKey}</b></td>
                      <td className="mono" style={{ color: soon ? "var(--danger)" : "var(--text)", fontWeight: 700, whiteSpace: "nowrap" }}>{fmtRemaining(remaining)}</td>
                      <td className="muted">{g.grantedBy || "—"}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {EXTEND.map(([lbl, sec]) => (
                          <button key={lbl} className="btn ghost" style={{ width: "auto", padding: "5px 9px", fontSize: 12, marginLeft: 6 }} disabled={busy === k} onClick={() => extend(g, sec)}>{lbl}</button>
                        ))}
                        <button className="btn ghost" style={{ width: "auto", padding: "5px 10px", fontSize: 12, marginLeft: 6, color: "var(--danger)" }} disabled={busy === k} onClick={() => act(g, "revoke")}>Revoke</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
