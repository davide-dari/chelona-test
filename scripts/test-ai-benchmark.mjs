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

console.log('🧪 Starting AI Latency, Cache & Response Time Verification Tests...');

import { queryGemma2, checkNativeLlmAvailability } from '../src/services/gemma2Engine.ts';
import { queryChelonaAi } from '../src/services/chelonaEngine.ts';

// 1. Check checkNativeLlmAvailability speed
const startNative = performance.now();
const isNative = await checkNativeLlmAvailability();
const elapsedNative = performance.now() - startNative;
console.log(`[Test 1] checkNativeLlmAvailability latency: ${elapsedNative.toFixed(2)}ms (isNative=${isNative})`);
assert.strictEqual(isNative, false, 'Should be false in mock non-native environment');
assert(elapsedNative < 20, `checkNativeLlmAvailability must complete in < 20ms, got ${elapsedNative}ms`);
console.log('✅ Native availability check passed');

// 2. Direct queryChelonaAi latency test
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

// 4. queryGemma2 Semantic Cache Hit (0ms)
const startCache = performance.now();
const resCache = await queryGemma2('Che spese ho questo mese?', [], 'Davide');
const elapsedCache = performance.now() - startCache;
console.log(`[Test 4] queryGemma2 Semantic Cache Hit latency: ${elapsedCache.toFixed(2)}ms`);
assert(elapsedCache < 50, `Cache hit must be under 50ms, got ${elapsedCache}ms`);
assert.strictEqual(resCache.cached, true);
assert.strictEqual(resCache.semanticMatch, true);
console.log('✅ Semantic cache 0ms hit test passed');

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

console.log('🎉 ALL AI LATENCY AND TIMING TESTS PASSED PERFECTLY!');
