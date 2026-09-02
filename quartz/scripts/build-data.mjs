#!/usr/bin/env node
// Reads the real Obsidian content in quartz/content and emits a data.js
// (window.NOTA_DATA = {...}) in the exact shape the Nota PWA (app.js)
// expects. Only files with `publish: true` are included, the same rule
// quartz's own explicit-publish plugin enforces, so private planning and
// drafts never leave Obsidian.
//
// Usage: node quartz/scripts/build-data.mjs [--out <path>]

import { readdirSync, statSync, readFileSync, mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, "..", "content");
const IGNORE_DIRS = new Set(["private", "templates", ".obsidian", "drafts"]);
const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const OUT_PATH = outIdx >= 0 ? args[outIdx + 1] : join(__dirname, "..", "..", "dist", "data.js");

// A topic's `photo:` accepts whatever is easiest to paste. Pexels serves a
// deterministic URL from a photo's id, and that id is the last run of digits
// in any Pexels address, so the browser's address bar is enough: no hunting
// for "copy image address". A full URL from anywhere is passed straight
// through, and a path inside the repo is left alone.
const PEXELS = id => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1400`;
function resolvePhoto(value) {
  const v = String(value || "").trim();
  if (!v) return "";
  if (/^\d+$/.test(v)) return PEXELS(v);                       // a bare id
  if (/pexels\.com/i.test(v) && !/images\.pexels\.com/i.test(v)) {
    const id = (v.match(/(\d{4,})/g) || []).pop();             // a pexels page
    return id ? PEXELS(id) : v;
  }
  return v;                                                     // a URL or a repo path
}

// Topic taxonomy, mirroring the paths declared in content/topics.md.
const TOPICS = {
  // Seven top-level paths, each holding whatever belongs under it. A topic
  // nothing uses is dropped from the build, so a child can be declared long
  // before anything is filed there.
  family:     { name: "Family", icon: "home", color: "#96355a", soft: "#eddce3", ground: "band", photo: "", description: "Home life and shared memories" },
  life:       { name: "Life", icon: "cup", color: "#2f5d8a", soft: "#dde5ee", ground: "verticals", photo: "", description: "Everyday life, plans and the practical things" },
  selfcare:   { name: "Self care", parent: "life", icon: "heart", color: "#3f6470", soft: "#dde7ea", ground: "wash", photo: "", description: "Looking after the machine: health, mind and upkeep" },
  adhd:       { name: "ADHD", parent: "life", icon: "mind", color: "#5b4a9e", soft: "#e5e1f2", ground: "fade", photo: "", description: "Understanding attention and living well" },
  habits:     { name: "Habits", parent: "life", icon: "repeat", color: "#6b3f6b", soft: "#e9dfe9", ground: "crosshatch", photo: "assets/posts/eight-japanese-principles-for-habits.jpg", description: "Practices worth repeating, and what makes them stick" },
  music:      { name: "Music", icon: "music", color: "#a13a2e", soft: "#f0e1dd", ground: "ink", photo: "assets/posts/on-repeat.jpg", description: "Listening, playing, and what the speakers are on" },
  playlist:   { name: "Playlist", parent: "music", mode: "listen", icon: "disc", color: "#6b6a2e", soft: "#e9e8d3", ground: "dots", photo: "", description: "Records, podcasts and things worth listening to" },
  practice:   { name: "Practice", parent: "music", icon: "music", color: "#8a4438", soft: "#f0e3e0", ground: "hatch", photo: "", description: "The guitar, and the hours it asks for" },
  reading:    { name: "Reading", icon: "book", color: "#8a5a12", soft: "#ece0cb", ground: "ruled", photo: "", description: "Books, marginalia and ideas worth keeping" },
  food:       { name: "Food", mode: "kitchen", icon: "fork", color: "#8a4a1a", soft: "#ecddcb", ground: "coarse", photo: "assets/posts/slow-roast-tomato-focaccia.jpg", description: "Recipes, experiments and things made for the table" },
  recipes:    { name: "Recipes", parent: "food", mode: "recipes", icon: "fork", color: "#a25a1e", soft: "#f0e2d2", ground: "duo", photo: "", description: "Things made at home, and how they were made" },
  eatingout:  { name: "Eating out", parent: "food", icon: "cup", color: "#7a5a2e", soft: "#ece1d0", ground: "plain", photo: "", description: "Meals out worth remembering" },
  technology: { name: "Technology", mode: "tech", icon: "terminal", color: "#1c6e63", soft: "#dbe9e6", ground: "grid", photo: "assets/posts/a-week-living-with-omarchy.jpg", description: "Tools, code and thoughtful technology" },
  motoring:   { name: "Motoring", icon: "car", color: "#b0472c", soft: "#f2ded6", ground: "wedge", photo: "", description: "The Mini, the road, and the days worth the drive" },
  gardening:  { name: "Gardening", icon: "leaf", color: "#3f6b2e", soft: "#e4ead9", ground: "hatch", photo: "assets/posts/staked-the-runner-beans.jpg", description: "Seasons, seedlings and life outdoors" }
};
// Normalise every topic photograph once, at build time, so the app only ever
// sees a finished URL.
for (const t of Object.values(TOPICS)) if (t.photo) t.photo = resolvePhoto(t.photo);

const TYPE_MAP = { journal: "Journal", journey: "Journey", note: "Note", quote: "Quote", scrap: "Scrap" };

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

// Photographs added in Obsidian land wherever that device's attachment
// setting points, inside the vault, and Obsidian writes them as ![[name.jpg]]
// rather than as markdown. Neither reaches the site on its own: the app only
// serves what the deploy copies, and its renderer only understands the
// markdown form. So the vault's own media is indexed here, copied into the
// build beside the hand-placed assets/, and every reference rewritten to the
// path it will actually live at. Writing on the phone then needs no detour.
const MEDIA_RE = /\.(jpe?g|png|gif|webp|avif|svg|heic|mp4|mov|m4v|webm)$/i;
const VIDEO_RE = /\.(mp4|mov|m4v|webm)$/i;
const VAULT_MEDIA_DIR = "assets/vault";
const OUT_DIR = dirname(OUT_PATH);
const REPO_ROOT = join(__dirname, "..", "..");

// relative path under content -> absolute source, plus a basename index, since
// an Obsidian embed names the file alone with no idea where it sits.
const vaultMedia = new Map();
const vaultMediaByName = new Map();
(function indexMedia(dir) {
  for (const name of readdirSync(dir)) {
    if (IGNORE_DIRS.has(name) || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { indexMedia(full); continue; }
    if (!MEDIA_RE.test(name)) continue;
    const rel = relative(CONTENT_DIR, full).replace(/\\/g, "/");
    vaultMedia.set(rel, full);
    if (!vaultMediaByName.has(name)) vaultMediaByName.set(name, rel);
  }
})(CONTENT_DIR);

// Obsidian's default attachment location is the vault root, and the vault root
// here is the whole repository, so a photograph attached with the default
// setting lands above content/ where the walk above never sees it. Index the
// repository's own top level too, one level only, so that still works.
for (const name of readdirSync(REPO_ROOT)) {
  if (!MEDIA_RE.test(name) || !statSync(join(REPO_ROOT, name)).isFile()) continue;
  vaultMedia.set(name, join(REPO_ROOT, name));
  if (!vaultMediaByName.has(name)) vaultMediaByName.set(name, name);
}

const copied = new Set();
function publishMedia(rel) {
  const src = vaultMedia.get(rel);
  const dest = join(OUT_DIR, VAULT_MEDIA_DIR, rel);
  if (!copied.has(rel)) {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    copied.add(rel);
  }
  return `${VAULT_MEDIA_DIR}/${rel}`;
}

// A reference is resolved against the note's own folder, then the vault root,
// then by filename anywhere in the vault. Anything remote, or already pointing
// at the repository's top-level assets/, is left exactly as it is.
function resolveMedia(src, file) {
  const clean = decodeURIComponent(src.trim().split("|")[0].split("#")[0]);
  if (/^(https?:)?\/\//i.test(clean) || clean.startsWith("data:") || clean.startsWith("assets/")) return src;
  const noteDir = relative(CONTENT_DIR, dirname(file)).replace(/\\/g, "/");
  const candidates = [
    noteDir ? `${noteDir}/${clean}` : clean,
    clean,
    vaultMediaByName.get(clean.split("/").pop()) || ""
  ];
  const hit = candidates.find(c => c && vaultMedia.has(c));
  return hit ? publishMedia(hit) : src;
}

// Rewrites a note body so both forms of reference come out as markdown
// pointing at a path the deployed site serves. Video travels the same way and
// is told apart by its extension at render time.
function resolveBodyMedia(body, file) {
  return body
    .replace(/!\[\[([^\]]+)\]\]/g, (whole, target) => {
      const [path, label] = target.split("|");
      if (!MEDIA_RE.test(path.trim())) return whole; // an embedded note, not a photograph
      const resolved = resolveMedia(path, file);
      // Obsidian uses the pipe for display size, so "300" or "300x200" is a
      // width and not a caption. Anything else was typed as one.
      const caption = /^\s*\d+(x\d+)?\s*$/.test(label || "") ? "" : (label || "").trim();
      return `![${caption}](${resolved})`;
    })
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (whole, alt, src) => {
      const resolved = resolveMedia(src, file);
      return resolved === src ? whole : `![${alt}](${resolved})`;
    });
}

// A clip travels as the same markdown as a photograph, so the card thumbnail
// and the gallery have to skip it: an <img> pointed at a .mov shows nothing.
function firstImage(body) {
  const m = [...body.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)].find(x => !VIDEO_RE.test(x[2]));
  return m ? { image: m[2], imageAlt: m[1] } : { image: "", imageAlt: "" };
}

// Every image in the body, in order, so an entry can carry a gallery rather
// than a single photograph.
function allImages(body) {
  const out = [];
  const re = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(body))) if (!VIDEO_RE.test(m[2])) out.push({ src: m[2], alt: m[1] });
  return out;
}

// An excerpt is shown as plain text everywhere it appears, so the markdown has
// to come off it: a card was printing "[Omarchy](https://omarchy.org)" in full,
// link syntax and all. Wikilinks and bold were already handled here; links,
// code, italics and stray images were not.
function plain(text) {
  return String(text)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m, a, b) => b || a)
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
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
  return plain(paras[0] || "");
}

// Steps are often numbered rather than bulleted, so accept either.
function stepsAfter(body, heading) {
  const lines = body.split("\n");
  const start = lines.findIndex(l => l.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start < 0) return [];
  const items = [];
  for (let i = start + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith("## ")) break;
    const m = t.match(/^(?:[-*]|\d+[.)])\s+(.*)$/);
    if (m) items.push(m[1].trim());
  }
  return items;
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
  const { data, body: rawBody } = splitFrontmatter(raw);
  if (!data.publish || data.draft) continue;
  const body = resolveBodyMedia(rawBody, file);
  const slug = relative(CONTENT_DIR, file).replace(/\.md$/, "").replace(/\\/g, "/");
  const topics = topicsOf(data);

  if (data.type === "task") {
    tasks.push({ id: slug, title: data.title, topics: topics.length ? topics : ["books"],
      dueAt: data.dueAt || "", completedAt: data.completedAt || null,
      note: firstParagraph(body), body: body.trim() });
    continue;
  }

  if (data.type === "reading") {
    books.push({
      id: slug, title: data.title, author: data.author || "",
      status: data.status || "want-to-read", progress: Number(data.progress || 0),
      cover: data.cover || firstImage(body).image, topics: topics.length ? topics : ["books"],
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
    excerpt: firstParagraph(body), body: body.trim(), view: data.view || "", topics,
    occurredAt: data.occurredAt || "", createdAt: data.createdAt || data.occurredAt || "",
    publishedAt: data.publishedAt || "", writing: Boolean(data.writing),
    // A journey is a thread, not a pile: carry the thread's name and the day
    // number so the app can put its entries back in order.
    journey: unwikilink(data.journey) || "", day: Number(data.day || (String(data.title || "").match(/^Day\s+(\d+)/i)?.[1] ?? 0)) || 0,
    image, imageAlt, images: allImages(body), attachments: []
  };
  if (data.view === "recipe") {
    entry.recipe = {
      time: data.time || "", serves: String(data.serves || ""), difficulty: data.difficulty || "",
      ingredients: bulletsAfter(body, "you'll need"),
      method: stepsAfter(body, "method").length ? stepsAfter(body, "method") : stepsAfter(body, "steps")
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
  topics: (() => {
    const used = slug => entries.some(e => e.topics.includes(slug)) || books.some(b => b.topics.includes(slug)) || tasks.some(t => t.topics.includes(slug));
    // a parent earns its place if it is tagged directly or any child is
    const shown = slug => used(slug) || Object.entries(TOPICS).some(([child, t]) => t.parent === slug && used(child));
    return Object.fromEntries(Object.entries(TOPICS).filter(([slug]) => shown(slug)));
  })(),
  entries, tasks, books
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `window.NOTA_DATA = ${JSON.stringify(payload, null, 2)};\n`);
console.log(`Wrote ${entries.length} entries, ${tasks.length} tasks, ${books.length} books, ${Object.keys(payload.topics).length} topics -> ${OUT_PATH}`);
