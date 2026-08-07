"use client";
import { useState } from "react";

export default function BanForm() {
  const [user, setU] = useState("");
  const [duration, setD] = useState(""); // blank = permanent; else seconds
  const [busy, setB] = useState(false);
  const [toast, setT] = useState(null);

  async function go(action) {
    if (!user.trim()) { setT({ bad: true, msg: "Enter a Roblox username or ID." }); return; }
    setB(true); setT(null);
    try {
      const r = await fetch("/api/bans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, duration: duration.trim() || undefined, action }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Request failed");
      setT({
        ok: true,
        msg: `${action === "ban" ? "Banned" : "Unbanned"} ${d.user?.username || user}` +
          (action === "ban" && d.caseId ? ` — case ${d.caseId}` : "") + ".",
      });
      if (action === "ban") setD("");
    } catch (e) { setT({ bad: true, msg: e.message }); }
    setB(false);
  }

  return (
    <div className="card">
      <div className="grid g2">
        <div>
          <label>Roblox username or ID</label>
          <input value={user} onChange={(e) => setU(e.target.value)} placeholder="Builderman or 156" />
        </div>
        <div>
          <label>Duration (seconds) — blank = permanent</label>
          <input value={duration} onChange={(e) => setD(e.target.value)} placeholder="permanent" inputMode="numeric" />
        </div>
      </div>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>
        All bans are logged as <span className="mono">exp - zhd</span> and posted to the ban webhook.
      </p>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn danger" disabled={busy} onClick={() => go("ban")}>{busy ? "Working…" : "Ban"}</button>
        <button className="btn ghost" disabled={busy} onClick={() => go("unban")}>Unban</button>
      </div>
      {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
    </div>
  );
}
