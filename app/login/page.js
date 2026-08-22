import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff Login · zhd.lol" };

export default async function Login({ searchParams }) {
  if (await getSession()) redirect("/dashboard");
  const errors = {
    denied: "You're not whitelisted. Ask an owner to add you.",
    state: "Login expired — try again.",
    oauth: "Discord sign-in failed — try again.",
    busy: "Too many attempts — wait a moment and try again.",
  };
  const msg = errors[searchParams?.error];
  return (
    <div className="login-wrap">
      <div className="login-card">
        <img className="brand-logo" src="/zhd-logo.png" alt="ZHD" width={110} height={110} />
        <div className="brand">zhd<span>.lol</span></div>
        <div className="login-sub">Zee [MACRO!] staff control panel</div>
        <a className="btn" href="/api/auth/login">Continue with Discord</a>
        {msg && <div className="err">{msg}</div>}
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
