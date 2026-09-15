// Cloudflare Pages Function: password-gates the whole site with HTTP Basic
// Auth, checked server-side before any page or asset is served. This runs
// on Cloudflare Pages only; it has no effect on the GitHub Pages build.
//
// Set SITE_USERNAME and SITE_PASSWORD as encrypted environment variables
// (secrets) in the Cloudflare Pages project settings, not in this repo.

export async function onRequest(context) {
  const { request, env, next } = context;

  const validUser = env.SITE_USERNAME;
  const validPass = env.SITE_PASSWORD;

  if (!validUser || !validPass) {
    return new Response(
      "Site password not configured. Set SITE_USERNAME and SITE_PASSWORD in the Cloudflare Pages project settings.",
      { status: 500 }
    );
  }

  const auth = request.headers.get("Authorization");

  if (auth && auth.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    const separator = decoded.indexOf(":");
    const user = decoded.slice(0, separator);
    const pass = decoded.slice(separator + 1);

    if (user === validUser && pass === validPass) {
      return next();
    }
  }

  return new Response("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Noted"' },
  });
}
