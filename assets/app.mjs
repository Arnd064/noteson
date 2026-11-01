/**
 * NOTESON / Macadam Glass v0.3 — interface centrale, une seule vue.
 * Hébergement : GitHub Pages (aucun build, aucune clé secrète).
 * AXES : A) Données B) Recommandation C) Écoute Apple D) Gestes & notation
 *        E) Journal F) Réglages G) Sauvegarde
 */
import {GENRES,WEEKDAYS,WEEKDAY_LABELS,dateParts,createDailyPicks,keyFor,average,safeSettings} from './core.mjs';
import {loadState,saveState,exportState,importState} from './storage.mjs';
import {resolveAlbum,searchAlbums,appleSearchUrl} from './apple.mjs';

// A — État persistant ; aucune donnée envoyée à un serveur NOTESON.
const app=document.getElementById('app');
const state=loadState();
let catalog=[];
let selectedIndex=0, pinnedAlbum=null, sheet=null, journalMode='pending';
let journalFilter='', searchResults=[], searchQuery='', searching=false, searchError='', searchOpen=false;
let gesture=null, temporaryScore=null, ignoreTapUntil=0, resolving=false, message='';
const escapeHTML = x=>String(x??'').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const toDate = iso => new Date(iso+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'});
const n2=n=>String(n).padStart(2,'0');
const formatScore=n=>Number(n).toFixed(1).replace('.',',');
const today=()=>state.days[dateParts().day];
const allPicks=()=>Object.values(state.days).flatMap(d=>d.picks).sort((a,b)=>b.day.localeCompare(a.day)||a.position-b.position);
const allRatings=()=>Object.values(state.ratings).sort((a,b)=>b.ratedAt.localeCompare(a.ratedAt));
const waiting=()=>allPicks().filter(p=>!state.ratings[keyFor(p.album)]);
const getActive=()=>pinnedAlbum||today()?.picks[selectedIndex]?.album||null;
function commit(){try{saveState(state);return true;}catch(error){console.error(error);notice('Impossible de sauvegarder sur cet appareil.');return false;}}
function notice(text){message=text;const el=document.getElementById('feedback');if(el){el.textContent=text;el.classList.add('show');}else render();}
function albumByKey(key){return state.ratings[key]?.album||allPicks().find(p=>keyFor(p.album)===key)?.album||null;}
function releaseMessage(){message='';}
function icon(name){
 const attrs='width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
 const paths={
   play:'<path d="M9 18V5l11-1v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="17" r="3"/>',
   journal:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',
   share:'<circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5m-8 7 8 5"/>',
   settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2 2-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.57V21h-2.83v-.08a1.7 1.7 0 0 0-1.04-1.57 1.7 1.7 0 0 0-1.88.34l-.06.06-2-2 .06-.06A1.7 1.7 0 0 0 7.42 15a1.7 1.7 0 0 0-1.57-1.03H5.8v-2.83h.07a1.7 1.7 0 0 0 1.57-1.03A1.7 1.7 0 0 0 7.1 8.23l-.06-.06 2-2 .06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.57V4.9h2.83v.08a1.7 1.7 0 0 0 1.03 1.57 1.7 1.7 0 0 0 1.88-.34l.06-.06 2 2-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.57 1.03h.08v2.83h-.08A1.7 1.7 0 0 0 19.4 15Z"/>',
   left:'<path d="m14 6-6 6 6 6"/>',right:'<path d="m10 6 6 6-6 6"/>', close:'<path d="M5 5 19 19M19 5 5 19"/>',
   check:'<path d="m4 12 5 5 11-11"/>',download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3"/>',
   plus:'<path d="M12 4v16M4 12h16"/>'};
 return `<svg ${attrs}>${paths[name]||''}</svg>`;
}
function artwork(album){
 if(album?.artwork)return `<img id="album-image" class="album-cover" src="${escapeHTML(album.artwork)}" alt="Pochette de ${escapeHTML(album.title)}" draggable="false" referrerpolicy="no-referrer">`;
 return `<span class="cover-fallback" aria-hidden="true"><span class="vinyl-grooves"></span><span class="vinyl-core">N.</span></span>`;
}
function appleLink(album){return album?.appleUrl||appleSearchUrl(album);}
function focusAlbum(album){
 const day=today();const i=day?.picks.findIndex(p=>keyFor(p.album)===keyFor(album))??-1;
 if(i>=0){selectedIndex=i;pinnedAlbum=null;} else pinnedAlbum=album;
 temporaryScore=null;sheet=null;releaseMessage();render();
 // Vérification catalogue à la demande pour une entrée historique non résolue.
 if(!album.appleUrl)verifyAlbum(album).catch(console.warn);
}
function ratingOf(album){return album?state.ratings[keyFor(album)]:null;}
function displayedScore(album){return temporaryScore??ratingOf(album)?.score??3;}
function footer(){return `<nav class="glass-dock" aria-label="Outils NOTESON">
 <a class="dock-item" href="${escapeHTML(appleLink(getActive()||{artist:'',title:''}))}" target="_blank" rel="noopener noreferrer" aria-label="${getActive()?.appleUrl?'Réécouter sur Apple Music':'Rechercher cet album sur Apple Music'}" ${getActive()?'':'aria-disabled="true" tabindex="-1"'}>${icon('play')}<span>Réécouter</span></a>
 <button class="dock-item" data-action="journal" aria-label="Ouvrir le journal">${icon('journal')}<span>Journal</span>${waiting().length?`<i class="pending-dot" aria-label="${waiting().length} albums en attente"></i>`:''}</button>
 <button class="dock-item" data-action="share" aria-label="Partager cet album">${icon('share')}<span>Partager</span></button>
 <button class="dock-item" data-action="settings" aria-label="Ouvrir les réglages">${icon('settings')}<span>Réglages</span></button>
 </nav>`;}
function hero(){
 const active=getActive(), day=today();
 if(!active)return `<section class="stage no-album"><span class="glyph">◉</span><h1>Aucun album aujourd'hui.</h1><button class="small-action" data-action="retry">Recharger</button></section>`;
 const r=ratingOf(active), sc=displayedScore(active);
 const count=day?.picks.length||0;
 const countText=pinnedAlbum?'MON ATLAS':`ALBUM ${n2(Math.min(selectedIndex+1,count))} / ${n2(count)}`;
 return `<section class="stage" aria-label="Album à découvrir">
   <div class="context-line"><button data-action="home" class="context-reset" aria-label="Revenir aux recommandations du jour">${pinnedAlbum?'↶ RETOUR À AUJOURD’HUI':escapeHTML(new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}).toUpperCase())}</button></div>
   <div id="gesture-target" class="album-interaction" role="group" aria-label="Glisser verticalement pour régler la note de 0,5 à 5 étoiles">
    <div class="art-shell"><button class="cover-button" data-action="confirm" aria-label="Valider ${formatScore(sc)} sur 5 pour ${escapeHTML(active.title)}">${artwork(active)}<span class="art-confirm">${icon('check')}</span></button></div>
    <div class="album-meta"><h1>${escapeHTML(active.title)}</h1><p>${escapeHTML(active.artist)}</p></div>
    <div class="score-area"><div id="score-number" class="score-number" aria-live="polite">${formatScore(sc)}</div><span class="score-unit">/ 5</span></div>
   </div>
   <div class="stage-bottom"><div class="step-nav"><button data-action="prev" aria-label="Album précédent" ${pinnedAlbum||selectedIndex===0?'disabled':''}>${icon('left')}</button><span>${countText}</span><button data-action="next" aria-label="Album suivant" ${pinnedAlbum||selectedIndex>=count-1?'disabled':''}>${icon('right')}</button></div><p class="gesture-help">${r?'NOTE ENREGISTRÉE · GLISSER POUR MODIFIER':'GLISSER POUR NOTER · TOUCHER LA POCHETTE POUR VALIDER'}</p></div>
 </section>`;
}
function render(){
 app.innerHTML=`<div class="app-shell"><header class="app-header"><button data-action="home" class="wordmark" aria-label="NOTESON — sélection du jour">NOTESON<span class="word-dot">.</span></button><span class="app-subtitle">ALBUM ATLAS</span></header>${hero()}${footer()}<div id="feedback" class="feedback ${message?'show':''}" role="status">${escapeHTML(message)}</div></div>${sheet?renderSheet():''}`;
 document.body.classList.toggle('sheet-open',Boolean(sheet));
}
function sheetHeader(label,title){return `<div class="sheet-top"><div><span class="eyebrow">${label}</span><h2 id="sheet-heading">${title}</h2></div><button class="sheet-close" data-action="close-sheet" aria-label="Fermer">${icon('close')}</button></div>`;}
function albumRow(album,extra=''){
 const r=ratingOf(album); const iconContent=album.artwork?`<img src="${escapeHTML(album.artwork)}" alt="" loading="lazy">`:`<span>${escapeHTML(album.artist.slice(0,1))}</span>`;
 return `<button class="album-row" data-action="view-album" data-key="${escapeHTML(keyFor(album))}" type="button"><span class="mini-cover">${iconContent}</span><span class="row-details"><strong>${escapeHTML(album.title)}</strong><small>${escapeHTML(album.artist)}${extra?' · '+escapeHTML(extra):''}</small></span><span class="row-score">${r?formatScore(r.score):'↗'}</span></button>`;
}
function journal(){
 const pending=waiting();const rated=allRatings();const isPending=journalMode==='pending';
 let collection=isPending?pending.map(x=>x.album):rated.map(x=>x.album);
 const normalized=journalFilter.trim().toLocaleLowerCase('fr-FR');
 if(normalized)collection=collection.filter(a=>`${a.title} ${a.artist} ${a.genre}`.toLocaleLowerCase('fr-FR').includes(normalized));
 return `${sheetHeader('ARCHIVES PERSONNELLES','Journal')}<div class="sheet-content">
   <div class="journal-stats"><div><strong>${rated.length}</strong><small>NOTÉS</small></div><div><strong>${rated.length?average(rated).toFixed(1).replace('.',','):'—'}</strong><small>MOYENNE</small></div><div><strong>${pending.length}</strong><small>À ÉCOUTER</small></div></div>
   <div class="segmented"><button data-action="journal-mode" data-mode="pending" class="${isPending?'chosen':''}">En attente</button><button data-action="journal-mode" data-mode="rated" class="${!isPending?'chosen':''}">Notés</button></div>
   <label class="visually-hidden" for="journal-filter">Filtrer le journal</label><input id="journal-filter" class="field" placeholder="Rechercher un album…" value="${escapeHTML(journalFilter)}" autocomplete="off">
   <div class="journal-items">${collection.length?collection.map(a=>albumRow(a)).join(''):'<p class="empty-note">Aucun album ici pour le moment.</p>'}</div>
   <details class="add-album" ${searchOpen?'open':''}><summary>+ Ajouter un album écouté</summary><form id="search-form"><label class="visually-hidden" for="apple-search">Titre ou artiste</label><div class="search-control"><input id="apple-search" name="q" class="field" placeholder="Artiste ou album" value="${escapeHTML(searchQuery)}" required minlength="2"><button type="submit" class="inline-button">Chercher</button></div></form>${searching?'<p class="footnote">Recherche Apple Music…</p>':searchError?`<p class="footnote">${escapeHTML(searchError)}</p>`:searchResults.map(a=>albumRow(a)).join('')}</details>
   </div>`;
}
function genreOptions(selected){return GENRES.map(x=>`<option value="${escapeHTML(x)}" ${x===selected?'selected':''}>${escapeHTML(x)}</option>`).join('');}
function settingsPanel(){
 const s=state.settings;
 return `${sheetHeader('PERSONNALISATION','Réglages')}<form id="settings-form" class="sheet-content settings-form">
  <div class="setting-section"><label for="daily-count" class="setting-label">Albums par jour</label><select id="daily-count" name="dailyCount" class="field">${[1,2,3,4,5].map(n=>`<option value="${n}" ${s.dailyCount===n?'selected':''}>${n} album${n>1?'s':''}</option>`).join('')}</select></div>
  <div class="setting-section"><label for="genre-mode" class="setting-label">Programmation</label><select id="genre-mode" name="genreMode" class="field"><option value="rotation" ${s.genreMode==='rotation'?'selected':''}>Un genre différent par jour</option><option value="fixed" ${s.genreMode==='fixed'?'selected':''}>Toujours le même genre</option><option value="mixed" ${s.genreMode==='mixed'?'selected':''}>Mélange de genres</option><option value="surprise" ${s.genreMode==='surprise'?'selected':''}>Surprise</option></select></div>
  <div class="setting-section"><label for="fixed-genre" class="setting-label">Genre fixe</label><select id="fixed-genre" name="fixedGenre" class="field">${genreOptions(s.fixedGenre)}</select></div>
  <details class="advanced"><summary>Genres autorisés et jours de la semaine</summary><span class="setting-label">Genres du mode mélange</span><div class="genre-grid">${GENRES.map(g=>`<label class="genre-checkbox"><input type="checkbox" name="genres" value="${escapeHTML(g)}" ${s.genres.includes(g)?'checked':''}>${escapeHTML(g)}</label>`).join('')}</div><span class="setting-label">Répartition hebdomadaire</span><div class="week-options">${WEEKDAYS.map((wd,i)=>`<label><span>${WEEKDAY_LABELS[i]}</span><select name="week-${wd}" class="field">${genreOptions(s.weekGenres[wd])}</select></label>`).join('')}</div></details>
  ${[['proximity','Proximité'],['rarity','Rareté'],['experimentation','Expérimentation']].map(([key,label])=>`<div class="setting-section range-section"><label for="${key}" class="setting-label">${label}<output id="out-${key}">${s[key]}</output></label><input id="${key}" type="range" name="${key}" value="${s[key]}" min="0" max="100"></div>`).join('')}
  <details class="advanced"><summary>Références et exclusions</summary><label for="references" class="setting-label">Albums de référence (un par ligne)</label><textarea id="references" name="references" class="field" rows="5">${escapeHTML(s.references.join('\n'))}</textarea><label for="excludedArtists" class="setting-label">Artistes à exclure (un par ligne)</label><textarea id="excludedArtists" name="excludedArtists" class="field" rows="3">${escapeHTML(s.excludedArtists.join('\n'))}</textarea></details>
  <button type="submit" class="save-settings">Enregistrer les réglages</button><p class="footnote">Les nouveaux réglages s’appliqueront à la prochaine sélection quotidienne.</p>
  <div class="backup-tools"><button type="button" data-action="export">${icon('download')} Exporter mon Atlas</button><label>${icon('plus')} Importer une sauvegarde<input type="file" id="import-file" accept=".json,application/json" hidden></label></div>
  <p class="footnote">Les notes restent dans ce navigateur. Sans serveur, pas de synchronisation automatique. La sélection est calculée localement et n’utilise pas encore de modèle IA génératif.</p>
 </form>`;
}
function renderSheet(){return `<div class="sheet-backdrop" data-action="backdrop"><section class="glass-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-heading">${sheet==='journal'?journal():settingsPanel()}</section></div>`;}
function setSheet(name){sheet=name;journalFilter='';releaseMessage();render();}
function setPreview(score){temporaryScore=Math.round(Math.max(.5,Math.min(5,score))*2)/2;
 const value=document.getElementById('score-number');if(value)value.textContent=formatScore(temporaryScore);
 const label=document.querySelector('.cover-button');if(label)label.setAttribute('aria-label',`Valider ${formatScore(temporaryScore)} sur 5`);
}
function setRating(){const album=getActive();if(!album)return;
 const score=displayedScore(album);
 state.ratings[keyFor(album)]={album:{...album},score,comment:state.ratings[keyFor(album)]?.comment||'',ratedAt:new Date().toISOString()};
 temporaryScore=null;if(commit()){render();notice(`${formatScore(score)} / 5 — enregistré dans ton Atlas`);}
}
function navigation(offset){const length=today()?.picks.length||0;if(pinnedAlbum){pinnedAlbum=null;selectedIndex=0;}else selectedIndex=Math.min(Math.max(0,selectedIndex+offset),length-1);temporaryScore=null;releaseMessage();render();}
function exportBackup(){const blob=new Blob([exportState(state)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`NOTESON-Atlas-${dateParts().day}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),4000);}
async function shareCurrent(){const a=getActive();if(!a)return;const text=`${a.artist} — ${a.title}`;const url=appleLink(a);
 try{if(navigator.share)await navigator.share({title:text,text,url});else if(navigator.clipboard){await navigator.clipboard.writeText(`${text}\n${url}`);notice('Lien copié.');}else notice('Partage non disponible sur cet appareil.');}
 catch(e){if(e.name!=='AbortError')notice('Partage non disponible.');}
}
async function verifyAlbum(a){if(a.appleUrl)return;
 const matched=await resolveAlbum(a);if(!matched)return;
 const key=keyFor(a);
 for(const selection of Object.values(state.days))for(const p of selection.picks){if(keyFor(p.album)===key)p.album={...p.album,...matched};}
 if(state.ratings[key])state.ratings[key].album={...state.ratings[key].album,...matched};
 if(pinnedAlbum&&keyFor(pinnedAlbum)===key)pinnedAlbum={...pinnedAlbum,...matched};
 commit();render();
}
async function verifyToday(){if(resolving)return;resolving=true;
 try{for(const p of today()?.picks||[]){if(!p.album.appleUrl){try{await verifyAlbum(p.album);}catch(error){console.warn('Apple Music :',error);break;}}}}
 finally{resolving=false;}
}
// D — Interaction verticale : flèche haut = +0,5 ; bas = -0,5 ; tap pochette = sauvegarder.
app.addEventListener('pointerdown',e=>{
 if(sheet||!e.target.closest('#gesture-target')||e.button>0||e.target.closest('.step-nav'))return;
 gesture={id:e.pointerId,y:e.clientY,x:e.clientX,start:displayedScore(getActive()),moves:0,changed:false};
});
app.addEventListener('pointermove',e=>{
 if(!gesture||e.pointerId!==gesture.id)return;
 const dy=gesture.y-e.clientY,dx=e.clientX-gesture.x;
 if(Math.abs(dy)<20||Math.abs(dy)<Math.abs(dx)*1.15)return;
 document.body.classList.add('is-gesturing');gesture.changed=true;
 const steps=Math.max(1,Math.floor((Math.abs(dy)-20)/34)+1),value=gesture.start+Math.sign(dy)*steps*.5;
 setPreview(value);
});
function endGesture(e){if(!gesture||e.pointerId!==gesture.id)return;
 if(gesture.changed)ignoreTapUntil=Date.now()+500;
 document.body.classList.remove('is-gesturing');gesture=null;
}
app.addEventListener('pointerup',endGesture);
app.addEventListener('pointercancel',endGesture);
app.addEventListener('click',async e=>{
 const target=e.target.closest('[data-action]');if(!target)return;
 const action=target.dataset.action;
 if(action==='confirm'){if(Date.now()>=ignoreTapUntil)setRating();return;}
 if(action==='prev'){navigation(-1);return;}
 if(action==='next'){navigation(1);return;}
 if(action==='home'){selectedIndex=0;pinnedAlbum=null;temporaryScore=null;sheet=null;releaseMessage();render();return;}
 if(action==='journal'||action==='settings'){setSheet(action);return;}
 if(action==='close-sheet'||(action==='backdrop'&&e.target===target)){sheet=null;render();return;}
 if(action==='journal-mode'){journalMode=target.dataset.mode;journalFilter='';render();return;}
 if(action==='view-album'){const key=target.dataset.key;const album=albumByKey(key)||searchResults.find(x=>keyFor(x)===key);if(album)focusAlbum(album);return;}
 if(action==='share'){await shareCurrent();return;}
 if(action==='retry'){await start();return;}
 if(action==='export'){exportBackup();return;}
});
app.addEventListener('input',e=>{
 if(e.target.id==='journal-filter'){
  journalFilter=e.target.value;const pos=e.target.selectionStart;render();const next=document.getElementById('journal-filter');next?.focus();next?.setSelectionRange(pos,pos);
 }
 if(['proximity','rarity','experimentation'].includes(e.target.id)){
  const out=document.getElementById('out-'+e.target.id);if(out)out.textContent=e.target.value;
 }
});
app.addEventListener('submit',async e=>{
 if(e.target.id==='settings-form'){
  e.preventDefault();const fd=new FormData(e.target);
  if(!fd.getAll('genres').length&&fd.get('genreMode')==='mixed'){notice('Sélectionne au moins un genre.');return;}
  const val={dailyCount:Number(fd.get('dailyCount')),genreMode:fd.get('genreMode'),fixedGenre:fd.get('fixedGenre'),genres:fd.getAll('genres'),weekGenres:Object.fromEntries(WEEKDAYS.map(day=>[day,fd.get('week-'+day)])),proximity:Number(fd.get('proximity')),rarity:Number(fd.get('rarity')),experimentation:Number(fd.get('experimentation')),references:String(fd.get('references')||'').split('\n'),excludedArtists:String(fd.get('excludedArtists')||'').split('\n')};
  state.settings=safeSettings(val);commit();sheet=null;render();notice('Réglages enregistrés.');return;
 }
 if(e.target.id==='search-form'){
  e.preventDefault();const query=String(new FormData(e.target).get('q')||'').trim();if(query.length<2)return;
  searchQuery=query;searchResults=[];searchError='';searching=true;searchOpen=true;render();
  try{searchResults=await searchAlbums(query);}catch(error){searchError=error.message||'Recherche indisponible.';}
  finally{searching=false;render();}
 }
});
app.addEventListener('toggle',e=>{if(e.target.matches?.('.add-album'))searchOpen=e.target.open;},true);
app.addEventListener('change',async e=>{
 if(e.target.id!=='import-file')return;const file=e.target.files?.[0];if(!file)return;
 if(file.size>3_000_000){notice('Sauvegarde trop volumineuse.');return;}
 try{const imported=importState(await file.text());if(!confirm('Remplacer les notes et réglages actuels par cette sauvegarde ?'))return;
  Object.assign(state,imported);pinnedAlbum=null;selectedIndex=0;sheet=null;commit();createDailyPicks(state,catalog);render();notice('Atlas restauré.');await verifyToday();
 }catch(error){notice(error.message||'Impossible d’importer ce fichier.');}
});
document.addEventListener('keydown',e=>{
 if(sheet){if(e.key==='Escape'){sheet=null;render();}return;}
 if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;
 if(e.key==='ArrowUp'){e.preventDefault();setPreview(displayedScore(getActive())+.5);}
 if(e.key==='ArrowDown'){e.preventDefault();setPreview(displayedScore(getActive())-.5);}
 if(e.key==='Enter'&&getActive()){e.preventDefault();setRating();}
 if(e.key==='ArrowLeft')navigation(-1);
 if(e.key==='ArrowRight')navigation(1);
});
async function start(){
 try{const response=await fetch('./data/catalog.json',{cache:'no-cache'});if(!response.ok)throw new Error('Le catalogue ne répond pas');
  catalog=await response.json();if(!Array.isArray(catalog)||!catalog.length)throw new Error('Catalogue vide');
  createDailyPicks(state,catalog);commit();render();verifyToday().catch(console.warn);
 }catch(error){app.innerHTML=`<div class="fatal"><strong>NOTESON.</strong><p>Impossible de charger le catalogue. Ouvre le site depuis GitHub Pages ou un serveur local.</p><code>${escapeHTML(error.message)}</code></div>`;}
 if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(console.warn);
}
start();
