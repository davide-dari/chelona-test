import puppeteer from 'puppeteer';

const BASE = 'https://localhost:4173';
const results = [];
const ok = (name, pass, extra = '') => results.push({ name, pass, extra });

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--ignore-certificate-errors', '--allow-insecure-localhost'], ignoreHTTPSErrors: true });
const page = await browser.newPage();
await page.setViewport({ width: 420, height: 900 });
const failed = [];
page.on('requestfailed', r => failed.push(r.url()));

const bodyText = () => page.evaluate(() => document.body.innerText);
const waitText = (re, ms = 10000) => page.waitForFunction(r => new RegExp(r).test(document.body.innerText), { timeout: ms }, re)
  .catch(err => {
    return page.evaluate(() => document.body.innerText).then(t => { throw new Error(`${err.message} | BODY: ${t.slice(0, 300).replace(/\n/g, ' | ')}`); });
  });
const clickBtn = async (label, verify) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const ok = await page.evaluate(l => {
      const el = [...document.querySelectorAll('button, [role="button"], a')].find(x => x.innerText?.includes(l));
      if (el) { el.click(); return true; }
      return false;
    }, label);
    if (ok) await new Promise(r => setTimeout(r, 700));
    if (!verify || await page.evaluate(v => new RegExp(v).test(document.body.innerText), verify)) return ok;
  }
  return false;
};
const setVal = (i, v) => page.evaluate((i, v) => {
  const el = document.querySelectorAll('input')[i];
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }));
}, i, v);
const setSearch = v => page.evaluate(v => {
  const i = document.querySelector('input[placeholder*="Cerca"]');
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  s.call(i, v); i.dispatchEvent(new Event('input', { bubbles: true }));
}, v);
const setPlaceholder = (ph, v) => page.evaluate((ph, v) => {
  const el = [...document.querySelectorAll('input')].find(i => i.placeholder === ph);
  if (!el) return false;
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}, ph, v);

try {
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await waitText('Nuovo Profilo', 15000);
  await new Promise(r => setTimeout(r, 1500));

  console.log("STEP click", 'Nuovo Profilo'); await clickBtn('Nuovo Profilo', 'Inizia ora'); console.log("STEP ok");
  console.log("STEP click", 'Inizia ora'); await clickBtn('Inizia ora', 'Configura Profilo'); console.log("STEP ok");
  console.log("STEP click", 'Configura Profilo'); await clickBtn('Configura Profilo', 'Crea Profilo'); console.log("STEP ok");
  await waitText('Crea Profilo');
  const inputs = await page.evaluate(() => [...document.querySelectorAll('input')].map(i => i.placeholder));
  inputs.forEach((f, i) => { if (/nome|name/i.test(f || '')) setVal(i, 'Test'); if (/password|pass/i.test(f || '')) setVal(i, 'test123'); });
  await clickBtn('Crea Profilo');
  await clickBtn('Casa');

  // ── Modulo Volantino: catene CentroVolantini (indipendente da dovecovene) ──
  await clickBtn('Volantino');
  await waitText('Confronta prezzi');
  const centroTxt = await bodyText();
  ok('vista volantini: catene CentroVolantini', /Lidl/.test(centroTxt) && /Esselunga/.test(centroTxt) && /Conad/.test(centroTxt));
  ok('vista volantini: pulsanti Confronta/Esplora', /Confronta prezzi/.test(centroTxt) && /Esplora/.test(centroTxt));
  ok('vista volantini: fonte indipendente', /CentroVolantini|catene/i.test(centroTxt));

  // Apri una catena (Lidl) → elenco volantini
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => /Lidl/.test(x.innerText) && /volantin/i.test(x.innerText) && !/Esplora/.test(x.innerText));
    if (b) b.click();
  });
  await waitText(/volantini · CentroVolantini|Tutte le catene/);
  const chainTxt = await bodyText();
  ok('vista catena: volantini elencati', /volantin/i.test(chainTxt) && /Lidl/.test(chainTxt));

  // Back: catena → catene
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('volantino-back')));
  await new Promise(r => setTimeout(r, 500));
  ok('back catena → catene', /Confronta prezzi/.test(await bodyText()) && /Esplora/.test(await bodyText()));

  // ── Confronta prezzi (prezzi offerte, senza aprire volantini) ──
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('Confronta prezzi'));
    if (b) b.click();
  });
  await waitText('articoli confrontati');
  ok('apertura vista confronto', /Confronto prezzi/.test(await bodyText()));
  ok('conteggio articoli mostrato', /articoli confrontati/.test(await bodyText()));

  await setSearch('salmone');
  await waitText('Salmone');
  const txt = await bodyText();
  ok('ricerca salmone', /Salmone/.test(txt));
  ok('miglior prezzo salmone Lidl', txt.includes('Lidl') && txt.includes('7,49 €'));

  await setSearch('Lavazza');
  await waitText('Lavazza');
  ok('ricerca marca Lavazza', /Lavazza/.test(await bodyText()));

  await setSearch('zxqw');
  await waitText('Nessun articolo trovato');
  ok('nessun risultato', /Nessun articolo trovato/.test(await bodyText()));

  await setSearch('');
  await waitText('articoli confrontati');
  ok('elenco completo al reset', /articoli confrontati/.test(await bodyText()));

  // Back → catene
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('volantino-back')));
  await new Promise(r => setTimeout(r, 500));
  ok('back confronta → catene', /Confronta prezzi/.test(await bodyText()) && !/articoli confrontati/.test(await bodyText()));

  // ── Esplora (navigazione per categoria, tutte le catene) ──
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('Esplora'));
    if (b) b.click();
  });
  await waitText('volantini da');
  const browseTxt = await bodyText();
  ok('vista esplora mostra catene', /volantini da \d+ catene/.test(browseTxt));
  ok('vista esplora contiene catene note', /Lidl|Esselunga|Eurospin|Conad/.test(browseTxt));

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('volantino-back')));
  await new Promise(r => setTimeout(r, 500));
  ok('back da esplora → catene', /Confronta prezzi/.test(await bodyText()) && !/volantini da/.test(await bodyText()));

  // Chiudi modulo volantino
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('volantino-back')));
  await new Promise(r => setTimeout(r, 500));
  ok('chiusura modulo volantino', !/Confronta prezzi/.test(await bodyText()));

  // ── Lista della spesa: badge "dove costa meno" ──
  await clickBtn('Supermercato');
  await waitText('Cerca e aggiungi prodotti');
  await setPlaceholder('Cerca prodotto...', 'Salmone affumicato');
  await waitText('Salmone affumicato');
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('Salmone affumicato') && x.innerText.includes('Carne e pesce'));
    if (b) {
      b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      b.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.title === 'Aggiungi alla lista');
    if (b) b.click();
  });
  await waitText('vedi nel volantino');
  const spesa = await bodyText();
  ok('badge dove costa meno visibile', /vedi nel volantino/.test(spesa) && /€/.test(spesa) && /Pam|Eurospin|Lidl|Esselunga/.test(spesa), spesa.match(/[0-9]+,[0-9]+ € · \w+/)?.[0] ?? '');

  ok('0 richieste fallite', failed.filter(u => !u.includes('api.github.com') && !u.includes('raw.githubusercontent.com/davide-dari/chelona-test/dc-data') && !u.includes('fonts.gstatic.com')).length === 0, failed.filter(u => !u.includes('api.github.com') && !u.includes('raw.githubusercontent.com/davide-dari/chelona-test/dc-data') && !u.includes('fonts.gstatic.com')).slice(0, 3).join('\n'));
} catch (err) {
  ok('errore esecuzione', false, String(err).slice(0, 200));
}

await browser.close();

const failedR = results.filter(r => !r.pass);
console.log(`\n${results.length - failedR.length}/${results.length} OK`);
for (const r of results) console.log(`${r.pass ? '✓' : '✗'} ${r.name}${r.pass ? '' : ` — ${r.extra}`}`);
process.exit(failedR.length ? 1 : 0);
