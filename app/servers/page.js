"use client";
import { useState, useEffect } from "react";

const pingColor = (p) => (p == null ? "var(--muted)" : p < 100 ? "var(--success)" : p < 200 ? "#f5a45a" : "var(--danger)");

export default function Servers() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = () => fetch("/api/game-servers").then((r) => r.json()).then((j) => { if (alive) { setD(j); setErr(false); } }).catch(() => { if (alive) setErr(true); });
    load();
    const iv = setInterval(load, 15000);
    return () => { alive = false; clearInterval(iv); };
  }, []);
  const servers = d?.servers || [];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 18px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div className="brand" style={{ fontSize: 30 }}>zhd<span style={{ color: "var(--muted)" }}>.lol</span></div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.5px", margin: "12px 0 6px", color: "var(--white)" }}>Live Servers</h1>
        <p className="muted" style={{ fontSize: 14, margin: 0 }}>
          {d == null ? "Loading…" : `${d.count} public server${d.count === 1 ? "" : "s"} · ${d.players} player${d.players === 1 ? "" : "s"} in-game`}
        </p>
      </div>

      <div className="card" style={{ marginBottom: 14, padding: "12px 16px" }}>
        <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
          Ping is each server&apos;s <b>average player ping</b> and FPS is the server&apos;s tick rate — both from Roblox.
          <b> Region isn&apos;t shown</b> because Roblox doesn&apos;t expose server region in its public API.
        </div>
      </div>

      {d != null && servers.length === 0 && <div className="card"><p className="muted" style={{ margin: 0 }}>No public servers are live right now.</p></div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {servers.map((s, i) => {
          const pct = s.max ? Math.round((s.playing / s.max) * 100) : 0;
          return (
            <div key={s.id || i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)" }}>
              <span className="muted mono" style={{ fontSize: 12, width: 26, textAlign: "right" }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 5 }}>
                  <span style={{ fontWeight: 700, color: "var(--white)" }}>{s.playing}<span className="muted" style={{ fontWeight: 400 }}> / {s.max}</span></span>
                  <span className="muted" style={{ fontSize: 12 }}>{pct}% full</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "var(--surface-3)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: pct > 90 ? "var(--danger)" : "linear-gradient(90deg,#7c5cff,#4ade80)" }} />
                </div>
              </div>
              <div style={{ textAlign: "right", flex: "0 0 auto", minWidth: 72 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: pingColor(s.ping) }}>{s.ping != null ? `${s.ping} ms` : "—"}</div>
                <div className="muted" style={{ fontSize: 11 }}>{s.fps != null ? `${s.fps} fps` : "ping"}</div>
              </div>
            </div>
          );
        })}
      </div>

      {err && <div className="muted" style={{ textAlign: "center", fontSize: 12.5, marginTop: 16 }}>Couldn&apos;t reach the server list — retrying…</div>}
      <div style={{ textAlign: "center", marginTop: 30, fontSize: 13 }}>
        <a href="/" className="muted">← zhd.lol</a> · <a href="/perks" className="muted">check my perks</a> · <a href="/catalog" className="muted">catalog</a> · <a href="/status" className="muted">status</a>
      </div>
    </div>
  );
}
