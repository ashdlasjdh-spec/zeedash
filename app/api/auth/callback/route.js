import { exchangeCode, getUser, getUserGuilds } from "@/lib/discord";
import { createSession, resolveLevel, labelForLevel } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { query, ensureSchema } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req) {
  // Rate-limit the OAuth callback per IP — it does a Discord token exchange + DB writes, so it's the
  // most expensive pre-auth endpoint. No-op until Upstash is configured; fails open.
  const rl = await rateLimit(`authcb:${clientIp(req)}`, { max: 20, windowSec: 60 });
  if (!rl.ok) return NextResponse.redirect(new URL("/login?error=busy", req.url));
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("oauth_state")?.value;
  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(new URL("/login?error=state", req.url));
  }
  try {
    const token = await exchangeCode(code);
    const du = await getUser(token.access_token);
    const level = await resolveLevel(du.id);

    // Capture the user's servers + their Discord permissions in each. The Game section stays gated by
    // the Roblox staff ladder (level); the Server section is gated by these per-guild perms.
    let guilds = [];
    try { guilds = await getUserGuilds(token.access_token); } catch { /* non-fatal */ }
    const ids = guilds.map((g) => g.id);
    const perms = {};
    for (const g of guilds) if (g.admin || g.owner) perms[g.id] = { a: !!g.admin, o: !!g.owner };
    try {
      await ensureSchema();
      await query(
        `insert into user_guilds (discord_id, guild_ids, guild_perms, updated_at) values ($1, $2::jsonb, $3::jsonb, now())
         on conflict (discord_id) do update set guild_ids = $2::jsonb, guild_perms = $3::jsonb, updated_at = now()`,
        [du.id, JSON.stringify(ids), JSON.stringify(perms)],
      );
    } catch { /* non-fatal */ }

    // Access requires EITHER a Roblox staff level (Game) OR admin/owner of a guild the bot is
    // actually in (Server-only). Otherwise there's nothing for them to do — deny.
    let serverOnlyOk = false;
    if (!level && Object.keys(perms).length) {
      try {
        const active = await query("select distinct guild_id from server_stats where updated_at > now() - interval '30 days'");
        const set = new Set(active.map((r) => r.guild_id));
        serverOnlyOk = Object.keys(perms).some((gid) => set.has(gid));
      } catch { /* if we can't check, fall through to deny */ }
    }
    if (!level && !serverOnlyOk) return NextResponse.redirect(new URL("/login?error=denied", req.url));

    await createSession({ id: du.id, name: du.global_name || du.username, level, role: labelForLevel(level), avatar: du.avatar });
    return NextResponse.redirect(new URL(level ? "/dashboard?welcome=1" : "/bot?welcome=1", req.url));
  } catch (e) {
    return NextResponse.redirect(new URL("/login?error=oauth", req.url));
  }
}
