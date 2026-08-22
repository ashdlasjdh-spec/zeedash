// Detailed, feature-level diagrams for the docs deep-dives. Pure SVG (CSP-safe),
// vertical flows so they stay legible on mobile. Colours mirror the red brand.
const C = {
  bg: "#0a0a0c", surface: "#141418", surface3: "#1b1b20", line: "#232329",
  text: "#f4f4f6", muted: "#9a9aa6", faint: "#5e5e6a",
  brand: "#e01f1f", brand2: "#ff3b30", good: "#4ade80", warn: "#e0a53a",
};

function baseDefs() {
  return (
    <defs>
      <linearGradient id="d2-brand" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={C.brand2} /><stop offset="1" stopColor={C.brand} />
      </linearGradient>
      <linearGradient id="d2-tag" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#e01f1f" /><stop offset="1" stopColor="#ff8a3d" />
      </linearGradient>
      <marker id="d2-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill={C.brand2} />
      </marker>
    </defs>
  );
}

// Vertical stepped flow: steps = [{ t, s, note }]. Optional accent on first/last.
export function VFlow({ steps, accentLast = true }) {
  const rowH = 78, boxW = 300, x = 40, w = 420;
  const H = steps.length * rowH + 16;
  return (
    <svg viewBox={`0 0 ${w} ${H}`} width="100%" role="img" aria-label="Flow diagram" style={{ maxWidth: 460, display: "block", margin: "0 auto" }}>
      {baseDefs()}
      {steps.map((st, i) => {
        const y = 8 + i * rowH;
        const isAccent = (i === 0) || (accentLast && i === steps.length - 1);
        return (
          <g key={i}>
            <rect x={x} y={y} width={boxW} height={54} rx="12"
              fill={isAccent ? "url(#d2-brand)" : C.surface} stroke={isAccent ? "none" : C.line} strokeWidth="1.3" />
            <text x={x + 18} y={y + (st.s ? 24 : 31)} fill={isAccent ? "#fff" : C.text} fontSize="13.5" fontWeight="720">{st.t}</text>
            {st.s && <text x={x + 18} y={y + 40} fill={isAccent ? "rgba(255,255,255,.85)" : C.muted} fontSize="11">{st.s}</text>}
            {st.note && <text x={x + boxW + 14} y={y + 31} fill={C.faint} fontSize="11">{st.note}</text>}
            {i < steps.length - 1 && <path d={`M${x + boxW / 2} ${y + 54} V ${y + rowH + 4}`} stroke={C.brand2} strokeWidth="1.8" markerEnd="url(#d2-arr)" fill="none" />}
          </g>
        );
      })}
    </svg>
  );
}

// Anatomy of a rendered crew tag — a real gradient tag with labelled callouts.
export function CrewTagAnatomy() {
  return (
    <svg viewBox="0 0 620 280" width="100%" role="img" aria-label="Crew tag anatomy" style={{ maxWidth: "100%" }}>
      {baseDefs()}
      {/* the tag chip */}
      <g>
        <rect x="180" y="112" width="260" height="56" rx="12" fill={C.surface3} stroke={C.line} />
        {/* icon slot */}
        <rect x="196" y="126" width="28" height="28" rx="7" fill="url(#d2-brand)" />
        <text x="210" y="145" textAnchor="middle" fontSize="15" fill="#fff">★</text>
        {/* gradient text */}
        <text x="236" y="149" fontSize="24" fontWeight="850" fill="url(#d2-tag)">[ CREW ]</text>
      </g>
      {/* player name below */}
      <text x="310" y="200" textAnchor="middle" fontSize="13" fill={C.muted}>above a player&apos;s head, in-game</text>

      {/* callouts */}
      <g stroke={C.line} strokeWidth="1.2" fill="none">
        <path d="M210 126 L150 70" /><path d="M300 130 L300 70" /><path d="M430 132 L500 70" /><path d="M420 168 L500 220" />
      </g>
      <g fontSize="11.5" fontWeight="700">
        <text x="150" y="60" textAnchor="middle" fill={C.brand2}>Icon (decal)</text>
        <text x="150" y="74" textAnchor="middle" fill={C.faint} fontWeight="500" fontSize="10.5">uploaded PNG</text>
        <text x="300" y="60" textAnchor="middle" fill={C.brand2}>Tag text</text>
        <text x="300" y="74" textAnchor="middle" fill={C.faint} fontWeight="500" fontSize="10.5">emoji allowed</text>
        <text x="500" y="60" textAnchor="middle" fill={C.brand2}>Color gradient</text>
        <text x="500" y="74" textAnchor="middle" fill={C.faint} fontWeight="500" fontSize="10.5">1–8 colors</text>
        <text x="500" y="216" textAnchor="middle" fill={C.brand2}>Animation</text>
        <text x="500" y="230" textAnchor="middle" fill={C.faint} fontWeight="500" fontSize="10.5">scroll dir + speed</text>
      </g>
    </svg>
  );
}

// Where a tag applies: group-wide vs per-rank.
export function TagScope() {
  return (
    <svg viewBox="0 0 620 220" width="100%" role="img" aria-label="Tag scope" style={{ maxWidth: "100%" }}>
      {baseDefs()}
      <rect x="20" y="20" width="580" height="180" rx="14" fill={C.surface} stroke={C.line} />
      <text x="40" y="48" fontSize="14" fontWeight="750" fill={C.text}>Roblox group</text>
      <text x="40" y="66" fontSize="11.5" fill={C.faint}>e.g. 1099600954</text>

      <rect x="40" y="86" width="250" height="44" rx="10" fill="url(#d2-brand)" />
      <text x="58" y="108" fontSize="13" fontWeight="720" fill="#fff">Group-wide tag</text>
      <text x="58" y="122" fontSize="10.5" fill="rgba(255,255,255,.85)">every member with no rank tag</text>

      <rect x="310" y="86" width="270" height="44" rx="10" fill={C.surface3} stroke={C.line} />
      <text x="328" y="108" fontSize="13" fontWeight="720" fill={C.text}>Rank tag (rank 255)</text>
      <text x="328" y="122" fontSize="10.5" fill={C.muted}>overrides the group tag for that rank</text>

      <path d="M165 130 V 150" stroke={C.brand2} strokeWidth="1.6" markerEnd="url(#d2-arr)" fill="none" />
      <path d="M445 130 V 150" stroke={C.brand2} strokeWidth="1.6" markerEnd="url(#d2-arr)" fill="none" />
      <text x="310" y="176" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={C.text}>Most specific tag wins — a rank tag beats the group tag.</text>
    </svg>
  );
}

// Emoji badges beside a name.
export function EmojiAnatomy() {
  return (
    <svg viewBox="0 0 560 150" width="100%" role="img" aria-label="Player emojis" style={{ maxWidth: "100%" }}>
      {baseDefs()}
      <rect x="150" y="52" width="260" height="46" rx="12" fill={C.surface3} stroke={C.line} />
      <text x="170" y="82" fontSize="16" fontWeight="750" fill={C.text}>Builderman</text>
      <text x="300" y="83" fontSize="18">⭐💖🔥</text>
      <path d="M320 52 L340 22" stroke={C.line} strokeWidth="1.2" fill="none" />
      <text x="360" y="20" fontSize="11.5" fontWeight="700" fill={C.brand2}>Assigned emojis</text>
      <text x="360" y="34" fontSize="10.5" fill={C.faint}>set · add · remove</text>
      <text x="280" y="122" textAnchor="middle" fontSize="12" fill={C.muted}>shown next to the player in-game</text>
    </svg>
  );
}
