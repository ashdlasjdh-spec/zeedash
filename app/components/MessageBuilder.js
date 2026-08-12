"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useGuildMeta, MetaSelect } from "./metaFields";
import AutoSaveStatus from "./AutoSaveStatus";

// Compose an embed/message on the web, save it, then post it with /sendembed in the server.
// (The bot has no inbound endpoint, so publishing goes through a Discord admin command.)
export default function MessageBuilder() {
  const sp = useSearchParams();
  const guildParam = sp.get("guild") || "";
  const [guilds, setGuilds] = useState([]);
  const DEFAULTS = { channel: "", content: "", title: "", description: "", color: "#7c5cff", image: "", footer: "" };
  const [f, setF] = useState(DEFAULTS);
  const [status, setStatus] = useState("idle");
  const [saveErr, setSaveErr] = useState(null);
  const savedSig = useRef(null);

  useEffect(() => { fetch("/api/server-stats/guilds").then((r) => r.json()).then((j) => setGuilds(j.guilds || [])).catch(() => {}); }, []);
  const guild = guildParam || guilds[0]?.id || "";
  const meta = useGuildMeta(guild, true);

  useEffect(() => {
    if (!guild) return;
    fetch(`/api/guild-settings?guild=${guild}`).then((r) => r.json()).then((j) => {
      const c = j.settings?.messagebuilder?.config;
      const merged = { ...DEFAULTS, ...(c && typeof c === "object" ? c : {}) };
      setF(merged); savedSig.current = JSON.stringify(merged);
    }).catch(() => {});
  }, [guild]);

  const up = (k, v) => setF((s) => ({ ...s, [k]: v }));

  // Debounced auto-save of the draft (does NOT post — /sendembed does that).
  useEffect(() => {
    if (!guild) return;
    const sig = JSON.stringify(f);
    if (sig === savedSig.current) return;
    const t = setTimeout(async () => {
      setStatus("saving"); setSaveErr(null);
      try {
        const r = await fetch("/api/guild-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guild, feature: "messagebuilder", enabled: true, config: f }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Failed");
        savedSig.current = sig; setStatus("saved");
        setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1800);
      } catch (e) { setStatus("error"); setSaveErr(e.message); }
    }, 600);
    return () => clearTimeout(t);
  }, [f, guild]);

  const hasEmbed = f.title || f.description || f.image || f.footer;

  return (
    <div className="grid g2" style={{ gap: 16, alignItems: "start" }}>
      <div className="card">
        <div><label>Channel</label><MetaSelect meta={meta} type="channel" value={f.channel} onChange={(v) => up("channel", v)} placeholder="123…" mono /></div>
        <div style={{ marginTop: 12 }}><label>Message text (optional, sent above the embed)</label><textarea rows={2} value={f.content} onChange={(e) => up("content", e.target.value)} placeholder="Hey @everyone!" /></div>
        <div style={{ marginTop: 12 }}><label>Embed title</label><input value={f.title} onChange={(e) => up("title", e.target.value)} placeholder="Announcement" /></div>
        <div style={{ marginTop: 12 }}><label>Embed description</label><textarea rows={4} value={f.description} onChange={(e) => up("description", e.target.value)} placeholder="Write the body…" /></div>
        <div className="grid g2" style={{ marginTop: 12, gap: 12 }}>
          <div><label>Color</label><input value={f.color} onChange={(e) => up("color", e.target.value)} placeholder="#7c5cff" /></div>
          <div><label>Footer</label><input value={f.footer} onChange={(e) => up("footer", e.target.value)} placeholder="Footer text" /></div>
        </div>
        <div style={{ marginTop: 12 }}><label>Image URL</label><input className="mono" value={f.image} onChange={(e) => up("image", e.target.value)} placeholder="https://…" /></div>
        <div className="row" style={{ marginTop: 16, gap: 12, alignItems: "center" }}>
          <AutoSaveStatus status={status} error={saveErr} />
          <span className="muted" style={{ fontSize: 12 }}>· run <b>/sendembed</b> in your server to post it</span>
        </div>
      </div>

      <div className="card">
        <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Preview</div>
        {f.content && <div style={{ marginBottom: 8, whiteSpace: "pre-wrap" }}>{f.content}</div>}
        {hasEmbed ? (
          <div style={{ borderLeft: `4px solid ${/^#[0-9a-fA-F]{6}$/.test(f.color) ? f.color : "#7c5cff"}`, background: "var(--surface-2)", borderRadius: 6, padding: "12px 14px" }}>
            {f.title && <div style={{ fontWeight: 800, marginBottom: 6 }}>{f.title}</div>}
            {f.description && <div style={{ fontSize: 14, whiteSpace: "pre-wrap", color: "var(--text)" }}>{f.description}</div>}
            {f.image && /^https?:\/\//.test(f.image) && <img src={f.image} alt="" style={{ maxWidth: "100%", borderRadius: 6, marginTop: 10 }} />}
            {f.footer && <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>{f.footer}</div>}
          </div>
        ) : <div className="muted" style={{ fontSize: 13 }}>Add a title or description to preview the embed.</div>}
      </div>
    </div>
  );
}
