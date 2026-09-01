// Build the Zensical docs (docs-site/) into public/docs so the dashboard serves them at /docs.
//
// Zensical is a Python tool; Vercel's build image ships Python 3, so we create a throwaway venv,
// install Zensical, build the static site, and copy it into public/docs (git-ignored). The whole
// thing is best-effort: if Python/pip/Zensical isn't available (e.g. a Node-only local machine),
// we log and exit 0 so `next build` still succeeds — /docs just won't be present until a build
// environment with Python runs this.
import { execSync } from "node:child_process";
import { existsSync, rmSync, mkdirSync, cpSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const docsProject = join(root, "docs-site");
const isWin = process.platform === "win32";
const venv = join(docsProject, ".venv");
const binDir = join(venv, isWin ? "Scripts" : "bin");
const exe = (name) => join(binDir, isWin ? `${name}.exe` : name);

function run(cmd, cwd = root) {
  execSync(cmd, { stdio: "inherit", cwd });
}

try {
  if (!existsSync(join(docsProject, "zensical.toml"))) {
    console.warn("[build-docs] no docs-site/zensical.toml — skipping docs build.");
    process.exit(0);
  }

  const python = isWin ? "python" : "python3";
  console.log("[build-docs] creating venv + installing zensical…");
  run(`${python} -m venv .venv`, docsProject);
  run(`"${exe("pip")}" install --disable-pip-version-check -q zensical`, docsProject);

  console.log("[build-docs] building the Zensical site…");
  run(`"${exe("zensical")}" build --clean`, docsProject);

  const site = join(docsProject, "site");
  if (!existsSync(site)) throw new Error("zensical build produced no site/ directory");

  const out = join(root, "public", "docs");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(site, out, { recursive: true });
  console.log("[build-docs] docs built into public/docs ✓");
} catch (err) {
  console.warn(
    `[build-docs] SKIPPED — could not build the Zensical docs (${err.message}). ` +
      "The dashboard will still deploy; /docs stays unavailable until a build with Python runs.",
  );
  // Non-fatal on purpose: never let a docs hiccup break the whole dashboard build.
  process.exit(0);
}
