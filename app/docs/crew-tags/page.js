import Link from "next/link";
import { Figure, Callout, Steps, SpecTable, Pager, Icon } from "../_components";
import { VFlow, CrewTagAnatomy, TagScope } from "../_diagrams2";

export const metadata = { title: "Crew tags · zhd.lol docs" };

export default function CrewTagsDocs() {
  return (
    <>
      <span className="docs-kicker"><Icon name="tag" size={13} /> &nbsp;Deep dive</span>
      <h1>Crew tags</h1>
      <p className="docs-lede">
        A crew tag is the custom, colored name tag that renders above a player in-game — a bit of text
        (emoji allowed), a color gradient, an optional icon, and an optional scrolling animation. Tags are
        tied to a Roblox <strong>group</strong>, and can be set for the whole group or per rank.
      </p>

      <h2>Anatomy of a tag</h2>
      <p>Every tag is made of four parts, all set on one form:</p>
      <Figure url="in-game — name tag" caption={<><b>What renders in-game.</b> Icon, text, gradient and animation are independent — use any combination.</>}>
        <CrewTagAnatomy />
      </Figure>
      <SpecTable
        head={["Part", "What it is", "Notes"]}
        rows={[
          [<>Tag text</>, "The label inside the brackets, e.g. 🍋 CREW.", "Unicode emoji are allowed."],
          [<>Colors</>, "1 to 8 colors blended into a gradient.", "One color = solid; more = gradient."],
          [<>Icon</>, "A small image shown left of the text.", "Paste a Roblox decal ID, or upload a PNG."],
          [<>Animation</>, "Scrolls the gradient across the text.", "Direction + speed, or turn it off for a static tag."],
        ]}
      />

      <h2>Group-wide vs. per-rank</h2>
      <p>
        A tag is scoped to a Roblox group. You can define one <strong>group-wide</strong> tag that every
        member gets, and then override it for specific <strong>ranks</strong>. The most specific tag wins:
        a rank tag always beats the group tag for members of that rank.
      </p>
      <Figure url="zhd.lol — tag scope" caption={<><b>Resolution order.</b> Leave the rank blank to set the whole group; fill it in to override just that rank.</>}>
        <TagScope />
      </Figure>

      <h2>How a tag reaches the game</h2>
      <p>
        Building a tag on the panel writes a group→tag mapping the game reads when a player spawns. If you
        upload an icon, it&apos;s pushed to Roblox as a decal first and the returned asset ID is stored on
        the tag.
      </p>
      <Figure url="zhd.lol — crew tag flow" caption={<><b>From form to name tag.</b> The icon upload is the only extra hop; text-only tags skip it.</>}>
        <VFlow steps={[
          { t: "Design the tag", s: "group, rank, colors, icon, animation" },
          { t: "Upload icon (optional)", s: "PNG → Roblox decal → asset ID", note: "/api/tag/upload" },
          { t: "Save", s: "POST /api/tag", note: "co-founders+" },
          { t: "Stored as a group → tag map", s: "perks database" },
          { t: "Game reads it on spawn", s: "renders [TAG] above the player" },
        ]} />
      </Figure>

      <h2>Building one, step by step</h2>
      <Figure url="zhd.lol/dashboard/tags" caption={<><b>The Tags page.</b> A live preview updates as you change colors, icon and animation.</>}>
        <div className="mock">
          <div className="m-card">
            <div className="m-head"><div className="m-title">Crew tag</div><div className="m-sub">live preview</div></div>
            <div className="m-row" style={{ marginBottom: 14 }}>
              <div style={{ flex: 1 }}><label>Group ID</label><div className="m-input mono">1099600954</div></div>
              <div style={{ width: 140 }}><label>Rank (blank = all)</label><div className="m-input mono">255</div></div>
            </div>
            <div className="m-row" style={{ marginBottom: 14 }}>
              <div style={{ flex: 1 }}><label>Tag text</label><div className="m-input">🍋 CREW</div></div>
              <div style={{ flex: 1 }}><label>Icon (asset id / upload)</label><div className="m-input mono">rbxassetid…</div></div>
            </div>
            <label>Preview</label>
            <div style={{ padding: "16px", borderRadius: 10, background: "var(--surface-3)", border: "1px solid var(--line)", textAlign: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 22, fontWeight: 850, background: "linear-gradient(90deg,#e01f1f,#ff8a3d)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>[ 🍋 CREW ]</span>
            </div>
            <div className="m-row">
              <span className="pill brand">diagonal · speed 0.5</span>
              <span className="pill brand">2 colors</span>
              <button className="m-btn" style={{ marginLeft: "auto" }}>Save</button>
            </div>
          </div>
        </div>
      </Figure>
      <Steps items={[
        { title: "Enter the group (and rank)", body: "Put the Roblox group ID in. Leave the rank blank for the whole group, or set a rank number to target just that rank." },
        { title: "Write the text and pick colors", body: "Type the tag label (emoji welcome) and add 1–8 colors. The preview blends them into a gradient live." },
        { title: "Add an icon (optional)", body: "Paste a Roblox decal ID, or upload a PNG — the panel turns it into a decal and fills in the asset ID for you." },
        { title: "Set the animation", body: "Choose a scroll direction and speed, or switch animation off for a static tag." },
        { title: "Save", body: "The tag is stored for that group/rank and applies in-game. Load any existing tag from the list to edit or delete it." },
      ]} />

      <Callout kind="warn">
        Crew tags are gated at <strong>co-founders (254)</strong>. You can preview a tag design without
        saving on the public <Link className="inl" href="/preview">preview</Link> page.
      </Callout>

      <Pager prev={{ href: "/docs/game", title: "Game control" }} next={{ href: "/docs/emojis", title: "Emojis" }} />
    </>
  );
}
