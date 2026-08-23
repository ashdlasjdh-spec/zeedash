import { getSession } from "@/lib/session";
import { resolveUsername } from "@/lib/roblox";
import { NextResponse } from "next/server";
import { notFound, unauthorized } from "@/lib/api";
export async function POST(req) {
  if (!(await getSession())) return unauthorized("Not signed in");
  const { username } = await req.json();
  const u = await resolveUsername(username).catch(() => null);
  if (!u) return notFound("not found");
  return NextResponse.json(u);
}
