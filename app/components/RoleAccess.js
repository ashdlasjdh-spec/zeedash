"use client";
import { useEffect, useState, useCallback } from "react";
import Dropdown from "./Dropdown";
import { GROUP_ACTIONS, GROUP_ACTION_LABELS, RANK_ASSIGN_ACTIONS, SECTION_GRANTS, SECTION_GRANT_LABELS } from "@/lib/permissions";

// Dashboard section grants offered in the "Other access" area.
const SECTION_DESCS = {
  bans: "Use the in-game Bans & moderation tools.",
  powers: "Grant Powers to players.",
  grants: "Grant everything — powers, stands, cars, tools, gamepasses, tags, emojis.",
};

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
  const [editUser, setEditUser] = useState(""); // optional: target a specific Discord user id instead of a role
  const [editActions, setEditActions] = useState([]);
  const [editMaxRank, setEditMaxRank] = useState("");
  const [editTranscripts, setEditTranscripts] = useState(false);
  const [editSections, setEditSections] = useState([]); // bans / powers / grants
  const [busy, setBusy] = useState(false);
  const [toast, setT] = useState(null);
  const [previewId, setPreviewId] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  async function runPreview() {
    const uid = String(previewId || "").trim();
    if (!/^\d{5,}$/.test(uid)) { setPreview({ error: "Enter a valid Discord user ID." }); return; }
    setPreviewBusy(true); setPreview(null);
    try {
      const r = await fetch(`/api/resolve-access?guild=${guild}&user=${uid}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Lookup failed.");
      setPreview(d);
    } catch (e) { setPreview({ error: e.message }); }
    setPreviewBusy(false);
  }

  const keyOf = (it) => (it.user ? `u:${it.user}` : `r:${it.role}`);
  const normItem = (it) => ({ role: it.role ? String(it.role) : undefined, user: it.user ? String(it.user) : undefined, group: { actions: Array.isArray(it.group?.actions) ? it.group.actions : [], maxRank: it.group?.maxRank ?? null }, transcripts: !!it.transcripts, sections: Array.isArray(it.sections) ? it.sections.filter((s) => SECTION_GRANTS.includes(s)) : [] });
  const resetEdit = () => { setEditRole(""); setEditUser(""); setEditActions([]); setEditMaxRank(""); setEditTranscripts(false); setEditSections([]); };

  useEffect(() => {
    fetch("/api/role-access").then((r) => r.json()).then((d) => {
      const gs = d.guilds || [];
      setGuilds(gs);
      if (gs[0]) setGuild(gs[0].id);
    }).catch(() => setGuilds([]));
  }, []);

  const loadGuild = useCallback(async (gid) => {
    if (!gid) return;
    setLoadingGuild(true); setT(null); resetEdit();
    try {
      const r = await fetch(`/api/role-access?guild=${gid}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setRoles(d.roles || []);
      setGroupRanks(d.groupRanks || []);
      setItems((d.items || []).map(normItem));
    } catch (e) { setRoles([]); setGroupRanks([]); setItems([]); setT({ bad: true, msg: e.message }); }
    setLoadingGuild(false);
  }, []);

  useEffect(() => { if (guild) loadGuild(guild); }, [guild, loadGuild]);

  const roleName = (id) => roles.find((r) => String(r.id) === String(id))?.name || id;
  const rankName = (n) => groupRanks.find((r) => Number(r.rank) === Number(n))?.name || (n != null ? `rank ${n}` : "");
  const toggleAction = (k) => setEditActions((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const toggleSection = (k) => setEditSections((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const needsCeiling = editActions.some((a) => RANK_ASSIGN_ACTIONS.has(a));

  function addOrUpdate() {
    const user = String(editUser || "").trim();
    if (user && !/^\d{5,}$/.test(user)) { setT({ bad: true, msg: "That user ID doesn't look right (it should be a Discord ID)." }); return; }
    if (!user && !editRole) { setT({ bad: true, msg: "Pick a role, or enter a user ID to grant a specific person." }); return; }
    if (!editActions.length && !editTranscripts && !editSections.length) { setT({ bad: true, msg: "Choose at least one action, transcripts, or a section (Bans / Powers / Grants)." }); return; }
    if (needsCeiling && editMaxRank === "") { setT({ bad: true, msg: "Pick the highest rank this role may assign people to." }); return; }
    const maxRank = needsCeiling && editMaxRank !== "" ? Number(editMaxRank) : null;
    const item = normItem({ role: user ? undefined : editRole, user: user || undefined, group: { actions: editActions, maxRank }, transcripts: editTranscripts, sections: editSections });
    const k = keyOf(item);
    setItems((list) => [...list.filter((i) => keyOf(i) !== k), item]);
    resetEdit(); setT(null);
  }
  const removeItem = (key) => setItems((list) => list.filter((i) => keyOf(i) !== key));
  function editItem(it) { setEditRole(it.user ? "" : (it.role || "")); setEditUser(it.user || ""); setEditActions(it.group?.actions || []); setEditMaxRank(it.group?.maxRank != null ? String(it.group.maxRank) : ""); setEditTranscripts(!!it.transcripts); setEditSections(Array.isArray(it.sections) ? it.sections : []); }

  async function save() {
    setBusy(true); setT(null);
    try {
      const r = await fetch("/api/role-access", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guild, items }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setItems((d.items || []).map(normItem));
      setT({ ok: true, msg: "Saved — these roles and users now have the access you set on the site." });
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
            <div className="row" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label>Role</label>
                <Dropdown value={editRole} onChange={(e) => { setEditRole(e.target.value); if (e.target.value) setEditUser(""); }}
                  options={[{ value: "", label: "Select a role…" }, ...roles.map((r) => ({ value: r.id, label: r.name }))]} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label>…or a specific user ID</label>
                <input className="input" placeholder="Discord user ID (optional)" value={editUser}
                  onChange={(e) => { setEditUser(e.target.value.replace(/[^\d]/g, "")); if (e.target.value) setEditRole(""); }} />
                <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Grants this access to one person even if they don&apos;t have the role.</p>
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

            <label style={{ marginTop: 18 }}>Other access</label>
            <div className="ra-caps">
              <button type="button" className={`ra-cap ${editTranscripts ? "on" : ""}`} onClick={() => setEditTranscripts((v) => !v)}>
                <span className="ra-check" aria-hidden="true">{editTranscripts ? "✓" : ""}</span>
                <span><span className="ra-cap-t">View ticket transcripts</span><span className="ra-cap-d">May open this server&apos;s ticket transcripts.</span></span>
              </button>
              {SECTION_GRANTS.map((s) => (
                <button key={s} type="button" className={`ra-cap ${editSections.includes(s) ? "on" : ""}`} onClick={() => toggleSection(s)}>
                  <span className="ra-check" aria-hidden="true">{editSections.includes(s) ? "✓" : ""}</span>
                  <span><span className="ra-cap-t">{SECTION_GRANT_LABELS[s]}</span><span className="ra-cap-d">{SECTION_DESCS[s]}</span></span>
                </button>
              ))}
            </div>

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
                      <div className="ra-item" key={keyOf(it)}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="ra-item-role">{it.user ? `User ${it.user}` : `@${roleName(it.role)}`}</div>
                          <div className="ra-item-perms">
                            {(it.group?.actions || []).map((a) => <span key={a} className="chip">{GROUP_ACTION_LABELS[a] || a}</span>)}
                            {it.group?.maxRank != null && <span className="chip" style={{ opacity: 0.85 }}>≤ {rankName(it.group.maxRank)}</span>}
                            {it.transcripts && <span className="chip">Transcripts</span>}
                            {(it.sections || []).map((s) => <span key={s} className="chip">{SECTION_GRANT_LABELS[s]?.split(" ")[0] || s}</span>)}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn ghost" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }} onClick={() => editItem(it)}>Edit</button>
                          <button className="btn danger" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }} onClick={() => removeItem(keyOf(it))}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
                Delegate group management, transcript viewing, and dashboard sections (Bans, Powers, Grants) to a role or a specific user. Deleted roles drop off automatically. Changes apply within a minute (a member may need to reopen the site).
              </p>
            </div>
          </>
        )}
      </div>

      {/* Preview access as user — check exactly what a Discord ID would get in this server. */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 750, color: "var(--white)", marginBottom: 4 }}>Preview access as user</div>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>Enter a Discord user ID to see exactly what they can do in <b>{guilds.find((g) => g.id === guild)?.name || "this server"}</b> — and whether they can get into the dashboard.</p>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="Discord user ID" value={previewId}
            onChange={(e) => setPreviewId(e.target.value.replace(/[^\d]/g, ""))} onKeyDown={(e) => e.key === "Enter" && runPreview()} />
          <button className="btn" style={{ width: "auto" }} disabled={previewBusy} onClick={runPreview}>{previewBusy ? "Checking…" : "Preview"}</button>
        </div>
        {preview && (
          preview.error ? <div className="toast bad" style={{ marginTop: 12 }}>{preview.error}</div>
          : preview.isMember === false ? <div className="toast bad" style={{ marginTop: 12 }}>That user isn&apos;t in this server, so no roles could be read.</div>
          : (
            <div style={{ marginTop: 12 }}>
              <div className="between" style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700, color: "var(--white)" }}>{preview.member?.name || preview.member?.id}</div>
                <span className="chip" style={{ background: preview.canAccess ? "var(--success-soft)" : "var(--danger-soft)", color: preview.canAccess ? "var(--success)" : "var(--danger)" }}>
                  {preview.canAccess ? "Can access the dashboard" : "No dashboard access"}
                </span>
              </div>
              <div className="ra-item-perms">
                {preview.level > 0 && <span className="chip">Staff level {preview.level}</span>}
                {(preview.group?.actions || []).map((a) => <span key={a} className="chip">{GROUP_ACTION_LABELS[a] || a}</span>)}
                {preview.transcripts && <span className="chip">Transcripts</span>}
                {(preview.sections || []).map((s) => <span key={s} className="chip">{SECTION_GRANT_LABELS[s]?.split(" ")[0] || s}</span>)}
                {(preview.manage || []).map((f) => <span key={`m${f}`} className="chip">Manage {f}</span>)}
                {(preview.view || []).map((f) => <span key={`v${f}`} className="chip" style={{ opacity: 0.8 }}>View {f}</span>)}
                {!preview.canAccess && <span className="muted" style={{ fontSize: 12 }}>Nothing grants this user access yet.</span>}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
