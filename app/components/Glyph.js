// Shared monochrome line-icon set (stroke = currentColor). Used by page headers and cards.
const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };

export const GLYPHS = {
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
  list: <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" {...P} />,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" {...P} /></>,
  clock: <><circle cx="12" cy="12" r="9" {...P} /><path d="M12 7v5l3 2" {...P} /></>,
  activity: <path d="M3 12h4l2.5 7 4-15L16 12h5" {...P} />,
};

export default function Glyph({ name, size = 24 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{GLYPHS[name] || null}</svg>;
}
