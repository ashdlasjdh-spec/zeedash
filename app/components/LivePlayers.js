"use client";
import { useEffect, useState } from "react";

// The game's current player count, refreshed every 30s while the tab is visible. Starts from the
// server-rendered `initial` so there's no flash of "—".
export default function LivePlayers({ initial = null }) {
  const [n, setN] = useState(initial);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/game-stats", { cache: "no-store" });
        const d = await r.json();
        if (alive && d && d.playing != null) setN(d.playing);
      } catch { /* keep last-known */ }
    };
    load();
    const iv = setInterval(() => { if (document.visibilityState === "visible") load(); }, 30000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  return <>{n == null ? "—" : Number(n).toLocaleString()}</>;
}
