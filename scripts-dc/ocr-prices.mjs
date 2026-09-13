#!/usr/bin/env node
/**
 * Pipeline OCR: estrae i prezzi dai volantini (immagini dovecovene, accessibili)
 * per le principali catene e genera src/data/offerStats.ts ampliato.
 *
 * Uso: node scripts-dc/ocr-prices.mjs
 *
 * Flusso:
 *   1. Scarica dc-data.json (volantini correnti) da GitHub
 *   2. Per ogni catena seleziona il volantino corrente
 *   3. Scarica le pagine (level_4, 900px), le ingrandisce e le passa a tesseract
 *   4. Estrae "prodotto → prezzo" per i prodotti comuni
 *   5. Genera offerStats.ts
 */
import { writeFileSync, mkdtempSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Mobile';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TMP = mkdtempSync(join(tmpdir(), 'ocr-'));

const DC_URL = 'https://raw.githubusercontent.com/davide-dari/chelona-test/dc-data/dc-data.json';

async function fetchDcData() {
  const r = await fetch(DC_URL, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('dc-data non scaricato');
  return await r.json();
}

async function download(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) return null;
  return Buffer.from(await r.arrayBuffer());
}

function ocr(buf, i) {
  try {
    const inF = join(TMP, `in_${i}.jpg`);
    const bigF = join(TMP, `big_${i}.jpg`);
    writeFileSync(inF, buf);
    // ingrandisci a 2200px e OCR (tesseract via stdin)
    execSync(`sips -Z 2200 "${inF}" --out "${bigF}" >/dev/null 2>&1`);
    return execSync(`cat "${bigF}" | tesseract stdin stdout -l ita --psm 11 2>/dev/null`, { maxBuffer: 64 * 1024 * 1024, timeout: 30000 }).toString();
  } catch {
    return '';
  }
}

// Catene: slug dovecovene -> nome (usato come chiave in offerStats)
const CHAINS = [
  'lidl', 'esselunga', 'conad', 'coop', 'eurospin', 'md', 'carrefour',
  'despar', 'penny', 'pam', 'crai', 'deco', 'interspar', 'todis',
  'aldi', 'bennet', 'famila', 'panorama', 'ipercoop', 'il-gigante', 'sisa',
];

// Prodotti comuni: [id, unit, [parole chiave]]
const PRODUCTS = [
  ['latte', 'l', ['latte']],
  ['pasta', 'kg', ['penne', 'spaghetti', 'rigatoni', 'fusilli', 'farfalle', 'pasta']],
  ['uova', 'pz', ['uova', 'uovo']],
  ['olio', 'l', ['olio']],
  ['farina', 'kg', ['farina']],
  ['pomodori', 'kg', ['pomodoro', 'pomodori', 'passata', 'pelati']],
  ['caffe', 'pz', ['caffè', 'caffe']],
  ['acqua', 'l', ['acqua']],
  ['pane', 'kg', ['pane']],
  ['formaggio', 'kg', ['parmigiano', 'grana', 'pecorino', 'formaggio']],
  ['yogurt', 'pz', ['yogurt']],
  ['burro', 'kg', ['burro']],
  ['zucchero', 'kg', ['zucchero']],
  ['riso', 'kg', ['riso']],
  ['tonno', 'pz', ['tonno']],
  ['birra', 'l', ['birra']],
  ['vino', 'l', ['vino']],
  ['prosciutto', 'kg', ['prosciutto']],
  ['salame', 'kg', ['salame']],
  ['gelato', 'kg', ['gelato']],
  ['mozzarella', 'kg', ['mozzarella']],
  ['ricotta', 'kg', ['ricotta']],
  ['salmone', 'kg', ['salmone']],
  ['merluzzo', 'kg', ['merluzzo']],
  ['patate', 'kg', ['patate']],
  ['mele', 'kg', ['mele', 'mela']],
  ['banane', 'kg', ['banane', 'banana']],
  ['arance', 'kg', ['arance', 'arancia']],
  ['detergente', 'pz', ['detergente', 'detersivo']],
  ['carta', 'pz', ['carta igienica']],
  ['dentifricio', 'pz', ['dentifricio']],
];

// estrae il primo prezzo plausibile vicino a una keyword (entro 200 char)
function extractPrice(text, keyword) {
  const idx = text.indexOf(keyword);
  if (idx === -1) return null;
  const window = text.slice(idx, idx + 200);
  // prezzi come "1.19", "1,19", "2.77€", "1kg=2.77€", "0,99"
  const matches = [...window.matchAll(/(\d{1,2}[.,]\d{1,2})\s*(?:€|euro)?/g)];
  for (const m of matches) {
    const p = parseFloat(m[1].replace(',', '.'));
    if (p >= 0.2 && p <= 100) return p;
  }
  return null;
}

const main = async () => {
  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;
  const chains = limit ? CHAINS.slice(0, limit) : CHAINS;

  console.log('Scarico dc-data.json...');
  const dc = await fetchDcData();
  const f = dc.f || {};
  console.log(`  ${Object.keys(f).length} volantini`);

  const prices = {}; // productId -> { chainName: { p, fid, pg } }

  for (const slug of chains) {
    // trova il volantino corrente della catena (con più pagine)
    const candidates = Object.entries(f)
      .filter(([, x]) => x.s === slug && x.p && x.p.length >= 2)
      .sort((a, b) => (b[1].p?.length || 0) - (a[1].p?.length || 0));
    if (!candidates.length) continue;
    const [fid, flyer] = candidates[0];
    const chainName = flyer.n || slug;
    console.log(`\n=== ${chainName} (fid ${fid}, ${flyer.p.length} pagine) ===`);
    let text = '';
    // OCR di tutte le pagine
    for (let pg = 0; pg < flyer.p.length; pg++) {
      const l4 = flyer.p[pg][1];
      if (!l4 || l4.startsWith('http')) continue;
      const url = `https://it-it-media-publications.shopfully.cloud/publications/page_assets/${flyer.i}/${pg + 1}/page_${pg + 1}_level_4_${l4}.jpeg`;
      const buf = await download(url);
      if (!buf) continue;
      const t = ocr(buf, `${fid}_${pg}`);
      text += '\n' + t;
      await sleep(100);
    }
    text = text.toLowerCase();
    // estrai prezzi
    for (const [pid, unit, keywords] of PRODUCTS) {
      for (const kw of keywords) {
        const p = extractPrice(text, kw);
        if (p !== null) {
          if (!prices[pid]) prices[pid] = {};
          if (prices[pid][chainName] === undefined) {
            prices[pid][chainName] = { p, fid, pg: 0 };
          }
          break;
        }
      }
    }
  }

  // Stampa riepilogo
  let total = 0;
  for (const [pid, chains] of Object.entries(prices)) {
    const entries = Object.entries(chains).sort((a, b) => a[1].p - b[1].p);
    console.log(`\n### ${pid}`);
    for (const [c, v] of entries) { console.log(`  ${c}: ${v.p}€`); total++; }
  }
  console.log(`\nTotale prezzi estratti: ${total}`);
  writeFileSync('/tmp/ocr_prices.json', JSON.stringify(prices, null, 2));
  console.log('Scritto /tmp/ocr_prices.json');
};

main().catch(e => { console.error(e); process.exit(1); });
