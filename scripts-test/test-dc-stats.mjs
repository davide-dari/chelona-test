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
  const i = document.querySelector('input[placeholder*="Cerca un alimento"]');
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  s.call(i, v); i.dispatchEvent(new Event('input', { bubbles: true }));
}, v);

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
  await clickBtn('Volantino');
  await waitText('Confronta prezzi');

  // ── Home volantini (dovecovene): categorie + volantini ──
  await waitText('Iper e super');
  const homeTxt = await bodyText();
  ok('home volantini: categoria Iper e super', /Iper e super/.test(homeTxt));
  ok('home volantini: pulsanti principali', /Confronta prezzi/.test(homeTxt) && /Esplora/.test(homeTxt) && /Catene volantini/.test(homeTxt));

  // chiudi eventuale modal zona
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('Mostra tutti i volantini')); if (b) b.click(); });
  await new Promise(r => setTimeout(r, 500));

  // ── Confronta prezzi: prezzi + apertura volantino (fallback) ──
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('Confronta prezzi')); if (b) b.click(); });
  await waitText('articoli confrontati');
  ok('apertura vista confronto', /Confronto prezzi/.test(await bodyText()));
  ok('conteggio articoli mostrato', /articoli confrontati/.test(await bodyText()));

  await setSearch('salmone');
  await waitText('Salmone');
  const txt = await bodyText();
  ok('ricerca salmone', /Salmone/.test(txt));
  ok('miglior prezzo salmone Lidl', txt.includes('Lidl') && txt.includes('7,49 €'));

  // Click sul prezzo migliore → apre il volantino (fallback al volantino corrente)
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent?.includes('Migliore')); if (b) b.click(); });
  await waitText('pizzica per zoomare');
  const ofBest = await bodyText();
  ok('confronta prezzi apre il volantino', /pizzica per zoomare/.test(ofBest) && /Pagina \d+ di/.test(ofBest));

  // back: fullscreen → volantino → confronta
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('volantino-back')));
  await waitText('Fine del volantino');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('volantino-back')));
  await waitText('risultati per "salmone"');
  ok('back dal volantino → confronta', /risultati per "salmone"/.test(await bodyText()));

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('volantino-back')));
  await new Promise(r => setTimeout(r, 500));
  ok('back → home', /Confronta prezzi/.test(await bodyText()) && !/articoli confrontati/.test(await bodyText()));

  // ── Catene volantini (CentroVolantini, secondario) ──
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('Catene volantini')); if (b) b.click(); });
  await waitText('Mediaworld');
  const centroTxt = await bodyText();
  ok('vista catene CentroVolantini', /Mediaworld/.test(centroTxt) && /Lidl/.test(centroTxt) && /Esselunga/.test(centroTxt));

  // Apri una catena (Lidl) → elenco volantini
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Lidl/.test(x.innerText) && /volantin/i.test(x.innerText) && !/Esplora/.test(x.innerText)); if (b) b.click(); });
  await waitText('Tutte le catene');
  ok('vista catena: volantini elencati', /volantin/i.test(await bodyText()) && /Lidl/.test(await bodyText()));

  // back: catena → catene → home
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('volantino-back')));
  await waitText('Mediaworld');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('volantino-back')));
  await waitText('Iper e super');
  await page.waitForFunction(() => !/volantini via CentroVolantini/.test(document.body.innerText), { timeout: 10000 }).catch(() => {});
  ok('back catene → home', /Iper e super/.test(await bodyText()) && !/volantini via CentroVolantini/.test(await bodyText()));

  // ── Lista della spesa: badge "dove costa meno" ──
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('volantino-back')));
  await new Promise(r => setTimeout(r, 500));
  await clickBtn('Supermercato');
  await waitText('Cerca e aggiungi prodotti');
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('input')].find(i => i.placeholder === 'Cerca prodotto...');
    if (!el) return;
    const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    s.call(el, 'Salmone affumicato'); el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await waitText('Salmone affumicato');
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('Salmone affumicato') && x.innerText.includes('Carne e pesce'));
    if (b) { b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); b.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); b.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.title === 'Aggiungi alla lista'); if (b) b.click(); });
  await waitText('vedi nel volantino');
  const spesa = await bodyText();
  ok('badge dove costa meno visibile', /vedi nel volantino/.test(spesa) && /€/.test(spesa) && /Pam|Eurospin|Lidl|Esselunga/.test(spesa), spesa.match(/[0-9]+,[0-9]+ € · \w+/)?.[0] ?? '');

  // ── Chelona (assistente AI locale) ──
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('volantino-back')));
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.title?.includes('Chelona')); if (b) b.click(); });
  await waitText('Scarica il modello');
  const chelonaTxt = await bodyText();
  ok('Chelona: chat aperta con download modello', /Scarica il modello/.test(chelonaTxt) && /AI locale/.test(chelonaTxt));
  ok('Chelona: funziona offline (nessuna API)', /senza internet|offline|locale/.test(chelonaTxt));

  ok('0 richieste fallite', failed.filter(u => !u.includes('api.github.com') && !u.includes('raw.githubusercontent.com/davide-dari/chelona-test/dc-data') && !u.includes('fonts.gstatic.com')).length === 0, failed.filter(u => !u.includes('api.github.com') && !u.includes('raw.githubusercontent.com/davide-dari/chelona-test/dc-data') && !u.includes('fonts.gstatic.com')).slice(0, 3).join('\n'));
} catch (err) {
  ok('errore esecuzione', false, String(err).slice(0, 200));
}

await browser.close();

const failedR = results.filter(r => !r.pass);
console.log(`\n${results.length - failedR.length}/${results.length} OK`);
for (const r of results) console.log(`${r.pass ? '✓' : '✗'} ${r.name}${r.pass ? '' : ` — ${r.extra}`}`);
process.exit(failedR.length ? 1 : 0);
