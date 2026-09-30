import assert from 'node:assert';
import {
  getAutoDeadlineTargetDate,
  isDeadlineFeminine,
  formatDeadlineCountdown,
  computeVehicleDeadlines
} from '../src/utils/autoDeadlines.ts';

console.log('🧪 Starting Auto Deadlines Verification Tests...');

// 1. Test Revisione calculation
{
  const lastRevDate = '2024-05-15';
  const target = getAutoDeadlineTargetDate('lastRevision', lastRevDate);
  assert(target !== null, 'Target should not be null');
  // 2 years later: 2026-05-31 (last day of May 2026)
  assert.strictEqual(target.getFullYear(), 2026);
  assert.strictEqual(target.getMonth(), 4); // 0-indexed May = 4
  assert.strictEqual(target.getDate(), 31);
  console.log('✅ Revisione 2-year end-of-month calculation passed');
}

// 2. Test first revision from registration year
{
  const target = getAutoDeadlineTargetDate('lastRevision', undefined, { registrationYear: '2022' });
  assert(target !== null, 'Target should not be null');
  assert.strictEqual(target.getFullYear(), 2026);
  assert.strictEqual(target.getMonth(), 11); // December
  assert.strictEqual(target.getDate(), 31);
  console.log('✅ First revision from registration year passed');
}

// 3. Test GPL 10-year replacement
{
  const target = getAutoDeadlineTargetDate('lastGplCylinder', '2018-03-20', { fuelType: 'gpl' });
  assert(target !== null, 'Target should not be null');
  assert.strictEqual(target.getFullYear(), 2028);
  assert.strictEqual(target.getMonth(), 2); // March
  assert.strictEqual(target.getDate(), 20);
  console.log('✅ GPL 10-year replacement date passed');
}

// 4. Test Metano R110 (5 years) vs standard (4 years)
{
  const targetR110 = getAutoDeadlineTargetDate('lastMethaneCylinder', '2022-01-10', { fuelType: 'metano', methaneType: 'r110' });
  assert.strictEqual(targetR110.getFullYear(), 2027);

  const targetStd = getAutoDeadlineTargetDate('lastMethaneCylinder', '2022-01-10', { fuelType: 'metano', methaneType: 'standard' });
  assert.strictEqual(targetStd.getFullYear(), 2026);
  console.log('✅ Metano R110 (5y) and standard (4y) passed');
}

// 5. Test feminine / masculine Italian gender logic
{
  assert.strictEqual(isDeadlineFeminine('lastInsurance'), true);
  assert.strictEqual(isDeadlineFeminine('lastRevision'), true);
  assert.strictEqual(isDeadlineFeminine('battery12vExpiryDate'), true);
  assert.strictEqual(isDeadlineFeminine('lastGplCylinder'), true);
  assert.strictEqual(isDeadlineFeminine('lastTax'), false);
  assert.strictEqual(isDeadlineFeminine('lastServiceKm'), false);
  console.log('✅ Italian gender classification passed');
}

// 6. Test formatDeadlineCountdown
{
  const expFem = formatDeadlineCountdown(-5, true);
  assert.strictEqual(expFem.status, 'expired');
  assert.strictEqual(expFem.text, 'Scaduta da 5 gg');

  const expMasc = formatDeadlineCountdown(-1, false);
  assert.strictEqual(expMasc.status, 'expired');
  assert.strictEqual(expMasc.text, 'Scaduto da 1 giorno');

  const todayFem = formatDeadlineCountdown(0, true);
  assert.strictEqual(todayFem.status, 'urgent');
  assert.strictEqual(todayFem.text, 'Scade oggi!');

  const tomorrow = formatDeadlineCountdown(1, false);
  assert.strictEqual(tomorrow.status, 'urgent');
  assert.strictEqual(tomorrow.text, 'Scade domani (1 gg)');

  const soon = formatDeadlineCountdown(14, false);
  assert.strictEqual(soon.status, 'urgent');
  assert.strictEqual(soon.text, 'Scade tra 14 gg');

  const valid = formatDeadlineCountdown(90, false);
  assert.strictEqual(valid.status, 'valid');
  assert.strictEqual(valid.text, 'Valido (90 gg)');
  console.log('✅ Countdown formatting passed');
}

// 7. Test computeVehicleDeadlines full suite
{
  const mockAuto = {
    id: 'test_auto',
    type: 'auto',
    title: 'Alfa Romeo Giulia',
    brand: 'Alfa Romeo',
    model: 'Giulia',
    plate: 'GA 123 BZ',
    registrationYear: '2021',
    fuelType: 'diesel',
    currentKm: '42000',
    lastServiceKm: '30000',
    tiresKm: '35000',
    tiresSuggestedOffsetKm: 2000,
    lastInsurance: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0], // in 15 days
    lastTax: new Date(Date.now() + 120 * 86400000).toISOString().split('T')[0], // in 120 days
    lastRevision: '2025-05-10', // expires 2027-05-31
    x: 0, y: 0, w: 2, h: 2,
  };

  const deadlines = computeVehicleDeadlines(mockAuto);
  assert(deadlines.length >= 5, 'Should include all core deadlines');

  // Verify Tagliando: last 30000, next 45000, cur 42000 -> 3000 km left (valid)
  const tagliando = deadlines.find(d => d.id === 'svc');
  assert(tagliando, 'Tagliando should be present');
  assert.strictEqual(tagliando.km, 45000);
  assert.strictEqual(tagliando.kmLeft, 3000);
  assert.strictEqual(tagliando.status, 'valid');

  // Verify Gomme: last 35000, interval 10000 + 2000 = 12000 -> next 47000, cur 42000 -> 5000 km left
  const gomme = deadlines.find(d => d.id === 'tires');
  assert(gomme, 'Gomme should be present');
  assert.strictEqual(gomme.km, 47000);
  assert.strictEqual(gomme.kmLeft, 5000);

  // Verify Assicurazione: in 15 days -> status urgent
  const ins = deadlines.find(d => d.id === 'ins');
  assert(ins, 'Assicurazione should be present');
  assert.strictEqual(ins.status, 'urgent');

  // Verify Revisione: last 2025-05-10 -> next 2027-05-31 -> valid (in ~244 days from now in Sept 2026)
  const rev = deadlines.find(d => d.id === 'rev');
  assert(rev, 'Revisione should be present');
  assert.strictEqual(rev.status, 'valid');
  assert(rev.daysLeft > 200, 'Revisione should have >200 days left');

  console.log('✅ computeVehicleDeadlines full suite passed');
}

console.log('🎉 ALL AUTO DEADLINES TESTS PASSED!');
