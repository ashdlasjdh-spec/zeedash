"use client";
import { useState, useEffect, useCallback } from "react";
import Avatar from "./Avatar";
import Dropdown from "./Dropdown";

const FIELD = { power: "powers", gamepass: "gamepasses", shazam: "shazam", tool: "tools", startbr: "startbr", stand: "stand", car: "car" };

export default function GrantForm({ category, items, verb = "Grant", canManage = false, canPurge = false }) {
  const [sel, setSel] = useState(null);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [list, setList] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [durAmount, setDurAmount] = useState("1");
  const [durUnit, setDurUnit] = useState("perm"); // perm | s | m | h | d | w
  const [stats, setStats] = useState(null); // { players, total } — how many of this category are handed out
  const [mode, setMode] = useState("single"); // single | bulk
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const UNIT = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };

  // How much of this category is currently given out (single cheap COUNT, refreshed after actions).
  const loadStats = useCallback(async () => {
    try { const r = await fetch(`/api/perks/count?category=${category}`); const d = await r.json(); if (r.ok && !d.error) setStats(d); } catch {}
  }, [category]);
  useEffect(() => { loadStats(); }, [loadStats]);
  // Deep-link: /dashboard/<cat>?mode=bulk opens straight into bulk mode (from the Overview shortcut).
  useEffect(() => { if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "bulk") setMode("bulk"); }, []);

  async function submit(action) {
    if (!sel || !username) { setToast({ bad: true, msg: "Pick an item and enter a username." }); return; }
    const seconds = action === "grant" && durUnit !== "perm" ? Math.max(0, Math.floor((Number(durAmount) || 0) * (UNIT[durUnit] || 0))) : 0;
    setBusy(true); setToast(null);
    try {
      const res = await fetch("/api/grant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, key: sel, username, action, seconds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const temp = data.expiresIn ? ` (auto-revokes in ${data.expiresIn})` : "";
      setToast({ ok: !data.warn, msg: `${action === "revoke" ? "Revoked" : "Granted"} ${sel} ${action === "revoke" ? "from" : "to"} ${data.target.username}${temp}.` + (data.warn ? " ⚠ " + data.warn : "") });
      loadStats();
      if (list) loadGranted();
    } catch (e) { setToast({ bad: true, msg: e.message }); }
    setBusy(false);
  }

  async function submitBulk(action) {
    if (!sel) { setToast({ bad: true, msg: "Pick an item first." }); return; }
    const users = bulkText.split(/[\s,]+/).map((u) => u.trim()).filter(Boolean);
    if (!users.length) { setToast({ bad: true, msg: "Paste some usernames or IDs." }); return; }
    if (typeof window !== "undefined" && !window.confirm(`${action === "grant" ? "Grant" : "Revoke"} ${sel} ${action === "grant" ? "to" : "from"} ${users.length} player(s)?`)) return;
    setBulkBusy(true); setToast(null);
    try {
      const res = await fetch("/api/grant/bulk", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, key: sel, users, action }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setToast({ ok: !d.failed, msg: `${action === "grant" ? "Granted" : "Revoked"} ${sel} ${action === "grant" ? "to" : "from"} ${d.done}/${d.total}.` + (d.failed ? ` ⚠ ${d.failed} failed: ${d.errors.join("; ")}` : "") });
      loadStats();
      if (list) loadGranted();
    } catch (e) { setToast({ bad: true, msg: e.message }); }
    setBulkBusy(false);
  }

  async function loadGranted() {
    setLoadingList(true);
    try {
      const r = await fetch("/api/perks");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      const field = FIELD[category];
      let rows = [];
      if (field) rows = (d.perks || []).filter((p) => (p[field] || []).length).map((p) => ({ userId: p.userId, items: p[field], by: p.grantedBy }));
      setList(rows);
    } catch (e) { setToast({ bad: true, msg: e.message }); }
    setLoadingList(false);
  }

  // Co-founder+ only: revoke every item this user has in this category, straight from
  // the "currently granted" list.
  async function removeUser(userId, rowItems) {
    if (typeof window !== "undefined" && !window.confirm(`Remove ${rowItems.length} ${category}(s) from user ${userId}?`)) return;
    setBusy(true); setToast(null);
    try {
      for (const key of rowItems) {
        const res = await fetch("/api/grant", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, key, username: String(userId), action: "revoke" }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Failed");
      }
      setToast({ ok: true, msg: `Removed ${rowItems.length} ${category}(s) from ${userId}.` });
      loadStats();
      loadGranted();
    } catch (e) { setToast({ bad: true, msg: e.message }); }
    setBusy(false);
  }

  const showList = canManage && !!FIELD[category];

  return (
    <>
      <div className="card">
        <div className="between" style={{ marginBottom: 2 }}>
          <label style={{ margin: 0 }}>Choose {category}</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className="pill">{items.length} available</span>
            {stats && <span className="pill" title="Across all players in the shared database">{stats.total.toLocaleString()} given out · {stats.players.toLocaleString()} player{stats.players === 1 ? "" : "s"}</span>}
          </div>
        </div>
        <div className="item-grid">
          {items.map((it) => (
            <button key={it.key} className={`item ${sel === it.key ? "sel" : ""}`} onClick={() => setSel(it.key)}>{it.name}</button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 14, gap: 8 }}>
          <button className={`btn ${mode === "single" ? "" : "ghost"}`} style={{ width: "auto", minWidth: 0 }} onClick={() => setMode("single")}>Single</button>
          <button className={`btn ${mode === "bulk" ? "" : "ghost"}`} style={{ width: "auto", minWidth: 0 }} onClick={() => setMode("bulk")}>Bulk</button>
        </div>

        {mode === "single" && (
        <div className="row" style={{ marginTop: 14 }}>
          <div style={{ flex: 1, minWidth: 200, maxWidth: 520 }}>
            <label>Roblox username or ID</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. Builderman or 156" />
          </div>
          <div style={{ minWidth: 170 }}>
            <label>Duration</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={durAmount} onChange={(e) => setDurAmount(e.target.value)} inputMode="numeric" style={{ width: 60 }} disabled={durUnit === "perm"} placeholder="1" />
              <Dropdown value={durUnit} onChange={(e) => setDurUnit(e.target.value)} minWidth={128} options={[
                { value: "perm", label: "Permanent" }, { value: "s", label: "Seconds" }, { value: "m", label: "Minutes" },
                { value: "h", label: "Hours" }, { value: "d", label: "Days" }, { value: "w", label: "Weeks" },
              ]} />
            </div>
          </div>
          <button className="btn" disabled={busy} onClick={() => submit("grant")}>{busy ? "…" : verb}</button>
          <button className="btn ghost" disabled={busy} onClick={() => submit("revoke")}>Revoke</button>
        </div>
        )}

        {mode === "bulk" && (
        <div style={{ marginTop: 14 }}>
          <label>Players — one per line or comma-separated (username or ID)</label>
          <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={6} placeholder={"156\nBuilderman\n5011259316"} style={{ resize: "vertical" }} />
          <div className="row" style={{ marginTop: 12, gap: 8 }}>
            <button className="btn" style={{ width: "auto" }} disabled={bulkBusy} onClick={() => submitBulk("grant")}>{bulkBusy ? "Working…" : `${verb} all`}</button>
            <button className="btn ghost" style={{ width: "auto" }} disabled={bulkBusy} onClick={() => submitBulk("revoke")}>Revoke all</button>
          </div>
        </div>
        )}
        {toast && <div className={`toast ${toast.ok ? "ok" : "bad"}`}>{toast.msg}</div>}
      </div>

      {showList && (
        <div className="card">
          <div className="between">
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Currently granted</div>
              <div className="muted" style={{ fontSize: 13 }}>Everyone with a {category} in the shared database. Co founder+ can remove.</div>
            </div>
            <button className="btn ghost" style={{ width: "auto" }} disabled={loadingList} onClick={loadGranted}>
              {loadingList ? "Loading…" : list ? "Refresh" : "Load"}
            </button>
          </div>
          {list && (
            list.length === 0 ? (
              <p className="muted" style={{ marginTop: 14 }}>No {category}s granted yet.</p>
            ) : (
              <table style={{ marginTop: 14 }}>
                <thead><tr><th>User</th><th>Items</th><th>Granted by</th><th></th></tr></thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.userId}>
                      <td><a className="mono" href={`https://www.roblox.com/users/${r.userId}/profile`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}><Avatar userId={r.userId} size={26} />{r.userId}</a></td>
                      <td>{r.items.join(", ")}</td>
                      <td className="muted">{r.by || "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn ghost" style={{ width: "auto", color: "var(--danger)" }} disabled={busy} onClick={() => removeUser(r.userId, r.items)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      )}
    </>
  );
}
