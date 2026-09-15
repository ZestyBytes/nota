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
  const path = `quartz/content/tasks/${id}.md`;
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
      if (request.method === "POST" && url.pathname === "/api/tasks/toggle") {
        if (!env.GITHUB_TOKEN) {
          return Response.json({ error: "GITHUB_TOKEN not configured" }, { status: 500 });
        }
        try {
          const { id } = await request.json();
          if (!id || !/^[a-z0-9-]+$/i.test(id)) {
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
};
