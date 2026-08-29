"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useGuildMeta, useGuilds, MetaSelect } from "./metaFields";

// Live embeds manager — build embeds on the web, post them to a channel, and EDIT the live Discord
// message in place later (rules, strike info, etc.). Editing here updates the same message in Discord.
const BLANK = { id: null, name: "", channel: "", content: "", title: "", description: "", color: "#e01f1f", image: "", footer: "" };

export default function EmbedsManager() {
  const sp = useSearchParams();
  const guildParam = sp.get("guild") || "";
  const guilds = useGuilds();
  const guild = guildParam || guilds[0]?.id || "";
  const meta = useGuildMeta(guild, true);

  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(null); // the id being edited, or null for a new one
  const [f, setF] = useState(BLANK);
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    if (!guild) return;
    try {
      const r = await fetch(`/api/embeds?guild=${guild}`);
      const j = await r.json();
      if (r.ok) setItems(Array.isArray(j.items) ? j.items : []);
    } catch { /* ignore */ }
  }, [guild]);
  useEffect(() => { load(); }, [load]);

  const up = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const edit = (it) => { setSel(it.id); setF({ ...BLANK, ...it }); setToast(null); };
  const startNew = () => { setSel(null); setF(BLANK); setToast(null); };
  const current = () => (sel ? items.find((x) => x.id === sel) : null);

  const call = async (action, extra = {}) => {
    if (!guild) return null;
    setBusy(action); setToast(null);
    try {
      const body = { guild, action, ...extra };
      if (action !== "delete") body.item = { ...f, id: sel || f.id || undefined };
      const r = await fetch("/api/embeds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      if (Array.isArray(j.items)) setItems(j.items);
      if (j.error) { setToast({ ok: false, msg: j.error }); return j; } // soft error (e.g. message deleted)
      return j;
    } catch (e) { setToast({ ok: false, msg: e.message }); return null; }
    finally { setBusy(""); }
  };

  const saveDraft = async () => { const j = await call("save"); if (j) { setToast({ ok: true, msg: "Saved." }); if (j.savedId) setSel(j.savedId); } };
  const post = async () => {
    if (!f.channel) { setToast({ ok: false, msg: "Pick a channel first." }); return; }
    const j = await call("post");
    if (j && j.ok) { setToast({ ok: true, msg: "Posted to the channel." }); if (j.savedId) setSel(j.savedId); }
  };
  const update = async () => { const j = await call("update"); if (j && j.ok) setToast({ ok: true, msg: "Updated the live message." }); };
  const remove = async (it) => { if (!confirm(`Delete "${it.name}"? This also removes the posted message from Discord.`)) return; const j = await call("delete", { id: it.id }); if (j && j.ok) { setToast({ ok: true, msg: "Deleted." }); if (sel === it.id) startNew(); } };

  const cur = current();
  const isPosted = !!(cur && cur.messageId);
  const hasEmbed = f.title || f.description || f.image || f.footer;

  return (
    <div className="grid" style={{ gridTemplateColumns: "minmax(200px, 260px) 1fr", gap: 16, alignItems: "start" }}>
      {/* List of saved embeds */}
      <div className="card">
        <div className="between" style={{ marginBottom: 8 }}>
          <b>Embeds ({items.length})</b>
          <button className="btn" style={{ width: "auto", padding: "5px 12px" }} onClick={startNew}>New</button>
        </div>
        {items.length === 0 && <p className="muted" style={{ fontSize: 13, margin: 0 }}>No embeds yet. Build one on the right, then Post it.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((it) => (
            <button key={it.id} type="button" onClick={() => edit(it)}
              className={`navlink ${sel === it.id ? "active" : ""}`} style={{ textAlign: "left", justifyContent: "space-between", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name || "Untitled"}</span>
              <span className="pill" style={{ fontSize: 10, padding: "1px 7px", color: it.messageId ? "var(--success)" : "var(--muted, #888)", borderColor: it.messageId ? "var(--success)" : "var(--line-soft, #333)" }}>{it.messageId ? "live" : "draft"}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor + preview */}
      <div className="grid g2" style={{ gap: 16, alignItems: "start" }}>
        <div className="card">
          <div><label>Name (for your reference)</label><input value={f.name} onChange={(e) => up("name", e.target.value)} placeholder="Strike rules" /></div>
          <div style={{ marginTop: 12 }}><label>Channel</label><MetaSelect meta={meta} type="channel" value={f.channel} onChange={(v) => up("channel", v)} placeholder="123…" mono /></div>
          <div style={{ marginTop: 12 }}><label>Message text (optional, above the embed)</label><textarea rows={2} value={f.content} onChange={(e) => up("content", e.target.value)} placeholder="@everyone" /></div>
          <div style={{ marginTop: 12 }}><label>Embed title</label><input value={f.title} onChange={(e) => up("title", e.target.value)} placeholder="Strike Rules" /></div>
          <div style={{ marginTop: 12 }}><label>Embed description</label><textarea rows={6} value={f.description} onChange={(e) => up("description", e.target.value)} placeholder="1. …&#10;2. …" /></div>
          <div className="grid g2" style={{ marginTop: 12, gap: 12 }}>
            <div><label>Color</label><input value={f.color} onChange={(e) => up("color", e.target.value)} placeholder="#e01f1f" /></div>
            <div><label>Footer</label><input value={f.footer} onChange={(e) => up("footer", e.target.value)} placeholder="Footer text" /></div>
          </div>
          <div style={{ marginTop: 12 }}><label>Image URL</label><input className="mono" value={f.image} onChange={(e) => up("image", e.target.value)} placeholder="https://…" /></div>

          <div className="row" style={{ marginTop: 16, gap: 10, flexWrap: "wrap" }}>
            <button className="btn ghost" style={{ width: "auto" }} disabled={!!busy} onClick={saveDraft}>{busy === "save" ? "Saving…" : "Save draft"}</button>
            {isPosted
              ? <button className="btn" style={{ width: "auto" }} disabled={!!busy} onClick={update}>{busy === "update" ? "Updating…" : "Update live message"}</button>
              : <button className="btn" style={{ width: "auto" }} disabled={!!busy} onClick={post}>{busy === "post" ? "Posting…" : "Post to channel"}</button>}
            {isPosted && <button className="btn ghost" style={{ width: "auto" }} disabled={!!busy} onClick={post} title="Post a fresh copy in the selected channel">Re-post</button>}
            {cur && <button className="btn danger" style={{ width: "auto" }} disabled={!!busy} onClick={() => remove(cur)}>Delete</button>}
          </div>
          {isPosted && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>This embed is live in Discord. Edit the fields and hit <b>Update live message</b> — it changes the same message in place.</p>}
          {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`} style={{ marginTop: 10 }}>{toast.msg}</div>}
        </div>

        <div className="card">
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Preview</div>
          {f.content && <div style={{ marginBottom: 8, whiteSpace: "pre-wrap" }}>{f.content}</div>}
          {hasEmbed ? (
            <div style={{ borderLeft: `4px solid ${/^#[0-9a-fA-F]{6}$/.test(f.color) ? f.color : "#e01f1f"}`, background: "var(--surface-2)", borderRadius: 6, padding: "12px 14px" }}>
              {f.title && <div style={{ fontWeight: 800, marginBottom: 6 }}>{f.title}</div>}
              {f.description && <div style={{ fontSize: 14, whiteSpace: "pre-wrap", color: "var(--text)" }}>{f.description}</div>}
              {f.image && /^https?:\/\//.test(f.image) && <img src={f.image} alt="" style={{ maxWidth: "100%", borderRadius: 6, marginTop: 10 }} />}
              {f.footer && <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>{f.footer}</div>}
            </div>
          ) : <div className="muted" style={{ fontSize: 13 }}>Add a title or description to preview the embed.</div>}
        </div>
      </div>
    </div>
  );
}
