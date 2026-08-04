import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const user = await getSession();
  if (!user) return null; // layout already redirects; guard prevents a build-time DB call
  // The action log is oversight data — management+ (242+) only.
  const seesActivity = canGroup(user.level);
  let log = [];
  if (seesActivity) {
    try { log = await query("select actor_name, action, category, item_key, target, detail, created_at from audit_log order by id desc limit 500"); } catch {}
  }
  return (
    <>
      <h1 className="page-h">Welcome back, {user.name}</h1>
      <p className="page-sub">
        You're signed in as <b style={{ color: "var(--text)" }}>{user.role}</b>.{" "}
        {seesActivity ? "Every action across the dashboard is logged below." : "Use the sidebar to reach the tools your rank can access."}
      </p>
      {seesActivity && (
        <div className="card">
          <div className="between" style={{ marginBottom: 8 }}>
            <label style={{ margin: 0 }}>Action log</label>
            <span className="muted" style={{ fontSize: 12 }}>{log.length} entries</span>
          </div>
          <div className="audit" style={{ maxHeight: "68vh", overflowY: "auto", paddingRight: 4 }}>
            {log.length === 0 && <div style={{ color: "var(--muted)", padding: "10px 0" }}>Nothing yet. Grants and group actions show up here.</div>}
            {log.map((r, i) => (
              <div className="audit-row" key={i}>
                <span>
                  <b>{r.actor_name}</b> {r.action} {r.item_key ? <b>{r.item_key}</b> : r.category}
                  {r.target ? <> → <b>{r.target}</b></> : ""}
                  {r.detail ? <span className="muted"> · {r.detail}</span> : ""}
                </span>
                <span className="muted" style={{ whiteSpace: "nowrap" }}>{new Date(r.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
