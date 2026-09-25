import { writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://www.centrovolantini.it';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/volantiniDb.ts');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const abs = (src) => (src.startsWith('http') ? src : BASE + src);

async function get(path, retries = 3) {
  const url = path.startsWith('http') ? path : BASE + path;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': UA, 'accept-language': 'it-IT,it;q=0.9' },
        redirect: 'follow',
      });
      if (res.ok) return await res.text();
    } catch (e) {}
    await sleep(800 * (i + 1));
  }
  return null;
}

function parseChainPage(html) {
  if (!html) return [];
  const start = html.indexOf('view-volantini-della-catena');
  if (start === -1) return [];
  const nextView = html.indexOf('class="view view-', start + 10);
  const viewHtml = html.slice(start, nextView === -1 ? undefined : nextView);

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
  if (!html) return {};
  const bk = /bkcode=([0-9a-f]+)/.exec(html);
  const auth = /authid=([A-Za-z0-9]+)/.exec(html);
  return { bkcode: bk ? bk[1] : undefined, authid: auth ? auth[1] : undefined };
}

const ALL_CHAINS = [
  // Catene esistenti
  { slug: 'conad', name: 'Conad' },
  { slug: 'coop', name: 'Coop' },
  { slug: 'esselunga', name: 'Esselunga' },
  { slug: 'lidl', name: 'Lidl' },
  { slug: 'eurospin', name: 'Eurospin' },
  { slug: 'carrefour', name: 'Carrefour' },
  { slug: 'despar', name: 'Despar' },
  { slug: 'aldi', name: 'Aldi' },
  { slug: 'md-discount', name: 'MD Discount' },
  { slug: 'penny-market', name: 'Penny Market' },
  { slug: 'bennet', name: 'Bennet' },
  { slug: 'famila', name: 'Famila' },
  { slug: 'il-gigante', name: 'Il Gigante' },
  { slug: 'iper-la-grande-i', name: 'Iper, La grande i' },
  { slug: 'ipercoop', name: 'Ipercoop' },
  { slug: 'panorama', name: 'Panorama' },
  { slug: 'emisfero-ipermercati', name: 'Emisfero Ipermercati' },
  { slug: 'mediaworld-italia', name: 'Mediaworld' },
  { slug: 'unieuro', name: 'Unieuro' },
  { slug: 'euronics', name: 'Euronics' },
  { slug: 'expert-italia', name: 'Expert' },
  { slug: 'trony', name: 'Trony' },
  { slug: 'comet', name: 'Comet' },
  { slug: 'acqua-e-sapone', name: 'Acqua e Sapone' },
  { slug: 'leroy-merlin', name: 'Leroy Merlin' },
  { slug: 'bricofer', name: 'Bricofer' },
  { slug: 'brico-io', name: 'Brico Io' },
  { slug: 'tecnomat', name: 'Tecnomat' },
  { slug: 'metro', name: 'Metro' },
  { slug: 'mondo-convenienza', name: 'Mondo Convenienza' },
  // NUOVE GRANDI CATENE
  { slug: 'pam', name: 'Pam' },
  { slug: 'todis', name: 'Todis' },
  { slug: 'deco', name: 'Decò' },
  { slug: 'tigota', name: 'Tigotà' },
  { slug: 'risparmiocasa', name: 'Risparmio Casa' },
  { slug: 'iperal', name: 'Iperal' },
  { slug: 'basko', name: 'Basko' },
  { slug: 'ins', name: "iN's Mercato" },
  { slug: 'unes', name: 'Unes' },
  { slug: 'dpiu', name: 'Dpiù' },
  { slug: 'migross', name: 'Migross' },
  { slug: 'ali-supermercati', name: 'Alì Supermercati' },
  { slug: 'naturasi', name: 'NaturaSì' },
  { slug: 'oasi', name: 'Oasi' },
  { slug: 'tigre', name: 'Tigre' },
  { slug: 'tigros', name: 'Tigros' },
  { slug: 'magazzini-maurys', name: "Magazzini Maury's" },
  { slug: 'coal', name: 'Coal' },
  { slug: 'italmark', name: 'Italmark' },
  { slug: 'prix', name: 'Prix Quality' },
  { slug: 'aeo', name: 'A&O' },
  { slug: 'pan-iperpan-e-superpan', name: 'Pan IperPan' },
  { slug: 'cc', name: 'C+C Cash & Carry' },
  { slug: 'hardis', name: 'HarDis' },
  { slug: 'picard', name: 'Picard Surgelati' },
];

async function main() {
  console.log(`Caricamento volantini per ${ALL_CHAINS.length} catene...`);
  
  // 1. Fetch flyer list for each chain with concurrency
  const chainsWithFlyers = [];
  const pLimit = 6;
  let idx = 0;

  async function worker() {
    while (idx < ALL_CHAINS.length) {
      const c = ALL_CHAINS[idx++];
      try {
        const html = await get(`/volantino-${c.slug}`);
        const flyers = parseChainPage(html);
        console.log(`  [${c.slug}] trovati ${flyers.length} volantini`);
        chainsWithFlyers.push({ ...c, flyers });
      } catch (e) {
        console.error(`  [${c.slug}] errore:`, e.message);
      }
    }
  }

  await Promise.all(Array.from({ length: pLimit }, worker));

  // Deduplicate nodes
  const seenNodes = new Set();
  for (const c of chainsWithFlyers) {
    c.flyers = c.flyers.filter((f) => {
      if (seenNodes.has(f.id)) return false;
      seenNodes.add(f.id);
      return true;
    });
  }

  // 2. Fetch bkcode for all unique flyer node IDs
  const allIds = [...new Set(chainsWithFlyers.flatMap((c) => c.flyers.map((f) => f.id)))];
  console.log(`Fetching Calameo bkcode per ${allIds.length} volantini...`);
  
  const codeMap = new Map();
  let done = 0;
  let nIdx = 0;

  async function nodeWorker() {
    while (nIdx < allIds.length) {
      const id = allIds[nIdx++];
      try {
        const html = await get(`/node/${id}`);
        codeMap.set(id, parseNode(html));
      } catch (e) {
        codeMap.set(id, {});
      }
      done++;
      if (done % 20 === 0 || done === allIds.length) {
        console.log(`  Progresso bkcode: ${done}/${allIds.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: 8 }, nodeWorker));

  // Assemble final DB
  const validChains = chainsWithFlyers
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      logoId: c.slug,
      flyers: c.flyers
        .map((f) => ({ ...f, ...codeMap.get(f.id) }))
        .filter((f) => f.bkcode), // Only keep flyers with working Calameo viewer
    }))
    .filter((c) => c.flyers.length > 0);

  // Ordina alfabeticamente per nome
  validChains.sort((a, b) => a.name.localeCompare(b.name, 'it'));

  const db = {
    updatedAt: new Date().toISOString(),
    source: 'centrovolantini.it',
    chains: validChains,
  };

  const totalFlyers = validChains.reduce((sum, c) => sum + c.flyers.length, 0);
  console.log(`\n🎉 Completato: ${validChains.length} catene attive, ${totalFlyers} volantini totali con Calameo.`);

  const code = `// GENERATO da scripts/enrich-volantini.mjs — non modificare a mano.
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

  writeFileSync(OUT, code, 'utf-8');
  console.log(`Scritto ${OUT}`);
}

main().catch(console.error);
