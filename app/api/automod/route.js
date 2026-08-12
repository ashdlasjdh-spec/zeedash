import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { getAutomodRules, updateAutomodKeywords } from "@/lib/discord";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TYPE = { 1: "Keyword", 3: "Spam", 4: "Keyword preset", 5: "Mention spam" };

// GET ?guild=X  -> the guild's native Discord AutoMod rules (id, name, enabled, type, keywords).
// POST { guild, ruleId, keywords[] } -> update a KEYWORD rule's word list.  Management+.
export async function GET(req) {
  const s = await getSession();
  if (!s || !canGroup(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const guild = req.nextUrl.searchParams.get("guild") || "";
  if (!guild) return NextResponse.json({ rules: [] });
  const r = await getAutomodRules(guild);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
  const rules = r.rules.map((x) => ({
    id: x.id,
    name: x.name,
    enabled: !!x.enabled,
    type: TYPE[x.trigger_type] || "Other",
    editable: x.trigger_type === 1, // only KEYWORD rules have an editable word list
    keywords: x.trigger_metadata?.keyword_filter || [],
  }));
  return NextResponse.json({ rules });
}

export async function POST(req) {
  const s = await getSession();
  if (!s || !canGroup(s.level)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { guild, ruleId, keywords } = await req.json().catch(() => ({}));
  if (!guild || !ruleId || !Array.isArray(keywords)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const clean = keywords.map((w) => String(w).trim()).filter(Boolean).slice(0, 1000);
  const r = await updateAutomodKeywords(guild, ruleId, clean);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
  return NextResponse.json({ ok: true });
}
