"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS = [
  {
    label: "Start here",
    links: [
      ["/docs", "Overview"],
      ["/docs/access", "Access & roles"],
    ],
  },
  {
    label: "Using the panel",
    links: [
      ["/docs/game", "Game control"],
      ["/docs/moderation", "Moderation"],
      ["/docs/server", "Server management"],
    ],
  },
  {
    label: "Deep dives",
    links: [
      ["/docs/crew-tags", "Crew tags"],
      ["/docs/emojis", "Emojis"],
      ["/docs/levels", "Levels & XP"],
      ["/docs/tickets", "Tickets"],
      ["/docs/security", "Security features"],
      ["/docs/automation", "Automation & roles"],
      ["/docs/stats", "Stats pipeline"],
    ],
  },
  {
    label: "Under the hood",
    links: [
      ["/docs/architecture", "How it works"],
    ],
  },
];

export default function DocNav({ variant }) {
  const path = usePathname();
  const is = (href) => (href === "/docs" ? path === "/docs" : path === href || path.startsWith(href + "/"));

  if (variant === "mobile") {
    return (
      <div className="docs-mtop-links">
        {GROUPS.flatMap((g) => g.links).map(([href, label]) => (
          <Link key={href} href={href} className={is(href) ? "on" : ""}>{label}</Link>
        ))}
      </div>
    );
  }

  return (
    <>
      {GROUPS.map((g) => (
        <div className="docs-nav-group" key={g.label}>
          <h4>{g.label}</h4>
          {g.links.map(([href, label]) => (
            <Link key={href} href={href} className={is(href) ? "on" : ""}>{label}</Link>
          ))}
        </div>
      ))}
    </>
  );
}
