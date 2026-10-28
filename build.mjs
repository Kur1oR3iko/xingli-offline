import { build } from 'esbuild';
import { mkdir, cp, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true});
await build({entryPoints:['src/app.js'],bundle:true,outfile:'dist/app.js',format:'iife',target:['safari17'],minify:true,legalComments:'eof'});
const files=['index.html','app.js','style.css','manifest.json','icon.svg'];
const hash=createHash('sha256');hash.update(await readFile('build.mjs'));for(const f of files)hash.update(await readFile('dist/'+f));
const version=hash.digest('hex').slice(0,12);
// Versioned entry assets bypass stale caches when a Pages deployment changes.
const index=(await readFile('dist/index.html','utf8')).replace('./app.js',`./app.js?v=${version}`).replace('./style.css',`./style.css?v=${version}`);
await writeFile('dist/index.html',index);
const assets=[...files,'THIRD_PARTY_NOTICES.txt'].map(f=>'./'+f+(['app.js','style.css'].includes(f)?'?v='+version:''));
await writeFile('dist/sw.js',`const PREFIX='xinglu-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';const CACHE=PREFIX+'${version}';const FILES=${JSON.stringify(assets)};self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.href.startsWith(self.registration.scope))return;const key=e.request.mode==='navigate'?new URL('./index.html',self.registration.scope).href:e.request;e.respondWith(caches.open(CACHE).then(async c=>{if(e.request.mode!=='navigate'){const cached=await c.match(key);if(cached)return cached;}try{const r=await fetch(e.request);if(r.ok)await c.put(key,r.clone());return r;}catch(err){const cached=await c.match(key);if(cached)return cached;throw err;}}))});`);
await cp('dist','ios/Web',{recursive:true});
console.log('Offline bundle written to dist; cache version:',version);
