import { readFileSync, writeFileSync } from 'fs';

const BASE = 'https://www.tuttiprezzi.it';
const UA = 'Mozilla/5.0 (Linux; Android 14; Chelona) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36';

async function get(url, timeout = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA }, signal: ctrl.signal });
    return r.ok ? await r.text() : null;
  } catch { return null; } finally { clearTimeout(t); }
}

// 1) categorie + negozi + loghi dalle 7 pagine categoria
const CATS = ['ipermercati', 'supermercati', 'discount', 'igiene', 'tecnologia', 'bricolage', 'varie'];
const CAT_LABEL = { ipermercati: 'Ipermercati', supermercati: 'Supermercati', discount: 'Discount', igiene: 'Cura di casa e corpo', tecnologia: 'Tecnologia', bricolage: 'Bricolage', varie: 'Altre attività' };

const shops = new Map(); // slug -> {cat, logo}
for (const cat of CATS) {
  const h = await get(`${BASE}/${cat}.html`);
  if (!h) { console.log('FAIL cat', cat); continue; }
  const re = /<a[^>]*href="([^"]+\.html)"[^>]*>\s*<img[^>]*src="([^"]+)"/g;
  let m;
  while ((m = re.exec(h))) {
    const slug = m[1].replace('.html', '');
    if (slug.startsWith('0') || slug.startsWith('3') || slug === 'index') continue;
    shops.set(slug, { cat, logo: m[2] });
  }
}
console.log('negozi trovati:', shops.size);

// 2) per ogni negozio: volantini (nome blocco + pagine)
const results = [];
let i = 0;
for (const [slug, info] of shops) {
  i++;
  const h = await get(`${BASE}/${slug}.html`);
  if (!h) { console.log('FAIL negozio', slug); continue; }
  const blocks = [...h.matchAll(/<a name="([a-z0-9]+)"><\/a>/g)];
  const flyers = [];
  for (let b = 0; b < blocks.length; b++) {
    const m = blocks[b];
    const start = m.index + m[0].length;
    const end = b + 1 < blocks.length ? blocks[b + 1].index : h.length;
    const body = h.slice(start, end);
    const pages = [...new Set([...body.matchAll(/p_Page_(\d+)\.jpg/g)].map(x => Number(x[1])))].sort((a, b) => a - b);
    if (!pages.length) continue;
    const pre = h.slice(Math.max(0, m.index - 300), m.index);
    const nomi = [...pre.matchAll(/<br>\s*([^<]{3,80}?)\s*<br>\s*$/g)];
    const nome = nomi.length ? nomi[nomi.length - 1][1].trim() : '';
    const dir = (body.match(/src="([A-Z0-9_]+)\/new\//) || [])[1] || slug.toUpperCase();
    flyers.push({ nome, dir, pages });
  }
  results.push({ slug, ...info, flyers });
  if (i % 40 === 0) console.log(`... ${i}/${shops.size}`);
}

writeFileSync('/tmp/tuttiprezzi-raw.json', JSON.stringify({ CAT_LABEL, shops: results }, null, 1));
console.log('salvato /tmp/tuttiprezzi-raw.json, negozi con volantini:', results.filter(s => s.flyers.length).length);
