"use client";
import { useState, useEffect } from "react";
import { useCachedResource } from "@/lib/clientCache";
import { AreaChart, Spark } from "./chart";

function fmt(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "k";
  return String(n);
}
function initials(name) {
  return (name || "?").replace(/[^A-Za-z0-9 ]/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}
function Delta({ cur, prev }) {
  if (!prev || prev <= 0) return null;
  const p = Math.round(((cur - prev) / prev) * 100);
  if (!p) return null;
  return <span className={`ps-delta ${p > 0 ? "up" : "down"}`}>{p > 0 ? "+" : ""}{p}%</span>;
}
// Metrics for the activity chart toggle — mirrors the staff Server Analytics page.
const METRICS = [
  { k: "messages", label: "Messages", acc: (s) => s.messages, color: "#5b8cff" },
  { k: "reactions", label: "Reactions", acc: (s) => s.reactions, color: "#a78bfa" },
  { k: "voice", label: "Voice hours", acc: (s) => Math.round((s.voiceMinutes / 60) * 10) / 10, color: "#34d399" },
];

export default function PublicStats() {
  const { data, loading } = useCachedResource("public-stats", () =>
    fetch("/api/public-stats").then((r) => r.json())
  );
  const totals = data?.totals || {};
  const guilds = data?.guilds || [];
  const [sel, setSel] = useState(null); // selected guild for the detail modal
  const [detail, setDetail] = useState(null); // full stats for the selected guild
  const [detailErr, setDetailErr] = useState(false);
  const [metric, setMetric] = useState("messages"); // active chart metric

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

            {(() => {
              const t = detail?.totals || {};
              const pv = detail?.prev || {};
              // AreaChart reads series[i].label ("Mon 12" style), so derive one from the date (the
              // API only sends `d`). Parsed manually to avoid any timezone day-shift.
              const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              const series = (detail?.series || []).map((s) => {
                const p = String(s.d || "").split("-");
                const label = p.length === 3 ? `${MON[(+p[1] || 1) - 1]} ${+p[2] || 0}` : String(s.d || "");
                return { ...s, label };
              });
              const cards = [
                { l: "Members", n: t.members ?? sel.members, spark: null, color: "#e0563b" },
                { l: "Messages", n: t.messages ?? sel.messages30d, prev: pv.messages, spark: series.map((s) => s.messages), color: "#5b8cff" },
                { l: "Reactions", n: detail ? t.reactions : null, prev: pv.reactions, spark: series.map((s) => s.reactions), color: "#a78bfa" },
                { l: "Voice hours", n: detail ? Math.round((t.voiceMinutes || 0) / 60) : null, prev: Math.round((pv.voiceMinutes || 0) / 60), spark: series.map((s) => s.voiceMinutes / 60), color: "#34d399" },
              ];
              const m = METRICS.find((x) => x.k === metric) || METRICS[0];
              return (
                <>
                  <div className="ps-astats">
                    {cards.map((c) => (
                      <div className="ps-astat" key={c.l}>
                        <div className="ps-astat-l">{c.l}</div>
                        <div className="ps-astat-n">{c.n == null ? "…" : fmt(c.n)}{c.prev != null && c.n != null && <Delta cur={c.n} prev={c.prev} />}</div>
                        {c.spark && c.spark.some((v) => v > 0) && <div className="ps-astat-spark"><Spark vals={c.spark} color={c.color} /></div>}
                      </div>
                    ))}
                  </div>

                  {/* activity chart with metric toggle */}
                  <div className="ps-sec-row">
                    <div className="ps-sec-t" style={{ margin: 0 }}>Activity · last 30 days</div>
                    <div className="ps-metric-toggle">
                      {METRICS.map((x) => (
                        <button key={x.k} className={metric === x.k ? "on" : ""} onClick={() => setMetric(x.k)}>{x.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="ps-areawrap">
                    {detail
                      ? (series.length ? <AreaChart series={series} label={m.label.toLowerCase()} accessor={m.acc} color={m.color} /> : <div className="ps-muted">No activity recorded yet.</div>)
                      : <div className="ps-muted">Loading chart…</div>}
                  </div>

                  {/* top members leaderboard */}
                  <div className="ps-sec-t">Top members · 30 days</div>
                  <div className="ps-board">
                    {detail
                      ? (detail.leaderboard.length
                          ? detail.leaderboard.map((r) => (
                              <div className="ps-board-row" key={r.rank}>
                                <span className={`ps-rank ${r.rank <= 3 ? "top" : ""}`}>{r.rank}</span>
                                {r.avatar
                                  ? <img className="lb-av" src={r.avatar} alt="" width="26" height="26" loading="lazy" referrerPolicy="no-referrer" />
                                  : <span className="lb-av lb-av-fb" style={{ width: 26, height: 26 }}>{(r.name || "?").trim()[0]?.toUpperCase() || "?"}</span>}
                                <span className="ps-board-name" title={r.name}>{r.name}</span>
                                <span className="ps-board-n">{fmt(r.messages)} msgs</span>
                              </div>
                            ))
                          : <div className="ps-muted">No member activity yet.</div>)
                      : <div className="ps-muted">Loading leaderboard…</div>}
                  </div>

                  {/* top channels */}
                  <div className="ps-sec-t">Top channels · 30 days</div>
                  <div className="ps-board">
                    {detail
                      ? ((detail.channels || []).length
                          ? detail.channels.map((c, i) => (
                              <div className="ps-board-row" key={i}>
                                <span className="ps-rank">{i + 1}</span>
                                <span className="ps-board-name" title={c.name}>#{c.name}</span>
                                <span className="ps-board-n">{fmt(c.messages)} msgs</span>
                              </div>
                            ))
                          : <div className="ps-muted">No channel data yet.</div>)
                      : <div className="ps-muted">Loading channels…</div>}
                    {detailErr && <div className="ps-muted">Stats are unavailable right now.</div>}
                  </div>
                </>
              );
            })()}

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
