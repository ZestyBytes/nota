#!/usr/bin/env node
// Lightweight preflight for the Obsidian vault. It deliberately checks only
// things that can make the published archive fail or silently lose media.
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "content");
const IGNORE = new Set(["templates", "private", "drafts", ".obsidian"]);
const media = /\.(jpe?g|png|gif|webp|avif|svg|heic|mp4|mov|m4v|webm)$/i;
const errors = [];
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (IGNORE.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith(".md")) out.push(full);
  }
  return out;
}
const files = walk(ROOT);
const assets = new Set();
function index(dir) {
  for (const name of readdirSync(dir)) {
    if (IGNORE.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) index(full);
    else if (media.test(name)) assets.add(full);
  }
}
index(ROOT);
for (const file of files) {
  const raw = readFileSync(file, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) { errors.push(`${relative(ROOT, file)}: missing frontmatter`); continue; }
  try { parseYaml(match[1]); } catch (error) { errors.push(`${relative(ROOT, file)}: invalid frontmatter (${error.message})`); }
  for (const line of match[2].split(/\r?\n/)) {
    const embeds = [...line.matchAll(/!\[\[([^\]]+)\]\]/g)];
    if (embeds.length && line.replace(/!\[\[[^\]]+\]\]/g, "").trim()) {
      errors.push(`${relative(ROOT, file)}: image embeds must be on their own line`);
    }
    for (const embed of embeds) {
      const name = embed[1].split("|")[0].trim();
      if (media.test(name) && ![...assets].some(path => path.endsWith(`/${name}`))) {
        errors.push(`${relative(ROOT, file)}: missing attachment ${name}`);
      }
    }
  }
}
if (errors.length) {
  console.error(`Content preflight failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Content preflight passed (${files.length} Markdown files checked).`);
