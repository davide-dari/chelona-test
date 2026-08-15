import { readFileSync, writeFileSync } from 'node:fs';
const UA = 'Mozilla/5.0';
const CONC = 12;
async function getJson(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
    if (r.ok) return await r.json();
  } catch {}
  return null;
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
const pubIds = JSON.parse(readFileSync('/tmp/dc-phase2.json', 'utf8'));
const uniq = [...new Set(Object.values(pubIds).filter(Boolean))];
console.log('publication uniche:', uniq.length);
const pubMeta = {}; // pubId -> {pages: [[...urls level2..4]...], n}
let d = 0;
await run(uniq, async (pubId) => {
  const desc = await getJson(`https://api-viewer-zmags.shopfully.cloud/publication/${pubId}`);
  if (!desc || !desc.publicationDescriptor) return;
  const bundlePath = desc.publicationDescriptor.bundlePath;
  const base = bundlePath.startsWith('http') ? '' : 'https://';
  const bundle = await getJson(`${base}${bundlePath}`);
  if (!bundle) return;
  const pages = [];
  for (const key of Object.keys(bundle).sort((a,b)=>+a-+b)) {
    const p = bundle[key];
    const reps = p.pageRepresentationDescriptors || [];
    const l4 = reps.find(r => r.pageRepresentation.resourcePath.includes('_level_4_'));
    const l2 = reps.find(r => r.pageRepresentation.resourcePath.includes('_level_2_'));
    const l1 = reps.find(r => r.pageRepresentation.resourcePath.includes('_level_1_'));
    const pick = (r) => r ? 'https://' + r.pageRepresentation.resourcePath : '';
    pages.push({ thumb: pick(l1 || l2), img: pick(l4) });
  }
  if (pages.length) pubMeta[pubId] = pages;
  d++;
  if (d % 100 === 0) console.log(`fase3 ${d}/${uniq.length}`);
}, CONC);
writeFileSync('/tmp/dc-phase3.json', JSON.stringify(pubMeta));
console.log('fase3 done. bundle ok:', Object.keys(pubMeta).length, 'pagine totali:', Object.values(pubMeta).reduce((a,p)=>a+p.length,0));
