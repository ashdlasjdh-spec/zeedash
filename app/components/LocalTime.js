"use client";
import { useEffect, useState } from "react";

// Renders an absolute timestamp in the VIEWER's local timezone. Server components
// (e.g. the Overview activity feed) would otherwise format with the server's clock
// — UTC on Vercel — so times looked hours ahead of the live header clock. Formatting
// on the client fixes that: every timestamp now matches the viewer's own time.
const DEFAULT = { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };

export default function LocalTime({ value, options }) {
  const ms = typeof value === "number" ? value : Date.parse(value);
  const opts = options || DEFAULT;
  const fmt = () => (Number.isNaN(ms) ? String(value ?? "") : new Date(ms).toLocaleString([], opts));
  const [text, setText] = useState(fmt);
  // Re-format after hydration so it's the client's timezone, not the SSR (UTC) one.
  useEffect(() => { setText(fmt()); }, [ms]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span suppressHydrationWarning>{text}</span>;
}
