"use client";
import { useEffect, useState, useCallback } from "react";
import Dropdown from "./Dropdown";

// The capabilities a role can be granted. Keys are the exact permission strings the
// fake-permissions enforcement understands; labels/desc explain what they unlock on the site.
const CAPS = [
  { k: "administrator", label: "Administrator", desc: "Full management of this server — everything below, plus all settings." },
  { k: "manage_messages", label: "Content & messages", desc: "Automod, logs, restrict, autoresponders, autoreact, sticky, starboard, message builder." },
  { k: "manage_roles", label: "Roles", desc: "Autorole, button roles, reaction roles." },
  { k: "ban_members", label: "Ban members", desc: "Moderation — ban." },
  { k: "kick_members", label: "Kick members", desc: "Moderation — kick." },
  { k: "moderate_members", label: "Timeout members", desc: "Moderation — timeout." },
  { k: "manage_nicknames", label: "Manage nicknames", desc: "Rename members." },
];
const CAP_LABEL = Object.fromEntries(CAPS.map((c) => [c.k, c.label]));

export default function RoleAccess() {
  const [guilds, setGuilds] = useState(null);
  const [guild, setGuild] = useState("");
  const [roles, setRoles] = useState([]);
  const [items, setItems] = useState([]); // [{ role, perms: string[] }]
  const [loadingGuild, setLoadingGuild] = useState(false);
  const [editRole, setEditRole] = useState("");
  const [editPerms, setEditPerms] = useState([]);
  const [busy, setBusy] = useState(false);
  const [toast, setT] = useState(null);

  // Load the allow-listed servers.
  useEffect(() => {
    fetch("/api/role-access").then((r) => r.json()).then((d) => {
      const gs = d.guilds || [];
      setGuilds(gs);
      if (gs[0]) setGuild(gs[0].id);
    }).catch(() => setGuilds([]));
  }, []);

  const loadGuild = useCallback(async (gid) => {
    if (!gid) return;
    setLoadingGuild(true); setT(null); setEditRole(""); setEditPerms([]);
    try {
      const r = await fetch(`/api/role-access?guild=${gid}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setRoles(d.roles || []);
      setItems((d.items || []).map((it) => ({ role: String(it.role), perms: String(it.perms || "").split(/[\s,]+/).filter(Boolean) })));
    } catch (e) { setRoles([]); setItems([]); setT({ bad: true, msg: e.message }); }
    setLoadingGuild(false);
  }, []);

  useEffect(() => { if (guild) loadGuild(guild); }, [guild, loadGuild]);

  const roleName = (id) => roles.find((r) => String(r.id) === String(id))?.name || id;
  const togglePerm = (k) => setEditPerms((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  function addOrUpdate() {
    if (!editRole) { setT({ bad: true, msg: "Pick a role first." }); return; }
    if (!editPerms.length) { setT({ bad: true, msg: "Choose at least one capability." }); return; }
    setItems((list) => {
      const others = list.filter((i) => i.role !== editRole);
      return [...others, { role: editRole, perms: editPerms }];
    });
    setEditRole(""); setEditPerms([]); setT(null);
  }
  const removeItem = (role) => setItems((list) => list.filter((i) => i.role !== role));
  function editItem(it) { setEditRole(it.role); setEditPerms(it.perms); }

  async function save() {
    setBusy(true); setT(null);
    try {
      const r = await fetch("/api/role-access", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guild, items: items.map((i) => ({ role: i.role, perms: i.perms })) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setT({ ok: true, msg: "Saved — members with these roles now have this access on the site." });
    } catch (e) { setT({ bad: true, msg: e.message }); }
    setBusy(false);
  }

  if (guilds === null) return <div className="card"><p className="muted" style={{ margin: 0 }}>Loading servers…</p></div>;

  return (
    <div>
      {/* server picker */}
      <div className="ra-servers">
        {guilds.map((g) => (
          <button key={g.id} className={`ra-server ${guild === g.id ? "on" : ""}`} onClick={() => setGuild(g.id)}>
            {g.icon ? <img src={g.icon} alt="" width="28" height="28" referrerPolicy="no-referrer" /> : <span className="ra-fb">{(g.name || "?")[0]}</span>}
            <span className="ra-sname">{g.name}</span>
          </button>
        ))}
      </div>

      <div className="card">
        {loadingGuild ? <p className="muted" style={{ margin: 0 }}>Loading roles…</p> : (
          <>
            {/* editor */}
            <div className="row" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label>Role</label>
                <Dropdown value={editRole} onChange={(e) => setEditRole(e.target.value)}
                  options={[{ value: "", label: "Select a role…" }, ...roles.map((r) => ({ value: r.id, label: r.name }))]} />
              </div>
            </div>
            <label style={{ marginTop: 16 }}>Allow this role to…</label>
            <div className="ra-caps">
              {CAPS.map((c) => (
                <button key={c.k} type="button" className={`ra-cap ${editPerms.includes(c.k) ? "on" : ""}`} onClick={() => togglePerm(c.k)}>
                  <span className="ra-check" aria-hidden="true">{editPerms.includes(c.k) ? "✓" : ""}</span>
                  <span><span className="ra-cap-t">{c.label}</span><span className="ra-cap-d">{c.desc}</span></span>
                </button>
              ))}
            </div>
            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn" style={{ width: "auto" }} onClick={addOrUpdate}>Add / update role</button>
            </div>

            {toast && <div className={`toast ${toast.bad ? "bad" : "ok"}`} style={{ marginTop: 14 }}>{toast.msg}</div>}

            {/* current mappings */}
            <div style={{ marginTop: 22 }}>
              <div className="between" style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 750, color: "var(--white)" }}>Role access ({items.length})</div>
                <button className="btn" style={{ width: "auto" }} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save changes"}</button>
              </div>
              {items.length === 0
                ? <p className="muted" style={{ margin: 0 }}>No roles mapped yet. Pick a role and its capabilities above, add it, then Save.</p>
                : (
                  <div className="ra-list">
                    {items.map((it) => (
                      <div className="ra-item" key={it.role}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="ra-item-role">@{roleName(it.role)}</div>
                          <div className="ra-item-perms">{it.perms.map((p) => <span key={p} className="chip">{CAP_LABEL[p] || p}</span>)}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn ghost" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }} onClick={() => editItem(it)}>Edit</button>
                          <button className="btn danger" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }} onClick={() => removeItem(it.role)}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
                Changes save to this server&apos;s permission map and apply within a minute (a member may need to reopen the site).
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
