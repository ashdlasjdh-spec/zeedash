-- Whitelist: who can log in and what role they have.
create table if not exists whitelist (
  discord_id   text primary key,
  role         text not null default 'staff',   -- owner | cofounder | admin | staff
  note         text,
  added_by     text,
  added_at     timestamptz not null default now()
);

-- Runtime config overrides (co-founder+ can swap the Open Cloud key / universe id here).
create table if not exists config (
  key        text primary key,                  -- 'roblox_api_key' | 'roblox_universe_id'
  value      text not null,
  updated_by text,
  updated_at timestamptz not null default now()
);

-- Every grant/revoke is logged.
create table if not exists audit_log (
  id          bigserial primary key,
  actor_id    text not null,      -- discord id of granter
  actor_name  text,
  action      text not null,      -- grant | revoke | config | whitelist
  category    text,               -- power | stand | tool | perk | tag | emoji
  item_key    text,
  target      text,               -- roblox username / userId (or config key)
  detail      text,
  created_at  timestamptz not null default now()
);
