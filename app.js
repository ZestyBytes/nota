// Fall back to an empty archive rather than throwing: if data.js is ever
// missing (a first visit that went offline mid-load) the shell still opens.
const BASE = window.NOTED_DATA || { topics:{}, entries:[], tasks:[], books:[] };
// Stamped at deploy. Left as the literal token when running from a checkout,
// which is how the version check knows to stay out of the way locally.
const BUILD="__BUILD__";
const now = new Date(), todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
let savedSort="items",savedCalendar="month",savedLibrary="writing";try{savedSort=localStorage.getItem("noted-topic-sort")||"items";savedCalendar=localStorage.getItem("noted-calendar-mode")||"month";savedLibrary=localStorage.getItem("noted-library-tab")||"writing"}catch(error){/* private mode: fall back to defaults */}
const state = { route:"today", topicSort:savedSort, calendarMode:savedCalendar, month:new Date(now.getFullYear(),now.getMonth(),1), selectedDate:todayKey, library:savedLibrary, search:"", filter:"all", data:clone(BASE), user:null, booting:NotedBackend.configured };
function clone(v){return JSON.parse(JSON.stringify(v))}
function emptyArchive(){return {topics:clone(BASE.topics),entries:[],tasks:[],books:[]}}
function esc(s=""){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
// Just enough Markdown for a note body: escape first, then re-introduce the
// handful of marks the vault actually uses. Images already shown above the
// text, as a photograph or a gallery, are skipped here.
// The vault is a linked notebook, so a [[wikilink]] should behave like one.
// Titles match case-insensitively; anything unresolved stays as plain text,
// reading exactly as it did before.
function linkTarget(name){
  const want=String(name).replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim().toLowerCase();
  const entry=state.data.entries.find(e=>(e.title||"").trim().toLowerCase()===want);
  if(entry)return {kind:"entry",id:entry.id};
  const book=state.data.books.find(b=>(b.title||"").trim().toLowerCase()===want);
  if(book)return {kind:"book",id:book.id};
  const slug=Object.keys(state.data.topics).find(k=>k===want||(state.data.topics[k].name||"").trim().toLowerCase()===want);
  if(slug)return {kind:"topic",id:slug};
  return null;
}
function wikilink(name,label){
  const t=linkTarget(name),text=label||name;
  if(!t)return text;
  if(t.kind==="entry")return `<a class="wikilink" href="#entry/${encodeURIComponent(t.id)}">${text}</a>`;
  if(t.kind==="topic")return `<a class="wikilink" href="#topics/${encodeURIComponent(t.id)}">${text}</a>`;
  return `<button type="button" class="wikilink" data-book="${esc(t.id)}">${text}</button>`;
}
function inline(t){return esc(t)
  .replace(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g,(m,name,label)=>wikilink(name,label))
  .replace(/`([^`]+)`/g,"<code>$1</code>")
  .replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>")
  .replace(/(^|[^*])\*([^*\n]+)\*/g,"$1<em>$2</em>")
  // only http(s) links become anchors; anything else stays as its text
  .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g,"$1")}
function markdown(src="",shown=[],owner=""){
  const out=[];let para=[],list=[],rows=[],quote=[],fence=null,lang="",box=0;
  const flushPara=()=>{if(para.length){out.push(`<p>${inline(para.join(" "))}</p>`);para=[]}};
  // A checklist is a list where every item opens with a box. Mixed lists stay
  // ordinary, so a stray "- [x]" in prose does not turn the rest into one.
  const flushList=()=>{
    if(!list.length)return;
    const items=list.map(i=>{const m=i.match(/^\[([ xX])\]\s*(.*)$/);return m?{done:m[1]!==" ",text:m[2]}:null});
    if(items.every(Boolean)){
      const saved=owner?ticked("check-"+owner):[];
      out.push(`<ul class="checklist">${items.map((it,n)=>`<li class="${it.done||saved.includes(n)?"got":""}" data-tick="${n}" data-recipe="check-${esc(owner)}"><span class="tick" aria-hidden="true">${icon("check")}</span><span>${inline(it.text)}</span></li>`).join("")}</ul>`);
    } else out.push(`<ul>${list.map(i=>`<li>${inline(i)}</li>`).join("")}</ul>`);
    list=[];
  };
  const flushQuote=()=>{if(quote.length){out.push(callout(quote));quote=[]}};
  const flushAll=()=>{flushPara();flushList();flushQuote()};
  for(const raw of String(src).split("\n")){
    const t=raw.trim();
    if(!t&&fence===null){flushAll();continue}
    // A photograph or a clip can be written on its own line or run straight on
    // from a sentence, which is what Obsidian does when you attach one at the
    // end of a paragraph. Pull every embed out of the line either way, so it
    // is rendered rather than printed as its own path.
    if(fence===null&&MEDIA_TOKEN.test(t)){
      const parts=t.split(MEDIA_SPLIT).filter(x=>x!=="");
      for(const part of parts){
        const m=part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if(!m){if(part.trim())para.push(part.trim());continue}
        flushAll();
        // the lead image is already shown above the text; the rest belong here
        if(shown.includes(m[2]))continue;
        out.push(media(m[2],m[1]));
      }
      continue;
    }
    if(t.startsWith("#")){flushAll();out.push(`<h3>${inline(t.replace(/^#+\s*/,""))}</h3>`);continue}
    // Consecutive > lines are one block, so an Obsidian callout keeps its body
    // instead of becoming a run of one-line quotations.
    if(t.startsWith(">")){flushPara();flushList();quote.push(t.replace(/^>\s?/,""));continue}
    flushQuote();
    if(t.startsWith("```")){
      if(fence===null){flushPara();flushList();fence=[];lang=t.slice(3).trim()}
      else{out.push(`<pre class="code"${lang?` data-lang="${esc(lang)}"`:""}><code>${esc(fence.join("\n"))}</code></pre>`);fence=null;lang=""}
      continue;
    }
    if(fence!==null){fence.push(raw.replace(/\s+$/,""));continue}
    if(t.startsWith("|")&&t.endsWith("|")){flushPara();flushList();rows.push(t);continue}
    if(rows.length){out.push(table(rows));rows=[]}
    if(t.startsWith("- ")||t.startsWith("* ")){flushPara();list.push(t.slice(2).trim());continue}
    // A video or a record on a line of its own is meant to be played, not read
    // as a URL. Anything else keeps being ordinary prose.
    const player=t.match(/^<?(https?:\/\/\S+?)>?$/)&&embed(t.replace(/^<|>$/g,""));
    if(player){flushAll();out.push(player);continue}
    flushList();para.push(t);
  }
  flushAll();if(rows.length)out.push(table(rows));
  if(fence!==null)out.push(`<pre class="code"><code>${esc(fence.join("\n"))}</code></pre>`);
  return out.join("");
}
const MEDIA_TOKEN=/!\[[^\]]*\]\([^)]+\)/;
const MEDIA_SPLIT=/(!\[[^\]]*\]\([^)]+\))/g;
const VIDEO_RE=/\.(mp4|mov|m4v|webm)(\?|$)/i;
// One path for both: the extension says whether it is a still or a clip.
function media(src,caption){
  const body=VIDEO_RE.test(src)
    ? `<video controls preload="metadata" playsinline src="${esc(src)}"></video>`
    : `<img src="${esc(src)}" alt="${esc(caption)}" loading="lazy">`;
  return `<figure class="body-figure${VIDEO_RE.test(src)?" body-video":""}">${body}${caption?`<figcaption>${esc(caption)}</figcaption>`:""}</figure>`;
}
// Obsidian writes asides as "> [!note] Title". Rendered as a plain quotation
// the marker showed as literal text, so the one piece of structure the note
// carried was the one thing that did not survive.
const CALLOUTS={note:"note",info:"note",tip:"check",success:"check",done:"check",question:"help",warning:"alert",caution:"alert",danger:"alert",bug:"terminal",example:"note",quote:"quote",cite:"quote",abstract:"note",summary:"note",todo:"check",failure:"alert",important:"alert"};
function callout(lines){
  const m=(lines[0]||"").match(/^\[!(\w+)\]([+-]?)\s*(.*)$/i);
  if(!m)return `<blockquote>${lines.map(l=>inline(l)).join("<br>")}</blockquote>`;
  const kind=m[1].toLowerCase(),title=m[3].trim()||m[1][0].toUpperCase()+m[1].slice(1).toLowerCase();
  // Lines wrapped in the source are one paragraph, as they are everywhere
  // else; a blank line inside the callout starts a new one.
  const paras=[];let cur=[];
  for(const l of lines.slice(1)){if(l.trim())cur.push(l.trim());else if(cur.length){paras.push(cur.join(" "));cur=[]}}
  if(cur.length)paras.push(cur.join(" "));
  const body=paras.map(t=>`<p>${inline(t)}</p>`).join("");
  return `<aside class="callout callout-${esc(CALLOUTS[kind]?kind:"note")}"><p class="callout-head">${icon(CALLOUTS[kind]||"note")}<b>${esc(title)}</b></p>${body}</aside>`;
}
// A YouTube, Vimeo or Spotify link becomes the thing itself. Only these three,
// and only by exact host, so a pasted link cannot load an arbitrary frame.
function embed(url){
  let u;try{u=new URL(url)}catch(error){return ""}
  const host=u.hostname.replace(/^www\./,"");
  let src="",kind="video";
  if(host==="youtu.be")src=`https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
  else if(host==="youtube.com"||host==="m.youtube.com"){
    const id=u.searchParams.get("v")||(u.pathname.startsWith("/shorts/")?u.pathname.split("/")[2]:"");
    if(id)src=`https://www.youtube-nocookie.com/embed/${id}`;
  }
  else if(host==="vimeo.com")src=`https://player.vimeo.com/video/${u.pathname.split("/").filter(Boolean)[0]}`;
  else if(host==="open.spotify.com"){src=`https://open.spotify.com/embed${u.pathname}`;kind="audio"}
  if(!src)return "";
  return `<div class="embed embed-${kind}"><iframe src="${esc(src)}" title="Embedded ${kind}" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
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
function rootTopic(id){
  let current=id,seen=new Set();
  while(current&&state.data.topics[current]?.parent&&!seen.has(current)){
    seen.add(current);current=state.data.topics[current].parent;
  }
  return current||"life";
}
function icon(name){const paths={leaf:'<path d="M20.4 3.6c-9.4 0-14.8 4.3-14.8 10.5a4.7 4.7 0 0 0 4.7 4.7c6.7 0 10.1-6.5 10.1-15.2Z"/><path d="M4.2 20.4c2.5-5.8 6.7-9.9 12.5-12.6"/>',music:'<path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>',terminal:'<path d="M4.6 5.2h14.8a1.8 1.8 0 0 1 1.8 1.8v10a1.8 1.8 0 0 1-1.8 1.8H4.6a1.8 1.8 0 0 1-1.8-1.8V7a1.8 1.8 0 0 1 1.8-1.8Z"/><path d="M7.4 9.6l2.9 2.4-2.9 2.4M13.2 14.4h4.2"/>',mind:'<path d="M12 21s-8-4.5-8-11a4 4 0 0 1 7-2.6A4 4 0 0 1 20 10c0 6.5-8 11-8 11Z"/><path d="M7 13h3l1.5-3 2 6 1.5-3h3"/>',book:'<path d="M4 5a3 3 0 0 1 3-3h12v18H7a3 3 0 0 1 0-6h12"/>',home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',fork:'<path d="M7 3v7m-3-7v4a3 3 0 0 0 6 0V3M7 10v11M17 3v18m0-18c3 3 3 8 0 10"/>',paperclip:'<path d="m21 11-8.5 8.5a6 6 0 0 1-8.5-8.5l9-9a4 4 0 0 1 5.7 5.7l-9 9a2 2 0 0 1-2.9-2.9L15 5.6"/>',quote:'<path d="M9 11H5a4 4 0 0 1 4-4v8a4 4 0 0 1-4 4M19 11h-4a4 4 0 0 1 4-4v8a4 4 0 0 1-4 4"/>',note:'<path d="M4 3h16v18H4zM8 8h8M8 12h8M8 16h5"/>',check:'<path d="m5 12 5 5 9-9"/>',photos:'<rect x="7" y="3" width="14" height="14" rx="1.5"/><path d="M17 21H4.5A1.5 1.5 0 0 1 3 19.5V7"/>',car:'<path d="M3.6 15.8v-2.2l1.9-4.5A2.3 2.3 0 0 1 7.6 7.7h8.8a2.3 2.3 0 0 1 2.1 1.4l1.9 4.5v2.2Z"/><path d="M4.4 13.6h15.2M9.5 7.9v5.7M14.5 7.9v5.7"/><path d="M9.1 16.3a2.05 2.05 0 1 1-4.1 0 2.05 2.05 0 0 1 4.1 0ZM19 16.3a2.05 2.05 0 1 1-4.1 0 2.05 2.05 0 0 1 4.1 0Z"/>',disc:'<path d="M20.7 12a8.7 8.7 0 1 1-17.4 0 8.7 8.7 0 0 1 17.4 0ZM14.4 12a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0Z"/><path d="M17.6 12A5.6 5.6 0 0 0 12 6.4"/>',repeat:'<path d="M4 9.6A4.6 4.6 0 0 1 8.6 5h9"/><path d="m14.8 2.4 2.9 2.6-2.9 2.6"/><path d="M20 14.4A4.6 4.6 0 0 1 15.4 19h-9"/><path d="m9.2 16.4-2.9 2.6 2.9 2.6"/>',heart:'<path d="M12 20.3s-7.6-4.4-7.6-10a4.2 4.2 0 0 1 7.6-2.6 4.2 4.2 0 0 1 7.6 2.6c0 5.6-7.6 10-7.6 10Z"/>',weights:'<path d="M3.4 9.6v4.8M6.6 7.2v9.6M17.4 7.2v9.6M20.6 9.6v4.8M6.6 12h10.8"/>',cup:'<path d="M5 8.4h11v5.8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z"/><path d="M16 9.8h2.2a2.3 2.3 0 0 1 0 4.6H16"/><path d="M7.6 4.4v1.9M11 3.9v2.4M14.4 4.4v1.9"/>',alert:'<path d="M12 3.6 21 19H3Z"/><path d="M12 9.6v4.2"/><path d="M12 16.6h.01"/>',help:'<circle cx="12" cy="12" r="8.6"/><path d="M9.6 9.6a2.5 2.5 0 0 1 4.8.8c0 1.7-2.4 1.9-2.4 3.4"/><path d="M12 17.2h.01"/>'};return `<svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.note}</svg>`}
function chips(ids=[]){return ids.map(id=>{const t=topic(id);return `<span class="chip" style="--topic:${t.color};--soft:${t.soft}">${esc(t.name)}</span>`}).join("")}
// Specimen-label date: 01 SEP 2026. The card had no date at all before.
const MONTHS=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
function fmtDate(iso){if(!iso)return"";const d=new Date(String(iso).slice(0,10)+"T12:00:00");return isNaN(d)?"":`${String(d.getDate()).padStart(2,"0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`}
function accNo(id){let h=0;for(const c of String(id))h=(h*31+c.charCodeAt(0))>>>0;return String(1000+h%9000)}
function ageTier(dateStr){if(!dateStr)return"";const days=(now-new Date(dateStr+"T12:00:00"))/864e5;return days>180?"archive":days>30?"aged":""}
// snippet is a string or nothing. Guarded because passing this straight to
// Array.map hands it the index, which then prints as the card's summary line.
// `within` is the topic whose page this card is being shown on, if any. On a
// topic page every card carried that same topic's tag, which said nothing: the
// page already says it. Show the first tag that is not the one you are inside,
// and where there is none, show no tag at all.
// Not every entry has a photograph, and a card with an empty thumbnail slot
// breaks the rhythm of a list. Those get a drawn plate instead: the topic's
// motif and the entry's initial, over one of the same grounds the topic cards
// use, chosen from the entry's own id. Deterministic, so a card always looks
// the same, and varied, so eight notes on one topic are not eight identical
// tiles. Nothing to host and nothing to fetch.
const PLATE_GROUNDS=["wash","ruled","grid","verticals","dots","coarse","hatch","crosshatch","fade","band","duo","plain"];
function entryPlate(e){
  const t=topic(e.topics?.[0]);
  if(e.id==="notes/why-i-made-noted")return `<span class="entry-plate manifesto-plate" aria-hidden="true"><b>noted<i>.</i></b><small>why this exists</small></span>`;
  let h=0;for(const c of String(e.id))h=(h*31+c.charCodeAt(0))>>>0;
  const g=PLATE_GROUNDS[h%PLATE_GROUNDS.length];
  return `<span class="entry-plate ground-${g}" style="--topic:${t.color};--soft:${t.soft}" aria-hidden="true">
    <strong class="plate-topic">${esc(t.name)}</strong>
    <i class="plate-kind">text record</i><i class="plate-number">No. ${accNo(e.id)}</i>
  </span>`;
}
function entryCard(e,snippet="",within=""){if(typeof snippet!=="string")snippet="";
  const tagId=(e.topics||[]).find(id=>id!==within&&topic(id).parent!==within),
    t=topic(tagId||e.topics?.[0]),attachment=e.attachments?.[0],age=ageTier(e.occurredAt),date=fmtDate(e.occurredAt||e.createdAt||e.dueAt);
  // A to-do is a line of text, not a specimen. Give it a picture only if one
  // was actually attached, rather than inventing a plate to fill the space.
  const thumb=e.image?`<img class="entry-thumb" src="${e.image}" alt="${esc(e.imageAlt||"")}" loading="lazy">${e.images?.length>1?`<span class="thumb-count">${icon("photos")}${e.images.length}</span>`:""}`:e.type==="Task"?"":entryPlate(e);
  return `<article class="entry ${thumb?"has-thumb":"no-thumb"} ${e.image?"":thumb?"has-plate":""} ${age}" data-entry="${e.id}" style="--topic:${t.color}"><span class="acc-no">No. ${accNo(e.id)}</span>${tagId?`<span class="mount-tag" style="background:${t.color}">${esc(t.name)}</span>`:""}${thumb?`<span class="thumb-wrap">${thumb}</span>`:""}<div class="entry-copy"><div class="entry-meta"><span class="type-label">${esc(e.type)}</span>${date?`<span class="entry-date">${date}</span>`:""}${e.publishedAt||e.type==="Task"?"":`<span class="stamp stamp-private">private</span>`}</div><h3>${e.type==="Quote"?`“${esc(e.title)}”`:esc(e.title)}</h3>${snippet?`<p class="snippet">${snippet}</p>`:e.author?`<p>${esc(e.author)}</p>`:e.excerpt?`<p>${esc(e.excerpt)}</p>`:""}${attachment?`<span class="attachment-inline">${icon("paperclip")}${esc(attachment.name)}</span>`:""}</div></article>`}
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
function cardDeck(body,shown=[],owner=""){
  let cards=cardBlocks(body),intro="";
  // Numbered principles often wrap across source paragraphs. A new number
  // begins a slide; subsequent unnumbered paragraphs belong to that slide.
  const firstNumber=cards.findIndex(c=>/^\*\*\d+[.)]/.test(c));
  if(firstNumber>=0&&cards.filter(c=>/^\*\*\d+[.)]/.test(c)).length>1){
    intro=cards.slice(0,firstNumber).join("\n\n");
    const grouped=[];
    for(const block of cards.slice(firstNumber)){
      if(/^\*\*\d+[.)]/.test(block)||!grouped.length)grouped.push(block);
      else grouped[grouped.length-1]+="\n\n"+block;
    }
    cards=grouped;
  }
  if(cards.length<2)return `<div class="detail-body">${markdown(body,shown,owner)}</div>`;
  return `${intro?`<div class="detail-body deck-intro">${markdown(intro,shown,owner)}</div>`:""}<div class="deck-wrap"><div class="deck" tabindex="0" role="group" aria-label="Swipe through ${cards.length} cards">${
    cards.map((c,i)=>`<article class="deck-card"><span class="deck-no">${String(i+1).padStart(2,"0")} / ${String(cards.length).padStart(2,"0")}</span><div class="deck-copy">${markdown(c,shown,owner)}</div></article>`).join("")
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
function trackParts(raw){const m=String(raw).match(/^(.*?),?\s*\*([^*]+)\*\s*$/);return {main:m?m[1].trim():String(raw),sub:m?m[2].trim():""}}
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
function ticked(id){try{return JSON.parse(localStorage.getItem("noted-ticked-"+id)||"[]")}catch(error){return []}}
function recipeBody(e){
  const r=e.recipe,done=ticked(e.id);
  const facts=[["Time",r.time],["Serves",r.serves],["Difficulty",r.difficulty]].filter(([,v])=>v);
  return `${facts.length?`<dl class="recipe-facts">${facts.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(String(v))}</dd></div>`).join("")}</dl>`:""}
    ${e.excerpt?`<p class="recipe-lede">${esc(e.excerpt)}</p>`:""}
    ${r.ingredients?.length?`<section class="recipe-part"><h2 class="section-title">You will need</h2><ul class="ingredients">${r.ingredients.map((i,n)=>`<li class="${done.includes(n)?"got":""}" data-tick="${n}" data-recipe="${e.id}"><span class="tick" aria-hidden="true">${icon("check")}</span><span>${inline(i)}</span></li>`).join("")}</ul></section>`:""}
    ${r.method?.length?`<section class="recipe-part"><details class="method" open><summary><span class="section-title">Method</span><span class="method-count">${r.method.length} steps</span></summary><ol class="steps">${r.method.map(m=>`<li>${inline(m)}</li>`).join("")}</ol></details></section>`:""}`;
}
// What else in the archive points at this entry. A one-way link is half a
// connection; the other half is knowing you were mentioned.
function backlinks(e){
  const title=(e.title||"").trim().toLowerCase();
  if(!title)return [];
  return state.data.entries.filter(x=>x.id!==e.id&&(x.body||"").toLowerCase()
    .match(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)?.some(m=>m.replace(/^\[\[|\]\]$/g,"").split("|")[0].trim()===title));
}
function relatedEntries(e){
  const tags=new Set(e.topics||[]),shared=x=>x.topics.filter(t=>tags.has(t)).length;
  return state.data.entries.filter(x=>x.id!==e.id&&x.type!=="Task"&&x.topics?.some(t=>tags.has(t)))
    .sort((a,b)=>shared(b)-shared(a)||(b.occurredAt||b.createdAt||"").localeCompare(a.occurredAt||a.createdAt||""))
    .slice(0,3);
}
function notedFlow(){
  const steps=[
    ["Write","Obsidian","https://obsidian.md"],
    ["Commit","Working Copy","https://workingcopyapp.com"],
    ["Keep","GitHub","https://github.com"],
    ["Shape","Quartz + builder","https://quartz.jzhao.xyz"],
    ["Share","GitHub Pages","https://pages.github.com"]
  ];
  return `<aside class="noted-flow" aria-label="How Noted is published"><p class="eyebrow">From a thought to the archive</p><div>${steps.map(([verb,name,url],i)=>`<a href="${url}" target="_blank" rel="noopener" style="--step:${i}"><small>${String(i+1).padStart(2,"0")} · ${verb}</small><b>${name}</b></a>`).join("")}</div><p>Markdown stays the source of truth; the site is simply the view.</p></aside>`;
}
// Back used to read state.returnTo blind. Any plain link that changed the hash
// without going through a handler left it stale, so it could end up naming the
// page you were already on, and then Back did nothing at all.
function backHref(fallback){
  const to=state.returnTo||"";
  return to&&to!=="#"+location.hash.replace(/^#/,"")?to:fallback;
}
function entryPage(id){
  const e=[...state.data.entries,...state.data.tasks].find(x=>x.id===id);
  const back=e?.journey?`#journey/${encodeURIComponent(e.journey)}`:backHref("#today");
  if(!e)return `<section><p class="back-link"><a href="${back}" data-back>Back</a></p><p class="empty">That entry is no longer in the archive.</p></section>`;
  const date=fmtDate(e.occurredAt||e.createdAt||e.dueAt),t=topic(e.topics?.[0]),spaceId=rootTopic(e.topics?.[0]),space=topic(spaceId);
  const sequence=e.journey?journeyEntries(e.journey):ordered(state.data.entries.filter(x=>x.type!=="Task"));
  const position=sequence.findIndex(x=>x.id===e.id),previous=position>0?sequence[position-1]:null,next=position>=0&&position<sequence.length-1?sequence[position+1]:null;
  if(e.type==="Quote")return `<section class="quote-entry-page" style="--topic:${t.color}"><p class="back-link"><a href="${back}" data-back>Back</a><button class="share-button" data-share="${esc(e.id)}" type="button">Share</button></p><article><span>Commonplace book · No. ${accNo(e.id)}</span><blockquote>“${esc(e.title)}”</blockquote><cite>${esc(e.author||"")}</cite><time>${date?`Filed ${date}`:""}</time></article></section>`;
  return `<section class="entry-page entry-space-${spaceId}" style="--topic:${t.color};--space:${space.color}">
    <span class="entry-topic-tab" style="background:${t.color}">${esc(t.name)}</span>
    <p class="back-link"><a href="${back}" data-back>Back</a><button class="share-button" data-share="${esc(e.id)}" type="button">Share</button></p>
    <header class="entry-masthead">
      <p class="entry-page-meta"><span class="type-label">${esc(e.type||"Task")}</span>${date?`<span class="entry-date">${date}</span>`:""}<span class="acc-no acc-no-page">No. ${accNo(e.id)}</span>${e.publishedAt||!e.type||e.type==="Task"?"":`<span class="stamp stamp-private">private</span>`}</p>
      <h1 class="entry-page-title">${e.type==="Quote"?`&ldquo;${esc(e.title)}&rdquo;`:esc(e.title)}</h1>
      ${e.author?`<p class="entry-page-author">${esc(e.author)}</p>`:""}
      <div class="entry-context">${chips(e.topics?.slice(1))}${e.journey?(()=>{const rows=journeyEntries(e.journey),n=rows.findIndex(r=>r.id===e.id)+1;return `<p class="journey-of"><a href="#journey/${encodeURIComponent(e.journey)}">${esc(e.journey)}</a><span>${n} of ${rows.length}</span></p>`})():""}<a class="entry-space-link" href="#topics/${encodeURIComponent(spaceId)}" data-topic="${esc(spaceId)}">${esc(space.name)} space &rarr;</a></div>
    </header>
    ${e.images?.length>1?gallery(e.images):e.image?`<img class="detail-image" src="${e.image}" alt="${esc(e.imageAlt||"")}">`:""}
    ${e.id==="notes/why-i-made-noted"?notedFlow():""}
    ${(()=>{const shown=e.images?.length>1?e.images.map(i=>i.src):[e.image];return e.recipe?`<div class="detail-body recipe-body">${recipeBody(e)}</div>`:e.view==="cards"&&e.body?cardDeck(e.body,shown,e.id):`<div class="detail-body">${e.body?(e.view==="playlist"?playlistBody(e.body):markdown(e.body,shown,e.id)):`<p>${esc(e.excerpt||"Saved in your Noted archive.")}</p>`}</div>`})()}
    ${(()=>{const back=backlinks(e);return back.length?`<section class="backlinks"><h2 class="section-title">Mentioned in</h2><ul>${back.map(b=>`<li><a href="#entry/${encodeURIComponent(b.id)}">${esc(b.title)}</a><small>${esc(b.type)}${b.occurredAt?` &middot; ${esc(fmtDate(b.occurredAt))}`:""}</small></li>`).join("")}</ul></section>`:""})()}
    ${(()=>{const near=relatedEntries(e);return near.length?`<section class="related-entries"><h2 class="section-title">Continue nearby</h2><div>${near.map(x=>`<a href="#entry/${encodeURIComponent(x.id)}" data-entry="${esc(x.id)}" data-return="#entry/${encodeURIComponent(e.id)}"><small>${esc(topic(x.topics?.[0]).name)} · ${fmtDate(x.occurredAt||x.createdAt)}</small><b>${esc(x.title)}</b></a>`).join("")}</div></section>`:""})()}
    ${previous||next?`<nav class="entry-pager" aria-label="${e.journey?"Journey entries":"Archive entries"}">${previous?`<a href="#entry/${encodeURIComponent(previous.id)}" data-entry="${esc(previous.id)}" data-return="#entry/${encodeURIComponent(e.id)}"><small>Previous</small><b>← ${esc(previous.title)}</b></a>`:`<span></span>`}${next?`<a href="#entry/${encodeURIComponent(next.id)}" data-entry="${esc(next.id)}" data-return="#entry/${encodeURIComponent(e.id)}"><small>Next</small><b>${esc(next.title)} →</b></a>`:`<span></span>`}</nav>`:""}
    ${e.attachments?.length?`<div class="attachment-list"><p class="eyebrow">Attachments</p>${e.attachments.map((a,i)=>`<div>${icon("paperclip")}<span><b>${esc(a.name)}</b><small>${esc(a.kind)} &middot; ${esc(a.size)}</small></span><button type="button" data-view-attachment="${i}" data-entry-id="${e.id}">View</button></div>`).join("")}</div>`:""}
  </section>`;
}
// The postmark said the same thing as the header date, so the slot went to
// what is actually in progress. Falls back to the archive count when there
// is nothing on the go.
function todayWidget(){
  // Rotates daily rather than showing the same book forever: whatever is
  // current, a quote worth rereading, this day in a previous year, the next
  // thing due. Chosen by the date, so it is steady all day and different
  // tomorrow.
  const cards=[];
  const book=state.data.books.find(b=>b.status==="reading");
  if(book)cards.push(`<button class="side-widget" data-book="${book.id}" aria-label="Open ${esc(book.title)}">
    <span class="eyebrow">Now reading</span>
    <span class="widget-row">${book.cover?`<img src="${book.cover}" alt="" loading="lazy">`:coverPlate(book)}<span><b>${esc(book.title)}</b><small>${esc(book.author)}</small></span></span>
    <span class="widget-bar"><i style="width:${book.progress}%"></i></span>
    <span class="widget-foot">${book.progress}% through</span>
  </button>`);

  const quotes=state.data.entries.filter(e=>e.type==="Quote").concat(state.data.books.flatMap(b=>(b.quotes||[]).map(q=>({title:q.text,author:b.author,id:b.id}))));
  if(quotes.length){
    const q=quotes[dayIndex(quotes.length)];
    cards.push(`<div class="side-widget side-widget-static">
      <span class="eyebrow">A thought to keep</span>
      <span class="widget-quote">${esc(q.title)}</span>
      ${q.author?`<span class="widget-foot">${esc(q.author)}</span>`:""}
    </div>`);
  }

  const memory=state.data.entries.find(e=>e.occurredAt&&e.occurredAt.slice(5)===todayKey.slice(5)&&e.occurredAt.slice(0,4)<todayKey.slice(0,4));
  if(memory)cards.push(`<button class="side-widget" data-entry="${esc(memory.id)}">
    <span class="eyebrow">On this day, ${memory.occurredAt.slice(0,4)}</span>
    <span class="widget-row"><span><b>${esc(memory.title)}</b><small>${esc(memory.type)}</small></span></span>
    <span class="widget-foot">${esc(fmtDate(memory.occurredAt))}</span>
  </button>`);

  const due=state.data.tasks.filter(t=>!t.completedAt&&t.dueAt).sort((a,b)=>a.dueAt.localeCompare(b.dueAt))[0];
  if(due)cards.push(`<div class="side-widget side-widget-static">
    <span class="eyebrow">Next up</span>
    <span class="widget-row"><span><b>${esc(due.title)}</b></span></span>
    <span class="widget-foot">${due.dueAt<=todayKey?"Due today":"Due "+esc(fmtDate(due.dueAt))}</span>
  </div>`);

  if(!cards.length){
    const open=state.data.tasks.filter(t=>!t.completedAt).length;
    return `<div class="side-widget side-widget-static">
      <span class="eyebrow">The archive</span>
      <span class="widget-figure">${state.data.entries.length}</span>
      <span class="widget-foot">entries kept${open?`, ${open} thing${open>1?"s":""} waiting`:""}</span>
    </div>`;
  }
  return cards[dayIndex(cards.length)];
}
// stable for the whole day, different tomorrow
function dayIndex(n){const d=new Date(todayKey+"T12:00:00");return Math.floor((d-new Date(d.getFullYear(),0,0))/864e5)%n}
function pageHead(kicker,title,lede=""){return `<div class="page-head"><div><p class="eyebrow">${kicker}</p><h1 class="page-title">${title}</h1>${lede?`<p class="lede">${lede}</p>`:""}</div></div>`}
function onThisDay(){
  const md=todayKey.slice(5),items=state.data.entries.filter(e=>{const d=e.occurredAt||e.createdAt||"";return d.slice(5)===md&&d.slice(0,4)!==todayKey.slice(0,4)});
  return items.length?`<section class="on-this-day"><div><p class="eyebrow">On this day</p><h2>${items.length===1?"One thing came back":"A few things came back"}</h2></div><div>${items.slice(0,3).map(e=>dayRow(e,"article")).join("")}</div></section>`:"";
}
function today(){
  const recent=[...state.data.entries].sort((a,b)=>(b.occurredAt||b.createdAt||"").localeCompare(a.occurredAt||a.createdAt||"")).slice(0,6);
  const open=state.data.tasks.filter(t=>!t.completedAt).length;
  const wander=state.data.entries.filter(e=>e.type!=="Task");
  return `<section class="home-page"><header class="home-intro"><div><p class="eyebrow">A living personal archive</p><h1 class="page-title">Recently</h1><p class="lede">Stories, photographs, ideas and projects worth returning to.</p></div><nav class="home-paths"><a href="#topics"><b>Spaces</b><span>By subject</span></a><a href="#library"><b>Library</b><span>By format</span></a><a href="#calendar"><b>Calendar</b><span>By date</span></a></nav></header>
    <div class="home-latest-head"><h2 class="section-title">Latest entries</h2>${open?`<a href="#tasks">${open} thing${open===1?"":"s"} to do &rarr;</a>`:""}</div>
    <div class="entry-list">${recent.length?recent.map(e=>entryCard(e)).join(""):`<p class="empty">The archive is ready for its first entry.</p>`}</div>
    ${onThisDay()}
    ${journeyStrip()}
    ${wander.length?`<aside class="home-wander"><div><span class="eyebrow">A little serendipity</span><b>Open something unexpected</b><p>Take a lucky dip through the archive.</p></div><button type="button" data-wander>Surprise me <span aria-hidden="true">↗</span></button></aside>`:""}
    <form class="home-search" action="#search"><label for="home-query">Find something older</label><div><input id="home-query" type="search" placeholder="Search the whole archive…"><button type="submit">Search</button></div></form>
  </section>`;
}
function taskRow(t){const tp=topic(t.topics[0]);return `<div class="task ${t.completedAt?"done":""} ${t.note?"has-note":""}" ${t.note?`data-entry="${esc(t.id)}"`:""}><span class="task-mark" aria-hidden="true">${t.completedAt?icon("check"):""}</span><span class="task-copy"><span class="task-title">${esc(t.title)}</span>${t.note?`<small class="task-note">${esc(t.note)}</small>`:""}${t.completedAt?`<small class="task-due">Done ${esc(fmtDate(t.completedAt))}</small>`:t.dueAt?`<small class="task-due${t.dueAt<todayKey?" late":""}">${t.dueAt<todayKey?"Overdue, was due "+esc(fmtDate(t.dueAt)):t.dueAt===todayKey?"Due today":"Due "+esc(fmtDate(t.dueAt))}</small>`:""}</span><span class="chip" style="--topic:${tp.color};--soft:${tp.soft}">${esc(tp.name)}</span></div>`}
// Everything that carries a date belongs on the calendar, not only entries:
// a task is due on a day too, and a day with four things should look busier
// than a day with one.
function dayItems(date){
  return [...state.data.entries.filter(e=>e.occurredAt===date),
          ...state.data.tasks.filter(t=>t.dueAt===date).map(t=>({...t,type:"Task",excerpt:t.note||""}))];
}
function datesWithSomething(){
  const set=new Set();
  for(const e of state.data.entries)if(e.occurredAt)set.add(e.occurredAt);
  for(const t of state.data.tasks)if(t.dueAt)set.add(t.dueAt);
  return set;
}
// Paging a month at a time through empty years is no way to find anything, so
// offer the nearest month that actually holds something.
function nearestMonth(from,dates){
  const months=[...new Set([...dates].map(d=>d.slice(0,7)))].sort();
  if(!months.length)return null;
  const key=`${from.getFullYear()}-${String(from.getMonth()+1).padStart(2,"0")}`;
  return months.reduce((best,m)=>Math.abs(monthDistance(m,key))<Math.abs(monthDistance(best,key))?m:best,months[0]);
}
function monthDistance(a,b){const [ay,am]=a.split("-").map(Number),[by,bm]=b.split("-").map(Number);return (ay*12+am)-(by*12+bm)}
// A day panel is a narrow column, and a full entry card in it is mostly air:
// a mount tag, a taped corner, an accession number and a four line excerpt to
// say one thing happened. A day reads better as a log, one line each.
function dayRow(e,tag="li"){
  const t=topic(e.topics?.[0]);
  return `<${tag} class="day-row" data-entry="${esc(e.id)}" style="--topic:${t.color}">
    ${e.image?`<img class="day-row-thumb" src="${esc(e.image)}" alt="" loading="lazy">`:""}
    <span class="day-row-copy">
      <span class="day-row-kind">${esc(e.type)}${e.topics?.length?` &middot; ${esc(t.name)}`:""}</span>
      <b>${e.type==="Quote"?`&ldquo;${esc(e.title)}&rdquo;`:esc(e.title)}</b>
      ${e.excerpt?`<small>${esc(e.excerpt)}</small>`:""}
    </span>
  </${tag}>`;
}
function calendar(){
  const y=state.month.getFullYear(),m=state.month.getMonth(),first=new Date(y,m,1);
  const start=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate(),cells=[];
  const dates=datesWithSomething();
  for(let i=0;i<start;i++)cells.push(`<button class="day muted" disabled aria-hidden="true"></button>`);
  let monthCount=0;
  for(let d=1;d<=days;d++){
    const date=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const items=dayItems(date);monthCount+=items.length;
    const dots=[...new Set(items.flatMap(e=>e.topics||[]))].slice(0,4)
      .map(id=>`<i class="dot" style="background:${topic(id).color}"></i>`).join("");
    cells.push(`<button class="day ${date===state.selectedDate?"selected":""} ${date===todayKey?"is-today":""} ${items.length?"has-items":""}" data-date="${date}" aria-label="${esc(fmtDate(date))}${items.length?`, ${items.length} item${items.length>1?"s":""}`:""}"><span class="day-no">${d}</span><span class="dots">${dots}</span>${items.length?`<span class="day-more">${items.length}</span>`:""}</button>`);
  }
  const label=new Date(state.selectedDate+"T12:00:00").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const near=nearestMonth(state.month,dates);
  const monthKey=`${y}-${String(m+1).padStart(2,"0")}`;
  const monthItems=[...state.data.entries.filter(e=>(e.occurredAt||"").startsWith(monthKey)),...state.data.tasks.filter(t=>(t.dueAt||"").startsWith(monthKey)).map(t=>({...t,type:"Task",occurredAt:t.dueAt}))].sort((a,b)=>(b.occurredAt||"").localeCompare(a.occurredAt||""));
  const monthPhotos=monthItems.filter(e=>e.image).slice(0,4);
  const jump=!monthCount&&near&&near!==monthKey
    ? `<p class="empty small">Nothing this month. <button class="linkish" data-jump="${near}">Go to ${new Date(near+"-01T12:00:00").toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</button></p>` : "";
  return `<section>${pageHead("A visual journal","Calendar","Move through the archive by day: photographs, notes, plans and small moments gathered into the month they happened.")}
    <div class="calendar-shell"><div>
      <div class="calendar-head">
        <button class="icon-button" data-month="-1" aria-label="Previous month">&larr;</button>
        <h2>${first.toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</h2>
        <button class="icon-button" data-month="1" aria-label="Next month">&rarr;</button>
      </div>
      <div class="calendar-modes" aria-label="Calendar view"><button class="${state.calendarMode==="month"?"active":""}" data-calendar-mode="month">Month</button><button class="${state.calendarMode==="agenda"?"active":""}" data-calendar-mode="agenda">Agenda</button></div>
      <p class="month-count">${monthCount?`${monthCount} item${monthCount>1?"s":""} this month`:"Nothing recorded this month"}${monthKey!==todayKey.slice(0,7)?` &middot; <button class="linkish" data-jump="${todayKey.slice(0,7)}">This month</button>`:""}</p>
      ${state.calendarMode==="month"?`<div class="week">${["M","T","W","T","F","S","S"].map(x=>`<span>${x}</span>`).join("")}</div><div class="calendar-grid">${cells.join("")}</div>`:`<ol class="calendar-agenda">${monthItems.length?monthItems.map(e=>`<li><time>${fmtDate(e.occurredAt)}</time>${dayRow(e,"div")}</li>`).join(""):`<li class="empty">Nothing recorded this month.</li>`}</ol>`}
      ${jump}
      ${monthItems.length?`<aside class="month-postcard"><div><p class="eyebrow">Month postcard</p><b>${first.toLocaleDateString("en-GB",{month:"long"})}, in ${monthItems.length} ${monthItems.length===1?"record":"records"}</b></div>${monthPhotos.length?`<div>${monthPhotos.map(e=>`<img src="${esc(e.image)}" alt="">`).join("")}</div>`:""}</aside>`:""}
    </div>
    <aside class="selected-day">
      <p class="eyebrow">${state.selectedDate===todayKey?"Today":"Selected day"}</p>
      <h3>${label}</h3>
      ${(()=>{
        // A day holds two different things. Tasks belong in a list you can read
        // the state of at a glance, ticked or not; entries are records and stay
        // as cards. Running them together as one card list said neither.
        const dayTasks=state.data.tasks.filter(t=>t.dueAt===state.selectedDate);
        const dayEntries=state.data.entries.filter(e=>e.occurredAt===state.selectedDate);
        if(!dayTasks.length&&!dayEntries.length)return `<p class="empty">Nothing recorded on this day.</p>`;
        const left=dayTasks.filter(t=>!t.completedAt).length;
        return `${dayTasks.length?`<section class="day-part"><h4 class="section-title">Due<span class="task-count">${left?`${left} left`:"all done"}</span></h4><div class="tasks day-tasks">${dayTasks.map(taskRow).join("")}</div></section>`:""}
        ${dayEntries.length?`<section class="day-part"><h4 class="section-title">Entries</h4><ol class="day-log">${dayEntries.map(e=>dayRow(e)).join("")}</ol></section>`:""}`;
      })()}
    </aside></div>
  </section>`;
}
function coverPlate(b){
  const t=topic(b.topics?.[0]);
  return `<div class="book-cover book-plate" style="--topic:${t.color}" aria-hidden="true"><span class="plate-rule"></span><span class="plate-mark">${esc((b.title||"?")[0])}</span><span class="plate-title">${esc(b.title)}</span></div>`;
}
// Every image the archive already holds, newest first. Nothing new to host:
// these are the same files the entries use, so they are already cached.
function galleryGrid(){
  // One tile per entry rather than per photograph: four shots of the same day
  // are one thing that happened, and the entry already shows them all.
  const sets=state.data.entries.filter(e=>e.images?.length)
    .sort((a,b)=>(b.occurredAt||b.createdAt||"").localeCompare(a.occurredAt||a.createdAt||""));
  if(!sets.length)return `<p class="empty">No photographs in the archive yet.</p>`;
  return `<div class="shot-grid">${sets.map(e=>{
    const n=e.images.length,cover=e.images[0];
    return `<button class="shot ${n>1?"is-set":""}" data-gallery-entry="${esc(e.id)}" style="--topic:${topic(e.topics?.[0]).color}" aria-label="View ${esc(e.title)}, ${n} photograph${n>1?"s":""}"><img src="${esc(cover.src)}" alt="${esc(cover.alt||"")}" loading="lazy" decoding="async">${n>1?`<span class="shot-count">${icon("photos")}${n}</span>`:""}<span class="shot-cap">${esc(e.title)}</span></button>`;
  }).join("")}</div>`;
}
// A scrap is a thing caught in passing: a line overheard, a thought, something
// to look up. It carries no date and no shape, so it is pinned as a card on a
// board rather than filed as a dated entry, and reads at a glance.
function scrapBoard(){
  const scraps=state.data.entries.filter(e=>e.type==="Scrap");
  if(!scraps.length)return `<p class="empty">Nothing pinned yet. A scrap is a note in <code>scraps/</code> with <code>type: scrap</code>.</p>`;
  return `<div class="scrap-board">${scraps.map((e,i)=>{
    const t=topic(e.topics?.[0]),date=fmtDate(e.occurredAt||e.createdAt);
    return `<article class="scrap tilt-${i%4}" data-entry="${esc(e.id)}" style="--topic:${t.color};--soft:${t.soft}"><span class="pin" aria-hidden="true"></span><p class="scrap-text">${inline(e.title||"")}</p>${e.excerpt&&e.excerpt!==e.title?`<p class="scrap-note">${esc(e.excerpt)}</p>`:""}<p class="scrap-foot">${e.topics?.length?`<span>${esc(t.name)}</span>`:"<span></span>"}${date?`<time>${date}</time>`:""}</p></article>`;
  }).join("")}</div>`;
}
function library(){
  let body="";
  if(state.library==="gallery")body=galleryGrid();
  else if(state.library==="reading")body=`<div class="book-grid">${state.data.books.map(b=>`<article class="book ${b.cover?"":"has-plate"}" data-book="${b.id}"><span class="acc-no">No. ${accNo(b.id)}</span>${b.cover?`<img class="book-cover" src="${b.cover}" alt="" loading="lazy">`:coverPlate(b)}<div class="book-copy"><h3>${esc(b.title)}</h3><p>${esc(b.author)}</p><div class="book-links"><span>${(b.notes||[]).length} notes</span><span>${(b.quotes||[]).length} quotes</span></div><span class="status">${esc(b.status.replaceAll("-"," "))}${b.status==="reading"?` · ${b.progress}%`:""}</span><div class="progress"><i style="width:${b.progress}%"></i></div></div></article>`).join("")||`<p class="empty">Your library is empty.</p>`}</div>`;
  else if(state.library==="writing")body=writingList();
  else if(state.library==="journeys")body=journeys().length?journeyStrip(true):`<p class="empty">No journeys yet. Add <code>journey: "Name"</code> to a note and its entries thread together here.</p>`;
  else {
    const notes=state.data.entries.filter(e=>["Note","Journal","Quote"].includes(e.type)).sort((a,b)=>(b.occurredAt||b.createdAt||"").localeCompare(a.occurredAt||a.createdAt||""));
    body=`<div class="entry-list">${notes.map(e=>entryCard(e)).join("")||`<p class="empty">No notes kept yet.</p>`}</div>`;
  }
  const tabs={writing:"Highlights",notes:"Notes",journeys:"Journeys",reading:"Books",gallery:"Photos"};
  return `<section class="library-index">${pageHead("Browse by format","Library","Highlights are a small selection chosen to share. Notes gathers notes, journals and quotes; journeys, books and photographs keep their useful shapes.")}<div class="library-tabs">${Object.entries(tabs).map(([x,label])=>`<button class="filter ${state.library===x?"active":""}" data-library="${x}">${label}</button>`).join("")}</div>${body}</section>`;
}
// A topic may hold sub-topics: Self care covers ADHD, and later therapy,
// fitness, the dentist. A parent counts and shows its children's items too.
function childTopics(id){return Object.entries(state.data.topics).filter(([,t])=>t.parent===id).map(([slug])=>slug)}
function topicFamily(id){return [id,...childTopics(id)]}
function inTopic(item,id){const fam=topicFamily(id);return item.topics?.some(t=>fam.includes(t))}
// counts tasks too: a topic reaches this page if anything at all uses it,
// so leaving tasks out showed a live topic as holding nothing
function topicCount(id){return state.data.entries.filter(e=>inTopic(e,id)).length+state.data.books.filter(b=>inTopic(b,id)).length+state.data.tasks.filter(t=>inTopic(t,id)).length}
function topicLatest(id){return state.data.entries.filter(e=>inTopic(e,id)).map(e=>e.occurredAt||e.createdAt||"").sort().pop()||""}
// A topic can carry the most recent photograph taken under it, so Motoring
// shows the Mini and Self care shows the bag of peas. Real pictures from the
// archive rather than stock: nothing to host, nothing that is not yours, and
// it changes on its own as you write. A topic with no photograph keeps its
// drawn ground.
function topicPhoto(id){
  // Your own photographs come first: a topic you have written about with a
  // camera should be illustrated by your own work, not by stock. `photo:` in
  // build-data is the default underneath, for a topic that has none yet.
  const own=state.data.entries
    .filter(e=>e.image&&e.topics?.[0]===id)
    .sort((a,b)=>(b.occurredAt||b.createdAt||"").localeCompare(a.occurredAt||a.createdAt||""));
  // With several to choose from it turns over daily, the way the Today widget
  // does: the same all day, a different one tomorrow.
  // Offset the rotation by the topic, or two topics sharing a photograph pick
  // the same one on the same day: Family and Motoring both showed the Mini.
  if(own.length){
    let h=0;for(const c of id)h=(h*31+c.charCodeAt(0))>>>0;
    return {src:own[own.length===1?0:(dayIndex(own.length)+h)%own.length].image};
  }
  const named=state.data.topics[id]?.photo;
  return named?{src:named}:null;
}
function spacePreview(id,photo){
  if(id==="reading"){
    const covers=state.data.books.filter(b=>b.cover).slice(0,4);
    return covers.length?`<span class="space-reading-preview" aria-hidden="true">${covers.map(b=>`<img src="${esc(b.cover)}" alt="">`).join("")}</span>`:"";
  }
  if(id==="technology")return `<span class="space-tech-preview" aria-hidden="true"><i>&lt;/&gt;</i><b>build small_</b><em></em><em></em><em></em></span>`;
  if(id==="music")return `<span class="space-music-preview" aria-hidden="true"><i></i><b>33</b></span>`;
  if(id==="life")return `<span class="space-life-preview" aria-hidden="true"><i></i><i></i><i></i><b>life, lately</b></span>`;
  if(id==="gardening")return `<span class="space-garden-preview" aria-hidden="true"><i></i><i></i><i></i><b>grow · tend · note</b></span>`;
  return photo?`<img class="topic-photo" src="${esc(photo.src)}" alt="" decoding="async" fetchpriority="high" onload="this.dataset.ready=1" onerror="this.closest('.topic-card').classList.remove('has-photo');this.nextElementSibling?.remove();this.remove()"><span class="topic-shade" aria-hidden="true"></span>`:"";
}
function spaceCard({id,t,count,latest,kids}){
  const photo=topicPhoto(id),special=["reading","technology","music","life","gardening"].includes(id),visual=spacePreview(id,photo);
  return `<button class="topic-card space-card space-${id} ground-${t.ground||"plain"} ${photo&&!special?"has-photo":""} ${special?"has-space-preview":""}" data-topic="${id}" style="--topic:${t.color};--soft:${t.soft}">${visual}${!visual&&t.ground==="wedge"?`<span class="topic-flag" aria-hidden="true"></span>`:""}<h2>${esc(t.name)}</h2><p>${esc(t.description)}</p>${kids.length?`<span class="topic-kids">${kids.map(k=>`<span class="kid" data-topic="${k}" style="--topic:${state.data.topics[k].color}">${esc(state.data.topics[k].name)}</span>`).join("")}</span>`:""}</button>`;
}
function topics(){
  const list=Object.entries(state.data.topics).filter(([,t])=>!t.parent).map(([id,t])=>({id,t,count:topicCount(id),latest:topicLatest(id),kids:childTopics(id)}));
  list.sort((a,b)=>(b.latest||"").localeCompare(a.latest||"")||b.count-a.count);
  return `<section class="spaces-index">${pageHead("Rooms in the archive","Spaces","Enter by subject. The rooms reorder themselves as the archive grows, bringing the most recently used to the front.")}<div class="topic-grid">${list.map(spaceCard).join("")}</div></section>`;
}
// Search reads the whole note, not just its first paragraph. Everything the
// archive is for is finding a thing again later, and the words that identify
// an entry are usually well past the excerpt.
function searchPool(){return [...state.data.entries,...state.data.tasks.map(t=>({...t,type:"Task",excerpt:t.note||""}))]}
function haystack(e){return [e.title,e.excerpt,e.author,e.body,...(e.topics||[]).map(x=>topic(x).name)].filter(Boolean).join(" ").toLowerCase()}
function searchResults(q){
  const term=q.trim().toLowerCase();
  return searchPool().filter(e=>(state.filter==="all"||e.type===state.filter)&&(!term||haystack(e).includes(term)));
}
// Show why a result matched: the line the term appears on, trimmed around it,
// with the term marked. Falls back to the excerpt when the match is already
// visible in the title or the excerpt itself.
function matchSnippet(e,q){
  const term=q.trim();
  if(!term)return "";
  const low=term.toLowerCase();
  if((e.title||"").toLowerCase().includes(low)||(e.excerpt||"").toLowerCase().includes(low))return "";
  // strip the markdown so the snippet reads as prose rather than as source
  const text=String(e.body||"")
    .replace(/```[\s\S]*?```/g," ")
    .replace(/^!\[[^\]]*\]\([^)]*\)$/gm," ")
    .replace(/^#{1,6}\s*/gm,"")
    .replace(/^\s*[-*]\s+/gm,"")
    .replace(/\[\[([^\]|]+)\|?[^\]]*\]\]/g,"$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g,"$1")
    .replace(/[*`>]/g,"")
    .replace(/\s+/g," ").trim();
  const i=text.toLowerCase().indexOf(low);
  if(i<0)return "";
  const from=Math.max(0,i-70),to=Math.min(text.length,i+term.length+90);
  // start and end on whole words, or the snippet opens mid-word
  let head=text.slice(from,i); if(from>0)head=head.replace(/^\S*\s+/,"");
  let tail=text.slice(i+term.length,to); if(to<text.length)tail=tail.replace(/\s+\S*$/,"");
  const hit=text.slice(i,i+term.length);
  return `${from>0?"&hellip; ":""}${esc(head)}<mark>${esc(hit)}</mark>${esc(tail)}${to<text.length?" &hellip;":""}`;
}
function search(){const q=state.search,pool=searchPool(),present=new Set(pool.map(x=>x.type)),types=["all",...["Journal","Note","Reading","Quote","Journey","Task","Event"].filter(t=>present.has(t))],items=searchResults(q);return `<section>${pageHead("Find anything","Search","Search across titles, words, types and topics.")}<input class="search-box" type="search" value="${esc(state.search)}" placeholder="Search noted…" autofocus><div class="search-filters">${types.map(t=>`<button class="filter ${state.filter===t?"active":""}" data-filter="${t}">${t}</button>`).join("")}</div><div class="entry-list search-results">${items.length?items.map(e=>entryCard(e,matchSnippet(e,q))).join(""):`<p class="empty">No matching records.</p>`}</div></section>`}
function writing(){
  // Writing is a selection, not a second copy of the archive. An entry joins
  // it by saying so with `writing: true`; publishedAt keeps its own job of
  // marking what is not held back.
  return `<section class="writing-page">${pageHead("Selected writing","Writing","Pieces chosen from the archive, rather than everything in it.")}${writingList()}</section>`;
}
// The bottom bar holds five routes and is full, so Writing had no way in on a
// phone: it lived only in the desktop top nav. The selection belongs with the
// other kept things anyway, so Library carries it as a tab and #writing stays
// a route of its own for anything already linking to it.
function writingList(){
  const items=state.data.entries.filter(e=>e.writing)
    .sort((a,b)=>(b.occurredAt||b.createdAt||"").localeCompare(a.occurredAt||a.createdAt||""));
  return items.length
    ? `<div class="entry-list">${items.map(e=>entryCard(e)).join("")}</div>`
    : `<p class="empty">Nothing selected yet. Add <code>writing: true</code> to a note's frontmatter and it will appear here.</p>`;
}
// A journey is the one type whose whole point is sequence, and the app was
// showing its entries as unrelated notes. Gather them by thread name, in day
// order, so day 5 and day 12 are visibly the same undertaking.
function journeyName(id){return decodeURIComponent(id||"")}
function journeyEntries(name){
  return state.data.entries.filter(e=>e.journey===name)
    .sort((a,b)=>(a.day||0)-(b.day||0)||(a.occurredAt||"").localeCompare(b.occurredAt||""));
}
function journeys(){
  const names=[...new Set(state.data.entries.map(e=>e.journey).filter(Boolean))];
  return names.map(name=>{const rows=journeyEntries(name);return {name,rows,last:rows[rows.length-1]}});
}
// A journey either counts towards a number or it just accumulates. Weight and
// distance have a start, a target and a reading each check-in, so they get a
// bar. Learning the guitar has none of that, so it gets a dot per entry: the
// same idea, told by how much of the row is filled in.
function journeyProgress(rows){
  const start=rows.map(r=>r.start).find(v=>typeof v==="number");
  const target=rows.map(r=>r.target).find(v=>typeof v==="number");
  const readings=rows.filter(r=>typeof r.metric==="number");
  if(typeof start!=="number"||typeof target!=="number"||start===target)return null;
  const latest=readings.length?readings[readings.length-1].metric:start;
  const unit=rows.map(r=>r.unit).find(Boolean)||"";
  // Works in either direction: losing weight counts down, running further counts up.
  const pct=Math.max(0,Math.min(100,Math.round((start-latest)/(start-target)*100)));
  const moved=Math.round(Math.abs(start-latest)*10)/10,left=Math.round(Math.abs(latest-target)*10)/10;
  return {start,target,latest,unit,pct,moved,left,readings};
}
function fmtMetric(n,unit){return `${Math.round(n*10)/10}${unit?esc(unit):""}`}
function journeyBar(p){
  return `<div class="journey-progress"><div class="journey-bar" role="img" aria-label="${p.pct}% of the way there"><i style="width:${p.pct}%"></i></div><p class="journey-numbers"><span>${fmtMetric(p.start,p.unit)} start</span><b>${fmtMetric(p.latest,p.unit)}</b><span>${fmtMetric(p.target,p.unit)} goal</span></p></div>`;
}
// One mark per entry, so a long thread reads as progress at a glance. Beyond
// thirty the row would stop being readable, so the rest are counted instead.
function journeyDots(n){
  const shown=Math.min(n,30);
  return `<p class="journey-dots"><span role="img" aria-label="${n} ${n===1?"entry":"entries"} so far">${Array.from({length:shown},()=>`<i></i>`).join("")}${n>shown?`<i class="more"></i>`:""}</span><em>${n} kept${n>shown?" so far":""}</em></p>`;
}
function journeyStrip(bare=false){
  const rows=journeys();
  if(!rows.length)return "";
  return `<section class="journey-strip">${bare?"":`<h2 class="section-title">Journeys</h2>`}<div class="journey-cards">${rows.map(({name,rows:items,last})=>{
    const t=topic(items[0].topics?.[0]),days=items.map(i=>i.day).filter(Boolean);
    return `<article class="journey-card" data-journey="${esc(name)}" style="--topic:${t.color};--soft:${t.soft}"><p class="eyebrow">${esc(t.name)}</p><h3>${esc(name)}</h3><p class="journey-last">${esc(last.title)}</p><p class="journey-meta">${days.length?`Day ${Math.max(...days)} &middot; `:""}${items.length} ${items.length===1?"entry":"entries"}${last.occurredAt?` &middot; ${fmtDate(last.occurredAt)}`:""}</p>${(()=>{const p=journeyProgress(items);return p?journeyBar(p):journeyDots(items.length)})()}</article>`;
  }).join("")}</div></section>`;
}
function journeyPage(id){
  const name=journeyName(id),rows=journeyEntries(name);
  if(!rows.length)return `<section>${pageHead("Journey","Not found","")}<p class="empty">No journey by that name.</p></section>`;
  const t=topic(rows[0].topics?.[0]),days=rows.map(r=>r.day).filter(Boolean);
  const span=(()=>{const dates=rows.map(r=>r.occurredAt).filter(Boolean).sort();if(!dates.length)return "";
    const from=new Date(dates[0]+"T12:00:00"),to=new Date(dates[dates.length-1]+"T12:00:00");
    const weeks=Math.round((to-from)/6048e5);return weeks>0?`${weeks} week${weeks===1?"":"s"} so far`:"started this week"})();
  const facts=[days.length?`Day ${Math.max(...days)}`:"",`${rows.length} ${rows.length===1?"entry":"entries"}`,span].filter(Boolean);
  return `<section class="journey-page" style="--topic:${t.color};--soft:${t.soft}">
    <p class="back-link"><a href="${backHref("#library")}" data-back>Back</a></p>
    <div class="page-head"><div><p class="eyebrow">Journey</p><h1 class="page-title" style="color:${t.color}">${esc(name)}</h1>
      <p class="journey-facts">${facts.map(f=>`<span>${esc(f)}</span>`).join("")}</p>
      ${(()=>{const p=journeyProgress(rows);return p?`<div class="journey-goal">${journeyBar(p)}<p class="journey-goal-note">${p.left?`${fmtMetric(p.moved,p.unit)} down, ${fmtMetric(p.left,p.unit)} to go.`:"Goal reached."}</p></div>`:journeyDots(rows.length)})()}</div></div>
    <ol class="journey-thread">${rows.map(r=>`<li><a href="#entry/${encodeURIComponent(r.id)}" data-entry="${esc(r.id)}" data-return="#journey/${encodeURIComponent(name)}"><span class="journey-day">${r.day?`Day ${r.day}`:fmtDate(r.occurredAt)||"&mdash;"}</span><span class="journey-copy"><b>${esc(r.title.replace(/^Day\s+\d+:\s*/i,""))}</b><small>${esc(r.excerpt||"")}</small></span><span class="journey-reading">${typeof r.metric==="number"?fmtMetric(r.metric,rows.map(x=>x.unit).find(Boolean)||""):""}</span>${r.occurredAt?`<time>${fmtDate(r.occurredAt)}</time>`:""}</a></li>`).join("")}</ol>
  </section>`;
}
// Tasks lived only as a sidebar on Today and dots on the calendar, so nothing
// showed what was overdue, and nothing kept what was done.
function taskPage(){
  const all=state.data.tasks,open=all.filter(t=>!t.completedAt),finished=all.filter(t=>t.completedAt),done=finished.sort((a,b)=>(b.completedAt||"").localeCompare(a.completedAt||"")).slice(0,5);
  const overdue=open.filter(t=>t.dueAt&&t.dueAt<todayKey);
  const today=open.filter(t=>t.dueAt===todayKey);
  const ahead=open.filter(t=>t.dueAt&&t.dueAt>todayKey).sort((a,b)=>a.dueAt.localeCompare(b.dueAt));
  const undated=open.filter(t=>!t.dueAt);
  const next=[...overdue,...today,...ahead,...undated][0];
  const group=(label,rows,cls="")=>{const rest=rows.filter(t=>t.id!==next?.id);return rest.length?`<section class="task-group ${cls}"><h2 class="section-title">${label}<span class="task-count">${rest.length}</span></h2><div class="tasks">${rest.map(taskRow).join("")}</div></section>`:""};
  return `<section class="tasks-page">${pageHead("Still to do","To-do","A calm place for what is waiting—and what has been seen off.")}
    ${next?`<section class="task-focus"><p class="eyebrow">Next up</p>${taskRow(next)}</section>`:""}
    ${open.length||done.length?"":`<p class="empty">Nothing waiting. Add a note in <code>tasks/</code> with <code>type: task</code>.</p>`}
    ${group("Overdue",overdue,"overdue")}
    ${group("Today",today)}
    ${group("Coming up",ahead)}
    ${group("No date",undated)}
    ${done.length?`<section class="task-group"><details class="done-tasks" open><summary><span class="section-title">Recently completed<span class="task-count">${done.length}</span></span></summary><div class="tasks">${done.map(taskRow).join("")}</div></details></section>`:""}
    <p class="archive-care"><a href="#health">Check the archive</a></p>
  </section>`;
}
function healthPage(){
  const entries=state.data.entries,missingDate=entries.filter(e=>!e.occurredAt&&!e.createdAt),placeholders=entries.filter(e=>/placeholder|add later|to add/i.test(`${e.title} ${e.body||""}`)),broken=entries.filter(e=>e.image&&!/^(https?:|assets\/)/.test(e.image));
  const check=(label,items,good)=>`<section class="health-check ${items.length?"attention":"good"}"><span>${items.length||"✓"}</span><div><h2>${label}</h2><p>${items.length?items.slice(0,5).map(x=>esc(x.title)).join(" · "):good}</p></div></section>`;
  return `<section class="health-page"><p class="back-link"><a href="#tasks" data-back>Back</a></p>${pageHead("Archive care","Health check","A quiet pre-flight check for the files that make Noted.")}<div class="health-grid">${check("Missing dates",missingDate,"Every entry can find its place in the calendar.")}${check("Draft-shaped notes",placeholders,"Nothing currently reads like a placeholder.")}${check("Media paths",broken,"Published media paths look healthy.")}</div><p class="health-note">This check runs entirely in the browser against the published archive.</p></section>`;
}
// Food is a room rather than another filtered list. Recipes take the large
// clipped-card treatment; smaller kitchen notes become a dated notebook down
// the side. It is still driven entirely by ordinary Obsidian entries, so a
// new recipe or note joins the room without any page editing.
function kitchenView(items){
  const recipes=items.filter(e=>e.recipe),notes=items.filter(e=>!e.recipe);
  const lead=recipes[0]||items.find(e=>e.image)||items[0];
  const leadPhoto=lead?.image||topicPhoto("food")?.src||"";
  const dates=items.map(e=>e.occurredAt||e.createdAt).filter(Boolean).sort();
  const ingredients=[...new Set(recipes.flatMap(e=>e.recipe?.ingredients||[]))];
  const stat=(value,label)=>`<span><b>${value}</b><small>${label}</small></span>`;
  return `<div class="kitchen-room">
    <header class="kitchen-hero">
      ${leadPhoto?`<img src="${esc(leadPhoto)}" alt="${esc(lead?.imageAlt||"")}" fetchpriority="high">`:""}
      <span class="kitchen-scrim" aria-hidden="true"></span>
      <div class="kitchen-title"><p>Noted kitchen · seasonal file</p><h1>food</h1><blockquote>Recipes, experiments<br>and things made<br>for the table.</blockquote></div>
      <div class="kitchen-stats">${stat(recipes.length,"recipes")}${stat(notes.length,"field notes")}${stat(ingredients.length,"ingredients kept")}</div>
    </header>
    <div class="kitchen-shelf">
      <section class="kitchen-recipes">
        <div class="kitchen-section-head"><p>From the recipe box</p><span>${dates.length?fmtDate(dates[dates.length-1]):"Kitchen archive"}</span></div>
        ${recipes.length?recipes.map(e=>`<article class="kitchen-recipe" data-entry="${esc(e.id)}">
          ${e.image?`<figure><img src="${esc(e.image)}" alt="${esc(e.imageAlt||"")}" loading="lazy"><figcaption>Filed ${fmtDate(e.occurredAt||e.createdAt)}</figcaption></figure>`:""}
          <div class="kitchen-recipe-copy"><span class="recipe-index">Recipe · No. ${accNo(e.id)}</span><h2>${esc(e.title)}</h2><p>${esc(e.excerpt)}</p>
          <div class="recipe-facts"><span>${esc(e.recipe.time||"Unhurried")}</span><span>Serves ${esc(e.recipe.serves||"any number")}</span><span>${esc(e.recipe.difficulty||"")}</span></div>
          ${e.recipe.ingredients?.length?`<h3>From the pantry</h3><ul>${e.recipe.ingredients.slice(0,6).map(i=>`<li>${inline(i)}</li>`).join("")}</ul>`:""}<span class="open-recipe">Open recipe <b>→</b></span></div>
        </article>`).join(""):`<p class="empty">The recipe box is waiting for its first card.</p>`}
      </section>
      <aside class="kitchen-notes"><div class="kitchen-section-head"><p>Kitchen notebook</p><span>Small things worth keeping</span></div>
        ${notes.length?notes.map(e=>`<article class="kitchen-note" data-entry="${esc(e.id)}"><time>${fmtDate(e.occurredAt||e.createdAt)}</time><h3>${esc(e.title)}</h3><p>${esc(e.excerpt||"")}</p><span>Read note →</span></article>`).join(""):`<p class="empty small">No kitchen notes yet.</p>`}
      </aside>
    </div>
  </div>`;
}
const TOPIC_ROOMS={
  family:{label:"The family album",section:"Moments kept together",note:"Shared days, familiar faces, and stories that become family shorthand."},
  life:{label:"The everyday ledger",section:"Recent days",note:"The practical, ordinary and unexpectedly memorable parts of a life."},
  music:{label:"Listening room",section:"On the turntable",note:"Records in rotation, songs being learnt and sounds worth returning to."},
  reading:{label:"The reading room",section:"From the catalogue",note:"Books, marginalia and sentences that followed you home."},
  technology:{label:"Workbench / log",section:"Recent transmissions",note:"Small software, useful systems and notes from the machine room."},
  motoring:{label:"Road book",section:"From the road",note:"Machines, journeys and the particular pleasure of getting there."},
  gardening:{label:"Seasonal field book",section:"From the garden",note:"What was planted, what grew and what the weather decided instead."}
};
function topicRoom(id,t,items,books,kids){
  const room=TOPIC_ROOMS[id],sorted=[...items].sort((a,b)=>(b.occurredAt||b.createdAt||"").localeCompare(a.occurredAt||a.createdAt||""));
  const feature=sorted.find(e=>e.image)||sorted[0],rest=sorted.filter(e=>e!==feature),photo=topicPhoto(id);
  const item=(e,featured=false)=>`<article class="room-item ${featured?"room-feature":""}" data-entry="${esc(e.id)}">${e.image?`<img src="${esc(e.image)}" alt="${esc(e.imageAlt||"")}" loading="lazy">`:entryPlate(e)}<div><span>${esc(e.type)} · ${fmtDate(e.occurredAt||e.createdAt)||"Filed"}</span><h2>${esc(e.title)}</h2><p>${esc(e.excerpt||"")}</p><b>Open ${e.type.toLowerCase()} →</b></div></article>`;
  return `<div class="topic-room room-${id}"><header class="room-hero ${photo?"has-room-photo":""}">${photo?`<img src="${esc(photo.src)}" alt="" fetchpriority="high"><i aria-hidden="true"></i>`:""}<div class="room-hero-copy"><p>${esc(room.label)}</p><h1>${esc(t.name)}</h1><blockquote>${esc(room.note)}</blockquote></div><div class="room-count"><b>${items.length+books.length}</b><span>things kept</span></div></header>${kids.length?`<nav class="room-paths" aria-label="${esc(t.name)} paths"><span>Browse the room</span>${kids.map(k=>`<button class="kid" data-topic="${k}" style="--topic:${state.data.topics[k].color}">${esc(state.data.topics[k].name)}</button>`).join("")}</nav>`:""}<div class="room-section-head"><p>${esc(room.section)}</p><span>${sorted[0]?`Last filed ${fmtDate(sorted[0].occurredAt||sorted[0].createdAt)}`:"The shelves are waiting"}</span></div>${feature?item(feature,true):""}${rest.length?`<div class="room-grid">${rest.map(e=>item(e)).join("")}</div>`:""}${books.length?`<div class="room-books"><div class="room-section-head"><p>On the shelves</p><span>${books.length} ${books.length===1?"book":"books"}</span></div><div class="book-grid">${books.map(b=>`<article class="book ${b.cover?"":"has-plate"}" data-book="${b.id}"><span class="acc-no">No. ${accNo(b.id)}</span>${b.cover?`<img class="book-cover" src="${b.cover}" alt="" loading="lazy">`:coverPlate(b)}<div class="book-copy"><h3>${esc(b.title)}</h3><p>${esc(b.author)}</p><span class="status">${esc(b.status.replaceAll("-"," "))}${b.status==="reading"?` · ${b.progress}%`:""}</span></div></article>`).join("")}</div></div>`:""}</div>`;
}
function ordered(items){return [...items].sort((a,b)=>(b.occurredAt||b.createdAt||"").localeCompare(a.occurredAt||a.createdAt||""))}
function codeBlocks(body=""){return [...String(body).matchAll(/```([^\n]*)\n([\s\S]*?)```/g)].map(m=>({lang:m[1]||"text",code:m[2].trim()}))}
function snippetLine(code=""){return String(code).split("\n").map(x=>x.trim()).find(x=>x&&!/^[{[(]$/.test(x))||"Code sample"}
function technologySpace(items){
  const rows=ordered(items),projects=rows.filter(e=>/github\.com|plugin|project/i.test(e.body||e.title)),snippets=rows.flatMap(e=>codeBlocks(e.body).map(s=>({...s,e}))),lead=projects[0]||rows[0];
  return `<div class="tech-space"><header class="tech-console"><div class="tech-chrome"><i></i><i></i><i></i><span>noted://workspace/technology</span></div><div class="tech-console-copy"><p>Personal development environment</p><h1>Build small.<br><em>Build useful.</em></h1><p>Projects, sites, code and the decisions behind them.</p></div><dl><div><dt>Projects</dt><dd>${projects.length}</dd></div><div><dt>Snippets</dt><dd>${snippets.length}</dd></div><div><dt>Notes</dt><dd>${rows.length}</dd></div></dl></header>${lead?`<section class="tech-feature" data-entry="${esc(lead.id)}"><div><span>Latest project · ${fmtDate(lead.occurredAt||lead.createdAt)}</span><h2>${esc(lead.title)}</h2><p>${esc(lead.excerpt)}</p><b>Open project log →</b></div>${snippets[0]?`<pre data-lang="${esc(snippets[0].lang)}"><code>${esc(snippets[0].code.split("\n").slice(0,8).join("\n"))}</code></pre>`:`<div class="tech-diagram" aria-hidden="true"><i></i><i></i><i></i><i></i></div>`}</section>`:""}<div class="tech-columns"><section><h2>Project index</h2>${rows.map((e,i)=>`<article class="tech-row" data-entry="${esc(e.id)}"><span>${String(i+1).padStart(2,"0")}</span><div><b>${esc(e.title)}</b><small>${esc(e.excerpt)}</small></div><time>${fmtDate(e.occurredAt||e.createdAt)}</time></article>`).join("")}</section><aside><h2>Snippet drawer</h2>${snippets.length?snippets.slice(0,3).map(s=>`<button class="snippet-card" data-entry="${esc(s.e.id)}"><span>${esc(s.lang)}</span><code>${esc(snippetLine(s.code))}</code></button>`).join(""):`<p class="tech-empty">Code fences added in Obsidian will collect here automatically.</p>`}</aside></div></div>`;
}
function musicSpace(items){
  const rows=ordered(items),playlists=rows.map(e=>({e,tracks:bulletsOf(e.body)})).filter(x=>x.tracks.length),practice=rows.filter(e=>e.journey);
  const journey=practice[0]?.journey,maxDay=Math.max(0,...practice.map(e=>e.day||0));
  return `<div class="music-space"><header class="music-stage"><span class="groove" aria-hidden="true"></span><div><p>Noted listening room</p><h1>music</h1><blockquote>What the speakers are playing,<br>and what the fingers are learning.</blockquote></div><b>${playlists.reduce((n,p)=>n+p.tracks.length,0)}<small>things in rotation</small></b></header><div class="music-cabinets"><section><h2>In rotation</h2>${playlists.map(({e,tracks})=>`<article class="record-card" data-entry="${esc(e.id)}">${e.image?`<img src="${esc(e.image)}" alt="${esc(e.imageAlt||"")}">`:""}<div><span>${esc(e.title)}</span><ol>${tracks.slice(0,5).map((raw,i)=>{const t=trackParts(raw);return `<li><i>${String(i+1).padStart(2,"0")}</i>${esc(t.main)}${t.sub?`<small>${esc(t.sub)}</small>`:""}</li>`}).join("")}</ol></div></article>`).join("")}</section><aside><h2>Practice journey</h2>${practice.length?`<button class="practice-progress" data-journey="${esc(journey)}"><span>Learning guitar</span><b>Day ${maxDay}</b><i><em style="width:${Math.min(100,maxDay/30*100)}%"></em></i><small>${practice.length} milestones kept · open the full journey →</small></button>${practice.map(e=>`<article class="practice-slip" data-entry="${esc(e.id)}"><span>${e.day?`Day ${e.day}`:fmtDate(e.occurredAt)}</span><b>${esc(e.title.replace(/^Day\s+\d+:\s*/i,""))}</b><p>${esc(e.excerpt)}</p></article>`).join("")}`:`<p>Journey entries will collect here.</p>`}</aside></div></div>`;
}
function readingSpace(items,books){
  const quotes=items.filter(e=>e.type==="Quote"),notes=items.filter(e=>e.type!=="Quote"),reading=books.filter(b=>b.status==="reading");
  return `<div class="reading-space"><header class="reading-mast"><p>Private circulation library</p><h1>reading room</h1><div>${reading.length?`Currently reading · ${esc(reading[0].title)} · ${reading[0].progress}%`:"Books, marginalia and sentences worth keeping"}</div></header>${quotes.length?`<section class="reading-quote-wall">${quotes.map(q=>`<blockquote data-entry="${esc(q.id)}"><span>From the commonplace book</span>“${esc(q.title)}”<cite>${esc(q.author||"")}</cite></blockquote>`).join("")}</section>`:""}<section class="reading-shelves"><div class="reading-label"><h2>The shelves</h2><span>${books.length} volumes · ${books.filter(b=>b.status==="finished").length} finished</span></div><div class="shelf-row">${books.map(b=>`<article class="shelf-book" data-book="${esc(b.id)}">${b.cover?`<img src="${esc(b.cover)}" alt="">`:coverPlate(b)}<div><b>${esc(b.title)}</b><small>${esc(b.author)}</small><span>${esc(b.status.replaceAll("-"," "))}${b.status==="reading"?` · ${b.progress}%`:""}</span></div></article>`).join("")}</div></section>${notes.length?`<section class="reading-margins"><h2>Marginalia</h2>${notes.map(e=>`<article data-entry="${esc(e.id)}"><time>${fmtDate(e.occurredAt||e.createdAt)}</time><b>${esc(e.title)}</b><p>${esc(e.excerpt)}</p></article>`).join("")}</section>`:""}</div>`;
}
function gardeningSpace(items){const rows=ordered(items),lead=rows.find(e=>e.image)||rows[0];return `<div class="garden-space"><header class="garden-gate">${lead?.image?`<img src="${esc(lead.image)}" alt="${esc(lead.imageAlt||"")}">`:""}<div><p>Seasonal field book · late summer</p><h1>in the garden</h1><blockquote>Jobs done, things growing,<br>weather permitting.</blockquote></div></header><div class="garden-bed"><section><h2>Field observations</h2><ol>${rows.map((e,i)=>`<li data-entry="${esc(e.id)}"><time>${fmtDate(e.occurredAt||e.createdAt)}</time><span class="garden-pin"></span><div><h3>${esc(e.title)}</h3><p>${esc(e.excerpt)}</p></div>${e.image?`<img src="${esc(e.image)}" alt="">`:""}</li>`).join("")}</ol></section><aside><span>Season tally</span><b>${rows.length}</b><p>notes from the growing year</p><i aria-hidden="true">${icon("leaf")}</i></aside></div></div>`}
function motoringSpace(items){const rows=ordered(items),photos=rows.flatMap(e=>(e.images||[]).map(x=>({...x,e})));return `<div class="motor-space"><header><div><p>Noted motor file</p><h1>the road<br>book</h1><span>${rows.length} journeys · ${photos.length} photographs</span></div>${photos[0]?`<img src="${esc(photos[0].src)}" alt="${esc(photos[0].alt||"")}">`:""}</header><section class="motor-log"><h2>Garage & road log</h2>${rows.map((e,i)=>`<article data-entry="${esc(e.id)}"><span>${String(i+1).padStart(3,"0")}</span>${e.image?`<img src="${esc(e.image)}" alt="">`:""}<div><time>${fmtDate(e.occurredAt||e.createdAt)}</time><h3>${esc(e.title)}</h3><p>${esc(e.excerpt)}</p><b>Open log →</b></div></article>`).join("")}</section></div>`}
function familySpace(items){const rows=ordered(items);return `<div class="family-space"><header><p>Our shared archive</p><h1>family album</h1><span>Ordinary days are the ones worth keeping.</span></header><div class="album-grid">${rows.map((e,i)=>`<article class="album-photo album-tilt-${i%4}" data-entry="${esc(e.id)}">${e.image?`<img src="${esc(e.image)}" alt="${esc(e.imageAlt||"")}">`:entryPlate(e)}<div><time>${fmtDate(e.occurredAt||e.createdAt)}</time><h2>${esc(e.title)}</h2><p>${esc(e.excerpt)}</p></div></article>`).join("")}</div></div>`}
function lifeSpace(items,kids){const rows=ordered(items);return `<div class="life-space"><header><p>Personal dashboard · ${fmtDate(todayKey)}</p><h1>life, lately</h1><blockquote>A place for the ordinary machinery<br>and the things underneath it.</blockquote></header><nav>${kids.map((k,i)=>`<button data-topic="${k}" style="--topic:${topic(k).color}"><i>${String(i+1).padStart(2,"0")}</i><b>${esc(topic(k).name)}</b><span>${topicCount(k)} kept</span></button>`).join("")}</nav><section><div class="life-now"><span>Recently filed</span><b>${rows.length}</b></div>${rows.map(e=>`<article data-entry="${esc(e.id)}">${e.image?`<img src="${esc(e.image)}" alt="">`:entryPlate(e)}<div><time>${fmtDate(e.occurredAt||e.createdAt)}</time><h2>${esc(e.title)}</h2><p>${esc(e.excerpt)}</p></div></article>`).join("")}</section></div>`}
function bespokeTopic(id,items,books,kids){return id==="technology"?technologySpace(items):id==="music"?musicSpace(items):id==="reading"?readingSpace(items,books):id==="gardening"?gardeningSpace(items):id==="motoring"?motoringSpace(items):id==="family"?familySpace(items):id==="life"?lifeSpace(items,kids):""}
function topicView(id){const t=topic(id),kids=childTopics(id),items=state.data.entries.filter(e=>inTopic(e,id)),books=state.data.books.filter(b=>inTopic(b,id));let body=`<div class="entry-list">${items.map(e=>entryCard(e,"",id)).join("")||(books.length?"":`<p class="empty">Nothing in this topic yet.</p>`)}</div>`;if(t.mode==="listen"){
    const groups=items.map(e=>({e,rows:bulletsOf(e.body)})).filter(g=>g.rows.length);
    const rest=items.filter(e=>!bulletsOf(e.body).length);
    body=`<div class="topic-mode listen-mode">${groups.map(({e,rows})=>`<section class="listen-group"><div class="listen-head"><h3><a href="#entry/${encodeURIComponent(e.id)}">${esc(e.title)}</a></h3><span>${rows.length} ${rows.length===1?"entry":"entries"}</span></div><ol class="tracklist">${rows.map(trackRow).join("")}</ol></section>`).join("")||`<p class="empty">Nothing in this topic yet.</p>`}${rest.length?`<div class="entry-list listen-rest">${rest.map(e=>entryCard(e,"",id)).join("")}</div>`:""}</div>`;
  }
  if(t.mode==="kitchen")return `<section class="topic-page kitchen-page" style="--topic:${t.color};--soft:${t.soft}"><p class="back-link kitchen-back"><a href="${backHref("#topics")}" data-back>Back to topics</a></p>${kitchenView(items)}</section>`;
  if(TOPIC_ROOMS[id])return `<section class="topic-page bespoke-topic-page bespoke-${id}" style="--topic:${t.color};--soft:${t.soft}"><p class="back-link room-back"><a href="${backHref("#topics")}" data-back>Back to topics</a></p>${bespokeTopic(id,items,books,kids)}</section>`;
  if(t.mode==="tech")body=`<div class="topic-mode tech-mode"><div class="mode-note"><p>Technical notes keep the same Noted structure, with files and dated logs presented in a more useful form.</p></div>${body}</div>`;if(t.mode==="recipes")body=`<div class="topic-mode recipe-mode">${items.map(e=>e.recipe?`<article class="recipe-card" data-entry="${e.id}">${e.image?`<img src="${e.image}" alt="${esc(e.imageAlt)}">`:""}<div><p class="eyebrow">Recipe note</p><h2>${esc(e.title)}</h2><div class="recipe-facts"><span>${esc(e.recipe.time)}</span><span>Serves ${esc(e.recipe.serves)}</span><span>${esc(e.recipe.difficulty)}</span></div><p>${esc(e.excerpt)}</p><h3>You'll need</h3><p>${e.recipe.ingredients.map(esc).join(" · ")}</p></div></article>`:entryCard(e,"",id)).join("")||`<p class="empty">No recipes yet.</p>`}</div>`;const bookSection=books.length?`<h2 class="section-title">Books</h2><div class="book-grid">${books.map((b,i)=>`<article class="book ${b.cover?"":"has-plate"}" data-book="${b.id}"><span class="acc-no">No. ${accNo(b.id)}</span>${b.cover?`<img class="book-cover" src="${b.cover}" alt="" loading="lazy">`:coverPlate(b)}<div class="book-copy"><h3>${esc(b.title)}</h3><p>${esc(b.author)}</p><span class="status">${esc(b.status.replaceAll("-"," "))}${b.status==="reading"?` · ${b.progress}%`:""}</span><div class="progress"><i style="width:${b.progress}%"></i></div></div></article>`).join("")}</div>`:"";return `<section class="topic-page" style="--topic:${t.color};--soft:${t.soft}"><p class="back-link"><a href="${backHref("#topics")}" data-back>Back</a></p><span class="topic-mark topic-mark-page" aria-hidden="true">${esc(t.name[0])}</span><div class="page-head"><div><p class="eyebrow">Topic${t.mode?" · tailored view":""}</p><h1 class="page-title" style="color:${t.color}">${esc(t.name)}</h1><p class="lede">${esc(t.description)}</p>${kids.length?`<p class="topic-kids topic-kids-page">${kids.map(k=>`<span class="kid" data-topic="${k}" style="--topic:${state.data.topics[k].color}">${esc(state.data.topics[k].name)}</span>`).join("")}</p>`:""}${t.parent&&state.data.topics[t.parent]?`<p class="topic-parent">Part of <span class="kid" data-topic="${t.parent}" style="--topic:${state.data.topics[t.parent].color}">${esc(state.data.topics[t.parent].name)}</span></p>`:""}</div></div>${body}${bookSection}</section>`}
function authScreen(){return `<section class="auth-shell"><div class="auth-intro"><p class="eyebrow">Your private archive</p><h1 class="page-title">Welcome to noted.</h1><p class="lede">Days, thoughts, books and things worth keeping, written in Obsidian and read here.</p></div><form id="auth-form" class="auth-card"><h2>Sign in</h2><div class="field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div><div class="field"><label>Password</label><input name="password" type="password" autocomplete="current-password" minlength="8" required></div><p class="form-error" role="alert"></p><button class="submit" name="intent" value="signin">Sign in</button><p class="auth-note">This is a private Noted archive.</p></form></section>`}
function userTools(){return state.user?`<footer class="user-tools"><button data-action="logout">Sign out</button></footer>`:""}
function render(){const app=document.getElementById("app"),hash=location.hash.slice(1)||"today",[route,arg]=hash.split("/"),isPublic=route==="writing";document.body.classList.toggle("auth-view",NotedBackend.configured&&!state.user&&!isPublic);if(state.booting){app.innerHTML=skeletonPage();return}if(NotedBackend.configured&&!state.user&&!isPublic){app.innerHTML=authScreen();return}state.route=route;document.querySelectorAll(".main-nav a,.mobile-nav a").forEach(a=>a.classList.toggle("active",a.getAttribute("href")===`#${route}`));const page=route==="calendar"?calendar():route==="library"?library():route==="entry"?entryPage(decodeURIComponent(arg||"")):route==="topics"?(arg?topicView(arg):topics()):route==="writing"?writing():route==="journey"?journeyPage(arg||""):route==="tasks"?taskPage():route==="health"?healthPage():route==="search"?search():today();app.innerHTML=page+userTools();app.focus({preventScroll:true});afterRender(route,Boolean(route==="entry"||route==="journey"||(route==="topics"&&arg)))}
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
function photoDetail(id){const e=state.data.entries.find(x=>x.id===id),images=e?.images||[];if(!images.length)return;modal(`<article class="photo-view"><div class="modal-head"><div><span class="type-label">${images.length>1?`${images.length} photographs`:"Photograph"}</span><h2>${esc(e.title)}</h2></div><button class="close" data-close>×</button></div>${images.length>1?gallery(images):`<figure><img src="${esc(images[0].src)}" alt="${esc(images[0].alt||"")}">${images[0].alt?`<figcaption>${esc(images[0].alt)}</figcaption>`:""}</figure>`}</article>`)}
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1800)}
document.addEventListener("click",async e=>{
  // Back should retrace the route actually taken, not guess at one. The
  // browser already recorded it, one entry per hash move, so use that whenever
  // the trail leads somewhere inside the app; the href stays as the fallback
  // for a page opened cold from a link.
  const bk=e.target.closest("[data-back]");
  if(bk&&(state.steps||0)>0){e.preventDefault();state.steps--;history.back();return}

  const themeButton=e.target.closest("[data-theme-toggle]");
  if(themeButton){
    const current=document.documentElement.dataset.theme||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
    document.documentElement.dataset.theme=current==="dark"?"light":"dark";
    try{localStorage.setItem("noted-theme",document.documentElement.dataset.theme)}catch(error){}
    syncThemeButton();return;
  }
  // Tapping the tab you are already on takes you back to the top of it:
  // a same-hash link fires no hashchange, so handle it here.
  const nav=e.target.closest(".main-nav a,.mobile-nav a");
  // Compare the whole hash, not just the route: on topics/gardening the
  // Topics tab should still take you back up to the topic index.
  if(nav&&nav.getAttribute("href")===(location.hash||"#today")){e.preventDefault();window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});return}
  const action=e.target.closest("[data-action]")?.dataset.action;
  if(action==="logout"){await NotedBackend.signOut();state.user=null;render()}
  const close=e.target.closest("[data-close]");if(close&&e.target===close)closeModal();
  const attachment=e.target.closest("[data-view-attachment]");if(attachment){const item=state.data.entries.find(x=>x.id===attachment.dataset.entryId),file=item?.attachments?.[Number(attachment.dataset.viewAttachment)];if(file?.path){try{open(await NotedBackend.attachmentUrl(file.path),"_blank","noopener")}catch(error){toast(error.message)}}return}
  const book=e.target.closest("[data-book]");if(book){bookDetail(book.dataset.book);return}
  const photos=e.target.closest("[data-gallery-entry]");if(photos){photoDetail(photos.dataset.galleryEntry);return}
  const wander=e.target.closest("[data-wander]");if(wander){const choices=state.data.entries.filter(x=>x.type!=="Task");if(choices.length){const pick=choices[Math.floor(Math.random()*choices.length)];state.returnTo="#today";state.returnScroll=window.scrollY;location.hash=`entry/${encodeURIComponent(pick.id)}`}return}
  const entry=e.target.closest("[data-entry]");if(entry){e.preventDefault();state.returnTo=entry.dataset.return||location.hash||"#today";state.returnScroll=window.scrollY;location.hash=`entry/${encodeURIComponent(entry.dataset.entry)}`}
  const date=e.target.closest("[data-date]");if(date){state.selectedDate=date.dataset.date;render()}
  const jump=e.target.closest("[data-jump]");
  if(jump){const [jy,jm]=jump.dataset.jump.split("-").map(Number);state.month=new Date(jy,jm-1,1);render();return}
  const month=e.target.closest("[data-month]");if(month){state.month=new Date(state.month.getFullYear(),state.month.getMonth()+Number(month.dataset.month),1);render()}
  const calendarMode=e.target.closest("[data-calendar-mode]");if(calendarMode){state.calendarMode=calendarMode.dataset.calendarMode;try{localStorage.setItem("noted-calendar-mode",state.calendarMode)}catch(error){}render();return}
  const lib=e.target.closest("[data-library]");if(lib){state.library=lib.dataset.library;try{localStorage.setItem("noted-library-tab",state.library)}catch(error){}render()}
  const filter=e.target.closest("[data-filter]");if(filter){state.filter=filter.dataset.filter;render()}
  const tick=e.target.closest("[data-tick]");
  if(tick){
    const id=tick.dataset.recipe,n=Number(tick.dataset.tick),have=ticked(id);
    const next=have.includes(n)?have.filter(x=>x!==n):[...have,n];
    try{localStorage.setItem("noted-ticked-"+id,JSON.stringify(next))}catch(error){/* not remembered, still ticks */}
    tick.classList.toggle("got");
    return;
  }
  const share=e.target.closest("[data-share]");
  if(share){
    const url=location.href,title=document.querySelector(".entry-page-title")?.textContent||"noted";
    if(navigator.share)navigator.share({title,url}).catch(()=>{});
    else navigator.clipboard?.writeText(url).then(()=>toast("Link copied")).catch(()=>toast("Could not copy the link"));
    return;
  }
  const sort=e.target.closest("[data-topicsort]");if(sort){state.topicSort=sort.dataset.topicsort;try{localStorage.setItem("noted-topic-sort",state.topicSort)}catch(error){/* nothing to remember it with */}render();return}
  const jr=e.target.closest("[data-journey]");if(jr){state.returnTo=location.hash||"#library";state.returnScroll=window.scrollY;location.hash=`journey/${encodeURIComponent(jr.dataset.journey)}`;return}
  const tp=e.target.closest("[data-topic]");if(tp){state.returnTo=location.hash||"#topics";state.returnScroll=window.scrollY;location.hash=`topics/${tp.dataset.topic}`;return}
  if(e.target.closest(".main-nav a"))document.querySelector(".main-nav").classList.remove("open");
});
document.addEventListener("input",e=>{if(e.target.matches(".search-box")){state.search=e.target.value;const pos=e.target.selectionStart;document.querySelector(".search-results").innerHTML=(()=>{const items=searchResults(state.search);return items.length?items.map(e=>entryCard(e,matchSnippet(e,state.search))).join(""):`<p class="empty">No matching records.</p>`})();e.target.setSelectionRange(pos,pos)}});
document.addEventListener("submit",async e=>{
  e.preventDefault();
  if(e.target.classList.contains("home-search")){state.search=e.target.querySelector("input")?.value||"";location.hash="search";return}
  const f=new FormData(e.target),submit=e.submitter;e.target.classList.add("working");if(submit)submit.disabled=true;
  try{
    if(e.target.id==="auth-form"){const email=f.get("email"),password=f.get("password");state.user=await NotedBackend.signIn(email,password);await loadRemoteArchive();render();return}
  }catch(error){const target=e.target.querySelector(".form-error");if(target)target.textContent=error.message;else toast(error.message)}finally{e.target.classList.remove("working");if(submit)submit.disabled=false}
});
async function loadRemoteArchive(){const remote=await NotedBackend.loadData();state.data=Object.keys(remote.topics).length?remote:clone(BASE)}
async function boot(){try{const session=await NotedBackend.init();state.user=session.user;if(state.user)await loadRemoteArchive();else if(NotedBackend.configured&&location.hash==="#writing")state.data={...emptyArchive(),entries:await NotedBackend.loadPublished()};NotedBackend.onAuthChange(user=>{state.user=user;if(!user)render()})}catch(error){console.error(error);toast("Could not connect to storage")}finally{state.booting=false;render()}}
window.addEventListener("hashchange",async()=>{state.steps=(state.steps||0)+1;if(NotedBackend.configured&&!state.user&&location.hash==="#writing")state.data={...emptyArchive(),entries:await NotedBackend.loadPublished()};render()});
const headerDay=document.querySelector(".hd-day"),headerDate=document.querySelector(".hd-date");
if(headerDay&&headerDate){headerDay.textContent=now.toLocaleDateString("en-GB",{weekday:"long"});headerDate.textContent=`${now.getDate()} ${now.toLocaleDateString("en-GB",{month:"long"})}`}
function syncThemeButton(){const dark=(document.documentElement.dataset.theme||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"))==="dark",button=document.querySelector("[data-theme-toggle]");if(button){button.setAttribute("aria-label",dark?"Use light theme":"Use dark theme");button.title=dark?"Use light theme":"Use dark theme"}}
syncThemeButton();
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
  window.addEventListener("load",async()=>{try{swReg=await navigator.serviceWorker.register("sw.js",{updateViaCache:"none"});await swReg.update();checkBuild()}catch(error){/* no worker: the app still runs from the network */}});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&swReg)swReg.update().catch(()=>{})});
  // Belt and braces: the worker update can be slow to notice a new build, so
  // ask the server outright which build is deployed and reload if the running
  // one is older. Skipped when running from a checkout, where BUILD is still
  // its placeholder.
  const checkBuild=async()=>{
    if(document.hidden||reloading||BUILD.startsWith("__"))return;
    try{
      const res=await fetch(`version.json?t=${Date.now()}`,{cache:"no-store"});
      const {build}=await res.json();
      if(!build||build===BUILD)return;
      if(swReg)swReg.update().catch(()=>{});
      // The shell is served cache first, on purpose, so the app paints from
      // disk and never waits on the network. The cost is that a plain reload
      // hands back the same stale files and only refreshes them behind you:
      // every deploy took two visits to appear, and if the worker was slow to
      // update it took more than two. Since version.json has just said a newer
      // build is live, drop the shell cache and reload. The pictures live in
      // their own cache and are left alone.
      // Once per build, so a version file that never matches cannot put the
      // app into a reload loop.
      let tried="";try{tried=sessionStorage.getItem("noted-reloaded-for")||""}catch(error){}
      if(tried===build)return;
      try{sessionStorage.setItem("noted-reloaded-for",build)}catch(error){}
      try{
        const keys=await caches.keys();
        await Promise.all(keys.filter(k=>/^not(a|ed)-shell-/.test(k)).map(k=>caches.delete(k)));
      }catch(error){/* no cache storage: the reload below still helps */}
      reloading=true;location.reload();
    }catch(error){/* offline, or no version file: nothing to do */}
  };
  document.addEventListener("visibilitychange",checkBuild);
  window.addEventListener("pageshow",checkBuild);
  setInterval(checkBuild,5*60*1000);
}

// data.js is a plain <script>, parsed once at launch. An installed PWA
// resumed from the background never re-runs it, so a fresh publish only
// appeared after force-closing the app. Re-run it on return to the
// foreground instead.
let lastRefresh=Date.now();
function reloadData(){return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=`data.js?t=${Date.now()}`;s.onload=()=>{s.remove();resolve()};s.onerror=()=>{s.remove();reject(new Error("data.js unreachable"))};document.head.appendChild(s)})}
async function refreshArchive(){if(document.hidden||state.booting||Date.now()-lastRefresh<15000)return;if(document.getElementById("modal-root").innerHTML)return;lastRefresh=Date.now();try{if(NotedBackend.configured&&state.user)await loadRemoteArchive();else{await reloadData();state.data=clone(window.NOTED_DATA)}render()}catch(error){/* offline, or the fetch failed: keep showing what we already have */}}
document.addEventListener("visibilitychange",refreshArchive);
window.addEventListener("pageshow",refreshArchive);
// Back on a signal after a spell offline: pick up whatever was published
// while the archive was reading from cache.
window.addEventListener("online",()=>{lastRefresh=0;refreshArchive()});
// And a slow poll, so an app left open on a desk still catches up.
setInterval(refreshArchive,5*60*1000);

// Swipe the month grid sideways to change month, which is what a calendar on
// a phone should do. Only a clearly horizontal swipe counts, so scrolling the
// page through the grid still works.
let swipeFrom=null;
addEventListener("touchstart",e=>{
  const grid=e.target.closest?.(".calendar-grid");
  swipeFrom=grid&&e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;
},{passive:true});
addEventListener("touchend",e=>{
  if(!swipeFrom)return;
  const t=e.changedTouches[0],dx=t.clientX-swipeFrom.x,dy=t.clientY-swipeFrom.y;
  swipeFrom=null;
  if(Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.6)return;
  state.month=new Date(state.month.getFullYear(),state.month.getMonth()+(dx<0?1:-1),1);
  render();
},{passive:true});

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
