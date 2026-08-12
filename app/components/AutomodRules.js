"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

// Reads the server's LIVE Discord AutoMod rules (via the bot token) and lets you edit each
// keyword rule's blocked words all at once, writing straight back to Discord.
export default function AutomodRules() {
  const sp = useSearchParams();
  const guildParam = sp.get("guild") || "";
  const [guilds, setGuilds] = useState([]);
  const [rules, setRules] = useState(null);
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetch("/api/server-stats/guilds").then((r) => r.json()).then((j) => setGuilds(j.guilds || [])).catch(() => {}); }, []);
  const guild = guildParam || guilds[0]?.id || "";

  useEffect(() => {
    if (!guild) return;
    setRules(null); setErr(null);
    fetch(`/api/automod?guild=${guild}`)
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || "Failed"); setRules(j.rules.map((x) => ({ ...x, text: (x.keywords || []).join(", ") }))); })
      .catch((e) => setErr(e.message));
  }, [guild]);

  const setText = (id, v) => setRules((rs) => rs.map((r) => (r.id === id ? { ...r, text: v } : r)));
  const saveAll = async () => {
    setSaving(true); setToast(null);
    try {
      for (const r of rules.filter((x) => x.editable)) {
        const kws = r.text.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
        const res = await fetch("/api/automod", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guild, ruleId: r.id, keywords: kws }) });
        if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || "Failed"); }
      }
      setToast({ ok: true, msg: "Saved back to Discord." });
    } catch (e) { setToast({ ok: false, msg: e.message }); }
    setSaving(false);
  };

  if (err) return <div className="card"><div className="toast bad">{err}</div></div>;
  if (!guild && guilds.length === 0) return <div className="card"><p className="muted">No server available yet.</p></div>;
  if (rules == null) return <div className="card"><p className="muted">Loading the server&apos;s AutoMod rules…</p></div>;
  if (rules.length === 0) return <div className="card"><p className="muted">This server has no Discord AutoMod rules yet. Create one in <b>Server Settings → AutoMod</b> and it&apos;ll appear here to edit. (The bot needs Manage Server.)</p></div>;

  const editable = rules.filter((r) => r.editable);
  return (
    <div className="card" style={{ maxWidth: 820 }}>
      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Discord AutoMod rules</div>
      <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>The server&apos;s live rules — edit the blocked words and Save; it writes straight back to Discord.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        {rules.map((r) => (
          <div key={r.id}>
            <label style={{ margin: 0 }}>{r.name} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>· {r.type}{r.enabled ? "" : " · disabled"}</span></label>
            {r.editable
              ? <textarea rows={2} value={r.text} onChange={(e) => setText(r.id, e.target.value)} placeholder="word1, word2, phrase three" style={{ marginTop: 6 }} />
              : <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>Preset/spam rule — managed in Server Settings → AutoMod.</div>}
          </div>
        ))}
      </div>
      {editable.length > 0 && <div className="row" style={{ marginTop: 16 }}><button className="btn" style={{ width: "auto" }} disabled={saving} onClick={saveAll}>{saving ? "Saving…" : "Save all"}</button></div>}
      {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
    </div>
  );
}
