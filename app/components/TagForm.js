"use client";
import { useState } from "react";
export default function TagForm() {
  const [f, setF] = useState({ groupId:"", name:"", color1:"#7c5cff", color2:"#22d3ee", iconId:"", animated:true, rank:"" });
  const [busy,setB]=useState(false); const [toast,setT]=useState(null);
  const up = (k,v)=>setF(s=>({...s,[k]:v}));
  async function save() {
    setB(true); setT(null);
    try {
      const def = { name:f.name||undefined, colors:[f.color1,f.color2], iconId:f.iconId||undefined, animated:f.animated };
      const r = await fetch("/api/tag",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ groupId:f.groupId, def, rank:f.rank||undefined })});
      const d=await r.json(); if(!r.ok) throw new Error(d.error);
      setT({ok:true,msg:`Tag saved for group ${f.groupId}${f.rank?` (rank ${f.rank})`:""}.`});
    } catch(e){ setT({bad:true,msg:e.message}); } setB(false);
  }
  return (
    <div className="card">
      <div className="grid g2">
        <div><label>Group ID</label><input className="mono" value={f.groupId} onChange={e=>up("groupId",e.target.value)} placeholder="1099600954"/></div>
        <div><label>Rank (blank = whole group)</label><input className="mono" value={f.rank} onChange={e=>up("rank",e.target.value)} placeholder="e.g. 255"/></div>
        <div><label>Tag text</label><input value={f.name} onChange={e=>up("name",e.target.value)} placeholder="🍋 CREW"/></div>
        <div><label>Icon asset id (optional)</label><input className="mono" value={f.iconId} onChange={e=>up("iconId",e.target.value)} placeholder="rbxassetid…"/></div>
        <div><label>Color 1</label><input type="color" value={f.color1} onChange={e=>up("color1",e.target.value)}/></div>
        <div><label>Color 2</label><input type="color" value={f.color2} onChange={e=>up("color2",e.target.value)}/></div>
      </div>
      <label style={{marginTop:14,display:"flex",gap:8,alignItems:"center"}}>
        <input type="checkbox" style={{width:"auto"}} checked={f.animated} onChange={e=>up("animated",e.target.checked)}/> Animated gradient
      </label>
      <div className="row" style={{marginTop:16}}>
        <button className="btn" style={{width:"auto"}} disabled={busy} onClick={save}>Save tag</button>
      </div>
      {toast && <div className={`toast ${toast.ok?"ok":"bad"}`}>{toast.msg}</div>}
    </div>
  );
}
