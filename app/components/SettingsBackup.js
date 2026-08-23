"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useGuilds } from "./metaFields";

// Export a server's whole feature config to a JSON file, or import one to clone it onto another
// server. Uses the existing /api/guild-settings GET/POST — so import is gated per-feature server-side
// (you only write features you can manage; the rest are skipped).
export default function SettingsBackup() {
  const sp = useSearchParams();
  const guilds = useGuilds();
  const guild = sp.get("guild") || guilds[0]?.id || "";
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const exportSettings = async () => {
    if (!guild) return;
    setBusy(true); setToast(null);
    try {
      const r = await fetch(`/api/guild-settings?guild=${guild}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      const blob = new Blob([JSON.stringify(j.settings || {}, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `zhd-settings-${guild}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      setToast({ ok: true, msg: "Downloaded this server's settings." });
    } catch (e) { setToast({ ok: false, msg: e.message }); }
    setBusy(false);
  };

  const importSettings = async (file) => {
    if (!guild || !file) return;
    setBusy(true); setToast(null);
    try {
      const data = JSON.parse(await file.text());
      const features = data && typeof data === "object" ? data : {};
      let ok = 0, fail = 0;
      for (const [feature, v] of Object.entries(features)) {
        if (!v || typeof v !== "object") continue;
        try {
          const r = await fetch("/api/guild-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guild, feature, enabled: !!v.enabled, config: v.config || {} }) });
          if (r.ok) ok++; else fail++;
        } catch { fail++; }
      }
      setToast({ ok: fail === 0, msg: `Imported ${ok} feature${ok === 1 ? "" : "s"}${fail ? `, ${fail} skipped (no permission or invalid)` : ""}.` });
    } catch {
      setToast({ ok: false, msg: "Couldn't read that file — is it a valid settings export?" });
    }
    setBusy(false);
  };

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Settings backup</div>
      <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>Export this server&apos;s whole feature config as a file, or import one to clone it onto another server. Only features you can manage are imported.</div>
      <div className="backup-actions">
        <button className="backup-btn primary" disabled={busy || !guild} onClick={exportSettings}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
          Export settings
        </button>
        <label className={`backup-btn ${busy || !guild ? "is-disabled" : ""}`}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 21h14" /></svg>
          Import settings
          <input type="file" accept="application/json,.json" style={{ display: "none" }} disabled={busy || !guild} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; importSettings(f); }} />
        </label>
      </div>
      {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
    </div>
  );
}
