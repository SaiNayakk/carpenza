// Builds src/ into dist/. No dependencies: copies the page and gives the
// stylesheet and script content-hashed names under assets/, so browsers can
// cache them and a deploy never serves a stale mix. Paths stay relative so the
// site works both at a custom domain and under a /repo/ path.
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

const SRC = "src";
const DIST = "dist";

// path in src → how index.html refers to it today
export const HASHED = {
  "styles.css": ["styles.css"],
  "script.js": ["script.js"],
};

function hashedName(file, bytes) {
  const ext = extname(file);
  const h = createHash("sha256").update(bytes).digest("hex").slice(0, 10);
  return `${basename(file, ext)}.${h}${ext}`;
}

export function build() {
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(join(DIST, "assets"), { recursive: true });

  let html = readFileSync(join(SRC, "index.html"), "utf8");
  for (const [file, refs] of Object.entries(HASHED)) {
    const bytes = readFileSync(join(SRC, file));
    const out = `assets/${hashedName(file, bytes)}`;
    writeFileSync(join(DIST, out), bytes);
    for (const ref of refs) {
      const quoted = new RegExp(`(["'])${ref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\1`, "g");
      if (!quoted.test(html)) throw new Error(`index.html no longer references ${ref}`);
      html = html.replace(quoted, `$1${out}$1`);
    }
  }
  writeFileSync(join(DIST, "index.html"), html);

  // photos, videos and logos ship as they are
  cpSync(join(SRC, "assets"), join(DIST, "assets"), { recursive: true });
  for (const f of ["CNAME", ".nojekyll", "robots.txt"]) {
    try { cpSync(join(SRC, f), join(DIST, f)); } catch {}
  }
  // alternative design directions, self-contained pages that share assets/
  cpSync(join(SRC, "designs"), join(DIST, "designs"), { recursive: true });
  return html;
}

if (process.argv[1] && process.argv[1].endsWith("build.mjs")) {
  build();
  console.log("built dist/");
}
