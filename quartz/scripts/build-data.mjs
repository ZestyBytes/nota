#!/usr/bin/env node
// Reads the real Obsidian content in quartz/content and emits a data.js
// (window.NOTA_DATA = {...}) in the exact shape the Nota PWA (app.js)
// expects. Only files with `publish: true` are included — the same rule
// quartz's own explicit-publish plugin enforces — so private planning and
// drafts never leave Obsidian.
//
// Usage: node quartz/scripts/build-data.mjs [--out <path>]

import { readdirSync, statSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, "..", "content");
const IGNORE_DIRS = new Set(["private", "templates", ".obsidian", "drafts"]);
const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const OUT_PATH = outIdx >= 0 ? args[outIdx + 1] : join(__dirname, "..", "..", "dist", "data.js");

// Topic taxonomy — mirrors the six paths declared in content/topics.md.
const TOPICS = {
  gardening: { name: "Gardening", color: "#3f6b2e", soft: "#e4ead9", description: "Seasons, seedlings and life outdoors" },
  music: { name: "Music", color: "#a13a2e", soft: "#f0e1dd", description: "Practice, listening and the guitar journey" },
  technology: { name: "Technology", mode: "tech", color: "#1c6e63", soft: "#dbe9e6", description: "Tools, code and thoughtful technology" },
  adhd: { name: "ADHD", color: "#5b4a9e", soft: "#e5e1f2", description: "Understanding attention and living well" },
  books: { name: "Books", color: "#8a5a12", soft: "#ece0cb", description: "Reading, marginalia and ideas worth keeping" },
  family: { name: "Family", color: "#96355a", soft: "#eddce3", description: "Home life and shared memories" },
  food: { name: "Food", mode: "recipes", color: "#8a4a1a", soft: "#ecddcb", description: "Recipes, experiments and things made for the table" }
};
const TYPE_MAP = { journal: "Journal", journey: "Journey", note: "Note", quote: "Quote" };

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (IGNORE_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith(".md")) out.push(full);
  }
  return out;
}

function splitFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  return { data: parseYaml(m[1]) || {}, body: m[2] };
}

function firstImage(body) {
  const m = body.match(/!\[([^\]]*)\]\(([^)]+)\)/);
  return m ? { image: m[2], imageAlt: m[1] } : { image: "", imageAlt: "" };
}

function firstParagraph(body) {
  const lines = body.split("\n");
  const paras = [];
  let cur = [];
  for (const line of lines) {
    const t = line.trim();
    const skip = !t || t.startsWith("![") || t.startsWith("#") || t.startsWith("|") ||
      t.startsWith(">") || t.startsWith("Related:") || t.startsWith("-") || t.startsWith("```");
    if (skip) { if (cur.length) { paras.push(cur.join(" ")); cur = []; } continue; }
    cur.push(t);
  }
  if (cur.length) paras.push(cur.join(" "));
  const first = paras[0] || "";
  return first.replace(/\[\[([^\]|]+)\|?[^\]]*\]\]/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1");
}

function bulletsAfter(body, heading) {
  const lines = body.split("\n");
  const start = lines.findIndex(l => l.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start < 0) return [];
  const items = [];
  for (let i = start + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith("## ")) break;
    if (t.startsWith("- ")) items.push(t.slice(2).trim());
  }
  return items;
}

function blockquote(body) {
  const m = body.split("\n").find(l => l.trim().startsWith(">"));
  return m ? m.trim().replace(/^>\s*/, "").replace(/\.$/, "") : "";
}

function unwikilink(v) {
  if (typeof v !== "string") return v;
  const m = v.match(/^\[\[([^\]|]+)\]\]$/);
  return m ? m[1] : v;
}

// Accept either `tags:` (what real content and quartz's own tag pages use)
// or `topics:` (an older template field) so a note made from either
// template still gets filed under its topic.
function topicsOf(data) {
  const raw = Array.isArray(data.tags) ? data.tags : Array.isArray(data.topics) ? data.topics : [];
  return raw.filter(t => TOPICS[t]);
}

const files = walk(CONTENT_DIR);
const entries = [], books = [], quoteFiles = [], tasks = [];

for (const file of files) {
  const raw = readFileSync(file, "utf8");
  const { data, body } = splitFrontmatter(raw);
  if (!data.publish || data.draft) continue;
  const slug = relative(CONTENT_DIR, file).replace(/\.md$/, "").replace(/\\/g, "/");
  const topics = topicsOf(data);

  if (data.type === "task") {
    tasks.push({ id: slug, title: data.title, topics: topics.length ? topics : ["books"],
      dueAt: data.dueAt || "", completedAt: data.completedAt || null });
    continue;
  }

  if (data.type === "reading") {
    books.push({
      id: slug, title: data.title, author: data.author || "",
      status: data.status || "want-to-read", progress: Number(data.progress || 0),
      cover: firstImage(body).image, topics: topics.length ? topics : ["books"],
      notes: (() => {
        const n = firstParagraph(body.slice(body.toLowerCase().indexOf("## reading notes")));
        return n && body.toLowerCase().includes("## reading notes") ? [{ id: `${slug}-n1`, text: n, createdAt: data.startedAt || "" }] : [];
      })(),
      quotes: []
    });
    continue;
  }

  if (data.type === "quote") {
    quoteFiles.push({ slug, data, body });
    continue;
  }

  if (!TYPE_MAP[data.type]) continue; // site pages (index/calendar/library/topics/about) have no recognised type

  const { image, imageAlt } = firstImage(body);
  const entry = {
    id: slug, type: TYPE_MAP[data.type], title: data.title,
    excerpt: firstParagraph(body), topics,
    occurredAt: data.occurredAt || "", createdAt: data.createdAt || data.occurredAt || "",
    publishedAt: data.publishedAt || "", image, imageAlt, attachments: []
  };
  if (data.view === "recipe") {
    entry.recipe = {
      time: data.time || "", serves: String(data.serves || ""), difficulty: data.difficulty || "",
      ingredients: bulletsAfter(body, "you'll need")
    };
  }
  entries.push(entry);
}

// Fold quote files in as entries, and attach book-linked quotes to their book.
for (const { slug, data, body } of quoteFiles) {
  const text = blockquote(body) || data.title;
  const q = { id: slug, type: "Quote", title: text, author: data.author || "", excerpt: "",
    topics: topicsOf(data),
    occurredAt: data.createdAt || "", createdAt: data.createdAt || "", publishedAt: data.publishedAt || data.createdAt || "",
    image: "", imageAlt: "", attachments: [] };
  const bookTitle = unwikilink(data.book);
  const book = bookTitle && books.find(b => b.title === bookTitle);
  if (book) {
    book.quotes.push({ id: slug, text, page: data.page ? `p. ${data.page}` : data.location || "" });
  } else {
    entries.push(q);
  }
}

entries.sort((a, b) => (b.occurredAt || b.createdAt || "").localeCompare(a.occurredAt || a.createdAt || ""));

const payload = {
  topics: Object.fromEntries(Object.entries(TOPICS).filter(([slug]) =>
    entries.some(e => e.topics.includes(slug)) || books.some(b => b.topics.includes(slug)) || tasks.some(t => t.topics.includes(slug)))),
  entries, tasks, books
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `window.NOTA_DATA = ${JSON.stringify(payload, null, 2)};\n`);
console.log(`Wrote ${entries.length} entries, ${tasks.length} tasks, ${books.length} books, ${Object.keys(payload.topics).length} topics -> ${OUT_PATH}`);
