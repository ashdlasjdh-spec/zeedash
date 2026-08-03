import { getSession } from "@/lib/session";
import { can } from "@/lib/permissions";
import { CATALOG } from "@/lib/catalog";
import { redirect } from "next/navigation";
import GrantForm from "../../components/GrantForm";

export default async function Page() {
  const user = await getSession();
  if (!can(user.level, "shazam")) redirect("/dashboard");
  return (
    <>
      <h1 className="page-h">Shazam</h1>
      <p className="page-sub">
        Grant a Shazam variant to any player. Applies live if they&apos;re in-game and
        persists across sessions (PlayerPerks + shared DB), so it survives universe swaps.
      </p>
      <GrantForm category="shazam" items={CATALOG.shazam} />
    </>
  );
}
