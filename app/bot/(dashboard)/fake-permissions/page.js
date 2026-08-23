import { serverSectionUser } from "@/lib/guards";
import PageHeader from "../../../components/PageHeader";
import FakePermissions from "../../../components/FakePermissions";

export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await serverSectionUser();
  if (!u) return null;
  return (
    <div className="fullbleed">
      <PageHeader icon="shield" title="Fake Permissions" subtitle="Delegate what roles can manage — a Discord-permission bucket, or exact dashboard features (Manage or View-only, optionally per channel). No real Discord admin needed. Off until enabled." />
      <FakePermissions />
    </div>
  );
}
