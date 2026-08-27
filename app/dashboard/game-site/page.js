import { getSession } from "@/lib/session";
import { isSuperOwner } from "@/lib/permissions";
import GameSiteClient from "./GameSiteClient";

// Editor for the public game site (zeehood.org) content — game link, Discord link, place ID, game
// passes, staff roles and powers. Super-owner only; the game site reads the saved config live.
export const dynamic = "force-dynamic";
export const metadata = { title: "Game site · zhd.lol" };

export default async function GameSitePage() {
  const session = await getSession();
  if (!session || !isSuperOwner(session.id)) {
    return (
      <div className="card" style={{ maxWidth: 520, margin: "8vh auto" }}>
        <h1 style={{ marginTop: 0 }}>Game site</h1>
        <p style={{ color: "var(--danger)" }}>Access denied — super owners only.</p>
      </div>
    );
  }
  return <GameSiteClient />;
}
