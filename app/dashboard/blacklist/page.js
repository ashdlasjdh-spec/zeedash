import { getSession } from "@/lib/session";
import { canWhitelist } from "@/lib/permissions";
import { redirect } from "next/navigation";
import BlacklistManager from "../../components/BlacklistManager";
import PageHeader from "../../components/PageHeader";

export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canWhitelist(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="ban" title="Blacklist" subtitle="Block Discord users from the dashboard entirely — they can't sign in or use any page, regardless of their roles. Co founders+." />
      <BlacklistManager />
    </div>
  );
}
