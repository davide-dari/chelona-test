import assert from 'node:assert';
import {
  normalizeDateToIso,
  getExpirationCountdown,
  parseDocumentText
} from '../src/utils/documentOcrParser.ts';

console.log('🧪 Starting Document OCR & Parser Verification Tests...');

// 1. Test Date Normalization
{
  assert.strictEqual(normalizeDateToIso('2028-10-15'), '2028-10-15');
  assert.strictEqual(normalizeDateToIso('15/10/2028'), '2028-10-15');
  assert.strictEqual(normalizeDateToIso('05-03-2027'), '2027-03-05');
  assert.strictEqual(normalizeDateToIso('01.12.2029'), '2029-12-01');
  assert.strictEqual(normalizeDateToIso('20/10/28'), '2028-10-20');
  assert.strictEqual(normalizeDateToIso('15 Ottobre 2030'), '2030-10-15');
  assert.strictEqual(normalizeDateToIso('22 gen 2026'), '2026-01-22');
  assert.strictEqual(normalizeDateToIso('invalid-date'), null);
  console.log('✅ Date normalization passed');
}

// 2. Test Expiration Countdown Chips
{
  // Test no expiry date
  const noneRes = getExpirationCountdown(undefined);
  assert.strictEqual(noneRes.status, 'none');

  // Test expired date (e.g. 2020-01-01)
  const expiredRes = getExpirationCountdown('2020-01-01');
  assert.strictEqual(expiredRes.status, 'expired');
  assert(expiredRes.label === 'SCADUTO');
  assert(expiredRes.diffDays < 0);

  // Test expiring in 15 days
  const now = new Date();
  const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const urgentRes = getExpirationCountdown(in15Days);
  assert.strictEqual(urgentRes.status, 'urgent');
  assert(urgentRes.label.includes('SCADE IN') || urgentRes.label.includes('SCADE'));

  // Test expiring in 60 days
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const warningRes = getExpirationCountdown(in60Days);
  assert.strictEqual(warningRes.status, 'warning');
  assert(warningRes.label.includes('MESI'));

  // Test valid for 2 years
  const in2Years = new Date(now.getTime() + 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const validRes = getExpirationCountdown(in2Years);
  assert.strictEqual(validRes.status, 'valid');
  assert.strictEqual(validRes.label, 'VALIDO');

  console.log('✅ Expiration countdown chips passed');
}

// 3. Test Codice Fiscale (Tessera Sanitaria) OCR Parsing
{
  const sampleOcr = `
    REPUBBLICA ITALIANA
    MINISTERO DELL'ECONOMIA E DELLE FINANZE
    TESSERA SANITARIA
    RSSMRA80A01H501U
    COGNOME ROSSI
    NOME MARIO
    DATA DI SCADENZA: 15/08/2029
    DATA DI RILASCIO: 15/08/2023
  `;

  const parsed = parseDocumentText(sampleOcr);
  assert.strictEqual(parsed.documentType, 'tax_code');
  assert.strictEqual(parsed.number, 'RSSMRA80A01H501U');
  assert.strictEqual(parsed.expiryDate, '2029-08-15');
  assert.strictEqual(parsed.issueDate, '2023-08-15');
  assert(parsed.confidence.number > 0.9);
  console.log('✅ Codice Fiscale OCR parsing passed');
}

// 4. Test Carta d'Identità Elettronica (CIE) OCR Parsing
{
  const sampleCie = `
    REPUBBLICA ITALIANA
    CARTA D'IDENTITA / IDENTITY CARD
    MINISTERO DELL'INTERNO
    COMUNE DI ROMA
    Cognome / Surname: BIANCHI
    Nome / Name: LUIGI
    Numero: CA12345AA
    Rilascio / Issue: 10/02/2022
    Scadenza / Expiry: 10/02/2032
  `;

  const parsed = parseDocumentText(sampleCie);
  assert.strictEqual(parsed.documentType, 'identity');
  assert.strictEqual(parsed.number, 'CA12345AA');
  assert.strictEqual(parsed.title, 'BIANCHI LUIGI');
  assert.strictEqual(parsed.expiryDate, '2032-02-10');
  assert.strictEqual(parsed.issueDate, '2022-02-10');
  assert.strictEqual(parsed.issuedBy, 'Comune di ROMA');
  console.log('✅ CIE OCR parsing passed');
}

// 5. Test Patente di Guida OCR Parsing
{
  const samplePatente = `
    REPUBBLICA ITALIANA
    PATENTE DI GUIDA
    1. VERDI
    2. GIOVANNI
    4a. 01/06/2021
    4b. 01/06/2031
    4c. MIT-UCO
    5. U12345678X
  `;

  const parsed = parseDocumentText(samplePatente);
  assert.strictEqual(parsed.documentType, 'driving_license');
  assert.strictEqual(parsed.number, 'U12345678X');
  assert.strictEqual(parsed.title, 'VERDI GIOVANNI');
  assert.strictEqual(parsed.expiryDate, '2031-06-01');
  assert.strictEqual(parsed.issueDate, '2021-06-01');
  console.log('✅ Patente OCR parsing passed');
}

// 6. Test Passaporto OCR Parsing
{
  const samplePass = `
    UNIONE EUROPEA
    REPUBBLICA ITALIANA
    PASSAPORTO / PASSPORT
    QUESTURA DI MILANO
    Cognome: FERRARI
    Nome: ALESSANDRO
    Passaporto N. YA1234567
    Data rilascio: 12/04/2020
    Data scadenza: 12/04/2030
  `;

  const parsed = parseDocumentText(samplePass);
  assert.strictEqual(parsed.title, 'FERRARI ALESSANDRO');
  assert.strictEqual(parsed.number, 'YA1234567');
  assert.strictEqual(parsed.expiryDate, '2030-04-12');
  assert.strictEqual(parsed.issueDate, '2020-04-12');
  assert(parsed.issuedBy?.includes('Questura'));
  console.log('✅ Passaporto OCR parsing passed');
}

console.log('🎉 ALL DOCUMENT OCR TESTS PASSED SUCCESSFULLY!');
