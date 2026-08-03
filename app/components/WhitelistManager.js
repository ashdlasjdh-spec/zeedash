"use client";
import { useEffect, useState } from "react";
export default function WhitelistManager({ myRole }) {
  const [list,setList]=useState([]); const [f,setF]=useState({discordId:"",role:"staff",note:""});
  const [toast,setT]=useState(null);
  const roles = ["staff","admin","cofounder","owner"].filter(r => ["staff","admin","cofounder","owner"].indexOf(r) <= ["staff","admin","cofounder","owner"].indexOf(myRole));
  async function load(){ const r=await fetch("/api/whitelist"); const d=await r.json(); if(r.ok) setList(d.list); }
  useEffect(()=>{ load(); },[]);
  async function add(){ setT(null);
    const r=await fetch("/api/whitelist",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(f)});
    const d=await r.json(); if(!r.ok){ setT({bad:true,msg:d.error}); return; } setF({discordId:"",role:"staff",note:""}); load();
  }
  async function del(discordId){ await fetch("/api/whitelist",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({discordId})}); load(); }
  return (
    <div className="card">
      <div className="row">
        <div style={{flex:1}}><label>Discord user id</label><input className="mono" value={f.discordId} onChange={e=>setF(s=>({...s,discordId:e.target.value}))} placeholder="1234567890"/></div>
        <div><label>Role</label><select value={f.role} onChange={e=>setF(s=>({...s,role:e.target.value}))}>{roles.map(r=><option key={r}>{r}</option>)}</select></div>
        <button className="btn" style={{width:"auto"}} onClick={add}>Add / update</button>
      </div>
      {toast && <div className={`toast bad`}>{toast.msg}</div>}
      <table style={{marginTop:20}}>
        <thead><tr><th>Discord ID</th><th>Role</th><th>Note</th><th>By</th><th></th></tr></thead>
        <tbody>{list.map(w=>(
          <tr key={w.discord_id}><td className="mono">{w.discord_id}</td><td><span className={`role-pill role-${w.role}`}>{w.role}</span></td><td>{w.note||"—"}</td><td>{w.added_by||"—"}</td>
          <td><button className="btn danger" style={{width:"auto",padding:"5px 10px",fontSize:12}} onClick={()=>del(w.discord_id)}>Remove</button></td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}
