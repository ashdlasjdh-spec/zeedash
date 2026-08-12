import { Pool } from "pg";
import { postLog } from "./discord";

let pool;
export function db() {
  if (!pool) {
    const url = process.env.DATABASE_URL || "";
    // Railway (and most hosted Postgres) require SSL. Only skip it for local dev.
    const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    pool = new Pool({
      connectionString: url,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      // Never hang forever on an unreachable/slow DB (pg has no default timeout).
      connectionTimeoutMillis: 8000,
      query_timeout: 12000,
      idleTimeoutMillis: 10000,
    });
  }
  return pool;
}

export async function query(text, params) {
  const res = await db().query(text, params);
  return res.rows;
}

// The dashboard owns three tables that live alongside the perks-api's tables in
// the same Postgres. They may not exist yet (fresh DB / never ran schema.sql), so
// create them on demand — idempotent, run once per process. Without this, the very
// first grant or group action fails with `relation "audit_log" does not exist`.
let schemaReady;
export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = db()
      .query(`
        create table if not exists whitelist (
          discord_id text primary key,
          role       text not null default 'staff',
          note       text,
          added_by   text,
          added_at   timestamptz not null default now()
        );
        create table if not exists config (
          key        text primary key,
          value      text not null,
          updated_by text,
          updated_at timestamptz not null default now()
        );
        create table if not exists audit_log (
          id         bigserial primary key,
          actor_id   text not null,
          actor_name text,
          action     text not null,
          category   text,
          item_key   text,
          target     text,
          detail     text,
          created_at timestamptz not null default now()
        );
        create table if not exists grant_expiry (
          user_id    text not null,
          category   text not null,
          item_key   text not null,
          expires_at timestamptz not null,
          granted_by text,
          created_at timestamptz not null default now(),
          primary key (user_id, category, item_key)
        );
        create index if not exists grant_expiry_due on grant_expiry (expires_at);
        -- Overview / Analytics / top-movers all range-scan and order audit_log by time.
        create index if not exists audit_log_created on audit_log (created_at desc);
        create index if not exists audit_log_actor_created on audit_log (actor_name, created_at desc);
        -- Per-guild daily server analytics (messages/reactions/voice), pushed by the bot.
        create table if not exists server_stats (
          guild_id      text not null,
          day           date not null,
          guild_name    text,
          messages      bigint not null default 0,
          reactions     bigint not null default 0,
          voice_minutes bigint not null default 0,
          members       integer,
          updated_at    timestamptz not null default now(),
          primary key (guild_id, day)
        );
        create table if not exists channel_stats (
          guild_id     text not null,
          channel_id   text not null,
          day          date not null,
          channel_name text,
          messages     bigint not null default 0,
          primary key (guild_id, channel_id, day)
        );
        create index if not exists server_stats_guild_day on server_stats (guild_id, day desc);
        create index if not exists channel_stats_guild_day on channel_stats (guild_id, day desc);
        -- Per-member activity (for the server leaderboard). Counts only, no message content.
        create table if not exists member_stats (
          guild_id      text not null,
          user_id       text not null,
          day           date not null,
          username      text,
          messages      bigint not null default 0,
          reactions     bigint not null default 0,
          voice_minutes bigint not null default 0,
          primary key (guild_id, user_id, day)
        );
        create index if not exists member_stats_guild_day on member_stats (guild_id, day desc);
        -- Roblox username cache (persistent, cross-instance) so we don't re-hit Roblox's
        -- rate-limited user API for every lookup / ban-list render on Vercel's shared IPs.
        create table if not exists roblox_users (
          user_id      bigint primary key,
          username     text,
          display_name text,
          updated_at   timestamptz not null default now()
        );
        create index if not exists roblox_users_uname on roblox_users (lower(username));
        -- Discord users blocked from the dashboard entirely (checked in getSession).
        create table if not exists blacklist (
          discord_id text primary key,
          note       text,
          added_by   text,
          added_at   timestamptz not null default now()
        );
      `)
      .catch((e) => { schemaReady = undefined; throw e; });
  }
  return schemaReady;
}

// Best-effort audit write. Records the action in the DB AND mirrors it to the Discord
// bot-log channel. NEVER throws — a logging failure (DB or Discord) must never fail the
// actual grant / rank / kick / tag / emoji it records. The two sinks are independent.
export async function logAudit({ actorId, actorName, action, category = null, itemKey = null, target = null, detail = null }) {
  try {
    await ensureSchema();
    await query(
      `insert into audit_log (actor_id, actor_name, action, category, item_key, target, detail)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [actorId, actorName, action, category, itemKey, target, detail],
    );
  } catch (e) {
    console.error("[audit] db log failed (non-fatal):", e.message);
  }
  // Best-effort Discord mirror — never let a failed log post throw out of here
  // (an uncaught throw would 500 the caller with a non-JSON body).
  try {
    await postLog({ actorName, action, category, target, detail: detail || itemKey });
  } catch (e) {
    console.error("[audit] discord log failed (non-fatal):", e.message);
  }
}
