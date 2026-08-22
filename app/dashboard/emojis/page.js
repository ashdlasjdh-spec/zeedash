import { getSession } from "@/lib/session";
import { can, canCat } from "@/lib/permissions";
import { redirect } from "next/navigation";
import EmojiForm from "../../components/EmojiForm";
import PageHeader from "../../components/PageHeader";
export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canCat(u, "emoji")) redirect("/dashboard");
  return (<><PageHeader icon="smile" title="Emojis" subtitle="Give a player custom chat/name emojis. Updates live in-game." /><EmojiForm/></>);
}
