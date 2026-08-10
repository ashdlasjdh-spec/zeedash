import { getSession } from "@/lib/session";
import { canPurge } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PurgePanel from "../../components/PurgePanel";

export default async function Page() {
  const user = await getSession();
  if (!user) return null;
  if (!canPurge(user.id)) redirect("/dashboard"); // owner-only
  return (
    <>
      <h1 className="page-h">Remove All</h1>
      <p className="page-sub">
        Owner-only. Wipe an entire grant section from every player at once. Use with care — there is no undo.
      </p>
      <PurgePanel />
    </>
  );
}
