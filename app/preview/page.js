"use client";
import { useState, useEffect } from "react";

// Public, no-login preview tool: design a crew tag or test an emoji and see exactly how it renders,
// plus a short guide on uploading an icon (with remove.bg for transparent backgrounds).

const normHex = (s) => {
  let v = String(s || "").trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(v)) v = v.split("").map((x) => x + x).join("");
  return /^[0-9a-fA-F]{6}$/.test(v) ? "#" + v.toLowerCase() : "#ffffff";
};
const DIRCSS = {
  down: { angle: 180, size: "100% 200%" }, up: { angle: 180, size: "100% 200%" },
  right: { angle: 90, size: "200% 100%" }, left: { angle: 90, size: "200% 100%" },
  diagonal: { angle: 135, size: "200% 200%" },
};

function TagPreview({ name, colors, animated, iconId, dir, speed }) {
  const stops = (colors && colors.length ? colors : ["#ffffff"]).map(normHex);
  const d = DIRCSS[dir] || DIRCSS.diagonal;
  const grad = `linear-gradient(${d.angle}deg, ${[...stops, ...stops].join(", ")})`;
  const dur = Math.min(8, Math.max(0.3, 1 / (Number(speed) || 0.5)));
  const [iconUrl, setIconUrl] = useState("");
  useEffect(() => {
    const id = String(iconId || "").match(/\d+/)?.[0];
    if (!id) { setIconUrl(""); return; }
    let alive = true;
    fetch(`/api/asset-thumbnail?id=${id}`).then((r) => r.json()).then((j) => { if (alive) setIconUrl(j.url || ""); }).catch(() => {});
    return () => { alive = false; };
  }, [iconId]);
  return (
    <div style={{
      backgroundColor: "#14141c", backgroundImage: "radial-gradient(130% 120% at 50% 25%, rgba(255,255,255,.05), transparent 60%)",
      border: "1px solid var(--line)", borderRadius: 14, padding: "34px 16px",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 150, overflow: "hidden",
    }}>
      {iconUrl && <img src={iconUrl} alt="" width={30} height={30} style={{ objectFit: "contain", borderRadius: 4, flex: "0 0 auto" }} />}
      <span style={{
        fontWeight: 800, fontStyle: "italic", fontSize: 30, lineHeight: 1.15, whiteSpace: "nowrap",
        backgroundImage: grad, backgroundSize: animated ? d.size : "100% 100%",
        WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent",
        animation: animated ? `zhdScroll_${dir || "diagonal"} ${dur}s linear infinite` : "none",
      }}>[{name || "CREW"}]</span>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes zhdScroll_down{from{background-position:50% 0%}to{background-position:50% 200%}}
        @keyframes zhdScroll_up{from{background-position:50% 200%}to{background-position:50% 0%}}
        @keyframes zhdScroll_right{from{background-position:0% 50%}to{background-position:200% 50%}}
        @keyframes zhdScroll_left{from{background-position:200% 50%}to{background-position:0% 50%}}
        @keyframes zhdScroll_diagonal{from{background-position:0% 0%}to{background-position:200% 200%}}
      ` }} />
    </div>
  );
}

const inp = { width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--bg-2)", color: "var(--text)", fontSize: 14 };
const lbl = { display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--muted)", margin: "0 0 6px" };

export default function PublicPreview() {
  const [name, setName] = useState("CREW");
  const [colors, setColors] = useState(["#7c5cff", "#4ade80"]);
  const [animated, setAnimated] = useState(true);
  const [dir, setDir] = useState("diagonal");
  const [speed, setSpeed] = useState(0.5);
  const [iconId, setIconId] = useState("");
  const setColor = (i, v) => setColors((c) => c.map((x, idx) => (idx === i ? v : x)));
  const addColor = () => setColors((c) => (c.length < 8 ? [...c, "#ffffff"] : c));
  const rmColor = (i) => setColors((c) => (c.length > 1 ? c.filter((_, idx) => idx !== i) : c));

  const [eName, setEName] = useState("YourName");
  const [emojis, setEmojis] = useState("⭐💖🔥");

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 18px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 34 }}>
        <div className="brand" style={{ fontSize: 30 }}>zhd<span style={{ color: "var(--muted)" }}>.lol</span></div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.6px", margin: "10px 0 6px", color: "var(--white)" }}>Tag &amp; Emoji Preview</h1>
        <p className="muted" style={{ fontSize: 14, margin: 0 }}>Design a crew tag or test an emoji and see exactly how it&apos;ll look in-game. No login needed.</p>
      </div>

      {/* ---- CREW TAG ---- */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>Crew tag</div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>Type your text, pick your gradient colours, and tune the animation.</div>
        <TagPreview name={name} colors={colors} animated={animated} iconId={iconId} dir={dir} speed={speed} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginTop: 18 }}>
          <div><label style={lbl}>Tag text</label><input style={inp} value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="CREW" /></div>
          <div>
            <label style={lbl}>Icon asset ID (optional)</label>
            <input style={{ ...inp, fontFamily: "var(--mono)" }} value={iconId} onChange={(e) => setIconId(e.target.value)} placeholder="e.g. 1234567890" />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={lbl}>Gradient colours</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {colors.map((c, i) => (
              <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 9, padding: "5px 6px 5px 8px" }}>
                <input type="color" value={normHex(c)} onChange={(e) => setColor(i, e.target.value)} style={{ width: 28, height: 28, border: "none", background: "none", padding: 0, cursor: "pointer" }} />
                <input value={c} onChange={(e) => setColor(i, e.target.value)} style={{ width: 78, padding: "4px 6px", border: "none", background: "transparent", color: "var(--text)", fontFamily: "var(--mono)", fontSize: 12.5 }} />
                {colors.length > 1 && <button onClick={() => rmColor(i)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 15, padding: "0 4px" }} aria-label="Remove colour">×</button>}
              </div>
            ))}
            {colors.length < 8 && <button className="btn ghost" style={{ width: "auto" }} onClick={addColor}>+ Colour</button>}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginTop: 16, alignItems: "end" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={animated} onChange={(e) => setAnimated(e.target.checked)} /> Animated gradient
          </label>
          <div><label style={lbl}>Direction</label>
            <select style={inp} value={dir} onChange={(e) => setDir(e.target.value)} disabled={!animated}>
              {["diagonal", "down", "up", "left", "right"].map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Speed ({speed})</label>
            <input type="range" min="0.1" max="2" step="0.1" value={speed} onChange={(e) => setSpeed(e.target.value)} disabled={!animated} style={{ width: "100%" }} />
          </div>
        </div>
      </div>

      {/* ---- ICON UPLOAD GUIDE ---- */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>How to add a custom icon</div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>Your tag can show a small image to the left of the text. Here&apos;s how to get one and test it above.</div>
        <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 11, fontSize: 14, lineHeight: 1.55 }}>
          <li><b>Remove the background first.</b> A transparent PNG looks far cleaner than a square. Drop your image into <a href="https://www.remove.bg" target="_blank" rel="noreferrer" style={{ color: "#8fb0ff" }}>remove.bg</a> (free) and download the cut-out PNG.</li>
          <li><b>Upload it to Roblox as a Decal.</b> Go to <a href="https://create.roblox.com/dashboard/creations" target="_blank" rel="noreferrer" style={{ color: "#8fb0ff" }}>create.roblox.com → Creations → Decals → Upload</a> and add your PNG.</li>
          <li><b>Grab the asset ID.</b> Open your uploaded decal — the number at the end of its URL (e.g. <span className="mono">roblox.com/library/<b>1234567890</b></span>) is the asset ID.</li>
          <li><b>Test it.</b> Paste that ID into the <b>Icon asset ID</b> box above — it&apos;ll appear on the tag preview.</li>
        </ol>
        <div className="muted" style={{ fontSize: 12.5, marginTop: 13, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          Just uploaded it and the preview&apos;s blank? Roblox takes a minute to generate the thumbnail and moderate the image — wait a bit and re-paste the ID.
        </div>
      </div>

      {/* ---- EMOJI ---- */}
      <div className="card">
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>Custom emojis</div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>Emojis show next to your name in-game. Type a test name and your emojis to preview it.</div>
        <div style={{
          background: "#14141c", border: "1px solid var(--line)", borderRadius: 14, padding: "26px 18px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 90,
          fontSize: 22, fontWeight: 700, color: "var(--white)",
        }}>
          <span>{eName || "YourName"}</span>
          <span style={{ fontSize: 24 }}>{emojis}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginTop: 18 }}>
          <div><label style={lbl}>Test name</label><input style={inp} value={eName} maxLength={20} onChange={(e) => setEName(e.target.value)} placeholder="YourName" /></div>
          <div><label style={lbl}>Emojis (paste any)</label><input style={inp} value={emojis} onChange={(e) => setEmojis(e.target.value)} placeholder="⭐💖🔥" /></div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 30 }}>
        <a href="/" className="muted" style={{ fontSize: 13 }}>← zhd.lol</a>
      </div>
    </div>
  );
}
