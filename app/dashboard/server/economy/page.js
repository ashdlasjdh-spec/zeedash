import { getSession } from "@/lib/session";
import { canAccessServerSection } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import FeatureSettings from "../../../components/FeatureSettings";

export const dynamic = "force-dynamic";

const FIELDS = [
  { key: "currency", label: "Currency symbol / name", placeholder: "🪙", hint: "Shown next to every amount. Emoji or a short word." },
  { key: "dailyMin", label: "Daily reward — minimum", placeholder: "200", numeric: true },
  { key: "dailyMax", label: "Daily reward — maximum", placeholder: "500", numeric: true },
  { key: "workMin", label: "Work reward — minimum", placeholder: "80", numeric: true },
  { key: "workMax", label: "Work reward — maximum", placeholder: "220", numeric: true },
  { key: "gambleChance", label: "Gamble win chance (%)", placeholder: "48", numeric: true, hint: "Chance a gamble doubles the stake. Keep it under 50 so the economy doesn't inflate." },
];

export default async function Page() {
  const u = await getSession();
  if (!u) return null;
  if (!canAccessServerSection(u)) redirect("/dashboard");
  return (
    <div className="fullbleed">
      <PageHeader icon="coin" title="Economy" subtitle="A server currency game: daily, work, gamble, pay, deposit and a richest-members leaderboard." />
      <FeatureSettings
        feature="economy"
        title="Economy"
        description="Members earn coins with daily/work/beg, gamble and pay each other, and bank their balance. Turn it on, then tune the currency name and reward amounts — leave a field blank to use the default."
        fields={FIELDS}
      />
    </div>
  );
}
