import "./globals.css";
import { Inter } from "next/font/google";
// Loads Inter (the first choice in --sans) so it actually resolves instead of falling back to
// system-ui. `variable` exposes it as --font-inter; the className is applied to <html> below.
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
export const metadata = {
  metadataBase: new URL("https://zhd.lol"),
  title: { default: "zhd.lol — Zee Hood", template: "%s · zhd.lol" },
  description: "The Zee Hood staff control panel — game grants, moderation, Roblox group management and Discord server tools.",
  openGraph: { title: "zhd.lol — Zee Hood", description: "The Zee Hood staff control panel.", url: "https://zhd.lol", siteName: "zhd.lol", type: "website", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "zhd.lol — Zee Hood control panel" }] },
  twitter: { card: "summary_large_image", title: "zhd.lol — Zee Hood", description: "The Zee Hood staff control panel.", images: ["/opengraph-image"] },
};
// Explicit mobile viewport (device-width + safe-area for notched phones).
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#060607" };
// Everything here is auth-gated and reads live session/DB data — nothing should
// be statically generated. This also stops Next from executing page code (DB /
// Roblox calls) during the build's "Collecting page data" step.
export const dynamic = "force-dynamic";
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Apply the saved theme/density BEFORE first paint so there's no flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{var t=localStorage.getItem('zhd-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;var d=localStorage.getItem('zhd-density');if(d==='compact')document.documentElement.dataset.density=d;}catch(e){}})();" }} />
        {/* Warm up the TLS connection to Discord's CDN — avatars load from here on nearly every page
            (sidebar, topbar, activity feed, leaderboards), so preconnecting shaves their first paint. */}
        <link rel="preconnect" href="https://cdn.discordapp.com" />
        <link rel="dns-prefetch" href="https://cdn.discordapp.com" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
