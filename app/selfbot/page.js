import { getSession } from "@/lib/session";
import { isSuperOwner } from "@/lib/permissions";
import SelfbotClient from "./SelfbotClient";

// zhd.lol/selfbot — self-bot control panel. Super owners only; everyone else is
// shown an access-denied notice. The actual controls live in the client
// component, which talks to /api/selfbot (which proxies to the bot service).
export const dynamic = "force-dynamic";
export const metadata = { title: "Self-bot control" };

const wrap = {
  maxWidth: 720,
  margin: "12vh auto",
  padding: 24,
  fontFamily: "system-ui, Segoe UI, Roboto, sans-serif",
  color: "#e6e9ef",
};

export default async function SelfbotPage() {
  const session = await getSession();
  if (!session) {
    return (
      <main style={wrap}>
        <h1>Self-bot</h1>
        <p style={{ color: "#8b93a7" }}>Please log in to continue.</p>
        <p>
          <a style={{ color: "#5b8cff" }} href="/login">
            Log in with Discord
          </a>
        </p>
      </main>
    );
  }
  if (!isSuperOwner(session.id)) {
    return (
      <main style={wrap}>
        <h1>Self-bot</h1>
        <p style={{ color: "#f85149" }}>Access denied — super owners only.</p>
      </main>
    );
  }
  return <SelfbotClient me={session.id} />;
}
