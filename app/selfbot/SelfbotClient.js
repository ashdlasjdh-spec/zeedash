"use client";
import { useCallback, useEffect, useState } from "react";

// Self-bot control panel. All calls go to /api/selfbot on this same origin
// (CSP connect-src 'self'), which proxies to the bot with the shared secret.
const C = {
  wrap: { maxWidth: 820, margin: "0 auto", padding: 24, fontFamily: "system-ui, Segoe UI, Roboto, sans-serif", color: "#e6e9ef" },
  card: { background: "#171a21", border: "1px solid #262b36", borderRadius: 12, padding: 18, margin: "14px 0" },
  row: { display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #262b36" },
  mut: { color: "#8b93a7" },
  inp: { background: "#0d0f14", border: "1px solid #262b36", color: "#e6e9ef", borderRadius: 8, padding: "8px 10px", width: 220 },
  btn: { background: "#5b8cff", color: "#fff", border: 0, borderRadius: 8, padding: "9px 14px", cursor: "pointer" },
  ghost: { background: "#222735", color: "#e6e9ef", border: "1px solid #262b36", borderRadius: 8, padding: "9px 14px", cursor: "pointer" },
  bad: { background: "#f85149", color: "#fff", border: 0, borderRadius: 8, padding: "9px 14px", cursor: "pointer" },
  pre: { whiteSpace: "pre-wrap", background: "#0d0f14", border: "1px solid #262b36", borderRadius: 8, padding: 10, maxHeight: 280, overflow: "auto" },
};

export default function SelfbotClient({ me }) {
  const [state, setState] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [out, setOut] = useState("");
  const [tok, setTok] = useState("");
  const [cook, setCook] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/selfbot", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "error");
        return;
      }
      setErr("");
      setState(j);
    } catch (e) {
      setErr(String((e && e.message) || e));
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const post = async (kind, payload) => {
    const r = await fetch("/api/selfbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, payload }),
    });
    return r.json();
  };
  // Commands are queued in the DB and answered asynchronously by the bot; poll
  // the API until the matching command_result shows up.
  const pollResult = async (id, tries = 12) => {
    for (let i = 0; i < tries; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const r = await fetch("/api/selfbot", { cache: "no-store" });
        const j = await r.json();
        if (j && j.status) setState(j);
        if (j && j.result && j.result.id === id) return j.result;
      } catch (e) {
        /* keep polling */
      }
    }
    return null;
  };

  const act = async (action, arg) => {
    setBusy(action);
    try {
      const j = await post("action", { action, arg });
      if (j && j.queued) {
        const res = await pollResult(j.id);
        if (res) setOut(JSON.stringify(res, null, 2));
      }
      await load();
    } finally {
      setBusy("");
    }
  };
  const saveSetting = async (patch) => {
    await post("settings", patch);
    await load();
  };
  const saveSecret = async (patch) => {
    await post("secrets", patch);
    setTok("");
    setCook("");
    await load();
  };
  const wouldkick = async () => {
    setBusy("wouldkick");
    try {
      const j = await post("action", { action: "wouldkick" });
      let hits = [];
      if (j && j.queued) {
        const res = await pollResult(j.id);
        hits = (res && res.hits) || [];
      }
      setOut(
        hits.length
          ? "Would remove " + hits.length + ":\n" + hits.map((h) => `• ${h.discordId} -> ${h.robloxId} (${h.rankName}/${h.rank})`).join("\n")
          : "Nobody would be removed (or bot offline).",
      );
    } finally {
      setBusy("");
    }
  };

  if (err && !state) {
    return (
      <main style={C.wrap}>
        <h1>Self-bot control</h1>
        <p style={{ color: "#f85149" }}>{err}</p>
        <button style={C.btn} onClick={load}>Retry</button>
      </main>
    );
  }
  if (!state) {
    return (
      <main style={C.wrap}>
        <h1>Self-bot control</h1>
        <p style={C.mut}>Loading…</p>
      </main>
    );
  }

  const cfg = state.settings || {};
  const st = state.status || {};

  return (
    <main style={C.wrap}>
      <h1>Self-bot control</h1>
      <p style={C.mut}>
        Signed in as {me}. {err ? <span style={{ color: "#f85149" }}>{err}</span> : null}
      </p>

      <div style={C.card}>
        <h3>Status</h3>
        <Row k="Connected" v={String(!!st.connected)} />
        <Row k="Account" v={st.tag || "—"} />
        <Row k="Staff records" v={st.staffIndexSize} />
        <Row k="Audit watcher" v={String(!!st.auditEnabled)} />
        <Row k="Dry run" v={String(!!cfg.dryRun)} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button style={C.btn} onClick={() => act("connect")}>Connect</button>
          <button style={C.ghost} onClick={() => act("disconnect")}>Disconnect</button>
          <button style={C.ghost} onClick={() => act("restart")}>Restart</button>
          <button style={C.ghost} onClick={() => act("reindex")}>Reindex</button>
          <button style={C.ghost} onClick={() => act("sync")}>Sync now</button>
          <button style={C.ghost} onClick={wouldkick}>Dry-run preview</button>
        </div>
      </div>

      <div style={C.card}>
        <h3>Credentials</h3>
        <div style={C.row}>
          <span>Discord token <em style={C.mut}>({cfg.tokenHint})</em></span>
          <span>
            <input style={C.inp} type="password" placeholder="new token" value={tok} onChange={(e) => setTok(e.target.value)} />{" "}
            <button style={C.btn} onClick={() => saveSecret({ discordToken: tok })} disabled={!tok}>Set</button>
          </span>
        </div>
        <div style={C.row}>
          <span>Roblox cookie <em style={C.mut}>({cfg.cookieHint})</em></span>
          <span>
            <input style={C.inp} type="password" placeholder="new .ROBLOSECURITY" value={cook} onChange={(e) => setCook(e.target.value)} />{" "}
            <button style={C.btn} onClick={() => saveSecret({ roblosecurity: cook })} disabled={!cook}>Set</button>
          </span>
        </div>
      </div>

      <div style={C.card}>
        <h3>Settings</h3>
        <Toggle label="Dry run (remove nobody)" v={cfg.dryRun} onChange={(v) => saveSetting({ dryRun: v })} />
        <Toggle label="Kick when staff role removed" v={cfg.kickOnStaffRoleRemoved} onChange={(v) => saveSetting({ kickOnStaffRoleRemoved: v })} />
        <Toggle label="Require staff role for fire msg" v={cfg.requireStaffRoleForFire} onChange={(v) => saveSetting({ requireStaffRoleForFire: v })} />
        <NumField label="Staff min rank" v={cfg.staffMinRank} onSave={(v) => saveSetting({ staffMinRank: v })} />
        <NumField label="Staff max rank (0 = none)" v={cfg.staffMaxRank} onSave={(v) => saveSetting({ staffMaxRank: v })} />
        <TextField label="Managed group id" v={cfg.managedGroupId} onSave={(v) => saveSetting({ managedGroupId: v })} />
        <NumField label="Audit poll seconds" v={cfg.auditPollSeconds} onSave={(v) => saveSetting({ auditPollSeconds: v })} />
      </div>

      <div style={C.card}>
        <h3>Manual kick</h3>
        <KickRow label="By Discord ID" onKick={(id) => act("kickDiscord", id)} />
        <KickRow label="By Roblox ID" onKick={(id) => act("kickRoblox", id)} />
        <p style={C.mut}>Both are rank-guarded — protected ranks are never removed.</p>
      </div>

      {out ? <pre style={C.pre}>{out}</pre> : null}
      {busy ? <p style={C.mut}>Working: {busy}…</p> : null}
    </main>
  );
}

function Row({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #262b36" }}>
      <span style={{ color: "#8b93a7" }}>{k}</span>
      <b>{String(v)}</b>
    </div>
  );
}
function Toggle({ label, v, onChange }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #262b36" }}>
      <span style={{ color: "#8b93a7" }}>{label}</span>
      <input type="checkbox" checked={!!v} onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
}
function NumField({ label, v, onSave }) {
  const [x, setX] = useState(v);
  useEffect(() => setX(v), [v]);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #262b36" }}>
      <span style={{ color: "#8b93a7" }}>{label}</span>
      <span>
        <input
          style={{ background: "#0d0f14", border: "1px solid #262b36", color: "#e6e9ef", borderRadius: 8, padding: "6px 8px", width: 120 }}
          value={x == null ? "" : x}
          onChange={(e) => setX(e.target.value)}
        />{" "}
        <button
          style={{ background: "#222735", color: "#e6e9ef", border: "1px solid #262b36", borderRadius: 8, padding: "7px 10px", cursor: "pointer" }}
          onClick={() => onSave(parseInt(x || "0", 10))}
        >
          Save
        </button>
      </span>
    </div>
  );
}
function TextField({ label, v, onSave }) {
  const [x, setX] = useState(v);
  useEffect(() => setX(v), [v]);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #262b36" }}>
      <span style={{ color: "#8b93a7" }}>{label}</span>
      <span>
        <input
          style={{ background: "#0d0f14", border: "1px solid #262b36", color: "#e6e9ef", borderRadius: 8, padding: "6px 8px", width: 200 }}
          value={x == null ? "" : x}
          onChange={(e) => setX(e.target.value)}
        />{" "}
        <button
          style={{ background: "#222735", color: "#e6e9ef", border: "1px solid #262b36", borderRadius: 8, padding: "7px 10px", cursor: "pointer" }}
          onClick={() => onSave(x)}
        >
          Save
        </button>
      </span>
    </div>
  );
}
function KickRow({ label, onKick }) {
  const [id, setId] = useState("");
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #262b36" }}>
      <span style={{ color: "#8b93a7" }}>{label}</span>
      <span>
        <input
          style={{ background: "#0d0f14", border: "1px solid #262b36", color: "#e6e9ef", borderRadius: 8, padding: "6px 8px", width: 200 }}
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="id"
        />{" "}
        <button
          style={{ background: "#f85149", color: "#fff", border: 0, borderRadius: 8, padding: "7px 10px", cursor: "pointer" }}
          onClick={() => id && onKick(id)}
        >
          Kick
        </button>
      </span>
    </div>
  );
}
