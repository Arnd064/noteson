import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SETTINGS,clone,safeSettings,normalize,keyFor,dateParts,todayGenre,rankCandidates,createDailyPicks} from '../assets/core.mjs';
import {readFileSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url),'utf8'));
test('catalogue présent avec genres',()=>{assert.ok(catalog.length>100);assert.ok(catalog.some(x=>x.genre==='Disco'));});
test('normalisation accents et rééditions',()=>{assert.equal(normalize('ÉQUINOXE (Deluxe Edition)'), 'equinoxe');});
test('date en Europe/Paris (changement heure été)',()=>{assert.equal(dateParts(new Date('2026-03-28T23:30:00Z')).day,'2026-03-29');});
test('genre de rotation',()=>{const s=clone(DEFAULT_SETTINGS);assert.equal(todayGenre(s,new Date('2026-11-02T12:00:00Z')),'Post-punk');});
test('paramètres limités',()=>{const s=safeSettings({...DEFAULT_SETTINGS,dailyCount:99,rarity:-1});assert.equal(s.dailyCount,2);assert.equal(s.rarity,100);});
test('un album noté ne revient pas',()=>{const s=clone(DEFAULT_SETTINGS),album=catalog[0],ratings=[{album,score:2}];const ranked=rankCandidates({catalog,ratings,picks:[],settings:s,day:'2026-11-01',genre:'Tous les genres'});assert.ok(!ranked.some(c=>keyFor(c)===keyFor(album)));});
test('la sélection reste identique durant la journée',()=>{const state={settings:clone(DEFAULT_SETTINGS),ratings:{},days:{}};const d=new Date('2026-11-01T12:00:00Z');const first=createDailyPicks(state,catalog,d);const again=createDailyPicks(state,catalog,d);assert.equal(first,again);assert.equal(first.picks.length,2);});
test('quota respecté et historique exclu',()=>{const state={settings:safeSettings({...DEFAULT_SETTINGS,dailyCount:5,genreMode:'fixed'}),ratings:{},days:{}};const day1=createDailyPicks(state,catalog,new Date('2026-11-01T12:00:00Z'));const day2=createDailyPicks(state,catalog,new Date('2026-11-02T12:00:00Z'));assert.equal(day1.picks.length,5);assert.equal(day2.picks.length,5);for(const a of day1.picks)assert.ok(!day2.picks.some(b=>keyFor(a.album)===keyFor(b.album)));});

import {safeRating} from '../assets/core.mjs';
test('notes de 0,5 à 5 autorisées par demi-point',()=>{
 const album=catalog[0];
 for(const score of [0.5,1,1.5,2.5,3,4.5,5])assert.equal(safeRating({album,score}).score,score);
 for(const score of [0,0.25,5.5,4.7])assert.equal(safeRating({album,score}),null);
});
