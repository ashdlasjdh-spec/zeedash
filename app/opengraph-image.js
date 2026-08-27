import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "zhd.lol — Zee Hood control panel";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "radial-gradient(1000px 600px at 50% -10%, #2a0a0a, #060607 60%)", color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", width: 84, height: 84, borderRadius: 20, alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#e01f1f,#ff3b30)", fontSize: 46, fontWeight: 900 }}>Z</div>
          <div style={{ fontSize: 92, fontWeight: 900, letterSpacing: -2 }}>zhd.lol</div>
        </div>
        <div style={{ marginTop: 22, fontSize: 34, color: "#c9c9d2", fontWeight: 600 }}>The Zee Hood staff control panel</div>
        <div style={{ position: "absolute", bottom: 34, fontSize: 24, color: "#6b6b76" }}>zhd.lol</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
