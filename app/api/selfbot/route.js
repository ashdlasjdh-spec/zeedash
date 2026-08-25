import { getSession } from "@/lib/session";
import { isSuperOwner } from "@/lib/permissions";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

// Control channel for the ZHD self-bot (which runs inside the Zee Hood bot
// process). Both apps share this Postgres, so we talk through a small
// `selfbot_kv` table — no separate service, URL, or shared secret needed.
// The token/cookie/settings are entered here and picked up by the bot.
export const dynamic = "force-dynamic";

const DEFAULTS = {
  managedGroupId: "1099600954", crraamsGroupId: "1099600954",
  staffMinRank: 234, staffMaxRank: 0, staffRankIds: [],
  guildId: "1447037325380157452", staffInfoChannelId: "1494154502851268748",
  logChannelId: "", staffRoleIds: ["1451419100030173294"], authorizedUserIds: [],
  dryRun: false, kickOnStaffRoleRemoved: true, requireStaffRoleForFire: false,
  auditPollSeconds: 100, staffInfoHistoryLimit: 200, membershipCacheSeconds: 30, robloxConcurrency: 2,
  // Presence / RPC
  presenceStatus: "online", presenceType: "none", presenceName: "", presenceDetails: "", presenceState: "",
  streamUrl: "", customEmoji: "", presenceTimestamp: false, presenceLargeImage: "", presenceLargeText: "",
  presenceButton1Label: "", presenceButton1Url: "", presenceButton2Label: "", presenceButton2Url: "",
  // Automation
  rotateEnabled: false, rotateSeconds: 20, rotateLines: [],
  autoReplyEnabled: false, autoReplyMessage: "", autoReplyOncePerUser: true,
};
const EDITABLE = Object.keys(DEFAULTS);

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

async function requireOwner() {
  const s = await getSession();
  return s && isSuperOwner(s.id) ? s : null;
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
  return view;
}

export async function GET() {
  if (!(await requireOwner())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    await ensureTable();
    const [cfg, status, result] = await Promise.all([kvGet("config"), kvGet("status"), kvGet("command_result")]);
    return NextResponse.json({
      settings: publicView(cfg),
      status: status || { connected: false, staffIndexSize: 0, auditEnabled: false },
      result: result || null,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  if (!(await requireOwner())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    await ensureTable();
    const body = await req.json().catch(() => ({}));
    const cfg = (await kvGet("config")) || {};

    if (body.kind === "settings") {
      const patch = {};
      const p = body.payload || {};
      for (const k of EDITABLE) if (k in p) patch[k] = p[k];
      const next = { ...cfg, ...patch };
      await kvSet("config", next);
      return NextResponse.json({ ok: true, settings: publicView(next) });
    }
    if (body.kind === "secrets") {
      const p = body.payload || {};
      const patch = {};
      if (p.discordToken) patch.discordToken = String(p.discordToken);
      if (p.roblosecurity) patch.roblosecurity = String(p.roblosecurity);
      await kvSet("config", { ...cfg, ...patch });
      return NextResponse.json({ ok: true });
    }
    if (body.kind === "action") {
      const action = body.payload && body.payload.action;
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
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
