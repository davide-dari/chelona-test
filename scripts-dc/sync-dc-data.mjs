#!/usr/bin/env node
/**
 * Sincronizza i volantini da dovecoviene.it e genera dc-data.json
 * (usato da un GitHub Action schedulato; il risultato viene committato
 * nel branch `dc-data` e scaricato dall'app a runtime).
 *
 * Pipeline:
 *   fase1: tutte le città × categorie -> card volantini (fid, retailer, slug, dist, cover)
 *   fase2: per ogni volantino unico, vista viewer -> publicationId
 *   fase3: per ogni publicationId, bundle Shopfully -> hash pagine (level_1 e level_4)
 *   assem: JSON compatto { g, f: flyers, c: cityFlyers } con la stessa forma del bundle TS
 *
 * Uso: node scripts-dc/sync-dc-data.mjs [--limit=N] [--out=PATH]
 */
import { writeFileSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Mobile';
const BASE = 'https://www.doveconviene.it';
const CATS = ['iper-e-super','discount','elettronica','estate','novita','cura-casa-e-corpo','bricolage','arredamento','motori','salute-e-benessere','infanzia-e-giochi','animali','sport-e-moda','banche-e-assicurazioni','viaggi','ristoranti','servizi','catene-e-negozi'];
const NON_CITY = new Set(['animali','arredamento','banche-e-assicurazioni','bricolage','catene-e-negozi','cura-casa-e-corpo','discount','elettronica','estate','infanzia-e-giochi','iper-e-super','motori','novita','ristoranti','salute-e-benessere','servizi','sport-e-moda','viaggi','app','off','volantino','catalogo','offerte','negozi','priv','login','register','notizie','faq','contatti','chi-siamo','privacy','cookie','termini','gift','assets','home']);

const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const outArg = args.find(a => a.startsWith('--out='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;
const OUT = outArg ? outArg.split('=')[1] : 'dc-data.json';

const CONC = 14;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function get(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
      if (r.ok) return await r.text();
      if (r.status === 404) return '';
    } catch {}
    if (i < retries) await sleep(400 * (i + 1));
  }
  return '';
}

async function getJson(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
      if (r.ok) return await r.json();
    } catch {}
    if (i < retries) await sleep(400 * (i + 1));
  }
  return null;
}

const run = async (tasks, worker, conc) => {
  let i = 0;
  let done = 0;
  const workers = Array.from({ length: conc }, async () => {
    while (i < tasks.length) {
      const t = tasks[i++];
      try { await worker(t); } catch (e) { console.log('ERR', t, e.message); }
      done++;
    }
  });
  await Promise.all(workers);
  return done;
};

/* ── Elenco città dalla pagina /citta ── */
async function fetchCities() {
  const h = await get(`${BASE}/citta`);
  if (!h) throw new Error('Pagina /citta non scaricata');
  const slugs = [...new Set([...h.matchAll(/href="\/([a-z0-9-]+)"/g)].map(m => m[1]).filter(s => !NON_CITY.has(s)))];
  if (slugs.length < 100) throw new Error(`Elenco città sospetto: ${slugs.length}`);
  console.log(`città: ${slugs.length}`);
  return slugs;
}

/* ── Nomi città (slug -> label) dalla pagina /citta ── */
async function fetchCityLabels() {
  const h = await get(`${BASE}/citta`);
  if (!h) return {};
  const labels = {};
  for (const m of h.matchAll(/<a href="\/([a-z0-9-]+)" class="listItem listItem--icon_right">[\s\S]*?<span>\s*([^<]+?)\s*<\/span>[\s\S]*?<\/a>/g)) {
    labels[m[1]] = m[2].replace(/&amp;/g, '&').trim();
  }
  return labels;
}

const cardsRe = /<div id="(\d+)" class="flyerCard[^"]*"[^>]*data-type='(?:flyer|click-out)'[^>]*>/;
const titleRe = /flyerCard__titleText">([^<]+)/;
const slugRe = /\/([a-z0-9-]+)\/(?:volantino|offerte|catalogo)\//;
const distRe = /flyerCard__detailsSecondary">([^<]+)/;
const coverRe = /data-src='([^']*big_\d+\.jpg)'/;

/* ── FASE NAZIONALE: card dalle pagine categoria nazionali (--nazionale--) ── */
async function phaseNaz(flyerCards) {
  const naz = {};
  for (const cat of CATS) {
    const h = await get(`${BASE}/${cat}`);
    if (!h) continue;
    const blocks = h.split(/(?=<div id="\d+" class="flyerCard)/).slice(1);
    const cards = [];
    for (const b of blocks) {
      const m = b.match(cardsRe);
      if (!m) continue;
      const fid = m[1];
      const title = b.match(titleRe);
      const slugm = b.match(slugRe);
      const dist = b.match(distRe);
      const cover = b.match(coverRe);
      cards.push({ fid, dist: dist?.[1]?.trim() || '' });
      if (!flyerCards[fid]) flyerCards[fid] = { cat, retailer: title?.[1]?.trim() || '', slug: slugm?.[1] || '', cover: cover?.[1] || '', cities: new Set() };
    }
    if (cards.length) naz[cat] = cards;
    console.log(`fase-naz ${cat}: ${cards.length}`);
  }
  return naz;
}

/* ── FASE 1: card per città×categoria + volantini unici ── */
async function phase1(cities) {
  const cityData = {};
  const flyerCards = {};
  let done = 0;
  const total = cities.length;
  await run(cities, async (slug) => {
    cityData[slug] = { cats: {} };
    for (const cat of CATS) {
      const h = await get(`${BASE}/${slug}/${cat}`);
      if (!h) continue;
      const blocks = h.split(/(?=<div id="\d+" class="flyerCard)/).slice(1);
      const cards = [];
      for (const b of blocks) {
        const m = b.match(cardsRe);
        if (!m) continue;
        const fid = m[1];
        const title = b.match(titleRe);
        const slugm = b.match(slugRe);
        const dist = b.match(distRe);
        const cover = b.match(coverRe);
        const retailer = title?.[1]?.trim() || '';
        cards.push({ fid, dist: dist?.[1]?.trim() || '' });
        if (!flyerCards[fid]) flyerCards[fid] = { cat, retailer, slug: slugm?.[1] || '', cover: cover?.[1] || '', cities: new Set() };
        flyerCards[fid].cities.add(slug);
      }
      if (cards.length) cityData[slug].cats[cat] = cards;
    }
    done++;
    if (done % 50 === 0) console.log(`fase1 ${done}/${total}`);
  }, CONC);
  console.log(`fase1 done. volantini unici: ${Object.keys(flyerCards).length}`);
  return { cityData, flyerCards };
}

/* ── FASE 1.5: retailer pages (sitemap nazionali + roma/milano/bologna) ──
   Aggiunge volantini visibili solo sulle pagine retailer (es. /roma/volantino/penny),
   che non compaiono nelle ~100 card delle pagine categoria. */
async function phaseRetailers(flyerCards, cityData) {
  const sitemaps = [
    { name: 'sitemap_retailers.xml.gz', city: '' },
    { name: 'sitemap_retailers_roma.xml.gz', city: 'roma' },
    { name: 'sitemap_retailers_milano.xml.gz', city: 'milano' },
    { name: 'sitemap_retailers_bologna.xml.gz', city: 'bologna' },
  ];
  const urls = [];
  for (const sm of sitemaps) {
    try {
      const r = await fetch(`${BASE}/${sm.name}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      const zlib = await import('node:zlib');
      const xml = zlib.gunzipSync(buf).toString();
      for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
        const u = m[1];
        const m2 = u.match(/\/(?:volantino|offerte|catalogo)\/([a-z0-9-]+)$/);
        if (m2) urls.push({ city: sm.city, slug: m2[1] });
      }
    } catch {}
  }
  console.log(`fase-retailers: ${urls.length} pagine retailer (nazionali + roma/milano/bologna)`);
  let added = 0;
  await run(urls, async ({ city, slug }) => {
    const h = await get(`${BASE}/${city ? `${city}/` : ''}volantino/${slug}`);
    if (!h) return;
    const blocks = h.split(/(?=<div id="\d+" class="flyerCard)/).slice(1);
    if (!blocks.length) return;
    const b = blocks[0];
    const m = b.match(cardsRe);
    if (!m) return;
    const fid = m[1];
    const title = b.match(titleRe);
    const cover = b.match(coverRe);
    const dist = b.match(distRe);
    // la categoria è nell'href della card (es. /roma/discount/penny/volantino/...)
    const href = b.match(/href='([^']+)'/);
    const catm = href ? href[1].match(/\/([a-z0-9-]+)\/[a-z0-9-]+\/(?:volantino|offerte|catalogo)\//) : null;
    const cat = catm ? catm[1] : '';
    if (!cat || !CATS.includes(cat)) return;
    const ret = title?.[1]?.trim() || '';
    if (!flyerCards[fid]) flyerCards[fid] = { cat, retailer: ret, slug, cover: cover?.[1] || '', cities: new Set() };
    if (city) {
      flyerCards[fid].cities.add(city);
      if (!cityData[city]) cityData[city] = { cats: {} };
      if (!cityData[city].cats[cat]) cityData[city].cats[cat] = [];
      if (!cityData[city].cats[cat].some(c => c.fid === fid)) {
        cityData[city].cats[cat].push({ fid, dist: dist?.[1]?.trim() || '' });
        added++;
      }
    }
  }, CONC);
  console.log(`fase-retailers done. card aggiunte: ${added}`);
}

/* Estrae il primo oggetto JSON a partire da "window.DCFlyer = "
   con uno scanner a profondità che rispetta le stringhe (il JSON
   può contenere "</script>" nei valori). */
function extractDcFlyer(h) {
  const i = h.indexOf('window.DCFlyer =');
  if (i === -1) return null;
  let j = i + 17;
  while (j < h.length && /\s/.test(h[j])) j++;
  if (h[j] !== '{') return null;
  let depth = 0, inStr = false, esc = false;
  for (let k = j; k < h.length; k++) {
    const c = h[k];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return h.slice(j, k + 1); }
  }
  return null;
}

/* ── FASE 2: publicationId per volantino unico ── */
async function phase2(flyerCards) {
  const fids = Object.keys(flyerCards);
  const pubIds = {};
  let done = 0;
  await run(fids, async (fid) => {
    const fc = flyerCards[fid];
    if (!fc.slug) return;
    const city = [...fc.cities][0];
    const url = `${BASE}/${city ? `${city}/` : ''}${fc.cat}/${fc.slug}/volantino/ultime-offerte-${fc.slug}?flyerId=${fid}&flyerPage=1`;
    const h = await get(url);
    const raw = extractDcFlyer(h);
    if (raw) {
      try {
        const d = JSON.parse(raw);
        pubIds[fid] = d.publicationId || '';
      } catch {}
    }
    done++;
    if (done % 250 === 0) console.log(`fase2 ${done}/${fids.length}`);
  }, CONC);
  const ok = Object.values(pubIds).filter(Boolean).length;
  console.log(`fase2 done. risolti: ${ok}/${fids.length}`);
  return pubIds;
}

/* ── FASE 3: pagine (hash level_1/level_4 o URL completi) ── */
async function phase3(pubIds) {
  const uniq = [...new Set(Object.values(pubIds).filter(Boolean))];
  console.log(`fase3: publication uniche ${uniq.length}`);
  const pubMeta = {};
  let done = 0;
  await run(uniq, async (pubId) => {
    const num = pubId.includes('_') ? pubId.split('_').pop() : pubId;
    const desc = await getJson(`https://api-viewer-zmags.shopfully.cloud/publication/${pubId}`);
    if (!desc || !desc.publicationDescriptor) return;
    const bundlePath = desc.publicationDescriptor.bundlePath;
    const base = bundlePath.startsWith('http') ? '' : 'https://';
    const bundle = await getJson(`${base}${bundlePath}`);
    if (!bundle) return;
    const pages = [];
    for (const key of Object.keys(bundle).sort((a, b) => +a - +b)) {
      if (key === 'publicationDescriptor') continue;
      const p = bundle[key];
      const reps = p.pageRepresentationDescriptors || [];
      const paths = reps.map(r => r.pageRepresentation.resourcePath);
      if (paths.some(x => x.includes('_level_'))) {
        const l4 = reps.find(r => r.pageRepresentation.resourcePath.includes('_level_4_'));
        const l1 = reps.find(r => r.pageRepresentation.resourcePath.includes('_level_1_'));
        const hash = (r) => (r ? r.pageRepresentation.resourcePath.split('_').pop().replace('.jpeg', '') : '');
        pages.push([hash(l1), hash(l4)]);
      } else if (paths.length >= 5) {
        const asset = (n) => `https://${paths[n]}`;
        pages.push([asset(0), asset(4)]);
      }
    }
    if (pages.length) pubMeta[pubId] = { n: num, p: pages };
    done++;
    if (done % 150 === 0) console.log(`fase3 ${done}/${uniq.length}`);
  }, CONC);
  console.log(`fase3 done. bundle ok: ${Object.keys(pubMeta).length}`);
  return pubMeta;
}

/* ── Assembla JSON compatto ── */
function assemble(cityData, flyerCards, pubIds, pubMeta, cityLabels, naz) {
  const flyers = {};
  for (const [fid, fc] of Object.entries(flyerCards)) {
    const pub = pubIds[fid];
    const meta = pub ? pubMeta[pub] : null;
    flyers[fid] = {
      s: fc.slug,
      n: fc.retailer,
      c: fc.cover,
      p: meta ? meta.p : [],
      i: meta ? meta.n : '',
    };
  }
  const cityFlyers = {};
  for (const [slug, cd] of Object.entries(cityData)) {
    const cats = {};
    for (const [cat, cards] of Object.entries(cd.cats)) {
      cats[cat] = cards.map(c => `${c.fid}:${parseInt(c.dist.replace(/\D/g, '') || '0', 10) || 0}`).join(',');
    }
    cityFlyers[slug] = cats;
  }
  const nazCats = {};
  for (const [cat, cards] of Object.entries(naz)) {
    nazCats[cat] = cards.map(c => `${c.fid}:${parseInt(c.dist.replace(/\D/g, '') || '0', 10) || 0}`).join(',');
  }
  cityFlyers['--nazionale--'] = nazCats;
  return { g: Math.floor(Date.now() / 1000), f: flyers, c: cityFlyers, k: cityLabels };
}

const t0 = Date.now();
console.log('sync-dc-data: avvio');
const cities = await fetchCities();
const cityLabels = await fetchCityLabels();
console.log(`etichette città: ${Object.keys(cityLabels).length}`);
const limited = LIMIT ? cities.slice(0, LIMIT) : cities;
const { cityData, flyerCards } = await phase1(limited);
const naz = await phaseNaz(flyerCards);
await phaseRetailers(flyerCards, cityData);
const pubIds = await phase2(flyerCards);
const pubMeta = await phase3(pubIds);
const json = assemble(cityData, flyerCards, pubIds, pubMeta, cityLabels, naz);
const out = JSON.stringify(json);
writeFileSync(OUT, out);
console.log(`scritto ${OUT}: ${(out.length / 1024 / 1024).toFixed(2)} MB, ${Object.keys(json.f).length} volantini, ${Object.keys(json.c).length} città, ${Math.round((Date.now() - t0) / 60000)} min`);