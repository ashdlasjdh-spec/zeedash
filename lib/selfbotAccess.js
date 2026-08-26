import { query } from "@/lib/db";
import { isSuperOwner } from "@/lib/permissions";

// Who may VIEW the self-bot dashboard: super owners always, plus any Discord id
// the super owner has added to the dashboardViewers list (stored in the same
// selfbot_kv config the bot reads). Managing that list stays super-owner-only.
async function selfbotConfig() {
  try {
    const rows = await query("select value from selfbot_kv where key='config'");
    return (rows[0] && rows[0].value) || {};
  } catch {
    return {};
  }
}

export async function getSelfbotViewers() {
  const cfg = await selfbotConfig();
  return Array.isArray(cfg.dashboardViewers) ? cfg.dashboardViewers.map(String) : [];
}

export async function canViewSelfbot(id) {
  if (!id) return false;
  if (isSuperOwner(id)) return true;
  const viewers = await getSelfbotViewers();
  return viewers.includes(String(id));
}
