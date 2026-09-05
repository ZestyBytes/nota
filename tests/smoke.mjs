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
const window = { NOTED_CONFIG:{supabaseUrl:"",supabaseAnonKey:"",allowSignUp:true}, addEventListener(){}, location:null };
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
