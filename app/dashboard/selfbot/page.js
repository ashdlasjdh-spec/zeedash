import { getSession } from "@/lib/session";
import { isSuperOwner } from "@/lib/permissions";
import SelfbotClient from "./SelfbotClient";

// /selfbot (rewritten to /dashboard/selfbot) — renders inside the dashboard
// layout (Topbar + Sidebar), gated to super owners.
export const dynamic = "force-dynamic";
export const metadata = { title: "Self-bot control" };

export default async function SelfbotPage() {
  const session = await getSession();
  if (!session || !isSuperOwner(session.id)) {
    return (
      <div className="card" style={{ maxWidth: 520, margin: "8vh auto" }}>
        <h1 style={{ marginTop: 0 }}>Self-bot</h1>
        <p style={{ color: "var(--danger)" }}>Access denied — super owners only.</p>
      </div>
    );
  }
  return <SelfbotClient me={session.id} />;
}
