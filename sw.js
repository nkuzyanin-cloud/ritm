const CACHE = "ritm-shell-v6";
const SHELL = ["./","./index.html","./style.css","./app.js","./model.js","./manifest.webmanifest","./assets/icon-192.png","./assets/icon-512.png","./assets/breath.webp","./assets/citrus.webp","./assets/water.webp"];
SHELL.push("./village-model.js","./village.js","./village-roads.js");
SHELL.push(...["alpine","balloons","bridge","camp","construction-cover","fountain","frame","funicular","garden","gardens","greenhouse","house","island","lighthouse","market","mill","observatory","pier","river-dock","river-valley","ship","shipyard","station","theater","train","tram","tunnel","viaduct","well","wheat-field","workshop"].map(name=>"./assets/village/"+name+".webp"));
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("ritm-shell-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=="GET"||url.origin!==self.location.origin||!SHELL.some(path=>new URL(path,self.location.href).pathname===url.pathname))return;
  if(e.request.mode==="navigate"){e.respondWith(fetch(e.request).catch(()=>caches.match("./index.html")));return;}
  e.respondWith(caches.match(e.request).then(item=>item??fetch(e.request)));
});
