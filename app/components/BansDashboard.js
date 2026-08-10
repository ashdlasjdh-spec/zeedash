"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Avatar from "./Avatar";

const SCOPE = "Zee Hood Game";

export default function BansDashboard() {
  const [action, setAction] = useState("ban"); // ban | warn | kick | unban
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("");
  const [evidence, setEvidence] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const [resolved, setResolved] = useState(null); // { userId, username, displayName, avatar, active, historyCount }
  const [resolving, setResolving] = useState(false);

  const [bans, setBans] = useState(null);
  const [loadingBans, setLoadingBans] = useState(false);
  const [search, setSearch] = useState("");
  const sigRef = useRef(""); // last list signature — skip no-op re-renders during polling

  // live resolve the target as you type (debounced, cancellable, latest-wins)
  const deb = useRef();
  const seq = useRef(0);
  useEffect(() => {
    clearTimeout(deb.current);
    const q = target.trim();
    if (!q) { setResolved(null); setResolving(false); return; }
    setResolving(true);
    const mySeq = ++seq.current;
    const ctrl = new AbortController();
    deb.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/bans?user=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const d = await r.json().catch(() => ({}));
        if (mySeq !== seq.current) return; // a newer keystroke already superseded this one
        setResolved(r.ok && d.user ? d.user : null);
        setResolving(false);
      } catch (e) {
        if (e.name === "AbortError" || mySeq !== seq.current) return;
        setResolved(null);
        setResolving(false);
      }
    }, 350);
    return () => { clearTimeout(deb.current); ctrl.abort(); };
  }, [target]);

  // silent = background poll: don't flash the loading state or surface transient errors.
  const loadBans = useCallback(async (fresh = false, silent = false) => {
    if (!silent) setLoadingBans(true);
    try {
      const r = await fetch(`/api/bans${fresh ? "?fresh=1" : ""}`);
      const d = await r.json();
      if (r.ok) {
        const next = d.bans || [];
        // Only update state when the list actually changed, so a background poll doesn't
        // re-render (and jump the scroll / reload avatars) when nothing moved.
        const sig = next.map((b) => `${b.userId}:${b.username}:${b.reason}`).join("|");
        if (sig !== sigRef.current) { sigRef.current = sig; setBans(next); }
      } else if (!silent) setToast({ bad: true, msg: d.error });
    } catch (e) { if (!silent) setToast({ bad: true, msg: e.message }); }
    if (!silent) setLoadingBans(false);
  }, []);
  useEffect(() => { loadBans(); }, [loadBans]);

  // Live updates: poll the active-ban list in the background so bans/unbans from the game,
  // bot, or another moderator appear on their own. Pauses while the tab is hidden and does an
  // immediate refresh the moment it becomes visible again.
  useEffect(() => {
    const poll = () => { if (document.visibilityState === "visible") loadBans(false, true); };
    const iv = setInterval(poll, 12000);
    document.addEventListener("visibilitychange", poll);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", poll); };
  }, [loadBans]);

  async function apply(act, userOverride) {
    const u = (userOverride || target).trim();
    if (!u) { setToast({ bad: true, msg: "Enter a target player." }); return; }
    if ((act === "ban" || act === "warn") && !reason.trim()) { setToast({ bad: true, msg: `A reason is required to ${act}.` }); return; }
    // Act on the already-resolved numeric id when we have it (row-unban passes an id too) — the
    // API resolves ids reliably even when a username lookup is flaky, so a valid target never
    // fails with "No such Roblox user".
    const sendUser = userOverride ? u : resolved?.userId ? String(resolved.userId) : u;
    setBusy(true); setToast(null);
    try {
      const r = await fetch("/api/bans", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: sendUser, reason, duration: duration.trim() || undefined, evidence: evidence.trim() || undefined, action: act }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Request failed");
      const wh = d.webhook && d.webhook !== "sent" ? ` ⚠ webhook: ${d.webhook}` : "";
      const note = d.note ? ` ⚠ ${d.note}` : "";
      const verb = act === "ban" ? "Banned" : act === "warn" ? "Warned" : act === "kick" ? "Kicked" : "Unbanned";
      setToast({ ok: !wh && !note, msg: `${verb} ${d.user?.username || u}${d.caseId ? ` — ${d.caseId}` : ""}.${wh}${note}` });
      if (act !== "unban") { setReason(""); setDuration(""); setEvidence(""); }
      loadBans();
      setTarget((t) => t); // keep target; resolve refreshes on next effect
    } catch (e) { setToast({ bad: true, msg: e.message }); }
    setBusy(false);
  }

  // Bulk ban/unban a pasted list (server-side loop; not blocked by the per-request limiter).
  async function applyBulk(act) {
    const users = bulkText.split(/[\s,]+/).map((u) => u.trim()).filter(Boolean);
    if (!users.length) { setToast({ bad: true, msg: "Paste some player IDs or usernames (one per line)." }); return; }
    if (act === "ban" && !reason.trim()) { setToast({ bad: true, msg: "A reason is required to ban." }); return; }
    if (typeof window !== "undefined" && !window.confirm(`${act === "ban" ? "Ban" : "Unban"} ${users.length} player(s)?`)) return;
    setBulkBusy(true); setToast(null);
    try {
      const r = await fetch("/api/bans/bulk", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users, action: act, reason }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      setToast({ ok: !d.failed, msg: `${act === "ban" ? "Banned" : "Unbanned"} ${d.done}/${d.total} player(s).` + (d.failed ? ` ⚠ ${d.failed} failed: ${d.errors.join("; ")}` : "") });
      loadBans(true);
    } catch (e) { setToast({ bad: true, msg: e.message }); }
    setBulkBusy(false);
  }

  const list = (bans || []).filter((b) => {
    const q = search.trim().toLowerCase();
    return !q || String(b.username).toLowerCase().includes(q) || String(b.userId).includes(q) || String(b.reason).toLowerCase().includes(q);
  });

  // Download the current (filtered) ban list as CSV.
  function exportCsv() {
    const data = list.length ? list : bans || [];
    if (!data.length) { setToast({ bad: true, msg: "No bans to export." }); return; }
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["userId", "username", "displayName", "reason", "duration", "startTime"].join(",")].concat(
      data.map((b) => [b.userId, b.username, b.displayName, b.reason, b.duration || "permanent", b.startTime || ""].map(esc).join(",")),
    );
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `active-bans-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* scope & status */}
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="card" style={{ padding: 18 }}>
          <div className="navsec" style={{ padding: 0 }}>Current scope</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ok)", marginTop: 4 }}>{SCOPE}</div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div className="navsec" style={{ padding: 0 }}>Active bans</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{bans == null ? "…" : bans.length}</div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div className="navsec" style={{ padding: 0 }}>Mode</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>Game scope</div>
        </div>
      </div>

      <div className="grid g2" style={{ alignItems: "start" }}>
        {/* ---- take action ---- */}
        <div className="card">
          <div style={{ fontWeight: 800, fontSize: 15 }}>⚡ Take action</div>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>Identify a player and apply a ban or unban to this game scope.</p>

          <div className="row" style={{ marginTop: 6, marginBottom: 14, flexWrap: "wrap" }}>
            <button className={`btn ${action === "ban" ? "danger" : "ghost"}`} onClick={() => setAction("ban")}>Ban</button>
            <button className={`btn ${action === "warn" ? "" : "ghost"}`} onClick={() => setAction("warn")}>Warn</button>
            <button className={`btn ${action === "kick" ? "" : "ghost"}`} onClick={() => setAction("kick")}>Kick</button>
            <button className={`btn ${action === "unban" ? "" : "ghost"}`} onClick={() => setAction("unban")}>Unban</button>
            <button className={`btn ${action === "bulk" ? "danger" : "ghost"}`} onClick={() => setAction("bulk")}>Bulk</button>
          </div>

          {action === "bulk" ? (
            <>
              <label>Players — one per line (username or ID)</label>
              <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={7} placeholder={"156\nBuilderman\n11080769482"} style={{ resize: "vertical" }} />
              <div style={{ marginTop: 12 }}>
                <label>Reason (required to ban)</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="exp - zhd" />
              </div>
              <div className="row" style={{ marginTop: 16, gap: 8 }}>
                <button className="btn danger" style={{ width: "auto" }} disabled={bulkBusy} onClick={() => applyBulk("ban")}>{bulkBusy ? "Working…" : "Ban all"}</button>
                <button className="btn" style={{ width: "auto" }} disabled={bulkBusy} onClick={() => applyBulk("unban")}>{bulkBusy ? "Working…" : "Unban all"}</button>
              </div>
              <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Up to 500 at once. No per-player webhook is posted (one audit entry is logged).</p>
              {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
            </>
          ) : (
          <>
          <label>Target player</label>
          <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Username, user ID, or Roblox profile link" />

          <div className="card" style={{ marginTop: 12, padding: 14, display: "flex", alignItems: "center", gap: 14 }}>
            {resolved
              ? <Avatar userId={resolved.userId} size={46} />
              : <div className="avatar" style={{ width: 46, height: 46 }}>{resolving ? "…" : "?"}</div>}
            <div style={{ minWidth: 0 }}>
              <div className="navsec" style={{ padding: 0 }}>Investigation target</div>
              {resolving && !resolved ? (
                <div style={{ fontWeight: 700 }}>Searching…</div>
              ) : resolved ? (
                <>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{resolved.displayName}</div>
                  <div className="muted" style={{ fontSize: 12.5 }}>
                    @{resolved.username} · ID {resolved.userId} · {resolved.active ? <span style={{ color: "var(--danger)" }}>Active ban</span> : "No active ban"} · {resolved.historyCount} past actions
                  </div>
                </>
              ) : (
                <div className="muted" style={{ fontSize: 13 }}>Awaiting player — type a username or ID.</div>
              )}
            </div>
          </div>

          {action === "ban" && (
            <div className="grid g2" style={{ marginTop: 14 }}>
              <div>
                <label>Reason</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="exp - zhd" />
                <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {["exp - zhd", "lock - zhd", "Silent - zhd", "avoiding ban - zhd"].map((r) => (
                    <button key={r} type="button" className="btn ghost" style={{ width: "auto", fontSize: 12, padding: "5px 9px" }} onClick={() => setReason(r)}>{r}</button>
                  ))}
                </div>
              </div>
              <div>
                <label>Duration (seconds) — blank = permanent</label>
                <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="permanent" inputMode="numeric" />
                <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {[["Permanent", ""], ["1h", "3600"], ["1d", "86400"], ["7d", "604800"], ["30d", "2592000"]].map(([lbl, v]) => (
                    <button key={lbl} type="button" className="btn ghost" style={{ width: "auto", fontSize: 12, padding: "5px 9px" }} onClick={() => setDuration(v)}>{lbl}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {action === "ban" && (
            <div style={{ marginTop: 12 }}><label>Evidence link (optional)</label><input value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Clip / proof URL" /></div>
          )}
          {action === "kick" && (
            <div style={{ marginTop: 14 }}>
              <label>Reason (optional)</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason shown to the player" />
              <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Kick only affects a player currently in-game. Needs the in-game <span className="mono">ModKick</span> listener installed.</p>
            </div>
          )}
          {action === "warn" && (
            <div style={{ marginTop: 14 }}>
              <div><label>Reason</label><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why they're being warned" /></div>
              <div style={{ marginTop: 12 }}><label>Evidence link (optional)</label><input value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Clip / proof URL" /></div>
              <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Recorded to their history and logged. Also shows in-game if they're online (needs the <span className="mono">ModWarn</span> listener).</p>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <button className={`btn ${action === "ban" ? "danger" : ""}`} disabled={busy} onClick={() => apply(action)}>
              {busy ? "Working…" : action === "ban" ? "Apply ban" : action === "warn" ? "Warn player" : action === "kick" ? "Kick player" : "Apply unban"}
            </button>
          </div>
          {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
          </>
          )}
        </div>

        {/* ---- active bans ---- */}
        <div className="card">
          <div className="between">
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                🚫 Active bans <span className="livedot" title="Auto-updating live" />
              </div>
              <div className="muted" style={{ fontSize: 13 }}>Everyone currently banned in this scope. Auto-updates live from Roblox.</div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn ghost" style={{ width: "auto" }} disabled={!bans || !bans.length} onClick={exportCsv}>Export CSV</button>
              <button className="btn ghost" style={{ width: "auto" }} disabled={loadingBans} onClick={() => loadBans(true)}>{loadingBans ? "Scanning…" : "Refresh"}</button>
            </div>
          </div>
          <input style={{ marginTop: 12 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search user, reason…" />
          <div className="muted" style={{ fontSize: 12, margin: "10px 0 6px" }}>{bans == null ? "" : `${list.length} of ${bans.length} shown`}</div>
          <div style={{ maxHeight: 620, overflowY: "auto", overflowX: "hidden" }}>
            {bans == null && <p className="muted">Loading…</p>}
            {bans && list.length === 0 && <p className="muted">No active bans.</p>}
            {list.map((b) => (
              <div
                key={b.userId}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 8px", borderBottom: "1px solid var(--line)" }}
              >
                <Avatar userId={b.userId} size={44} />
                <div style={{ minWidth: 0, flex: 1, lineHeight: 1.45 }}>
                  <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {b.displayName} <span className="muted" style={{ fontWeight: 400 }}>@{b.username}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    ID {b.userId}{b.reason ? ` · ${b.reason}` : ""}{b.duration ? " · temp" : ""}
                  </div>
                </div>
                <button className="btn ghost" style={{ width: "auto", flex: "0 0 auto" }} disabled={busy} onClick={() => apply("unban", String(b.userId))}>Unban</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
