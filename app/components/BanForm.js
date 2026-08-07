"use client";
import { useState } from "react";

export default function BanForm() {
  const [user, setU] = useState("");
  const [reason, setR] = useState("");
  const [duration, setD] = useState(""); // blank = permanent; else seconds
  const [busy, setB] = useState(false);
  const [toast, setT] = useState(null);

  async function go(action) {
    if (!user.trim()) { setT({ bad: true, msg: "Enter a Roblox username or ID." }); return; }
    if (action === "ban" && !reason.trim()) { setT({ bad: true, msg: "A reason is required to ban." }); return; }
    setB(true); setT(null);
    try {
      const r = await fetch("/api/bans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, reason, duration: duration.trim() || undefined, action }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Request failed");
      setT({
        ok: true,
        msg: `${action === "ban" ? "Banned" : "Unbanned"} ${d.user?.username || user}` +
          (action === "ban" && d.caseId ? ` — case ${d.caseId}` : "") + ".",
      });
      if (action === "ban") { setR(""); setD(""); }
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
      <div style={{ marginTop: 14 }}>
        <label>Reason (required to ban)</label>
        <textarea value={reason} onChange={(e) => setR(e.target.value)} placeholder="exp - zhd" />
      </div>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn danger" disabled={busy} onClick={() => go("ban")}>{busy ? "Working…" : "Ban"}</button>
        <button className="btn ghost" disabled={busy} onClick={() => go("unban")}>Unban</button>
      </div>
      {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
    </div>
  );
}
