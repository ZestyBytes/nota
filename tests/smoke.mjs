import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const files = name => fs.readFileSync(new URL(name, root), "utf8");
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
