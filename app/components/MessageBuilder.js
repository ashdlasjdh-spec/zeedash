"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useGuildMeta, useGuilds, MetaSelect } from "./metaFields";

// Poll the publish queue for the outcome of the job we just enqueued, so a silent failure (bad
// channel, missing bot permission, bot offline) surfaces instead of a permanent "Queued". Resolves
// with a toast-shaped { ok, msg } once the bot marks the job done/failed, or after a timeout.
async function pollPublish(guild, kind, tries = 12, delayMs = 1500) {
  for (let i = 0; i < tries; i++) {
    await new Promise((res) => setTimeout(res, delayMs));
    try {
      const r = await fetch(`/api/publish/status?guild=${guild}&kind=${kind}`);
      const j = await r.json();
      if (j.status === "done") return { ok: true, msg: j.result ? `Sent — ${j.result}.` : "Sent." };
      if (j.status === "failed") return { ok: false, msg: `Didn't send: ${j.result || "unknown error"}` };
      // pending / working → the bot hasn't finished yet; keep waiting.
    } catch { /* transient — keep waiting */ }
  }
  return { ok: false, msg: "Still queued — the bot hasn't picked it up. It may be offline or restarting; it'll post when it's back." };
}

// Compose an embed/message on the web, save it, then post it with /sendembed in the server.
// (The bot has no inbound endpoint, so publishing goes through a Discord admin command.)
export default function MessageBuilder() {
  const sp = useSearchParams();
  const guildParam = sp.get("guild") || "";
  const guilds = useGuilds();
  const [f, setF] = useState({ channel: "", content: "", title: "", description: "", color: "#7c5cff", image: "", footer: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const guild = guildParam || guilds[0]?.id || "";
  const meta = useGuildMeta(guild, true);

  useEffect(() => {
    if (!guild) return;
    fetch(`/api/guild-settings?guild=${guild}`).then((r) => r.json()).then((j) => {
      const c = j.settings?.messagebuilder?.config;
      if (c && typeof c === "object") setF((s) => ({ ...s, ...c }));
    }).catch(() => {});
  }, [guild]);

  const [publishing, setPublishing] = useState(false);
  const up = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const save = async () => {
    if (!guild) return;
    setSaving(true); setToast(null);
    try {
      const r = await fetch("/api/guild-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guild, feature: "messagebuilder", enabled: true, config: f }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setToast({ ok: true, msg: "Saved — Publish it here or run /sendembed in your server." });
    } catch (e) { setToast({ ok: false, msg: e.message }); }
    setSaving(false);
  };
  const publish = async () => {
    if (!guild) return;
    if (!f.channel) { setToast({ ok: false, msg: "Pick a channel first." }); return; }
    if (!f.content && !f.title && !f.description && !f.image && !f.footer) { setToast({ ok: false, msg: "Add some text or an embed first." }); return; }
    setPublishing(true); setToast(null);
    try {
      // Save the draft too, then queue the post — the bot picks it up in a few seconds.
      await fetch("/api/guild-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guild, feature: "messagebuilder", enabled: true, config: f }) });
      const r = await fetch("/api/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guild, kind: "message", payload: f }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setToast({ ok: true, msg: "Queued — waiting for the bot to post it…" });
      // Wait for the real outcome so a silent failure (bad channel / missing perms / bot offline) shows.
      setToast(await pollPublish(guild, "message"));
    } catch (e) { setToast({ ok: false, msg: e.message }); }
    setPublishing(false);
  };

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
        <div className="row" style={{ marginTop: 16, gap: 10 }}>
          <button className="btn ghost" style={{ width: "auto" }} disabled={saving || publishing} onClick={save}>{saving ? "Saving…" : "Save draft"}</button>
          <button className="btn" style={{ width: "auto" }} disabled={saving || publishing} onClick={publish}>{publishing ? "Publishing…" : "Publish now"}</button>
        </div>
        {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
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
