/** NOTESON / AXE 02 — stockage local et sauvegardes. Aucun compte, aucun serveur. */
import {DEFAULT_SETTINGS,clone,safeSettings,safeAlbum,safeRating,keyFor} from './core.mjs';
export const STORAGE_KEY='noteson-album-atlas-v0.2';
export const EMPTY_STATE=()=>({version:2,settings:clone(DEFAULT_SETTINGS),ratings:{},days:{},createdAt:new Date().toISOString()});
function sanitize(raw){
  const state=EMPTY_STATE();
  if(!raw||typeof raw!=='object')return state;
  state.settings=safeSettings(raw.settings);
  state.createdAt=typeof raw.createdAt==='string'?raw.createdAt:state.createdAt;
  if(raw.ratings&&typeof raw.ratings==='object')for(const record of Object.values(raw.ratings).slice(0,10000)){
    const rating=safeRating(record);if(rating)state.ratings[keyFor(rating.album)]=rating;
  }
  if(raw.days&&typeof raw.days==='object')for(const [day,selection] of Object.entries(raw.days).slice(-2000)){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!selection||!Array.isArray(selection.picks))continue;
    state.days[day]={day,genre:typeof selection.genre==='string'?selection.genre:'Tous les genres',quota:Math.min(5,Math.max(1,Number(selection.quota)||2)),engine:'local',picks:selection.picks.slice(0,5).map((pick,i)=>{
      const album=safeAlbum(pick.album);if(!album)return null;
      return {id:`${day}:${i+1}`,day,position:i+1,album,reason:typeof pick.reason==='string'?pick.reason.slice(0,400):'Une découverte à tenter.',status:album.appleUrl?'verified':'unverified'};
    }).filter(Boolean)};
  }
  return state;
}
export function loadState(){try{const raw=localStorage.getItem(STORAGE_KEY);return raw?sanitize(JSON.parse(raw)):EMPTY_STATE();}catch(err){console.warn('Sauvegarde illisible',err);return EMPTY_STATE();}}
export function saveState(state){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
export function exportState(state){return JSON.stringify({type:'NOTESON-Album-Atlas',exportedAt:new Date().toISOString(),data:state},null,2);}
export function importState(text){
  if(typeof text!=='string'||text.length>3_000_000)throw new Error('Le fichier est trop volumineux.');
  let parsed;try{parsed=JSON.parse(text);}catch{throw new Error('Ce fichier ne contient pas un JSON valide.');}
  if(parsed?.type!=='NOTESON-Album-Atlas'||!parsed?.data||parsed.data.version!==2)throw new Error('Sauvegarde NOTESON v0.2 non reconnue.');
  return sanitize(parsed.data);
}
