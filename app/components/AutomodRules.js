"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const PRESETS = [[1, "Profanity"], [2, "Sexual content"], [3, "Slurs"]];

// Reads and edits the server's LIVE Discord AutoMod rules (via the bot token): keyword lists, regex,
// allow-lists, preset categories, mention limits, and enabled state — writing straight back to Discord.
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
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || "Failed"); setRules(j.rules.map(hydrate)); })
      .catch((e) => setErr(e.message));
  }, [guild]);

  function hydrate(x) {
    return {
      ...x,
      wordsText: (x.words || []).join(", "),
      regexText: (x.regex || []).join("\n"),
      allowText: (x.allow || []).join(", "),
      presetSel: x.presets || [],
      mention: x.mentionLimit ?? "",
    };
  }
  const set = (id, k, v) => setRules((rs) => rs.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  const togglePreset = (id, n) => setRules((rs) => rs.map((r) => (r.id === id ? { ...r, presetSel: r.presetSel.includes(n) ? r.presetSel.filter((x) => x !== n) : [...r.presetSel, n] } : r)));

  const saveAll = async () => {
    setSaving(true); setToast(null);
    try {
      for (const r of rules) {
        const payload = { guild, ruleId: r.id, enabled: r.enabled };
        if (r.words != null) payload.words = r.wordsText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
        if (r.regex != null) payload.regex = r.regexText.split(/\n+/).map((s) => s.trim()).filter(Boolean);
        if (r.allow != null) payload.allow = r.allowText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
        if (r.presets != null) payload.presets = r.presetSel;
        if (r.mentionLimit != null) payload.mentionLimit = Number(r.mention) || 1;
        const res = await fetch("/api/automod", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(`${r.name}: ${j.error || "failed"}`); }
      }
      setToast({ ok: true, msg: "Saved back to Discord." });
    } catch (e) { setToast({ ok: false, msg: e.message }); }
    setSaving(false);
  };

  if (err) return <div className="card"><div className="toast bad">{err}</div></div>;
  if (!guild && guilds.length === 0) return <div className="card"><p className="muted">No server available yet.</p></div>;
  if (rules == null) return <div className="card"><p className="muted">Loading the server&apos;s AutoMod rules…</p></div>;
  if (rules.length === 0) return <div className="card"><p className="muted">This server has no Discord AutoMod rules yet. Create one in <b>Server Settings → AutoMod</b> and it&apos;ll appear here. (The bot needs Manage Server.)</p></div>;

  return (
    <div className="card">
      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Discord AutoMod rules</div>
      <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>The server&apos;s live rules — edit and Save; it writes straight back to Discord.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {rules.map((r) => (
          <div key={r.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            <div className="between" style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>{r.name} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>· {r.type}</span></div>
              <label className="switch sm" title={r.enabled ? "Enabled" : "Disabled"}><input type="checkbox" checked={r.enabled} onChange={(e) => set(r.id, "enabled", e.target.checked)} /><span className="switch-track"><span className="switch-thumb" /></span></label>
            </div>
            {r.words != null && <div style={{ marginBottom: 8 }}><label>Blocked words</label><textarea rows={2} value={r.wordsText} onChange={(e) => set(r.id, "wordsText", e.target.value)} placeholder="word1, word2, phrase three" /></div>}
            {r.regex != null && <div style={{ marginBottom: 8 }}><label>Regex patterns (one per line, max 10)</label><textarea rows={2} className="mono" value={r.regexText} onChange={(e) => set(r.id, "regexText", e.target.value)} placeholder="\\bbadword\\b" /></div>}
            {r.presets != null && (
              <div style={{ marginBottom: 8 }}><label>Preset categories</label>
                <div className="row" style={{ gap: 14, flexWrap: "wrap", marginTop: 4 }}>
                  {PRESETS.map(([n, lbl]) => (
                    <label key={n} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input type="checkbox" style={{ width: "auto" }} checked={r.presetSel.includes(n)} onChange={() => togglePreset(r.id, n)} /> {lbl}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {r.mentionLimit != null && <div style={{ marginBottom: 8, maxWidth: 220 }}><label>Max mentions per message</label><input inputMode="numeric" value={r.mention} onChange={(e) => set(r.id, "mention", e.target.value)} placeholder="5" /></div>}
            {r.allow != null && <div><label>Allowed words (exempt)</label><textarea rows={1} value={r.allowText} onChange={(e) => set(r.id, "allowText", e.target.value)} placeholder="safeword1, safeword2" /></div>}
            {r.words == null && r.presets == null && r.mentionLimit == null && <div className="muted" style={{ fontSize: 12.5 }}>Spam rule — only the on/off switch applies here.</div>}
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: 18 }}><button className="btn" style={{ width: "auto" }} disabled={saving} onClick={saveAll}>{saving ? "Saving…" : "Save all"}</button></div>
      {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
    </div>
  );
}
