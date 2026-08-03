import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { CATALOG } from "@/lib/catalog";
import { redirect } from "next/navigation";
import GrantForm from "../../components/GrantForm";

export default async function Page() {
  const user = await getSession();
  if (!user) return null;
  if (!can(user.role, "car")) redirect("/dashboard");
  return (
    <>
      <h1 className="page-h">Cars</h1>
      <p className="page-sub">Give a car to a player. Applies on their next spawn (SVJCarManager).</p>
      <GrantForm category="car" items={CATALOG.car} />
    </>
  );
}
