"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

// Home grid of every Discord server the signed-in user can manage — a quick jump to each server's
// management. Hidden when there's only one (the picker already covers that) or none.
export default function ServerGrid() {
  const [guilds, setGuilds] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/server-stats/guilds").then((r) => r.json()).then((j) => { if (alive) setGuilds(Array.isArray(j.guilds) ? j.guilds : []); }).catch(() => { if (alive) setGuilds([]); });
    return () => { alive = false; };
  }, []);

  if (!guilds || guilds.length <= 1) return null;
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Your servers ({guilds.length})</div>
      <div className="sg-grid">
        {guilds.map((g) => (
          <Link key={g.id} className="sg-card" href={`/bot?guild=${g.id}`}>
            {g.icon
              ? <img className="sg-icon" src={g.icon.startsWith("http") ? g.icon : `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64`} alt="" width="40" height="40" referrerPolicy="no-referrer" />
              : <span className="sg-fb">{(g.name || "?")[0].toUpperCase()}</span>}
            <span className="sg-name">{g.name}</span>
            <span className="sg-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
