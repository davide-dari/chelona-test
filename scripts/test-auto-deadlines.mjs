import assert from 'node:assert';
import {
  getAutoDeadlineTargetDate,
  isDeadlineFeminine,
  formatDeadlineCountdown,
  computeVehicleDeadlines,
  calculateBolloAuto
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

// 8. Test Bollo Auto 2026 & Nuova Normativa 2027 (< 80 kW)
{
  // 8a. Test Euro 6 car with 70 kW (<= 80 kW) in 2026: 53*2.58 + 17*3.87 = 136.74 + 65.79 = 202.53 €
  const bollo2026 = calculateBolloAuto(70, 'Euro 6', 'benzina', 2026);
  assert.strictEqual(bollo2026.powerKw, 70);
  assert.strictEqual(bollo2026.amount2026, 202.53);
  assert.strictEqual(bollo2026.amount, 202.53);
  assert.strictEqual(bollo2026.isExempt2027, true);
  assert(bollo2026.badgeText.includes('Esenzione Bollo 2027: veicolo sotto 80 kW'));

  // 8b. Same vehicle in 2027: should be completely EXEMPT (0 €)!
  const bollo2027 = calculateBolloAuto(70, 'Euro 6', 'benzina', 2027);
  assert.strictEqual(bollo2027.amount, 0);
  assert.strictEqual(bollo2027.amount2027, 0);
  assert.strictEqual(bollo2027.isExempt2027, true);
  assert(bollo2027.badgeText.includes('Esenzione Bollo 2027: veicolo sotto 80 kW'));
  console.log('✅ Bollo 2027 exemption for vehicle <= 80 kW passed');

  // 8c. Boundary test: Exactly 80 kW in 2027 -> should be exempt (0 €)
  const bollo80kw = calculateBolloAuto(80, 'Euro 6', 'diesel', 2027);
  assert.strictEqual(bollo80kw.amount, 0);
  assert.strictEqual(bollo80kw.isExempt2027, true);
  console.log('✅ Bollo 2027 boundary (exactly 80 kW) exemption passed');

  // 8d. Vehicle > 80 kW (e.g. 90 kW) in 2027 -> NOT exempt, pays standard tariff
  // 53 * 2.58 + (90 - 53) * 3.87 = 136.74 + 143.19 = 279.93 €
  const bollo90kw = calculateBolloAuto(90, 'Euro 6', 'benzina', 2027);
  assert.strictEqual(bollo90kw.isExempt2027, false);
  assert.strictEqual(bollo90kw.amount, 279.93);
  assert.strictEqual(bollo90kw.amount2027, 279.93);
  console.log('✅ Bollo 2027 non-exemption for vehicle > 80 kW passed');

  // 8e. Electric car: reduced tariff
  const bolloEv = calculateBolloAuto(100, 'Euro 6', 'elettrica', 2026);
  assert(bolloEv.amount < 100, 'Electric vehicle should have reduced tariff');
  console.log('✅ Electric car calculation passed');
}

// 9. Test vehicle with powerKw and euroClass in computeVehicleDeadlines
{
  const mockAutoWithKw = {
    id: 'test_auto_kw',
    type: 'auto',
    title: 'Fiat 500',
    brand: 'Fiat',
    model: '500',
    plate: 'EF 456 GH',
    registrationYear: '2020',
    fuelType: 'benzina',
    powerKw: '51',
    euroClass: 'Euro 6',
    currentKm: '30000',
    lastTax: '2027-01-31',
    x: 0, y: 0, w: 2, h: 2,
  };

  const deadlines = computeVehicleDeadlines(mockAutoWithKw);
  const taxItem = deadlines.find(d => d.id === 'tax');
  assert(taxItem !== undefined, 'Tax deadline should exist');
  assert(taxItem.taxCalculation !== undefined, 'taxCalculation should be computed');
  assert.strictEqual(taxItem.taxCalculation.isExempt2027, true);
  assert.strictEqual(taxItem.taxCalculation.amount, 0); // 2027 deadline -> 0 €!
  assert(taxItem.subtitle.includes('Esenzione Bollo 2027'));
  console.log('✅ computeVehicleDeadlines with powerKw and 2027 exemption passed');
}

console.log('🎉 ALL AUTO DEADLINES TESTS PASSED!');
