"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

// Full self-bot control panel. Uses zeedash's own theme tokens/classes so it
// matches light/dark automatically. Talks to /api/selfbot (same origin), which
// bridges to the in-process bot via the shared DB.

const TABS = [
  ["overview", "Overview"],
  ["activity", "Activity"],
  ["lookup", "Lookup"],
  ["staff", "Roster"],
  ["roles", "Staff roles"],
  ["ranks", "Ranks"],
  ["settings", "Settings"],
  ["creds", "Credentials"],
];

const FIELD_GROUPS = [
  ["Safety guard", [
    ["dryRun", "bool", "Dry run (log only — remove nobody)"],
    ["staffMinRank", "int", "Staff min rank (≥ removable)"],
    ["staffMaxRank", "int", "Staff max rank (0 = no cap)"],
    ["staffRankIds", "ids", "Exact removable rank IDs (overrides min/max)"],
  ]],
  ["Triggers", [
    ["kickOnStaffRoleRemoved", "bool", "Kick when a staff role is removed"],
    ["requireStaffRoleForFire", "bool", "Require staff role for Fired/Resigns"],
    ["staffRoleIds", "ids", "Staff Discord role IDs"],
  ]],
  ["IDs & channels", [
    ["managedGroupId", "id", "Managed Roblox group ID"],
    ["crraamsGroupId", "id", "Audit-source group ID"],
    ["guildId", "id", "Discord guild ID"],
    ["staffInfoChannelId", "id", "Staff-info channel ID"],
    ["logChannelId", "id", "Log channel ID (optional)"],
    ["authorizedUserIds", "ids", "Authorized command user IDs"],
  ]],
  ["Performance", [
    ["auditPollSeconds", "int", "Audit poll seconds"],
    ["staffInfoHistoryLimit", "int", "Staff-info history limit"],
    ["membershipCacheSeconds", "int", "Membership cache seconds"],
    ["robloxConcurrency", "int", "Roblox concurrency"],
  ]],
];

const EVENT_META = {
  remove: { c: "var(--danger)", label: "Removed" },
  dryrun: { c: "var(--warning)", label: "Dry-run" },
  protected: { c: "var(--success)", label: "Protected" },
  skip: { c: "var(--muted)", label: "Skipped" },
  error: { c: "var(--danger)", label: "Error" },
  info: { c: "var(--brand-2)", label: "Info" },
};

function ago(t) {
  if (!t) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function uptime(readyAt) {
  if (!readyAt) return "—";
  let s = Math.floor((Date.now() - readyAt) / 1000);
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  return [d ? `${d}d` : "", h ? `${h}h` : "", `${m}m`].filter(Boolean).join(" ");
}

export default function SelfbotClient({ me }) {
  const [tab, setTab] = useState("overview");
  const [state, setState] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const [form, setForm] = useState(null);
  const [tok, setTok] = useState("");
  const [cook, setCook] = useState("");
  const [lookupQ, setLookupQ] = useState("");
  const [lookupRes, setLookupRes] = useState(null);
  const [roster, setRoster] = useState(null);
  const [staffFilter, setStaffFilter] = useState("");
  const [ranks, setRanks] = useState(null);
  const [preview, setPreview] = useState(null);
  const [guildRoles, setGuildRoles] = useState(null);
  const [roleAdd, setRoleAdd] = useState("");

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2600); };

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/selfbot", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "error"); return; }
      setErr("");
      setState(j);
      setForm((f) => f || { ...j.settings });
    } catch (e) {
      setErr(String((e && e.message) || e));
    }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const post = async (kind, payload) => {
    const r = await fetch("/api/selfbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, payload }),
    });
    return r.json();
  };
  const pollResult = async (id, tries = 14) => {
    for (let i = 0; i < tries; i++) {
      await new Promise((r) => setTimeout(r, 1400));
      try {
        const r = await fetch("/api/selfbot", { cache: "no-store" });
        const j = await r.json();
        if (j && j.status) setState(j);
        if (j && j.result && j.result.id === id) return j.result;
      } catch (e) { /* keep polling */ }
    }
    return null;
  };
  const runCommand = async (action, arg) => {
    const j = await post("action", { action, arg });
    if (j && j.queued) return await pollResult(j.id);
    return j;
  };

  const act = async (action, arg, label) => {
    setBusy(label || action);
    try {
      const res = await runCommand(action, arg);
      await load();
      return res;
    } finally { setBusy(""); }
  };
  const saveSettings = async () => {
    setBusy("save");
    try { const j = await post("settings", form); if (j.settings) setForm({ ...j.settings }); flash("Settings saved"); await load(); }
    finally { setBusy(""); }
  };
  const saveSecret = async (patch, which) => {
    setBusy(which);
    try { await post("secrets", patch); setTok(""); setCook(""); flash(`${which} updated`); await load(); }
    finally { setBusy(""); }
  };
  const doPreview = async () => { setBusy("preview"); try { const r = await runCommand("wouldkick"); setPreview((r && r.hits) || []); flash("Preview ready"); } finally { setBusy(""); } };
  const doLookup = async () => { if (!lookupQ.trim()) return; setBusy("lookup"); try { setLookupRes(await runCommand("lookup", lookupQ.trim())); } finally { setBusy(""); } };
  const loadRoster = async () => { setBusy("roster"); try { const r = await runCommand("roster"); setRoster((r && r.roster) || []); } finally { setBusy(""); } };
  const loadRanks = async () => { setBusy("ranks"); try { const r = await runCommand("ranks"); setRanks((r && r.ranks) || []); } finally { setBusy(""); } };
  const loadGuildRoles = async () => { setBusy("guildroles"); try { const r = await runCommand("guildroles"); setGuildRoles((r && r.roles) || []); } finally { setBusy(""); } };
  const setStaffRoles = async (ids) => { setBusy("roles"); try { const j = await post("settings", { staffRoleIds: ids }); if (j.settings) setForm((f) => ({ ...(f || {}), staffRoleIds: ids })); flash("Staff roles updated"); await load(); } finally { setBusy(""); } };
  const addStaffRole = (id) => { id = String(id || "").trim(); if (!/^\d+$/.test(id)) return; const cur = (cfg.staffRoleIds || []).map(String); if (cur.includes(id)) return; setRoleAdd(""); setStaffRoles([...cur, id]); };
  const removeStaffRole = (id) => setStaffRoles((cfg.staffRoleIds || []).map(String).filter((x) => x !== String(id)));

  const cfg = (state && state.settings) || {};
  const st = (state && state.status) || {};
  const connected = !!st.connected;
  const events = st.events || [];

  const filteredStaff = useMemo(() => {
    if (!roster) return [];
    const q = staffFilter.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter((s) => [s.discordId, s.username, s.robloxId, s.rankName].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [roster, staffFilter]);
  const roleName = useCallback((id) => {
    const r = guildRoles && guildRoles.find((x) => String(x.id) === String(id));
    return r ? r.name : null;
  }, [guildRoles]);

  if (err && !state) {
    return (
      <Shell me={me}>
        <div className="card"><p style={{ color: "var(--danger)" }}>{err}</p><button className="btn" onClick={load}>Retry</button></div>
      </Shell>
    );
  }
  if (!state) return <Shell me={me}><div className="card"><p className="muted">Loading…</p></div></Shell>;

  return (
    <Shell me={me}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, letterSpacing: "-.02em" }}>Self-bot</h1>
          <p className="muted" style={{ margin: "2px 0 0" }}>ZHD staff sync · controlled here, runs in the bot process</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="pill" style={{ color: connected ? "var(--success)" : "var(--danger)" }}>
            {connected ? "● Connected" : "● Offline"}{st.tag ? ` · ${st.tag}` : ""}
          </span>
          {connected
            ? <button className="btn ghost" disabled={!!busy} onClick={() => act("disconnect", null, "disconnect")}>Disconnect</button>
            : <button className="btn" disabled={!!busy} onClick={() => act("connect", null, "connect")}>Connect</button>}
          <button className="btn ghost" disabled={!!busy} onClick={() => act("restart", null, "restart")}>Restart</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--line)", margin: "18px 0 4px", flexWrap: "wrap" }}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className="btn ghost"
            style={{ border: 0, borderRadius: 0, padding: "9px 14px", color: tab === id ? "var(--text)" : "var(--muted)", borderBottom: tab === id ? "2px solid var(--brand)" : "2px solid transparent" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
            <Stat label="Connection" value={connected ? "Online" : "Offline"} tone={connected ? "var(--success)" : "var(--danger)"} />
            <Stat label="Account" value={st.tag || "—"} />
            <Stat label="Uptime" value={connected ? uptime(st.readyAt) : "—"} />
            <Stat label="Staff records" value={st.staffIndexSize ?? "—"} />
            <Stat label="Audit watcher" value={st.auditEnabled ? "On" : "Off"} />
            <Stat label="Dry run" value={cfg.dryRun ? "ON" : "off"} tone={cfg.dryRun ? "var(--warning)" : undefined} />
            <Stat label="Removed" value={(st.counters && st.counters.removed) ?? 0} />
            <Stat label="Protected" value={(st.counters && st.counters.protected) ?? 0} tone="var(--success)" />
            <Stat label="Errors" value={(st.counters && st.counters.errors) ?? 0} tone="var(--danger)" />
          </div>
          <div className="card">
            <div className="row" style={{ alignItems: "center" }}>
              <b style={{ marginRight: "auto" }}>Quick actions</b>
              <button className="btn ghost" disabled={!!busy} onClick={() => act("reindex", null, "reindex")}>Reindex staff</button>
              <button className="btn ghost" disabled={!!busy} onClick={() => act("sync", null, "sync")}>Sync now</button>
              <button className="btn" disabled={!!busy} onClick={doPreview}>Dry-run preview</button>
            </div>
            {preview && (
              <div style={{ marginTop: 12 }}>
                <p className="muted" style={{ margin: "0 0 6px" }}>{preview.length ? `Would remove ${preview.length}:` : "Nobody would be removed (or bot offline)."}</p>
                {preview.length > 0 && (
                  <div style={{ overflowX: "auto" }}><table><thead><tr><th>Discord</th><th>Roblox</th><th>Rank</th></tr></thead>
                    <tbody>{preview.map((h, i) => (<tr key={i}><td className="mono">{h.discordId}</td><td className="mono">{h.robloxId}</td><td>{h.rankName} <span className="muted">({h.rank})</span></td></tr>))}</tbody></table></div>
                )}
              </div>
            )}
          </div>
          <div className="card">
            <b>Recent activity</b>
            <EventList events={events.slice(0, 6)} />
            {events.length > 6 && <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => setTab("activity")}>View all</button>}
          </div>
        </>
      )}

      {tab === "activity" && (
        <div className="card">
          <div className="row" style={{ alignItems: "center" }}><b style={{ marginRight: "auto" }}>Activity feed</b><button className="btn ghost" onClick={load}>Refresh</button></div>
          <EventList events={events} full />
        </div>
      )}

      {tab === "lookup" && (
        <div className="card">
          <b>Member lookup</b>
          <p className="muted" style={{ margin: "4px 0 10px" }}>Discord ID, Roblox ID, or Roblox username.</p>
          <div className="row">
            <input value={lookupQ} onChange={(e) => setLookupQ(e.target.value)} placeholder="e.g. 584392055007215626 or Elrynni_II"
              onKeyDown={(e) => e.key === "Enter" && doLookup()} style={{ minWidth: 280 }} />
            <button className="btn" disabled={!!busy} onClick={doLookup}>Look up</button>
          </div>
          {lookupRes && (
            <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
              <KV k="Query" v={<span className="mono">{lookupRes.query}</span>} />
              <KV k="Matched as" v={lookupRes.source || "—"} />
              <KV k="Roblox ID" v={<span className="mono">{lookupRes.robloxId || "not found"}</span>} />
              <KV k="Group rank" v={lookupRes.role ? `${lookupRes.role.name} (rank ${lookupRes.role.rank})` : "not in group"} />
              <KV k="Would be removed" v={<b style={{ color: lookupRes.removable ? "var(--danger)" : "var(--success)" }}>{lookupRes.removable ? "YES" : "no — protected"}</b>} />
              {lookupRes.staffRec && <KV k="Staff-info" v={<span className="mono">{lookupRes.staffRec.rblxUser || ""} {lookupRes.staffRec.userId ? `#${lookupRes.staffRec.userId}` : ""}</span>} />}
              {lookupRes.robloxId && (
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <button className="btn danger" disabled={!lookupRes.removable || !!busy} onClick={() => act("kickRoblox", lookupRes.robloxId, "kick")}>Remove from group</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "staff" && (
        <div className="card">
          <div className="row" style={{ alignItems: "center" }}>
            <b style={{ marginRight: "auto" }}>Registered staff {roster ? `(${roster.length})` : ""}</b>
            <input value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} placeholder="Filter…" style={{ minWidth: 160 }} />
            <button className="btn ghost" disabled={!!busy} onClick={loadRoster}>{roster ? "Reload" : "Load roster"}</button>
          </div>
          {!roster && <p className="muted" style={{ marginTop: 8 }}>Loads everyone the bot has registered from staff-info, with their Roblox username, group rank, and whether they'd be removed.</p>}
          {roster && (
            <div style={{ overflowX: "auto", marginTop: 10 }}>
              <table><thead><tr><th>Roblox user</th><th>Roblox ID</th><th>Discord ID</th><th>Group rank</th><th>Status</th><th></th></tr></thead>
                <tbody>{filteredStaff.map((s, i) => (
                  <tr key={i}>
                    <td>{s.username || <span className="muted">—</span>}</td>
                    <td className="mono">{s.robloxId || <span className="muted">—</span>}</td>
                    <td className="mono">{s.discordId}</td>
                    <td>{s.inGroup ? <>{s.rankName} <span className="muted">({s.rank})</span></> : <span className="muted">not in group</span>}</td>
                    <td><span className="pill" style={{ color: s.removable ? "var(--danger)" : "var(--success)" }}>{s.removable ? "removable" : "protected"}</span></td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="btn ghost" style={{ padding: "4px 10px" }} onClick={() => { setLookupQ(s.discordId); setTab("lookup"); }}>Inspect</button>
                      {s.removable && s.robloxId ? <button className="btn danger" style={{ padding: "4px 10px", marginLeft: 6 }} disabled={!!busy} onClick={() => act("kickRoblox", s.robloxId, "kick")}>Remove</button> : null}
                    </td>
                  </tr>
                ))}{filteredStaff.length === 0 && <tr><td colSpan={6} className="muted">No matches.</td></tr>}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "roles" && (
        <div className="card">
          <div className="row" style={{ alignItems: "center" }}>
            <b style={{ marginRight: "auto" }}>Staff roles</b>
            <button className="btn ghost" disabled={!!busy} onClick={loadGuildRoles}>{guildRoles ? "Refresh role names" : "Load role names"}</button>
          </div>
          <p className="muted" style={{ margin: "4px 0 12px" }}>Anyone with one of these Discord roles is staff. Losing the last one triggers an automatic removal (rank-guarded).</p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {(cfg.staffRoleIds || []).length === 0 && <span className="muted">No staff roles set.</span>}
            {(cfg.staffRoleIds || []).map((id) => (
              <span key={id} className="chip">
                {roleName(id) || id}
                {roleName(id) ? <span className="mono muted" style={{ fontSize: 11 }}>&nbsp;{id}</span> : null}
                <button title="Remove" disabled={!!busy} onClick={() => removeStaffRole(id)}>×</button>
              </span>
            ))}
          </div>

          <div className="row">
            {guildRoles && guildRoles.length > 0 ? (
              <select value={roleAdd} onChange={(e) => setRoleAdd(e.target.value)} style={{ minWidth: 240 }}>
                <option value="">Pick a role to add…</option>
                {guildRoles.filter((r) => !(cfg.staffRoleIds || []).map(String).includes(String(r.id))).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            ) : (
              <input value={roleAdd} onChange={(e) => setRoleAdd(e.target.value)} placeholder="Role ID" style={{ minWidth: 240 }} />
            )}
            <button className="btn" disabled={!roleAdd || !!busy} onClick={() => addStaffRole(roleAdd)}>Add role</button>
          </div>
        </div>
      )}

      {tab === "ranks" && (
        <div className="card">
          <div className="row" style={{ alignItems: "center" }}>
            <b style={{ marginRight: "auto" }}>Managed group ranks</b>
            <button className="btn ghost" disabled={!!busy} onClick={loadRanks}>{ranks ? "Reload" : "Load"}</button>
          </div>
          {ranks && (
            <div style={{ overflowX: "auto", marginTop: 10 }}>
              <table><thead><tr><th>Rank</th><th>Name</th><th>Members</th><th>Removable</th></tr></thead>
                <tbody>{ranks.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.rank}</td><td>{r.name}</td><td className="mono">{r.memberCount ?? "—"}</td>
                    <td><span className="pill" style={{ color: r.removable ? "var(--danger)" : "var(--success)" }}>{r.removable ? "removable" : "protected"}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "settings" && form && (
        <>
          {FIELD_GROUPS.map(([title, fields]) => (
            <div className="card" key={title}>
              <b>{title}</b>
              <div style={{ marginTop: 8 }}>
                {fields.map(([key, type, label]) => (
                  <Field key={key} label={label} type={type} value={form[key]} onChange={(v) => setForm({ ...form, [key]: v })} />
                ))}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button className="btn" disabled={busy === "save"} onClick={saveSettings}>{busy === "save" ? "Saving…" : "Save settings"}</button>
            <button className="btn ghost" onClick={() => setForm({ ...cfg })}>Reset</button>
          </div>
        </>
      )}

      {tab === "creds" && (
        <>
          <div className="card">
            <b>Credentials</b>
            <p className="muted" style={{ margin: "4px 0 12px" }}>Stored in the shared DB and picked up by the bot within a few seconds. Changing the token reconnects; the cookie applies immediately.</p>
            <div className="row" style={{ marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <label className="muted" style={{ fontSize: 12 }}>Discord token <span className="mono">({cfg.tokenHint})</span></label>
                <input type="password" value={tok} onChange={(e) => setTok(e.target.value)} placeholder="new user token" style={{ width: "100%" }} />
              </div>
              <button className="btn" disabled={!tok || !!busy} onClick={() => saveSecret({ discordToken: tok }, "Token")}>Set token</button>
            </div>
            <div className="row">
              <div style={{ flex: 1, minWidth: 260 }}>
                <label className="muted" style={{ fontSize: 12 }}>Roblox cookie <span className="mono">({cfg.cookieHint})</span></label>
                <input type="password" value={cook} onChange={(e) => setCook(e.target.value)} placeholder="new .ROBLOSECURITY" style={{ width: "100%" }} />
              </div>
              <button className="btn" disabled={!cook || !!busy} onClick={() => saveSecret({ roblosecurity: cook }, "Cookie")}>Set cookie</button>
            </div>
          </div>
          <div className="card">
            <div className="row" style={{ alignItems: "center" }}>
              <div style={{ marginRight: "auto" }}><b>Dry run</b><div className="muted" style={{ fontSize: 13 }}>Log actions but remove nobody. Recommended before going live.</div></div>
              <button className={cfg.dryRun ? "btn" : "btn ghost"} disabled={!!busy}
                onClick={() => post("settings", { dryRun: !cfg.dryRun }).then(load)}>{cfg.dryRun ? "ON" : "OFF"}</button>
            </div>
          </div>
        </>
      )}

      {toast && <div style={{ position: "fixed", right: 18, bottom: 18, background: "var(--surface-3)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 14px", boxShadow: "var(--shadow)" }}>{toast}</div>}
      {busy && <div style={{ position: "fixed", left: 18, bottom: 18 }} className="muted">Working: {busy}…</div>}
    </Shell>
  );
}

function Shell({ me, children }) {
  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "34px 24px 80px", fontFamily: "var(--sans)", color: "var(--text)" }}>
      {children}
      <p className="muted" style={{ marginTop: 26, fontSize: 12 }}>Signed in as {me} · super owner</p>
    </main>
  );
}
function Stat({ label, value, tone }) {
  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "13px 15px" }}>
      <div className="muted" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 700, marginTop: 4, color: tone || "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(value)}</div>
    </div>
  );
}
function KV({ k, v }) {
  return (<div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: "1px solid var(--line-soft)" }}><span className="muted">{k}</span><span style={{ textAlign: "right" }}>{v}</span></div>);
}
function EventList({ events, full }) {
  if (!events || !events.length) return <p className="muted" style={{ marginTop: 8 }}>No activity yet.</p>;
  return (
    <div style={{ marginTop: 8, maxHeight: full ? 520 : undefined, overflowY: full ? "auto" : undefined }}>
      {events.map((e, i) => {
        const m = EVENT_META[e.kind] || EVENT_META.info;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--line-soft)" }}>
            <span className="pill" style={{ color: m.c, minWidth: 84, justifyContent: "center" }}>{m.label}</span>
            <span style={{ flex: 1, fontSize: 13.5 }}>{e.msg}</span>
            <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{ago(e.t)}</span>
          </div>
        );
      })}
    </div>
  );
}
function Field({ label, type, value, onChange }) {
  if (type === "bool") {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line-soft)" }}>
        <span className="muted">{label}</span>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} style={{ width: 18, height: 18 }} />
      </div>
    );
  }
  const val = type === "ids" ? (Array.isArray(value) ? value.join(", ") : value || "") : value == null ? "" : value;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--line-soft)" }}>
      <span className="muted">{label}</span>
      <input value={val} style={{ maxWidth: 260 }}
        onChange={(e) => onChange(type === "ids" ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : type === "int" ? parseInt(e.target.value || "0", 10) : e.target.value)} />
    </div>
  );
}
