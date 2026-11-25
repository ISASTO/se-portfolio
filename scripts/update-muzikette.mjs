// Keeps the Muzikette figures on the site in step with its GitHub releases: the number of releases and the weeks
// between the first and the latest. Each figure is written inside <span data-muzikette="releases|weeks">…</span>.
// Run: node scripts/update-muzikette.mjs   (prints whether anything changed; uses GITHUB_TOKEN when set)
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = ["index.html", "projects/muzikette/index.html"];

const headers = { Accept: "application/vnd.github+json", "User-Agent": "isaacstoltz.com" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const releases = [];
for (let page = 1; page <= 20; page++) {
  const response = await fetch(`https://api.github.com/repos/ISASTO/Muzikette/releases?per_page=100&page=${page}`, { headers });
  if (!response.ok) throw new Error(`GitHub answered ${response.status} for the Muzikette releases`);
  const batch = await response.json();
  releases.push(...batch.filter((release) => !release.draft && !release.prerelease));
  if (batch.length < 100) break;
}
if (releases.length === 0) throw new Error("No Muzikette releases found");

const dates = releases.map((release) => Date.parse(release.published_at)).sort((a, b) => a - b);
const weeks = Math.max(1, Math.round((dates.at(-1) - dates[0]) / (7 * 24 * 60 * 60 * 1000)));
const figures = { releases: String(releases.length), weeks: String(weeks) };

let changed = false;
for (const file of files) {
  const fullPath = path.join(projectRoot, file);
  const source = await readFile(fullPath, "utf8");
  const updated = source.replace(/(<span data-muzikette="(releases|weeks)">)[^<]*(<\/span>)/g, (_, open, key, close) => open + figures[key] + close);
  if (updated !== source) {
    await writeFile(fullPath, updated);
    changed = true;
  }
}

console.log(`Muzikette: ${figures.releases} releases in ${figures.weeks} weeks${changed ? " (site updated)" : " (no change)"}`);
