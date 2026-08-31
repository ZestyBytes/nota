const CACHE="nota-shell-__BUILD__";
const SHELL=["./","index.html","styles.css","config.js","backend.js","app.js","manifest.webmanifest","icon.svg"];

self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));
});
self.addEventListener("activate",event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  // data.js is the live content feed — never cache it, always go to the
  // network, so a fresh publish shows up without clearing anything.
  if(new URL(event.request.url).pathname.endsWith("/data.js")){
    event.respondWith(fetch(event.request,{cache:"no-store"}));
    return;
  }
  event.respondWith(fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    return response;
  }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match("index.html"))));
});
