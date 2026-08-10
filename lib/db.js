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
