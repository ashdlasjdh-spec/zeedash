import { serverSectionUser } from "@/lib/guards";
import PageHeader from "../../../components/PageHeader";
import EmbedsManager from "../../../components/EmbedsManager";

export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await serverSectionUser();
  if (!u) return null;
  return (
    <div className="fullbleed">
      <PageHeader icon="list" title="Embeds" subtitle="Build embeds, post them to a channel, and edit the live Discord message in place later." />
      <EmbedsManager />
    </div>
  );
}
