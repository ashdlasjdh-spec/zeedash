import "./globals.css";
export const metadata = { title: "ZHD Dashboard", description: "Zee [MACRO!] control panel" };
export default function RootLayout({ children }) {
  return (<html lang="en"><body>{children}</body></html>);
}
