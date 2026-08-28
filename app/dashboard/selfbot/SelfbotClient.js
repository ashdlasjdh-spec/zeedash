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
  ["whitelist", "Whitelist"],
  ["ranks", "Ranks"],
  ["presence", "Presence"],
  ["tools", "Tools"],
  ["settings", "Settings"],
  ["creds", "Credentials", true], // owner-only (sets token/cookie)
  ["access", "Access", true], // owner-only (who can view this page)
];

const FIELD_GROUPS = [
  ["Safety guard", [
    ["dryRun", "bool", "Dry run (log only — remove nobody)"],
    ["removeAnyRank", "bool", "Remove at ANY group rank (ignore the staff-rank guard)"],
    ["staffMinRank", "int", "Staff min rank (≥ removable)"],
    ["staffMaxRank", "int", "Staff max rank (0 = no cap)"],
    ["staffRankIds", "ids", "Exact removable rank IDs (overrides min/max)"],
  ]],
  ["Triggers", [
    ["kickOnStaffRoleRemoved", "bool", "Kick when a staff role is removed"],
    ["kickUnknownJoins", "bool", "Kick new joiners with no staff info"],
    ["autoOrphanSweep", "bool", "Auto orphan cleanup (scheduled — removes members with no staff info)"],
    ["orphanSweepHours", "int", "Orphan sweep interval (hours)"],
    ["requireStaffRoleForFire", "bool", "Require staff role for Fired/Resigns"],
    ["auditWatcherEnabled", "bool", "Audit watcher (read the group's audit log)"],
    ["staffRoleIds", "ids", "Staff Discord role IDs"],
  ]],
  ["Automod", [
    ["pingAutomodEnabled", "bool", "Ping automod (delete + strip roles on @everyone/@here)"],
    ["pingWhitelist", "ids", "Allowed to ping — Discord user IDs"],
    ["pingWhitelistRoles", "ids", "Allowed to ping — role IDs (e.g. antinuke admins)"],
  ]],
  ["IDs & channels", [
    ["managedGroupId", "id", "Managed Roblox group ID"],
    ["crraamsGroupId", "id", "Audit-source group ID"],
    ["guildId", "id", "Discord guild ID"],
    ["staffInfoChannelId", "id", "Staff-info channel ID"],
    ["logChannelId", "id", "Log channel ID (optional)"],
    ["authorizedUserIds", "ids", "Authorized command user IDs"],
  ]],
  ["Leaderboard staff guild (own roles)", [
    ["leaderboardGuildId", "id", "Leaderboard staff guild ID"],
    ["leaderboardChannels", "ids", "Leaderboard staff-info channel IDs"],
    ["leaderboardStaffRoleIds", "ids", "Leaderboard STAFF role IDs (this guild's own staff roles)"],
  ]],
  ["Performance & timing", [
    ["roleReconcileSeconds", "int", "Role reconcile interval (s) — backstop sweep"],
    ["memberRefreshSeconds", "int", "Member cache refresh (s) — keeps live kicks instant"],
    ["staffRefreshSeconds", "int", "Staff-info poll (s) — indexes new posts"],
    ["kickCooldownSeconds", "int", "Kick cooldown (s) — anti-spam re-kick window"],
    ["auditPollSeconds", "int", "Audit poll seconds"],
    ["staffInfoHistoryLimit", "int", "Staff-info history limit (0 = whole channel)"],
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
  presence: { c: "var(--brand-2)", label: "Presence" },
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
// Friendly text for the in-progress indicator instead of the raw action key ("reindex" → "Rebuilding…").
const BUSY_LABELS = {
  reindex: "Rebuilding staff index", sync: "Running sync", roster: "Loading roster", ranks: "Loading ranks",
  orphan: "Scanning group", preview: "Building preview", lookup: "Looking up", save: "Saving",
  roles: "Updating roles", whitelist: "Updating whitelist", ping: "Updating automod", access: "Updating access",
  guilds: "Loading servers", connect: "Connecting", disconnect: "Disconnecting", restart: "Restarting",
  kick: "Removing", purge: "Purging DMs", purgeall: "Purging DMs", blast: "Sending", say: "Sending", nick: "Setting nickname",
};
const busyLabel = (b) => (BUSY_LABELS[b] || (b.charAt(0).toUpperCase() + b.slice(1))) + "…";

export default function SelfbotClient({ me, isOwner = false }) {
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
  const [rosterErr, setRosterErr] = useState("");
  const [staffFilter, setStaffFilter] = useState("");
  const [ranks, setRanks] = useState(null);
  const [preview, setPreview] = useState(null);
  const [guildRoles, setGuildRoles] = useState(null);
  const [roleAdd, setRoleAdd] = useState("");
  const [roleGuild, setRoleGuild] = useState("main"); // 'main' | 'leaderboard'
  const [whitelistAdd, setWhitelistAdd] = useState("");
  const [whitelistDiscordAdd, setWhitelistDiscordAdd] = useState("");
  const [pingWlAdd, setPingWlAdd] = useState("");
  const [pingWlRoleAdd, setPingWlRoleAdd] = useState("");
  const [viewerAdd, setViewerAdd] = useState("");
  const [purgeTarget, setPurgeTarget] = useState("");
  const [purgeLimit, setPurgeLimit] = useState(50);
  const [purgeRes, setPurgeRes] = useState(null);
  const [purgeAllRes, setPurgeAllRes] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [purgeClose, setPurgeClose] = useState(false);
  const [purgeOlder, setPurgeOlder] = useState("");
  const [blastTargets, setBlastTargets] = useState("");
  const [blastContent, setBlastContent] = useState("");
  const [blastRes, setBlastRes] = useState(null);
  const [orphanRes, setOrphanRes] = useState(null);
  const [confirmOrphan, setConfirmOrphan] = useState(false);
  const [sayChannel, setSayChannel] = useState("");
  const [sayContent, setSayContent] = useState("");
  const [sayRes, setSayRes] = useState(null);
  const [guilds, setGuilds] = useState(null);
  const [nickGuild, setNickGuild] = useState("");
  const [nickValue, setNickValue] = useState("");
  const [nickRes, setNickRes] = useState(null);

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
  const runCommand = async (action, arg, tries) => {
    const j = await post("action", { action, arg });
    if (j && j.queued) return await pollResult(j.id, tries);
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
  const doReindex = async () => { setBusy("reindex"); try { const r = await runCommand("reindex"); await load(); const n = r && r.indexed ? r.indexed.size : null; flash(n != null ? `Staff index rebuilt — ${n} record${n === 1 ? "" : "s"}` : "Reindex done"); } finally { setBusy(""); } };
  const doSync = async () => { setBusy("sync"); try { await runCommand("sync"); await load(); flash("Sync complete"); } finally { setBusy(""); } };
  const doLookup = async () => { if (!lookupQ.trim()) return; setBusy("lookup"); setLookupRes(null); try { const r = await runCommand("lookup", lookupQ.trim(), 25); if (r) setLookupRes(r); else flash("Lookup timed out — the bot may be busy. Try again."); } finally { setBusy(""); } };
  const doOrphanPreview = async () => { setBusy("orphan"); setConfirmOrphan(false); try { const r = await runCommand("orphanpreview", null, 90); setOrphanRes(r); if (r && r.error) flash(r.error); else flash("Scan complete"); } finally { setBusy(""); } };
  const doOrphanPurge = async () => { setBusy("orphan"); try { const r = await runCommand("orphanpurge", null, 120); setOrphanRes(r); setConfirmOrphan(false); if (r && r.error) flash(r.error); else flash(`Processed ${r ? r.processed : 0}`); await load(); } finally { setBusy(""); } };
  const loadRoster = async () => {
    setBusy("roster"); setRosterErr("");
    try {
      // The roster resolves a Roblox name + rank per record, so a big staff list is slow — give it
      // plenty of polling time instead of timing out to an empty "0" that looks like no staff.
      const r = await runCommand("roster", null, 45);
      if (r && Array.isArray(r.roster)) setRoster(r.roster);
      else { setRoster([]); setRosterErr("failed"); }
    } finally { setBusy(""); }
  };
  const loadRanks = async () => { setBusy("ranks"); try { const r = await runCommand("ranks"); setRanks((r && r.ranks) || []); } finally { setBusy(""); } };
  const roleKey = () => (roleGuild === "leaderboard" ? "leaderboardStaffRoleIds" : "staffRoleIds");
  const roleGuildId = () => (roleGuild === "leaderboard" ? (cfg.leaderboardGuildId || "") : (cfg.guildId || ""));
  const loadGuildRoles = async () => { setBusy("guildroles"); try { const r = await runCommand("guildroles", roleGuildId()); setGuildRoles((r && r.roles) || []); } finally { setBusy(""); } };
  const switchRoleGuild = (g) => { setRoleGuild(g); setGuildRoles(null); setRoleAdd(""); };
  const setStaffRoles = async (ids) => { const k = roleKey(); setBusy("roles"); try { const j = await post("settings", { [k]: ids }); if (j.settings) setForm((f) => ({ ...(f || {}), [k]: ids })); flash("Staff roles updated"); await load(); } finally { setBusy(""); } };
  const addStaffRole = (id) => { id = String(id || "").trim(); if (!/^\d+$/.test(id)) return; const cur = (cfg[roleKey()] || []).map(String); if (cur.includes(id)) return; setRoleAdd(""); setStaffRoles([...cur, id]); };
  const removeStaffRole = (id) => setStaffRoles((cfg[roleKey()] || []).map(String).filter((x) => x !== String(id)));
  const setWhitelist = async (list) => { setBusy("whitelist"); try { const j = await post("settings", { whitelist: list }); if (j.settings) setForm((f) => ({ ...(f || {}), whitelist: list })); flash("Whitelist updated"); await load(); } finally { setBusy(""); } };
  const addWhitelist = (v) => { v = String(v || "").trim().replace(/^@+/, ""); if (!v) return; const cur = (cfg.whitelist || []).map(String); if (cur.some((x) => x.toLowerCase() === v.toLowerCase())) return; setWhitelistAdd(""); setWhitelist([...cur, v]); };
  const removeWhitelist = (v) => setWhitelist((cfg.whitelist || []).map(String).filter((x) => x !== String(v)));
  const setWhitelistDiscord = async (list) => { setBusy("whitelist"); try { const j = await post("settings", { whitelistDiscord: list }); if (j.settings) setForm((f) => ({ ...(f || {}), whitelistDiscord: list })); flash("Discord whitelist updated"); await load(); } finally { setBusy(""); } };
  const addWhitelistDiscord = (v) => { v = String(v || "").trim(); if (!/^\d{17,20}$/.test(v)) { flash("Enter a valid Discord ID"); return; } const cur = (cfg.whitelistDiscord || []).map(String); if (cur.includes(v)) return; setWhitelistDiscordAdd(""); setWhitelistDiscord([...cur, v]); };
  const removeWhitelistDiscord = (v) => setWhitelistDiscord((cfg.whitelistDiscord || []).map(String).filter((x) => x !== String(v)));
  const togglePingAutomod = async () => { setBusy("ping"); try { const next = !cfg.pingAutomodEnabled; const j = await post("settings", { pingAutomodEnabled: next }); if (j.settings) setForm((f) => ({ ...(f || {}), pingAutomodEnabled: next })); flash(next ? "Ping automod ON" : "Ping automod OFF"); await load(); } finally { setBusy(""); } };
  const setPingWhitelist = async (list) => { setBusy("ping"); try { const j = await post("settings", { pingWhitelist: list }); if (j.settings) setForm((f) => ({ ...(f || {}), pingWhitelist: list })); flash("Ping whitelist updated"); await load(); } finally { setBusy(""); } };
  const addPingWhitelist = (v) => { v = String(v || "").trim(); if (!/^\d{17,20}$/.test(v)) { flash("Enter a valid Discord user ID"); return; } const cur = (cfg.pingWhitelist || []).map(String); if (cur.includes(v)) return; setPingWlAdd(""); setPingWhitelist([...cur, v]); };
  const removePingWhitelist = (v) => setPingWhitelist((cfg.pingWhitelist || []).map(String).filter((x) => x !== String(v)));
  const setPingWhitelistRoles = async (list) => { setBusy("ping"); try { const j = await post("settings", { pingWhitelistRoles: list }); if (j.settings) setForm((f) => ({ ...(f || {}), pingWhitelistRoles: list })); flash("Ping role whitelist updated"); await load(); } finally { setBusy(""); } };
  const addPingWhitelistRole = (v) => { v = String(v || "").trim(); if (!/^\d{17,20}$/.test(v)) { flash("Enter a valid role ID"); return; } const cur = (cfg.pingWhitelistRoles || []).map(String); if (cur.includes(v)) return; setPingWlRoleAdd(""); setPingWhitelistRoles([...cur, v]); };
  const removePingWhitelistRole = (v) => setPingWhitelistRoles((cfg.pingWhitelistRoles || []).map(String).filter((x) => x !== String(v)));
  const addViewer = async (id) => { id = String(id || "").trim(); if (!/^\d{17,20}$/.test(id)) { flash("Enter a valid Discord ID"); return; } setBusy("access"); try { const j = await post("access", { action: "add", id }); if (j.error) flash(j.error); else { setViewerAdd(""); flash("Viewer added"); await load(); } } finally { setBusy(""); } };
  const removeViewer = async (id) => { setBusy("access"); try { const j = await post("access", { action: "remove", id: String(id) }); if (j.error) flash(j.error); else { flash("Viewer removed"); await load(); } } finally { setBusy(""); } };
  const setF = (k, v) => setForm((f) => ({ ...(f || {}), [k]: v }));
  const applyPresenceNow = () => act("presence", null, "presence");
  const purgeOpts = () => ({ close: purgeClose, olderThanDays: Number(purgeOlder) || 0 });
  const doPurge = async () => {
    if (!/^\d+$/.test(purgeTarget.trim())) return;
    setBusy("purge");
    try { const r = await runCommand("purgedm", { target: purgeTarget.trim(), limit: Number(purgeLimit) || 50, ...purgeOpts() }); setPurgeRes(r); }
    finally { setBusy(""); }
  };
  const doPurgeAll = async () => {
    setBusy("purgeall");
    try { const r = await runCommand("purgealldm", { limit: Number(purgeLimit) || 200, ...purgeOpts() }); setPurgeAllRes(r); }
    finally { setBusy(""); setConfirmAll(false); }
  };
  const doBlast = async () => {
    if (!blastTargets.trim() || !blastContent.trim()) return;
    setBusy("blast");
    try { setBlastRes(await runCommand("senddm", { targets: blastTargets.trim(), content: blastContent })); }
    finally { setBusy(""); }
  };
  const doSay = async () => {
    if (!sayChannel.trim() || !sayContent.trim()) return;
    setBusy("say");
    try { setSayRes(await runCommand("say", { channel: sayChannel.trim(), content: sayContent })); }
    finally { setBusy(""); }
  };
  const loadGuilds = async () => { setBusy("guilds"); try { const r = await runCommand("listguilds"); setGuilds((r && r.guilds) || []); } finally { setBusy(""); } };
  const doLeave = async (g) => {
    if (typeof window !== "undefined" && !window.confirm(`Leave "${g.name}"?`)) return;
    setBusy("leave");
    try { await runCommand("leaveguild", { guild: g.id }); await loadGuilds(); } finally { setBusy(""); }
  };
  const doNick = async () => {
    if (!nickGuild.trim()) return;
    setBusy("nick");
    try { setNickRes(await runCommand("setnick", { guild: nickGuild.trim(), nick: nickValue })); }
    finally { setBusy(""); }
  };

  const cfg = (state && state.settings) || {};
  const st = (state && state.status) || {};
  const connected = !!st.connected;
  const events = st.events || [];
  const heartbeat = st.updatedAt ? Date.now() - st.updatedAt : null;
  const runnerDown = heartbeat == null || heartbeat > 25000; // runner not writing status
  const diagnostic = connected
    ? null
    : runnerDown
      ? { t: "Bot process isn't reporting in", d: "The self-bot runs inside your Zee Hood bot. It isn't writing to the shared database, so nothing acts on Connect. Deploy the Zee Hood service with this branch and make sure its DATABASE_URL points at the SAME Postgres this dashboard uses.", bad: true }
      : st.lastError
        ? { t: "Connection error", d: `${st.lastError} — the token must be a USER token (not a bot token), and the cookie must be a valid .ROBLOSECURITY.`, bad: true }
        : (!st.hasToken || !st.hasCookie)
          ? { t: "Credentials needed", d: "Enter the Discord token and Roblox cookie in the Credentials tab, then hit Connect.", bad: false }
          : { t: "Connecting…", d: "Credentials are set and the bot is reporting in — it should connect within a few seconds. If it stays here, the token or cookie is invalid.", bad: false };

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
      {/* Header — matches the site's page header */}
      <div className="ph">
        <div className="ph-text">
          <h1 className="ph-title">Self-bot</h1>
          <p className="ph-sub">ZHD staff sync — runs inside the bot process, controlled here.</p>
        </div>
        <div className="ph-actions sb-actions">
          <span className="pill" style={{ color: connected ? "var(--success)" : "var(--danger)" }}>
            <span className="sb-dot" style={{ background: "currentColor", "--pulse": connected ? "rgba(74,222,128,.5)" : "rgba(255,84,112,.5)" }} />
            {connected ? "Connected" : "Offline"}{st.tag ? ` · ${st.tag}` : ""}
          </span>
          {connected
            ? <button className="btn ghost" disabled={!!busy} onClick={() => act("disconnect", null, "disconnect")}>Disconnect</button>
            : <button className="btn" disabled={!!busy} onClick={() => act("connect", null, "connect")}>Connect</button>}
          <button className="btn ghost" disabled={!!busy} onClick={() => act("restart", null, "restart")}>Restart</button>
        </div>
      </div>

      {/* Risk banner — always visible */}
      <div className="card" style={{ borderColor: "var(--brand-line)", padding: 14, marginTop: 4 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>⚠️</span>
          <div>
            <b>Self-bot — account risk</b>
            <p className="muted" style={{ margin: "3px 0 0", fontSize: 13, lineHeight: 1.5 }}>
              Automating a user account breaks Discord's ToS and can get it disabled. This build paces every action (one at a time, randomized delays, well under Discord's limits) and caps mass actions to reduce the risk — but nothing makes a self-bot 100% safe. Keep DM blasts/purges small, don't hammer it 24/7, and prefer a real bot account for anything you can.
            </p>
          </div>
        </div>
      </div>

      {diagnostic && (
        <div className="card" style={{ borderColor: diagnostic.bad ? "var(--danger)" : "var(--brand-line)", padding: 14, marginTop: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{diagnostic.bad ? "🛑" : "⏳"}</span>
            <div>
              <b>{diagnostic.t}</b>
              <p className="muted" style={{ margin: "3px 0 0", fontSize: 13, lineHeight: 1.5 }}>{diagnostic.d}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="sb-tabs">
        {TABS.filter(([, , ownerOnly]) => !ownerOnly || isOwner).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className="btn ghost"
            style={{ color: tab === id ? "var(--text)" : "var(--muted)", borderBottom: tab === id ? "2px solid var(--brand)" : "2px solid transparent" }}>
            {label}
          </button>
        ))}
      </div>

      <div className="sb-view" key={tab}>
      {tab === "overview" && (
        <>
          <div className="sb-stats">
            <Stat label="Connection" value={connected ? "Online" : "Offline"} tone={connected ? "var(--success)" : "var(--danger)"} />
            <Stat label="Discord account" value={st.tag || "—"} />
            <Stat
              label="Roblox account"
              value={st.robloxUser ? st.robloxUser.name : connected ? "checking…" : "—"}
              tone={st.robloxUser ? undefined : connected ? "var(--warning)" : undefined}
            />
            <Stat label="Uptime" value={connected ? uptime(st.readyAt) : "—"} />
            <Stat label="Staff records" value={st.staffIndexSize ?? "—"} />
            <Stat label="Audit watcher" value={st.auditEnabled ? "On" : "Off"} />
            <Stat label="Dry run" value={cfg.dryRun ? "ON" : "off"} tone={cfg.dryRun ? "var(--warning)" : undefined} />
            <Stat label="Removed" value={(st.counters && st.counters.removed) ?? 0} />
            <Stat label="Protected" value={(st.counters && st.counters.protected) ?? 0} tone="var(--success)" />
            <Stat label="Errors" value={(st.counters && st.counters.errors) ?? 0} tone="var(--danger)" />
            <Stat
              label="Last reconcile"
              value={st.lastReconcileAt ? `${uptime(st.lastReconcileAt)} ago` : "—"}
              tone={st.lastReconcileAt && Date.now() - st.lastReconcileAt > 5 * 60 * 1000 ? "var(--danger)" : undefined}
            />
            {st.orphanSweepEnabled && (
              <Stat
                label="Last orphan sweep"
                value={st.lastOrphanSweepAt ? `${uptime(st.lastOrphanSweepAt)} ago` : "waiting…"}
              />
            )}
          </div>
          <div className="card">
            <div className="sb-card-actions">
              <b style={{ marginRight: "auto" }}>Quick actions</b>
              <button className="btn ghost" disabled={!!busy} onClick={doReindex}>Reindex staff</button>
              <button className="btn ghost" disabled={!!busy} onClick={doSync}>Sync now</button>
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
              <KV k="Current username" v={lookupRes.currentUsername || "—"} />
              {lookupRes.recordedName && <KV k="Recorded name" v={lookupRes.recordedName} />}
              {lookupRes.usernameChanged && (
                <p style={{ margin: "8px 0 0", padding: "8px 10px", borderRadius: 10, background: "var(--danger-soft)", color: lookupRes.recordedIsSameAccount ? "var(--warning)" : "var(--danger)", fontSize: 13 }}>
                  {lookupRes.recordedIsSameAccount
                    ? `⚠ Username changed since recorded ("${lookupRes.recordedName}" → "${lookupRes.currentUsername}"). Same account — confirmed in history. Consider updating the staff-info record.`
                    : `⚠ Recorded name "${lookupRes.recordedName}" is NOT in this account's username history — this may be a different person who took that name. Verify before removing.`}
                </p>
              )}
              {lookupRes.history && lookupRes.history.length > 0 && <KV k="Past names" v={<span className="mono" style={{ fontSize: 12 }}>{lookupRes.history.join(", ")}</span>} />}
              {lookupRes.source === "discord" && lookupRes.hasStaffRole != null && (
                <KV k="Currently staff" v={<b style={{ color: lookupRes.hasStaffRole ? "var(--success)" : "var(--warning)" }}>{lookupRes.hasStaffRole ? "yes — holds a staff role" : lookupRes.inGuildDiscord === false ? "no — not in the server" : "no — has no staff role"}</b>} />
              )}
              {!(Array.isArray(lookupRes.accounts) && lookupRes.accounts.length > 1) && <>
                <KV k="Group rank" v={lookupRes.role ? `${lookupRes.role.name} (rank ${lookupRes.role.rank})` : "not in group"} />
                <KV k="Would be removed" v={<b style={{ color: lookupRes.removable ? "var(--danger)" : "var(--success)" }}>{!lookupRes.robloxId ? "no Roblox account on file" : lookupRes.discordWhitelisted ? "no — whitelisted (Discord user)" : lookupRes.whitelisted ? "no — whitelisted" : lookupRes.hasStaffRole === true ? "no — currently has a staff role" : !lookupRes.role ? "no — not in group" : lookupRes.removable ? "YES" : "no — protected rank"}</b>} />
              </>}
              {lookupRes.staffRec && <KV k="Staff-info record" v={<span className="mono">{lookupRes.staffRec.rblxUser || ""} {lookupRes.staffRec.userId ? `#${lookupRes.staffRec.userId}` : ""}</span>} />}
              {Array.isArray(lookupRes.accounts) && lookupRes.accounts.length > 1 && (
                <div style={{ marginTop: 12 }}>
                  <b style={{ fontSize: 13 }}>Linked Roblox accounts ({lookupRes.accounts.length})</b>
                  <p className="muted" style={{ margin: "2px 0 8px", fontSize: 12 }}>{lookupRes.hasStaffRole ? "This user currently holds a staff role, so nothing will be removed while they do. If they lose it, every removable account below is kicked." : `This Discord user has ${lookupRes.accounts.length} Roblox accounts on file. Removing them (role loss / departure / the button below) kicks every account that would be removed.`}</p>
                  <div style={{ overflowX: "auto" }}><table><thead><tr><th>Roblox user</th><th>Recorded</th><th>Roblox ID</th><th>Group rank</th><th>Status</th><th></th></tr></thead>
                    <tbody>{lookupRes.accounts.map((a, i) => (
                      <tr key={i}>
                        <td>{a.username || <span className="muted">—</span>}{a.username && a.recorded && a.username.toLowerCase() !== a.recorded.toLowerCase() ? <span title="renamed since recorded" style={{ color: "var(--warning)" }}> ⚠</span> : null}</td>
                        <td className="muted">{a.recorded || "—"}</td>
                        <td className="mono">{a.robloxId}</td>
                        <td>{a.inGroup ? `${a.rankName} (${a.rank})` : <span className="muted">not in group</span>}</td>
                        <td><b style={{ color: a.whitelisted ? "var(--success)" : a.removable ? "var(--danger)" : "var(--success)" }}>{a.whitelisted ? "whitelisted" : a.removable ? "would remove" : a.inGroup ? "protected" : "—"}</b></td>
                        <td>{a.removable ? <button className="btn danger" style={{ padding: "4px 10px" }} disabled={!!busy} onClick={() => act("kickRoblox", a.robloxId, "kick")}>Remove</button> : null}</td>
                      </tr>
                    ))}</tbody></table></div>
                </div>
              )}
              {lookupRes.robloxId && (
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <button className="btn danger" disabled={!!busy} onClick={() => act("kickDiscord", lookupRes.query, "kick")}>Remove {Array.isArray(lookupRes.accounts) && lookupRes.accounts.length > 1 ? "all accounts" : "from group"}</button>
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
          {!roster && busy !== "roster" && <p className="muted" style={{ marginTop: 8 }}>Loads everyone the bot has registered from staff-info, with their Roblox username, group rank, and whether they&apos;d be removed.</p>}
          {busy === "roster" && <p className="muted" style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}><span className="sb-spin" />Loading roster… (resolving Roblox names — a big list can take a moment)</p>}
          {roster && roster.length === 0 && busy !== "roster" && (
            <div style={{ marginTop: 12, padding: "14px 16px", border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface-2)", color: "var(--muted)", fontSize: 13.5, lineHeight: 1.5 }}>
              {rosterErr === "failed"
                ? <>Couldn&apos;t load the roster — the self-bot may be offline, or it timed out resolving Roblox names. Hit <b>Reload</b> to try again.</>
                : (st.staffIndexSize || 0) === 0
                  ? <>No staff indexed yet. The bot builds this list from the <b>staff-info channel</b> — run <b>Reindex staff</b> on the Overview tab, and make sure the staff-info channel is set under Settings.</>
                  : <>The index holds {st.staffIndexSize} record(s) but none came back — the bot may still be resolving them. Hit <b>Reload</b> in a moment.</>}
            </div>
          )}
          {roster && roster.length > 0 && (
            <div style={{ overflowX: "auto", marginTop: 10 }}>
              <table><thead><tr><th>Roblox user</th><th>Roblox ID</th><th>Discord ID</th><th>Group rank</th><th>Status</th><th></th></tr></thead>
                <tbody>{filteredStaff.map((s, i) => (
                  <tr key={i}>
                    <td>
                      {s.username || <span className="muted">—</span>}
                      {s.renamed && <span className="pill" title={`recorded as "${s.recorded}"`} style={{ marginLeft: 6, color: "var(--warning)", padding: "1px 7px" }}>renamed</span>}
                    </td>
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
          <div className="row" style={{ alignItems: "center", gap: 8 }}>
            <b style={{ marginRight: "auto" }}>Staff roles</b>
            <select value={roleGuild} onChange={(e) => switchRoleGuild(e.target.value)} style={{ minWidth: 170 }}>
              <option value="main">Main guild</option>
              <option value="leaderboard">Leaderboard guild</option>
            </select>
            <button className="btn ghost" disabled={!!busy} onClick={loadGuildRoles}>{guildRoles ? "Refresh role names" : "Load role names"}</button>
          </div>
          <p className="muted" style={{ margin: "4px 0 12px" }}>Staff roles for the <b>{roleGuild === "leaderboard" ? "leaderboard" : "main"} guild</b> (each guild has its own set). Anyone with one of these roles is staff there; losing the last one triggers an automatic removal (rank-guarded).</p>
          {roleGuild === "leaderboard" && !cfg.leaderboardGuildId && (
            <p style={{ margin: "0 0 12px", color: "var(--warning)", fontSize: 13 }}>Set the Leaderboard guild ID first (Settings → Leaderboard staff guild).</p>
          )}

          <div className="sb-chip-row" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {(cfg[roleKey()] || []).length === 0 && <span className="muted">No staff roles set for this guild.</span>}
            {(cfg[roleKey()] || []).map((id) => (
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
                {guildRoles.filter((r) => !(cfg[roleKey()] || []).map(String).includes(String(r.id))).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            ) : (
              <input value={roleAdd} onChange={(e) => setRoleAdd(e.target.value)} placeholder="Role ID" style={{ minWidth: 240 }} />
            )}
            <button className="btn" disabled={!roleAdd || !!busy} onClick={() => addStaffRole(roleAdd)}>Add role</button>
          </div>
          <p className="muted" style={{ margin: "10px 0 0", fontSize: 12 }}>Click "Load role names" to pick roles by name (needs the self-bot to be in the selected guild), or paste a role ID.</p>
        </div>
      )}

      {tab === "whitelist" && (
        <div className="card">
          <b>Roblox whitelist</b>
          <p className="muted" style={{ margin: "4px 0 12px" }}>These Roblox users are <b>never</b> removed from the group — even if they lose their staff role, leave the server, or get fired. Add a Roblox <b>ID</b> (exact, safest) or a <b>username</b>.</p>

          <div className="sb-chip-row" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {(cfg.whitelist || []).length === 0 && <span className="muted">No one whitelisted.</span>}
            {(cfg.whitelist || []).map((v) => (
              <span key={v} className="chip">
                {/^\d+$/.test(String(v)) ? <span className="mono">#{v}</span> : v}
                <button title="Remove" disabled={!!busy} onClick={() => removeWhitelist(v)}>×</button>
              </span>
            ))}
          </div>

          <div className="row">
            <input value={whitelistAdd} onChange={(e) => setWhitelistAdd(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addWhitelist(whitelistAdd); }} placeholder="Roblox ID or username" style={{ minWidth: 240 }} />
            <button className="btn" disabled={!whitelistAdd.trim() || !!busy} onClick={() => addWhitelist(whitelistAdd)}>Add to whitelist</button>
          </div>
          <p className="muted" style={{ margin: "10px 0 0", fontSize: 12 }}>Tip: a Roblox ID can't be changed, a username can — prefer the ID for accounts you must never touch.</p>

          <div style={{ borderTop: "1px solid var(--line)", margin: "18px 0 0", paddingTop: 16 }}>
            <b>Discord-user whitelist</b>
            <p className="muted" style={{ margin: "4px 0 12px" }}>Protect a <b>whole person</b> by their Discord ID — <b>every</b> Roblox account linked to them is safe, even if they lose their role or leave. Best when someone has multiple accounts.</p>
            <div className="sb-chip-row" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {(cfg.whitelistDiscord || []).length === 0 && <span className="muted">No Discord users whitelisted.</span>}
              {(cfg.whitelistDiscord || []).map((v) => (
                <span key={v} className="chip"><span className="mono">{v}</span><button title="Remove" disabled={!!busy} onClick={() => removeWhitelistDiscord(v)}>×</button></span>
              ))}
            </div>
            <div className="row">
              <input value={whitelistDiscordAdd} onChange={(e) => setWhitelistDiscordAdd(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addWhitelistDiscord(whitelistDiscordAdd); }} placeholder="Discord user ID (17–20 digits)" style={{ minWidth: 240 }} />
              <button className="btn" disabled={!whitelistDiscordAdd.trim() || !!busy} onClick={() => addWhitelistDiscord(whitelistDiscordAdd)}>Protect user</button>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--line)", margin: "18px 0 0", paddingTop: 16 }}>
            <div className="row" style={{ alignItems: "center" }}>
              <div style={{ marginRight: "auto" }}>
                <b>Ping automod</b>
                <div className="muted" style={{ fontSize: 13 }}>When anyone <b>not</b> whitelisted pings <span className="mono">@everyone</span>/<span className="mono">@here</span>, delete the message and strip every role the bot can remove.</div>
              </div>
              <button className={cfg.pingAutomodEnabled ? "btn" : "btn ghost"} disabled={busy === "ping"} onClick={togglePingAutomod}>{cfg.pingAutomodEnabled ? "On" : "Off"}</button>
            </div>
            <p className="muted" style={{ margin: "10px 0 6px", fontSize: 12 }}>Owners and authorized command users are always exempt. Stripping a staffer's roles also removes them from the group (the normal role-loss path). Only real pings trigger it — a message that just contains the text without permission to ping is ignored.</p>

            <div style={{ marginTop: 12 }}>
              <b style={{ fontSize: 13 }}>Allowed users</b>
              <p className="muted" style={{ margin: "2px 0 8px", fontSize: 12 }}>Discord user IDs allowed to ping everyone.</p>
              <div className="sb-chip-row" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {(cfg.pingWhitelist || []).length === 0 && <span className="muted">No users allowed to ping.</span>}
                {(cfg.pingWhitelist || []).map((v) => (
                  <span key={v} className="chip"><span className="mono">{v}</span><button title="Remove" disabled={!!busy} onClick={() => removePingWhitelist(v)}>×</button></span>
                ))}
              </div>
              <div className="row">
                <input value={pingWlAdd} onChange={(e) => setPingWlAdd(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addPingWhitelist(pingWlAdd); }} placeholder="Discord user ID (17–20 digits)" style={{ minWidth: 240 }} />
                <button className="btn" disabled={!pingWlAdd.trim() || !!busy} onClick={() => addPingWhitelist(pingWlAdd)}>Allow user</button>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <b style={{ fontSize: 13 }}>Allowed roles</b>
              <p className="muted" style={{ margin: "2px 0 8px", fontSize: 12 }}>Anyone holding one of these roles may ping everyone.</p>
              <div className="sb-chip-row" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {(cfg.pingWhitelistRoles || []).length === 0 && <span className="muted">No roles allowed to ping.</span>}
                {(cfg.pingWhitelistRoles || []).map((v) => (
                  <span key={v} className="chip"><span className="mono">{v}</span><button title="Remove" disabled={!!busy} onClick={() => removePingWhitelistRole(v)}>×</button></span>
                ))}
              </div>
              <div className="row">
                <input value={pingWlRoleAdd} onChange={(e) => setPingWlRoleAdd(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addPingWhitelistRole(pingWlRoleAdd); }} placeholder="Role ID (17–20 digits)" style={{ minWidth: 240 }} />
                <button className="btn" disabled={!pingWlRoleAdd.trim() || !!busy} onClick={() => addPingWhitelistRole(pingWlRoleAdd)}>Allow role</button>
              </div>
            </div>
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

      {tab === "presence" && form && (
        <>
        <div className="card">
          <b>Presence / RPC</b>
          <p className="muted" style={{ margin: "4px 0 12px" }}>How the self-bot account appears in Discord. Applies live on save.</p>
          <div className="sb-field"><span className="muted">Status</span>
            <select value={form.presenceStatus || "online"} onChange={(e) => setF("presenceStatus", e.target.value)}>
              <option value="online">Online</option><option value="idle">Idle</option><option value="dnd">Do Not Disturb</option><option value="invisible">Invisible</option>
            </select>
          </div>
          <div className="sb-field"><span className="muted">Activity type</span>
            <select value={form.presenceType || "none"} onChange={(e) => setF("presenceType", e.target.value)}>
              <option value="none">None</option><option value="custom">Custom status</option><option value="playing">Playing</option>
              <option value="streaming">Streaming</option><option value="listening">Listening</option><option value="watching">Watching</option><option value="competing">Competing</option>
            </select>
          </div>
          {form.presenceType === "custom" && (
            <>
              <div className="sb-field"><span className="muted">Emoji</span><input value={form.customEmoji || ""} onChange={(e) => setF("customEmoji", e.target.value)} placeholder="😎 or :name:" /></div>
              <div className="sb-field"><span className="muted">Status text</span><input value={form.presenceName || ""} onChange={(e) => setF("presenceName", e.target.value)} placeholder="feeling good" /></div>
            </>
          )}
          {form.presenceType !== "none" && form.presenceType !== "custom" && (
            <>
              <div className="sb-field"><span className="muted">Name</span><input value={form.presenceName || ""} onChange={(e) => setF("presenceName", e.target.value)} placeholder="ZHD" /></div>
              <div className="sb-field"><span className="muted">Details (line 1)</span><input value={form.presenceDetails || ""} onChange={(e) => setF("presenceDetails", e.target.value)} /></div>
              <div className="sb-field"><span className="muted">State (line 2)</span><input value={form.presenceState || ""} onChange={(e) => setF("presenceState", e.target.value)} /></div>
              {form.presenceType === "streaming" && (
                <div className="sb-field"><span className="muted">Stream URL</span><input value={form.streamUrl || ""} onChange={(e) => setF("streamUrl", e.target.value)} placeholder="https://twitch.tv/… or youtube.com/…" /></div>
              )}
              <div className="sb-field"><span className="muted">Show elapsed time</span><input type="checkbox" checked={!!form.presenceTimestamp} onChange={(e) => setF("presenceTimestamp", e.target.checked)} /></div>
              <div className="sb-field"><span className="muted">Large image URL</span><input value={form.presenceLargeImage || ""} onChange={(e) => setF("presenceLargeImage", e.target.value)} placeholder="https://…png (optional)" /></div>
              <div className="sb-field"><span className="muted">Button 1 (label / url)</span><span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><input value={form.presenceButton1Label || ""} onChange={(e) => setF("presenceButton1Label", e.target.value)} placeholder="label" style={{ width: 110 }} /><input value={form.presenceButton1Url || ""} onChange={(e) => setF("presenceButton1Url", e.target.value)} placeholder="https://…" style={{ width: 150 }} /></span></div>
              <div className="sb-field"><span className="muted">Button 2 (label / url)</span><span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><input value={form.presenceButton2Label || ""} onChange={(e) => setF("presenceButton2Label", e.target.value)} placeholder="label" style={{ width: 110 }} /><input value={form.presenceButton2Url || ""} onChange={(e) => setF("presenceButton2Url", e.target.value)} placeholder="https://…" style={{ width: 150 }} /></span></div>
            </>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn" disabled={busy === "save"} onClick={saveSettings}>Save &amp; apply</button>
            <button className="btn ghost" disabled={!!busy} onClick={applyPresenceNow}>Re-apply</button>
          </div>
        </div>
        <div className="card">
          <div className="sb-card-actions">
            <b style={{ marginRight: "auto" }}>Rotating status</b>
            <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={!!form.rotateEnabled} onChange={(e) => setF("rotateEnabled", e.target.checked)} /> enabled
            </label>
          </div>
          <p className="muted" style={{ margin: "6px 0 10px" }}>While enabled, cycles these lines (one per line) as the status — overrides the single presence above, using the type/status you picked.</p>
          <div className="sb-field"><span className="muted">Interval (seconds)</span><input value={form.rotateSeconds ?? 20} onChange={(e) => setF("rotateSeconds", parseInt(e.target.value || "0", 10))} style={{ width: 110 }} /></div>
          <textarea value={(form.rotateLines || []).join("\n")} onChange={(e) => setF("rotateLines", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} placeholder={"line one\nline two\nline three"} style={{ width: "100%", minHeight: 110, marginTop: 8 }} />
          <div style={{ marginTop: 10 }}><button className="btn" disabled={busy === "save"} onClick={saveSettings}>Save rotation</button></div>
        </div>
        </>
      )}

      {tab === "tools" && (
        <>
          <div className="card" style={{ borderColor: "var(--brand-line)" }}>
            <b>Cleanup — kick unregistered staff-rank members</b>
            <p className="muted" style={{ margin: "4px 0 12px" }}>Removes everyone currently on a <b>removable rank</b> in the group who has <b>no staff-info record</b>. It rebuilds the <b>entire</b> staff-info channel first and refuses to run unless the whole channel indexed — so a registered staffer is never mistaken for an orphan. Whitelists, the rank guard and dry-run all apply. <b>Always preview first.</b></p>
            <div className="row">
              <button className="btn" disabled={busy === "orphan"} onClick={doOrphanPreview}>{busy === "orphan" ? "Scanning…" : "Preview (no kicks)"}</button>
              {orphanRes && !orphanRes.error && Array.isArray(orphanRes.candidates) && orphanRes.candidates.length > 0 && (
                !confirmOrphan
                  ? <button className="btn danger" disabled={!!busy} onClick={() => setConfirmOrphan(true)}>Kick {orphanRes.candidates.length}…</button>
                  : <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span className="muted">Remove {Math.min(orphanRes.candidates.length, 200)}{orphanRes.candidates.length > 200 ? " (first 200)" : ""}?</span>
                      <button className="btn danger" disabled={!!busy} onClick={doOrphanPurge}>Yes, kick them</button>
                      <button className="btn ghost" disabled={!!busy} onClick={() => setConfirmOrphan(false)}>Cancel</button>
                    </span>
              )}
            </div>
            {orphanRes && orphanRes.error && <p style={{ marginTop: 10, color: "var(--danger)" }}>{orphanRes.error}</p>}
            {orphanRes && !orphanRes.error && orphanRes.processed === undefined && (
              <div style={{ marginTop: 10 }}>
                <p className="muted" style={{ margin: "0 0 8px" }}>Scanned {orphanRes.scanned} member(s) across {Array.isArray(orphanRes.removableRanks) ? orphanRes.removableRanks.length : 0} removable rank(s) · {orphanRes.registeredCount} registered Roblox account(s) on file · <b style={{ color: orphanRes.candidates.length ? "var(--danger)" : "var(--success)" }}>{orphanRes.candidates.length} unregistered</b>.</p>
                {Array.isArray(orphanRes.perRank) && orphanRes.perRank.length > 0 && (
                  <p className="muted" style={{ margin: "0 0 8px", fontSize: 12 }}>Ranks checked: {orphanRes.perRank.map((p) => `${p.name} (${p.rank}) — ${p.scanned}/${p.expected ?? "?"}`).join(" · ")}</p>
                )}
                {Array.isArray(orphanRes.failedRanks) && orphanRes.failedRanks.length > 0 && (
                  <>
                    {orphanRes.failHint && <p style={{ margin: "0 0 6px", color: "var(--danger)", fontSize: 13 }}>⚠ {orphanRes.failHint}</p>}
                    <p style={{ margin: "0 0 8px", color: "var(--muted)", fontSize: 12 }}>Ranks not read: {orphanRes.failedRanks.join(", ")}</p>
                  </>
                )}
                {orphanRes.scanned === 0 && (!orphanRes.failedRanks || !orphanRes.failedRanks.length) && (
                  <p style={{ margin: "0 0 8px", color: "var(--warning)", fontSize: 12 }}>Scanned 0 — the removable ranks have no members, or the group id/cookie is off. Check the "Ranks checked" line above.</p>
                )}
                {orphanRes.candidates.length > 0 && (
                  <div style={{ overflowX: "auto", maxHeight: 320, overflowY: "auto" }}><table><thead><tr><th>Roblox user</th><th>Roblox ID</th><th>Rank</th></tr></thead>
                    <tbody>{orphanRes.candidates.map((c, i) => (
                      <tr key={i}><td>{c.username || <span className="muted">—</span>}</td><td className="mono">{c.robloxId}</td><td>{c.rankName} <span className="muted">({c.rank})</span></td></tr>
                    ))}</tbody></table></div>
                )}
              </div>
            )}
            {orphanRes && orphanRes.processed !== undefined && (
              <div style={{ marginTop: 10 }}>
                <p className="muted" style={{ margin: 0 }}>
                  {orphanRes.dryRun
                    ? <><b style={{ color: "var(--warning)" }}>Dry-run</b> — would remove {orphanRes.dryrun ?? 0} of {orphanRes.total}. Turn off dry-run (Settings) to remove for real.</>
                    : <><b style={{ color: "var(--success)" }}>{orphanRes.removed ?? 0} removed</b>{(orphanRes.failed ?? 0) > 0 ? <>, <b style={{ color: "var(--danger)" }}>{orphanRes.failed} failed</b></> : null}{(orphanRes.skipped ?? 0) > 0 ? `, ${orphanRes.skipped} already gone` : ""}{(orphanRes.protected ?? 0) > 0 ? `, ${orphanRes.protected} protected` : ""}.</>}
                  {orphanRes.capped ? " (capped at 200 — run again for the rest)" : ""}
                </p>
                {orphanRes.failedHint && <p style={{ margin: "6px 0 0", color: "var(--danger)", fontSize: 13 }}>{orphanRes.failedHint}</p>}
              </div>
            )}
          </div>
          <div className="card">
            <b>DM purge</b>
            <p className="muted" style={{ margin: "4px 0 12px" }}>Delete the self-bot's own messages in a DM with a user (one by one — may take a moment).</p>
            <div className="row">
              <input value={purgeTarget} onChange={(e) => setPurgeTarget(e.target.value)} placeholder="Discord user ID" style={{ minWidth: 220 }} />
              <input value={purgeLimit} onChange={(e) => setPurgeLimit(e.target.value)} placeholder="count" style={{ width: 90 }} />
              <button className="btn danger" disabled={!!busy} onClick={doPurge}>Purge my DMs</button>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={purgeClose} onChange={(e) => setPurgeClose(e.target.checked)} /> close DM after</label>
              <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>only older than <input value={purgeOlder} onChange={(e) => setPurgeOlder(e.target.value)} placeholder="days" style={{ width: 64 }} /> days</label>
              <span className="muted" style={{ fontSize: 12 }}>(applies to both purges)</span>
            </div>
            {purgeRes && <p className="muted" style={{ marginTop: 10 }}>{purgeRes.ok ? `Deleted ${purgeRes.deleted} message(s) (scanned ${purgeRes.scanned}).` : `Error: ${purgeRes.error || "failed"}`}</p>}
          </div>
          <div className="card" style={{ borderColor: "var(--brand-line)" }}>
            <b>Purge ALL DMs</b>
            <p className="muted" style={{ margin: "4px 0 12px" }}>Deletes <b>every message the self-bot has sent</b> across <b>all</b> of its DM channels (up to the count each). This cannot be undone.</p>
            {!confirmAll ? (
              <button className="btn danger" disabled={!!busy} onClick={() => setConfirmAll(true)}>Purge all my DMs…</button>
            ) : (
              <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span className="muted">Delete everything?</span>
                <button className="btn danger" disabled={!!busy} onClick={doPurgeAll}>Yes, delete all</button>
                <button className="btn ghost" disabled={!!busy} onClick={() => setConfirmAll(false)}>Cancel</button>
              </span>
            )}
            {purgeAllRes && <p className="muted" style={{ marginTop: 10 }}>{purgeAllRes.ok ? `Deleted ${purgeAllRes.deleted} message(s) across ${purgeAllRes.channels} DM(s).` : `Error: ${purgeAllRes.error || "failed"}`}</p>}
          </div>
          {form && (
            <div className="card">
              <div className="sb-card-actions">
                <b style={{ marginRight: "auto" }}>Auto-reply (AFK)</b>
                <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="checkbox" checked={!!form.autoReplyEnabled} onChange={(e) => setF("autoReplyEnabled", e.target.checked)} /> enabled
                </label>
              </div>
              <p className="muted" style={{ margin: "6px 0 10px" }}>Auto-responds to incoming DMs with this message.</p>
              <p style={{ margin: "0 0 10px", padding: "8px 10px", borderRadius: 10, background: "var(--danger-soft)", color: "var(--warning)", fontSize: 12.5 }}>⚠ Auto-replying to DMs is the single biggest self-bot flag trigger — it can get the account limited. This build now waits 30–90s before each reply, spaces replies out, and caps them per day, but nothing makes it 100% safe. Keep the daily cap low and the message plain.</p>
              <textarea value={form.autoReplyMessage || ""} onChange={(e) => setF("autoReplyMessage", e.target.value)} placeholder="I'm away right now — I'll get back to you soon." style={{ width: "100%", minHeight: 70 }} />
              <div className="sb-field" style={{ marginTop: 8 }}><span className="muted">Only reply once per user</span><input type="checkbox" checked={form.autoReplyOncePerUser !== false} onChange={(e) => setF("autoReplyOncePerUser", e.target.checked)} /></div>
              <div className="row" style={{ marginTop: 8, gap: 12 }}>
                <label className="muted" style={{ fontSize: 12 }}>Min gap (sec)<br /><input type="number" value={form.autoReplyMinGapSeconds ?? 120} onChange={(e) => setF("autoReplyMinGapSeconds", Number(e.target.value) || 120)} style={{ width: 100 }} /></label>
                <label className="muted" style={{ fontSize: 12 }}>Daily cap<br /><input type="number" value={form.autoReplyDailyCap ?? 20} onChange={(e) => setF("autoReplyDailyCap", Number(e.target.value) || 20)} style={{ width: 100 }} /></label>
              </div>
              <div style={{ marginTop: 10 }}><button className="btn" disabled={busy === "save"} onClick={saveSettings}>Save auto-reply</button></div>
            </div>
          )}

          <div className="card">
            <b>DM blast</b>
            <p className="muted" style={{ margin: "4px 0 10px" }}>Send a DM to one or many users (space/comma-separated IDs).</p>
            <input value={blastTargets} onChange={(e) => setBlastTargets(e.target.value)} placeholder="user id, user id, …" style={{ width: "100%", marginBottom: 8 }} />
            <textarea value={blastContent} onChange={(e) => setBlastContent(e.target.value)} placeholder="Message…" style={{ width: "100%", minHeight: 70 }} />
            <div style={{ marginTop: 10 }}><button className="btn" disabled={!!busy} onClick={doBlast}>Send DM</button></div>
            {blastRes && <p className="muted" style={{ marginTop: 10 }}>{blastRes.ok ? `Sent to ${blastRes.sent}${blastRes.failed && blastRes.failed.length ? ` · failed: ${blastRes.failed.join(", ")}` : ""}.` : `Error: ${blastRes.error || "failed"}`}</p>}
          </div>

          <div className="card">
            <b>Say to channel</b>
            <p className="muted" style={{ margin: "4px 0 10px" }}>Post a message to any channel the account can see (by channel ID).</p>
            <div className="row">
              <input value={sayChannel} onChange={(e) => setSayChannel(e.target.value)} placeholder="channel ID" style={{ minWidth: 200 }} />
            </div>
            <textarea value={sayContent} onChange={(e) => setSayContent(e.target.value)} placeholder="Message…" style={{ width: "100%", minHeight: 60, marginTop: 8 }} />
            <div style={{ marginTop: 10 }}><button className="btn" disabled={!!busy} onClick={doSay}>Send</button></div>
            {sayRes && <p className="muted" style={{ marginTop: 10 }}>{sayRes.ok ? "Sent." : `Error: ${sayRes.error || "failed"}`}</p>}
          </div>

          <div className="card">
            <div className="sb-card-actions">
              <b style={{ marginRight: "auto" }}>Servers {guilds ? `(${guilds.length})` : ""}</b>
              <button className="btn ghost" disabled={!!busy} onClick={loadGuilds}>{guilds ? "Reload" : "Load"}</button>
            </div>
            {guilds && (
              <div style={{ overflowX: "auto", marginTop: 10 }}>
                <table><thead><tr><th>Server</th><th>Members</th><th>ID</th><th></th></tr></thead>
                  <tbody>{guilds.map((g) => (
                    <tr key={g.id}>
                      <td>{g.name}</td>
                      <td className="mono">{g.members ?? "—"}</td>
                      <td className="mono">{g.id}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="btn ghost" style={{ padding: "4px 10px" }} onClick={() => { setNickGuild(g.id); }}>Nick</button>
                        <button className="btn danger" style={{ padding: "4px 10px", marginLeft: 6 }} disabled={!!busy} onClick={() => doLeave(g)}>Leave</button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <b>Set nickname</b>
            <p className="muted" style={{ margin: "4px 0 10px" }}>Change the self-bot's nickname in a server (leave blank to clear). Tip: hit "Nick" on a row in Servers to fill the ID.</p>
            <div className="row">
              <input value={nickGuild} onChange={(e) => setNickGuild(e.target.value)} placeholder="server ID" style={{ minWidth: 180 }} />
              <input value={nickValue} onChange={(e) => setNickValue(e.target.value)} placeholder="new nickname" style={{ minWidth: 180 }} />
              <button className="btn" disabled={!!busy} onClick={doNick}>Set</button>
            </div>
            {nickRes && <p className="muted" style={{ marginTop: 10 }}>{nickRes.ok ? "Nickname updated." : `Error: ${nickRes.error || "failed"}`}</p>}
          </div>

          <div className="card">
            <div className="sb-card-actions">
              <b style={{ marginRight: "auto" }}>Maintenance</b>
              <button className="btn ghost" disabled={!!busy} onClick={doReindex}>Reindex staff</button>
              <button className="btn ghost" disabled={!!busy} onClick={doSync}>Sync now</button>
              <button className="btn ghost" disabled={!!busy} onClick={applyPresenceNow}>Re-apply presence</button>
            </div>
          </div>
        </>
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

      {tab === "access" && isOwner && (
        <div className="card">
          <b>Dashboard access</b>
          <p className="muted" style={{ margin: "4px 0 12px" }}>By default only super owners can open this page. Add a Discord <b>user ID</b> here to let that person view and use the dashboard too. Only you (super owner) can change this list, set credentials, or manage access.</p>

          <div className="sb-chip-row" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <span className="chip" style={{ opacity: 0.7 }}>You (super owner)<span className="mono muted" style={{ fontSize: 11 }}>&nbsp;{me}</span></span>
            {(cfg.dashboardViewers || []).length === 0 && <span className="muted">No extra viewers.</span>}
            {(cfg.dashboardViewers || []).map((id) => (
              <span key={id} className="chip">
                <span className="mono">{id}</span>
                <button title="Remove" disabled={!!busy} onClick={() => removeViewer(id)}>×</button>
              </span>
            ))}
          </div>

          <div className="row">
            <input value={viewerAdd} onChange={(e) => setViewerAdd(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addViewer(viewerAdd); }} placeholder="Discord user ID (17–20 digits)" style={{ minWidth: 260 }} />
            <button className="btn" disabled={!viewerAdd.trim() || !!busy} onClick={() => addViewer(viewerAdd)}>Grant access</button>
          </div>
          <p className="muted" style={{ margin: "10px 0 0", fontSize: 12 }}>They sign in with Discord at the same URL — access is checked against this list on every request.</p>
        </div>
      )}

      </div>

      {toast && <div style={{ position: "fixed", right: 18, bottom: 18, background: "var(--surface-3)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 14px", boxShadow: "var(--shadow)", animation: "sbRise .25s ease" }}>{toast}</div>}
      {busy && (
        <div style={{ position: "fixed", left: 18, bottom: 18, display: "flex", alignItems: "center", gap: 9, background: "var(--surface-3)", border: "1px solid var(--line)", borderRadius: 12, padding: "9px 14px", boxShadow: "var(--shadow)", fontSize: 13, fontWeight: 500, animation: "sbRise .2s ease", zIndex: 40 }}>
          <span className="sb-spin" />{busyLabel(busy)}
        </div>
      )}
    </Shell>
  );
}

const SB_CSS = `
/* Scoped to this page only — smaller buttons, rounder boxes. */
.sb-root .btn{width:auto;padding:6.5px 12px;font-size:12.5px;border-radius:10px;gap:6px}
.sb-root .row>.btn{min-width:0}
.sb-root .card{border-radius:20px;padding:20px}
.sb-root .sb-stat{border-radius:16px}
.sb-root input,.sb-root select,.sb-root textarea{border-radius:11px}
.sb-root .chip{border-radius:9px}
.sb-root .sb-tabs>button{padding:9px 13px;font-size:13px}
.sb-root .sb-stat .muted{font-size:11px}
.sb-root .pill{font-size:11px;padding:3px 9px}
.ph{flex-wrap:wrap}
.ph-actions{flex-wrap:wrap}
.sb-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.sb-actions>button{width:auto!important;min-width:0}
.sb-tabs{display:flex;gap:2px;overflow-x:auto;flex-wrap:nowrap;border-bottom:1px solid var(--line);margin:18px 0 4px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.sb-tabs::-webkit-scrollbar{display:none}
.sb-tabs>button{flex:0 0 auto;width:auto!important;white-space:nowrap;border:0;border-radius:0;padding:10px 14px;background:transparent;font-weight:600}
.sb-stats{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
.sb-card-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.sb-card-actions .btn{width:auto!important;min-width:0}
.sb-field{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--line-soft)}
.sb-field input{max-width:260px}

/* Motion + strokes to match the site */
@keyframes sbFade{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
@keyframes sbRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes sbPulse{0%,100%{opacity:1;box-shadow:0 0 0 0 var(--pulse,rgba(74,222,128,.5))}50%{opacity:.55;box-shadow:0 0 0 4px transparent}}
@keyframes sbSpin{to{transform:rotate(360deg)}}
.sb-view{animation:sbFade .3s ease both}
.sb-head{animation:sbRise .4s ease both}
.sb-tabs{animation:sbRise .4s .04s ease both}
.sb-stats>*{animation:sbRise .4s ease both}
.sb-stats>*:nth-child(2){animation-delay:.03s}.sb-stats>*:nth-child(3){animation-delay:.06s}
.sb-stats>*:nth-child(4){animation-delay:.09s}.sb-stats>*:nth-child(5){animation-delay:.12s}
.sb-stats>*:nth-child(6){animation-delay:.15s}.sb-stats>*:nth-child(7){animation-delay:.18s}
.sb-stats>*:nth-child(8){animation-delay:.21s}.sb-stats>*:nth-child(9){animation-delay:.24s}
.sb-stat{background:linear-gradient(180deg,var(--surface-2),var(--bg-2));border:1px solid var(--line);border-radius:var(--radius-sm);padding:14px 15px;transition:border-color .2s,transform .2s,box-shadow .2s;position:relative;overflow:hidden}
.sb-stat::before{content:"";position:absolute;inset:0 auto 0 0;width:2px;background:var(--brand);opacity:0;transition:opacity .2s}
.sb-stat:hover{border-color:var(--brand-line);transform:translateY(-2px);box-shadow:0 12px 26px -18px var(--brand-glow)}
.sb-stat:hover::before{opacity:1}
.sb-tabs>button{transition:color .16s,border-color .16s}
.sb-tabs>button:hover{color:var(--text)}
.sb-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:7px;vertical-align:middle;animation:sbPulse 2s ease-in-out infinite}
.sb-view .card{animation:sbFade .32s ease both}
.sb-view .card:nth-child(2){animation-delay:.05s}.sb-view .card:nth-child(3){animation-delay:.1s}
.sb-view table tbody tr{transition:background .13s}
.sb-view table tbody tr:hover{background:var(--surface-2)}
.sb-chip-row .chip{animation:sbFade .22s ease both}
.sb-spin{display:inline-block;width:13px;height:13px;border:2px solid var(--line);border-top-color:var(--brand);border-radius:50%;animation:sbSpin .7s linear infinite;vertical-align:-2px;margin-right:7px}
@media(prefers-reduced-motion:reduce){*{animation:none!important}}
@media(max-width:560px){
  .sb-stats{grid-template-columns:1fr 1fr}
  .ph-title{font-size:22px!important}
  .ph{gap:10px}
  .sb-field{flex-direction:column;align-items:stretch;gap:6px}
  .sb-field input{max-width:100%;width:100%}
  .sb-field span:first-child{font-size:13px}
}
`;

function Shell({ me, children }) {
  return (
    <div className="sb-root">
      <style dangerouslySetInnerHTML={{ __html: SB_CSS }} />
      {children}
      <p className="muted" style={{ marginTop: 26, fontSize: 12 }}>Signed in as {me} · super owner</p>
    </div>
  );
}
function Stat({ label, value, tone }) {
  return (
    <div className="sb-stat">
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
    <div className="sb-field">
      <span className="muted">{label}</span>
      <input value={val}
        onChange={(e) => onChange(type === "ids" ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : type === "int" ? parseInt(e.target.value || "0", 10) : e.target.value)} />
    </div>
  );
}
