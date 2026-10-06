#!/usr/bin/env node
/**
 * scripts/test-volantini-service.mjs
 * Test suite per dataset volantini, reader Calaméo/CeDiGros, e volantiniSyncService.
 */

import assert from 'node:assert/strict';
import { VOLANTINI_DB } from '../src/data/volantiniDb.js';
import { 
  getFlyerExpiryInfo, formatUpdateDate, getLiveVolantiniDb 
} from '../src/services/volantiniSync.js';

console.log('🧪 === TEST VOLANTINI SERVICE & DATASET INTEGRITY ===');

// 1. Test Dataset Structure & Counts
console.log('1. Testing Dataset Structure & Counts...');
assert.ok(VOLANTINI_DB.updatedAt, 'updatedAt must be defined');
assert.ok(!isNaN(new Date(VOLANTINI_DB.updatedAt).getTime()), 'updatedAt must be a valid date');
assert.ok(Array.isArray(VOLANTINI_DB.chains), 'chains must be an array');
assert.ok(VOLANTINI_DB.chains.length >= 50, `Expected at least 50 chains, got ${VOLANTINI_DB.chains.length}`);

const totalFlyers = VOLANTINI_DB.chains.reduce((sum, c) => sum + c.flyers.length, 0);
assert.ok(totalFlyers >= 150, `Expected at least 150 flyers, got ${totalFlyers}`);
console.log(`✓ Dataset valid: ${VOLANTINI_DB.chains.length} chains, ${totalFlyers} flyers`);

// 2. Test Zero Expired Flyers & 100% Valid Readers/Covers
console.log('2. Testing Expiry & Flyer Integrity across 100% of dataset...');
const now = new Date();
const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

let expiredCount = 0;
let missingViewerCount = 0;
let missingCoverCount = 0;

for (const chain of VOLANTINI_DB.chains) {
  assert.ok(chain.slug, 'Chain must have slug');
  assert.ok(chain.name, 'Chain must have name');
  assert.ok(chain.flyers.length > 0, `Chain ${chain.slug} has no flyers`);

  for (const f of chain.flyers) {
    assert.ok(f.id, `Flyer in ${chain.slug} missing id`);
    assert.ok(f.title, `Flyer #${f.id} missing title`);
    
    // Check reader capability
    if (!f.bkcode && !f.directUrl) missingViewerCount++;

    // Check cover capability
    if (!f.coverUrl) missingCoverCount++;

    // Check expiry
    if (f.to) {
      const toTime = new Date(f.to).getTime();
      if (toTime < todayMidnight) {
        expiredCount++;
      }
    }
  }
}

assert.equal(missingViewerCount, 0, 'Every flyer must have a reader bkcode or directUrl');
assert.equal(missingCoverCount, 0, 'Every flyer must have a coverUrl');
assert.equal(expiredCount, 0, 'No expired flyers allowed in dataset');
console.log('✓ 100% of flyers have verified readers, covers, and valid dates');

// 3. Test getFlyerExpiryInfo
console.log('3. Testing getFlyerExpiryInfo logic...');
const mockToday = new Date().toISOString();
const todayInfo = getFlyerExpiryInfo({ id: 1, title: 'Test', to: mockToday });
assert.equal(todayInfo.status, 'today');
assert.equal(todayInfo.daysLeft, 0);

const tomorrowDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
const tomorrowInfo = getFlyerExpiryInfo({ id: 2, title: 'Test', to: tomorrowDate });
assert.equal(tomorrowInfo.status, 'tomorrow');
assert.equal(tomorrowInfo.daysLeft, 1);

const pastDate = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
const pastInfo = getFlyerExpiryInfo({ id: 3, title: 'Test', to: pastDate });
assert.equal(pastInfo.status, 'expired');
assert.ok(pastInfo.daysLeft < 0);

const futureDate = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString();
const futureInfo = getFlyerExpiryInfo({ id: 4, title: 'Test', to: futureDate });
assert.equal(futureInfo.status, 'active');
assert.ok(futureInfo.daysLeft >= 4);

console.log('✓ getFlyerExpiryInfo correctly calculates status for all timeframes');

// 4. Test formatUpdateDate
console.log('4. Testing formatUpdateDate...');
const formatted = formatUpdateDate(VOLANTINI_DB.updatedAt);
assert.ok(formatted.length > 5, 'Formatted date must not be empty');
assert.notEqual(formatted, 'Data non disponibile');
console.log(`✓ formatUpdateDate produced: "${formatted}"`);

// 5. Test Live HTTP sample reachability (Calaméo & CeDiGros)
console.log('5. Testing Live HTTP sample reachability...');
const sampleCalameo = VOLANTINI_DB.chains.find(c => c.slug === 'lidl')?.flyers[0];
assert.ok(sampleCalameo, 'Lidl flyer must exist');
const calameoReaderUrl = `https://www.calameo.com/read/${sampleCalameo.bkcode}${sampleCalameo.authid ? `?authid=${sampleCalameo.authid}` : ''}`;
const calameoEmbedUrl = `https://v.calameo.com/?bkcode=${sampleCalameo.bkcode}${sampleCalameo.authid ? `&authid=${sampleCalameo.authid}` : ''}`;
const calameoRes = await fetch(calameoReaderUrl, { method: 'HEAD' });
assert.equal(calameoRes.status, 200, 'Calameo reader URL must return HTTP 200');

const calameoEmbedRes = await fetch(calameoEmbedUrl, { method: 'HEAD' });
assert.equal(calameoEmbedRes.status, 200, 'Calameo embed URL (v.calameo.com) must return HTTP 200');

const calameoCoverRes = await fetch(sampleCalameo.coverUrl, { method: 'HEAD' });
assert.equal(calameoCoverRes.status, 200, 'Calameo cover URL must return HTTP 200');
console.log(`✓ Calameo flyer #${sampleCalameo.id} embed (200), reader (200) and cover (200) verified`);

const sampleGros = VOLANTINI_DB.chains.find(c => c.slug === 'pewex')?.flyers[0];
assert.ok(sampleGros, 'Pewex flyer must exist');
const grosRes = await fetch(sampleGros.directUrl, { method: 'HEAD' });
assert.equal(grosRes.status, 200, 'CeDiGros direct reader URL must return HTTP 200');

const grosCoverRes = await fetch(sampleGros.coverUrl, { method: 'HEAD' });
assert.equal(grosCoverRes.status, 200, 'CeDiGros cover URL must return HTTP 200');
console.log(`✓ CeDiGros flyer #${sampleGros.id} reader (200) and cover (200) verified`);

// 6. Test Remote Sync Endpoints
console.log('6. Testing Remote Sync Endpoints Reachability...');
const remoteUrls = [
  'https://raw.githubusercontent.com/davide-dari/chelona-test/main/public/volantiniDb.json',
  'https://cdn.jsdelivr.net/gh/davide-dari/chelona-test@main/public/volantiniDb.json'
];
for (const u of remoteUrls) {
  const res = await fetch(u, { method: 'HEAD' });
  assert.equal(res.status, 200, `Remote endpoint ${u} must return HTTP 200`);
}
console.log('✓ Remote sync endpoints (GitHub raw & jsDelivr CDN) responding with HTTP 200');

// 7. Test Multi-CDN Cover Fallback Candidates
console.log('7. Testing Multi-CDN Cover Candidate Resolution...');
assert.ok(sampleCalameo.coverUrl.includes('calameo.com'), 'Calaméo flyer primary cover must be CDN cover');
const sampleWithFallback = VOLANTINI_DB.chains.flatMap(c => c.flyers).find(f => f.fallbackCoverUrl);
assert.ok(sampleWithFallback, 'Must have flyers with fallbackCoverUrl');
assert.ok(sampleWithFallback.fallbackCoverUrl.includes('centrovolantini.it'), 'Fallback cover points to CV thumbnail');
console.log('✓ Multi-candidate cover resolution (Calaméo CDN cover + fallbackCoverUrl) verified');

console.log('\n🎉 ALL VOLANTINI TESTS PASSED PERFECTLY (100% OPERATIONAL)!');
