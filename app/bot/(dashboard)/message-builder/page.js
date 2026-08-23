import { serverSectionUser } from "@/lib/guards";
import PageHeader from "../../../components/PageHeader";
import MessageBuilder from "../../../components/MessageBuilder";

export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await serverSectionUser();
  if (!u) return null;
  return (
    <div className="fullbleed">
      <PageHeader icon="list" title="Message Builder" subtitle="Compose an embed on the web and post it straight to a channel — instantly." />
      <MessageBuilder />
    </div>
  );
}
