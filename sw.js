const CACHE = "ritm-shell-v2";
const SHELL = ["./","./index.html","./style.css","./app.js","./model.js","./manifest.webmanifest","./assets/icon-192.png","./assets/icon-512.png","./assets/breath.webp","./assets/citrus.webp","./assets/water.webp"];
SHELL.push("./village-model.js","./village.js",...["./assets/village/alpine.webp", "./assets/village/balloons.webp", "./assets/village/bridge.webp", "./assets/village/camp.webp", "./assets/village/fountain.webp", "./assets/village/frame.webp", "./assets/village/funicular.webp", "./assets/village/garden.webp", "./assets/village/gardens.webp", "./assets/village/greenhouse.webp", "./assets/village/house.webp", "./assets/village/island.webp", "./assets/village/lighthouse.webp", "./assets/village/market.webp", "./assets/village/mill.webp", "./assets/village/observatory.webp", "./assets/village/pier.webp", "./assets/village/river.webp", "./assets/village/ship.webp", "./assets/village/shipyard.webp", "./assets/village/station.webp", "./assets/village/theater.webp", "./assets/village/train.webp", "./assets/village/tram.webp", "./assets/village/tunnel.webp", "./assets/village/viaduct.webp", "./assets/village/well.webp", "./assets/village/workshop.webp"]);
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("ritm-shell-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=="GET"||url.origin!==self.location.origin||!SHELL.some(path=>new URL(path,self.location.href).pathname===url.pathname))return;
  if(e.request.mode==="navigate"){e.respondWith(fetch(e.request).catch(()=>caches.match("./index.html")));return;}
  e.respondWith(caches.match(e.request).then(item=>item??fetch(e.request)));
});
