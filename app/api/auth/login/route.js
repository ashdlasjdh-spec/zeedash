import { authorizeUrl } from "@/lib/discord";
import { NextResponse } from "next/server";
import crypto from "crypto";

// Must run per-request: it mints a fresh random OAuth state each time.
export const dynamic = "force-dynamic";

export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set("oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
