"use client";
import { useState, useMemo } from "react";

const LVL_TONE = { Owner: "var(--danger)", Admin: "var(--brand)", Everyone: "var(--muted)" };

export default function CommandsBrowser({ data }) {
  const [q, setQ] = useState("");
  const prefix = data.prefix || ",";
  const query = q.trim().toLowerCase();

  // Filter each category's commands by name / alias / description.
  const cats = useMemo(() => {
    if (!query) return data.categories;
    return data.categories
      .map((c) => ({
        ...c,
        commands: c.commands.filter(
          (cmd) =>
            cmd.name.includes(query) ||
            (cmd.aliases || []).some((a) => a.includes(query)) ||
            (cmd.description || "").toLowerCase().includes(query),
        ),
      }))
      .filter((c) => c.commands.length);
  }, [data.categories, query]);

  const shown = cats.reduce((n, c) => n + c.commands.length, 0);

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 18px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
        <img src="/zhd-mark.png" alt="" width="40" height="40" style={{ objectFit: "contain" }} />
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900, letterSpacing: "-0.02em" }}>Commands</h1>
      </div>
      <p className="muted" style={{ marginTop: 0, fontSize: 14.5 }}>
        {data.total} commands. Use them with the <code style={{ fontWeight: 700 }}>{prefix}</code> prefix or as{" "}
        <code style={{ fontWeight: 700 }}>/</code> slash commands (the most-used ones). Slash-enabled commands are marked{" "}
        <span style={badge("var(--brand)")}>/</span>.
      </p>

      {/* Search */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Search ${data.total} commands…`}
        style={{
          width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--line)",
          background: "var(--surface-2)", color: "var(--text)", fontSize: 15, marginTop: 8, outline: "none",
        }}
      />

      {/* Category jump nav */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "16px 0 22px" }}>
        {cats.map((c) => (
          <a key={c.name} href={`#${slug(c.name)}`} style={chip}>
            {c.name} <span className="muted">{c.commands.length}</span>
          </a>
        ))}
      </div>

      {query && <div className="muted" style={{ marginBottom: 16 }}>{shown} match{shown === 1 ? "" : "es"} for “{q}”.</div>}

      {/* Sections */}
      {cats.map((c) => (
        <section key={c.name} id={slug(c.name)} style={{ marginBottom: 34, scrollMarginTop: 20 }}>
          <h2 style={{ fontSize: 19, fontWeight: 800, display: "flex", alignItems: "center", gap: 9, margin: "0 0 12px" }}>
            {c.name}
            <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>{c.commands.length}</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            {c.commands.map((cmd) => (
              <div key={cmd.name} style={card}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <code style={{ fontSize: 15, fontWeight: 800, color: "var(--brand)" }}>{prefix}{cmd.name}</code>
                  {cmd.hybrid && <span style={badge("var(--brand)")} title="Also a slash command">/</span>}
                  <span style={{ ...badge(LVL_TONE[cmd.level] || "var(--muted)"), marginLeft: "auto" }}>{cmd.level}</span>
                </div>
                <div style={{ fontSize: 13.5, color: "var(--text)", margin: "7px 0" }}>{cmd.description}</div>
                <code style={{ fontSize: 12, color: "var(--muted)", display: "block", wordBreak: "break-word" }}>{cmd.usage}</code>
                {!!(cmd.aliases || []).length && (
                  <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                    aka {cmd.aliases.map((a) => <code key={a} style={{ marginRight: 6 }}>{prefix}{a}</code>)}
                  </div>
                )}
                {!!(cmd.subcommands || []).length && (
                  <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                    {cmd.subcommands.map((s) => <code key={s.name} style={{ marginRight: 6 }}>{s.name}</code>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {!cats.length && <div className="muted" style={{ padding: 40, textAlign: "center" }}>No commands match “{q}”.</div>}
    </div>
  );
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const chip = { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--surface-2)", fontSize: 13, textDecoration: "none", color: "inherit" };
const card = { border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", background: "var(--surface-2)" };
const badge = (color) => ({ fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 999, border: `1px solid ${color}`, color });
