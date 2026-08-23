import { getSession } from "@/lib/session";
import { isSuperOwner } from "@/lib/permissions";
import { redirect } from "next/navigation";
import RoleAccess from "../../../components/RoleAccess";
import PageHeader from "../../../components/PageHeader";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSession();
  if (!user) return null;
  if (!isSuperOwner(user.id)) redirect("/dashboard"); // super owners only

  return (
    <>
      <PageHeader
        icon="shield"
        title="Role access"
        subtitle="Super-owner only. Delegate Roblox group management to a Discord role — pick which group actions it can run and the highest rank it may assign people to. Members with that role get the access automatically."
      />
      <RoleAccess />
    </>
  );
}
