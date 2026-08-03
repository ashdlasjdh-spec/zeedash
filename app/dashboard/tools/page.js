import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { CATALOG } from "@/lib/catalog";
import { redirect } from "next/navigation";
import GrantForm from "../../components/GrantForm";

export default async function Page() {
  const user = await getSession();
  if (!user) return null;
  if (!can(user.role, "tool")) redirect("/dashboard");
  return (
    <>
      <h1 className="page-h">Tools</h1>
      <p className="page-sub">Hand a player a tool like the Katana.</p>
      <GrantForm category="tool" items={CATALOG.tool} />
    </>
  );
}
