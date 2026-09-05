import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const files = name => fs.readFileSync(process.env.NOTED_BUILD_DIR&&["app.js","data.js","backend.js"].includes(name)?new URL(process.env.NOTED_BUILD_DIR+"/"+name,root):new URL(name, root), "utf8");
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, { id, innerHTML:"", textContent:"", classList:{add(){},remove(){},toggle(){}}, focus(){}, querySelector(){return null} });
  return elements.get(id);
}
const document = {
  documentElement:{dataset:{}},
  body:{classList:{toggle(){}},appendChild(){},style:{}},
  getElementById:element,
  querySelectorAll(){return []},
  querySelector(){return null},
  addEventListener(){},
  createElement(){return {click(){},style:{},setAttribute(){},removeAttribute(){},appendChild(){},remove(){},classList:{add(){},remove(){},toggle(){}}}}
};
const localStorage = { values:new Map(), getItem(key){return this.values.get(key)||null}, setItem(key,value){this.values.set(key,value)} };
const window = { NOTED_CONFIG:{supabaseUrl:"",supabaseAnonKey:"",allowSignUp:true}, addEventListener(){}, removeEventListener(){}, location:null };
const context = vm.createContext({ window,document,localStorage,location:{hash:"",origin:"http://localhost",pathname:"/"},navigator:{},console,setTimeout,clearTimeout,setInterval(){return 0},clearInterval(){},addEventListener(){},removeEventListener(){},matchMedia(){return {matches:false,addEventListener(){}}},Date,JSON,String,Number,Map,Set,Blob,URL,crypto:globalThis.crypto,confirm(){return false},open(){} });
window.location=context.location;
vm.runInContext(files("data.js"),context,{filename:"data.js"});
vm.runInContext(files("backend.js"),context,{filename:"backend.js"});
vm.runInContext(files("app.js"),context,{filename:"app.js"});
await new Promise(resolve=>setTimeout(resolve,0));

assert.match(element("app").innerHTML,/class="home-page"/);
// House style: no em dashes anywhere that ships.
for (const name of ["index.html","app.js","styles.css","data.js"]) assert.doesNotMatch(files(name),/\u2014/);
assert.match(files("styles.css"),/@media\(max-width:480px\)/);
assert.match(files("supabase/schema.sql"),/enable row level security/g);
assert.match(files("supabase/schema.sql"),/public reads published entries/);
console.log("Noted smoke checks passed");

// Retrieval should tolerate fragments, punctuation and accents while applying
// inclusive dates and parent Space filters to the same record.
vm.runInContext(`
  state.data.entries=[
    {id:'one',type:'Journal',title:'Café garden',excerpt:'Tomatoes by the kitchen',body:'A gardener’s late-summer notes. <script>alert(1)</script>',topics:['test-child'],occurredAt:'2026-09-03'},
    {id:'two',type:'Note',title:'Garden',body:'Tomatoes',topics:[],occurredAt:'2026-09-04'}
  ];
  state.data.tasks=[];
  state.data.topics['test-parent']={name:'Garden'};
  state.data.topics['test-child']={name:'Kitchen',parent:'test-parent'};
`,context);
const run=code=>vm.runInContext(code,context);
assert.equal(run("searchResults('tomatoes cafe').length"),1);
assert.equal(run("searchResults('gardeners late summer').length"),1);
assert.equal(run("searchResults('garden absent').length"),0);
run("state.searchSpace='test-parent';state.searchFrom='2026-09-03';state.searchTo='2026-09-03'");
assert.equal(run("searchResults('tomatoes').length"),1);
run("state.searchFrom='2026-09-04'");
assert.equal(run("searchResults('').length"),0);
const snippet=run("matchSnippet(state.data.entries[0],'cafe tomatoes script')");
assert.match(snippet,/<mark>Tomatoes<\/mark>/);
assert.doesNotMatch(snippet,/<script>/);
assert.match(run("homeLatest(state.data.entries)"),/class="latest-rail"/);
assert.equal((run("homeLatest(state.data.entries)").match(/class="latest-card"/g)||[]).length,2);
assert.doesNotMatch(run("homeLatest(state.data.entries)"),/stream-date|stream-feature/);
run(`
  const removed=[];
  const card={classList:{remove(...names){removed.push(...names)},add(name){removed.push(name)}}};
  const wrapper={remove(){removed.push('wrapper')}};
  handleImageFailure({tagName:'IMG',closest(selector){return selector==='.entry'?card:selector==='.thumb-wrap'?wrapper:null}});
  if(!removed.includes('wrapper')||!removed.includes('no-thumb'))throw Error('Image card did not collapse');
  let shotRemoved=false,sectionRemoved=false;
  const section={querySelector(){return null},remove(){sectionRemoved=true}};
  const shot={closest(){return section},remove(){shotRemoved=true}};
  handleImageFailure({tagName:'IMG',closest(selector){return selector==='.photo-shot'?shot:null}});
  if(!shotRemoved||!sectionRemoved)throw Error('Empty photo strip remains');
`);
console.log('Journal stream, search and image fallback checks passed');

assert.doesNotMatch(run("librarySpines()"),/vol-spread|aria-hidden="true".*vol-hit/);
assert.match(run("librarySpines()"),/class="cloth-book"/);
assert.equal((run("librarySpines()").match(/class="cloth-book"/g)||[]).length,run("Object.keys(state.data.topics).length"));
console.log('Library spine checks passed');

run(`state.data.entries=Array.from({length:14},(_,i)=>({id:'entry'+i,title:'Entry '+i,type:'Journal',occurredAt:'2026-09-04',topics:[]}));state.data.tasks=Array.from({length:8},(_,i)=>({id:'task'+i,title:'Task '+i,topics:[]}))`);
const home=run('today()');
assert.equal((home.match(/class="latest-card"/g)||[]).length,5);
assert.equal((home.match(/class="home-task-row /g)||[]).length,3);
assert.match(home,/5 more in the list/);
assert.match(home,/data-open-library="notes"/);
run(`state.data.entries=[{id:'weight',title:'Starting',type:'Journey',journey:'Weight',start:108,target:90,metric:108,unit:'kg',occurredAt:'2026-09-04',topics:[]}]`);
assert.match(run('homeJourneys()'),/Target 90kg/);
assert.match(run('homeJourneys()'),/data-open-library="journeys"/);
console.log('Compact Home and visible journey target checks passed');

assert.equal(run('wrapShelfPosition(-25,100,300)'),275);
assert.equal(run('wrapShelfPosition(725,100,300)'),125);
assert.equal(run('wrapShelfPosition(100,100,300)'),100);
assert.equal(run('wrapShelfPosition(33,100,0)'),33);
run(`
  state.data.topics={garden:{name:'House plants',icon:'plant',color:'#436b34'}};
  state.data.entries=[{topics:['garden'],occurredAt:'2000-01-01'}];state.data.books=[];state.data.tasks=[];
`);
assert.equal(run("spineHistory('garden').wear"),'worn');
assert.equal(run("spineHistory('garden').recent"),false);
assert.doesNotMatch(run('librarySpines()'),/>noted\.</);
assert.match(run('librarySpines()'),/cloth-symbol/);
run("state.data.entries.push({topics:['garden'],occurredAt:todayKey})");
assert.equal(run("spineHistory('garden').wear"),'worn');
assert.equal(run("spineHistory('garden').recent"),true);
assert.match(run('librarySpines()'),/cloth-bookmark/);
run(`
  const oldQuery=document.querySelector;
  const events={};
  const rail={children:[],clientWidth:240,scrollLeft:0,classList:{add(){},remove(){}},querySelectorAll(){return []},contains(){return false},addEventListener(k,v){events[k]=v},removeEventListener(k){delete events[k]},prepend(...nodes){this.children.unshift(...nodes)},append(...nodes){this.children.push(...nodes)}};
  const book=()=>({tabIndex:0,dataset:{},attributes:{},offsetWidth:62,get offsetLeft(){return 12+rail.children.indexOf(this)*69},setAttribute(k,v){this.attributes[k]=v},cloneNode(){return book()},remove(){rail.children.splice(rail.children.indexOf(this),1)}});
  rail.children=Array.from({length:5},book);
  document.querySelector=s=>s==='.cloth-shelf'?rail:null;
  setupClothShelf();
  if(rail.children.length!==15)throw Error('Loop must have exactly three runs');
  if(rail.children.filter(b=>b.tabIndex===0).length!==5)throw Error('Copies must not duplicate tab stops');
  if(rail.children.filter(b=>b.attributes['aria-hidden']==='true').length!==10)throw Error('Copies must be hidden from screen readers');
  const initial=rail.scrollLeft;rail.scrollLeft=initial-70;events.scrollend();
  if(rail.scrollLeft!==initial+275)throw Error('Loop did not preserve the visible offset');
  shelfCleanup();shelfCleanup=null;
  if(Object.keys(events).length)throw Error('Shelf events were not cleaned up');
  document.querySelector=oldQuery;
`);
console.log('Shelf history, wrap positions, duplicate accessibility and cleanup checks passed');
