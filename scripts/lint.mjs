// Checks the source before it ships: the script parses, every local file the
// page points at exists, every in-page link has a target, and only the
// allowed external hosts are used.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const problems = [];
const html = readFileSync("src/index.html", "utf8");
const css = readFileSync("src/styles.css", "utf8");
const js = readFileSync("src/script.js", "utf8");

try {
  execFileSync(process.execPath, ["--check", "src/script.js"], { stdio: "pipe" });
} catch (e) {
  problems.push(`script.js does not parse:\n${e.stderr}`);
}

for (const [, ref] of [...html.matchAll(/(?:src|href|poster)="([^"#:]+)"|url\('([^']+)'\)/g)].map(m => [m[0], m[1] || m[2]])) {
  if (!existsSync(join("src", ref))) problems.push(`missing file: ${ref}`);
}

const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) {
  if (!ids.has(id)) problems.push(`link to #${id} has no target`);
}
for (const [, id] of js.matchAll(/\$\("#([\w-]+)"\)/g)) {
  if (!ids.has(id)) problems.push(`script.js looks up #${id}, which index.html doesn't have`);
}

// Visitors read em/en dashes as a sign of machine-written copy; keep them out.
for (const [name, text] of [["index.html", html], ["styles.css", css], ["script.js", js]]) {
  text.split("\n").forEach((line, i) => {
    if (/[–—]/.test(line)) problems.push(`${name}:${i + 1} has an em/en dash`);
  });
}

const allowed = ["fonts.googleapis.com", "fonts.gstatic.com", "wa.me", "www.w3.org"];

// every photo the gallery lists has both sizes
const photos = JSON.parse(readFileSync("src/assets/work/photos.json", "utf8"));
for (const p of photos) for (const size of ["s", "l"]) {
  if (!existsSync(`src/assets/work/${p.slug}-${size}.webp`)) problems.push(`missing photo: ${p.slug}-${size}.webp`);
}
for (const [, host] of (html + css + js).matchAll(/https?:\/\/([^/"'`\s)]+)/g)) {
  if (!allowed.includes(host)) problems.push(`unexpected external host: ${host}`);
}

if (problems.length) {
  console.error(problems.map(p => `✗ ${p}`).join("\n"));
  process.exit(1);
}
console.log("lint: ok");
