/** NOTESON / AXE 01 — moteur local de recommandation et configuration. Sans dépendance. */
export const GENRES = ['Post-punk','Rock progressif','Disco','Électronique','Psychédélisme','Ambient','New wave','Jazz','Folk','Rock indépendant','Musique du monde'];
export const WEEKDAYS = ['mon','tue','wed','thu','fri','sat','sun'];
export const WEEKDAY_LABELS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
export const DEFAULT_SETTINGS = {
  dailyCount: 2,
  genreMode: 'rotation',
  fixedGenre: 'Post-punk',
  genres: ['Post-punk','Rock progressif','Disco','Électronique','Psychédélisme','Ambient','New wave'],
  weekGenres: {mon:'Post-punk',tue:'Disco',wed:'Rock progressif',thu:'Électronique',fri:'Psychédélisme',sat:'Ambient',sun:'New wave'},
  proximity:80, rarity:100, experimentation:60,
  references: ['Television — Marquee Moon','The Velvet Underground — The Velvet Underground & Nico','The Clash — London Calling','Daft Punk — Discovery','Yes — Close to the Edge'],
  excludedArtists: []
};
export function clone(x) {return JSON.parse(JSON.stringify(x));}
export function normalize(s='') {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/\b(remaster(?:ed)?|deluxe|expanded|edition|bonus|anniversary|version|explicit|original|mono|stereo|reissue)\b/g,'')
    .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
export function keyFor(album) {return `${normalize(album.artist)}::${normalize(album.title)}`;}
export function dateParts(date=new Date()) {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).formatToParts(date).map(p=>[p.type,p.value]));
  return {day:`${parts.year}-${parts.month}-${parts.day}`,weekday:parts.weekday.toLowerCase().slice(0,3)};
}
export function todayGenre(settings, date=new Date()) {
  if (settings.genreMode==='fixed') return settings.fixedGenre;
  if (settings.genreMode==='rotation') return settings.weekGenres[dateParts(date).weekday] || 'Post-punk';
  return 'Tous les genres';
}
export function safeSettings(value={}) {
  if (!value || typeof value!=='object' || Array.isArray(value)) value={};
  const out=clone(DEFAULT_SETTINGS);
  const integer=(value,def,min,max)=>Number.isInteger(value)&&value>=min&&value<=max?value:def;
  out.dailyCount=integer(value.dailyCount,out.dailyCount,1,5);
  for (const name of ['proximity','rarity','experimentation']) out[name]=integer(value[name],out[name],0,100);
  if (['rotation','fixed','mixed','surprise'].includes(value.genreMode)) out.genreMode=value.genreMode;
  if(GENRES.includes(value.fixedGenre))out.fixedGenre=value.fixedGenre;
  if(Array.isArray(value.genres)){
    const genres=[...new Set(value.genres.filter(x=>GENRES.includes(x)))];
    if(genres.length)out.genres=genres;
  }
  if(value.weekGenres&&typeof value.weekGenres==='object')for(const wd of WEEKDAYS){if(GENRES.includes(value.weekGenres[wd]))out.weekGenres[wd]=value.weekGenres[wd];}
  for(const name of ['references','excludedArtists']){
    if(Array.isArray(value[name]))out[name]=value[name].filter(x=>typeof x==='string').map(s=>s.trim().slice(0,120)).filter(Boolean).slice(0,30);
  }
  return out;
}
function stableHash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967295;}
const REF_TAGS = {
  television:['angular','melodic','postpunk'],
  'velvet underground':['raw','avant','psych','experimental'],
  clash:['urgent','dub','rhythm','postpunk'],
  'daft punk':['synth','dance','groove','funk'],
  yes:['virtuoso','melodic','experimental']
};
const GENRE_TAGS = {
  'Post-punk':['angular','urgent','postpunk'], 'Rock progressif':['virtuoso','experimental','melodic'],
  Disco:['dance','synth','groove'], 'Électronique':['synth','experimental','space'],
  'Psychédélisme':['psych','experimental','melodic'],Ambient:['ambient','minimal','space'],
  'New wave':['synth','melodic','postpunk'],Jazz:['jazz','groove','experimental'],
  Folk:['folk','melodic','psych'],'Rock indépendant':['angular','melodic','raw'],
  'Musique du monde':['groove','experimental','folk']
};
export function tagsForAlbum(album,catalog=[]) {
  const match=catalog.find(c=>keyFor(c)===keyFor(album));
  return Array.isArray(match?.tags)?match.tags:(Array.isArray(album.tags)&&album.tags.length?album.tags:(GENRE_TAGS[album.genre]||[]));
}
export function rankCandidates({catalog,ratings=[],picks=[],settings,day,genre}) {
  const excluded=new Set(picks.map(p=>keyFor(p.album)));
  for(const rating of ratings) excluded.add(keyFor(rating.album));
  const tagWeights=new Map();
  const add=(tag,w)=>tagWeights.set(tag,(tagWeights.get(tag)||0)+w);
  for(const ref of settings.references){for(const [artist,tags] of Object.entries(REF_TAGS))if(normalize(ref).includes(artist))tags.forEach(t=>add(t,1.25));}
  const genreWeights=new Map();
  for(const r of ratings){const weight=(r.score-3)*2.3;for(const tag of tagsForAlbum(r.album,catalog))add(tag,weight);genreWeights.set(r.album.genre,(genreWeights.get(r.album.genre)||0)+weight);}
  const chosenGenre=genre||'Tous les genres';
  const allowed=settings.genreMode==='mixed'?settings.genres:GENRES;
  return catalog.filter(c=>!excluded.has(keyFor(c)))
    .filter(c=>!settings.excludedArtists.some(s=>normalize(c.artist).includes(normalize(s))))
    .filter(c=>chosenGenre==='Tous les genres'?(settings.genreMode!=='mixed'||allowed.includes(c.genre)):c.genre===chosenGenre)
    .map(c=>{
      const tags=c.tags.reduce((a,t)=>a+(tagWeights.get(t)||0),0);
      const preference=Math.max(-12,Math.min(12,tags+(genreWeights.get(c.genre)||0)*0.45));
      const rare=1-Math.abs(c.rarity-settings.rarity)/100;
      const experiment=1-Math.abs(c.experimentation-settings.experimentation)/100;
      const jitter=stableHash(`${day}|${c.artist}|${c.title}`)*2.5;
      let score=(settings.proximity/100)*preference*1.6+rare*4+experiment*3+jitter;
      // En mode « surprise », la prise de risque compte davantage, sans perdre la personnalisation.
      if(settings.genreMode==='surprise')score+=c.experimentation/100*2;
      return {...c,score};
    }).sort((a,b)=>b.score-a.score || keyFor(a).localeCompare(keyFor(b)));
}
export function reasonFor(album,settings,ratings,catalog) {
  const tags=tagsForAlbum(album,catalog);
  const human={synth:'synthétiseurs',dance:'rythmes dansants',groove:'groove',avant:'audace avant-gardiste',experimental:'expérimentation',angular:'guitares anguleuses',melodic:'mélodies',ambient:'textures atmosphériques',psych:'psychédélisme',funk:'funk',jazz:'jazz',space:'textures spatiales',minimal:'minimalisme',virtuoso:'virtuosité',raw:'énergie brute',postpunk:'post-punk',folk:'écriture folk'};
  const words=tags.slice(0,2).map(t=>human[t]||t).join(' et ');
  const similar=ratings.filter(r=>r.score>=4&&tagsForAlbum(r.album,catalog).some(t=>tags.includes(t))).sort((a,b)=>b.score-a.score)[0];
  return similar ? `Dans l'esprit de tes coups de cœur comme ${similar.album.title} : ${words||album.genre.toLowerCase()}.` : `Une piste ${album.genre.toLowerCase()} à explorer pour ses ${words||'sonorités singulières'}.`;
}
export function createDailyPicks(state,catalog,now=new Date()) {
  const {day}=dateParts(now);
  if(state.days[day])return state.days[day];
  const genre=todayGenre(state.settings,now);
  const ranked=rankCandidates({catalog,ratings:Object.values(state.ratings),picks:Object.values(state.days).flatMap(d=>d.picks),settings:state.settings,day,genre});
  const chosen=ranked.slice(0,state.settings.dailyCount);
  const picks=chosen.map((c,i)=>({id:`${day}:${i+1}`,day,position:i+1,album:{artist:c.artist,title:c.title,genre:c.genre,tags:c.tags,rarity:c.rarity,experimentation:c.experimentation,appleUrl:null,artwork:null,appleId:null,year:null},reason:reasonFor(c,state.settings,Object.values(state.ratings),catalog),status:'unverified'}));
  const selection={day,genre,quota:state.settings.dailyCount,picks,engine:'local'};
  state.days[day]=selection;
  return selection;
}
export function safeAlbum(album){
  if(!album||typeof album!=='object'||typeof album.artist!=='string'||typeof album.title!=='string'||!album.artist.trim()||!album.title.trim())return null;
  const appleUrl=typeof album.appleUrl==='string'&&/^https:\/\/(music\.apple\.com|itunes\.apple\.com)\//i.test(album.appleUrl)?album.appleUrl:null;
  const artwork=typeof album.artwork==='string'&&/^https:\/\/[\w-]+(?:\.[\w-]+)*\.mzstatic\.com\//i.test(album.artwork)?album.artwork:null;
  return {artist:album.artist.slice(0,160),title:album.title.slice(0,160),genre:GENRES.includes(album.genre)?album.genre:'Autre',tags:Array.isArray(album.tags)?album.tags.filter(x=>typeof x==='string').slice(0,15):[],rarity:Math.min(100,Math.max(0,Number(album.rarity)||50)),experimentation:Math.min(100,Math.max(0,Number(album.experimentation)||50)),appleUrl,artwork,appleId:Number.isInteger(album.appleId)?album.appleId:null,year:Number.isInteger(album.year)&&album.year>1900&&album.year<2100?album.year:null};
}
export function safeRating(record){
  if(!record||typeof record!=='object')return null;
  const album=safeAlbum(record.album);
  if(!album||!Number.isFinite(record.score)||record.score<0.5||record.score>5||!Number.isInteger(record.score*2))return null;
  return {album,score:record.score,comment:typeof record.comment==='string'?record.comment.slice(0,1200):'',ratedAt:typeof record.ratedAt==='string'&&/^\d{4}-\d{2}-\d{2}/.test(record.ratedAt)?record.ratedAt:new Date().toISOString()};
}
export function average(ratings){return ratings.length?ratings.reduce((s,r)=>s+r.score,0)/ratings.length:0;}
