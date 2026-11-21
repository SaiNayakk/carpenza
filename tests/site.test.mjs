import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { build } from "../scripts/build.mjs";

const html = build();
const js = readFileSync("src/script.js", "utf8");
const photos = JSON.parse(readFileSync("src/assets/work/photos.json", "utf8"));

test("hashed assets exist, paths are relative and the page points at them", () => {
  const refs = [...html.matchAll(/(?:src|href|poster)="(assets\/[^"]+)"/g)].map(m => m[1]);
  assert.ok(refs.some(r => /^assets\/styles\.[0-9a-f]{10}\.css$/.test(r)), "stylesheet");
  assert.ok(refs.some(r => /^assets\/script\.[0-9a-f]{10}\.js$/.test(r)), "script");
  assert.doesNotMatch(html, /(?:src|href)="\/assets\//, "absolute asset paths break under /repo/");
  for (const r of refs) assert.ok(existsSync("dist/" + r), r);
  for (const [, u] of html.matchAll(/url\('([^']+)'\)/g)) assert.ok(existsSync("dist/" + u), u);
});

test("every phone and WhatsApp link uses a business number", () => {
  const src = html + js;
  const tel = [...src.matchAll(/tel:\+?(\d+)/g)].map(m => m[1]);
  const wa = [...src.matchAll(/wa\.me\/(\d+)/g)].map(m => m[1]);
  assert.ok(tel.length && wa.length);
  for (const n of tel) assert.ok(["918722304278", "918722932746"].includes(n), n);
  for (const n of wa) assert.equal(n, "918722304278");
});

test("no trace of the old brand or stock photos", () => {
  assert.doesNotMatch(html + js, /hash\s*interior|unsplash|gmail/i);
});

test("every gallery category has a filter button and every filter shows something", () => {
  assert.ok(photos.length >= 30, "at least thirty photos");
  const filters = [...html.matchAll(/data-filter="(\w+)"/g)].map(m => m[1]).filter(f => f !== "all");
  for (const p of photos) assert.ok(filters.includes(p.cat), `no filter button for ${p.cat}`);
  for (const f of filters) assert.ok(photos.some(p => p.cat === f), `filter ${f} would show nothing`);
  for (const p of photos) assert.match(js, new RegExp(`\\b${p.cat}: "`), `no label for ${p.cat}`);
});

test("walkthrough videos ship with posters", () => {
  const vids = [...html.matchAll(/<video src="([^"]+)" poster="([^"]+)"/g)];
  assert.equal(vids.length, 3);
  for (const [, v, p] of vids) { assert.ok(existsSync("dist/" + v), v); assert.ok(existsSync("dist/" + p), p); }
});
