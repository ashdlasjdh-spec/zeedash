"use client";
// A Discord-style preview of a published panel, so you can see what it'll look like before posting.
// Mirrors how the bot renders it (buildButtonPanel / buildPanels): a brand-coloured embed + rows of
// up to 5 buttons. Pure function of the live config — no network, updates as you type.

// Discord's actual button colours.
const BTN = { primary: "#5865F2", success: "#248046", secondary: "#4e5058", danger: "#da373c" };
// Config style word -> Discord variant (button-roles). Default is gray/secondary, matching the bot.
const STYLE = { green: "success", blurple: "primary", gray: "secondary", grey: "secondary", red: "danger", primary: "primary", success: "success", secondary: "secondary", danger: "danger" };

function Button({ label, emoji, variant }) {
  return (
    <span className="dpv-btn" style={{ background: BTN[variant] || BTN.secondary }}>
      {emoji ? <span className="dpv-btn-emoji">{String(emoji).trim()}</span> : null}
      <span>{label || "Button"}</span>
    </span>
  );
}

function ButtonRows({ buttons }) {
  if (!buttons.length) return null;
  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) rows.push(buttons.slice(i, i + 5));
  return (
    <div className="dpv-rows">
      {rows.map((row, ri) => (
        <div className="dpv-row" key={ri}>{row.map((b, bi) => <Button key={bi} {...b} />)}</div>
      ))}
    </div>
  );
}

function Message({ title, description, buttons }) {
  return (
    <div className="dpv-msg">
      <div className="dpv-ava">z</div>
      <div className="dpv-main">
        <div className="dpv-head"><span className="dpv-name">Zee Hood</span><span className="dpv-app">APP</span><span className="dpv-time">Today</span></div>
        {(title || description) && (
          <div className="dpv-embed">
            {title ? <div className="dpv-embed-title">{title}</div> : null}
            {description ? <div className="dpv-embed-desc">{description}</div> : null}
          </div>
        )}
        <ButtonRows buttons={buttons} />
      </div>
    </div>
  );
}

export default function PanelPreview({ mode, config }) {
  const c = config || {};

  if (mode === "buttonroles") {
    const buttons = (c.buttons || [])
      .filter((b) => b && (b.label || b.emoji))
      .slice(0, 25)
      .map((b) => ({ label: b.label, emoji: b.emoji, variant: STYLE[String(b.style || "gray").toLowerCase()] || "secondary" }));
    return <Message title={c.title || "Roles"} description={c.description || "Click a button below to toggle a role."} buttons={buttons} />;
  }

  if (mode === "tickets") {
    const panels = (c.panels || []).filter((p) => p && (p.name != null && p.name !== ""));
    const allBtns = (c.buttons || []).filter((b) => b && (b.label || b.emoji));
    const single = panels.length === 1;
    const msgs = panels.map((p, pi) => {
      const btns = allBtns
        .filter((b) => single || String(b.panel || "") === String(p.name || ""))
        .map((b) => ({ label: b.label, emoji: b.emoji, variant: "primary" })); // tickets are always blurple
      const title = p.name ? p.name.charAt(0).toUpperCase() + p.name.slice(1) : "Support";
      return <Message key={pi} title={title} description="Click a button below to open a ticket." buttons={btns} />;
    });
    if (!msgs.length) return <div className="dpv-empty">Add a panel (with a name) and some buttons to preview it.</div>;
    return <div className="dpv-stack">{msgs}</div>;
  }

  return null;
}
