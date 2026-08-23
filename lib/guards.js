import { getSession } from "./session";
import { canAccessServerSection } from "./permissions";
import { redirect } from "next/navigation";

// Standard Server-Management page guard, shared by every custom feature page. Returns the session
// user (callers still do `if (!u) return null;` to render nothing when signed out), and redirects
// away when the user can't access the Server portal at all.
export async function serverSectionUser() {
  const u = await getSession();
  if (u && !canAccessServerSection(u)) redirect("/dashboard");
  return u;
}
