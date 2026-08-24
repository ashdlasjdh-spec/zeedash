import Link from "next/link";
import { Figure, Callout, SpecTable, Pager, Icon } from "../_components";
import { VFlow } from "../_diagrams2";

export const metadata = { title: "Tickets · zhd.lol docs" };

export default function TicketsDocs() {
  return (
    <>
      <span className="docs-kicker"><Icon name="ticket" size={13} /> &nbsp;Deep dive</span>
      <h1>Tickets</h1>
      <p className="docs-lede">
        Tickets give members a private channel to reach staff. When a ticket closes, the whole
        conversation is saved as a self-contained transcript with its own link — messages, embeds and
        attachments, exactly as they happened.
      </p>

      <h2>The lifecycle</h2>
      <p>
        A member opens a ticket, the bot spins up a private channel only they and staff can see, the
        conversation happens, and on close the bot generates a transcript and posts the link. The channel
        is then cleaned up — but the record lives on at the transcript link.
      </p>
      <Figure url="zhd.lol — ticket lifecycle" caption={<><b>Open to archive.</b> The transcript is generated at close, so nothing is lost when the channel goes away.</>}>
        <VFlow steps={[
          { t: "Member opens a ticket", s: "button or command" },
          { t: "Private channel created", s: "member + staff only" },
          { t: "Conversation happens", s: "staff assist the member" },
          { t: "Staff close the ticket", s: "transcript generated", note: "captures embeds + files" },
          { t: "Transcript link posted", s: "opens on the transcript site" },
        ]} />
      </Figure>

      <h2>The transcript</h2>
      <p>
        Transcripts are rendered by a dedicated site (<code>zee-hood-transcript</code>). Each one is a
        full, formatted copy of the ticket — it opens only through its generated link, so there&apos;s
        nothing public to browse. Embeds keep their accent color and attachments are preserved inline.
      </p>
      <Figure url="Discord — closed ticket" caption={<><b>What staff get on close.</b> A tidy summary embed with a link to the full transcript.</>}>
        <div className="mock">
          <div className="embed-mock">
            <div className="em-author">Zee Hood · Tickets</div>
            <div className="em-title">Ticket closed</div>
            <div className="em-desc">Support ticket <b>#0421</b> has been closed and archived.</div>
            <div className="em-fields">
              <div><div className="em-fname">Opened by</div><div className="em-fval">@member</div></div>
              <div><div className="em-fname">Closed by</div><div className="em-fval">@staff</div></div>
              <div><div className="em-fname">Transcript</div><div className="em-fval">View →</div></div>
            </div>
            <div className="em-foot">Mod Log</div>
          </div>
        </div>
      </Figure>

      <h2>What you can configure</h2>
      <SpecTable
        head={["Setting", "What it controls"]}
        rows={[
          [<>Panels</>, "One or more — each posts to its own channel with its own title, text and default category."],
          [<>Buttons</>, "Add as many ticket types as you want and assign each to a panel. Every button opens tickets in its own category (or the panel's), with its own emoji, opening message and support roles."],
          [<>Staff access</>, "Global support roles plus per-button roles — added to the channel and pinged when a ticket opens."],
          [<>Claim</>, "Staff press Claim so everyone knows a ticket is being handled."],
          [<>Ratings</>, "On close, the opener is DM'd a 1–5 star prompt; scores feed the ,csat staff leaderboard."],
          [<>Messages</>, "Custom opening + close messages ({user} = the opener/closer)."],
          [<>Transcripts</>, "Generated automatically on close and linked in your chosen transcript (or Logs) channel."],
        ]}
      />
      <Callout kind="info">
        Configure everything under <b>Server Management → Tickets</b>, then hit <b>Publish ticket panels</b>
        (or run <code>,ticketpanel</code>) to post them. Members can open one ticket per type at a time.
      </Callout>

      <Callout kind="info">
        Tickets appear at the bottom of the <Link className="inl" href="/docs/server">Server</Link> sidebar.
        Transcript links are unguessable and only shared with the people involved.
      </Callout>

      <Pager prev={{ href: "/docs/levels", title: "Levels & XP" }} next={{ href: "/docs/stats", title: "Stats pipeline" }} />
    </>
  );
}
