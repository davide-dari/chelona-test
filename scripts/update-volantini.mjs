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
  const flyers = [];
  const rowRe = /<div class="views-row[^"]*">([\s\S]*?)<div class="views-column views-column-2">/g;
  let rowM;
  while ((rowM = rowRe.exec(html))) {
    const row = rowM[1];
    const node = /href="\/node\/(\d+)"/.exec(row);
    const img = /src="([^"]+)"[^>]*alt="Copertina[^"]*"/.exec(row) || /src="([^"]+\.(?:jpg|jpeg|png|gif))"/.exec(row);
    const titleM = /class="field-content"><a href="\/node\/\d+">([^<]+)<\/a>/.exec(row);
    const subtitleM = /views-field-field-subtitle">[\s\S]*?field-content">([^<]+)</.exec(row);
    const fromM = /views-field-field-from">[\s\S]*?content="([^"]+)"/.exec(row);
    const toM = /views-field-field-to">[\s\S]*?content="([^"]+)"/.exec(row);
    if (!node) continue;
    const id = Number(node[1]);
    flyers.push({
      id,
      title: titleM ? titleM[1].trim() : 'Volantino',
      subtitle: subtitleM ? subtitleM[1].trim() : undefined,
      coverUrl: img ? abs(img[1]) : undefined,
      from: fromM ? fromM[1] : undefined,
      to: toM ? toM[1] : undefined,
    });
  }
  const uniq = flyers.filter((f, i) => flyers.findIndex((x) => x.id === f.id) === i);
  return uniq;
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
