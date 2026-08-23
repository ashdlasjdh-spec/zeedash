"use client";
import { useEffect, useState } from "react";

// Global integration keys/endpoints for the bot's external features (AI, Last.fm, Fortnite, music,
// Spotify, media tools, social feeds). Co-founder+ only. Values are stored in the shared DB and the
// bot reads them within ~a minute — no redeploy. Secrets are write-only: they show a masked hint but
// the real value never comes back to the browser.
export default function IntegrationsPanel() {
  const [fields, setFields] = useState(null);
  const [edits, setEdits] = useState({});
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  async function load() {
    const r = await fetch("/api/integrations");
    const d = await r.json();
    if (r.ok) { setFields(d.fields); setEdits({}); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setBusy(true); setToast(null);
    const updates = {};
    for (const [env, v] of Object.entries(edits)) if (v !== undefined) updates[env] = v;
    const r = await fetch("/api/integrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updates }) });
    const d = await r.json();
    if (!r.ok) setToast({ bad: true, msg: d.error || "Save failed" });
    else { setToast({ ok: true, msg: `Saved ${d.saved} field(s). The bot picks these up within a minute.` }); await load(); }
    setBusy(false);
  }

  if (!fields) return <div className="card">Loading integrations…</div>;

  const groups = [];
  for (const f of fields) {
    let g = groups.find((x) => x.label === f.group);
    if (!g) { g = { label: f.group, items: [] }; groups.push(g); }
    g.items.push(f);
  }
  const dot = (src) => (src === "dashboard" ? "var(--ok)" : src === "env" ? "var(--muted)" : "var(--danger)");
  const status = (f) => (f.source === "dashboard" ? `set · dashboard${f.secret ? ` · ${f.masked}` : ""}` : f.source === "env" ? "set · from env" : "not set");

  return (
    <div className="card">
      <div style={{ fontWeight: 700, fontSize: 15 }}>Integrations &amp; API keys</div>
      <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
        Keys for the bot&apos;s external features. A value set here overrides the bot&apos;s own environment and
        takes effect within a minute. Leave a field blank to keep the current value. Secrets are write-only —
        paste a new value to replace one.
      </p>
      {groups.map((g) => (
        <div key={g.label} style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>{g.label}</div>
          <div className="grid" style={{ gap: 12, marginTop: 8 }}>
            {g.items.map((f) => (
              <div key={f.env}>
                <label>
                  {f.label}{" "}
                  <span style={{ color: dot(f.source), fontSize: 12 }}>({status(f)})</span>
                </label>
                <input
                  className="mono"
                  type={f.secret ? "password" : "text"}
                  value={edits[f.env] ?? (f.secret ? "" : f.value || "")}
                  placeholder={f.secret ? "paste a new value to replace it" : f.placeholder}
                  onChange={(e) => setEdits((s) => ({ ...s, [f.env]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="row" style={{ marginTop: 18 }}>
        <button className="btn" style={{ width: "auto" }} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save integrations"}</button>
      </div>
      {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
    </div>
  );
}
