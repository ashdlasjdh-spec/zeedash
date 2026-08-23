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
        subtitle="Super-owner only. Grant a Discord role site capabilities for the community servers — members with that role get the access automatically."
      />
      <RoleAccess />
    </>
  );
}
