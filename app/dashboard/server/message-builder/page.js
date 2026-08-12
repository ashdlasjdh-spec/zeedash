import { getSession } from "@/lib/session";
import { canAccessServerSection } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import MessageBuilder from "../../../components/MessageBuilder";

export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canAccessServerSection(u)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="list" title="Message Builder" subtitle="Compose an embed on the web, then run /sendembed in your server to post it." />
      <MessageBuilder />
    </div>
  );
}
