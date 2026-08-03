import { exchangeCode, getUser } from "@/lib/discord";
import { createSession, resolveRole } from "@/lib/session";
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
    const role = await resolveRole(du.id);
    if (!role) return NextResponse.redirect(new URL("/?error=denied", req.url));
    await createSession({ id: du.id, name: du.global_name || du.username, role, avatar: du.avatar });
    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (e) {
    return NextResponse.redirect(new URL("/?error=oauth", req.url));
  }
}
