import { getSession } from "@/lib/session";
import { resolveUsername } from "@/lib/roblox";
import { NextResponse } from "next/server";
export async function POST(req) {
  if (!(await getSession())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { username } = await req.json();
  const u = await resolveUsername(username).catch(() => null);
  if (!u) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(u);
}
