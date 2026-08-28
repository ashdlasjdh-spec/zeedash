"use client";
// Detailed, feature-level diagrams for the docs deep-dives — now interactive:
// click any node/part to highlight it and read a detail caption below. Pure SVG +
// a little React state (CSP-safe). Vertical flows stay legible on mobile.
import { useState } from "react";

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

// Shared caption bar shown under an interactive diagram.
function Caption({ title, body, hint = "Tap a step to see how it works" }) {
  return (
    <div className={`dgm-cap ${title ? "on" : ""}`}>
      {title
        ? <><span className="dgm-cap-t">{title}</span>{body && <span className="dgm-cap-b">{body}</span>}</>
        : <span className="dgm-cap-hint">{hint}</span>}
    </div>
  );
}

// Vertical stepped flow: steps = [{ t, s, d? }]. Click a step to select it.
export function VFlow({ steps, accentLast = true }) {
  const [sel, setSel] = useState(-1);
  const rowH = 78, boxW = 300, x = 40, w = 420;
  const H = steps.length * rowH + 16;
  return (
    <div className="dgm">
      <svg viewBox={`0 0 ${w} ${H}`} width="100%" role="img" aria-label="Flow diagram" style={{ maxWidth: 460, display: "block", margin: "0 auto" }}>
        {baseDefs()}
        {steps.map((st, i) => {
          const y = 8 + i * rowH;
          const isAccent = (i === 0) || (accentLast && i === steps.length - 1);
          const on = sel === i;
          const fill = on ? "url(#d2-brand)" : isAccent ? "url(#d2-brand)" : C.surface;
          return (
            <g key={i} className="dgm-node" onClick={() => setSel(on ? -1 : i)} role="button" tabIndex={0}
               onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSel(on ? -1 : i))}>
              <rect x={x} y={y} width={boxW} height={54} rx="12" fill={fill}
                stroke={on ? "#fff" : isAccent ? "none" : C.line} strokeWidth={on ? 2 : 1.3} />
              <text x={x + 18} y={y + (st.s ? 24 : 31)} fill={(isAccent || on) ? "#fff" : C.text} fontSize="13.5" fontWeight="720">{st.t}</text>
              {st.s && <text x={x + 18} y={y + 40} fill={(isAccent || on) ? "rgba(255,255,255,.85)" : C.muted} fontSize="11">{st.s}</text>}
              {i < steps.length - 1 && <path d={`M${x + boxW / 2} ${y + 54} V ${y + rowH + 4}`} stroke={C.brand2} strokeWidth="1.8" markerEnd="url(#d2-arr)" fill="none" />}
            </g>
          );
        })}
      </svg>
      <Caption title={sel >= 0 ? steps[sel].t : null} body={sel >= 0 ? (steps[sel].d || steps[sel].s) : null} />
    </div>
  );
}

// Compact horizontal flow: items = ["trigger", "step", "result"] or {t,s,d}.
export function MiniFlow({ items }) {
  const [sel, setSel] = useState(-1);
  const bw = 158, gap = 30, h = 66, pad = 8;
  const w = items.length * bw + (items.length - 1) * gap + pad * 2;
  const norm = items.map((it) => (typeof it === "string" ? { t: it } : it));
  return (
    <div className="dgm">
      <svg viewBox={`0 0 ${w} ${h + pad * 2}`} width="100%" role="img" aria-label="Flow" style={{ maxWidth: "100%" }}>
        {baseDefs()}
        {norm.map((it, i) => {
          const x = pad + i * (bw + gap);
          const last = i === norm.length - 1;
          const on = sel === i;
          const fill = on ? "url(#d2-brand)" : last ? "url(#d2-brand)" : C.surface;
          return (
            <g key={i} className="dgm-node" onClick={() => setSel(on ? -1 : i)} role="button" tabIndex={0}
               onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSel(on ? -1 : i))}>
              <rect x={x} y={pad} width={bw} height={h} rx="12" fill={fill} stroke={on ? "#fff" : last ? "none" : C.line} strokeWidth={on ? 2 : 1.3} />
              <text x={x + bw / 2} y={pad + (it.s ? h / 2 - 4 : h / 2 + 5)} textAnchor="middle" fill={(last || on) ? "#fff" : C.text} fontSize="12.5" fontWeight="720">{it.t}</text>
              {it.s && <text x={x + bw / 2} y={pad + h / 2 + 13} textAnchor="middle" fill={(last || on) ? "rgba(255,255,255,.85)" : C.muted} fontSize="10.5">{it.s}</text>}
              {i < norm.length - 1 && <path d={`M${x + bw} ${pad + h / 2} H${x + bw + gap}`} stroke={C.brand2} strokeWidth="1.8" markerEnd="url(#d2-arr)" fill="none" />}
            </g>
          );
        })}
      </svg>
      <Caption title={sel >= 0 ? norm[sel].t : null} body={sel >= 0 ? (norm[sel].d || norm[sel].s) : null} />
    </div>
  );
}

// A generic labelled-part diagram: parts = [{ id, label, desc }]. The children render
// the art; hotspots are provided by the caller via the `spot` helper's onClick.
function useSpot() {
  const [sel, setSel] = useState(null);
  return [sel, setSel];
}

// Anatomy of a rendered crew tag — click the labels to learn each part.
export function CrewTagAnatomy() {
  const [sel, setSel] = useSpot();
  const parts = {
    icon: ["Icon (decal)", "An uploaded PNG turned into a Roblox decal, shown to the left of the text. Optional."],
    text: ["Tag text", "The label inside the brackets. Emoji are allowed."],
    colors: ["Color gradient", "1–8 colors blended across the text. One color = solid."],
    anim: ["Animation", "Scrolls the gradient across the text; set a direction + speed, or turn it off."],
  };
  const hot = (id) => ({
    className: "dgm-hot", onClick: () => setSel(sel === id ? null : id), role: "button", tabIndex: 0,
    onKeyDown: (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSel(sel === id ? null : id)),
  });
  const lblFill = (id) => (sel === id ? "#fff" : C.brand2);
  return (
    <div className="dgm">
      <svg viewBox="0 0 620 280" width="100%" role="img" aria-label="Crew tag anatomy" style={{ maxWidth: "100%" }}>
        {baseDefs()}
        <rect x="180" y="112" width="260" height="56" rx="12" fill={C.surface3} stroke={sel ? C.line : C.line} />
        <g {...hot("icon")}><rect x="196" y="126" width="28" height="28" rx="7" fill="url(#d2-brand)" stroke={sel === "icon" ? "#fff" : "none"} strokeWidth="2" /><text x="210" y="145" textAnchor="middle" fontSize="15" fill="#fff">★</text></g>
        <g {...hot("text")}><text x="236" y="149" fontSize="24" fontWeight="850" fill="url(#d2-tag)">[ CREW ]</text></g>
        <text x="310" y="200" textAnchor="middle" fontSize="13" fill={C.muted}>above a player&apos;s head, in-game</text>
        <g stroke={C.line} strokeWidth="1.2" fill="none">
          <path d="M210 126 L150 70" /><path d="M300 130 L300 70" /><path d="M430 132 L500 70" /><path d="M420 168 L500 220" />
        </g>
        <g fontSize="11.5" fontWeight="700">
          <text {...hot("icon")} x="150" y="60" textAnchor="middle" fill={lblFill("icon")}>Icon (decal)</text>
          <text {...hot("text")} x="300" y="60" textAnchor="middle" fill={lblFill("text")}>Tag text</text>
          <text {...hot("colors")} x="500" y="60" textAnchor="middle" fill={lblFill("colors")}>Color gradient</text>
          <text {...hot("anim")} x="500" y="216" textAnchor="middle" fill={lblFill("anim")}>Animation</text>
        </g>
      </svg>
      <Caption title={sel ? parts[sel][0] : null} body={sel ? parts[sel][1] : null} hint="Tap a label to learn each part" />
    </div>
  );
}

// Where a tag applies: group-wide vs per-rank (click either).
export function TagScope() {
  const [sel, setSel] = useSpot();
  const parts = {
    group: ["Group-wide tag", "Applies to every member of the Roblox group who doesn't have a more specific rank tag."],
    rank: ["Rank tag", "Set for one rank number; it overrides the group-wide tag for members of that rank."],
  };
  const hot = (id) => ({ className: "dgm-hot", onClick: () => setSel(sel === id ? null : id), role: "button", tabIndex: 0,
    onKeyDown: (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSel(sel === id ? null : id)) });
  return (
    <div className="dgm">
      <svg viewBox="0 0 620 220" width="100%" role="img" aria-label="Tag scope" style={{ maxWidth: "100%" }}>
        {baseDefs()}
        <rect x="20" y="20" width="580" height="180" rx="14" fill={C.surface} stroke={C.line} />
        <text x="40" y="48" fontSize="14" fontWeight="750" fill={C.text}>Roblox group</text>
        <text x="40" y="66" fontSize="11.5" fill={C.faint}>e.g. 1099600954</text>
        <g {...hot("group")}><rect x="40" y="86" width="250" height="44" rx="10" fill="url(#d2-brand)" stroke={sel === "group" ? "#fff" : "none"} strokeWidth="2" />
          <text x="58" y="108" fontSize="13" fontWeight="720" fill="#fff">Group-wide tag</text><text x="58" y="122" fontSize="10.5" fill="rgba(255,255,255,.85)">every member with no rank tag</text></g>
        <g {...hot("rank")}><rect x="310" y="86" width="270" height="44" rx="10" fill={C.surface3} stroke={sel === "rank" ? "#fff" : C.line} strokeWidth={sel === "rank" ? 2 : 1} />
          <text x="328" y="108" fontSize="13" fontWeight="720" fill={C.text}>Rank tag (rank 255)</text><text x="328" y="122" fontSize="10.5" fill={C.muted}>overrides the group tag for that rank</text></g>
        <text x="310" y="176" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={C.text}>Most specific tag wins — a rank tag beats the group tag.</text>
      </svg>
      <Caption title={sel ? parts[sel][0] : null} body={sel ? parts[sel][1] : null} hint="Tap either tag to compare" />
    </div>
  );
}

// Emoji badges beside a name (click to learn).
export function EmojiAnatomy() {
  const [sel, setSel] = useSpot();
  const parts = {
    emojis: ["Assigned emojis", "One or more unicode emoji pinned to the player. Set replaces them, Add appends, Remove clears."],
  };
  const hot = (id) => ({ className: "dgm-hot", onClick: () => setSel(sel === id ? null : id), role: "button", tabIndex: 0,
    onKeyDown: (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSel(sel === id ? null : id)) });
  return (
    <div className="dgm">
      <svg viewBox="0 0 560 150" width="100%" role="img" aria-label="Player emojis" style={{ maxWidth: "100%" }}>
        {baseDefs()}
        <rect x="150" y="52" width="260" height="46" rx="12" fill={C.surface3} stroke={C.line} />
        <text x="170" y="82" fontSize="16" fontWeight="750" fill={C.text}>Builderman</text>
        <g {...hot("emojis")}><rect x="292" y="60" width="70" height="30" rx="7" fill={sel === "emojis" ? "rgba(224,31,31,.18)" : "transparent"} stroke={sel === "emojis" ? "#fff" : "none"} strokeWidth="1.5" /><text x="300" y="83" fontSize="18"></text></g>
        <path d="M320 60 L340 22" stroke={C.line} strokeWidth="1.2" fill="none" />
        <text {...hot("emojis")} x="360" y="20" fontSize="11.5" fontWeight="700" fill={sel === "emojis" ? "#fff" : C.brand2}>Assigned emojis</text>
        <text x="280" y="122" textAnchor="middle" fontSize="12" fill={C.muted}>shown next to the player in-game</text>
      </svg>
      <Caption title={sel ? parts[sel][0] : null} body={sel ? parts[sel][1] : null} hint="Tap the emojis to learn more" />
    </div>
  );
}
