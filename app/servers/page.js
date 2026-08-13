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
  const placeId = d?.placeId || null;

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
          const avatars = s.avatars || [];
          const extra = Math.max(0, s.playing - avatars.length);
          const joinUrl = placeId ? `https://www.roblox.com/games/start?placeId=${placeId}&gameInstanceId=${s.id}` : null;
          return (
            <div key={s.id || i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", flexWrap: "wrap" }}>
              <span className="muted mono" style={{ fontSize: 12, width: 22, textAlign: "right" }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 5 }}>
                  <span style={{ fontWeight: 700, color: "var(--white)" }}>{s.playing}<span className="muted" style={{ fontWeight: 400 }}> / {s.max}</span></span>
                  <span className="muted" style={{ fontSize: 12 }}>{pct}% full</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "var(--surface-3)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: pct > 90 ? "var(--danger)" : "linear-gradient(90deg,#7c5cff,#4ade80)" }} />
                </div>
                {avatars.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
                    {avatars.map((url, ai) => (
                      <img key={ai} src={url} alt="" width={24} height={24} loading="lazy" referrerPolicy="no-referrer"
                        style={{ borderRadius: "50%", border: "2px solid var(--surface)", marginLeft: ai === 0 ? 0 : -8, background: "var(--surface-3)" }} />
                    ))}
                    {extra > 0 && <span className="muted" style={{ fontSize: 11.5, marginLeft: 8 }}>+{extra} more</span>}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right", flex: "0 0 auto", minWidth: 56 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: pingColor(s.ping) }}>{s.ping != null ? `${s.ping} ms` : "—"}</div>
                <div className="muted" style={{ fontSize: 11 }}>{s.fps != null ? `${s.fps} fps` : "ping"}</div>
              </div>
              {joinUrl && <a className="btn" href={joinUrl} target="_blank" rel="noreferrer" style={{ width: "auto", padding: "7px 16px", fontSize: 13, flex: "0 0 auto" }}>Join</a>}
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
