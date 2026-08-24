"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useGuilds } from "./metaFields";
import { loadGuildSettings, cachedGuildSettings } from "@/lib/guildSettingsClient";

// Guided setup for a server: a live checklist that marks each step done as the matching feature is
// enabled, with a jump link to configure it. Great first-run experience for a freshly-added bot.
const STEPS = [
  { key: "__bot", label: "Add the bot & run setup", desc: "In Discord, run the setup command (super owner) to build the jail + log channels.", href: null, always: true },
  { key: "fake-permissions", label: "Delegate permissions", desc: "Map roles to what they can manage — use a preset like Moderator or Support.", href: "/bot/fake-permissions" },
  { key: "welcome", label: "Welcome new members", desc: "Greet people who join with a custom embed.", href: "/bot/welcome" },
  { key: "logs", label: "Turn on logging", desc: "Keep an audit trail of moderation and message events.", href: "/bot/logs" },
  { key: "antinuke", label: "Protect the server", desc: "Enable antinuke so a rogue admin can't wipe the server.", href: "/bot/antinuke" },
  { key: "tickets", label: "Set up tickets", desc: "Let members open support tickets (transcripts included).", href: "/bot/tickets" },
];

export default function Onboarding() {
  const sp = useSearchParams();
  const guilds = useGuilds();
  const guild = sp.get("guild") || guilds[0]?.id || "";
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    if (!guild) return;
    let alive = true;
    const cached = cachedGuildSettings(guild);
    if (cached) setSettings(cached);
    loadGuildSettings(guild).then((s) => { if (alive) setSettings(s); }).catch(() => {});
    return () => { alive = false; };
  }, [guild]);

  const done = (key) => key === "__bot" ? true : !!settings?.[key]?.enabled;
  const complete = STEPS.filter((s) => done(s.key)).length;
  const q = guild ? `?guild=${guild}` : "";

  return (
    <div className="card" style={{ maxWidth: 760 }}>
      <div className="between" style={{ marginBottom: 4 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>Get started</div>
        <span className="pill">{complete}/{STEPS.length} done</span>
      </div>
      <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>Work through these to set up your server. Each step ticks off automatically once it&apos;s configured.</div>
      <div className="ob-track" style={{ height: 6, borderRadius: 4, background: "var(--surface-3)", overflow: "hidden", marginBottom: 18 }}>
        <div style={{ height: "100%", width: `${(complete / STEPS.length) * 100}%`, background: "linear-gradient(90deg,var(--brand),var(--brand-2))", transition: "width .3s" }} />
      </div>
      <div className="stack" style={{ gap: 10 }}>
        {STEPS.map((s) => {
          const ok = done(s.key);
          return (
            <div key={s.key} className="ob-step" style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface-2)" }}>
              <span aria-hidden="true" style={{ flex: "0 0 auto", width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", background: ok ? "var(--success)" : "var(--surface-3)", color: ok ? "#000" : "var(--muted)", fontWeight: 800, fontSize: 13 }}>{ok ? "✓" : ""}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: "var(--white)" }}>{s.label}</div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{s.desc}</div>
              </div>
              {s.href && !ok && <Link className="btn" style={{ width: "auto", padding: "7px 13px", fontSize: 13 }} href={`${s.href}${q}`}>Set up →</Link>}
              {s.href && ok && <Link className="btn ghost" style={{ width: "auto", padding: "7px 13px", fontSize: 13 }} href={`${s.href}${q}`}>Edit</Link>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
