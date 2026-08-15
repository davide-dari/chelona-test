import { readFileSync, writeFileSync } from 'node:fs';
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Mobile';
const BASE = 'https://www.doveconviene.it';
const CONC = 12;
async function get(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
      if (r.ok) return await r.text();
      if (r.status === 404) return '';
    } catch {}
    await new Promise(r => setTimeout(r, 400));
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
const p1 = JSON.parse(readFileSync('/tmp/dc-phase1.json', 'utf8'));
const fids = Object.keys(p1.flyerCards);
const pubIds = JSON.parse(readFileSync('/tmp/dc-phase2.json', 'utf8'));
let d2 = 0;
await run(fids, async (fid) => {
  const fc = p1.flyerCards[fid];
  for (const city of fc.cities) {
    const url = `${BASE}/${city}/${fc.cat}/${fc.slug}/volantino/ultime-offerte-${fc.slug}?flyerId=${fid}&flyerPage=1`;
    const h = await get(url);
    const m = h.match(/window\.DCFlyer = (\{.*?\});?\s*<\/script>/s);
    if (m) {
      try {
        const d = JSON.parse(m[1]);
        if (d.publicationId) { pubIds[fid] = d.publicationId; break; }
      } catch {}
    }
  }
  d2++;
  if (d2 % 200 === 0) console.log(`fase2 ${d2}/${fids.length}`);
}, CONC);
writeFileSync('/tmp/dc-phase2.json', JSON.stringify(pubIds));
const ok = Object.values(pubIds).filter(Boolean).length;
console.log('fase2 done. risolti:', ok, '/', fids.length);
