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
    width: 100%; max-width: 340px;
    background: #1d2225; border: 1px solid #2c3336;
    border-radius: 14px; padding: 32px 28px;
  }
  .brand { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .brand .dot { color: #c1443d; }
  p.sub { color: #9aa3a6; font-size: 14px; margin: 0 0 24px; }
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
    <p class="sub">Enter your PIN to continue.</p>
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
      return env.ASSETS.fetch(request);
    }

    return new Response(loginPage({ error: false, redirectTo: url.pathname + url.search }), {
      status: 401,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
};
