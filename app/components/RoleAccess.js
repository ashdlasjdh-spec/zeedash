"use client";
import { useEffect, useState, useCallback } from "react";
import Dropdown from "./Dropdown";
import { GROUP_ACTIONS, GROUP_ACTION_LABELS, RANK_ASSIGN_ACTIONS } from "@/lib/permissions";

// Group actions grouped for the UI. Keys are GROUP_ACTIONS.
const ACTION_GROUPS = [
  {
    label: "Look up",
    actions: [{ k: "lookup", desc: "See a member's group rank & profile." }],
  },
  {
    label: "Ranking",
    actions: [
      { k: "rank", desc: "Set a member to a specific rank." },
      { k: "promote", desc: "Promote a member one rank." },
      { k: "demote", desc: "Demote a member one rank." },
    ],
  },
  {
    label: "Join requests",
    actions: [
      { k: "accept", desc: "Accept a single join request." },
      { k: "decline", desc: "Decline a single join request." },
      { k: "acceptAll", desc: "Accept ALL pending requests." },
      { k: "declineAll", desc: "Decline ALL pending requests." },
    ],
  },
  {
    label: "Other",
    actions: [
      { k: "kick", desc: "Kick / exile a member from the group." },
      { k: "shout", desc: "Post (or clear) the group shout." },
    ],
  },
];

export default function RoleAccess() {
  const [guilds, setGuilds] = useState(null);
  const [guild, setGuild] = useState("");
  const [roles, setRoles] = useState([]);
  const [groupRanks, setGroupRanks] = useState([]);
  const [items, setItems] = useState([]); // [{ role, group: { actions, maxRank } }]
  const [loadingGuild, setLoadingGuild] = useState(false);
  const [editRole, setEditRole] = useState("");
  const [editActions, setEditActions] = useState([]);
  const [editMaxRank, setEditMaxRank] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setT] = useState(null);

  useEffect(() => {
    fetch("/api/role-access").then((r) => r.json()).then((d) => {
      const gs = d.guilds || [];
      setGuilds(gs);
      if (gs[0]) setGuild(gs[0].id);
    }).catch(() => setGuilds([]));
  }, []);

  const loadGuild = useCallback(async (gid) => {
    if (!gid) return;
    setLoadingGuild(true); setT(null); setEditRole(""); setEditActions([]); setEditMaxRank("");
    try {
      const r = await fetch(`/api/role-access?guild=${gid}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setRoles(d.roles || []);
      setGroupRanks(d.groupRanks || []);
      setItems((d.items || []).map((it) => ({ role: String(it.role), group: { actions: Array.isArray(it.group?.actions) ? it.group.actions : [], maxRank: it.group?.maxRank ?? null } })));
    } catch (e) { setRoles([]); setGroupRanks([]); setItems([]); setT({ bad: true, msg: e.message }); }
    setLoadingGuild(false);
  }, []);

  useEffect(() => { if (guild) loadGuild(guild); }, [guild, loadGuild]);

  const roleName = (id) => roles.find((r) => String(r.id) === String(id))?.name || id;
  const rankName = (n) => groupRanks.find((r) => Number(r.rank) === Number(n))?.name || (n != null ? `rank ${n}` : "");
  const toggleAction = (k) => setEditActions((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const needsCeiling = editActions.some((a) => RANK_ASSIGN_ACTIONS.has(a));

  function addOrUpdate() {
    if (!editRole) { setT({ bad: true, msg: "Pick a role first." }); return; }
    if (!editActions.length) { setT({ bad: true, msg: "Choose at least one group action." }); return; }
    if (needsCeiling && editMaxRank === "") { setT({ bad: true, msg: "Pick the highest rank this role may assign people to." }); return; }
    const maxRank = needsCeiling && editMaxRank !== "" ? Number(editMaxRank) : null;
    setItems((list) => [...list.filter((i) => i.role !== editRole), { role: editRole, group: { actions: editActions, maxRank } }]);
    setEditRole(""); setEditActions([]); setEditMaxRank(""); setT(null);
  }
  const removeItem = (role) => setItems((list) => list.filter((i) => i.role !== role));
  function editItem(it) { setEditRole(it.role); setEditActions(it.group?.actions || []); setEditMaxRank(it.group?.maxRank != null ? String(it.group.maxRank) : ""); }

  async function save() {
    setBusy(true); setT(null);
    try {
      const r = await fetch("/api/role-access", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guild, items }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setItems((d.items || []).map((it) => ({ role: String(it.role), group: { actions: it.group?.actions || [], maxRank: it.group?.maxRank ?? null } })));
      setT({ ok: true, msg: "Saved — members with these roles now have this group access on the site." });
    } catch (e) { setT({ bad: true, msg: e.message }); }
    setBusy(false);
  }

  if (guilds === null) return <div className="card"><p className="muted" style={{ margin: 0 }}>Loading servers…</p></div>;

  const rankOptions = [{ value: "", label: groupRanks.length ? "Select highest rank…" : "No group ranks loaded" },
    ...groupRanks.map((r) => ({ value: String(r.rank), label: `${r.name} (rank ${r.rank})` }))];

  return (
    <div>
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
            <div className="row" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label>Role</label>
                <Dropdown value={editRole} onChange={(e) => setEditRole(e.target.value)}
                  options={[{ value: "", label: "Select a role…" }, ...roles.map((r) => ({ value: r.id, label: r.name }))]} />
              </div>
            </div>

            <label style={{ marginTop: 16 }}>This role can…</label>
            {ACTION_GROUPS.map((grp) => (
              <div key={grp.label} style={{ marginTop: 10 }}>
                <div className="ra-grp">{grp.label}</div>
                <div className="ra-caps">
                  {grp.actions.map((c) => (
                    <button key={c.k} type="button" className={`ra-cap ${editActions.includes(c.k) ? "on" : ""}`} onClick={() => toggleAction(c.k)}>
                      <span className="ra-check" aria-hidden="true">{editActions.includes(c.k) ? "✓" : ""}</span>
                      <span><span className="ra-cap-t">{GROUP_ACTION_LABELS[c.k]}</span><span className="ra-cap-d">{c.desc}</span></span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {needsCeiling && (
              <div style={{ marginTop: 16 }}>
                <label>Highest rank they can assign / accept people to</label>
                <Dropdown value={editMaxRank} onChange={(e) => setEditMaxRank(e.target.value)} options={rankOptions} />
                <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  They can rank / promote / accept people up to and including this rank — never above it. (e.g. cap at Admin so they can&apos;t rank anyone Co-Owner.)
                </p>
              </div>
            )}

            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn" style={{ width: "auto" }} onClick={addOrUpdate}>Add / update role</button>
            </div>

            {toast && <div className={`toast ${toast.bad ? "bad" : "ok"}`} style={{ marginTop: 14 }}>{toast.msg}</div>}

            <div style={{ marginTop: 22 }}>
              <div className="between" style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 750, color: "var(--white)" }}>Role access ({items.length})</div>
                <button className="btn" style={{ width: "auto" }} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save changes"}</button>
              </div>
              {items.length === 0
                ? <p className="muted" style={{ margin: 0 }}>No roles mapped yet. Pick a role and its group actions above, add it, then Save.</p>
                : (
                  <div className="ra-list">
                    {items.map((it) => (
                      <div className="ra-item" key={it.role}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="ra-item-role">@{roleName(it.role)}</div>
                          <div className="ra-item-perms">
                            {(it.group?.actions || []).map((a) => <span key={a} className="chip">{GROUP_ACTION_LABELS[a] || a}</span>)}
                            {it.group?.maxRank != null && <span className="chip" style={{ opacity: 0.85 }}>≤ {rankName(it.group.maxRank)}</span>}
                          </div>
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
                Delegates Roblox group management only. Deleted roles drop off automatically. Changes apply within a minute (a member may need to reopen the site).
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
