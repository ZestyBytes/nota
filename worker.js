// Password-gates the whole site with HTTP Basic Auth, checked here before
// any static asset is served. Set SITE_USERNAME and SITE_PASSWORD as
// encrypted secrets on this Worker, not in this repo. Has no effect on the
// separate GitHub Pages build.

export default {
  async fetch(request, env) {
    const validUser = env.SITE_USERNAME;
    const validPass = env.SITE_PASSWORD;

    if (!validUser || !validPass) {
      return new Response(
        "Site password not configured. Set SITE_USERNAME and SITE_PASSWORD as secrets on this Worker.",
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
        return env.ASSETS.fetch(request);
      }
    }

    return new Response("Authentication required.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Noted"' },
    });
  },
};
