"use client";
import { useState, useEffect } from "react";

// Public, no-login preview tool: design a crew tag or test an emoji and see exactly how it renders.

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

// Split a string into individual emojis (proper grapheme clusters, so multi-part emojis stay whole).
function splitEmojis(str) {
  const s = String(str || "").trim();
  if (!s) return [];
  try {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)].map((x) => x.segment).filter((x) => x.trim());
    }
  } catch { /* fall back */ }
  return Array.from(s).filter((x) => x.trim());
}

function TagPreview({ name, colors, animated, dir, speed }) {
  const stops = (colors && colors.length ? colors : ["#ffffff"]).map(normHex);
  const d = DIRCSS[dir] || DIRCSS.diagonal;
  const grad = `linear-gradient(${d.angle}deg, ${[...stops, ...stops].join(", ")})`;
  const dur = Math.min(8, Math.max(0.3, 1 / (Number(speed) || 0.5)));
  return (
    <div style={{
      backgroundColor: "#14141c", backgroundImage: "radial-gradient(130% 120% at 50% 25%, rgba(255,255,255,.05), transparent 60%)",
      border: "1px solid var(--line)", borderRadius: 14, padding: "34px 16px",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 150, overflow: "hidden",
    }}>
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

// One-click gradient palettes.
const PRESETS = [
  { name: "Neon", colors: ["#7c5cff", "#4ade80"] },
  { name: "Sunset", colors: ["#ff8a00", "#ff2d55", "#a259ff"] },
  { name: "Ocean", colors: ["#00c6ff", "#0072ff"] },
  { name: "Fire", colors: ["#ffd200", "#ff6a00", "#ff0844"] },
  { name: "Candy", colors: ["#ff6ec4", "#7873f5"] },
  { name: "Gold", colors: ["#f5d020", "#f53803"] },
  { name: "Toxic", colors: ["#a8ff00", "#00ffa3"] },
  { name: "Mono", colors: ["#ffffff", "#8a8a8a"] },
];

export default function PublicPreview() {
  const [name, setName] = useState("CREW");
  const [colors, setColors] = useState(["#7c5cff", "#4ade80"]);
  const [animated, setAnimated] = useState(true);
  const [dir, setDir] = useState("diagonal");
  const [speed, setSpeed] = useState(0.5);
  const setColor = (i, v) => setColors((c) => c.map((x, idx) => (idx === i ? v : x)));
  const addColor = () => setColors((c) => (c.length < 8 ? [...c, "#ffffff"] : c));
  const rmColor = (i) => setColors((c) => (c.length > 1 ? c.filter((_, idx) => idx !== i) : c));

  const [eName, setEName] = useState("YourName");
  const [emojis, setEmojis] = useState("⭐💖🔥");
  const [copied, setCopied] = useState(false);

  // Hydrate the design from a shared link (?name=&colors=&anim=&dir=&speed=).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("name")) setName(p.get("name").slice(0, 20));
    const cols = p.get("colors");
    if (cols) { const arr = cols.split(",").map(normHex).filter(Boolean); if (arr.length) setColors(arr.slice(0, 8)); }
    if (p.has("anim")) setAnimated(p.get("anim") !== "0");
    if (p.get("dir") && DIRCSS[p.get("dir")]) setDir(p.get("dir"));
    if (p.get("speed")) setSpeed(Math.min(2, Math.max(0.1, Number(p.get("speed")) || 0.5)));
  }, []);

  const shareLink = () => {
    const p = new URLSearchParams();
    p.set("name", name); p.set("colors", colors.join(",")); p.set("anim", animated ? "1" : "0");
    p.set("dir", dir); p.set("speed", String(speed));
    const url = `${window.location.origin}/preview?${p.toString()}`;
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }).catch(() => {});
  };

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
        <TagPreview name={name} colors={colors} animated={animated} dir={dir} speed={speed} />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 14, alignItems: "center" }}>
          <span style={{ ...lbl, margin: "0 4px 0 0" }}>Presets</span>
          {PRESETS.map((p) => (
            <button key={p.name} onClick={() => setColors(p.colors)} title={p.name}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 10px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--bg-2)", color: "var(--text)", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
              <span style={{ width: 24, height: 11, borderRadius: 3, backgroundImage: `linear-gradient(90deg, ${p.colors.join(", ")})` }} />
              {p.name}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          <label style={lbl}>Tag text</label>
          <input style={inp} value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="CREW" />
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

        <div className="row" style={{ marginTop: 18, alignItems: "center", gap: 10 }}>
          <button className="btn" style={{ width: "auto" }} onClick={shareLink}>{copied ? "Link copied ✓" : "Copy share link"}</button>
          <span className="muted" style={{ fontSize: 12.5 }}>Shares this exact design — colours &amp; animation.</span>
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
          {splitEmojis(emojis).map((e, i) => (
            <span key={i} style={{ fontSize: 24, fontWeight: 400 }}>[{e}]</span>
          ))}
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
