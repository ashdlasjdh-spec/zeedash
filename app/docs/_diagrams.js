// Hand-built SVG diagrams for the docs. Pure markup (CSP-safe, no scripts), sized
// with viewBox so they scale cleanly on mobile. Colours mirror the design tokens.
const C = {
  bg: "#0a0a0c", surface: "#141418", surface3: "#1b1b20",
  line: "#232329", text: "#f4f4f6", muted: "#9a9aa6", faint: "#5e5e6a",
  brand: "#5865f2", brand2: "#7c5cff", good: "#4ade80", warn: "#e0a53a", bad: "#ef5f6b",
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

function Node({ x, y, w = 150, h = 66, title, sub, accent = false, fill = C.surface }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="13"
        fill={accent ? "url(#dg-brand)" : fill} stroke={accent ? "none" : C.line} strokeWidth="1.4" />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 5 : h / 2 + 4)} textAnchor="middle"
        fill={accent ? "#fff" : C.text} fontSize="14.5" fontWeight="750">{title}</text>
      {sub && <text x={x + w / 2} y={y + h / 2 + 14} textAnchor="middle"
        fill={accent ? "rgba(255,255,255,.85)" : C.muted} fontSize="11.5">{sub}</text>}
    </g>
  );
}

// ---- The whole ecosystem ----
export function SystemDiagram() {
  return (
    <svg viewBox="0 0 760 430" width="100%" role="img" aria-label="System architecture" style={{ maxWidth: "100%" }}>
      {defs()}
      {/* people */}
      <Node x={30} y={30} w={150} h={60} title="Staff" sub="Discord login" />
      <Node x={30} y={340} w={150} h={60} title="Players" sub="in the Roblox game" />

      {/* core */}
      <Node x={300} y={26} w={170} h={70} title="zhd.lol" sub="Next.js dashboard" accent />
      <Node x={300} y={180} w={170} h={70} title="Perks API" sub="grant engine + auth" />
      <Node x={300} y={336} w={170} h={68} title="Zee-hood Bot" sub="Discord.js" />

      {/* data + external */}
      <Node x={575} y={26} w={155} h={70} title="Postgres" sub="grants · bans · config" fill={C.surface3} />
      <Node x={575} y={180} w={155} h={70} title="Roblox" sub="DataStore · Open Cloud" fill={C.surface3} />
      <Node x={575} y={336} w={155} h={68} title="Discord" sub="guilds · roles · logs" fill={C.surface3} />

      {/* edges */}
      <g fill="none" strokeWidth="1.8" markerEnd="url(#dg-arrow)" stroke={C.brand2}>
        <path d="M180 60 H300" />
        <path d="M385 96 V180" />
        <path d="M385 250 V336" />
        <path d="M470 61 H575" />
        <path d="M470 215 H575" />
        <path d="M470 370 H575" />
      </g>
      <g fill="none" strokeWidth="1.6" markerEnd="url(#dg-arrow-m)" stroke={C.muted} strokeDasharray="5 4">
        <path d="M180 370 H300" />
        <path d="M652 250 V336" />
      </g>
      <text x={240} y={52} fill={C.faint} fontSize="10.5">OAuth</text>
      <text x={505} y={53} fill={C.faint} fontSize="10.5">read/write</text>
      <text x={505} y={207} fill={C.faint} fontSize="10.5">Open Cloud</text>
      <text x={210} y={362} fill={C.faint} fontSize="10.5">play</text>
    </svg>
  );
}

// ---- A grant, end to end ----
export function GrantFlow() {
  const steps = [
    { t: "Staff clicks Grant", s: "Powers page" },
    { t: "POST /api/grant", s: "level checked" },
    { t: "Grant engine", s: "writes record" },
    { t: "Postgres + Roblox", s: "DataStore set" },
    { t: "Player sees it", s: "next join" },
  ];
  return (
    <svg viewBox="0 0 760 150" width="100%" role="img" aria-label="Grant data flow" style={{ maxWidth: "100%" }}>
      {defs()}
      {steps.map((st, i) => {
        const x = 12 + i * 150;
        return (
          <g key={i}>
            <rect x={x} y={40} width={128} height={64} rx="12" fill={i === 0 ? "url(#dg-brand)" : C.surface} stroke={i === 0 ? "none" : C.line} strokeWidth="1.3" />
            <text x={x + 64} y={68} textAnchor="middle" fill={i === 0 ? "#fff" : C.text} fontSize="12.5" fontWeight="720">{st.t}</text>
            <text x={x + 64} y={85} textAnchor="middle" fill={i === 0 ? "rgba(255,255,255,.85)" : C.muted} fontSize="10.5">{st.s}</text>
            {i < steps.length - 1 && <path d={`M${x + 128} 72 H${x + 150}`} stroke={C.brand2} strokeWidth="1.8" markerEnd="url(#dg-arrow)" fill="none" />}
          </g>
        );
      })}
    </svg>
  );
}

// ---- Discord OAuth login ----
export function AuthFlow() {
  const steps = [
    { t: "Continue with Discord", s: "/api/auth/login" },
    { t: "Discord consent", s: "OAuth2" },
    { t: "Callback + state check", s: "/api/auth/callback" },
    { t: "Whitelist lookup", s: "level resolved" },
    { t: "Signed session cookie", s: "→ /dashboard" },
  ];
  return (
    <svg viewBox="0 0 760 150" width="100%" role="img" aria-label="Login flow" style={{ maxWidth: "100%" }}>
      {defs()}
      {steps.map((st, i) => {
        const x = 12 + i * 150;
        const last = i === steps.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={40} width={128} height={64} rx="12" fill={last ? "url(#dg-brand)" : C.surface} stroke={last ? "none" : C.line} strokeWidth="1.3" />
            <text x={x + 64} y={68} textAnchor="middle" fill={last ? "#fff" : C.text} fontSize="11.5" fontWeight="720">{st.t}</text>
            <text x={x + 64} y={85} textAnchor="middle" fill={last ? "rgba(255,255,255,.85)" : C.muted} fontSize="10">{st.s}</text>
            {i < steps.length - 1 && <path d={`M${x + 128} 72 H${x + 150}`} stroke={C.brand2} strokeWidth="1.8" markerEnd="url(#dg-arrow)" fill="none" />}
          </g>
        );
      })}
    </svg>
  );
}

// ---- Permission ladder ----
export function PermissionLadder() {
  const rungs = [
    { lvl: "∞", name: "Super Owners", note: "Bypass every check, everywhere", accent: true },
    { lvl: "255", name: "Founders", note: "Full config + purge" },
    { lvl: "254", name: "Co-founders", note: "Whitelist · tags · emojis · grants" },
    { lvl: "251+", name: "Owners / Leadership", note: "Bulk actions · config" },
    { lvl: "240+", name: "Admin / Senior", note: "Grants · bans" },
    { lvl: "237+", name: "Mods / Helpers", note: "Bans · lookups" },
    { lvl: "1+", name: "Staff / Chat mods", note: "Scoped tools" },
  ];
  const rh = 44, top = 14;
  return (
    <svg viewBox={`0 0 720 ${top * 2 + rungs.length * rh}`} width="100%" role="img" aria-label="Permission ladder" style={{ maxWidth: "100%" }}>
      {defs()}
      {rungs.map((r, i) => {
        const y = top + i * rh;
        return (
          <g key={i}>
            <rect x={14} y={y} width={692} height={rh - 8} rx="10"
              fill={r.accent ? "url(#dg-brand)" : C.surface} stroke={r.accent ? "none" : C.line} strokeWidth="1.2" />
            <rect x={14} y={y} width={70} height={rh - 8} rx="10" fill={r.accent ? "rgba(0,0,0,.18)" : C.surface3} />
            <text x={49} y={y + rh / 2 - 1} textAnchor="middle" fill={r.accent ? "#fff" : C.brand2} fontSize="14" fontWeight="820">{r.lvl}</text>
            <text x={100} y={y + rh / 2 - 1} fill={r.accent ? "#fff" : C.text} fontSize="13.5" fontWeight="720">{r.name}</text>
            <text x={702} y={y + rh / 2 - 1} textAnchor="end" fill={r.accent ? "rgba(255,255,255,.88)" : C.muted} fontSize="11.5">{r.note}</text>
          </g>
        );
      })}
    </svg>
  );
}
