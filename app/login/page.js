import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff Login · zhd.lol" };

export default async function Login({ searchParams }) {
  const sp = await searchParams; // searchParams is a Promise in Next 15+
  if (await getSession()) redirect("/dashboard");
  const errors = {
    denied: "You're not whitelisted, and no role or grant gave you access.",
    state: "Login expired — try again.",
    oauth: "Discord sign-in failed — try again.",
    busy: "Too many attempts — wait a moment and try again.",
  };
  const msg = errors[sp?.error];

  // Self-diagnosis: the callback drops a short-lived cookie describing what it detected for a denied
  // user, so they (and an owner) can see the exact ID + which community servers they're in.
  let diag = null;
  if (sp?.error === "denied") {
    try { diag = JSON.parse((await cookies()).get("deny_info")?.value || "null"); } catch { diag = null; }
  }
  return (
    <div className="login-wrap">
      <div className="login-card">
        <img className="brand-logo" src="/zhd-mark.png" alt="ZHD" width={110} height={110} />
        <div className="brand">zhd<span>.lol</span></div>
        <div className="login-sub">Zee Hood staff control panel</div>
        <a className="btn" href="/api/auth/login">Continue with Discord</a>
        {msg && <div className="err">{msg}</div>}
        {diag && (
          <div className="deny-diag">
            <div className="deny-row"><span className="deny-k">Your Discord ID</span><span className="deny-v mono">{diag.id}</span></div>
            {diag.name && <div className="deny-row"><span className="deny-k">Signed in as</span><span className="deny-v">{diag.name}</span></div>}
            <div className="deny-row">
              <span className="deny-k">Community servers detected</span>
              <span className="deny-v">{Array.isArray(diag.guilds) && diag.guilds.length ? diag.guilds.map((g) => g.name).join(", ") : "none — you're not in a managed server"}</span>
            </div>
            <p className="deny-note">Give an owner your Discord ID above. They can grant you access by role or directly by your ID in Role Access.</p>
          </div>
        )}
        <div className="muted" style={{ marginTop: 18, fontSize: 12.5, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          <Link className="muted" href="/">← Home</Link>·
          <Link className="muted" href="/docs">Docs</Link>·
          <Link className="muted" href="/catalog">Perk catalog</Link>·
          <Link className="muted" href="/status">Status</Link>
        </div>
      </div>
    </div>
  );
}
