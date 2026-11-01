/* GitHub Pages sous /NOM-DU-DEPOT/ : cache uniquement la coque de l'application.
   Les réponses iTunes et les pochettes Apple ne sont jamais mises en cache ici. */
const CACHE='noteson-shell-macadam-v0.3.0';
const SHELL=['./','./index.html','./assets/style.css','./assets/app.mjs','./assets/core.mjs','./assets/storage.mjs','./assets/apple.mjs','./data/catalog.json','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  event.respondWith(fetch(req).then(response=>{if(response.ok&&new URL(req.url).pathname.startsWith(new URL(self.registration.scope).pathname)){
    const copy=response.clone();caches.open(CACHE).then(c=>c.put(req,copy));}
    return response;
  }).catch(()=>caches.match(req).then(cached=>cached||Response.error())));
});
