"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useGuilds } from "./metaFields";

// At-a-glance grid of every Server Management feature and whether it's ON for the selected guild,
// each linking to its page. Reads /api/guild-settings (security features are stripped server-side
// for anyone without security access, so they simply show as Off here).
const GROUPS = [
  { label: "Security", items: [["Fake Permissions", "fake-permissions"], ["Automod", "automod"], ["Antiraid", "antiraid"], ["Antinuke", "antinuke"], ["Honeypot", "honeypot"]] },
  { label: "Automation", items: [["Autoresponder", "autoresponder"], ["Autoreact", "autoreact"], ["Autorole", "autorole"], ["Ping on Join", "pingonjoin"]] },
  { label: "Utility", items: [["Bump Reminder", "bump"], ["Button Roles", "button-roles"], ["Levels", "levels"], ["Reaction Roles", "reaction-roles"], ["Sticky Message", "sticky"]] },
  { label: "Server", items: [["Starboard", "starboard"], ["Welcome", "welcome"], ["Goodbye", "goodbye"], ["Logs", "logs"], ["VoiceMaster", "voicemaster"], ["Tickets", "tickets"]] },
];
// feature slug in the store ↔ page slug (mostly identical).
const STORE_KEY = { "button-roles": "buttonroles", "reaction-roles": "reactionroles", "fake-permissions": "fake-permissions" };

export default function FeatureOverview() {
  const sp = useSearchParams();
  const guildParam = sp.get("guild") || "";
  const guilds = useGuilds();
  const [settings, setSettings] = useState(null);
  const guild = guildParam || guilds[0]?.id || "";

  useEffect(() => {
    if (!guild) return;
    setSettings(null);
    fetch(`/api/guild-settings?guild=${guild}`).then((r) => r.json()).then((j) => setSettings(j.settings || {})).catch(() => setSettings({}));
  }, [guild]);

  const q = guild ? `?guild=${guild}` : "";
  const isOn = (slug) => {
    const key = STORE_KEY[slug] || slug;
    return !!settings?.[key]?.enabled;
  };
  const enabledCount = settings ? GROUPS.flatMap((g) => g.items).filter(([, slug]) => isOn(slug)).length : 0;

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
        {GROUPS.map((grp) => (
          <div key={grp.label}>
            <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 700, marginBottom: 8 }}>{grp.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {grp.items.map(([label, slug]) => {
                const on = isOn(slug);
                return (
                  <a key={slug} href={`/dashboard/server/${slug}${q}`} className="fo-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--line)", textDecoration: "none", color: "inherit" }}>
                    <span style={{ fontSize: 13.5 }}>{label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: on ? "rgba(52,211,153,.15)" : "var(--surface-2)", color: on ? "#34d399" : "var(--muted)" }}>
                      {settings == null ? "…" : on ? "ON" : "OFF"}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
