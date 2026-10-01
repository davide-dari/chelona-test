import assert from 'node:assert';
import { validateFiscalCode } from '../src/services/cfValidator.ts';
import {
  computeDoctorStudioStatus,
  buildPrescriptionEmail,
  DEFAULT_DOCTOR_STATE,
  DAYS_NAMES
} from '../src/services/doctorService.ts';
import {
  evaluateRecessoLegalTerms,
  buildRecessoFormalBody
} from '../src/services/recessoService.ts';
import { SECTION_SHORTCUTS, createSectionShortcut } from '../src/services/shortcutService.ts';

console.log('--- Testing Sintesi Integration into Chelona ---');

// 1. Test Codice Fiscale Validator (Mathematical Checksum)
console.log('1. Testing Codice Fiscale Checksum...');
const validCf = 'RSSMRA80A01H501U'; // Mario Rossi, 01/01/1980, Roma (H501), Control: U
const resValid = validateFiscalCode(validCf);
assert.strictEqual(resValid.isValid, true, 'Valid CF should be valid');
assert.strictEqual(resValid.expectedCheckChar, 'U', 'Check character should match U');

const invalidCheckCharCf = 'RSSMRA80A01H501X';
const resInvalidChar = validateFiscalCode(invalidCheckCharCf);
assert.strictEqual(resInvalidChar.isValid, false, 'Invalid check char should fail');
assert.strictEqual(resInvalidChar.expectedCheckChar, 'U');

const wrongLengthCf = 'RSSMRA80A01';
const resWrongLength = validateFiscalCode(wrongLengthCf);
assert.strictEqual(resWrongLength.isValid, false, 'Short CF should fail');

console.log('✓ Codice Fiscale validator tests passed.');

// 2. Test Doctor Studio Real-Time Status & Mathematical Calculations
console.log('2. Testing Doctor Schedule Mathematical Engine...');
const schedule = {
  1: { closed: false, slots: [{ start: '09:00', end: '12:30' }, { start: '16:00', end: '19:00' }] }, // Lunedì
  2: { closed: false, slots: [{ start: '09:00', end: '12:30' }] },                                      // Martedì
  3: { closed: false, slots: [{ start: '15:30', end: '19:00' }] },                                      // Mercoledì
  4: { closed: false, slots: [{ start: '09:00', end: '12:30' }, { start: '16:00', end: '19:00' }] }, // Giovedì
  5: { closed: false, slots: [{ start: '09:00', end: '12:30' }] },                                      // Venerdì
  6: { closed: true, slots: [] },                                                                       // Sabato
  0: { closed: true, slots: [] },                                                                       // Domenica
};

// Monday 10:15 -> APERTO, slot 09:00-12:30, closes in 135 min
const mondayOpen = new Date('2026-10-05T10:15:00'); // 2026-10-05 is a Monday
const st1 = computeDoctorStudioStatus(schedule, mondayOpen);
assert.strictEqual(st1.isOpen, true, 'Studio should be open on Monday 10:15');
assert.strictEqual(st1.label, 'APERTO');
assert.strictEqual(st1.statusColor, 'emerald');
assert.strictEqual(st1.minutesRemaining, 135);

// Monday 12:15 -> CHIUDE A BREVE (<= 30 min remaining)
const mondayClosingSoon = new Date('2026-10-05T12:15:00');
const st2 = computeDoctorStudioStatus(schedule, mondayClosingSoon);
assert.strictEqual(st2.isOpen, true);
assert.strictEqual(st2.isClosingSoon, true);
assert.strictEqual(st2.label, 'CHIUDE A BREVE');
assert.strictEqual(st2.statusColor, 'amber');
assert.strictEqual(st2.minutesRemaining, 15);

// Monday 13:00 -> CHIUSO, next opening today at 16:00
const mondayLunch = new Date('2026-10-05T13:00:00');
const st3 = computeDoctorStudioStatus(schedule, mondayLunch);
assert.strictEqual(st3.isOpen, false);
assert.strictEqual(st3.label, 'CHIUSO');
assert.ok(st3.detail.includes('Apre oggi alle 16:00'), `Expected "Apre oggi alle 16:00", got ${st3.detail}`);

// Saturday 14:00 -> CHIUSO, next opening Monday at 09:00
const saturday = new Date('2026-10-10T14:00:00');
const st4 = computeDoctorStudioStatus(schedule, saturday);
assert.strictEqual(st4.isOpen, false);
assert.ok(st4.detail.includes('Apre Lunedì alle 09:00'), `Expected "Apre Lunedì alle 09:00", got ${st4.detail}`);

// Test Prescription Email Builder
const emailData = buildPrescriptionEmail(
  {
    firstName: 'Paolo',
    lastName: 'Bianchi',
    gender: 'M',
    specialization: 'Medico di Famiglia',
    address: 'Via Roma 1',
    city: 'Milano',
    cap: '20100',
    email: 'dottore@test.it',
    landline: '0212345',
    mobile: '33312345',
    notes: '',
    schedule,
  },
  'Mario Rossi',
  'RSSMRA80A01H501U',
  [
    { id: '1', name: 'Cardioaspirina 100mg', type: 'farmaco', posology: '1 cpr al di' },
    { id: '2', name: 'Visita Cardiologica con ECG', type: 'visita' },
  ],
  'Richiesta urgente'
);

assert.ok(emailData.mailtoUrl.startsWith('mailto:dottore@test.it'));
assert.ok(emailData.subject.includes('Mario Rossi'));
assert.ok(emailData.body.includes('Cardioaspirina 100mg (Posologia: 1 cpr al di)'));
assert.ok(emailData.body.includes('Visita Cardiologica con ECG'));
assert.ok(emailData.body.includes('Richiesta urgente'));

console.log('✓ Doctor schedule & prescription tests passed.');

// 3. Test Recesso Legal Calculations (14-Day Cooling Off vs 30-Day Notice)
console.log('3. Testing Recesso Mathematical Terms...');
const today = new Date('2026-10-01T12:00:00');

// Contract signed 5 days ago -> within 14-day statutory cooling off period
const contract5DaysAgo = '2026-09-26';
const terms1 = evaluateRecessoLegalTerms(contract5DaysAgo, today);
assert.strictEqual(terms1.isRipensamento14Days, true);
assert.strictEqual(terms1.elapsedDays, 5);
assert.ok(terms1.legalArticle.includes('D.Lgs. 206/2005'));
assert.strictEqual(terms1.effectiveDate, 'Immediata (senza penali)');

// Contract signed 60 days ago -> ordinary withdrawal with 30-day notice (Bersani)
const contract60DaysAgo = '2026-08-02';
const terms2 = evaluateRecessoLegalTerms(contract60DaysAgo, today);
assert.strictEqual(terms2.isRipensamento14Days, false);
assert.strictEqual(terms2.elapsedDays, 60);
assert.ok(terms2.legalArticle.includes('Legge n. 40/2007'));
assert.strictEqual(terms2.effectiveDate, '31/10/2026'); // 30 days from Oct 1

// Formal Body verification
const formalBody = buildRecessoFormalBody(
  {
    companyName: 'Vodafone Italia S.p.A.',
    companyAddress: 'Via Jervis 13, Ivrea',
    companyPec: 'servizioclienti@vodafone.pec.it',
    contractType: 'Fibra Casa',
    contractNumber: 'VF-998877',
    contractDate: contract5DaysAgo,
    userFirstName: 'Mario',
    userLastName: 'Rossi',
    userFiscalCode: 'RSSMRA80A01H501U',
    userAddress: 'Via Roma 10',
    userCap: '00100',
    userCity: 'Roma',
    userProvince: 'RM',
  },
  terms1,
  today
);

assert.ok(formalBody.includes('Vodafone Italia S.p.A.'));
assert.ok(formalBody.includes('DIRITTO DI RIPENSAMENTO'));
assert.ok(formalBody.includes('VF-998877'));
assert.ok(formalBody.includes('RSSMRA80A01H501U'));

console.log('✓ Recesso legal terms and body generator tests passed.');

// 4. Test Home Screen Shortcuts Definition
console.log('4. Testing Android Pinned Shortcuts definitions...');
const doctorShortcut = SECTION_SHORTCUTS.find(s => s.id === 'doctor');
assert.ok(doctorShortcut, 'Doctor shortcut definition must exist');
assert.strictEqual(doctorShortcut.route, 'doctor');
assert.strictEqual(doctorShortcut.shortLabel, 'Medico');

const recessoShortcut = SECTION_SHORTCUTS.find(s => s.id === 'recesso');
assert.ok(recessoShortcut, 'Recesso shortcut definition must exist');
assert.strictEqual(recessoShortcut.route, 'recesso');
assert.strictEqual(recessoShortcut.shortLabel, 'Disdette');

console.log('✓ Shortcuts tests passed.');

console.log('ALL SINTESI TESTS PASSED PERFECTLY!');
