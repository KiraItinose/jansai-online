'use strict';
const PREFIX='jansuno:'+self.registration.scope+':';
const CACHE=PREFIX+'0.5.7-cloudflare-ws2-routefix';
const FILES=['./','index.html','jansuno-room-v0.5.7.html','jansuno-play-v0.5.7.html','webgl-table.js','webgl-table.css','sample-atlas.js','vendor/three.min.js','mobile.css','lobby.css','refinements.css','online.html','online.js','online.css','branding/jansai-logo.png','portraits/gold.png','portraits/rose.png','portraits/silver.png','portraits/violet.png','chinchiro-motion.js','app-shell.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png'];
const URLS=FILES.map(p=>new URL(p,self.registration.scope).href);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(URLS))));
// No forced activation or reload during a match. Updates activate once the old clients have closed.
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// Navigations are network-first; the offline cache remains a fallback.
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);url.hash='';
  if(!URLS.includes(url.href))return;
  e.respondWith(caches.open(CACHE).then(async c=>{
    if(e.request.mode==='navigate'){
      try{
        const response=await fetch(e.request);
        if(response.ok)await c.put(url.href,response.clone());
        return response;
      }catch{
        return (await c.match(url.href))||Response.error();
      }
    }
    return (await c.match(url.href))||fetch(e.request);
  }));
});
