import Link from "next/link";
import "./docs.css";
import DocNav from "./DocNav";

export const metadata = {
  title: "zhd.lol · Documentation",
  description: "How the Zee [MACRO!] control panel works — game grants, moderation, and Discord server management.",
};

// Docs are public and fully static — no session, no DB. Let Next prerender them.
export const dynamic = "force-static";

export default function DocsLayout({ children }) {
  return (
    <div className="docs">
      <aside className="docs-rail">
        <Link href="/docs" className="brand docs-rail-brand" style={{ textDecoration: "none" }}>
          <img src="/zhd-logo.png" alt="" width="30" height="30" />zhd<span>.lol</span>
        </Link>
        <div className="docs-rail-tag">Documentation</div>
        <DocNav />
        <div className="docs-rail-foot">
          <a href="/">← Sign in</a>
          <a href="/catalog">Perk catalog</a>
          <a href="/status">Status</a>
        </div>
      </aside>
      <main className="docs-main">
        <div className="docs-mtop">
          <Link href="/docs" className="brand" style={{ textDecoration: "none" }}>zhd<span>.lol</span></Link>
          <DocNav variant="mobile" />
        </div>
        <article className="docs-article">{children}</article>
      </main>
    </div>
  );
}
