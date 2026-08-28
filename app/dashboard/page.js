import Link from "next/link";
import { getSession } from "@/lib/session";
import { canGroup, canGroupS, canBan, canBanS, canWhitelist, canManageGrants, canManageGrantsS, canPurge, grantsFor, grantsForSession, labelForLevel, isSuperOwner } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import LiveClock from "../components/LiveClock";
import StatusBadges from "../components/StatusBadges";
import DiscordAvatar from "../components/DiscordAvatar";
import LivePlayers from "../components/LivePlayers";
import { getLivePlayers } from "@/lib/gamestats";
import { DiscordLink, RobloxLink, robloxIdFrom } from "../components/ProfileLinks";
import LocalTime from "../components/LocalTime";
import PortalChooser from "../components/PortalChooser";
import { getChangelog } from "@/lib/changelog.mjs";

export const dynamic = "force-dynamic";

// Per-project tag tone for the "What's new" card (mirrors /changelog).
const NEWS_TONE = { "Zee-hood": "bot", zeedash: "dash", "zee-hood-game": "game", "zee-hood-transcript": "ts", idkutoldmetomakeit: "api" };

// ---- inline monochrome line-icons (stroke = currentColor), matching the sidebar set ----
const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
function Icon({ name }) {
  const paths = {
    bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" {...P} />,
    star: <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3Z" {...P} />,
    car: <><path d="M3 13l2-5a3 3 0 0 1 2.8-2h8.4A3 3 0 0 1 19 8l2 5" {...P} /><path d="M3 13h18v4a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4Z" {...P} /><path d="M6.5 16h.01M17.5 16h.01" {...P} /></>,
    wrench: <path d="M14.7 6.3a4 4 0 0 0-5.2 5.2L4 17l3 3 5.5-5.5a4 4 0 0 0 5.2-5.2l-2.3 2.3-2.5-.5-.5-2.5 2.3-2.3Z" {...P} />,
    ticket: <><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" {...P} /><path d="M14 6v12" {...P} strokeDasharray="2 2" /></>,
    flag: <><path d="M5 21V4" {...P} /><path d="M5 5h11l-1.5 3L16 11H5" {...P} /></>,
    tag: <><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z" {...P} /><circle cx="7.5" cy="7.5" r="1.4" {...P} /></>,
    smile: <><circle cx="12" cy="12" r="9" {...P} /><path d="M8.5 14.5a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01" {...P} /></>,
    ban: <><circle cx="12" cy="12" r="9" {...P} /><path d="m5.6 5.6 12.8 12.8" {...P} /></>,
    users: <><circle cx="9" cy="8" r="3.2" {...P} /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6a3 3 0 0 1 0 5.8M17 19a5.5 5.5 0 0 0-3-4.9" {...P} /></>,
    search: <><circle cx="11" cy="11" r="6.5" {...P} /><path d="m20 20-3.5-3.5" {...P} /></>,
    shield: <><path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z" {...P} /><path d="m9 12 2 2 4-4" {...P} /></>,
    gear: <><circle cx="12" cy="12" r="3" {...P} /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" {...P} /></>,
    box: <><path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" {...P} /><path d="M4 7l8 4 8-4M12 11v10" {...P} /></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" {...P} /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" {...P} /></>,
    layers: <><path d="M12 3 3 8l9 5 9-5-9-5Z" {...P} /><path d="M3 13l9 5 9-5M3 16.5l9 5 9-5" {...P} strokeWidth="1.2" /></>,
    clock: <><circle cx="12" cy="12" r="9" {...P} /><path d="M12 7v5l3 2" {...P} /></>,
    activity: <path d="M3 12h4l2.5 7 4-15L16 12h5" {...P} />,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name] || null}</svg>;
}

const GRANT_META = {
  power: ["Powers", "bolt", "/dashboard/powers", "Grant abilities"],
  stand: ["Stands", "star", "/dashboard/stands", "Grant stands"],
  car: ["SVJ Car", "car", "/dashboard/car", "Grant vehicles"],
  tool: ["Tools", "wrench", "/dashboard/tools", "Grant tools"],
  gamepass: ["Gamepasses", "ticket", "/dashboard/gamepasses", "Grant passes"],
  shazam: ["Shazam", "bolt", "/dashboard/shazam", "Grant Shazam"],
  startbr: ["Start BR", "flag", "/dashboard/startbr", "BR permissions"],
  tag: ["Crew Tags", "tag", "/dashboard/tags", "Custom name tags"],
  emoji: ["Emojis", "smile", "/dashboard/emojis", "Custom emojis"],
};

function actionBadge(action) {
  const a = String(action || "").toLowerCase();
  const cls = /^[a-z]+$/.test(a) ? `ab-${a}` : ""; // colored per-action via .ab-<action> CSS
  return <span className={`ab ${cls}`}>{a || "action"}</span>;
}

export default async function Overview({ searchParams }) {
  const user = await getSession();
  if (!user) return null;
  // Server-only Discord admins have no Game access — send them straight to the Server section.
  if (!user.gameAccess) redirect("/bot");
  const lvl = user.level;
  const seesActivity = canGroupS(user);
  const showChooser = (searchParams?.welcome ?? "") === "1";

  // --- stats (each independent + best-effort so one failure never blanks the page) ---
  const one = async (sql) => { try { const r = await query(sql); return Number(r?.[0]?.n) || 0; } catch { return 0; } };
  const [livePlayers, tempCount, auditTotal, auditToday, changelogGroups] = await Promise.all([
    getLivePlayers().catch(() => null),
    one("select count(*)::int n from grant_expiry"),
    seesActivity ? one("select count(*)::int n from audit_log") : Promise.resolve(0),
    seesActivity ? one("select count(*)::int n from audit_log where created_at >= date_trunc('day', now())") : Promise.resolve(0),
    getChangelog().catch(() => []), // default perRepo so this shares the /changelog page's cached fetch
  ]);
  const whatsNew = (Array.isArray(changelogGroups) ? changelogGroups : []).flatMap((g) => g.items).slice(0, 6);

  let log = [], movers = [];
  if (seesActivity) {
    try { log = await query("select actor_id, actor_name, action, category, item_key, target, detail, created_at from audit_log order by id desc limit 60"); } catch {}
    try { movers = await query("select actor_name, max(actor_id) as actor_id, count(*)::int n from audit_log where created_at >= now() - interval '7 days' group by actor_name order by n desc limit 5"); } catch {}
  }
  const moverMax = movers.reduce((m, r) => Math.max(m, Number(r.n) || 0), 0) || 1;

  // --- role-aware quick actions ---
  const cats = grantsForSession(user);
  // Fixed quick-action set: Tags, Powers, Tools, Gamepasses, Moderation, Audit Log —
  // each still shown only if the viewer's rank can use it.
  const actions = [];
  const has = (c) => cats.includes(c);
  if (has("tag")) actions.push({ label: "Crew Tags", icon: "tag", href: "/dashboard/tags", sub: "Custom name tags" });
  if (has("power")) actions.push({ label: "Powers", icon: "bolt", href: "/dashboard/powers", sub: "Grant abilities" });
  if (has("tool")) actions.push({ label: "Tools", icon: "wrench", href: "/dashboard/tools", sub: "Grant tools" });
  if (has("gamepass")) actions.push({ label: "Gamepasses", icon: "ticket", href: "/dashboard/gamepasses", sub: "Grant passes" });
  if (canBanS(user)) actions.push({ label: "Moderation", icon: "ban", href: "/dashboard/bans", sub: "Ban / unban / warn" });
  if (canGroupS(user) || canManageGrantsS(user)) actions.push({ label: "Audit Log", icon: "list", href: "/dashboard/audit", sub: "Full action history" });

  const stats = [
    { live: <LivePlayers initial={livePlayers} />, l: "Players in-game", hint: "live right now", icon: "users" },
    { n: tempCount, l: "Active temp grants", hint: tempCount ? "auto-expiring" : "none pending", icon: "clock" },
    ...(seesActivity ? [
      { n: auditToday, l: "Actions today", hint: "since midnight", icon: "activity" },
      { n: auditTotal, l: "Actions logged", hint: "all time", icon: "list" },
    ] : []),
  ];

  const initials = (s) => String(s || "?").trim().slice(0, 2).toUpperCase();

  return (
    <div className="fullbleed">
      {showChooser && <PortalChooser canServer={seesActivity} />}
      {/* HERO */}
      <section className="ov-hero">
        <div className="ov-hero-l">
          <div className="ov-eyebrow"><span className="livedot" /> zhd control panel</div>
          <h1>Welcome back, {user.name}</h1>
          <p className="ov-hero-sub">
            Signed in as <span className="ov-role">{user.role || labelForLevel(lvl)}</span>.{" "}
            {seesActivity ? "Everything your team does across the dashboard is tracked here." : "Jump straight to the tools your rank can use."}
          </p>
          <StatusBadges />
        </div>
        <LiveClock name={user.name} />
      </section>

      {/* STATS */}
      <div className="ov-stats">
        {stats.map((s, i) => (
          <div className="ov-stat" key={i}>
            <div className="ov-stat-ico"><Icon name={s.icon} /></div>
            <div className="ov-n">{s.live ? s.live : s.n.toLocaleString()}</div>
            <div className="ov-l">{s.l}</div>
            <div className="ov-hint">{s.hint}</div>
          </div>
        ))}
      </div>

      {/* SUPER OWNER — role access to the community servers */}
      {isSuperOwner(user.id) && (
        <>
          <div className="ov-sec-h">Super owner <span className="ov-line" /></div>
          <Link className="ov-super" href="/bot/role-access">
            <span className="ov-super-ico"><Icon name="shield" /></span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <div className="ov-a-t">Role access</div>
              <div className="ov-a-s">Give a Discord role site capabilities for the community servers — members with that role get the access automatically.</div>
            </span>
            <span className="ov-a-arrow">→</span>
          </Link>
        </>
      )}

      {/* QUICK ACTIONS */}
      {actions.length > 0 && (
        <>
          <div className="ov-sec-h">Quick actions <span className="ov-line" /></div>
          <div className="ov-actions">
            {actions.map((a) => (
              <Link className="ov-action" href={a.href} key={a.href}>
                <span className="ov-a-ico"><Icon name={a.icon} /></span>
                <span style={{ minWidth: 0 }}>
                  <div className="ov-a-t">{a.label}</div>
                  <div className="ov-a-s">{a.sub}</div>
                </span>
                <span className="ov-a-arrow">→</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* ACTIVITY + TOP MOVERS */}
      {seesActivity && (
        <div className="ov-grid">
          <div className="card">
            <div className="between" style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                <span className="livedot" /> Recent activity
              </div>
              <Link className="muted" href="/dashboard/audit" style={{ fontSize: 12.5 }}>View all →</Link>
            </div>
            <div className="ov-feed">
              {log.length === 0 && <div className="muted" style={{ padding: "14px 0" }}>Nothing yet. Grants and group actions show up here.</div>}
              {log.map((r, i) => {
                return (
                <div className="ov-feed-row" key={i}>
                  <DiscordAvatar actorId={r.actor_id} name={r.actor_name} size={32} />
                  <div className="ov-feed-main">
                    <DiscordLink id={r.actor_id}><b>{r.actor_name}</b></DiscordLink> {actionBadge(r.action)}{" "}
                    {r.item_key ? <b>{r.item_key}</b> : (r.category && r.category !== r.action ? <span className="muted">{r.category}</span> : null)}
                    {r.target ? <> <span className="muted">→</span> {robloxIdFrom(r.target) ? <RobloxLink id={robloxIdFrom(r.target)}><b>{r.target}</b></RobloxLink> : <b>{r.target}</b>}</> : ""}
                    {r.detail ? <span className="muted"> · {r.detail}</span> : ""}
                  </div>
                  <div className="ov-feed-time"><LocalTime value={new Date(r.created_at).getTime()} /></div>
                </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Top movers</div>
            {movers.length === 0 && <div className="muted" style={{ padding: "8px 0" }}>No activity this week.</div>}
            {movers.map((m, i) => (
              <div className="ov-mover" key={i}>
                <span className="ov-rank">{i + 1}</span>
                <span className="ov-mname"><DiscordLink id={m.actor_id}>{m.actor_name || "—"}</DiscordLink></span>
                <span className="ov-mbar" style={{ width: `${Math.max(8, Math.round((Number(m.n) / moverMax) * 96))}px` }} />
                <span className="ov-mcount">{m.n}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {whatsNew.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="between" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>What&apos;s new</div>
            <Link className="muted" href="/changelog" style={{ fontSize: 12.5 }}>Full changelog →</Link>
          </div>
          <div className="ov-news">
            {whatsNew.map((it, i) => (
              <div className="ov-news-row" key={i}>
                <span className={`cl-tag cl-tag-${NEWS_TONE[it.repo] || "dash"}`}>{it.label}</span>
                {it.url
                  ? <a className="ov-news-text" href={it.url} target="_blank" rel="noopener noreferrer">{it.text}</a>
                  : <span className="ov-news-text">{it.text}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
