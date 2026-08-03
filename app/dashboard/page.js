import { getSession } from "@/lib/session";
import { query } from "@/lib/db";

export default async function Overview() {
  const user = await getSession();
  if (!user) return null; // layout already redirects; guard prevents a build-time DB call
  let log = [];
  try { log = await query("select actor_name, action, category, item_key, target, created_at from audit_log order by id desc limit 12"); } catch {}
  return (
    <>
      <h1 className="page-h">Welcome back, {user.name}</h1>
      <p className="page-sub">You're signed in as <b style={{color:"var(--text)"}}>{user.role}</b>. Use the sidebar to grant powers, stands, tools, perks, crew tags and emojis.</p>
      <div className="card">
        <label>Recent activity</label>
        <div className="audit">
          {log.length === 0 && <div style={{color:"var(--muted)",padding:"10px 0"}}>Nothing yet. Grants you and your team make will show up here.</div>}
          {log.map((r, i) => (
            <div className="audit-row" key={i}>
              <span><b>{r.actor_name}</b> {r.action} {r.item_key ? <b>{r.item_key}</b> : r.category} {r.target ? <>→ <b>{r.target}</b></> : ""}</span>
              <span>{new Date(r.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
