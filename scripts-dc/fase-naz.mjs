import { readFileSync, writeFileSync } from 'node:fs';
const UA = 'Mozilla/5.0';
const BASE = 'https://www.doveconviene.it';
const CATS = ['iper-e-super','discount','elettronica','estate','novita','cura-casa-e-corpo','bricolage','arredamento','motori','salute-e-benessere','infanzia-e-giochi','animali','sport-e-moda','banche-e-assicurazioni','viaggi','ristoranti','servizi','catene-e-negozi'];
async function get(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
    if (r.ok) return await r.text();
  } catch {}
  return '';
}
const naz = {};
for (const cat of CATS) {
  const h = await get(`${BASE}/${cat}`);
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
    cards.push([fid, title?.[1]?.trim() || '', slugm?.[1] || '', dist?.[1]?.trim() || '', scade?.[1]?.trim() || '', cover?.[1] || '']);
  }
  naz[cat] = cards;
  console.log(cat, cards.length);
}
writeFileSync('/tmp/dc-naz.json', JSON.stringify(naz));
