import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Login({ searchParams }) {
  if (await getSession()) redirect("/dashboard");
  const errors = {
    denied: "You're not whitelisted. Ask an owner to add you.",
    state: "Login expired — try again.",
    oauth: "Discord sign-in failed — try again.",
  };
  const msg = errors[searchParams?.error];
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand">zhd<span>.lol</span></div>
        <div className="login-sub">Zee [MACRO!] staff control panel</div>
        <a className="btn" href="/api/auth/login">Continue with Discord</a>
        {msg && <div className="err">{msg}</div>}
      </div>
    </div>
  );
}
