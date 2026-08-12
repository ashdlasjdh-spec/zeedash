"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useGuilds } from "./metaFields";

// One-click "Publish" for the current guild. Enqueues a job the bot picks up within a few seconds
// (post a button-role panel, ticket panels, or seed reaction-role emojis) — no /command needed.
export default function PublishPanel({ kind, title, label = "Publish now", hint }) {
  const sp = useSearchParams();
  const guilds = useGuilds();
  const guild = (sp.get("guild") || guilds[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const publish = async () => {
    if (!guild) return;
    setBusy(true); setToast(null);
    try {
      const r = await fetch("/api/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guild, kind }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setToast({ ok: true, msg: "Queued — the bot will post it in a few seconds." });
    } catch (e) { setToast({ ok: false, msg: e.message }); }
    setBusy(false);
  };

  return (
    <div className="card" style={{ maxWidth: 720, marginTop: 16 }}>
      {title && <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{title}</div>}
      {hint && <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{hint}</div>}
      <button className="btn" style={{ width: "auto" }} disabled={busy || !guild} onClick={publish}>{busy ? "Publishing…" : label}</button>
      {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
    </div>
  );
}
