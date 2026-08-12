"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const iconUrl = (g) => (g?.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64` : null);

function Ava({ g, size = 26 }) {
  const url = iconUrl(g);
  const box = { width: size, height: size, borderRadius: 8, flex: "0 0 auto" };
  if (url) return <img src={url} alt="" width={size} height={size} referrerPolicy="no-referrer" style={{ ...box, objectFit: "cover" }} />;
  return <span className="svp-fallback" style={box}>{(g?.name || "?").trim()[0]?.toUpperCase() || "?"}</span>;
}

// Server selector at the top of the Server Management sidebar. Drives the whole portal via the
// ?guild= URL param — the analytics + leaderboard pages read the same param, so picking a server
// here re-scopes everything. Fetches the server list (with Discord icons) once.
export default function ServerPicker() {
  const [guilds, setGuilds] = useState([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const wrap = useRef(null);

  useEffect(() => {
    fetch("/api/server-stats/guilds").then((r) => r.json()).then((j) => setGuilds(j.guilds || [])).catch(() => {});
  }, []);
  useEffect(() => {
    const onDoc = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selectedId = sp.get("guild") || guilds[0]?.id || "";
  const selected = guilds.find((g) => g.id === selectedId) || guilds[0] || null;

  const pick = (id) => { setOpen(false); router.push(`${pathname}?guild=${id}`); };

  return (
    <div className="svp" ref={wrap}>
      <button className={`svp-btn ${open ? "on" : ""}`} onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <Ava g={selected} size={30} />
        <span className="svp-labels">
          <span className="svp-eyebrow">Server</span>
          <span className="svp-name">{selected ? selected.name : "No servers yet"}</span>
        </span>
        <svg className="svp-chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && guilds.length > 0 && (
        <div className="svp-menu" role="listbox">
          {guilds.map((g) => (
            <button key={g.id} className={`svp-opt ${g.id === selectedId ? "sel" : ""}`} role="option" aria-selected={g.id === selectedId} onClick={() => pick(g.id)}>
              <Ava g={g} size={26} />
              <span className="svp-opt-name">{g.name}</span>
              {g.id === selectedId && <svg className="svp-check" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
