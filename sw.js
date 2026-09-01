const CACHE="nota-shell-__BUILD__";
const SHELL=["./","index.html","styles.css","config.js","backend.js","app.js","data.js","manifest.webmanifest","icon.svg"];

self.addEventListener("install",event=>{
  self.skipWaiting();
  // addAll fails the whole install if any one file 404s; fetch each on its own
  // so a missing extra never leaves the app without a cached shell.
  event.waitUntil(caches.open(CACHE).then(cache=>Promise.all(SHELL.map(url=>cache.add(url).catch(()=>{})))));
});
self.addEventListener("activate",event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))),
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
  if(url.origin!==location.origin)return; // fonts and anything remote: leave to the browser

  // data.js is the live content feed. Network first so a fresh publish wins,
  // but keep a copy so the archive still opens with no connection at all.
  if(url.pathname.endsWith("/data.js")){
    const key=url.origin+url.pathname;
    event.respondWith(caches.open(CACHE).then(cache=>
      fresh(request,cache,key).catch(()=>cache.match(key))
    ));
    return;
  }

  // Everything else: serve from cache immediately, refresh it in the
  // background. The app paints from disk and never waits on the network.
  event.respondWith(caches.open(CACHE).then(cache=>
    cache.match(request,{ignoreSearch:true}).then(cached=>{
      const network=fresh(request,cache).catch(()=>cached||caches.match("index.html"));
      return cached||network;
    })
  ));
});
