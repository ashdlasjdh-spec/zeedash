import { getSession } from "@/lib/session";
import { canGroup } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureList from "../../../components/FeatureList";

export const dynamic = "force-dynamic";

const COMMANDS = ["makeembed", "editembed", "buttonpanel", "sendembed", "ticketpanel", "antinuke"];
const COLS = [{ key: "command", label: "Command", type: "select", options: COMMANDS, flex: 1 }];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canGroup(u.level)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="gear" title="Disable" subtitle="Turn off specific bot commands in this server. Off until enabled." />
      <FeatureList feature="disable" title="Disabled commands" description="Anyone (except a bot owner) who runs a listed command here is refused. Applies to the bot's own commands." columns={COLS} addLabel="Disable a command" />
    </div>
  );
}
