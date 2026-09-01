// Fall back to an empty archive rather than throwing: if data.js is ever
// missing (a first visit that went offline mid-load) the shell still opens.
const BASE = window.NOTA_DATA || { topics:{}, entries:[], tasks:[], books:[] };
const now = new Date(), todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
let savedSort="items";try{savedSort=localStorage.getItem("nota-topic-sort")||"items"}catch(error){/* private mode: fall back to the default */}
const state = { route:"today", topicSort:savedSort, month:new Date(now.getFullYear(),now.getMonth(),1), selectedDate:todayKey, library:"reading", search:"", filter:"all", data:clone(BASE), user:null, booting:NotaBackend.configured };
function clone(v){return JSON.parse(JSON.stringify(v))}
function emptyArchive(){return {topics:clone(BASE.topics),entries:[],tasks:[],books:[]}}
function esc(s=""){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
// Just enough Markdown for a note body: escape first, then re-introduce the
// handful of marks the vault actually uses. Images already shown above the
// text, as a photograph or a gallery, are skipped here.
function inline(t){return esc(t).replace(/\[\[([^\]|]+)\|?[^\]]*\]\]/g,"$1").replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g,"$1<em>$2</em>").replace(/\[([^\]]+)\]\(([^)]+)\)/g,"$1")}
function markdown(src="",shown=[]){
  const out=[];let para=[],list=[],rows=[];
  const flushPara=()=>{if(para.length){out.push(`<p>${inline(para.join(" "))}</p>`);para=[]}};
  const flushList=()=>{if(list.length){out.push(`<ul>${list.map(i=>`<li>${inline(i)}</li>`).join("")}</ul>`);list=[]}};
  for(const raw of String(src).split("\n")){
    const t=raw.trim();
    if(!t){flushPara();flushList();continue}
    if(t.startsWith("![")){
      flushPara();flushList();
      const m=t.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      // the lead image is already shown above the text; the rest belong here
      if(m&&!shown.includes(m[2]))out.push(`<figure class="body-figure"><img src="${esc(m[2])}" alt="${esc(m[1])}" loading="lazy">${m[1]?`<figcaption>${esc(m[1])}</figcaption>`:""}</figure>`);
      continue;
    }
    if(t.startsWith("#")){flushPara();flushList();out.push(`<h3>${inline(t.replace(/^#+\s*/,""))}</h3>`);continue}
    if(t.startsWith(">")){flushPara();flushList();out.push(`<blockquote>${inline(t.replace(/^>\s*/,""))}</blockquote>`);continue}
    if(t.startsWith("|")&&t.endsWith("|")){flushPara();flushList();rows.push(t);continue}
    if(rows.length){out.push(table(rows));rows=[]}
    if(t.startsWith("- ")){flushPara();list.push(t.slice(2));continue}
    flushList();para.push(t);
  }
  flushPara();flushList();if(rows.length)out.push(table(rows));
  return out.join("");
}
// A pipe table was printing its pipes as prose; render it as a table.
function table(rows){
  const cells=r=>r.replace(/^\||\|$/g,"").split("|").map(c=>c.trim());
  const body=rows.filter(r=>!/^\|[\s|:-]+\|$/.test(r));
  if(!body.length)return "";
  const [head,...rest]=body;
  return `<div class="table-wrap"><table><thead><tr>${cells(head).map(c=>`<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rest.map(r=>`<tr>${cells(r).map(c=>`<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function topic(id){return state.data.topics[id]||{name:id,color:"#777",soft:"#eee"}}
function icon(name){const paths={leaf:'<path d="M20 4C12 4 6 8 6 15c0 3 2 5 5 5 7 0 9-8 9-16Z"/><path d="M5 21c3-6 7-9 12-12"/>',music:'<path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>',terminal:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3m6 0h4"/>',mind:'<path d="M12 21s-8-4.5-8-11a4 4 0 0 1 7-2.6A4 4 0 0 1 20 10c0 6.5-8 11-8 11Z"/><path d="M7 13h3l1.5-3 2 6 1.5-3h3"/>',book:'<path d="M4 5a3 3 0 0 1 3-3h12v18H7a3 3 0 0 1 0-6h12"/>',home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',fork:'<path d="M7 3v7m-3-7v4a3 3 0 0 0 6 0V3M7 10v11M17 3v18m0-18c3 3 3 8 0 10"/>',paperclip:'<path d="m21 11-8.5 8.5a6 6 0 0 1-8.5-8.5l9-9a4 4 0 0 1 5.7 5.7l-9 9a2 2 0 0 1-2.9-2.9L15 5.6"/>',quote:'<path d="M9 11H5a4 4 0 0 1 4-4v8a4 4 0 0 1-4 4M19 11h-4a4 4 0 0 1 4-4v8a4 4 0 0 1-4 4"/>',note:'<path d="M4 3h16v18H4zM8 8h8M8 12h8M8 16h5"/>',check:'<path d="m5 12 5 5 9-9"/>',photos:'<rect x="7" y="3" width="14" height="14" rx="1.5"/><path d="M17 21H4.5A1.5 1.5 0 0 1 3 19.5V7"/>',car:'<path d="M3 13.5h18"/><path d="M5 13.5 6.8 8A2 2 0 0 1 8.7 6.6h6.6A2 2 0 0 1 17.2 8L19 13.5"/><path d="M3.6 13.5v3.2a1 1 0 0 0 1 1h14.8a1 1 0 0 0 1-1v-3.2"/><circle cx="7.6" cy="17.6" r="1.5"/><circle cx="16.4" cy="17.6" r="1.5"/>',disc:'<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="2.3"/><path d="M12 3.4a8.6 8.6 0 0 1 8.6 8.6"/>',repeat:'<path d="M4 9.6A4.6 4.6 0 0 1 8.6 5h9"/><path d="m14.8 2.4 2.9 2.6-2.9 2.6"/><path d="M20 14.4A4.6 4.6 0 0 1 15.4 19h-9"/><path d="m9.2 16.4-2.9 2.6 2.9 2.6"/>',heart:'<path d="M12 20.3s-7.6-4.4-7.6-10a4.2 4.2 0 0 1 7.6-2.6 4.2 4.2 0 0 1 7.6 2.6c0 5.6-7.6 10-7.6 10Z"/>',cup:'<path d="M5 8.4h11v5.8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z"/><path d="M16 9.8h2.2a2.3 2.3 0 0 1 0 4.6H16"/><path d="M7.6 4.4v1.9M11 3.9v2.4M14.4 4.4v1.9"/>'};return `<svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.note}</svg>`}
function chips(ids=[]){return ids.map(id=>{const t=topic(id);return `<span class="chip" style="--topic:${t.color};--soft:${t.soft}">${esc(t.name)}</span>`}).join("")}
// Specimen-label date: 01 SEP 2026. The card had no date at all before.
const MONTHS=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
function fmtDate(iso){if(!iso)return"";const d=new Date(String(iso).slice(0,10)+"T12:00:00");return isNaN(d)?"":`${String(d.getDate()).padStart(2,"0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`}
function accNo(id){let h=0;for(const c of String(id))h=(h*31+c.charCodeAt(0))>>>0;return String(1000+h%9000)}
function ageTier(dateStr){if(!dateStr)return"";const days=(now-new Date(dateStr+"T12:00:00"))/864e5;return days>180?"archive":days>30?"aged":""}
function entryCard(e){const t=topic(e.topics?.[0]),attachment=e.attachments?.[0],age=ageTier(e.occurredAt),date=fmtDate(e.occurredAt||e.createdAt||e.dueAt);return `<article class="entry ${e.image?"has-thumb":""} ${age}" data-entry="${e.id}" style="--topic:${t.color}"><span class="acc-no">No. ${accNo(e.id)}</span><span class="mount-tag" style="background:${t.color}">${esc(t.name)}</span>${e.image?`<span class="thumb-wrap"><img class="entry-thumb" src="${e.image}" alt="${esc(e.imageAlt||"")}" loading="lazy">${e.images?.length>1?`<span class="thumb-count">${icon("photos")}${e.images.length}</span>`:""}</span>`:""}<div class="entry-copy"><div class="entry-meta"><span class="type-label">${esc(e.type)}</span>${date?`<span class="entry-date">${date}</span>`:""}${e.publishedAt||e.type==="Task"?"":`<span class="stamp stamp-private">private</span>`}</div><h3>${e.type==="Quote"?`“${esc(e.title)}”`:esc(e.title)}</h3>${e.author?`<p>${esc(e.author)}</p>`:e.excerpt?`<p>${esc(e.excerpt)}</p>`:""}${attachment?`<span class="attachment-inline">${icon("paperclip")}${esc(attachment.name)}</span>`:""}</div></article>`}
// A page-shaped placeholder rather than a spinner: same title block, same
// card metrics, so the real content lands in the space already held for it.
function skeletonEntry(){return `<div class="entry skeleton-entry"><div class="skeleton skeleton-line" style="width:34%;height:10px"></div><div class="skeleton skeleton-line" style="width:78%;height:26px;margin:14px 0 12px"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line"></div></div>`}
function skeletonPage(){return `<section class="skeleton-page"><div class="page-head"><div><div class="skeleton skeleton-line" style="width:120px;height:11px"></div><div class="skeleton skeleton-title"></div></div></div><h2 class="section-title">Entries</h2>${skeletonEntry().repeat(3)}</section>`}
// A note opts into a deck with `view: cards`. Split on ## headings when the
// note has them, otherwise one card per paragraph block, which is what a
// numbered list of points wants.
function cardBlocks(body=""){
  const blocks=String(body).split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean);
  if(!blocks.some(b=>b.startsWith("## ")))return blocks;
  const cards=[];
  for(const b of blocks){if(b.startsWith("## ")||!cards.length)cards.push(b);else cards[cards.length-1]+="\n\n"+b}
  return cards;
}
function cardDeck(body,shown=[]){
  const cards=cardBlocks(body);
  if(cards.length<2)return `<div class="detail-body">${markdown(body,shown)}</div>`;
  return `<div class="deck-wrap"><div class="deck" tabindex="0" role="group" aria-label="Swipe through ${cards.length} cards">${
    cards.map((c,i)=>`<article class="deck-card"><span class="deck-no">${String(i+1).padStart(2,"0")} / ${String(cards.length).padStart(2,"0")}</span><div class="deck-copy">${markdown(c,shown)}</div></article>`).join("")
  }</div><div class="deck-dots" aria-hidden="true">${cards.map((_,i)=>`<i class="${i?"":"on"}"></i>`).join("")}</div></div>`;
}
// `view: playlist` turns each bullet into a numbered row. An italic tail on
// a line becomes its second line, so "Dermot Kennedy, *Sonder*" reads as the
// artist with the record underneath.
function trackRow(raw,i){
  const m=raw.match(/^(.*?),?\s*\*([^*]+)\*\s*$/);
  const main=m?m[1].trim():raw,sub=m?m[2].trim():"";
  return `<li><span class="track-no">${String(i+1).padStart(2,"0")}</span><span class="track-copy"><b>${inline(main)}</b>${sub?`<small>${inline(sub)}</small>`:""}</span></li>`;
}
function bulletsOf(body=""){return String(body).split("\n").map(l=>l.trim()).filter(l=>l.startsWith("- ")).map(l=>l.slice(2))}
function playlistBody(body=""){
  const out=[];let items=[],para=[];
  const flushItems=()=>{if(items.length){out.push(`<ol class="tracklist">${items.map(trackRow).join("")}</ol>`);items=[]}};
  const flushPara=()=>{if(para.length){out.push(`<p>${inline(para.join(" "))}</p>`);para=[]}};
  for(const raw of String(body).split("\n")){
    const t=raw.trim();
    if(!t){flushPara();continue}
    if(t.startsWith("- ")){flushPara();items.push(t.slice(2));continue}
    if(t.startsWith("![")||t.startsWith("#")){continue}
    flushItems();para.push(t);
  }
  flushPara();flushItems();
  return out.join("");
}
// More than one photograph becomes a swipeable gallery with a counter, so a
// second image is not left buried below the text.
function gallery(images){
  return `<div class="gallery-wrap"><div class="gallery" tabindex="0" role="group" aria-label="${images.length} photographs">${
    images.map((im,i)=>`<figure class="gallery-shot"><img src="${esc(im.src)}" alt="${esc(im.alt||"")}" loading="${i?"lazy":"eager"}"><span class="gallery-no">${String(i+1).padStart(2,"0")} / ${String(images.length).padStart(2,"0")}</span></figure>`).join("")
  }</div><div class="gallery-dots" aria-hidden="true">${images.map((_,i)=>`<i class="${i?"":"on"}"></i>`).join("")}</div><p class="gallery-caption">${esc(images[0].alt||"")}</p></div>`;
}
// A recipe is read standing up in a kitchen: the facts first, then the
// shopping, then the steps. Ingredients tick off and are remembered, so you
// can put the phone down and come back to it.
function ticked(id){try{return JSON.parse(localStorage.getItem("nota-ticked-"+id)||"[]")}catch(error){return []}}
function recipeBody(e){
  const r=e.recipe,done=ticked(e.id);
  const facts=[["Time",r.time],["Serves",r.serves],["Difficulty",r.difficulty]].filter(([,v])=>v);
  return `${facts.length?`<dl class="recipe-facts">${facts.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(String(v))}</dd></div>`).join("")}</dl>`:""}
    ${e.excerpt?`<p class="recipe-lede">${esc(e.excerpt)}</p>`:""}
    ${r.ingredients?.length?`<section class="recipe-part"><h2 class="section-title">You will need</h2><ul class="ingredients">${r.ingredients.map((i,n)=>`<li class="${done.includes(n)?"got":""}" data-tick="${n}" data-recipe="${e.id}"><span class="tick" aria-hidden="true">${icon("check")}</span><span>${inline(i)}</span></li>`).join("")}</ul></section>`:""}
    ${r.method?.length?`<section class="recipe-part"><details class="method" open><summary><span class="section-title">Method</span><span class="method-count">${r.method.length} steps</span></summary><ol class="steps">${r.method.map(m=>`<li>${inline(m)}</li>`).join("")}</ol></details></section>`:""}`;
}
function entryPage(id){
  const e=[...state.data.entries,...state.data.tasks].find(x=>x.id===id);
  const back=state.returnTo||"#today";
  if(!e)return `<section><p class="back-link"><a href="${back}" data-back>Back</a></p><p class="empty">That entry is no longer in the archive.</p></section>`;
  const date=fmtDate(e.occurredAt||e.createdAt||e.dueAt),t=topic(e.topics?.[0]);
  return `<section class="entry-page" style="--topic:${t.color}">
    <p class="back-link"><a href="${back}" data-back>Back</a><button class="share-button" data-share="${esc(e.id)}" type="button">Share</button></p>
    <div class="entry-page-meta"><span class="type-label">${esc(e.type||"Task")}</span>${date?`<span class="entry-date">${date}</span>`:""}${e.publishedAt||e.type==="Task"?"":`<span class="stamp stamp-private">private</span>`}<span class="acc-no acc-no-page">No. ${accNo(e.id)}</span></div>
    ${e.images?.length>1?gallery(e.images):e.image?`<img class="detail-image" src="${e.image}" alt="${esc(e.imageAlt||"")}">`:""}
    <div class="chips">${chips(e.topics)}</div>
    <h1 class="entry-page-title">${e.type==="Quote"?`&ldquo;${esc(e.title)}&rdquo;`:esc(e.title)}</h1>
    ${e.author?`<p class="entry-page-author">${esc(e.author)}</p>`:""}
    ${(()=>{const shown=e.images?.length>1?e.images.map(i=>i.src):[e.image];return e.recipe?`<div class="detail-body recipe-body">${recipeBody(e)}</div>`:e.view==="cards"&&e.body?cardDeck(e.body,shown):`<div class="detail-body">${e.body?(e.view==="playlist"?playlistBody(e.body):markdown(e.body,shown)):`<p>${esc(e.excerpt||"Saved in your Nota archive.")}</p>`}</div>`})()}
    ${e.attachments?.length?`<div class="attachment-list"><p class="eyebrow">Attachments</p>${e.attachments.map((a,i)=>`<div>${icon("paperclip")}<span><b>${esc(a.name)}</b><small>${esc(a.kind)} &middot; ${esc(a.size)}</small></span><button type="button" data-view-attachment="${i}" data-entry-id="${e.id}">View</button></div>`).join("")}</div>`:""}
  </section>`;
}
// The postmark said the same thing as the header date, so the slot went to
// what is actually in progress. Falls back to the archive count when there
// is nothing on the go.
function todayWidget(){
  const book=state.data.books.find(b=>b.status==="reading");
  if(book)return `<button class="side-widget" data-book="${book.id}" aria-label="Open ${esc(book.title)}">
    <span class="eyebrow">Now reading</span>
    <span class="widget-row">${book.cover?`<img src="${book.cover}" alt="" loading="lazy">`:""}<span><b>${esc(book.title)}</b><small>${esc(book.author)}</small></span></span>
    <span class="widget-bar"><i style="width:${book.progress}%"></i></span>
    <span class="widget-foot">${book.progress}% through</span>
  </button>`;
  const open=state.data.tasks.filter(t=>!t.completedAt).length;
  return `<div class="side-widget side-widget-static">
    <span class="eyebrow">The archive</span>
    <span class="widget-figure">${state.data.entries.length}</span>
    <span class="widget-foot">entries kept${open?`, ${open} thing${open>1?"s":""} waiting`:""}</span>
  </div>`;
}
function pageHead(kicker,title,lede=""){return `<div class="page-head"><div><p class="eyebrow">${kicker}</p><h1 class="page-title">${title}</h1>${lede?`<p class="lede">${lede}</p>`:""}</div></div>`}
function today(){const entries=state.data.entries.filter(e=>e.occurredAt===todayKey),lastYear=`${now.getFullYear()-1}-${todayKey.slice(5)}`,memory=state.data.entries.find(e=>e.occurredAt===lastYear),quote=state.data.entries.find(e=>e.type==="Quote"),label=now.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});const recent=entries.length?[]:[...state.data.entries].sort((a,b)=>(b.occurredAt||"").localeCompare(a.occurredAt||"")).slice(0,3);return `<section><div class="page-head"><div><p class="eyebrow">A record of a life</p><h1 class="page-title">Today</h1></div>${todayWidget()}</div>${memory?`<div class="memory">On this day last year: <a href="#" data-entry="${memory.id}">${esc(memory.title)}</a></div>`:""}<div class="today-grid"><div><h2 class="section-title">Entries</h2>${entries.length?`<div class="entry-list">${entries.map(entryCard).join("")}</div>`:recent.length?`<p class="empty small">Nothing recorded today yet. Here's what's most recent.</p><div class="entry-list">${recent.map(entryCard).join("")}</div>`:`<p class="empty">Nothing recorded yet. Publish your first entry from Obsidian to see it here.</p>`}</div><aside><h2 class="section-title">To-do</h2><div class="tasks">${state.data.tasks.length?state.data.tasks.map(taskRow).join(""):`<p class="empty small">Nothing waiting.</p>`}</div>${quote?`<div class="quote-card"><p class="eyebrow">A thought to keep</p><blockquote>“${esc(quote.title)}”</blockquote><cite>${esc(quote.author)}</cite></div>`:""}</aside></div></section>`}
function taskRow(t){const tp=topic(t.topics[0]);return `<div class="task ${t.completedAt?"done":""}"><span class="task-mark" aria-hidden="true">${t.completedAt?icon("check"):""}</span><span class="task-title">${esc(t.title)}</span><span class="chip" style="--topic:${tp.color};--soft:${tp.soft}">${esc(tp.name)}</span></div>`}
function monthEntries(date){return state.data.entries.filter(e=>e.occurredAt===date)}
function calendar(){const y=state.month.getFullYear(),m=state.month.getMonth(),first=new Date(y,m,1),start=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate(),cells=[];for(let i=0;i<start;i++)cells.push(`<button class="day muted" disabled></button>`);for(let d=1;d<=days;d++){const date=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`,es=monthEntries(date),dots=[...new Set(es.flatMap(e=>e.topics))].slice(0,3).map(id=>`<i class="dot" style="background:${topic(id).color}"></i>`).join("");cells.push(`<button class="day ${date===state.selectedDate?"selected":""}" data-date="${date}"><span>${d}</span><span class="dots">${dots}</span></button>`)}const selected=monthEntries(state.selectedDate),label=new Date(state.selectedDate+"T12:00:00").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});return `<section>${pageHead("Browse the archive","Calendar","Every item keeps its own dates; the calendar simply gathers the record of each day.")}<div class="calendar-shell"><div><div class="calendar-head"><button class="icon-button" data-month="-1" aria-label="Previous month">←</button><h2>${first.toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</h2><button class="icon-button" data-month="1" aria-label="Next month">→</button></div><div class="week">${["M","T","W","T","F","S","S"].map(x=>`<span>${x}</span>`).join("")}</div><div class="calendar-grid">${cells.join("")}</div></div><aside class="selected-day"><p class="eyebrow">Selected day</p><h3>${label}</h3>${selected.length?selected.map(entryCard).join(""):`<p class="empty">Nothing recorded on this day.</p>`}</aside></div></section>`}
// No cover art in the vault, and stock photographs of other people's
// bookshelves say nothing about the book. A plate set in the archive's own
// type carries the title, the author and the topic's ink instead.
function coverPlate(b){
  const t=topic(b.topics?.[0]);
  return `<div class="book-cover book-plate" style="--topic:${t.color}" aria-hidden="true"><span class="plate-rule"></span><span class="plate-mark">${esc((b.title||"?")[0])}</span><span class="plate-title">${esc(b.title)}</span></div>`;
}
function library(){let body="";if(state.library==="reading")body=`<div class="book-grid">${state.data.books.map((b,i)=>`<article class="book ${b.cover?"":"has-plate"}" data-book="${b.id}"><span class="acc-no">No. ${accNo(b.id)}</span>${b.cover?`<img class="book-cover" src="${b.cover}" alt="" loading="lazy">`:coverPlate(b)}<div class="book-copy"><h3>${esc(b.title)}</h3><p>${esc(b.author)}</p><div class="book-links"><span>${(b.notes||[]).length} notes</span><span>${(b.quotes||[]).length} quotes</span></div><span class="status">${esc(b.status.replaceAll("-"," "))}${b.status==="reading"?` · ${b.progress}%`:""}</span><div class="progress"><i style="width:${b.progress}%"></i></div></div></article>`).join("")||`<p class="empty">Your library is empty.</p>`}</div>`;else if(state.library==="quotes")body=`<div class="quote-list">${[...state.data.entries.filter(e=>e.type==="Quote"),...state.data.books.flatMap(b=>(b.quotes||[]).map(q=>({...q,title:q.text,author:b.title,bookId:b.id})))].map(e=>`<blockquote class="library-quote" ${e.bookId?`data-book="${e.bookId}"`:`data-entry="${e.id}"`}>“${esc(e.title)}”<cite>${esc(e.author)}${e.page?` · ${esc(e.page)}`:""}</cite></blockquote>`).join("")||`<p class="empty">No quotations kept yet.</p>`}</div>`;else body=`<div class="entry-list">${state.data.entries.filter(e=>["Note","Journal","Journey"].includes(e.type)).map(entryCard).join("")||`<p class="empty">No notes kept yet.</p>`}</div>`;return `<section>${pageHead("Things worth keeping","Library","Books hold their own reading notes and quotations while each quote remains discoverable across Nota.")}<div class="library-tabs">${["reading","quotes","notes"].map(x=>`<button class="filter ${state.library===x?"active":""}" data-library="${x}">${x[0].toUpperCase()+x.slice(1)}</button>`).join("")}</div>${body}</section>`}
// A topic may hold sub-topics: Self care covers ADHD, and later therapy,
// fitness, the dentist. A parent counts and shows its children's items too.
function childTopics(id){return Object.entries(state.data.topics).filter(([,t])=>t.parent===id).map(([slug])=>slug)}
function topicFamily(id){return [id,...childTopics(id)]}
function inTopic(item,id){const fam=topicFamily(id);return item.topics?.some(t=>fam.includes(t))}
// counts tasks too: a topic reaches this page if anything at all uses it,
// so leaving tasks out showed a live topic as holding nothing
function topicCount(id){return state.data.entries.filter(e=>inTopic(e,id)).length+state.data.books.filter(b=>inTopic(b,id)).length+state.data.tasks.filter(t=>inTopic(t,id)).length}
function topicLatest(id){return state.data.entries.filter(e=>inTopic(e,id)).map(e=>e.occurredAt||e.createdAt||"").sort().pop()||""}
function topics(){
  const sorts={items:"Most kept",name:"A to Z",recent:"Recent"};
  const list=Object.entries(state.data.topics).filter(([,t])=>!t.parent).map(([id,t])=>({id,t,count:topicCount(id),latest:topicLatest(id),kids:childTopics(id)}));
  list.sort((a,b)=>state.topicSort==="name"?a.t.name.localeCompare(b.t.name)
    :state.topicSort==="recent"?(b.latest||"").localeCompare(a.latest||"")||b.count-a.count
    :b.count-a.count||a.t.name.localeCompare(b.t.name));
  return `<section>${pageHead("Paths through the archive","Topics","Each topic has a quiet default appearance, or an optional view shaped around its material, without changing the underlying taxonomy.")}<div class="search-filters topic-sort">${Object.entries(sorts).map(([k,label])=>`<button class="filter ${state.topicSort===k?"active":""}" data-topicsort="${k}">${label}</button>`).join("")}</div><div class="topic-grid">${list.map(({id,t,count,latest,kids})=>`<button class="topic-card" data-topic="${id}" style="--topic:${t.color};--soft:${t.soft}">${t.icon?`<span class="topic-motif" aria-hidden="true">${icon(t.icon)}</span>`:`<span class="topic-mark" aria-hidden="true">${esc(t.name[0])}</span>`}<span class="topic-count">${count} ${count===1?"item":"items"}</span><h2>${esc(t.name)}</h2><p>${esc(t.description)}</p>${kids.length?`<span class="topic-kids">${kids.map(k=>`<span class="kid" data-topic="${k}" style="--topic:${state.data.topics[k].color}">${esc(state.data.topics[k].name)}</span>`).join("")}</span>`:""}<span class="topic-foot">${t.mode?"Tailored view":latest?fmtDate(latest):"&nbsp;"}</span></button>`).join("")}</div></section>`;
}
function search(){const q=state.search.toLowerCase(),pool=[...state.data.entries,...state.data.tasks.map(t=>({...t,type:"Task",excerpt:""}))],present=new Set(pool.map(x=>x.type)),types=["all",...["Journal","Note","Reading","Quote","Journey","Task","Event"].filter(t=>present.has(t))],items=pool.filter(e=>(state.filter==="all"||e.type===state.filter)&&(!q||[e.title,e.excerpt,e.author,...(e.topics||[]).map(x=>topic(x).name)].join(" ").toLowerCase().includes(q)));return `<section>${pageHead("Find anything","Search","Search across titles, words, types and topics.")}<input class="search-box" type="search" value="${esc(state.search)}" placeholder="Search nota…" autofocus><div class="search-filters">${types.map(t=>`<button class="filter ${state.filter===t?"active":""}" data-filter="${t}">${t}</button>`).join("")}</div><div class="entry-list search-results">${items.length?items.map(entryCard).join(""):`<p class="empty">No matching records.</p>`}</div></section>`}
function writing(){const items=state.data.entries.filter(e=>e.publishedAt);return `<section class="writing-page">${pageHead("Selected writing","Writing","Notes and journal entries deliberately shared from the private archive.")}<div class="entry-list">${items.map(entryCard).join("")||`<p class="empty">Nothing has been published yet.</p>`}</div></section>`}
function topicView(id){const t=topic(id),kids=childTopics(id),items=state.data.entries.filter(e=>inTopic(e,id)),books=state.data.books.filter(b=>inTopic(b,id));let body=`<div class="entry-list">${items.map(entryCard).join("")||(books.length?"":`<p class="empty">Nothing in this topic yet.</p>`)}</div>`;if(t.mode==="listen"){
    const groups=items.map(e=>({e,rows:bulletsOf(e.body)})).filter(g=>g.rows.length);
    const rest=items.filter(e=>!bulletsOf(e.body).length);
    body=`<div class="topic-mode listen-mode">${groups.map(({e,rows})=>`<section class="listen-group"><div class="listen-head"><h3><a href="#entry/${encodeURIComponent(e.id)}">${esc(e.title)}</a></h3><span>${rows.length} ${rows.length===1?"entry":"entries"}</span></div><ol class="tracklist">${rows.map(trackRow).join("")}</ol></section>`).join("")||`<p class="empty">Nothing in this topic yet.</p>`}${rest.length?`<div class="entry-list listen-rest">${rest.map(entryCard).join("")}</div>`:""}</div>`;
  }
  if(t.mode==="tech")body=`<div class="topic-mode tech-mode"><div class="mode-note"><p>Technical notes keep the same Nota structure, with files and dated logs presented in a more useful form.</p></div>${body}</div>`;if(t.mode==="recipes")body=`<div class="topic-mode recipe-mode">${items.map(e=>e.recipe?`<article class="recipe-card" data-entry="${e.id}">${e.image?`<img src="${e.image}" alt="${esc(e.imageAlt)}">`:""}<div><p class="eyebrow">Recipe note</p><h2>${esc(e.title)}</h2><div class="recipe-facts"><span>${esc(e.recipe.time)}</span><span>Serves ${esc(e.recipe.serves)}</span><span>${esc(e.recipe.difficulty)}</span></div><p>${esc(e.excerpt)}</p><h3>You'll need</h3><p>${e.recipe.ingredients.map(esc).join(" · ")}</p></div></article>`:entryCard(e)).join("")||`<p class="empty">No recipes yet.</p>`}</div>`;const bookSection=books.length?`<h2 class="section-title">Books</h2><div class="book-grid">${books.map((b,i)=>`<article class="book ${b.cover?"":"has-plate"}" data-book="${b.id}"><span class="acc-no">No. ${accNo(b.id)}</span>${b.cover?`<img class="book-cover" src="${b.cover}" alt="" loading="lazy">`:coverPlate(b)}<div class="book-copy"><h3>${esc(b.title)}</h3><p>${esc(b.author)}</p><span class="status">${esc(b.status.replaceAll("-"," "))}${b.status==="reading"?` · ${b.progress}%`:""}</span><div class="progress"><i style="width:${b.progress}%"></i></div></div></article>`).join("")}</div>`:"";return `<section class="topic-page" style="--topic:${t.color};--soft:${t.soft}"><p class="back-link"><a href="${state.returnTo||"#topics"}" data-back>Back</a></p>${t.icon?`<span class="topic-motif topic-motif-page" aria-hidden="true">${icon(t.icon)}</span>`:`<span class="topic-mark topic-mark-page" aria-hidden="true">${esc(t.name[0])}</span>`}<div class="page-head"><div><p class="eyebrow">Topic${t.mode?" · tailored view":""}</p><h1 class="page-title" style="color:${t.color}">${esc(t.name)}</h1><p class="lede">${esc(t.description)}</p>${kids.length?`<p class="topic-kids topic-kids-page">${kids.map(k=>`<span class="kid" data-topic="${k}" style="--topic:${state.data.topics[k].color}">${esc(state.data.topics[k].name)}</span>`).join("")}</p>`:""}${t.parent&&state.data.topics[t.parent]?`<p class="topic-parent">Part of <span class="kid" data-topic="${t.parent}" style="--topic:${state.data.topics[t.parent].color}">${esc(state.data.topics[t.parent].name)}</span></p>`:""}</div></div>${body}${bookSection}</section>`}
function authScreen(){return `<section class="auth-shell"><div class="auth-intro"><p class="eyebrow">Your private archive</p><h1 class="page-title">Welcome to nota.</h1><p class="lede">Days, thoughts, books and things worth keeping, written in Obsidian and read here.</p></div><form id="auth-form" class="auth-card"><h2>Sign in</h2><div class="field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div><div class="field"><label>Password</label><input name="password" type="password" autocomplete="current-password" minlength="8" required></div><p class="form-error" role="alert"></p><button class="submit" name="intent" value="signin">Sign in</button><p class="auth-note">This is a private Nota archive.</p></form></section>`}
function userTools(){return state.user?`<footer class="user-tools"><button data-action="logout">Sign out</button></footer>`:""}
function render(){const app=document.getElementById("app"),hash=location.hash.slice(1)||"today",[route,arg]=hash.split("/"),isPublic=route==="writing";document.body.classList.toggle("auth-view",NotaBackend.configured&&!state.user&&!isPublic);if(state.booting){app.innerHTML=skeletonPage();return}if(NotaBackend.configured&&!state.user&&!isPublic){app.innerHTML=authScreen();return}state.route=route;document.querySelectorAll(".main-nav a,.mobile-nav a").forEach(a=>a.classList.toggle("active",a.getAttribute("href")===`#${route}`));const page=route==="calendar"?calendar():route==="library"?library():route==="entry"?entryPage(decodeURIComponent(arg||"")):route==="topics"?(arg?topicView(arg):topics()):route==="writing"?writing():route==="search"?search():today();app.innerHTML=page+userTools();app.focus({preventScroll:true});afterRender(route,Boolean(route==="entry"||(route==="topics"&&arg)))}
// Opening an entry starts at the top of it; coming back restores the place
// in the list you left. Re-renders inside a route leave the scroll alone.
let lastRoute=null,lastDetail=false;
function afterRender(route,isDetail){
  if(isDetail&&lastRoute!==null&&!lastDetail)window.scrollTo(0,0);
  else if(lastDetail&&!isDetail)window.scrollTo(0,state.returnScroll||0);
  lastRoute=route;lastDetail=isDetail;
  swipeable(".deck",".deck-dots i");
  swipeable(".gallery",".gallery-dots i",".gallery-caption");
}
// Shared wiring for the card deck and the photo gallery: keep the dots in
// step with the swipe, and let the arrow keys move it too.
function swipeable(trackSel,dotSel,captionSel){
  const track=document.querySelector(trackSel);
  if(!track)return;
  const dots=[...document.querySelectorAll(dotSel)];
  const caption=captionSel?document.querySelector(captionSel):null;
  const shots=captionSel?[...track.querySelectorAll("img")]:[];
  const sync=()=>{
    const i=Math.round(track.scrollLeft/track.clientWidth);
    dots.forEach((d,n)=>d.classList.toggle("on",n===i));
    if(caption&&shots[i])caption.textContent=shots[i].alt||"";
  };
  track.addEventListener("scroll",()=>requestAnimationFrame(sync),{passive:true});
  track.addEventListener("keydown",ev=>{
    const step=ev.key==="ArrowRight"?1:ev.key==="ArrowLeft"?-1:0;
    if(!step)return;ev.preventDefault();
    track.scrollTo({left:(Math.round(track.scrollLeft/track.clientWidth)+step)*track.clientWidth,behavior:"smooth"});
  });
}
// Freeze the page behind the modal at its current offset, so the archive
// underneath cannot be scrolled away and the reader returns to their place.
let scrollLock=0;
function modal(inner){scrollLock=window.scrollY;document.getElementById("modal-root").innerHTML=`<div class="modal-backdrop" data-close><div class="modal" role="dialog" aria-modal="true">${inner}</div></div>`;document.body.style.top=`-${scrollLock}px`;document.body.classList.add("modal-open")}
function closeModal(){if(!document.body.classList.contains("modal-open"))return;document.getElementById("modal-root").innerHTML="";document.body.classList.remove("modal-open");document.body.style.top="";window.scrollTo(0,scrollLock)}
function bookDetail(id){const b=state.data.books.find(x=>x.id===id);if(!b)return;modal(`<article class="book-detail"><div class="modal-head"><span class="type-label">Reading</span><button class="close" data-close>×</button></div><div class="book-detail-head">${b.cover?`<img src="${b.cover}" alt="">`:coverPlate(b)}<div><h2>${esc(b.title)}</h2><p>${esc(b.author)}</p><span class="status">${esc(b.status.replaceAll("-"," "))} · ${b.progress}%</span></div></div><div class="reading-columns"><section><div class="subhead"><h3>Notes</h3></div>${b.notes?.length?b.notes.map(n=>`<div class="reading-note"><p>${esc(n.text)}</p><small>${esc(n.createdAt)}</small></div>`).join(""):`<p class="empty">No notes yet.</p>`}</section><section><div class="subhead"><h3>Quotes</h3></div>${b.quotes?.length?b.quotes.map(q=>`<blockquote class="reading-quote">“${esc(q.text)}”<cite>${esc(q.page||"")}</cite></blockquote>`).join(""):`<p class="empty">No quotes yet.</p>`}</section></div></article>`)}
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1800)}
document.addEventListener("click",async e=>{
  // Tapping the tab you are already on takes you back to the top of it:
  // a same-hash link fires no hashchange, so handle it here.
  const nav=e.target.closest(".main-nav a,.mobile-nav a");
  // Compare the whole hash, not just the route: on topics/gardening the
  // Topics tab should still take you back up to the topic index.
  if(nav&&nav.getAttribute("href")===(location.hash||"#today")){e.preventDefault();window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});return}
  const action=e.target.closest("[data-action]")?.dataset.action;
  if(action==="logout"){await NotaBackend.signOut();state.user=null;render()}
  const close=e.target.closest("[data-close]");if(close&&e.target===close)closeModal();
  const attachment=e.target.closest("[data-view-attachment]");if(attachment){const item=state.data.entries.find(x=>x.id===attachment.dataset.entryId),file=item?.attachments?.[Number(attachment.dataset.viewAttachment)];if(file?.path){try{open(await NotaBackend.attachmentUrl(file.path),"_blank","noopener")}catch(error){toast(error.message)}}return}
  const book=e.target.closest("[data-book]");if(book){bookDetail(book.dataset.book);return}
  const entry=e.target.closest("[data-entry]");if(entry){e.preventDefault();state.returnTo=location.hash||"#today";state.returnScroll=window.scrollY;location.hash=`entry/${encodeURIComponent(entry.dataset.entry)}`}
  const date=e.target.closest("[data-date]");if(date){state.selectedDate=date.dataset.date;render()}
  const month=e.target.closest("[data-month]");if(month){state.month=new Date(state.month.getFullYear(),state.month.getMonth()+Number(month.dataset.month),1);render()}
  const lib=e.target.closest("[data-library]");if(lib){state.library=lib.dataset.library;render()}
  const filter=e.target.closest("[data-filter]");if(filter){state.filter=filter.dataset.filter;render()}
  const tick=e.target.closest("[data-tick]");
  if(tick){
    const id=tick.dataset.recipe,n=Number(tick.dataset.tick),have=ticked(id);
    const next=have.includes(n)?have.filter(x=>x!==n):[...have,n];
    try{localStorage.setItem("nota-ticked-"+id,JSON.stringify(next))}catch(error){/* not remembered, still ticks */}
    tick.classList.toggle("got");
    return;
  }
  const share=e.target.closest("[data-share]");
  if(share){
    const url=location.href,title=document.querySelector(".entry-page-title")?.textContent||"nota";
    if(navigator.share)navigator.share({title,url}).catch(()=>{});
    else navigator.clipboard?.writeText(url).then(()=>toast("Link copied")).catch(()=>toast("Could not copy the link"));
    return;
  }
  const sort=e.target.closest("[data-topicsort]");if(sort){state.topicSort=sort.dataset.topicsort;try{localStorage.setItem("nota-topic-sort",state.topicSort)}catch(error){/* nothing to remember it with */}render();return}
  const tp=e.target.closest("[data-topic]");if(tp){state.returnTo=location.hash||"#topics";state.returnScroll=window.scrollY;location.hash=`topics/${tp.dataset.topic}`;return}
  if(e.target.closest(".main-nav a"))document.querySelector(".main-nav").classList.remove("open");
});
document.addEventListener("input",e=>{if(e.target.matches(".search-box")){state.search=e.target.value;const pos=e.target.selectionStart;document.querySelector(".search-results").innerHTML=(()=>{const q=state.search.toLowerCase(),items=[...state.data.entries,...state.data.tasks.map(t=>({...t,type:"Task"}))].filter(x=>(state.filter==="all"||x.type===state.filter)&&[x.title,x.excerpt,x.author,...(x.topics||[]).map(y=>topic(y).name)].join(" ").toLowerCase().includes(q));return items.length?items.map(entryCard).join(""):`<p class="empty">No matching records.</p>`})();e.target.setSelectionRange(pos,pos)}});
document.addEventListener("submit",async e=>{
  e.preventDefault();const f=new FormData(e.target),submit=e.submitter;e.target.classList.add("working");if(submit)submit.disabled=true;
  try{
    if(e.target.id==="auth-form"){const email=f.get("email"),password=f.get("password");state.user=await NotaBackend.signIn(email,password);await loadRemoteArchive();render();return}
  }catch(error){const target=e.target.querySelector(".form-error");if(target)target.textContent=error.message;else toast(error.message)}finally{e.target.classList.remove("working");if(submit)submit.disabled=false}
});
async function loadRemoteArchive(){const remote=await NotaBackend.loadData();state.data=Object.keys(remote.topics).length?remote:clone(BASE)}
async function boot(){try{const session=await NotaBackend.init();state.user=session.user;if(state.user)await loadRemoteArchive();else if(NotaBackend.configured&&location.hash==="#writing")state.data={...emptyArchive(),entries:await NotaBackend.loadPublished()};NotaBackend.onAuthChange(user=>{state.user=user;if(!user)render()})}catch(error){console.error(error);toast("Could not connect to storage")}finally{state.booting=false;render()}}
window.addEventListener("hashchange",async()=>{if(NotaBackend.configured&&!state.user&&location.hash==="#writing")state.data={...emptyArchive(),entries:await NotaBackend.loadPublished()};render()});document.querySelector(".hd-day").textContent=now.toLocaleDateString("en-GB",{weekday:"long"});document.querySelector(".hd-date").textContent=`${now.getDate()} ${now.toLocaleDateString("en-GB",{month:"long"})}`;
boot();
// The shell is served cache-first, so a deployed change would otherwise only
// appear on the launch after next. When a new worker takes over, reload once
// so the new shell is used straight away, and check for one whenever the app
// comes back to the foreground.
if("serviceWorker" in navigator){
  let swReg=null,reloading=false;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if(reloading)return;reloading=true;location.reload();
  });
  window.addEventListener("load",async()=>{try{swReg=await navigator.serviceWorker.register("sw.js")}catch(error){/* no worker: the app still runs from the network */}});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&swReg)swReg.update().catch(()=>{})});
}

// data.js is a plain <script>, parsed once at launch. An installed PWA
// resumed from the background never re-runs it, so a fresh publish only
// appeared after force-closing the app. Re-run it on return to the
// foreground instead.
let lastRefresh=Date.now();
function reloadData(){return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=`data.js?t=${Date.now()}`;s.onload=()=>{s.remove();resolve()};s.onerror=()=>{s.remove();reject(new Error("data.js unreachable"))};document.head.appendChild(s)})}
async function refreshArchive(){if(document.hidden||state.booting||Date.now()-lastRefresh<15000)return;if(document.getElementById("modal-root").innerHTML)return;lastRefresh=Date.now();try{if(NotaBackend.configured&&state.user)await loadRemoteArchive();else{await reloadData();state.data=clone(window.NOTA_DATA)}render()}catch(error){/* offline, or the fetch failed: keep showing what we already have */}}
document.addEventListener("visibilitychange",refreshArchive);
window.addEventListener("pageshow",refreshArchive);
// Back on a signal after a spell offline: pick up whatever was published
// while the archive was reading from cache.
window.addEventListener("online",()=>{lastRefresh=0;refreshArchive()});
// And a slow poll, so an app left open on a desk still catches up.
setInterval(refreshArchive,5*60*1000);

// Pull down at the top of the page to refresh by hand.
const pullHint=document.createElement("div");pullHint.className="pull-hint";pullHint.textContent="Pull to refresh";document.body.appendChild(pullHint);
let pullFrom=null,pulled=0;
const PULL_TRIGGER=68;
addEventListener("touchstart",e=>{pullFrom=window.scrollY<=0&&e.touches.length===1?e.touches[0].clientY:null;pulled=0},{passive:true});
addEventListener("touchmove",e=>{
  if(pullFrom===null)return;
  pulled=e.touches[0].clientY-pullFrom;
  if(pulled<=0){pullHint.classList.remove("on");return}
  pullHint.classList.toggle("on",pulled>24);
  pullHint.textContent=pulled>PULL_TRIGGER?"Release to refresh":"Pull to refresh";
},{passive:true});
addEventListener("touchend",async()=>{
  if(pullFrom===null)return;
  const trigger=pulled>PULL_TRIGGER;pullFrom=null;pulled=0;
  if(!trigger){pullHint.classList.remove("on");return}
  pullHint.classList.add("spin");pullHint.textContent="Refreshing";
  lastRefresh=0;await refreshArchive();
  pullHint.classList.remove("on","spin");
},{passive:true});
