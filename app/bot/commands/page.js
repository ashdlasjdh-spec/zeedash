import data from "./commands.json";
import CommandsBrowser from "./CommandsBrowser";

export const metadata = {
  title: "Commands · Zee Hood",
  description: `Browse all ${data.total} Zee Hood bot commands — moderation, Roblox group, economy, fun and more.`,
};

export default function Page() {
  return <CommandsBrowser data={data} />;
}
