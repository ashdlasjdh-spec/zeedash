import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import EmojiForm from "../../components/EmojiForm";
export default async function Page() {
  const u = await getSession();
  if (!can(u.role, "emoji")) redirect("/dashboard");
  return (<><h1 className="page-h">Emojis</h1><p className="page-sub">Give a player custom chat/name emojis. Updates live in-game.</p><EmojiForm/></>);
}
