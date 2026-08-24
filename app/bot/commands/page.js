import staticData from "./commands.json";
import CommandsBrowser from "./CommandsBrowser";
import { query } from "@/lib/db";

// Revalidate every few minutes: the bot pushes its live registry to config.bot_commands on startup, so
// the page reflects the real command list without a manual regenerate. Falls back to the bundled JSON.
export const revalidate = 300;

export const metadata = {
  title: "Commands · Zee Hood",
  description: "Browse all Zee Hood bot commands — moderation, Roblox group, economy, fun and more.",
};

async function getData() {
  try {
    const rows = await query("select value from config where key = 'bot_commands'");
    if (rows[0]?.value) {
      const live = JSON.parse(rows[0].value);
      if (live && Array.isArray(live.categories) && live.categories.length) return live;
    }
  } catch { /* DB unavailable — use the bundled snapshot */ }
  return staticData;
}

export default async function Page() {
  const data = await getData();
  return <CommandsBrowser data={data} />;
}
