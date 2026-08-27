// Public "what's new" feed for zhd.lol/changelog. Pulls recent commits from each repo's public GitHub
// API, hides internal/plumbing commits, and cleans the wording into plain-English one-liners — the same
// rules the Discord changelog bot uses, so the site and Discord tell the same story. Cached with ISR.
const OWNER = "ashdlasjdh-spec";

export const REPOS = {
  "Zee-hood": "Bot",
  zeedash: "Dashboard",
  "zee-hood-game": "Game Site",
  "zee-hood-transcript": "Transcripts",
  idkutoldmetomakeit: "Perks API",
};

// Hide purely internal/technical commits so the public feed stays about features, not plumbing.
function isInternal(subject) {
  const t = subject.toLowerCase();
  if (/^(chore|ci|test|tests|build|refactor|style|docs|deps|perf-test)\b[:\s(]/.test(t)) return true;
  if (/\b(workflow|eslint|lint|registry|snapshot|regen|lockfile|package-lock|\.gitignore|ci\.yml|codeowners|coverage)\b/.test(t)) return true;
  if (/^(add|added|write|writing|more)\b.*\btests?\b/.test(t)) return true;
  if (/^(fix|fixed)\b.*\b(ci|lint|test|tests|build|typecheck)\b/.test(t)) return true;
  if (/^(bump|upgrade|update)\b.*\b(dep|deps|dependenc|version|package|node)\b/.test(t)) return true;
  if (/^(remove|delete|drop|deleted|removed)\b.*\b(workflow|test|tests|ci)\b/.test(t)) return true;
  return false;
}

// Clean one subject line into readable prose.
function friendly(subject) {
  let t = String(subject).replace(/^([a-z]+)(\([^)]*\))?:\s*/i, "");
  t = t.replace(/`([^`]*)`/g, "$1");
  t = t.replace(/\s*\(#\d+\)\s*$/, "");
  t = t.replace(/\bhttps?:\/\/\S+/g, "");
  t = t.split(/\s+/).filter((w) => !/\.(jsx?|tsx?|css|sql|json|ya?ml|mjs|env)$/i.test(w) && !(w.includes("/") && w.includes("."))).join(" ");
  t = t.replace(/\s+/g, " ").trim().replace(/[.;]+$/, "");
  if (t.length < 3) return "";
  return t[0].toUpperCase() + t.slice(1);
}

export async function getChangelog(perRepo = 25) {
  const entries = [];
  await Promise.all(
    Object.keys(REPOS).map(async (repo) => {
      try {
        const r = await fetch(`https://api.github.com/repos/${OWNER}/${repo}/commits?per_page=${perRepo}`, {
          headers: { Accept: "application/vnd.github+json", "User-Agent": "zhd-changelog" },
          next: { revalidate: 600 },
        });
        if (!r.ok) return;
        const arr = await r.json();
        for (const c of Array.isArray(arr) ? arr : []) {
          const subject = String(c.commit?.message || "").split("\n")[0].replace(/\s+/g, " ").trim();
          if (!subject || /^(merge|wip)\b/i.test(subject) || isInternal(subject)) continue;
          const text = friendly(subject);
          if (!text) continue;
          entries.push({
            repo,
            label: REPOS[repo],
            text,
            date: c.commit?.author?.date || c.commit?.committer?.date || null,
            url: c.html_url || null,
          });
        }
      } catch { /* one repo failing shouldn't blank the page */ }
    }),
  );
  entries.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  // Group by calendar day, de-duping identical lines that land the same day across repos.
  const days = [];
  const byDay = new Map();
  for (const e of entries) {
    const day = e.date ? new Date(e.date).toISOString().slice(0, 10) : "unknown";
    if (!byDay.has(day)) { byDay.set(day, []); days.push(day); }
    const bucket = byDay.get(day);
    if (!bucket.some((x) => x.text === e.text && x.repo === e.repo)) bucket.push(e);
  }
  return days.map((day) => ({ day, items: byDay.get(day) }));
}
