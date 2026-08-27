// PWA manifest — lets staff install zhd.lol to a home screen with the ZHD mark and dark theme.
export default function manifest() {
  return {
    name: "zhd.lol — Zee Hood",
    short_name: "zhd.lol",
    description: "Zee Hood staff control panel.",
    start_url: "/",
    display: "standalone",
    background_color: "#060607",
    theme_color: "#060607",
    icons: [
      { src: "/zhd-mark.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/zhd-mark.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  };
}
