"use client";
// Hand-built, interactive SVG diagrams for the docs — click any node/step to
// highlight it and read a detail caption. Pure markup + a little React state
// (CSP-safe), sized with viewBox so they scale cleanly on mobile.
import { useState } from "react";

const C = {
  bg: "#0a0a0c", surface: "#141418", surface3: "#1b1b20",
  line: "#232329", text: "#f4f4f6", muted: "#9a9aa6", faint: "#5e5e6a",
  brand: "#e01f1f", brand2: "#ff3b30", good: "#4ade80", warn: "#e0a53a", bad: "#ef5f6b",
};

function defs() {
  return (
    <defs>
      <linearGradient id="dg-brand" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={C.brand2} /><stop offset="1" stopColor={C.brand} />
      </linearGradient>
      <marker id="dg-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill={C.brand2} />
      </marker>
      <marker id="dg-arrow-m" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill={C.muted} />
      </marker>
    </defs>
  );
}

function Caption({ title, body, hint = "Tap a box to see details" }) {
  return (
    <div className={`dgm-cap ${title ? "on" : ""}`}>
      {title
        ? <><span className="dgm-cap-t">{title}</span>{body && <span className="dgm-cap-b">{body}</span>}</>
        : <span className="dgm-cap-hint">{hint}</span>}
    </div>
  );
}

function Node({ x, y, w = 150, h = 66, title, sub, accent = false, fill = C.surface, on = false, onClick }) {
  const clickable = !!onClick;
  return (
    <g className={clickable ? "dgm-node" : undefined} onClick={onClick} role={clickable ? "button" : undefined} tabIndex={clickable ? 0 : undefined}
       onKeyDown={clickable ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick()) : undefined}>
      <rect x={x} y={y} width={w} height={h} rx="13"
        fill={on ? "url(#dg-brand)" : accent ? "url(#dg-brand)" : fill}
        stroke={on ? "#fff" : accent ? "none" : C.line} strokeWidth={on ? 2 : 1.4} />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 5 : h / 2 + 4)} textAnchor="middle"
        fill={(accent || on) ? "#fff" : C.text} fontSize="14.5" fontWeight="750">{title}</text>
      {sub && <text x={x + w / 2} y={y + h / 2 + 14} textAnchor="middle"
        fill={(accent || on) ? "rgba(255,255,255,.85)" : C.muted} fontSize="11.5">{sub}</text>}
    </g>
  );
}

// ---- The whole ecosystem ----
export function SystemDiagram() {
  const [sel, setSel] = useState(null);
  const info = {
    staff: ["Staff", "Community staff sign in with Discord to reach the control panel."],
    players: ["Players", "People playing the Roblox game — they receive the grants staff hand out."],
    dash: ["zhd.lol dashboard", "The Next.js control panel. Server-rendered, staff-only, talks to the Perks API."],
    api: ["Perks API", "Owns the grant engine and auth; the dashboard and bot both call it."],
    bot: ["Zee-hood bot", "The Discord.js bot. Shares the database with the panel so both see one truth."],
    pg: ["Postgres", "The single source of truth — grants, bans, whitelist, per-server config."],
    rblx: ["Roblox", "Grants are pushed into the game's DataStore over Open Cloud."],
    dis: ["Discord", "OAuth login plus the guilds, roles and channels the bot manages."],
  };
  const s = (id) => ({ on: sel === id, onClick: () => setSel(sel === id ? null : id) });
  return (
    <div className="dgm">
      <svg viewBox="0 0 760 430" width="100%" role="img" aria-label="System architecture" style={{ maxWidth: "100%" }}>
        {defs()}
        <Node x={30} y={30} w={150} h={60} title="Staff" sub="Discord login" {...s("staff")} />
        <Node x={30} y={340} w={150} h={60} title="Players" sub="in the Roblox game" {...s("players")} />
        <Node x={300} y={26} w={170} h={70} title="zhd.lol" sub="Next.js dashboard" accent {...s("dash")} />
        <Node x={300} y={180} w={170} h={70} title="Perks API" sub="grant engine + auth" {...s("api")} />
        <Node x={300} y={336} w={170} h={68} title="Zee-hood Bot" sub="Discord.js" {...s("bot")} />
        <Node x={575} y={26} w={155} h={70} title="Postgres" sub="grants · bans · config" fill={C.surface3} {...s("pg")} />
        <Node x={575} y={180} w={155} h={70} title="Roblox" sub="DataStore · Open Cloud" fill={C.surface3} {...s("rblx")} />
        <Node x={575} y={336} w={155} h={68} title="Discord" sub="guilds · roles · logs" fill={C.surface3} {...s("dis")} />
        <g fill="none" strokeWidth="1.8" markerEnd="url(#dg-arrow)" stroke={C.brand2}>
          <path d="M180 60 H300" /><path d="M385 96 V180" /><path d="M385 250 V336" />
          <path d="M470 61 H575" /><path d="M470 215 H575" /><path d="M470 370 H575" />
        </g>
        <g fill="none" strokeWidth="1.6" markerEnd="url(#dg-arrow-m)" stroke={C.muted} strokeDasharray="5 4">
          <path d="M180 370 H300" /><path d="M652 250 V336" />
        </g>
        <text x={240} y={52} fill={C.faint} fontSize="10.5">OAuth</text>
        <text x={505} y={53} fill={C.faint} fontSize="10.5">read/write</text>
        <text x={505} y={207} fill={C.faint} fontSize="10.5">Open Cloud</text>
        <text x={210} y={362} fill={C.faint} fontSize="10.5">play</text>
      </svg>
      <Caption title={sel ? info[sel][0] : null} body={sel ? info[sel][1] : null} hint="Tap any box to learn its role" />
    </div>
  );
}

// Shared clickable horizontal step-flow used by GrantFlow + AuthFlow.
function StepFlow({ label, steps }) {
  const [sel, setSel] = useState(-1);
  return (
    <div className="dgm">
      <svg viewBox="0 0 760 150" width="100%" role="img" aria-label={label} style={{ maxWidth: "100%" }}>
        {defs()}
        {steps.map((st, i) => {
          const x = 12 + i * 150;
          const on = sel === i;
          const first = i === 0;
          const fill = on || first ? "url(#dg-brand)" : C.surface;
          return (
            <g key={i} className="dgm-node" onClick={() => setSel(on ? -1 : i)} role="button" tabIndex={0}
               onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSel(on ? -1 : i))}>
              <rect x={x} y={40} width={128} height={64} rx="12" fill={fill} stroke={on ? "#fff" : first ? "none" : C.line} strokeWidth={on ? 2 : 1.3} />
              <text x={x + 64} y={68} textAnchor="middle" fill={(first || on) ? "#fff" : C.text} fontSize="11.8" fontWeight="720">{st.t}</text>
              <text x={x + 64} y={85} textAnchor="middle" fill={(first || on) ? "rgba(255,255,255,.85)" : C.muted} fontSize="10">{st.s}</text>
              {i < steps.length - 1 && <path d={`M${x + 128} 72 H${x + 150}`} stroke={C.brand2} strokeWidth="1.8" markerEnd="url(#dg-arrow)" fill="none" />}
            </g>
          );
        })}
      </svg>
      <Caption title={sel >= 0 ? steps[sel].t : null} body={sel >= 0 ? (steps[sel].d || steps[sel].s) : null} />
    </div>
  );
}

// ---- A grant, end to end ----
export function GrantFlow() {
  return <StepFlow label="Grant data flow" steps={[
    { t: "Staff clicks Grant", s: "Powers page", d: "A staff member picks an item and a Roblox username on a grant page and hits Grant." },
    { t: "POST /api/grant", s: "level checked", d: "The request hits the Perks API, which checks the staffer's level before doing anything." },
    { t: "Grant engine", s: "writes record", d: "The grant engine records the grant and prepares the in-game write." },
    { t: "Postgres + Roblox", s: "DataStore set", d: "The grant is saved to Postgres and pushed into the game's DataStore over Open Cloud, together." },
    { t: "Player sees it", s: "next join", d: "The player has the perk the next time they join — or immediately if they're already in." },
  ]} />;
}

// ---- Discord OAuth login ----
export function AuthFlow() {
  return <StepFlow label="Login flow" steps={[
    { t: "Continue with Discord", s: "/api/auth/login", d: "You click Staff login, then Continue with Discord on the login card." },
    { t: "Discord consent", s: "OAuth2", d: "Discord asks you to authorise the app once. Nothing is posted on your behalf." },
    { t: "Callback + state check", s: "/api/auth/callback", d: "Discord redirects back with a code; a state check blocks forged callbacks." },
    { t: "Whitelist lookup", s: "level resolved", d: "The panel looks you up on the staff whitelist and resolves your access level." },
    { t: "Signed session cookie", s: "→ /dashboard", d: "You get a server-signed session cookie and land on your dashboard." },
  ]} />;
}

// ---- Permission ladder ----
export function PermissionLadder() {
  const [sel, setSel] = useState(-1);
  const rungs = [
    { lvl: "∞", name: "Super Owners", note: "Bypass every check, everywhere", accent: true, d: "A tiny, hard-coded list of Discord IDs that can do anything on the panel and the bot, regardless of roles." },
    { lvl: "255", name: "Founders", note: "Full config + purge", d: "The top of the ladder — full configuration access and the ability to purge data." },
    { lvl: "254", name: "Co-founders", note: "Whitelist · tags · emojis · grants", d: "Can whitelist staff, manage crew tags and emojis, and manage grants." },
    { lvl: "251+", name: "Owners / Leadership", note: "Bulk actions · config", d: "Leadership tier — bulk bans and broad server configuration." },
    { lvl: "240+", name: "Admin / Senior", note: "Grants · bans", d: "Admins can grant perks and ban players." },
    { lvl: "237+", name: "Mods / Helpers", note: "Bans · lookups", d: "Moderators can ban/warn/kick and look players up." },
    { lvl: "1+", name: "Staff / Chat mods", note: "Scoped tools", d: "Entry staff and chat-moderation roles with scoped access to specific tools." },
  ];
  const rh = 44, top = 14;
  return (
    <div className="dgm">
      <svg viewBox={`0 0 720 ${top * 2 + rungs.length * rh}`} width="100%" role="img" aria-label="Permission ladder" style={{ maxWidth: "100%" }}>
        {defs()}
        {rungs.map((r, i) => {
          const y = top + i * rh;
          const on = sel === i;
          const fill = on || r.accent ? "url(#dg-brand)" : C.surface;
          return (
            <g key={i} className="dgm-node" onClick={() => setSel(on ? -1 : i)} role="button" tabIndex={0}
               onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSel(on ? -1 : i))}>
              <rect x={14} y={y} width={692} height={rh - 8} rx="10" fill={fill} stroke={on ? "#fff" : r.accent ? "none" : C.line} strokeWidth={on ? 2 : 1.2} />
              <rect x={14} y={y} width={70} height={rh - 8} rx="10" fill={(r.accent || on) ? "rgba(0,0,0,.18)" : C.surface3} />
              <text x={49} y={y + rh / 2 - 1} textAnchor="middle" fill={(r.accent || on) ? "#fff" : C.brand2} fontSize="14" fontWeight="820">{r.lvl}</text>
              <text x={100} y={y + rh / 2 - 1} fill={(r.accent || on) ? "#fff" : C.text} fontSize="13.5" fontWeight="720">{r.name}</text>
              <text x={702} y={y + rh / 2 - 1} textAnchor="end" fill={(r.accent || on) ? "rgba(255,255,255,.88)" : C.muted} fontSize="11.5">{r.note}</text>
            </g>
          );
        })}
      </svg>
      <Caption title={sel >= 0 ? rungs[sel].name : null} body={sel >= 0 ? rungs[sel].d : null} hint="Tap a rank to see what it unlocks" />
    </div>
  );
}
