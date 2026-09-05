// Loaded only when the reader opens offline saving. No background downloads.
const PREFIX='noted-pack-';
const META=new URL('./offline-pack.json',import.meta.url).href;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const base=new URL('./',import.meta.url);
const local=src=>{try{const u=new URL(src,base);return u.origin===base.origin&&u.pathname.startsWith(base.pathname)?u.href:null}catch{return null}};
export function packImages(entries){return [...new Set(entries.flatMap(e=>[e.image,...(e.images||[]).map(i=>i.src)]).filter(Boolean).map(local).filter(Boolean))]}
async function savedPacks(){
  const packs=[];
  for(const name of (await caches.keys()).filter(n=>n.startsWith(PREFIX))){const cache=await caches.open(name),response=await cache.match(META);if(response){let meta;try{meta=await response.json()}catch{continue}if(!Array.isArray(meta.urls)||!meta.key)continue;const intact=(await Promise.all(meta.urls.map(u=>cache.match(u)))).every(Boolean);packs.push({...meta,name,intact})}}
  return packs;
}
export async function openOffline(panel,data){
  if(!panel)return;
  if(!('caches' in window)||!('serviceWorker' in navigator)){panel.innerHTML='<p class="offline-note">Offline saving is not available in this browser.</p>';return}
  const months=[...new Set(data.entries.map(e=>(e.occurredAt||e.createdAt||'').slice(0,7)).filter(Boolean))].sort().reverse();
  const journeys=[...new Set(data.entries.map(e=>e.journey).filter(Boolean))].sort();
  const choices=[...months.map(m=>({label:new Date(m+'-01T12:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'}),items:data.entries.filter(e=>(e.occurredAt||e.createdAt||'').startsWith(m)),key:'month:'+m})),...journeys.map(j=>({label:j,items:data.entries.filter(e=>e.journey===j),key:'journey:'+j}))];
  const packs=await savedPacks();
  panel.innerHTML=`<p class="offline-note">Save a month or journey with its photographs. Text throughout the archive is included. Videos, music players and external images need a connection. Your browser may clear saved files if storage runs low.</p><form class="offline-form"><label>Month or journey<select aria-label="Month or journey">${choices.map((c,i)=>`<option value="${i}">${esc(c.label)}</option>`).join('')}</select></label><button ${choices.length?'':'disabled'}>Save on this device</button></form><p class="offline-status" role="status"></p><ul class="offline-saved">${packs.map(p=>`<li><span>${esc(p.label)}<small>${p.intact?'Saved':'Needs downloading again'} · ${new Date(p.saved).toLocaleDateString('en-GB')} · ${(p.bytes/1048576).toFixed(1)} MB</small></span><button type="button" data-remove-pack="${esc(p.name)}">Remove</button></li>`).join('')}</ul>`;
  panel.querySelectorAll('[data-remove-pack]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{await caches.delete(button.dataset.removePack);await openOffline(panel,data)}catch{button.disabled=false;panel.querySelector('.offline-status').textContent='Could not remove the saved files. Try again.'}});
  panel.querySelector('form').onsubmit=async event=>{
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('button'),choice=choices[Number(form.querySelector('select').value)],status=panel.querySelector('.offline-status');
    if(!choice)return;button.disabled=true;form.querySelector('select').disabled=true;
    panel.querySelectorAll('[data-remove-pack]').forEach(b=>b.disabled=true);
    const name=PREFIX+crypto.randomUUID(),controller=new AbortController();let aborted=false;
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel download';cancel.onclick=()=>{aborted=true;controller.abort()};form.append(cancel);
    try{
      if(!navigator.onLine)throw Error('Connect to the internet to save a pack.');
      if(!navigator.serviceWorker.controller)throw Error('Reload the app once, then try saving again.');
      const cache=await caches.open(name);
      const shell=['index.html','data.js','manifest.webmanifest','icon.svg',import.meta.url,...[...document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(el=>el.src||el.href)].map(local).filter(Boolean);
      const urls=[...new Set([...shell,...packImages(choice.items)])];let done=0,bytes=0;
      // Two requests at a time keeps mobile connections responsive.
      const queue=[...urls];
      const worker=async()=>{while(queue.length){if(aborted)throw Error('Download cancelled.');const url=queue.shift();const timer=setTimeout(()=>controller.abort(),30000);let response;try{response=await fetch(url,{signal:controller.signal,cache:'reload'})}finally{clearTimeout(timer)}if(!response.ok)throw Error('A file could not be saved. Try again when connected.');const body=await response.clone().arrayBuffer();bytes+=body.byteLength;await cache.put(url,response);status.textContent=`Saving ${++done} of ${urls.length} files…`}};
      const results=await Promise.allSettled([worker(),worker()]);const failure=results.find(r=>r.status==='rejected');if(failure)throw failure.reason;
      await cache.put(META,new Response(JSON.stringify({label:choice.label,key:choice.key,saved:Date.now(),bytes,urls}),{headers:{'content-type':'application/json'}}));
      // Keep an old complete copy until the replacement has finished.
      for(const old of packs.filter(p=>p.key===choice.key))await caches.delete(old.name);
      await openOffline(panel,data);panel.querySelector('.offline-status').textContent=`${choice.label} is saved for offline reading.`;
    }catch(error){await caches.delete(name);status.textContent=aborted?'Download cancelled.':error.name==='AbortError'?'Download timed out. Please try again.':error.message;button.disabled=false;form.querySelector('select').disabled=false;panel.querySelectorAll('[data-remove-pack]').forEach(b=>b.disabled=false);cancel.remove()}
  };
}
