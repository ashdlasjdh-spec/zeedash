import { serverSectionUser } from "@/lib/guards";
import PageHeader from "../../../components/PageHeader";
import Onboarding from "../../../components/Onboarding";

export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await serverSectionUser();
  if (!u) return null;
  return (
    <div className="fullbleed">
      <PageHeader icon="rocket" title="Get Started" subtitle="A guided checklist to set up the bot for your server. Steps tick off automatically as you configure them." />
      <Onboarding />
    </div>
  );
}
