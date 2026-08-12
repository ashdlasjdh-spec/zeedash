import { exchangeCode, getUser } from "@/lib/discord";
import { createSession, resolveLevel, labelForLevel } from "@/lib/session";
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
    await createSession({ id: du.id, name: du.global_name || du.username, level, role: labelForLevel(level), avatar: du.avatar });
    return NextResponse.redirect(new URL("/dashboard?welcome=1", req.url));
  } catch (e) {
    return NextResponse.redirect(new URL("/?error=oauth", req.url));
  }
}
