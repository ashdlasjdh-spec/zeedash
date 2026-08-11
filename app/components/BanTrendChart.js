"use client";
import { useEffect, useState } from "react";
import { AreaChart } from "./chart";

// Daily game-ban trend — ALL bans on the Roblox game (Open Cloud restriction logs), not just the
// ones issued from this dashboard. Same area chart the Server analytics uses. Falls back to the
// server-rendered audit-log series until the live data loads, and if Roblox can't be reached.
export default function BanTrendChart({ initial = [], liveInitial = false, minTotal = 0 }) {
  const [series, setSeries] = useState(initial);
  const [live, setLive] = useState(liveInitial);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/ban-trends?days=14", { cache: "no-store" });
        const d = await r.json();
        // Only adopt the live series when it's healthy AND accounts for at least the bans we already
        // know happened on-site — otherwise a parse/endpoint drift can't blank the chart.
        if (alive && d?.ok && d.series?.length) {
          const total = d.series.reduce((s, x) => s + (Number(x.bans) || 0), 0);
          if (total >= minTotal) { setSeries(d.series); setLive(true); }
        }
      } catch { /* keep last-known */ }
    };
    load();
    const iv = setInterval(() => { if (document.visibilityState === "visible") load(); }, 120000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const data = series?.length ? series : initial;
  const total = data.reduce((s, r) => s + (Number(r.bans) || 0), 0);

  return (
    <div className="card">
      <div className="between" style={{ alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>Game bans per day</div>
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 16 }}>
            Every ban on the Roblox game — last 14 days{total ? ` · ${total.toLocaleString()} total` : ""}.
          </div>
        </div>
        <span className="livedot" title={live ? "Live from Roblox" : "Waiting on Roblox…"} style={{ marginTop: 4 }} />
      </div>
      <AreaChart series={data} label="bans" accessor={(s) => s.bans || 0} color="#f87171" />
    </div>
  );
}
