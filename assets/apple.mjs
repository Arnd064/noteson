/** NOTESON / AXE 03 — catalogue Apple. JSONP est documenté par l'API Apple iTunes. */
import {normalize} from './core.mjs';
let sequence=0;let lastRequest=0;
const memory=new Map();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function jsonp(params){
  return new Promise((resolve,reject)=>{
    const callback=`__notesonApple_${Date.now()}_${sequence++}`;
    const script=document.createElement('script');
    const url=new URL('https://itunes.apple.com/search');
    for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
    url.searchParams.set('callback',callback);
    let done=false;
    function finish(err,data){if(done)return;done=true;clearTimeout(timer);script.remove();delete window[callback];err?reject(err):resolve(data);}
    const timer=setTimeout(()=>finish(new Error('Apple Music ne répond pas.')),9000);
    window[callback]=data=>finish(null,data);
    script.onerror=()=>finish(new Error('Recherche Apple Music indisponible.'));
    script.async=true;script.src=url.toString();document.head.append(script);
  });
}
async function callApple(term,limit=20){
  const cacheKey=`${term.toLowerCase()}:${limit}`;
  const cached=memory.get(cacheKey);
  if(cached&&Date.now()-cached.time<20*60_000)return cached.data;
  const delay=Math.max(0,3200-(Date.now()-lastRequest));if(delay)await sleep(delay);
  lastRequest=Date.now();
  const result=await jsonp({term,media:'music',entity:'album',country:'FR',limit});
  const data=Array.isArray(result?.results)?result.results.filter(x=>x.wrapperType==='collection'):[];
  memory.set(cacheKey,{data,time:Date.now()});return data;
}
function appleScore(candidate,entry){
  const a=normalize(candidate.artist),b=normalize(entry.artistName);
  const ta=normalize(candidate.title),tb=normalize(entry.collectionName);
  if(!a||!b||!ta||!tb)return -1;
  const artistOK=a===b||a.includes(b)||b.includes(a);
  if(!artistOK)return -1;
  const titleOK=ta===tb||ta.startsWith(tb+' ')||tb.startsWith(ta+' ');
  if(!titleOK)return -1;
  let score=ta===tb?20:12;score+=a===b?14:8;
  if(/deluxe|expanded|anniversary|remaster|bonus|edition/i.test(entry.collectionName))score-=3;
  return score;
}
function mapAlbum(entry,candidate){
  const link=String(entry.collectionViewUrl||'');
  if(!/^https:\/\/(music\.apple\.com|itunes\.apple\.com)\//i.test(link))return null;
  const art=typeof entry.artworkUrl100==='string'?entry.artworkUrl100.replace(/100x100(?:bb)?/,'600x600bb'):null;
  return { ...candidate,appleId:Number(entry.collectionId)||null,appleUrl:link,artwork:art,
    year:entry.releaseDate?Number(entry.releaseDate.slice(0,4)):null,
    genre:candidate.genre==='Autre'?(entry.primaryGenreName||'Autre'):candidate.genre};
}
export async function resolveAlbum(candidate){
  const data=await callApple(`${candidate.artist} ${candidate.title}`,25);
  const found=data.map(entry=>({entry,score:appleScore(candidate,entry)})).filter(x=>x.score>=20).sort((a,b)=>b.score-a.score)[0];
  return found?mapAlbum(found.entry,candidate):null;
}
export async function searchAlbums(query){
  const data=await callApple(query,32);
  const seen=new Set();
  return data.map(entry=>mapAlbum(entry,{artist:entry.artistName,title:entry.collectionName,genre:'Autre',tags:[],rarity:50,experimentation:50})).filter(Boolean).filter(album=>{
    const key=String(album.appleId);if(seen.has(key))return false;seen.add(key);return true;
  }).slice(0,24);
}
export function appleSearchUrl(album){return `https://music.apple.com/fr/search?term=${encodeURIComponent(`${album.artist} ${album.title}`)}`;}
