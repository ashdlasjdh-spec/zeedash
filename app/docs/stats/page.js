import Link from "next/link";
import { Figure, Callout, SpecTable, Pager, Icon } from "../_components";
import { VFlow } from "../_diagrams2";

export const metadata = { title: "Stats pipeline · zhd.lol docs" };

export default function StatsDocs() {
  return (
    <>
      <span className="docs-kicker"><Icon name="chart" size={13} /> &nbsp;Deep dive</span>
      <h1>Stats pipeline</h1>
      <p className="docs-lede">
        The numbers on the <Link className="inl" href="/">front page</Link> and the Analytics page come
        from the same place: the bot reports activity every minute, the dashboard rolls it into daily
        per-server totals, and both the public stats and the staff analytics read from there.
      </p>

      <h2>How activity is collected</h2>
      <p>
        The bot counts messages, reactions and voice minutes as they happen and posts the <strong>deltas</strong>
        (not running totals) to the dashboard once a minute. Sending deltas means a bot restart never
        double-counts — each minute&apos;s numbers are simply added onto today&apos;s row.
      </p>
      <Figure url="zhd.lol — stats pipeline" caption={<><b>Minute-by-minute.</b> Per-guild, per-channel and per-member deltas all land in one ingest.</>}>
        <VFlow steps={[
          { t: "Bot counts activity", s: "messages · reactions · voice" },
          { t: "Posts deltas every minute", s: "POST /api/server-stats/ingest", note: "bot secret" },
          { t: "Added onto today’s rows", s: "server / channel / member stats" },
          { t: "Rolled up by day", s: "member counts + guild info too" },
          { t: "Read back", s: "public stats + staff analytics" },
        ]} />
      </Figure>

      <h2>What&apos;s stored</h2>
      <SpecTable
        head={["Table", "Grain", "Holds"]}
        rows={[
          [<>server_stats</>, "per guild, per day", "messages, reactions, voice minutes, member count, guild name + icon"],
          [<>channel_stats</>, "per channel, per day", "message counts (drives the top-channels list)"],
          [<>member_stats</>, "per member, per day", "activity used for member leaderboards"],
        ]}
      />

      <h2>Where the numbers show up</h2>
      <p>Two audiences read the same data, at different scopes:</p>
      <SpecTable
        head={["Surface", "Who sees it", "Scope"]}
        rows={[
          [<><Link className="inl" href="/">Public front page</Link></>, "Everyone", "Aggregate — servers, members, messages, live players"],
          [<>Analytics page</>, "A guild’s Discord admins", "One server — trends, top channels, member leaderboard"],
        ]}
      />

      <Callout kind="good">
        Because it&apos;s all rolled up by day, the public front page can be hit as much as you like without
        touching the raw data — it reads a small, cached summary, not every message.
      </Callout>

      <Callout kind="warn">
        A server that had no activity in the last couple of days quietly drops off the public list, and a
        server the bot is removed from stops reporting — so the front page always reflects where the bot is
        actually active right now.
      </Callout>

      <Pager prev={{ href: "/docs/tickets", title: "Tickets" }} next={{ href: "/docs/architecture", title: "How it works" }} />
    </>
  );
}
