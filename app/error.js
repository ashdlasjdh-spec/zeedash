"use client";
import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    try {
      fetch("/api/client-error", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: error?.message, stack: error?.stack, digest: error?.digest, where: typeof location !== "undefined" ? location.pathname : "" }),
      }).catch(() => {});
    } catch { /* ignore */ }
  }, [error]);
  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card" style={{ maxWidth: 440, textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/zhd-mark.png" alt="" width="64" height="64" style={{ margin: "0 auto 12px", display: "block" }} />
        <h1 style={{ margin: "0 0 8px" }}>Something went wrong</h1>
        <p style={{ color: "var(--muted)", margin: "0 0 18px" }}>This page couldn&apos;t load. Give it another try.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn" onClick={() => reset()}>Try again</button>
          <a className="btn ghost" href="/">Home</a>
        </div>
      </div>
    </div>
  );
}
