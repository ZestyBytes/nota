import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const root=new URL('../',import.meta.url),scope='https://example.test/nota/';
const storage=new Map();
const key=r=>new URL(typeof r==='string'?r:r.url,scope).href;
const caches={async keys(){return [...storage.keys()]},async delete(n){return storage.delete(n)},async open(n){if(!storage.has(n))storage.set(n,new Map());const map=storage.get(n);return {async put(r,v){map.set(key(r),v.clone())},async match(r,options={}){const url=key(r);const found=options.ignoreSearch?[...map].find(([k])=>k.split('?')[0]===url.split('?')[0])?.[1]:map.get(url);return found?.clone()}}}};
const handlers={};let online=false,networkCount=0;
const context=vm.createContext({URL,Response,Promise,caches,console,location:{origin:'https://example.test'},self:{registration:{scope},addEventListener(type,fn){handlers[type]=fn},clients:{claim(){}},skipWaiting(){}},fetch:async()=>{networkCount++;if(!online)throw Error('offline');return new Response('network')}});
vm.runInContext(fs.readFileSync(new URL('sw.js',root),'utf8'),context);
async function request(path,destination='',mode='cors',cache='default'){let response;handlers.fetch({request:{url:new URL(path,scope).href,method:'GET',destination,mode,cache},respondWith(p){response=p}});return response&&await response}
const pack=await caches.open('noted-pack-test');
await pack.put(scope+'image.webp',new Response('photo'));
assert.equal((await request('image.webp','image')).type,'error','Incomplete packs must not be served');
await pack.put(scope+'offline-pack.json',new Response('{}'));
await pack.put(scope+'index.html',new Response('page'));
await pack.put(scope+'data.js',new Response('data'));
assert.equal(await (await request('image.webp','image')).text(),'photo');
assert.equal(await (await request('data.js')).text(),'data');
assert.equal(await (await request('./','','navigate')).text(),'page');
const shell=await caches.open('noted-shell-__BUILD__');await shell.put(scope+'app.js?v=home',new Response('cached code'));networkCount=0;
assert.equal(await (await request('app.js?v=home','script')).text(),'cached code');
assert.equal(networkCount,0,'A cached shell should not trigger a network request');
assert.equal(await request('app.js','', 'cors','reload'),undefined,'Explicit pack downloads bypass shell caching');
let activated;handlers.activate({waitUntil(p){activated=p}});await activated;
assert.ok((await caches.keys()).includes('noted-pack-test'),'Packs survive a new worker');
// Verify pack selection never downloads remote or out-of-scope attachments.
const offlineSource=fs.readFileSync(new URL('offline.js',root),'utf8').replaceAll('import.meta.url',JSON.stringify(scope+'offline.js')).replaceAll('export ','');
vm.runInContext(offlineSource,context);
const images=vm.runInContext(`packImages([{image:'assets/a.webp',images:[{src:'assets/a.webp'},{src:'https://elsewhere.test/private.jpg'},{src:'../outside.jpg'},{src:'vault-media/b.webp'}]}])`,context);
assert.deepEqual([...images],[scope+'assets/a.webp',scope+'vault-media/b.webp']);
console.log('Offline pack selection, completion guard, cache reuse and update survival passed');

// Exercise the save UI with a tiny DOM double: completion, failed downloads,
// cancellation and keeping the previous complete pack until its replacement.
class Panel {
  set innerHTML(value){this.html=value;this.status={textContent:''};const button={disabled:false},select={value:'0',disabled:false};this.form={button,select,querySelector:s=>s==='button'?button:select,append:node=>{this.cancel=node}}}
  get innerHTML(){return this.html}
  querySelector(s){return s==='form'?this.form:this.status}
  querySelectorAll(){return []}
}
context.window={caches};context.navigator={onLine:true,serviceWorker:{controller:{}}};
context.document={querySelectorAll(){return [{src:scope+'app.js?v=home'},{href:scope+'styles.css?v=home'}]},createElement(){return {remove(){}}}};
context.crypto=globalThis.crypto;context.AbortController=AbortController;context.setTimeout=setTimeout;context.clearTimeout=clearTimeout;
const fixture={entries:[{image:'assets/a.webp',occurredAt:'2026-09-04'}]};
context.panel=new Panel();context.fixture=fixture;
context.fetch=async()=>new Response('saved bytes');
await vm.runInContext('openOffline(panel,fixture)',context);
await context.panel.form.onsubmit({preventDefault(){},currentTarget:context.panel.form});
assert.match(context.panel.status.textContent,/is saved for offline reading/);
let packs=await vm.runInContext('savedPacks()',context);
assert.ok(packs.some(p=>p.key==='month:2026-09'&&p.intact));
const completedName=packs.find(p=>p.key==='month:2026-09').name;
context.fetch=async()=>new Response('missing',{status:404});
await context.panel.form.onsubmit({preventDefault(){},currentTarget:context.panel.form});
assert.match(context.panel.status.textContent,/could not be saved/);
assert.ok((await caches.keys()).includes(completedName),'Failed replacement keeps previous complete pack');
context.fetch=async(_url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Object.assign(Error('cancelled'),{name:'AbortError'}))));
const pending=context.panel.form.onsubmit({preventDefault(){},currentTarget:context.panel.form});
// Cancellation is exposed synchronously before network work starts.
context.panel.cancel.onclick();await pending;
assert.equal(context.panel.status.textContent,'Download cancelled.');
console.log('Offline UI success, failure, replacement preservation and cancellation passed');
