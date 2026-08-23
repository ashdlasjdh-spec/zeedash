import Link from "next/link";
import { Figure, Callout, SpecTable, Pager, Icon } from "../_components";
import { VFlow } from "../_diagrams2";

export const metadata = { title: "Levels & XP · zhd.lol docs" };

export default function LevelsDocs() {
  return (
    <>
      <span className="docs-kicker"><Icon name="activity" size={13} /> &nbsp;Deep dive</span>
      <h1>Levels &amp; XP</h1>
      <p className="docs-lede">
        The Levels feature rewards members for chatting. Every message earns a little XP (rate-limited so
        spam doesn&apos;t pay), XP rolls up into levels, and levels can trigger announcements and role
        rewards. A public leaderboard ranks everyone.
      </p>

      <h2>How XP is earned</h2>
      <p>
        The bot grants a small, random amount of XP per message, but only <strong>once per minute</strong>
        per member — so hammering chat doesn&apos;t farm levels. XP accumulates server-side; when a member
        crosses a level threshold, the bot fires the level-up flow.
      </p>
      <Figure url="zhd.lol — XP flow" caption={<><b>Message to level-up.</b> The 60-second cooldown is what keeps XP fair.</>}>
        <VFlow steps={[
          { t: "Member sends a message", s: "Levels enabled in this server" },
          { t: "Cooldown check", s: "once per minute per member", note: "anti-spam" },
          { t: "Award random XP", s: "min–max per message" },
          { t: "XP saved", s: "member_levels table" },
          { t: "Level-up?", s: "announce + role rewards" },
        ]} />
      </Figure>

      <h2>What you can configure</h2>
      <SpecTable
        head={["Setting", "What it controls"]}
        rows={[
          [<>Enabled</>, "Master switch for the whole feature in this server."],
          [<>XP range</>, "The min–max XP granted per eligible message."],
          [<>Level-up message</>, <>Custom announcement text, e.g. <code>🎉 {"{user.mention}"} reached level {"{level.new_rank}"}!</code></>],
          [<>Role rewards</>, "Roles automatically granted when a member hits a level."],
          [<>Leaderboard</>, "The public XP ranking, shown on the Leaderboard page."],
        ]}
      />

      <Figure url="zhd.lol/bot/levels" caption={<><b>Levels settings.</b> Toggle it on, set the XP range and message, and map levels to role rewards.</>}>
        <div className="mock">
          <div className="m-card">
            <div className="m-head"><div><div className="m-title">Levels</div><div className="m-sub">Reward activity with XP</div></div><span className="m-toggle"><i /></span></div>
            <div className="m-row" style={{ marginBottom: 14 }}>
              <div style={{ flex: 1 }}><label>Min XP / msg</label><div className="m-input">15</div></div>
              <div style={{ flex: 1 }}><label>Max XP / msg</label><div className="m-input">25</div></div>
            </div>
            <label>Level-up message</label>
            <div className="m-input" style={{ marginBottom: 14, height: "auto", padding: "10px 12px" }}>🎉 {"{user.mention}"} reached level {"{level.new_rank}"}!</div>
            <label>Role rewards</label>
            <div className="m-row"><span className="pill brand">Lvl 5 → Regular</span><span className="pill brand">Lvl 10 → Veteran</span><button className="m-btn" style={{ marginLeft: "auto" }}>Save</button></div>
          </div>
        </div>
      </Figure>

      <Callout kind="info">
        The <strong>Leaderboard</strong> page reads the same XP table, so rankings update as members chat —
        no separate tally to maintain.
      </Callout>

      <Pager prev={{ href: "/docs/emojis", title: "Emojis" }} next={{ href: "/docs/tickets", title: "Tickets" }} />
    </>
  );
}
