"use client";
import { useState, useEffect } from "react";

function Row({ label, ok, detail }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)" }}>
      <span style={{ width: 11, height: 11, borderRadius: "50%", flex: "0 0 auto", background: ok == null ? "var(--muted)" : ok ? "var(--success)" : "var(--danger)", boxShadow: ok ? "0 0 10px var(--success)" : "none" }} />
      <span style={{ fontWeight: 700, fontSize: 15, color: "var(--white)" }}>{label}</span>
      <span style={{ marginLeft: "auto", fontSize: 13, color: ok == null ? "var(--muted)" : ok ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
        {ok == null ? "…" : ok ? "Operational" : "Down"}
      </span>
      {detail && <span className="muted" style={{ fontSize: 12.5, marginLeft: 6 }}>{detail}</span>}
    </div>
  );
}

export default function StatusPage() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = () => fetch("/api/public-status").then((r) => r.json()).then((j) => { if (alive) { setS(j); setErr(false); } }).catch(() => { if (alive) setErr(true); });
    load();
    const iv = setInterval(load, 15000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const allOk = s && s.botOnline && s.dbOk && s.robloxOk;

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "48px 18px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div className="brand" style={{ fontSize: 30 }}>zhd<span style={{ color: "var(--muted)" }}>.lol</span></div>
        <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-.5px", margin: "12px 0 6px", color: "var(--white)" }}>System Status</h1>
        <p className="muted" style={{ fontSize: 14, margin: 0 }}>
          {s == null ? "Checking…" : allOk ? "All systems operational." : "Some systems are having trouble."}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Row label="Discord bot" ok={s ? s.botOnline : null} detail={s && s.sweepAgo != null ? `heartbeat ${s.sweepAgo}s ago` : ""} />
        <Row label="Database" ok={s ? s.dbOk : null} />
        <Row label="Roblox game API" ok={s ? s.robloxOk : null} detail={s && s.players != null ? `${s.players} in-game` : ""} />
      </div>
      {err && <div className="muted" style={{ textAlign: "center", fontSize: 12.5, marginTop: 16 }}>Couldn&apos;t reach the status service — retrying…</div>}
      <div style={{ textAlign: "center", marginTop: 30, fontSize: 13 }}>
        <a href="/" className="muted">← zhd.lol</a> · <a href="/preview" className="muted">tag &amp; emoji preview</a>
      </div>
    </div>
  );
}
