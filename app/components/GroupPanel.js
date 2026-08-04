"use client";
import { useEffect, useState } from "react";

export default function GroupPanel() {
  const [roles, setRoles] = useState([]); const [groupId, setGid] = useState("");
  const [username, setU] = useState(""); const [status, setStatus] = useState(null);
  const [roleId, setRoleId] = useState(""); const [busy, setB] = useState(false);
  const [toast, setT] = useState(null); const [err, setErr] = useState(null);
  const [reqs, setReqs] = useState(null); const [loadingReqs, setLR] = useState(false);
  const [shoutMsg, setShoutMsg] = useState("");

  useEffect(() => { (async () => {
    const r = await fetch("/api/group"); const d = await r.json();
    if (r.ok) { setRoles(d.roles); setGid(d.groupId); } else setErr(d.error);
  })(); }, []);

  async function post(body) {
    const r = await fetch("/api/group", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json(); if (!r.ok) throw new Error(d.error); return d;
  }
  async function act(action) {
    setB(true); setT(null);
    try {
      const d = await post({ action, username, roleId });
      if (action === "lookup") { setStatus(d); if (d.roleId) setRoleId(d.roleId); setT({ ok: true, msg: d.inGroup ? `${d.target.username} is in the group.` : `${d.target.username} is NOT in the group.` }); }
      else if (action === "rank") setT({ ok: true, msg: `Changed ${d.target.username}'s rank.` });
      else if (action === "promote") setT({ ok: true, msg: `Promoted ${d.target.username}: ${d.from} → ${d.to}.` });
      else if (action === "demote") setT({ ok: true, msg: `Demoted ${d.target.username}: ${d.from} → ${d.to}.` });
      else if (action === "kick") setT({ ok: true, msg: `Kicked ${d.target.username} from the group.` });
    } catch (e) { setT({ bad: true, msg: e.message }); }
    setB(false);
  }
  async function loadReqs() {
    setLR(true);
    try { const d = await post({ action: "requests" }); setReqs(d.requests); }
    catch (e) { setT({ bad: true, msg: e.message }); }
    setLR(false);
  }
  async function handleReq(userId, accept) {
    try { await post({ action: accept ? "accept" : "decline", userId }); setReqs((rs) => rs.filter((r) => r.userId !== userId)); }
    catch (e) { setT({ bad: true, msg: e.message }); }
  }
  async function handleAll(accept) {
    if (typeof window !== "undefined" && !window.confirm(`${accept ? "Accept" : "Decline"} ALL pending join requests?`)) return;
    setLR(true);
    try { const d = await post({ action: accept ? "acceptAll" : "declineAll" }); setT({ ok: true, msg: `${accept ? "Accepted" : "Declined"} ${d.ok}/${d.total} requests.` }); await loadReqs(); }
    catch (e) { setT({ bad: true, msg: e.message }); }
    setLR(false);
  }
  async function doShout() {
    setB(true); setT(null);
    try { await post({ action: "shout", message: shoutMsg }); setT({ ok: true, msg: shoutMsg ? "Group shout posted." : "Group shout cleared." }); }
    catch (e) { setT({ bad: true, msg: e.message }); }
    setB(false);
  }

  if (err) return <div className="card"><div className="toast bad">{err}</div></div>;
  return (
    <div className="stack" style={{ gap: 16 }}>
      {/* Join requests */}
      <div className="card">
        <div className="between">
          <div><div style={{ fontWeight: 700, fontSize: 15 }}>Join requests</div><div className="muted" style={{ fontSize: 13 }}>Pending people waiting to join the group.</div></div>
          <div style={{ display: "flex", gap: 8 }}>
            {reqs && reqs.length > 0 && <>
              <button className="btn" style={{ width: "auto" }} disabled={loadingReqs} onClick={() => handleAll(true)}>Accept all</button>
              <button className="btn ghost" style={{ width: "auto", color: "var(--danger)" }} disabled={loadingReqs} onClick={() => handleAll(false)}>Decline all</button>
            </>}
            <button className="btn ghost" style={{ width: "auto" }} disabled={loadingReqs} onClick={loadReqs}>{loadingReqs ? "Loading…" : reqs ? "Refresh" : "Load"}</button>
          </div>
        </div>
        {reqs && (reqs.length === 0 ? <p className="muted" style={{ marginTop: 14 }}>No pending requests. 🎉</p> : (
          <div className="stack" style={{ marginTop: 14 }}>
            {reqs.map((r) => (
              <div key={r.userId} className="between" style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 13px" }}>
                <a href={`https://www.roblox.com/users/${r.userId}/profile`} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 600, textDecoration: "none" }}>
                  <img
                    src={`https://www.roblox.com/headshot-thumbnail/image?userId=${r.userId}&width=48&height=48&format=png`}
                    alt="" width={34} height={34} loading="lazy"
                    style={{ borderRadius: "50%", background: "var(--surface-3)", border: "1px solid var(--line)", flex: "0 0 auto" }}
                  />
                  <span>{r.username} <span className="muted mono" style={{ fontWeight: 400 }}>({r.userId})</span></span>
                </a>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" style={{ width: "auto", padding: "7px 14px" }} onClick={() => handleReq(r.userId, true)}>Accept</button>
                  <button className="btn ghost" style={{ width: "auto", padding: "7px 14px", color: "var(--danger)" }} onClick={() => handleReq(r.userId, false)}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Member rank / kick */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Member rank &amp; removal</div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>Look up a member to change their rank or kick them.</div>
        <div className="row">
          <div style={{ flex: 1, minWidth: 220 }}><label>Roblox username or ID</label>
            <input value={username} onChange={(e) => { setU(e.target.value); setStatus(null); }} placeholder="Builderman or 156" /></div>
          <button className="btn ghost" style={{ width: "auto" }} disabled={busy} onClick={() => act("lookup")}>Look up</button>
        </div>
        {status && (
          <>
            <div className="grid g2" style={{ marginTop: 18 }}>
              <div><label>Set rank</label>
                <select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                  <option value="">Choose a role…</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.rank} — {r.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "end", gap: 10 }}>
                <button className="btn" style={{ width: "auto" }} disabled={busy || !roleId} onClick={() => act("rank")}>Change rank</button>
                <button className="btn danger" style={{ width: "auto" }} disabled={busy || !status.inGroup} onClick={() => act("kick")}>Kick</button>
              </div>
            </div>
            <div className="row" style={{ marginTop: 12, gap: 10 }}>
              <button className="btn ghost" style={{ width: "auto" }} disabled={busy || !status.inGroup} onClick={() => act("demote")}>◄ Demote</button>
              <button className="btn ghost" style={{ width: "auto" }} disabled={busy || !status.inGroup} onClick={() => act("promote")}>Promote ►</button>
              <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>One step down / up the rank ladder.</span>
            </div>
          </>
        )}
      </div>

      {/* Group shout */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Group shout</div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Posts to the group wall shout (max 255 chars). Leave blank to clear.</div>
        <textarea rows={2} maxLength={255} value={shoutMsg} onChange={(e) => setShoutMsg(e.target.value)} placeholder="Big update dropping this weekend…" />
        <div className="row" style={{ marginTop: 12 }}><button className="btn" style={{ width: "auto" }} disabled={busy} onClick={doShout}>Post shout</button></div>
      </div>

      {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
      <p className="muted" style={{ fontSize: 12 }}>Group <span className="mono">{groupId}</span>. All actions are logged. Requires <span className="mono">ROBLOX_GROUP_COOKIE</span> + a bot account with Manage-members rank.</p>
    </div>
  );
}
