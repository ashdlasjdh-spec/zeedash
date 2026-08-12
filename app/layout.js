import "./globals.css";
import { Inter } from "next/font/google";
// Loads Inter (the first choice in --sans) so it actually resolves instead of falling back to
// system-ui. `variable` exposes it as --font-inter; the className is applied to <html> below.
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
export const metadata = { title: "ZHD Dashboard", description: "Zee [MACRO!] control panel" };
// Explicit mobile viewport (device-width + safe-area for notched phones).
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#060607" };
// Everything here is auth-gated and reads live session/DB data — nothing should
// be statically generated. This also stops Next from executing page code (DB /
// Roblox calls) during the build's "Collecting page data" step.
export const dynamic = "force-dynamic";
export default function RootLayout({ children }) {
  return (<html lang="en" className={inter.variable}><body className={inter.className}>{children}</body></html>);
}
