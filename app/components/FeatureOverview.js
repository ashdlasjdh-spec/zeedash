"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useGuilds } from "./metaFields";

// At-a-glance grid of every Server Management feature and whether it's ON for the selected guild,
// each linking to its page. Reads /api/guild-settings (security features are stripped server-side
// for anyone without security access, so they simply show as Off here). Feature list is the single
// shared catalogue (lib/serverFeatures) — nothing is duplicated here.
import { OVERVIEW_GROUPS as GROUPS, SECURITY_SLUGS as SEC_LIST } from "@/lib/serverFeatures";

// feature slug in the store ↔ page slug (mostly identical).
const STORE_KEY = { "button-roles": "buttonroles", "reaction-roles": "reactionroles", "fake-permissions": "fake-permissions" };
const SECURITY_SLUGS = new Set(SEC_LIST);

export default function FeatureOverview() {
  const sp = useSearchParams();
  const guildParam = sp.get("guild") || "";
  const guilds = useGuilds();
  const [settings, setSettings] = useState(null);
  const [access, setAccess] = useState(null); // { manage, security, manageable } — same shape as the nav
  const guild = guildParam || guilds[0]?.id || "";

  useEffect(() => {
    if (!guild) return;
    setSettings(null);
    fetch(`/api/guild-settings?guild=${guild}`).then((r) => r.json()).then((j) => setSettings(j.settings || {})).catch(() => setSettings({}));
    fetch(`/api/guild-access?guild=${guild}`).then((r) => r.json())
      .then((j) => setAccess({ manage: !!j.manage, security: !!j.security, manageable: Array.isArray(j.manageable) ? j.manageable : [] }))
      .catch(() => setAccess({ manage: false, security: false, manageable: [] }));
  }, [guild]);

  // Only surface features this user may manage (Discord admin sees all; a manual-permission holder
  // sees just theirs; antinuke admins additionally see antinuke/antiraid). Server also enforces.
  const canSee = (slug) => {
    if (!access) return true;
    if (SECURITY_SLUGS.has(slug)) return access.security;
    if (access.manage) return true;
    return access.manageable.includes(slug);
  };
  const q = guild ? `?guild=${guild}` : "";
  const isOn = (slug) => {
    const key = STORE_KEY[slug] || slug;
    return !!settings?.[key]?.enabled;
  };
  const enabledCount = settings ? GROUPS.flatMap((g) => g.items).filter((i) => canSee(i.slug) && isOn(i.slug)).length : 0;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="between" style={{ marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Features</div>
          <div className="muted" style={{ fontSize: 13 }}>What&apos;s switched on for this server at a glance.</div>
        </div>
        {settings && <span className="muted" style={{ fontSize: 12.5 }}>{enabledCount} enabled</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 18 }}>
        {GROUPS.map((grp) => {
          const items = grp.items.filter((i) => canSee(i.slug));
          if (!items.length) return null; // e.g. a manual-permission user with nothing in this group
          return (
          <div key={grp.label}>
            <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 700, marginBottom: 8 }}>{grp.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map(({ label, slug }) => {
                const on = isOn(slug);
                return (
                  <Link key={slug} href={`/bot/${slug}${q}`} className="fo-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--line)", textDecoration: "none", color: "inherit" }}>
                    <span style={{ fontSize: 13.5 }}>{label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: on ? "rgba(74,222,128,.15)" : "var(--surface-2)", color: on ? "var(--success)" : "var(--muted)" }}>
                      {settings == null ? "…" : on ? "ON" : "OFF"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
