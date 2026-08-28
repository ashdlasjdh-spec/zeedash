"use client";
import { useEffect } from "react";

// Catches errors thrown in the root layout itself (which the normal error.js can't). Must render its own
// <html>/<body>. Reports to the same client-error endpoint.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    try {
      fetch("/api/client-error", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: error?.message, stack: error?.stack, digest: error?.digest, where: "global-error" }),
      }).catch(() => {});
    } catch { /* ignore */ }
  }, [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#060607", color: "#e7e7ea", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, textAlign: "center" }}>
          <div>
            <h1 style={{ margin: "0 0 8px" }}>Something went wrong</h1>
            <p style={{ color: "#9a9aa2", margin: "0 0 18px" }}>The page couldn&apos;t load. Try again.</p>
            <button onClick={() => reset()} style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid #333", background: "#e01f1f", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Try again</button>
          </div>
        </div>
      </body>
    </html>
  );
}
