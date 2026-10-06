// scripts/test-ai-benchmark.mjs
import assert from 'node:assert';

// Mock browser globals
globalThis.window = {
  ChelonaNative: {
    isNativeLlmAvailable: () => false,
  }
};
globalThis.sessionStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear() { this._data = {}; }
};
globalThis.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear() { this._data = {}; }
};

import fs from 'node:fs';
import path from 'node:path';
const recipesData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'ricette_mondo.json'), 'utf-8'));
globalThis.fetch = async (url) => {
  if (String(url).includes('ricette_mondo.json')) {
    return {
      ok: true,
      json: async () => recipesData,
    };
  }
  return { ok: false };
};

console.log('🧪 Starting AI Latency, Cache & Response Time Verification Tests...');

import { queryGemma2, checkNativeLlmAvailability, isCacheEnabled, setCacheEnabled, semanticCache, promptCache } from '../src/services/gemma2Engine.ts';
import { queryChelonaAi } from '../src/services/chelonaEngine.ts';

// 1. Check checkNativeLlmAvailability speed
const startNative = performance.now();
const isNative = await checkNativeLlmAvailability();
const elapsedNative = performance.now() - startNative;
console.log(`[Test 1] checkNativeLlmAvailability latency: ${elapsedNative.toFixed(2)}ms (isNative=${isNative})`);
assert.strictEqual(isNative, false, 'Should be false in mock non-native environment');
assert(elapsedNative < 20, `checkNativeLlmAvailability must complete in < 20ms, got ${elapsedNative}ms`);
console.log('✅ Native availability check passed');

// 2. Direct queryChelonaAi latency test (warm-up ensures pure engine execution time without JIT module load)
await queryChelonaAi('warmup', [], 'Davide');
const start1 = performance.now();
const res1 = await queryChelonaAi('Che spese ho questo mese?', [], 'Davide');
const elapsed1 = performance.now() - start1;
console.log(`[Test 2] queryChelonaAi latency: ${elapsed1.toFixed(2)}ms`);
assert(elapsed1 < 100, `queryChelonaAi must be under 100ms, got ${elapsed1}ms`);
assert(res1 && res1.text, 'Result must contain text');
console.log('✅ Direct engine latency test passed');

// 3. queryGemma2 Fast-Path (without streaming)
const startFastPath = performance.now();
const resFastPath = await queryGemma2('Che spese ho questo mese?', [], 'Davide');
const elapsedFastPath = performance.now() - startFastPath;
console.log(`[Test 3] queryGemma2 Fast-Path (headless) latency: ${elapsedFastPath.toFixed(2)}ms`);
assert(elapsedFastPath < 150, `Fast-path must be under 150ms, got ${elapsedFastPath}ms`);
assert.strictEqual(resFastPath.engineUsed, 'chelona-engine');
assert(resFastPath.text.length > 0);
console.log('✅ queryGemma2 Fast-Path test passed');

// 4. queryGemma2 Live Direct Execution (Cache Completely Eliminated)
const startDirect = performance.now();
const resDirect = await queryGemma2('Che spese ho questo mese?', [], 'Davide');
const elapsedDirect = performance.now() - startDirect;
console.log(`[Test 4] queryGemma2 Direct Live Execution (No Cache) latency: ${elapsedDirect.toFixed(2)}ms`);
assert(elapsedDirect < 150, `Live direct execution must be under 150ms, got ${elapsedDirect}ms`);
assert.strictEqual(resDirect.cached, false, 'cached flag must be false (cache eliminated)');
assert.strictEqual(resDirect.semanticMatch, false, 'semanticMatch must be false (cache eliminated)');
assert(resDirect.text && resDirect.text.length > 0, 'Must produce valid response text');
console.log('✅ AI Cache Elimination & Live Execution test passed');

// 4b. Verify cache lookups and storage are eliminated
assert.strictEqual(isCacheEnabled(), false, 'isCacheEnabled must return false (cache permanently eliminated)');
assert.strictEqual(semanticCache.findMatch('Che spese ho questo mese?'), null, 'semanticCache.findMatch must return null');
assert.strictEqual(promptCache.get('Che spese ho questo mese?', ''), null, 'promptCache.get must return null');

// Verify a completely new query runs directly without cache
const newQuery = 'Quali sono le scadenze della patente di guida?';
const resNewQuery = await queryGemma2(newQuery, [], 'Davide');
assert.strictEqual(resNewQuery.cached, false, 'New query must not be cached');
assert.strictEqual(semanticCache.findMatch(newQuery), null, 'New query must not be saved into cache');
console.log('✅ AI Cache Permanent Elimination verified successfully');

// 5. queryGemma2 with onToken streaming
let streamedText = '';
const startStream = performance.now();
const resStream = await queryGemma2('Aggiungi mele e pere alla spesa', [], 'Davide', (tok) => {
  streamedText += tok;
});
const elapsedStream = performance.now() - startStream;
console.log(`[Test 5] queryGemma2 streaming latency: ${elapsedStream.toFixed(2)}ms, tokens length: ${streamedText.length}`);
assert(elapsedStream < 500, `Streaming fallback must finish in < 500ms, got ${elapsedStream}ms`);
assert.strictEqual(resStream.createdModule !== undefined, true);
assert(streamedText.toLowerCase().includes('mele') || streamedText.toLowerCase().includes('pere'), 'Streamed text should contain items');
console.log('✅ Token streaming test passed');

// 6. Response time guarantee: must be strictly < 3000ms
assert(elapsedFastPath < 3000, 'Must be < 3 seconds');
assert(elapsedStream < 3000, 'Must be < 3 seconds');

// 7. Generic offers request -> Rimando a tutti i volantini
const resGenericOffers = await queryChelonaAi('Quali sono le offerte?', [], 'Davide');
assert(resGenericOffers && resGenericOffers.autoAction, 'Generic offers must have autoAction');
assert.strictEqual(resGenericOffers.autoAction.type, 'volantino', 'autoAction must be type volantino');
assert(resGenericOffers.text.toLowerCase().includes('tutti i volantini'), 'Text must mention tutti i volantini');
console.log('✅ Generic offers -> Rimando a tutti i volantini test passed');

// 8. Best offers request -> Confronta Prezzi convenient deals
const resBestOffers = await queryChelonaAi('Quali sono le migliori offerte?', [], 'Davide');
assert(resBestOffers && resBestOffers.actions && resBestOffers.actions.length > 0, 'Best offers must return action buttons');
assert(resBestOffers.text.includes('Confronta Prezzi'), 'Must mention Confronta Prezzi');
assert(resBestOffers.text.includes('sotto la media'), 'Must include savings vs average');
// Check that action items have valid flyerId and page
const flyerActions = resBestOffers.actions.filter(a => a.type === 'volantino' && a.flyerId);
assert(flyerActions.length >= 3, 'Must have at least 3 direct flyer actions with exact page');
for (const a of flyerActions) {
  assert(typeof a.page === 'number' && a.page >= 1, 'Page must be >= 1');
  assert(a.flyerId, 'Must have flyerId');
}
console.log('✅ Best offers -> Confronta Prezzi with exact flyer pages test passed');

// 9. Parking Intent Navigation Tests (User requirement 2)
console.log('\n[Test 9] Parking Intent & Navigation Verification:');
const parkingQueries = [
  'segnami un parcheggio',
  'salva la posizione dell\'auto',
  'ho parcheggiato qui',
  'dov\'è la macchina',
  'ricorda dove ho parcheggiato',
  'salva la posizione',
  'salva la mia posizione',
  'segnami la posizione',
  'ricordati il parcheggio',
  'ricordami dove ho parcheggiato',
  'ho lasciato l\'auto qui',
  'dove ho lasciato la macchina',
  'dove ho parcheggiato l\'auto',
  'dove ho parcheggiato la macchina',
  'segna il parcheggio',
  'memorizza la posizione',
  'salva parcheggio',
  'segnami il parcheggio',
  'dov\'è la mia auto',
  'dov\'è la mia macchina',
  'parcheggio',
  'radar parcheggio',
  'salva la posizione della macchina',
  'dove sta la macchina',
  'dove si trova l\'auto'
];

for (const q of parkingQueries) {
  const res = await queryChelonaAi(q, [], 'Davide');
  assert(res, `Response must exist for "${q}"`);
  assert(res.autoAction, `Must have autoAction for "${q}"`);
  assert.strictEqual(res.autoAction.type, 'parking', `autoAction.type must be parking for "${q}"`);
  assert(!res.text.includes('ricetta'), `Response for "${q}" must not leak recipe`);
  console.log(`  ✓ "${q}" -> autoAction: ${res.autoAction.type} (${res.autoAction.label})`);
}
console.log(`✅ All ${parkingQueries.length} parking intent queries return parking autoAction successfully`);

console.log('🎉 ALL AI LATENCY AND TIMING TESTS PASSED PERFECTLY!');
process.exit(0);
