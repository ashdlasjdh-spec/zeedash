"use client";
import { useState } from "react";
export default function EmojiForm() {
  const [username, setU] = useState(""); const [emojis, setE] = useState("");
  const [busy, setB] = useState(false); const [toast, setT] = useState(null);
  async function go(action) {
    setB(true); setT(null);
    try {
      const r = await fetch("/api/emoji", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ username, emojis, action }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setT({ ok:true, msg:`${action==="remove"?"Cleared emojis for":"Set emojis for"} ${d.target.username}.` });
    } catch(e){ setT({bad:true,msg:e.message}); } setB(false);
  }
  return (
    <div className="card">
      <div className="grid g2">
        <div><label>Roblox username</label><input value={username} onChange={e=>setU(e.target.value)} placeholder="Builderman"/></div>
        <div><label>Emojis (paste any)</label><input value={emojis} onChange={e=>setE(e.target.value)} placeholder="⭐💖🔥"/></div>
      </div>
      <div className="row" style={{marginTop:16}}>
        <button className="btn" style={{width:"auto"}} disabled={busy} onClick={()=>go("set")}>Give emojis</button>
        <button className="btn ghost" style={{width:"auto"}} disabled={busy} onClick={()=>go("remove")}>Remove all</button>
      </div>
      {toast && <div className={`toast ${toast.ok?"ok":"bad"}`}>{toast.msg}</div>}
    </div>
  );
}
