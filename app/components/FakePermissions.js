"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useGuilds, useGuildMeta, MetaSelect, OptionMultiSelect } from "./metaFields";
import Dropdown from "./Dropdown";
import { cachedGuildSettings, loadGuildSettings, updateFeatureCache } from "@/lib/guildSettingsClient";
import { MANUAL_PERMS, MANUAL_PERM_LABELS, FEATURE_PERM } from "@/lib/permissions";
import { FEATURE_LABEL, GRANTABLE_FEATURE_SLUGS, PRESETS, presetSummary } from "@/lib/fakePerms";

const PERM_OPTIONS = [...MANUAL_PERMS].map((p) => ({ value: p, label: MANUAL_PERM_LABELS[p] || p }));
const FEATURE_OPTIONS = GRANTABLE_FEATURE_SLUGS.map((s) => ({ value: s, label: FEATURE_LABEL[s] || s }));

// Resolve one item to what the role can actually do (mirrors the server's canManageFeature).
function resolveItem(item) {
  const perms = new Set(String(item.perms || "").split(/[\s,]+/).filter(Boolean));
  const isAdmin = perms.has("administrator");
  const managed = new Set();
  for (const slug of GRANTABLE_FEATURE_SLUGS) {
    const need = FEATURE_PERM[slug] || "administrator";
    if (isAdmin || perms.has(need)) managed.add(slug);
  }
  const viewOnly = new Set();
  for (const f of item.features || []) {
    if (f.access === "view" && !managed.has(f.slug)) viewOnly.add(f.slug);
    else managed.add(f.slug);
  }
  return { perms: [...perms], managed: [...managed], viewOnly: [...viewOnly] };
}

// Small inline multi-select of text channels (empty = all channels).
function ChannelMulti({ meta, value, onChange }) {
  const ids = Array.isArray(value) ? value : [];
  if (meta === null) return <input className="mono" value={ids.join(",")} onChange={(e) => onChange(e.target.value.split(/[\s,]+/).filter(Boolean))} placeholder="channel ids (blank = all)" />;
  const chans = meta?.text || [];
  const nameOf = (id) => chans.find((c) => c.id === id)?.name || id;
  const add = (id) => { if (id && !ids.includes(id)) onChange([...ids, id]); };
  const remove = (id) => onChange(ids.filter((x) => x !== id));
  const available = chans.filter((c) => !ids.includes(c.id));
  return (
    <div className="chips-field" style={{ minWidth: 0 }}>
      {ids.length > 0 && <div className="chips">{ids.map((id) => <span key={id} className="chip"># {nameOf(id)}<button type="button" onClick={() => remove(id)} aria-label="Remove">×</button></span>)}</div>}
      <Dropdown value="" onChange={(e) => add(e.target.value)} options={available.map((c) => ({ value: c.id, label: `# ${c.name}` }))} placeholder={meta === undefined ? "Loading…" : "+ Limit to channel… (blank = all)"} />
    </div>
  );
}

export default function FakePermissions() {
  const sp = useSearchParams();
  const guildParam = sp.get("guild") || "";
  const guilds = useGuilds();
  const guild = guildParam || guilds[0]?.id || "";
  const meta = useGuildMeta(guild, true);

  const [enabled, setEnabled] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [audit, setAudit] = useState([]);
  const [preview, setPreview] = useState("");
  const [copyRole, setCopyRole] = useState("");
  const [copyTo, setCopyTo] = useState("");

  const roles = meta?.roles || [];
  const roleName = (id) => roles.find((r) => String(r.id) === String(id))?.name || id;

  const apply = useCallback((settings) => {
    const s = settings?.["fake-permissions"] || {};
    setEnabled(!!s.enabled);
    // Normalise stored items to the rich shape (legacy comma-string features -> manage grants).
    const its = (Array.isArray(s.config?.items) ? s.config.items : []).map((it) => ({
      role: String(it.role || ""),
      perms: String(it.perms || ""),
      features: (Array.isArray(it.features) ? it.features : String(it.features || "").split(/[\s,]+/).filter(Boolean).map((x) => ({ slug: x, access: "manage" })))
        .map((f) => ({ slug: String(f.slug ?? f), access: f?.access === "view" ? "view" : "manage", channels: Array.isArray(f?.channels) ? f.channels.map(String) : [] }))
        .filter((f) => GRANTABLE_FEATURE_SLUGS.includes(f.slug)),
    }));
    setItems(its);
  }, []);

  useEffect(() => {
    if (!guild) return;
    let alive = true;
    const cached = cachedGuildSettings(guild);
    if (cached) { apply(cached); setLoading(false); } else setLoading(true);
    loadGuildSettings(guild).then((s) => { if (alive) apply(s); }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    fetch(`/api/fake-perms?guild=${guild}`).then((r) => r.json()).then((j) => { if (alive) setAudit(Array.isArray(j.log) ? j.log : []); }).catch(() => {});
    return () => { alive = false; };
  }, [guild, apply]);

  // ---- row mutations ----
  const addRow = (preset) => setItems((x) => [...x, {
    role: "",
    perms: (preset?.perms || []).join(","),
    features: (preset?.features || []).map((slug) => ({ slug, access: "manage", channels: [] })),
  }]);
  const removeRow = (i) => setItems((x) => x.filter((_, idx) => idx !== i));
  const setRow = (i, patch) => setItems((x) => x.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addFeature = (i, slug) => setRow(i, { features: [...(items[i].features || []).filter((f) => f.slug !== slug), { slug, access: "manage", channels: [] }] });
  const setFeature = (i, slug, patch) => setRow(i, { features: items[i].features.map((f) => (f.slug === slug ? { ...f, ...patch } : f)) });
  const removeFeature = (i, slug) => setRow(i, { features: items[i].features.filter((f) => f.slug !== slug) });

  const buildItems = (list) => list
    .filter((it) => String(it.role || "").match(/^\d{5,}$/))
    .map((it) => ({ role: it.role, perms: it.perms, features: it.features.map((f) => ({ slug: f.slug, access: f.access, channels: f.channels || [] })) }))
    .filter((it) => it.perms || it.features.length);

  const persist = async (en, its, targetGuild = guild) => {
    const r = await fetch("/api/guild-settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guild: targetGuild, feature: "fake-permissions", enabled: en, config: { items: buildItems(its) } }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Failed");
    return j;
  };

  const save = async () => {
    setSaving(true); setToast(null);
    try {
      await persist(enabled, items);
      updateFeatureCache(guild, "fake-permissions", enabled, { items: buildItems(items) });
      setToast({ ok: true, msg: "Saved." });
      fetch(`/api/fake-perms?guild=${guild}`).then((r) => r.json()).then((j) => setAudit(Array.isArray(j.log) ? j.log : [])).catch(() => {});
    } catch (e) { setToast({ ok: false, msg: e.message }); }
    setSaving(false);
  };
  const toggle = async (checked) => {
    setEnabled(checked); setSaving(true); setToast(null);
    try { await persist(checked, items); updateFeatureCache(guild, "fake-permissions", checked, { items: buildItems(items) }); }
    catch (e) { setToast({ ok: false, msg: e.message }); }
    setSaving(false);
  };

  // ---- bulk copy a role's config to another server ----
  const doCopy = async () => {
    const src = items.find((it) => it.role === copyRole);
    if (!src || !copyTo) { setToast({ ok: false, msg: "Pick a role and a target server." }); return; }
    setSaving(true); setToast(null);
    try {
      const s = await loadGuildSettings(copyTo, { force: true });
      const existing = (s?.["fake-permissions"]?.config?.items || []).filter((it) => String(it.role) !== copyRole);
      const merged = [...existing, { role: src.role, perms: src.perms, features: src.features }];
      await persist(s?.["fake-permissions"]?.enabled ?? true, merged.map((it) => ({ role: it.role, perms: it.perms || "", features: it.features || [] })), copyTo);
      const gName = guilds.find((g) => g.id === copyTo)?.name || copyTo;
      setToast({ ok: true, msg: `Copied @${roleName(copyRole)} to ${gName}.` });
    } catch (e) { setToast({ ok: false, msg: e.message }); }
    setSaving(false);
  };

  if (!loading && !guild) return <div className="card"><p className="muted">No server available yet.</p></div>;
  if (loading) return <div className="card" style={{ maxWidth: 940 }}><div className="stack" style={{ gap: 12 }}><div className="skeleton-row" style={{ height: 30, width: "40%" }} /><div className="skeleton-row" style={{ height: 60 }} /><div className="skeleton-row" style={{ height: 60 }} /></div></div>;

  const otherGuilds = guilds.filter((g) => g.id !== guild);
  const previewItem = items.find((it) => it.role === preview);
  const resolved = previewItem ? resolveItem(previewItem) : null;

  return (
    <div className="stack" style={{ gap: 16, maxWidth: 940 }}>
      {/* Enable + presets */}
      <div className="card">
        <div className="between" style={{ gap: 14, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Fake permissions</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>Map a role to a Discord-permission bucket the bot honours, and/or hand it exact dashboard features (Manage or View-only, optionally limited to channels). Server owner, super owners and antinuke admins can edit.</div>
          </div>
          <label className="switch"><input type="checkbox" checked={enabled} onChange={(e) => toggle(e.target.checked)} /><span className="switch-track"><span className="switch-thumb" /></span></label>
        </div>
        <div style={{ marginTop: 14 }}>
          <label>Quick presets</label>
          <div className="ra-caps" style={{ marginTop: 8 }}>
            {PRESETS.map((p) => (
              <button key={p.key} type="button" className="btn ghost" style={{ width: "auto", flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "8px 12px" }} onClick={() => addRow(p)} title={presetSummary(p)}>
                <span style={{ fontWeight: 700 }}>{p.label}</span>
                <span className="muted" style={{ fontSize: 11 }}>{presetSummary(p)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Role rows */}
      <div className="card" style={{ opacity: enabled ? 1 : 0.55, pointerEvents: enabled ? "auto" : "none" }}>
        <div className="between" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 750 }}>Roles ({items.length})</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost" style={{ width: "auto" }} onClick={() => addRow()}>+ Add role</button>
            <button className="btn" style={{ width: "auto" }} disabled={saving} onClick={save}>{saving ? "Saving…" : "Save changes"}</button>
          </div>
        </div>
        {items.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No roles yet — add one, or use a preset above.</p>}
        <div className="stack" style={{ gap: 14 }}>
          {items.map((it, i) => (
            <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 14, background: "var(--surface-2)" }}>
              <div className="row" style={{ alignItems: "flex-end" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label>Role</label>
                  <MetaSelect meta={meta} type="role" value={it.role} onChange={(v) => setRow(i, { role: v })} placeholder="Select a role…" />
                </div>
                <button className="btn ghost" style={{ width: "auto", color: "var(--danger)" }} onClick={() => removeRow(i)}>Remove</button>
              </div>
              <div style={{ marginTop: 12 }}>
                <label>Fake permissions (Discord-permission buckets)</label>
                <OptionMultiSelect options={PERM_OPTIONS} value={it.perms} onChange={(v) => setRow(i, { perms: v })} placeholder="+ Add permission…" />
              </div>
              <div style={{ marginTop: 12 }}>
                <label>Specific features</label>
                <div className="stack" style={{ gap: 8, marginTop: 6 }}>
                  {(it.features || []).map((f) => (
                    <div key={f.slug} className="row" style={{ alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span className="chip" style={{ minWidth: 120 }}>{FEATURE_LABEL[f.slug] || f.slug}</span>
                      <Dropdown value={f.access} onChange={(e) => setFeature(i, f.slug, { access: e.target.value })} options={[{ value: "manage", label: "Manage" }, { value: "view", label: "View only" }]} style={{ width: 140 }} />
                      <div style={{ flex: 1, minWidth: 180 }}><ChannelMulti meta={meta} value={f.channels} onChange={(v) => setFeature(i, f.slug, { channels: v })} /></div>
                      <button className="btn ghost" style={{ width: 34, padding: "6px 0", color: "var(--danger)" }} onClick={() => removeFeature(i, f.slug)} title="Remove feature">✕</button>
                    </div>
                  ))}
                  <Dropdown value="" onChange={(e) => e.target.value && addFeature(i, e.target.value)}
                    options={[{ value: "", label: "+ Add feature…" }, ...FEATURE_OPTIONS.filter((o) => !(it.features || []).some((f) => f.slug === o.value))]} />
                </div>
              </div>
            </div>
          ))}
        </div>
        {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`} style={{ marginTop: 14 }}>{toast.msg}</div>}
      </div>

      {/* What can this role do? */}
      <div className="card">
        <div style={{ fontWeight: 750, marginBottom: 8 }}>What can this role do?</div>
        <Dropdown value={preview} onChange={(e) => setPreview(e.target.value)}
          options={[{ value: "", label: "Pick a mapped role…" }, ...items.filter((it) => it.role).map((it) => ({ value: it.role, label: roleName(it.role) }))]} />
        {resolved && (
          <div style={{ marginTop: 12 }}>
            <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>Permissions</div>
            <div className="ra-caps">{resolved.perms.length ? resolved.perms.map((p) => <span key={p} className="chip">{MANUAL_PERM_LABELS[p] || p}</span>) : <span className="muted">None</span>}</div>
            <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em", margin: "12px 0 4px" }}>Can manage ({resolved.managed.length})</div>
            <div className="ra-caps">{resolved.managed.length ? resolved.managed.map((s) => <span key={s} className="chip">{FEATURE_LABEL[s] || s}</span>) : <span className="muted">None</span>}</div>
            {resolved.viewOnly.length > 0 && <>
              <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em", margin: "12px 0 4px" }}>View only</div>
              <div className="ra-caps">{resolved.viewOnly.map((s) => <span key={s} className="chip">{FEATURE_LABEL[s] || s}</span>)}</div>
            </>}
          </div>
        )}
      </div>

      {/* Copy to another server */}
      {otherGuilds.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 750, marginBottom: 8 }}>Copy a role to another server</div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Copies this role&apos;s exact perms + feature grants into another server (overwrites that role there). You need access to the target server.</div>
          <div className="row" style={{ alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 180 }}><label>Role</label>
              <Dropdown value={copyRole} onChange={(e) => setCopyRole(e.target.value)} options={[{ value: "", label: "Pick a role…" }, ...items.filter((it) => it.role).map((it) => ({ value: it.role, label: roleName(it.role) }))]} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}><label>To server</label>
              <Dropdown value={copyTo} onChange={(e) => setCopyTo(e.target.value)} options={[{ value: "", label: "Pick a server…" }, ...otherGuilds.map((g) => ({ value: g.id, label: g.name }))]} />
            </div>
            <button className="btn" style={{ width: "auto" }} disabled={saving || !copyRole || !copyTo} onClick={doCopy}>Copy</button>
          </div>
        </div>
      )}

      {/* Audit trail */}
      <div className="card">
        <div style={{ fontWeight: 750, marginBottom: 8 }}>Recent changes</div>
        {audit.length === 0 ? <p className="muted" style={{ fontSize: 13, margin: 0 }}>No changes recorded yet.</p> : (
          <div className="stack" style={{ gap: 8 }}>
            {audit.map((a, i) => (
              <div key={i} className="audit-row" style={{ display: "block" }}>
                <span dangerouslySetInnerHTML={{ __html: renderDetail(a.detail, roleName) }} />
                <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>— {a.actor_name || "someone"} · {a.created_at ? new Date(a.created_at).toLocaleString() : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Replace <@&roleId> mentions in an audit line with @rolename (escaped).
function renderDetail(detail, roleName) {
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  return esc(detail || "").replace(/&lt;@&amp;(\d+)&gt;/g, (_, id) => `<b>@${esc(roleName(id))}</b>`);
}
