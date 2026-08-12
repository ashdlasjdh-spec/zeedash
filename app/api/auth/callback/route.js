import { exchangeCode, getUser, getUserGuilds } from "@/lib/discord";
import { createSession, resolveLevel, labelForLevel } from "@/lib/session";
import { query, ensureSchema } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("oauth_state")?.value;
  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(new URL("/?error=state", req.url));
  }
  try {
    const token = await exchangeCode(code);
    const du = await getUser(token.access_token);
    const level = await resolveLevel(du.id);
    if (!level) return NextResponse.redirect(new URL("/?error=denied", req.url));
    // Store the servers this user is in (guilds scope) so the Server picker can show only the ones
    // shared with the bot. Best-effort — never blocks login.
    try {
      const guilds = await getUserGuilds(token.access_token);
      await ensureSchema();
      await query(
        `insert into user_guilds (discord_id, guild_ids, updated_at) values ($1, $2::jsonb, now())
         on conflict (discord_id) do update set guild_ids = $2::jsonb, updated_at = now()`,
        [du.id, JSON.stringify(guilds)],
      );
    } catch { /* non-fatal */ }
    await createSession({ id: du.id, name: du.global_name || du.username, level, role: labelForLevel(level), avatar: du.avatar });
    return NextResponse.redirect(new URL("/dashboard?welcome=1", req.url));
  } catch (e) {
    return NextResponse.redirect(new URL("/?error=oauth", req.url));
  }
}
