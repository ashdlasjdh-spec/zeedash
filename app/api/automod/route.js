import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { getAutomodRules, updateAutomodRule } from "@/lib/discord";
import { NextResponse } from "next/server";
import { badRequest, forbidden, notFound } from "@/lib/api";

export const dynamic = "force-dynamic";

const TYPE = { 1: "Keyword", 3: "Spam", 4: "Keyword preset", 5: "Mention spam", 6: "Member profile" };
const HAS_WORDS = new Set([1, 6]);   // keyword_filter + regex_patterns
const HAS_ALLOW = new Set([1, 4, 6]); // allow_list
const HAS_PRESET = new Set([4]);      // presets
const HAS_MENTION = new Set([5]);     // mention_total_limit

// GET ?guild=X  -> the guild's Discord AutoMod rules with every editable field.
export async function GET(req) {
  const s = await getSession();
  if (!s || !canGroup(s.level)) return forbidden();
  const guild = req.nextUrl.searchParams.get("guild") || "";
  if (!guild) return NextResponse.json({ rules: [] });
  const r = await getAutomodRules(guild);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
  const rules = r.rules.map((x) => {
    const t = x.trigger_type;
    const md = x.trigger_metadata || {};
    return {
      id: x.id,
      name: x.name,
      typeNum: t,
      type: TYPE[t] || "Other",
      enabled: !!x.enabled,
      words: HAS_WORDS.has(t) ? md.keyword_filter || [] : null,
      regex: HAS_WORDS.has(t) ? md.regex_patterns || [] : null,
      allow: HAS_ALLOW.has(t) ? md.allow_list || [] : null,
      presets: HAS_PRESET.has(t) ? md.presets || [] : null,
      mentionLimit: HAS_MENTION.has(t) ? (md.mention_total_limit ?? null) : null,
    };
  });
  return NextResponse.json({ rules });
}

// POST { guild, ruleId, words?, regex?, allow?, presets?, mentionLimit?, enabled? }
// Merges into the rule's existing metadata (never wipes untouched fields), then PATCHes Discord.
export async function POST(req) {
  const s = await getSession();
  if (!s || !canGroup(s.level)) return forbidden();
  const body = await req.json().catch(() => ({}));
  const { guild, ruleId } = body;
  if (!guild || !ruleId) return badRequest();

  const r = await getAutomodRules(guild);
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
  const rule = r.rules.find((x) => String(x.id) === String(ruleId));
  if (!rule) return notFound("Rule not found");

  const t = rule.trigger_type;
  const md = { ...(rule.trigger_metadata || {}) };
  const arr = (v, n = 1000) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, n) : []);
  if (HAS_WORDS.has(t) && Array.isArray(body.words)) md.keyword_filter = arr(body.words);
  if (HAS_WORDS.has(t) && Array.isArray(body.regex)) md.regex_patterns = arr(body.regex, 10);
  if (HAS_ALLOW.has(t) && Array.isArray(body.allow)) md.allow_list = arr(body.allow, 100);
  if (HAS_PRESET.has(t) && Array.isArray(body.presets)) md.presets = body.presets.map((n) => Number(n)).filter((n) => [1, 2, 3].includes(n));
  if (HAS_MENTION.has(t) && body.mentionLimit != null) md.mention_total_limit = Math.max(1, Math.min(50, Number(body.mentionLimit) || 1));

  const patch = {};
  if (t !== 3) patch.trigger_metadata = md; // SPAM has no metadata
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (!Object.keys(patch).length) return NextResponse.json({ ok: true });

  const res = await updateAutomodRule(guild, ruleId, patch);
  if (res.error) return NextResponse.json({ error: res.error }, { status: res.status || 500 });
  return NextResponse.json({ ok: true });
}
