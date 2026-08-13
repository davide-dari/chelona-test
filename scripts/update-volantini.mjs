#!/usr/bin/env node
/**
 * Genera src/data/volantiniDb.ts raschiando il database volantini di CentroVolantini.
 * Uso: node scripts/update-volantini.mjs
 * Dati: https://www.centrovolantini.it (catene -> pagine catena -> bkcode Calameo dai node)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://www.centrovolantini.it';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/volantiniDb.ts');

async function get(path, retries = 3) {
  const url = path.startsWith('http') ? path : BASE + path;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': UA, 'accept-language': 'it-IT,it;q=0.9' },
        redirect: 'follow',
      });
      if (res.ok) return await res.text();
      console.warn(`  retry ${i + 1} ${res.status} ${url}`);
    } catch (e) {
      console.warn(`  retry ${i + 1} errore ${url}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
  }
  throw new Error(`GET fallito: ${url}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const abs = (src) => (src.startsWith('http') ? src : BASE + src);

function parseCatene(html) {
  const chains = [];
  const re = /<a href="\/volantino-([a-z0-9-]+)"><img[^>]*title="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    chains.push({ slug: m[1], name: m[2].trim(), logoUrl: null });
  }
  return chains.filter((c, i, a) => a.findIndex((x) => x.slug === c.slug) === i);
}

function parseChainPage(html, slug) {
  // La pagina catena contiene piu' viste: "volantini della catena" (i volantini veri)
  // e widget come "scelti per voi" che elencano volantini di ALTRE catene.
  // Isoliamo solo la vista della catena.
  const start = html.indexOf('view-volantini-della-catena');
  if (start === -1) return [];
  const nextView = html.indexOf('class="view view-', start + 10);
  const viewHtml = html.slice(start, nextView === -1 ? undefined : nextView);

  // Ogni volantino e' una colonna che inizia con field-copertina
  const chunks = viewHtml.split('<div class="views-field views-field-field-copertina">');
  const flyers = [];
  for (let k = 1; k < chunks.length; k++) {
    const chunk = chunks[k];
    const node = /href="\/node\/(\d+)"/.exec(chunk);
    if (!node) continue;
    const img =
      /<img class="image-style-thumb-copertina"[^>]*src="([^"]+)"/.exec(chunk) ||
      /src="([^"]+\.(?:jpg|jpeg|png|gif))"/.exec(chunk);
    const titleM = /<span class="field-content"><a href="\/node\/\d+">([^<]+)<\/a>/.exec(chunk);
    const sub = /views-field-field-subtitle">[\s\S]*?field-content">([^<]+)</.exec(chunk);
    const fromM = /views-field-field-from">[\s\S]*?content="([^"]+)"/.exec(chunk);
    const toM = /views-field-field-to">[\s\S]*?content="([^"]+)"/.exec(chunk);
    flyers.push({
      id: Number(node[1]),
      title: titleM ? titleM[1].trim() : 'Volantino',
      subtitle: sub ? sub[1].trim() : undefined,
      coverUrl: img ? abs(img[1]) : undefined,
      from: fromM ? fromM[1] : undefined,
      to: toM ? toM[1] : undefined,
    });
  }
  return flyers.filter((f, i) => flyers.findIndex((x) => x.id === f.id) === i);
}

function parseNode(html) {
  const bk = /bkcode=([0-9a-f]+)/.exec(html);
  const auth = /authid=([A-Za-z0-9]+)/.exec(html);
  return { bkcode: bk ? bk[1] : undefined, authid: auth ? auth[1] : undefined };
}

// Mappa slug CentroVolantini -> id logo locale (src/assets/logos)
const SLUG_TO_LOGO = {
  'acqua-e-sapone': 'acqua-e-sapone',
  'il-gigante': 'ilgigante',
  'md-discount': 'md',
  'penny-market': 'penny',
  'risparmio-casa': 'risparmio-casa',
  aldi: 'aldi', bennet: 'bennet', carrefour: 'carrefour', conad: 'conad', coop: 'coop',
  despar: 'despar', esselunga: 'esselunga', eurospin: 'eurospin', famila: 'famila',
  lidl: 'lidl',
};

const LOGO_BY_SLUG = Object.keys(SLUG_TO_LOGO).reduce((acc, s) => {
  acc[s] = SLUG_TO_LOGO[s];
  return acc;
}, {});

async function main() {
  console.log('1/3 Catene...');
  const cateneHtml = await get('/catene');
  const chains = parseCatene(cateneHtml);
  console.log(`  trovate ${chains.length} catene`);

  console.log('2/3 Volantini per catena...');
  for (const c of chains) {
    const html = await get(`/volantino-${c.slug}`);
    c.flyers = parseChainPage(html, c.slug);
    console.log(`  ${c.slug}: ${c.flyers.length} volantini`);
    await sleep(250);
  }

  // Dedupe: un node id deve appartenere a una sola catena (teniamo la prima occorrenza)
  const seen = new Set();
  let dropped = 0;
  for (const c of chains) {
    c.flyers = c.flyers.filter((f) => {
      if (seen.has(f.id)) {
        dropped++;
        return false;
      }
      seen.add(f.id);
      return true;
    });
  }
  if (dropped) console.log(`  dedupe: rimossi ${dropped} volantini duplicati tra catene`);

  console.log('3/3 bkcode Calameo...');
  const allIds = [...new Set(chains.flatMap((c) => c.flyers.map((f) => f.id)))];
  const codeMap = new Map();
  let done = 0;
  for (const id of allIds) {
    const html = await get(`/node/${id}`);
    codeMap.set(id, parseNode(html));
    done++;
    if (done % 15 === 0) console.log(`  ${done}/${allIds.length}`);
    await sleep(200);
  }

  const db = {
    updatedAt: new Date().toISOString(),
    source: 'centrovolantini.it',
    chains: chains.map((c) => ({
      slug: c.slug,
      name: c.name,
      logoId: LOGO_BY_SLUG[c.slug],
      flyers: c.flyers.map((f) => ({ ...f, ...codeMap.get(f.id) })),
    })),
  };

  const total = db.chains.reduce((n, c) => n + c.flyers.length, 0);
  const withCode = db.chains.reduce(
    (n, c) => n + c.flyers.filter((f) => f.bkcode).length,
    0
  );
  console.log(`\nTotale: ${db.chains.length} catene, ${total} volantini (${withCode} con viewer Calameo)`);

  const ts = `// GENERATO da scripts/update-volantini.mjs — non modificare a mano.
// Fonte: https://www.centrovolantini.it
export interface VolantinoFlyer {
  id: number;
  title: string;
  subtitle?: string;
  coverUrl?: string;
  from?: string;
  to?: string;
  bkcode?: string;
  authid?: string;
}

export interface VolantinoChain {
  slug: string;
  name: string;
  logoId?: string;
  flyers: VolantinoFlyer[];
}

export interface VolantiniDb {
  updatedAt: string;
  source: string;
  chains: VolantinoChain[];
}

export const VOLANTINI_DB: VolantiniDb = ${JSON.stringify(db, null, 2)};
`;
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, ts);
  console.log(`Scritto ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
