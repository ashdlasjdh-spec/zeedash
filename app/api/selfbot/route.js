import { getSession } from "@/lib/session";
import { isSuperOwner } from "@/lib/permissions";
import { botAuthed, guardBot } from "@/lib/botauth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

// Control channel for the ZHD self-bot (which runs inside the Zee Hood bot
// process). Both apps share this Postgres, so we talk through a small
// `selfbot_kv` table — no separate service, URL, or shared secret needed.
// The token/cookie/settings are entered here and picked up by the bot.
export const dynamic = "force-dynamic";

const DEFAULTS = {
  managedGroupId: "1099600954", crraamsGroupId: "1099600954",
  staffMinRank: 234, staffMaxRank: 0, staffRankIds: [], removeAnyRank: false,
  guildId: "1447037325380157452", staffInfoChannelId: "1494154502851268748",
  // Leaderboard-staff registry: separate guild/channel. Records here are indexed
  // (protected from the orphan purge) but not auto-kicked by main-guild roles.
  leaderboardGuildId: "1496219608800170004", leaderboardChannels: ["1498891974516805652"], leaderboardStaffRoleIds: [],
  logChannelId: "", staffRoleIds: ["1451419100030173294"], authorizedUserIds: [],
  whitelist: [], // Roblox ids/usernames that are never removed from the group
  whitelistDiscord: [], // Discord user ids whose every linked account is protected
  // Ping automod: an @everyone/@here ping from anyone not whitelisted → message
  // deleted + roles stripped. Whitelist by Discord user id and/or by role id.
  pingAutomodEnabled: false, pingWhitelist: [], pingWhitelistRoles: [],
  dryRun: false, kickOnStaffRoleRemoved: true, requireStaffRoleForFire: false, auditWatcherEnabled: true,
  auditPollSeconds: 100, roleReconcileSeconds: 60, staffRefreshSeconds: 30, kickCooldownSeconds: 300, memberRefreshSeconds: 60, staffInfoHistoryLimit: 0, membershipCacheSeconds: 30, robloxConcurrency: 2,
  // Presence / RPC
  presenceStatus: "online", presenceType: "none", presenceName: "", presenceDetails: "", presenceState: "",
  streamUrl: "", customEmoji: "", presenceTimestamp: false, presenceLargeImage: "", presenceLargeText: "",
  presenceButton1Label: "", presenceButton1Url: "", presenceButton2Label: "", presenceButton2Url: "",
  // Automation
  rotateEnabled: false, rotateSeconds: 20, rotateLines: [],
  autoReplyEnabled: false, autoReplyMessage: "", autoReplyOncePerUser: true,
  autoReplyMinGapSeconds: 120, autoReplyDailyCap: 20, // safety governor for AFK auto-reply
};
const EDITABLE = Object.keys(DEFAULTS);

// Read-only actions a whitelisted (non-owner) viewer may run. Everything else —
// kicks, DMs, presence, purges, leave/nick, sync/reconcile, orphan purge,
// connect/disconnect — is owner-only.
const VIEWER_ACTIONS = new Set([
  "status", "events", "reindex", "wouldkick", "liststaff", "roster",
  "guildroles", "ranks", "lookup", "listguilds", "orphanpreview",
]);

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  await query(
    "create table if not exists selfbot_kv (key text primary key, value jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now())",
  );
  ensured = true;
}
async function kvGet(key) {
  const rows = await query("select value from selfbot_kv where key=$1", [key]);
  return rows[0] ? rows[0].value : null;
}
async function kvSet(key, value) {
  await query(
    "insert into selfbot_kv (key,value,updated_at) values ($1,$2::jsonb,now()) on conflict (key) do update set value=excluded.value, updated_at=now()",
    [key, JSON.stringify(value)],
  );
}

// Never hand a raw exception message (DB errors, internal paths) to a browser client. Log it
// server-side for debugging and return a generic 500.
function fail(e, where) {
  console.error(`[selfbot-api] ${where}:`, e?.message || e);
  return NextResponse.json({ error: "Server error." }, { status: 500 });
}

async function requireOwner() {
  const s = await getSession();
  return s && isSuperOwner(s.id) ? s : null;
}

// Anyone allowed to VIEW/use the dashboard: super owners + whitelisted viewers.
async function requireAccess() {
  const s = await getSession();
  if (!s) return null;
  if (isSuperOwner(s.id)) return s;
  const cfg = (await kvGet("config")) || {};
  const viewers = Array.isArray(cfg.dashboardViewers) ? cfg.dashboardViewers.map(String) : [];
  return viewers.includes(String(s.id)) ? s : null;
}

function publicView(cfg) {
  const c = { ...DEFAULTS, ...(cfg || {}) };
  const view = {};
  for (const k of EDITABLE) view[k] = c[k];
  view.hasToken = !!c.discordToken;
  view.hasCookie = !!c.roblosecurity;
  view.tokenHint = c.discordToken ? "••••" + String(c.discordToken).slice(-4) : "(unset)";
  view.cookieHint = c.roblosecurity ? "••••" + String(c.roblosecurity).slice(-4) : "(unset)";
  view.desiredConnected = c.desiredConnected !== false;
  view.dashboardViewers = Array.isArray(c.dashboardViewers) ? c.dashboardViewers.map(String) : [];
  return view;
}

export async function GET(req) {
  // Bot-facing branch: the in-process runner pulls its live config + queued command over HTTP with a
  // Bearer CRON_SECRET (no session cookie). This is the control channel — the two apps don't share a
  // Postgres, so the runner can't read selfbot_kv directly.
  if ((req.headers.get("authorization") || "").length) {
    const denied = guardBot(req);
    if (denied) return denied;
    try {
      await ensureTable();
      const [cfg, command] = await Promise.all([kvGet("config"), kvGet("command")]);
      return NextResponse.json({ config: cfg || {}, command: command || null });
    } catch (e) {
      return fail(e, "GET bot");
    }
  }
  try {
    await ensureTable();
    if (!(await requireAccess())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const [cfg, status, result] = await Promise.all([kvGet("config"), kvGet("status"), kvGet("command_result")]);
    return NextResponse.json({
      settings: publicView(cfg),
      status: status || { connected: false, staffIndexSize: 0, auditEnabled: false },
      result: result || null,
    });
  } catch (e) {
    return fail(e, "GET");
  }
}

export async function POST(req) {
  // Bot-facing branch: the runner reports its heartbeat/status and command results back over HTTP.
  if ((req.headers.get("authorization") || "").length) {
    const denied = guardBot(req);
    if (denied) return denied;
    try {
      await ensureTable();
      const body = await req.json().catch(() => ({}));
      const writes = [];
      if (body.status !== undefined) writes.push(kvSet("status", body.status));
      if (body.commandResult !== undefined) writes.push(kvSet("command_result", body.commandResult));
      // The runner acks a consumed command by echoing its id; clear the queue so it isn't re-run.
      if (body.consumedCommandId !== undefined) {
        const cur = await kvGet("command");
        if (cur && cur.id === body.consumedCommandId) writes.push(kvSet("command", null));
      }
      await Promise.all(writes);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return fail(e, "POST bot");
    }
  }
  try {
    await ensureTable();
    // Managing viewers and setting credentials are super-owner-only; everything
    // else is available to any whitelisted viewer.
    const owner = await requireOwner();
    const access = owner || (await requireAccess());
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const cfg = (await kvGet("config")) || {};

    // Super-owner-only: manage who can view the dashboard.
    if (body.kind === "access") {
      if (!owner) return NextResponse.json({ error: "Owner only" }, { status: 403 });
      const p = body.payload || {};
      const cur = Array.isArray(cfg.dashboardViewers) ? cfg.dashboardViewers.map(String) : [];
      let next = cur;
      const id = String(p.id || "").trim();
      if (p.action === "add" && /^\d{17,20}$/.test(id) && !cur.includes(id)) next = [...cur, id];
      else if (p.action === "remove") next = cur.filter((x) => x !== id);
      else if (p.action !== "remove" && !/^\d{17,20}$/.test(id)) return NextResponse.json({ error: "invalid Discord id" }, { status: 400 });
      await kvSet("config", { ...cfg, dashboardViewers: next });
      return NextResponse.json({ ok: true, dashboardViewers: next });
    }

    // Changing settings/safety config is owner-only — a viewer must not be able to
    // disable dry-run, clear staff roles, or edit whitelists.
    if (body.kind === "settings") {
      if (!owner) return NextResponse.json({ error: "Owner only" }, { status: 403 });
      const patch = {};
      const p = body.payload || {};
      for (const k of EDITABLE) if (k in p) patch[k] = p[k];
      const next = { ...cfg, ...patch };
      await kvSet("config", next);
      return NextResponse.json({ ok: true, settings: publicView(next) });
    }
    if (body.kind === "secrets") {
      if (!owner) return NextResponse.json({ error: "Owner only" }, { status: 403 });
      const p = body.payload || {};
      const patch = {};
      if (p.discordToken) patch.discordToken = String(p.discordToken);
      if (p.roblosecurity) patch.roblosecurity = String(p.roblosecurity);
      await kvSet("config", { ...cfg, ...patch });
      return NextResponse.json({ ok: true });
    }
    if (body.kind === "action") {
      const action = body.payload && body.payload.action;
      // Whitelisted viewers get READ-ONLY actions only. Everything that changes
      // state, removes people, or sends anything outward is owner-only.
      if (!owner && !VIEWER_ACTIONS.has(action)) {
        return NextResponse.json({ error: "Owner only — viewers have read-only access" }, { status: 403 });
      }
      if (action === "connect" || action === "disconnect") {
        await kvSet("config", { ...cfg, desiredConnected: action === "connect" });
        return NextResponse.json({ ok: true });
      }
      // One-shot commands the in-process bot polls for and answers via command_result.
      const id = Date.now();
      await kvSet("command", { id, action, arg: (body.payload && body.payload.arg) ?? null });
      return NextResponse.json({ ok: true, queued: true, id });
    }
    return NextResponse.json({ error: "unknown kind" }, { status: 400 });
  } catch (e) {
    return fail(e, "POST");
  }
}
