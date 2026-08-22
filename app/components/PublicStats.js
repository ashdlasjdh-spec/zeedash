"use client";
import { useCachedResource } from "@/lib/clientCache";

function fmt(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "k";
  return String(n);
}
function Initials({ name }) {
  const t = (name || "?").replace(/[^A-Za-z0-9 ]/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("") || "?";
  return <span className="ps-ini">{t.toUpperCase()}</span>;
}

export default function PublicStats() {
  const { data, loading } = useCachedResource("public-stats", () =>
    fetch("/api/public-stats").then((r) => r.json())
  );
  const totals = data?.totals || {};
  const guilds = data?.guilds || [];

  const tiles = [
    { k: "servers", label: "Discord servers", v: totals.servers },
    { k: "members", label: "Community members", v: totals.members },
    { k: "messages30d", label: "Messages / 30 days", v: totals.messages30d },
    { k: "playersInGame", label: "Playing right now", v: totals.playersInGame, live: true },
  ];

  return (
    <div className="ps">
      <div className="ps-tiles">
        {tiles.map((t) => (
          <div className="ps-tile" key={t.k}>
            {t.live && totals.playersInGame != null && <span className="ps-live" aria-hidden="true" />}
            <b>{loading && !data ? <span className="ps-sk ps-sk-num" /> : fmt(t.v)}</b>
            <span>{t.label}</span>
          </div>
        ))}
      </div>

      <div className="ps-grid">
        {loading && !data
          ? Array.from({ length: 6 }).map((_, i) => (
              <div className="ps-card" key={`sk-${i}`}><span className="ps-sk ps-sk-ic" /><div className="ps-sk ps-sk-line" /></div>
            ))
          : guilds.length === 0
            ? <div className="ps-empty">Server stats will appear here once the bot reports activity.</div>
            : guilds.map((g) => (
                <div className="ps-card" key={g.id}>
                  {g.icon
                    ? <img className="ps-ic" src={g.icon} alt="" width="44" height="44" referrerPolicy="no-referrer" />
                    : <span className="ps-ic ps-ic-fb"><Initials name={g.name} /></span>}
                  <div className="ps-meta">
                    <div className="ps-name" title={g.name}>{g.name}</div>
                    <div className="ps-nums">
                      <span>{fmt(g.members)} members</span>
                      {g.messages30d > 0 && <span className="ps-dot">·</span>}
                      {g.messages30d > 0 && <span>{fmt(g.messages30d)} msgs/mo</span>}
                    </div>
                  </div>
                </div>
              ))}
      </div>
    </div>
  );
}
