export const metadata = { title: "Not found · zhd.lol" };

export default function NotFound() {
  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card" style={{ maxWidth: 440, textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/zhd-mark.png" alt="" width="64" height="64" style={{ margin: "0 auto 12px", display: "block" }} />
        <h1 style={{ margin: "0 0 8px" }}>Page not found</h1>
        <p style={{ color: "var(--muted)", margin: "0 0 18px" }}>That page doesn&apos;t exist or you don&apos;t have access to it.</p>
        <a className="btn" href="/">Back home</a>
      </div>
    </div>
  );
}
