import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([".git", "node_modules"]);
const failures = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else files.push(fullPath);
  }

  return files;
}

function fail(file, message) {
  failures.push(`${path.relative(projectRoot, file)}: ${message}`);
}

async function localTargetExists(htmlFile, target) {
  const cleanTarget = target.split("#")[0].split("?")[0];
  if (!cleanTarget) return true;

  let resolved;
  if (cleanTarget.startsWith("/se-portfolio/")) {
    resolved = path.join(projectRoot, cleanTarget.slice("/se-portfolio/".length));
  } else if (cleanTarget === "/se-portfolio") {
    resolved = projectRoot;
  } else if (cleanTarget.startsWith("/")) {
    return true;
  } else {
    resolved = path.resolve(path.dirname(htmlFile), cleanTarget);
  }

  try {
    const info = await stat(resolved);
    if (info.isDirectory()) await stat(path.join(resolved, "index.html"));
    return true;
  } catch {
    return false;
  }
}

const siteFiles = await walk(projectRoot);
const textExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".txt", ".xml", ".yaml", ".yml"]);

for (const file of siteFiles) {
  if (!textExtensions.has(path.extname(file))) continue;
  const source = await readFile(file, "utf8");
  if (source.includes("\u2014")) fail(file, "contains an em dash");
}

const htmlFiles = siteFiles.filter((file) => file.endsWith(".html"));

for (const file of htmlFiles) {
  const source = await readFile(file, "utf8");

  if (!/<html\s+lang="en"/.test(source)) fail(file, "missing an English document language");
  if (!/<meta\s+name="viewport"/.test(source)) fail(file, "missing viewport metadata");
  if (!/<title>[^<]+<\/title>/.test(source)) fail(file, "missing a non-empty title");

  const h1Count = (source.match(/<h1(?:\s|>)/g) ?? []).length;
  if (h1Count !== 1) fail(file, `expected exactly one h1, found ${h1Count}`);

  const ids = [...source.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) fail(file, `duplicate ids: ${[...new Set(duplicateIds)].join(", ")}`);

  const samePageFragments = [...source.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
  for (const fragment of samePageFragments) {
    if (!ids.includes(fragment)) fail(file, `missing same-page fragment #${fragment}`);
  }

  const images = [...source.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
  for (const image of images) {
    if (!/\salt="[^"]*"/.test(image)) fail(file, "image is missing alt text");
    if (!/\swidth="\d+"/.test(image) || !/\sheight="\d+"/.test(image)) {
      fail(file, "image is missing explicit width or height");
    }
  }

  const targets = [...source.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const target of targets) {
    if (/^(?:https?:|mailto:|tel:|data:|#)/.test(target)) continue;
    if (!(await localTargetExists(file, target))) fail(file, `missing local target ${target}`);
  }
}

for (const expected of ["styles.css", "script.js", "assets/favicon.svg", ".github/workflows/pages.yml"]) {
  try {
    await stat(path.join(projectRoot, expected));
  } catch {
    failures.push(`missing required file: ${expected}`);
  }
}

if (failures.length > 0) {
  console.error(`Validation failed with ${failures.length} issue${failures.length === 1 ? "" : "s"}:`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Validated ${htmlFiles.length} HTML pages and all local links.`);
}
