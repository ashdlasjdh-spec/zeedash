import Link from "next/link";
import { Figure, Callout, Steps, SpecTable, Pager, Icon } from "../_components";
import { VFlow, EmojiAnatomy } from "../_diagrams2";

export const metadata = { title: "Emojis · zhd.lol docs" };

export default function EmojisDocs() {
  return (
    <>
      <span className="docs-kicker"><Icon name="smile" size={13} /> &nbsp;Deep dive</span>
      <h1>Player emojis</h1>
      <p className="docs-lede">
        Emojis are little badges pinned next to a player&apos;s name in-game. You assign one or more emoji
        to a Roblox player from the panel, and they show up beside their name until you change them.
      </p>

      <h2>What it looks like</h2>
      <Figure url="in-game — name row" caption={<><b>Emojis beside the name.</b> Assign any set of unicode emoji to a player.</>}>
        <EmojiAnatomy />
      </Figure>

      <h2>Set, add, or remove</h2>
      <p>The Emojis page supports three actions so you can build a player&apos;s emoji set up or tear it down:</p>
      <SpecTable
        head={["Action", "What it does"]}
        rows={[
          [<>Set</>, "Replaces the player’s emojis with exactly what you typed."],
          [<>Add</>, "Appends the emojis you typed to whatever the player already has."],
          [<>Remove / clear</>, "Wipes the player’s emojis entirely."],
        ]}
      />

      <h2>How it reaches the game</h2>
      <p>
        It&apos;s a short hop: the panel resolves the username to a Roblox ID, writes the emoji string to
        the perks database keyed to that player, and the game reads it to render the badges by their name.
      </p>
      <Figure url="zhd.lol — emoji flow" caption={<><b>From input to in-game badge.</b> The same perks database the game already reads for grants.</>}>
        <VFlow steps={[
          { t: "Enter username + emojis", s: "e.g. Builderman · ⭐💖🔥" },
          { t: "Pick an action", s: "set · add · remove", note: "co-founders+" },
          { t: "POST /api/emoji", s: "username resolved to Roblox ID" },
          { t: "Stored per player", s: "perks database" },
          { t: "Game renders the emojis", s: "beside the player’s name" },
        ]} />
      </Figure>

      <h2>Assigning emojis, step by step</h2>
      <Figure url="zhd.lol/dashboard/emojis" caption={<><b>The Emojis page.</b> Type a username, paste emoji, choose set / add / remove. The list shows who currently has what.</>}>
        <div className="mock">
          <div className="m-card">
            <div className="m-row" style={{ marginBottom: 14 }}>
              <div style={{ flex: 1 }}><label>Roblox username</label><div className="m-input">Builderman</div></div>
              <div style={{ flex: 1 }}><label>Emojis (paste any)</label><div className="m-input">⭐💖🔥</div></div>
            </div>
            <div className="m-row" style={{ marginBottom: 18 }}>
              <button className="m-btn">Set</button>
              <button className="m-btn ghost">Add</button>
              <button className="m-btn ghost">Clear</button>
            </div>
            <table>
              <thead><tr><th>Player</th><th>Emojis</th><th /></tr></thead>
              <tbody>
                <tr><td className="mono">156 (Builderman)</td><td style={{ fontSize: 16 }}>⭐💖🔥</td><td><button className="m-btn danger" style={{ padding: "5px 10px", fontSize: 11 }}>Clear</button></td></tr>
                <tr><td className="mono">261 (shedletsky)</td><td style={{ fontSize: 16 }}>👑</td><td><button className="m-btn danger" style={{ padding: "5px 10px", fontSize: 11 }}>Clear</button></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </Figure>
      <Steps items={[
        { title: "Enter the player", body: "Type the Roblox username. The panel resolves it to a Roblox ID." },
        { title: "Paste the emojis", body: "Drop in any unicode emoji — one or several." },
        { title: "Choose the action", body: "Set to replace, Add to append, or Clear to remove all of them." },
        { title: "Done", body: "The change is stored and shows in-game. The list below tracks every player who has emojis." },
      ]} />

      <Callout kind="warn">
        Like crew tags, emojis are gated at <strong>co-founders (254)</strong>. Preview how emoji look on
        the public <Link className="inl" href="/preview">preview</Link> page before assigning them.
      </Callout>

      <Pager prev={{ href: "/docs/crew-tags", title: "Crew tags" }} next={{ href: "/docs/levels", title: "Levels & XP" }} />
    </>
  );
}
