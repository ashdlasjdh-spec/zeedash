"use client";
import { useState, useEffect } from "react";
import { useCachedResource } from "@/lib/clientCache";

function fmt(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "k";
  return String(n);
}
function initials(name) {
  return (name || "?").replace(/[^A-Za-z0-9 ]/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}

export default function PublicStats() {
  const { data, loading } = useCachedResource("public-stats", () =>
    fetch("/api/public-stats").then((r) => r.json())
  );
  const totals = data?.totals || {};
  const guilds = data?.guilds || [];
  const [sel, setSel] = useState(null); // selected guild for the detail modal
  const [detail, setDetail] = useState(null); // full stats for the selected guild
  const [detailErr, setDetailErr] = useState(false);

  // Close the modal on Escape.
  useEffect(() => {
    if (!sel) return;
    const onKey = (e) => e.key === "Escape" && setSel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel]);

  // Load full stats + leaderboard when a server is opened.
  useEffect(() => {
    if (!sel) { setDetail(null); setDetailErr(false); return; }
    let alive = true;
    setDetail(null); setDetailErr(false);
    fetch(`/api/public-stats/${sel.id}`)
      .then((r) => r.json())
      .then((d) => { if (alive) { if (d.error) setDetailErr(true); else setDetail(d); } })
      .catch(() => { if (alive) setDetailErr(true); });
    return () => { alive = false; };
  }, [sel]);

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
          ? Array.from({ length: 3 }).map((_, i) => (
              <div className="ps-card" key={`sk-${i}`}><span className="ps-sk ps-sk-ic" /><div className="ps-sk ps-sk-line" /></div>
            ))
          : guilds.length === 0
            ? <div className="ps-empty">Server stats will appear here once the bot reports activity.</div>
            : guilds.map((g) => (
                <button className="ps-card" key={g.id} onClick={() => setSel(g)} aria-label={`View ${g.name} stats`}>
                  {g.icon
                    ? <img className="ps-ic" src={g.icon} alt="" width="44" height="44" referrerPolicy="no-referrer" />
                    : <span className="ps-ic ps-ic-fb"><span className="ps-ini">{initials(g.name)}</span></span>}
                  <div className="ps-meta">
                    <div className="ps-name" title={g.name}>{g.name}</div>
                    <div className="ps-nums">
                      <span>{fmt(g.members)} members</span>
                      {g.messages30d > 0 && <span className="ps-dot">·</span>}
                      {g.messages30d > 0 && <span>{fmt(g.messages30d)} msgs/mo</span>}
                    </div>
                  </div>
                  <span className="ps-chev" aria-hidden="true">›</span>
                </button>
              ))}
      </div>

      {sel && (
        <div className="ps-modal-wrap" onClick={() => setSel(null)} role="dialog" aria-modal="true" aria-label={`${sel.name} stats`}>
          <div className="ps-modal ps-modal-lg" onClick={(e) => e.stopPropagation()}>
            <button className="ps-close" onClick={() => setSel(null)} aria-label="Close">×</button>
            <div className="ps-modal-head">
              {sel.icon
                ? <img className="ps-modal-ic" src={sel.icon} alt="" width="72" height="72" referrerPolicy="no-referrer" />
                : <span className="ps-modal-ic ps-ic-fb"><span className="ps-ini" style={{ fontSize: 24 }}>{initials(sel.name)}</span></span>}
              <div>
                <div className="ps-modal-name">{sel.name}</div>
                <div className="ps-modal-sub">Community server</div>
              </div>
            </div>

            <div className="ps-modal-stats ps-stats-4">
              <div className="ps-ms"><b>{fmt(detail?.totals?.members ?? sel.members)}</b><span>Members</span></div>
              <div className="ps-ms"><b>{fmt(detail?.totals?.messages ?? sel.messages30d)}</b><span>Messages / 30d</span></div>
              <div className="ps-ms"><b>{detail ? fmt(detail.totals.reactions) : "…"}</b><span>Reactions / 30d</span></div>
              <div className="ps-ms"><b>{detail ? fmt(detail.totals.voiceMinutes) : "…"}</b><span>Voice mins / 30d</span></div>
            </div>

            {/* 14-day activity chart */}
            <div className="ps-sec-t">Activity · last 14 days</div>
            <div className="ps-chart">
              {detail
                ? (detail.series.length
                    ? (() => {
                        const max = Math.max(1, ...detail.series.map((s) => s.m));
                        return detail.series.map((s, i) => (
                          <div className="ps-bar-wrap" key={i} title={`${s.d}: ${s.m.toLocaleString()} msgs`}>
                            <div className="ps-bar" style={{ height: `${Math.max(3, (s.m / max) * 100)}%` }} />
                          </div>
                        ));
                      })()
                    : <div className="ps-muted">No activity recorded yet.</div>)
                : <div className="ps-muted">Loading…</div>}
            </div>

            {/* top members leaderboard */}
            <div className="ps-sec-t">Top members · 30 days</div>
            <div className="ps-board">
              {detail
                ? (detail.leaderboard.length
                    ? detail.leaderboard.map((m) => (
                        <div className="ps-board-row" key={m.rank}>
                          <span className={`ps-rank ${m.rank <= 3 ? "top" : ""}`}>{m.rank}</span>
                          <span className="ps-board-name" title={m.name}>{m.name}</span>
                          <span className="ps-board-n">{fmt(m.messages)} msgs</span>
                        </div>
                      ))
                    : <div className="ps-muted">No member activity yet.</div>)
                : <div className="ps-muted">Loading leaderboard…</div>}
              {detailErr && <div className="ps-muted">Stats are unavailable right now.</div>}
            </div>

            <a className="ps-join" href={detail?.invite || sel.invite || "https://discord.gg/zhd"} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 12h.01M16 12h.01M7.5 7.5C9 7 10.5 6.8 12 6.8s3 .2 4.5.7c1.7 2 2.5 4.6 2.5 7.5-1.3 1-2.7 1.7-4 2l-.9-1.6M8.4 15.4c-1.3-.3-2.7-1-4-2 0-2.9.8-5.5 2.5-7.5" />
              </svg>
              Join Discord
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
