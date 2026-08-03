import "./globals.css";
export const metadata = { title: "ZHD Dashboard", description: "Zee [MACRO!] control panel" };
// Everything here is auth-gated and reads live session/DB data — nothing should
// be statically generated. This also stops Next from executing page code (DB /
// Roblox calls) during the build's "Collecting page data" step.
export const dynamic = "force-dynamic";
export default function RootLayout({ children }) {
  return (<html lang="en"><body>{children}</body></html>);
}
