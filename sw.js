const CACHE="noted-shell-__BUILD__";
// Remote images live in their own cache, deliberately not stamped with the
// build: a deploy replaces the shell, but the covers should survive it.
const MEDIA="noted-media";
const SHELL=["./","index.html","styles.css?v=claw-game-1","shelf-fix.css?v=4","config.js","backend.js","app.js?v=collected-shelf-1","data.js","manifest.webmanifest","icon.svg"];

self.addEventListener("install",event=>{
  self.skipWaiting();
  // addAll fails the whole install if any one file 404s; fetch each on its own
  // so a missing extra never leaves the app without a cached shell.
  event.waitUntil(caches.open(CACHE).then(cache=>Promise.all(SHELL.map(url=>cache.add(url).catch(()=>{})))));
});
self.addEventListener("activate",event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE&&key!==MEDIA).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});

// key lets a cache-busted request (data.js?t=…) update the one plain entry
// instead of piling up a copy per timestamp.
function fresh(request,cache,key){
  return fetch(request,{cache:"no-store"}).then(response=>{
    if(response.ok)cache.put(key||request,response.clone());
    return response;
  });
}

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  // Every picture, wherever it comes from, lives in the media cache. This used
  // to apply to remote images only, so the archive's own photographs went into
  // the shell cache instead, which is stamped with the build and thrown away
  // on every deploy: each release re-downloaded every photograph in the app.
  // The media cache survives a deploy, because a photograph does not change
  // when the code does.
  if(request.destination==="image"){
    event.respondWith(caches.open(MEDIA).then(cache=>
      cache.match(request).then(hit=>hit||fetch(request).then(response=>{
        // an image may load no-cors, so its response is opaque: status 0,
        // still perfectly cacheable
        if(response.ok||response.type==="opaque")cache.put(request,response.clone());
        return response;
      }).catch(()=>hit))
    ));
    return;
  }
  // Anything else remote, such as the fonts, is left to the browser.
  if(url.origin!==location.origin)return;

  // version.json says which build is deployed. Never cached, or the check
  // that reads it could never see a new one.
  if(url.pathname.endsWith("/version.json")){
    event.respondWith(fetch(request,{cache:"no-store"}).catch(()=>new Response("{}",{headers:{"content-type":"application/json"}})));
    return;
  }

  // data.js is the live content feed. Network first so a fresh publish wins,
  // but keep a copy so the archive still opens with no connection at all.
  if(url.pathname.endsWith("/data.js")){
    const key=url.origin+url.pathname;
    event.respondWith(caches.open(CACHE).then(cache=>
      fresh(request,cache,key).catch(()=>cache.match(key))
    ));
    return;
  }

  // Video is left entirely to the browser. Caching it here would put a large
  // file in a cache that is thrown away on every deploy, and clips are fetched
  // with range requests, which a stored full response answers badly.
  if(request.destination==="video"||/\.(mp4|mov|m4v|webm)$/i.test(url.pathname))return;

  // Everything else: serve from cache immediately, refresh it in the
  // background. The app paints from disk and never waits on the network.
  event.respondWith(caches.open(CACHE).then(cache=>
    cache.match(request,{ignoreSearch:true}).then(cached=>{
      const network=fresh(request,cache).catch(()=>cached||caches.match("index.html"));
      return cached||network;
    })
  ));
});
