// PIN-gates the whole site behind a simple, friendly login page instead
// of the browser's native Basic Auth popup. On success it sets a
// long-lived cookie (180 days) so you aren't asked again on this device
// until it expires or you clear your browser data. On mobile the input
// shows a numeric keypad while still masking the digits.
//
// Set SITE_PASSWORD as an encrypted secret on this Worker to a 6-digit
// PIN, not in this repo. Six digits, not four: brute-forcing the login
// endpoint should also be rate limited at the Cloudflare dashboard level,
// see the WAF rate limiting rule set up alongside this. SITE_USERNAME is
// no longer used and can be removed if you like. Has no effect on the
// separate GitHub Pages build.
//
// Also handles POST /api/tasks/toggle for tickable to-dos, once signed
// in: edits the task's frontmatter directly via the GitHub Contents API
// and commits it, which is what triggers the site's rebuild. Needs a
// GITHUB_TOKEN secret with write access to this repo's contents.

const COOKIE_NAME = "noted_session";
const SESSION_DAYS = 180;

async function sessionToken(password) {
  const data = new TextEncoder().encode(`noted-session:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}

// --- R2 media, hard-capped well under the free tier -------------------
// These are enforced in code, not just relied on as Cloudflare's own
// billing backstop: every request that touches R2 goes through /media/
// or /api/media/upload below, both of which check and reserve budget
// first and refuse outright once a ceiling is hit. Nothing in this app
// talks to R2 by any other path, so these are the only doors in.
const MEDIA_MAX_BYTES = 8 * 1024 * 1024 * 1024; // free tier is 10GB
const MEDIA_MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // per file
const R2_CLASS_A_MONTHLY_CAP = 800000; // free tier is 1,000,000/month (writes, lists)
const R2_CLASS_B_MONTHLY_CAP = 8000000; // free tier is 10,000,000/month (reads)

function monthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Not a distributed lock, just a KV read-then-write. Fine for a single
// user on a personal site; the point is a hard code-level ceiling, not
// perfect concurrency control.
async function reserveBudget(env, key, amount, cap) {
  const current = Number(await env.PUSH_KV.get(key)) || 0;
  if (current + amount > cap) return false;
  await env.PUSH_KV.put(key, String(current + amount));
  return true;
}

async function reserveClassA(env, n = 1) {
  return reserveBudget(env, `r2usage:classA:${monthKey()}`, n, R2_CLASS_A_MONTHLY_CAP);
}
async function reserveClassB(env, n = 1) {
  return reserveBudget(env, `r2usage:classB:${monthKey()}`, n, R2_CLASS_B_MONTHLY_CAP);
}
async function reserveStorage(env, addBytes) {
  return reserveBudget(env, "r2usage:storage_bytes", addBytes, MEDIA_MAX_BYTES);
}

const GITHUB_OWNER = "ZestyBytes";
const GITHUB_REPO = "nota";
const GITHUB_BRANCH = "main";

function b64ToUtf8(b64) {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Toggles a task's completion by editing its frontmatter directly. Keeps
// this to the fields build-data.mjs actually reads: completedAt as the
// source of truth, plus a done: true line for a phone-friendly marker.
function toggleTaskFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return null;

  let fm = match[1];
  const wasDone = /^completedAt:\s*(?!null\s*$)\S.*$/m.test(fm) || /^done:\s*true\s*$/m.test(fm);

  if (wasDone) {
    fm = fm.replace(/^completedAt:.*$/m, "completedAt: null");
    fm = fm.replace(/^done:\s*true\s*\n?/m, "");
  } else {
    const today = todayISO();
    fm = /^completedAt:/m.test(fm)
      ? fm.replace(/^completedAt:.*$/m, `completedAt: "${today}"`)
      : `${fm}\ncompletedAt: "${today}"`;
    if (!/^done:/m.test(fm)) fm += "\ndone: true";
  }

  const body = raw.slice(match[0].length);
  return { content: `---\n${fm}\n---\n${body}`, nowDone: !wasDone };
}

async function githubRequest(env, path, options = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "noted-worker",
      Accept: "application/vnd.github+json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function toggleTask(env, id) {
  // id is the task's slug relative to quartz/content, e.g. "tasks/haircut",
  // as built by build-data.mjs; it already includes the folder.
  const path = `quartz/content/${id}.md`;
  const file = await githubRequest(
    env,
    `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`
  );

  const raw = b64ToUtf8(file.content);
  const result = toggleTaskFrontmatter(raw);
  if (!result) throw new Error("Could not parse task frontmatter");

  await githubRequest(env, `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Mark "${id}" as ${result.nowDone ? "done" : "not done"}`,
      content: utf8ToB64(result.content),
      sha: file.sha,
      branch: GITHUB_BRANCH,
    }),
  });

  return result.nowDone ? todayISO() : null;
}

// --- Push notifications -----------------------------------------------
// Public VAPID key, safe to embed: it identifies this Worker to push
// services, it isn't a secret. Its matching private half is the
// VAPID_PRIVATE_KEY secret. Both were generated once and are fixed for
// the life of this site; regenerating them would invalidate any existing
// subscription.
const VAPID_PUBLIC_KEY = "BON5WkRoReur3osnR5GEV8R441jg6w3RzDg-Q6ykoMW6XCpdPy8zl5_0SON74j9T_4nPtmWH148KwzgyUmPTIv0";
const VAPID_SUBJECT = "mailto:jamiebassett@me.com";

function b64urlToBuf(s) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function bufToB64url(buf) {
  let binary = "";
  new Uint8Array(buf).forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concatBytes(...arrs) {
  const len = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const a of arrs) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

async function hmacSha256(keyBytes, data) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
}

// One-block HKDF-Expand, fine here since every length we need (32, 16, 12
// bytes) fits in a single SHA-256 block.
async function hkdfExpandOne(prk, info, length) {
  const t = await hmacSha256(prk, concatBytes(info, new Uint8Array([1])));
  return t.slice(0, length);
}

// Implements RFC 8291 (Web Push encryption) + RFC 8188 (aes128gcm), using
// only Web Crypto so this needs no npm dependency in the Worker.
async function encryptPushPayload(subscription, payloadBytes) {
  const uaPublicRaw = b64urlToBuf(subscription.keys.p256dh);
  const authSecret = b64urlToBuf(subscription.keys.auth);

  const uaPublicKey = await crypto.subtle.importKey(
    "raw", uaPublicRaw, { name: "ECDH", namedCurve: "P-256" }, true, []
  );
  const asKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]
  );
  const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", asKeyPair.publicKey));

  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaPublicKey }, asKeyPair.privateKey, 256)
  );

  const prkKey = await hmacSha256(authSecret, ecdhSecret);
  const keyInfo = concatBytes(new TextEncoder().encode("WebPush: info\0"), uaPublicRaw, asPublicRaw);
  const ikm = await hkdfExpandOne(prkKey, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk2 = await hmacSha256(salt, ikm);

  const cek = await hkdfExpandOne(prk2, new TextEncoder().encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdfExpandOne(prk2, new TextEncoder().encode("Content-Encoding: nonce\0"), 12);

  const padded = concatBytes(payloadBytes, new Uint8Array([2])); // last (only) record
  const cekKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cekKey, padded));

  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);
  const idLen = new Uint8Array([asPublicRaw.length]);

  return concatBytes(salt, recordSize, idLen, asPublicRaw, ciphertext);
}

async function vapidAuthHeader(env, endpoint) {
  const aud = new URL(endpoint).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: VAPID_SUBJECT };
  const toB64urlJson = (o) => bufToB64url(new TextEncoder().encode(JSON.stringify(o)));
  const signingInput = `${toB64urlJson(header)}.${toB64urlJson(payload)}`;

  const pubRaw = b64urlToBuf(VAPID_PUBLIC_KEY);
  const x = bufToB64url(pubRaw.slice(1, 33));
  const y = bufToB64url(pubRaw.slice(33, 65));
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d: env.VAPID_PRIVATE_KEY, ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, new TextEncoder().encode(signingInput))
  );

  return `vapid t=${signingInput}.${bufToB64url(signature)}, k=${VAPID_PUBLIC_KEY}`;
}

async function sendPush(env, subscription, payloadObj) {
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payloadObj));
  const body = await encryptPushPayload(subscription, payloadBytes);
  const authorization = await vapidAuthHeader(env, subscription.endpoint);

  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
      Authorization: authorization,
    },
    body,
  });

  if (res.status === 404 || res.status === 410) {
    // The subscription is gone (unsubscribed elsewhere, expired): stop
    // trying to use it.
    await env.PUSH_KV.delete("subscription");
    return;
  }
  if (!res.ok) throw new Error(`Push send failed: ${res.status} ${await res.text().catch(() => "")}`);
}

async function readSiteData(env) {
  const res = await env.ASSETS.fetch(new Request("https://internal/data.js"));
  if (!res.ok) throw new Error("Could not read data.js");
  const text = await res.text();
  const match = text.match(/window\.NOTED_DATA\s*=\s*(\{[\s\S]*\});?\s*$/);
  if (!match) throw new Error("Could not parse data.js");
  return JSON.parse(match[1]);
}

function buildMorningMessage(data) {
  const today = todayISO();
  const open = (data.tasks || []).filter((t) => !t.completedAt);
  if (!open.length) return { title: "noted.", body: "Nothing outstanding today.", url: "#tasks" };
  const overdue = open.filter((t) => t.dueAt && t.dueAt < today).length;
  const dueToday = open.filter((t) => t.dueAt === today).length;
  const bits = [];
  if (overdue) bits.push(`${overdue} overdue`);
  if (dueToday) bits.push(`${dueToday} due today`);
  const detail = bits.length ? bits.join(", ") : `${open.length} waiting`;
  return { title: "Today's to-do", body: `${detail}. ${open.length} on the list in total.`, url: "#tasks" };
}

function buildEveningMessage(data) {
  const today = todayISO();
  const doneToday = (data.tasks || []).filter((t) => t.completedAt === today);
  const body = doneToday.length
    ? `${doneToday.length} ticked off today: ${doneToday.slice(0, 3).map((t) => t.title).join(", ")}${doneToday.length > 3 ? "…" : ""}. Add a journal entry?`
    : "Nothing marked done today. Worth a journal entry about how it went?";
  return { title: "End of day", body, url: doneToday.length ? "#tasks" : "#today" };
}

async function handleScheduled(env, cron) {
  const subRaw = await env.PUSH_KV.get("subscription");
  if (!subRaw) return;
  const subscription = JSON.parse(subRaw);

  let data;
  try {
    data = await readSiteData(env);
  } catch (err) {
    console.error("Could not read site data for push:", err);
    return;
  }

  // Two crons are configured (morning, evening); tell them apart by hour
  // rather than by matching the exact cron string, which stays correct
  // even if the schedule is nudged later.
  const hour = new Date().getUTCHours();
  const message = hour < 12 ? buildMorningMessage(data) : buildEveningMessage(data);

  try {
    await sendPush(env, subscription, message);
  } catch (err) {
    console.error("Push send failed:", err);
  }
}

function loginPage({ error, redirectTo }) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>noted.</title>
<style>
  html, body { height: 100%; margin: 0; }
  body {
    display: flex; align-items: center; justify-content: center;
    background: #14181a; color: #f4f1ea;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    padding: 24px; box-sizing: border-box;
  }
  .card {
    width: 100%; max-width: 340px; text-align: center;
    background: #1d2225; border: 1px solid #2c3336;
    border-radius: 14px; padding: 32px 28px;
  }
  .brand { font-size: 26px; font-weight: 700; margin-bottom: 24px; }
  .brand .dot { color: #c1443d; }
  input[type="password"] {
    width: 100%; box-sizing: border-box; padding: 12px 14px;
    border-radius: 8px; border: 1px solid #3a4144; background: #14181a;
    color: #f4f1ea; font-size: 22px; letter-spacing: 6px; text-align: center;
    margin-bottom: 14px;
  }
  input[type="password"]:focus { outline: 2px solid #6b8f9e; }
  .error { color: #e5837c; font-size: 13px; margin: -6px 0 0; text-align: center; }
  @keyframes shake {
    10%, 90% { transform: translateX(-1px); }
    20%, 80% { transform: translateX(2px); }
    30%, 50%, 70% { transform: translateX(-4px); }
    40%, 60% { transform: translateX(4px); }
  }
  .shake { animation: shake 0.4s; }
</style>
</head>
<body>
  <div class="card">
    <div class="brand">noted<span class="dot">.</span></div>
    <form method="POST" action="/__login" id="loginForm">
      <input type="hidden" name="redirectTo" value="${redirectTo.replace(/"/g, "&quot;")}">
      <input
        type="password"
        name="password"
        id="pin"
        placeholder="••••••"
        inputmode="numeric"
        pattern="[0-9]*"
        autocomplete="off"
        maxlength="6"
        autofocus
        required
        class="${error ? "shake" : ""}"
      >
      ${error ? `<div class="error">Wrong PIN, try again.</div>` : ""}
    </form>
  </div>
  <script>
    const pin = document.getElementById("pin");
    const form = document.getElementById("loginForm");
    pin.focus();
    if (${error ? "true" : "false"}) pin.select();
    pin.addEventListener("input", () => {
      if (pin.value.length === 6) form.submit();
    });
  </script>
</body>
</html>`;
}

export default {
  async fetch(request, env) {
    if (!env.SITE_PASSWORD) {
      return new Response(
        "Site password not configured. Set SITE_PASSWORD as a secret on this Worker.",
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const expectedToken = await sessionToken(env.SITE_PASSWORD);

    if (request.method === "POST" && url.pathname === "/__login") {
      const form = await request.formData();
      const password = form.get("password") || "";
      const redirectTo = form.get("redirectTo") || "/";

      if (password === env.SITE_PASSWORD) {
        const token = await sessionToken(env.SITE_PASSWORD);
        const headers = new Headers({ Location: redirectTo });
        headers.append(
          "Set-Cookie",
          `${COOKIE_NAME}=${token}; Path=/; Max-Age=${SESSION_DAYS * 24 * 60 * 60}; HttpOnly; Secure; SameSite=Lax`
        );
        return new Response(null, { status: 302, headers });
      }

      return new Response(loginPage({ error: true, redirectTo }), {
        status: 401,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const cookieToken = getCookie(request, COOKIE_NAME);
    if (cookieToken === expectedToken) {
      if (request.method === "GET" && url.pathname === "/api/push/public-key") {
        return Response.json({ key: VAPID_PUBLIC_KEY });
      }

      if (request.method === "POST" && url.pathname === "/api/push/subscribe") {
        try {
          const subscription = await request.json();
          await env.PUSH_KV.put("subscription", JSON.stringify(subscription));
          return Response.json({ ok: true });
        } catch (err) {
          return Response.json({ error: String(err.message || err) }, { status: 400 });
        }
      }

      if (request.method === "POST" && url.pathname === "/api/push/unsubscribe") {
        await env.PUSH_KV.delete("subscription");
        return Response.json({ ok: true });
      }

      if (request.method === "GET" && url.pathname.startsWith("/media/")) {
        const key = decodeURIComponent(url.pathname.slice("/media/".length));
        if (!key) return new Response("Not found", { status: 404 });
        if (!(await reserveClassB(env, 1))) {
          return new Response("Media read budget reached for this month, capped well under the free tier on purpose", { status: 503 });
        }
        const object = await env.MEDIA_BUCKET.get(key);
        if (!object) return new Response("Not found", { status: 404 });
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        return new Response(object.body, { headers });
      }

      if (request.method === "POST" && url.pathname === "/api/media/upload") {
        const filename = request.headers.get("X-Filename") || "";
        if (!filename || !/^[a-z0-9._-]+$/i.test(filename)) {
          return Response.json({ error: "Invalid or missing X-Filename header" }, { status: 400 });
        }
        const bytes = await request.arrayBuffer();
        if (bytes.byteLength === 0) return Response.json({ error: "Empty file" }, { status: 400 });
        if (bytes.byteLength > MEDIA_MAX_UPLOAD_BYTES) {
          return Response.json({ error: `File too large, ${MEDIA_MAX_UPLOAD_BYTES / (1024 * 1024)}MB max per photo` }, { status: 413 });
        }
        if (!(await reserveStorage(env, bytes.byteLength))) {
          return Response.json({ error: "Media storage limit reached, uploads paused on purpose to stay clear of the free tier" }, { status: 507 });
        }
        if (!(await reserveClassA(env, 1))) {
          return Response.json({ error: "Media write budget reached for this month, uploads paused" }, { status: 503 });
        }
        const key = `${Date.now()}-${filename}`;
        const contentType = request.headers.get("X-Content-Type") || request.headers.get("Content-Type") || "application/octet-stream";
        await env.MEDIA_BUCKET.put(key, bytes, { httpMetadata: { contentType } });
        return Response.json({ ok: true, key, url: `/media/${encodeURIComponent(key)}` });
      }

      // Visit this URL in a signed-in browser to fire a push immediately,
      // rather than waiting for the twice-daily Cron Trigger.
      if (request.method === "GET" && url.pathname === "/api/push/test") {
        const subRaw = await env.PUSH_KV.get("subscription");
        if (!subRaw) return Response.json({ error: "No subscription saved yet, tap the bell first" }, { status: 400 });
        try {
          const kind = url.searchParams.get("kind");
          let message = { title: "noted.", body: "Test notification, if you see this it works.", url: "#tasks" };
          if (kind === "morning" || kind === "evening") {
            const data = await readSiteData(env);
            message = kind === "morning" ? buildMorningMessage(data) : buildEveningMessage(data);
          }
          await sendPush(env, JSON.parse(subRaw), message);
          return Response.json({ ok: true, sent: message });
        } catch (err) {
          return Response.json({ error: String(err.message || err) }, { status: 500 });
        }
      }

      if (request.method === "POST" && url.pathname === "/api/tasks/toggle") {
        if (!env.GITHUB_TOKEN) {
          return Response.json({ error: "GITHUB_TOKEN not configured" }, { status: 500 });
        }
        try {
          const { id } = await request.json();
          if (!id || !/^tasks\/[a-z0-9-]+$/i.test(id)) {
            return Response.json({ error: "Invalid task id" }, { status: 400 });
          }
          const completedAt = await toggleTask(env, id);
          return Response.json({ completedAt });
        } catch (err) {
          return Response.json({ error: String(err.message || err) }, { status: 500 });
        }
      }

      return env.ASSETS.fetch(request);
    }

    return new Response(loginPage({ error: false, redirectTo: url.pathname + url.search }), {
      status: 401,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduled(env, event.cron));
  },
};
