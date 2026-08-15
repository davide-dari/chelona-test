import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Mobile';
const BASE = 'https://www.doveconviene.it';
const CATS = ['iper-e-super','discount','elettronica','estate','novita','cura-casa-e-corpo','bricolage','arredamento','motori','salute-e-benessere','infanzia-e-giochi','animali','sport-e-moda','banche-e-assicurazioni','viaggi','ristoranti','servizi','catene-e-negozi'];
const CAT_NAMES = { 'iper-e-super':'Iper e super','discount':'Discount','elettronica':'Elettronica','estate':'Estate','novita':'Novità','cura-casa-e-corpo':'Cura casa e corpo','bricolage':'Bricolage','arredamento':'Arredamento','motori':'Motori','salute-e-benessere':'Salute e benessere','infanzia-e-giochi':'Infanzia e giochi','animali':'Animali','sport-e-moda':'Sport e moda','banche-e-assicurazioni':'Banche e assicurazioni','viaggi':'Viaggi','ristoranti':'Ristoranti','servizi':'Servizi','catene-e-negozi':'Catene e negozi' };

const cities = JSON.parse(readFileSync('/tmp/dc-cities.json', 'utf8'));
const CONC = 12;

async function get(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
      if (r.ok) return await r.text();
      if (r.status === 404) return '';
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  return '';
}

const queue = [];
const run = async (tasks, worker, conc) => {
  let i = 0;
  const workers = Array.from({ length: conc }, async () => {
    while (i < tasks.length) {
      const t = tasks[i++];
      try { await worker(t); } catch (e) { console.log('ERR', t, e.message); }
    }
  });
  await Promise.all(workers);
};

// --- FASE 1: card per città×categoria ---
const cityData = {};
const flyerCards = {}; // flyerId -> {cat, retailer, slug, dist, scade, cover, cities:Set}
let done = 0;
await run(cities, async ([slug, name]) => {
  cityData[slug] = { name, cats: {} };
  for (const cat of CATS) {
    const h = await get(`${BASE}/${slug}/${cat}`);
    if (!h) continue;
    const blocks = h.split(/(?=<div id="\d+" class="flyerCard)/).slice(1);
    const cards = [];
    for (const b of blocks) {
      const m = b.match(/<div id="(\d+)" class="flyerCard[^"]*"[^>]*data-type='flyer'[^>]*data-cid='(\d+)'[^>]*>/);
      if (!m) continue;
      const fid = m[1];
      const title = b.match(/flyerCard__titleText">([^<]+)/);
      const slugm = b.match(/href="\/[a-z0-9-]+\/([a-z0-9-]+)\/(?:volantino|offerte|catalogo)\//);
      const dist = b.match(/flyerCard__detailsSecondary">([^<]+)/);
      const scade = b.match(/flyerCard__detailsPrimary">([^<]+)/);
      const cover = b.match(/data-src='([^']*big_\d+\.jpg)'/);
      cards.push({ fid, retailer: title?.[1]?.trim(), slug: slugm?.[1] || '', dist: dist?.[1]?.trim() || '', scade: scade?.[1]?.trim() || '', cover: cover?.[1] || '' });
      if (!flyerCards[fid]) flyerCards[fid] = { cat, retailer: title?.[1]?.trim(), slug: slugm?.[1] || '', cover: cover?.[1] || '', cities: new Set() };
      flyerCards[fid].cities.add(slug);
    }
    if (cards.length) cityData[slug].cats[cat] = cards;
  }
  done++;
  if (done % 40 === 0) console.log(`fase1 ${done}/${cities.length} città`);
}, CONC);
console.log('fase1 done. card totali:', Object.keys(flyerCards).length);
writeFileSync('/tmp/dc-phase1.json', JSON.stringify({ cityData, flyerCards: Object.fromEntries(Object.entries(flyerCards).map(([k,v]) => [k, {...v, cities: [...v.cities]}]) ) }));

// --- FASE 2: publicationId per flyer unico (visita viewer page) ---
const p1 = JSON.parse(readFileSync('/tmp/dc-phase1.json', 'utf8'));
const fids = Object.keys(p1.flyerCards);
console.log('flyer unici da risolvere:', fids.length);
const pubIds = {};
let d2 = 0;
await run(fids, async (fid) => {
  const fc = p1.flyerCards[fid];
  const city = [...fc.cities][0];
  let url = `${BASE}/${city}/${fc.cat}/${fc.slug}/volantino/ultime-offerte-${fc.slug}?flyerId=${fid}&flyerPage=1`;
  if (!fc.slug) return;
  const h = await get(url);
  const m = h.match(/window\.DCFlyer = (\{.*?\}) <\/script>/s);
  if (m) {
    try {
      const d = JSON.parse(m[1]);
      pubIds[fid] = d.publicationId || '';
      if (!d.publicationId) console.log('no pub', fid, fc.slug);
    } catch {}
  }
  d2++;
  if (d2 % 150 === 0) console.log(`fase2 ${d2}/${fids.length}`);
}, CONC);
writeFileSync('/tmp/dc-phase2.json', JSON.stringify(pubIds));
console.log('fase2 done. risolti:', Object.values(pubIds).filter(Boolean).length);
