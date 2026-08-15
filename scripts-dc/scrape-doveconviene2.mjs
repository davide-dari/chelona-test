import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Mobile';
const BASE = 'https://www.doveconviene.it';
const CATS = ['iper-e-super','discount','elettronica','estate','novita','cura-casa-e-corpo','bricolage','arredamento','motori','salute-e-benessere','infanzia-e-giochi','animali','sport-e-moda','banche-e-assicurazioni','viaggi','ristoranti','servizi','catene-e-negozi'];

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

const cityData = {};
const flyerCards = {};
let done = 0;
await run(cities, async ([slug, name]) => {
  cityData[slug] = { name, cats: {} };
  for (const cat of CATS) {
    const h = await get(`${BASE}/${slug}/${cat}`);
    if (!h) continue;
    const blocks = h.split(/(?=<div id="\d+" class="flyerCard)/).slice(1);
    const cards = [];
    for (const b of blocks) {
      const m = b.match(/<div id="(\d+)" class="flyerCard[^"]*"[^>]*data-type='flyer'/);
      if (!m) continue;
      const fid = m[1];
      const title = b.match(/flyerCard__titleText">([^<]+)/);
      const slugm = b.match(/\/([a-z0-9-]+)\/(?:volantino|offerte|catalogo)\/ultime-offerte-/);
      const dist = b.match(/flyerCard__detailsSecondary">([^<]+)/);
      const scade = b.match(/flyerCard__detailsPrimary">([^<]+)/);
      const cover = b.match(/data-src='([^']*big_\d+\.jpg)'/);
      const rt = title?.[1]?.trim() || '';
      const sl = slugm?.[1] || '';
      const cv = cover?.[1] || '';
      cards.push({ fid, retailer: rt, slug: sl, dist: dist?.[1]?.trim() || '', scade: scade?.[1]?.trim() || '', cover: cv });
      if (!flyerCards[fid]) flyerCards[fid] = { cat, retailer: rt, slug: sl, cover: cv, cities: new Set() };
      flyerCards[fid].cities.add(slug);
    }
    if (cards.length) cityData[slug].cats[cat] = cards;
  }
  done++;
  if (done % 50 === 0) console.log(`fase1 ${done}/${cities.length}`);
}, CONC);
console.log('fase1 done. flyer unici:', Object.keys(flyerCards).length);
writeFileSync('/tmp/dc-phase1.json', JSON.stringify({ cityData, flyerCards: Object.fromEntries(Object.entries(flyerCards).map(([k,v]) => [k, {...v, cities: [...v.cities]}])) }));

const p1 = JSON.parse(readFileSync('/tmp/dc-phase1.json', 'utf8'));
const fids = Object.keys(p1.flyerCards);
const pubIds = {};
let d2 = 0;
await run(fids, async (fid) => {
  const fc = p1.flyerCards[fid];
  if (!fc.slug) return;
  const city = [...fc.cities][0];
  const url = `${BASE}/${city}/${fc.cat}/${fc.slug}/volantino/ultime-offerte-${fc.slug}?flyerId=${fid}&flyerPage=1`;
  const h = await get(url);
  const m = h.match(/window\.DCFlyer = (\{.*?\}) <\/script>/s);
  if (m) {
    try {
      const d = JSON.parse(m[1]);
      pubIds[fid] = d.publicationId || '';
    } catch {}
  }
  d2++;
  if (d2 % 200 === 0) console.log(`fase2 ${d2}/${fids.length}`);
}, CONC);
writeFileSync('/tmp/dc-phase2.json', JSON.stringify(pubIds));
const ok = Object.values(pubIds).filter(Boolean).length;
console.log('fase2 done. risolti:', ok, '/', fids.length);
