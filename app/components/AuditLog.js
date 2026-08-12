"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Dropdown from "./Dropdown";
import { DiscordLink, RobloxLink, robloxIdFrom } from "./ProfileLinks";

const ACTIONS = ["", "grant", "revoke", "ban", "unban", "kick", "warn", "purge", "sync", "config", "whitelist"];
const CATEGORIES = ["", "power", "stand", "car", "tool", "gamepass", "shazam", "startbr", "tag", "emoji", "ban", "granter"];
const PAGE = 50;

function fmt(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleString();
}
const A_GREEN = new Set(["grant", "accept", "rank", "promote", "acceptall", "unblacklist", "unban", "whitelist", "sync", "config"]);
const A_RED = new Set(["revoke", "ban", "kick", "exile", "decline", "declineall", "wipe", "warn", "blacklist", "purge"]);
const actionColor = (a) => {
  a = String(a || "").toLowerCase();
  return A_GREEN.has(a) ? "var(--success)" : A_RED.has(a) ? "var(--danger)" : "var(--text)";
};

export default function AuditLog() {
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);
  const deb = useRef();

  const load = useCallback(async (offset = 0) => {
    setLoading(true); setErr(null);
    try {
      const p = new URLSearchParams();
      if (actor.trim()) p.set("actor", actor.trim());
      if (action) p.set("action", action);
      if (category) p.set("category", category);
      if (q.trim()) p.set("q", q.trim());
      p.set("limit", String(PAGE));
      p.set("offset", String(offset));
      const r = await fetch(`/api/audit?${p}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      const log = d.log || [];
      setRows((prev) => (offset === 0 ? log : [...(prev || []), ...log]));
      setDone(log.length < PAGE);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, [actor, action, category, q]);

  // Debounce filter changes → reload from the top.
  useEffect(() => {
    clearTimeout(deb.current);
    deb.current = setTimeout(() => load(0), 300);
    return () => clearTimeout(deb.current);
  }, [load]);

  return (
    <>
      <div className="card">
        <div className="grid g3" style={{ gap: 12 }}>
          <div><label>Staff (name or Discord ID)</label><input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="e.g. someone or 1835…" /></div>
          <div>
            <label>Action</label>
            <Dropdown value={action} onChange={(e) => setAction(e.target.value)} options={ACTIONS.map((a) => ({ value: a, label: a || "All actions" }))} />
          </div>
          <div>
            <label>Category</label>
            <Dropdown value={category} onChange={(e) => setCategory(e.target.value)} options={CATEGORIES.map((c) => ({ value: c, label: c || "All categories" }))} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label>Search target / item / detail</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="username, user ID, item name…" />
        </div>
        {err && <div className="toast bad">{err}</div>}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{rows == null ? "" : `${rows.length} entr${rows.length === 1 ? "y" : "ies"}${done ? "" : "+"}`}</div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr><th>Time</th><th>Staff</th><th>Action</th><th>Category</th><th>Item</th><th>Target</th><th>Detail</th></tr>
            </thead>
            <tbody>
              {rows == null && <tr><td colSpan={7} className="muted">Loading…</td></tr>}
              {rows && rows.length === 0 && <tr><td colSpan={7} className="muted">No matching entries.</td></tr>}
              {(rows || []).map((r, i) => (
                <tr key={i}>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>{fmt(r.created_at)}</td>
                  <td>{r.actor_id ? <DiscordLink id={r.actor_id}>{r.actor_name || r.actor_id}</DiscordLink> : (r.actor_name || "—")}</td>
                  <td style={{ color: actionColor(r.action), fontWeight: 700, textTransform: "capitalize" }}>{r.action}</td>
                  <td className="muted">{r.category || "—"}</td>
                  <td className="mono">{r.item_key || "—"}</td>
                  <td>{robloxIdFrom(r.target) ? <RobloxLink id={robloxIdFrom(r.target)}>{r.target}</RobloxLink> : (r.target || "—")}</td>
                  <td className="muted" style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.detail || ""}>{r.detail || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows && !done && (
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <button className="btn ghost" style={{ width: "auto" }} disabled={loading} onClick={() => load(rows.length)}>
              {loading ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
