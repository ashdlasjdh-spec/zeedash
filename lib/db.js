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
        alter table server_stats add column if not exists guild_icon text;
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
        -- login's server-only access check filters server_stats by updated_at ("active in last 30d");
        -- index it so that scan doesn't grow with the table.
        create index if not exists server_stats_updated on server_stats (updated_at);
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
        -- Per-guild feature settings for the Server Management portal. Every feature is OFF until
        -- explicitly enabled here — the bot reads this and no-ops on anything not enabled. config
        -- holds the feature's options (channel ids, templates, thresholds, …).
        create table if not exists guild_settings (
          guild_id   text not null,
          feature    text not null,
          enabled    boolean not null default false,
          config     jsonb not null default '{}'::jsonb,
          updated_by text,
          updated_at timestamptz not null default now(),
          primary key (guild_id, feature)
        );
        -- Command usage telemetry (written by the bot in batches). One row per command run; the
        -- dashboard aggregates it into a usage-stats page. Pruned by time on read, not stored forever.
        create table if not exists command_usage (
          id         bigserial primary key,
          command    text not null,
          actor_id   text,
          actor_name text,
          guild_id   text,
          slash      boolean not null default false,
          at         timestamptz not null default now()
        );
        create index if not exists command_usage_at on command_usage (at desc);
        create index if not exists command_usage_cmd on command_usage (command);
        -- Fake-permission change proposals awaiting approval (two-person change control). A proposer
        -- submits a full fake-permissions config; a security-standing user approves (applies it) or
        -- rejects. Only pending rows matter; decided rows are kept for the record.
        create table if not exists perm_proposals (
          id            bigserial primary key,
          guild_id      text not null,
          feature       text not null default 'fake-permissions',
          config        jsonb not null default '{}'::jsonb,
          proposer_id   text,
          proposer_name text,
          status        text not null default 'pending',
          created_at    timestamptz not null default now(),
          decided_by    text,
          decided_at    timestamptz
        );
        create index if not exists perm_proposals_pending on perm_proposals (guild_id, status);
        -- Per-guild member XP for the Levels feature (only written while Levels is enabled).
        create table if not exists member_levels (
          guild_id   text not null,
          user_id    text not null,
          xp         bigint not null default 0,
          updated_at timestamptz not null default now(),
          primary key (guild_id, user_id)
        );
        create index if not exists member_levels_guild on member_levels (guild_id, xp desc);
        -- Cache the member's Discord username alongside their XP so the Levels leaderboard can
        -- render names without a second lookup (written by the bot when it awards XP).
        alter table member_levels add column if not exists username text;
        -- Durable bot runtime state that must survive a restart/redeploy (bump timers, VoiceMaster
        -- temp channels, starboard message mapping). kind namespaces the rows; expires_at is used
        -- by the bump reminder (its due time) and ignored by the rest.
        create table if not exists bot_state (
          guild_id   text not null,
          kind       text not null,
          item_id    text not null,
          data       jsonb not null default '{}'::jsonb,
          expires_at timestamptz,
          updated_at timestamptz not null default now(),
          primary key (guild_id, kind, item_id)
        );
        create index if not exists bot_state_kind on bot_state (kind);
        -- Queue of "publish" actions requested from the dashboard (post an embed, a button-role
        -- panel, ticket panels, seed reaction emojis). The bot polls pending rows, acts, then acks.
        create table if not exists publish_queue (
          id         bigserial primary key,
          guild_id   text not null,
          kind       text not null,
          payload    jsonb not null default '{}'::jsonb,
          status     text not null default 'pending',
          result     text,
          created_by text,
          created_at timestamptz not null default now(),
          done_at    timestamptz
        );
        create index if not exists publish_queue_pending on publish_queue (status, created_at) where status = 'pending';
        -- Guild IDs each dashboard user is a member of (from the Discord "guilds" OAuth scope,
        -- refreshed at login). Used to show only servers the user AND the bot share.
        create table if not exists user_guilds (
          discord_id text primary key,
          guild_ids  jsonb not null default '[]'::jsonb,
          updated_at timestamptz not null default now()
        );
        -- Per-guild Discord permissions for the signed-in user: { "<guildId>": { "a": adminBool,
        -- "o": ownerBool } }. Drives the Server Management section's per-server access (separate from
        -- the Roblox staff ladder that gates the Game section).
        alter table user_guilds add column if not exists guild_perms jsonb not null default '{}'::jsonb;
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
