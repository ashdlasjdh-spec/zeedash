import { exchangeCode, getUser, getUserGuilds } from "@/lib/discord";
import { createSession, resolveLevel, labelForLevel, liveGuildGrants } from "@/lib/session";
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

    // Access requires ANY of: a Roblox staff level (Game), admin/owner of a guild the bot is in
    // (Server-only), OR a delegated grant via Role Access / Fake Permissions (group actions, feature
    // perms, transcript viewing, section grants, antinuke-admin). Otherwise there's nothing for them
    // to do — deny.
    let serverOnlyOk = false;
    if (!level && Object.keys(perms).length) {
      try {
        const active = await query("select distinct guild_id from server_stats where updated_at > now() - interval '30 days'");
        const set = new Set(active.map((r) => r.guild_id));
        serverOnlyOk = Object.keys(perms).some((gid) => set.has(gid));
      } catch { /* if we can't check, fall through to deny */ }
    }
    // Delegated access: resolve the same grants getSession() uses, so a Role-Access-only user (e.g. a
    // Discord role granted group actions or transcripts, or a specific user id) can get in. gameGrant =
    // a Game-section grant (group / transcripts / section); serverGrant = a Server-section grant.
    let gameGrant = false;
    let serverGrant = false;
    try {
      const gr = await liveGuildGrants(du.id, perms);
      gameGrant = !!((gr.group && gr.group.actions && gr.group.actions.length) || (gr.transcriptGuilds && gr.transcriptGuilds.length) || (gr.sectionGrants && gr.sectionGrants.length));
      serverGrant = !!((gr.securityGuildIds && gr.securityGuildIds.length) || (gr.manualPerms && Object.keys(gr.manualPerms).length) || (gr.featureGrants && Object.keys(gr.featureGrants).length));
    } catch { /* fall through to the level/admin checks */ }
    if (!level && !serverOnlyOk && !gameGrant && !serverGrant) {
      // Drop a short-lived diagnostic cookie so the denied screen can show exactly what we detected —
      // their ID + which managed community servers they're actually in — to make granting them trivial.
      const MANAGED = { "1447037325380157452": "ZHD", "1496219608800170004": "ZHD Board", "1494327144829026354": "ZHD HOF", "1531917648588312677": "Server" };
      const inCommunity = guilds.filter((g) => MANAGED[g.id]).map((g) => ({ id: g.id, name: g.name || MANAGED[g.id] }));
      const res = NextResponse.redirect(new URL("/login?error=denied", req.url));
      res.cookies.set("deny_info", JSON.stringify({ id: du.id, name: du.global_name || du.username, guilds: inCommunity }), { httpOnly: false, secure: true, sameSite: "lax", path: "/", maxAge: 300 });
      return res;
    }

    await createSession({ id: du.id, name: du.global_name || du.username, level, role: labelForLevel(level), avatar: du.avatar });
    // Game-side people (staff level or a game grant) land on the dashboard; server-only people on /bot.
    const dest = (level || gameGrant) ? "/dashboard?welcome=1" : "/bot?welcome=1";
    return NextResponse.redirect(new URL(dest, req.url));
  } catch (e) {
    return NextResponse.redirect(new URL("/login?error=oauth", req.url));
  }
}
