// Instant route-change skeleton. With next/link client navigation, this paints the MOMENT you switch
// dashboard sections — while that page's server data streams in — so swapping feels instant instead of
// blank/janky. The layout (Topbar + Sidebar) stays mounted; only this <main> content is replaced.
// Uses the app's own surface tokens; the shimmer keyframes are scoped to the .zhd-sk class.
export default function Loading() {
  const bar = (w, h = 12) => <div className="zhd-sk" style={{ height: h, width: w, borderRadius: 6 }} />;
  return (
    <div className="fullbleed" aria-busy="true" aria-label="Loading">
      <style>{`
        @keyframes zhdSk{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .zhd-sk{background:linear-gradient(90deg,var(--surface) 25%,var(--surface-2) 37%,var(--surface) 63%);background-size:200% 100%;animation:zhdSk 1.3s ease-in-out infinite}
      `}</style>
      {/* page header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
        {bar(220, 26)}
        {bar(340)}
      </div>
      {/* stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {bar(20, 20)}
            {bar(70, 24)}
            {bar("60%")}
          </div>
        ))}
      </div>
      {/* body cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div className="zhd-sk" style={{ height: 30, width: 30, borderRadius: "50%", flex: "0 0 auto" }} />
                <div style={{ flex: 1 }}>{bar(`${60 + ((j * 7) % 35)}%`)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
