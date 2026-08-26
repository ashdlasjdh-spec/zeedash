import { getSession } from "@/lib/session";
import { isSuperOwner } from "@/lib/permissions";
import { canViewSelfbot } from "@/lib/selfbotAccess";
import SelfbotClient from "./SelfbotClient";

// /selfbot (rewritten to /dashboard/selfbot) — renders inside the dashboard
// layout (Topbar + Sidebar). Gated to super owners plus any Discord id the
// super owner has whitelisted for viewing (managed on the Access tab).
export const dynamic = "force-dynamic";
export const metadata = { title: "Self-bot control" };

export default async function SelfbotPage() {
  const session = await getSession();
  if (!session || !(await canViewSelfbot(session.id))) {
    return (
      <div className="card" style={{ maxWidth: 520, margin: "8vh auto" }}>
        <h1 style={{ marginTop: 0 }}>Self-bot</h1>
        <p style={{ color: "var(--danger)" }}>Access denied — you're not whitelisted for this page.</p>
      </div>
    );
  }
  return <SelfbotClient me={session.id} isOwner={isSuperOwner(session.id)} />;
}
