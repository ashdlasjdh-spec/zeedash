import { clearSession } from "@/lib/session";
import { NextResponse } from "next/server";
export async function POST(req) {
  clearSession();
  return NextResponse.redirect(new URL("/", req.url));
}
