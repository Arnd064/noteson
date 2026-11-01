import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Test minimal de démarrage et d'enregistrement sans dépendance au navigateur.
test('vue unique, journal et enregistrement d’une note',async()=>{
 const catalog=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url),'utf8'));
 const m=new Map(),handlers={};
 const app={innerHTML:'',addEventListener:(name,fn)=>handlers[name]=fn};
 const previous={document:globalThis.document,localStorage:globalThis.localStorage,fetch:globalThis.fetch,location:globalThis.location};
 const prevWarn=console.warn;console.warn=()=>{};
 globalThis.document={getElementById:(name)=>name==='app'?app:null,querySelector:()=>null,addEventListener:()=>{},body:{classList:{toggle:()=>{},add:()=>{},remove:()=>{}}}};
 globalThis.localStorage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};
 globalThis.fetch=async()=>({ok:true,json:async()=>catalog});
 globalThis.location={protocol:'http:'};
 try{
  await import('../assets/app.mjs?smoke='+Date.now());
  await new Promise(r=>setTimeout(r,20));
  assert.match(app.innerHTML,/class="glass-dock"/);
  assert.match(app.innerHTML,/id="score-number"/);
  assert.doesNotMatch(app.innerHTML,/class="tabs"/);
  handlers['click']({target:{closest:()=>({dataset:{action:'confirm'}})}});
  const data=JSON.parse(m.get('noteson-album-atlas-v0.2'));
  assert.equal(Object.values(data.ratings).length,1);
  assert.equal(Object.values(data.ratings)[0].score,3);
  // Geste vers le haut suivi d'une nouvelle validation (3 → 4,0)
  const gestureTarget={closest:selector=>selector==='#gesture-target'?{}:null};
  handlers.pointerdown({target:gestureTarget,button:0,pointerId:8,clientX:180,clientY:340});
  handlers.pointermove({pointerId:8,clientX:180,clientY:270});
  handlers.pointerup({pointerId:8});
  await new Promise(r=>setTimeout(r,510));
  handlers.click({target:{closest:()=>({dataset:{action:'confirm'}})}});
  const updated=JSON.parse(m.get('noteson-album-atlas-v0.2'));
  assert.equal(Object.values(updated.ratings)[0].score,4);
  handlers['click']({target:{closest:()=>({dataset:{action:'journal'}})}});
  assert.match(app.innerHTML,/>Journal</);
  assert.match(app.innerHTML,/class="glass-sheet"/);
 }finally{console.warn=prevWarn;for(const [k,v] of Object.entries(previous))if(v===undefined)delete globalThis[k];else globalThis[k]=v;}
});
