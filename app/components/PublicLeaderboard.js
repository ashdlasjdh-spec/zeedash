"use client";
import { useCachedResource } from "@/lib/clientCache";

function fmt(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "k";
  return String(n);
}

export default function PublicLeaderboard() {
  const { data, loading } = useCachedResource("public-leaderboard", () =>
    fetch("/api/public-leaderboard").then((r) => r.json())
  );
  const board = data?.leaderboard || [];

  if (!loading && board.length === 0) return null; // nothing to show yet — hide the section

  return (
    <div className="lb">
      {loading && !data
        ? Array.from({ length: 8 }).map((_, i) => <div className="lb-row" key={`sk-${i}`}><span className="lb-rank">{i + 1}</span><span className="ps-sk" style={{ height: 14, flex: 1, borderRadius: 7 }} /></div>)
        : board.map((m) => (
            <div className={`lb-row ${m.rank <= 3 ? "lb-top" : ""}`} key={m.rank}>
              <span className={`lb-rank r${m.rank <= 3 ? m.rank : ""}`}>{m.rank}</span>
              <span className="lb-name" title={m.name}>{m.name}</span>
              <span className="lb-n">{fmt(m.messages)} <span className="lb-unit">msgs</span></span>
            </div>
          ))}
    </div>
  );
}
