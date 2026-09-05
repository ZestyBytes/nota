import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const classes=()=>{const values=new Set();return {add:v=>values.add(v),remove:v=>values.delete(v),contains:v=>values.has(v)}};
const toys=Array.from({length:5},(_,i)=>({dataset:{toy:['NeeDoh','Crazy Aaron’s','Squishee','Bao bun','Fidget'][i]},style:{left:`${30+i*15}%`},offsetWidth:50,offsetTop:240,get offsetLeft(){return parseFloat(this.style.left)*6},classList:classes(),cloneNode(){return {removeAttribute(){},classList:classes()}}}));
const handlers={};const button={addEventListener:(event,fn)=>handlers[event]=fn};const claw={classList:classes()};const message={},counter={},label={};const collection={items:[],append(t){this.items.push(t)},replaceChildren(){this.items=[]}};
const selectors={'.claw-control':button,'.claw':claw,'.claw-message':message,'[data-claw-wins]':counter,'[data-claw-label]':label,'.claw-window':{clientWidth:600,clientHeight:330},'.claw-collection':collection};
let position=14,time=0,id=0;const frames=new Map();const game={dataset:{},isConnected:true,style:{setProperty(k,v){if(k==='--claw-x')position=parseFloat(v)}},querySelector:s=>selectors[s],querySelectorAll:s=>s.includes(':not')?toys.filter(t=>!t.classList.contains('won')):toys};
const context=vm.createContext({document:{querySelectorAll:()=>[game]},requestAnimationFrame:fn=>{frames.set(++id,fn);return id},cancelAnimationFrame:id=>frames.delete(id)});
vm.runInContext(source.slice(source.indexOf('function setupClawGames(){'),source.indexOf('let spaceShelfTimer')),context);context.setupClawGames();
async function step(){time+=32;const work=[...frames.values()];frames.clear();work.forEach(fn=>fn(time));await Promise.resolve();await Promise.resolve()}
const start=()=>handlers.keydown({key:' ',preventDefault(){},repeat:false});
async function finish(){for(let i=0;button.disabled&&i<300;i++)await step();assert.equal(button.disabled,false)}
start();handlers.keyup({key:' ',preventDefault(){}});await finish();assert.match(message.textContent,/closer/);assert.equal(collection.items.length,0);
for(let i=0;i<5;i++){
  start();for(let n=0;Math.abs(position-(30+i*15))>1&&n<400;n++)await step();
  handlers.keyup({key:' ',preventDefault(){}});await finish();assert.equal(collection.items.length,i+1);assert.equal(counter.textContent,String(i+1));assert.equal(claw.classList.contains('closed'),false);
}
assert.equal(label.textContent,'PLAY AGAIN');start();assert.equal(collection.items.length,0);assert.equal(toys.filter(t=>t.classList.contains('won')).length,0);handlers.blur();await finish();
console.log('Claw checks passed: miss, five catches, delivery, keyboard, replay');
