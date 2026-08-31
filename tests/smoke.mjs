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
  body:{classList:{toggle(){}}},
  getElementById:element,
  querySelectorAll(){return []},
  querySelector(){return null},
  addEventListener(){},
  createElement(){return {click(){}}}
};
const localStorage = { values:new Map(), getItem(key){return this.values.get(key)||null}, setItem(key,value){this.values.set(key,value)} };
const window = { NOTA_CONFIG:{supabaseUrl:"",supabaseAnonKey:"",allowSignUp:true}, addEventListener(){}, location:null };
const context = vm.createContext({ window,document,localStorage,location:{hash:"",origin:"http://localhost",pathname:"/"},navigator:{},console,setTimeout,clearTimeout,Date,JSON,String,Number,Map,Set,Blob,URL,crypto:globalThis.crypto,confirm(){return false},open(){} });
window.location=context.location;
vm.runInContext(files("data.js"),context,{filename:"data.js"});
vm.runInContext(files("backend.js"),context,{filename:"backend.js"});
vm.runInContext(files("app.js"),context,{filename:"app.js"});
await new Promise(resolve=>setTimeout(resolve,0));

assert.match(element("app").innerHTML,/Today/);
assert.match(element("app").innerHTML,/Export archive/);
for (const name of ["index.html","app.js","data.js"]) assert.doesNotMatch(files(name),/<\/?em\b/i);
assert.match(files("styles.css"),/@media\(max-width:480px\)/);
assert.match(files("supabase/schema.sql"),/enable row level security/g);
assert.match(files("supabase/schema.sql"),/public reads published entries/);
console.log("Nota smoke checks passed");
