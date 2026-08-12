"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import DiscordAvatar from "./DiscordAvatar";
import { DiscordLink } from "./ProfileLinks";
import { useGuilds } from "./metaFields";

// Top members by XP for the selected guild (Levels feature). Reads /api/levels/board.
export default function XpLeaderboard() {
  const sp = useSearchParams();
  const guildParam = sp.get("guild") || "";
  const guilds = useGuilds();
  const [rows, setRows] = useState(null);
  const guild = guildParam || guilds[0]?.id || "";

  useEffect(() => {
    if (!guild) return;
    setRows(null);
    fetch(`/api/levels/board?guild=${guild}&limit=25`).then((r) => r.json()).then((j) => setRows(j.rows || [])).catch(() => setRows([]));
  }, [guild]);

  const max = Math.max(1, ...(rows || []).map((r) => r.xp));

  return (
    <div className="card" style={{ maxWidth: 720, marginTop: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>XP leaderboard</div>
      <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>Top members by XP. Members can also check their own with <code>/rank</code>.</div>
      {rows == null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton-row" />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>No XP earned yet — once Levels is on and members chat, they&apos;ll appear here.</p>
      ) : (
        <div className="lb-list">
          {rows.map((u, i) => (
            <div className="lb-row lb-row-full" key={u.id}>
              <span className={`lb-rank${i < 3 ? " lb-top" : ""}`}>{i + 1}</span>
              <DiscordAvatar actorId={u.id} name={u.name || u.id} size={34} />
              <span className="lb-name"><DiscordLink id={u.id}>{u.name || u.id}</DiscordLink> <span className="muted" style={{ fontSize: 12 }}>· lvl {u.level}</span></span>
              <span className="lb-bar-track"><span className="lb-bar" style={{ width: `${Math.max(3, Math.round((u.xp / max) * 100))}%` }} /></span>
              <span className="lb-val">{u.xp.toLocaleString()} XP</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
