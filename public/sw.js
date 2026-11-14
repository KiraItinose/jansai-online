'use strict';
const PREFIX='jansuno:'+self.registration.scope+':';
const CACHE=PREFIX+'0.5.7-cloudflare-ws20-real-dice';
const FILES=['./','index.html','jansuno-room-v0.5.7.html','jansuno-play-v0.5.7.html','webgl-table.js','webgl-table.css','sample-atlas.js','vendor/three.min.js','mobile.css','lobby.css','refinements.css','online.html','online.js','online.css','branding/jansai-logo.png','portraits/gold.png','portraits/rose.png','portraits/silver.png','portraits/violet.png','chinchiro-motion.js','chinchiro-canvas.js','chinchiro-real-dice.css','dice-textures/face-1.png','dice-textures/face-2.png','dice-textures/face-3.png','dice-textures/face-4.png','dice-textures/face-5.png','dice-textures/face-6.png','app-shell.js','jansai-ui-next.js','jansai-ui-next.css','jansai-mobile-v5.css','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png'];
const URLS=FILES.map(p=>new URL(p,self.registration.scope).href);
// Precache first, then activate the new fetch strategy without reloading a running match.
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(URLS)).then(()=>self.skipWaiting())));
// No forced activation or reload during a match. Updates activate once the old clients have closed.
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// HTML and small interactive assets prefer the current deployment to stale PWA caches.
// Bulky artwork remains cache-first to save bandwidth.
const FRESH_PATHS=new Set(['/webgl-table.css','/webgl-table.js','/online.js','/app-shell.js','/chinchiro-motion.js','/chinchiro-canvas.js','/chinchiro-real-dice.css','/lobby.css','/refinements.css','/jansai-ui-next.js','/jansai-ui-next.css','/jansai-mobile-v5.css']);
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const url=new URL(e.request.url);url.hash='';
 if(!URLS.includes(url.href))return;
 e.respondWith(caches.open(CACHE).then(async cache=>{
  if(e.request.mode==='navigate'||FRESH_PATHS.has(url.pathname)){
   try{
    const response=await fetch(e.request);
    if(response.ok)await cache.put(url.href,response.clone());
    return response;
   }catch{
    return (await cache.match(url.href))||Response.error();
   }
  }
  return (await cache.match(url.href))||fetch(e.request);
 }));
});
