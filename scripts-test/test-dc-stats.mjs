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
const searchVal = () => page.evaluate(() => document.querySelector('input[placeholder*="Cerca"]')?.value ?? '');
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
  await clickBtn('Volantino');
  await waitText('Confronta prezzi');
  await waitText('Iper e super');
  await clickBtn('Mostra tutti i volantini');

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

  // Click sul prezzo migliore → apertura volantino alla pagina dell'offerta
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent?.includes('Migliore'));
    if (b) b.click();
  });
  await waitText('Pagina 1 di');
  const of = await bodyText();
  ok('apertura volantino alla pagina offerta', /Lidl/.test(of) && /Pagina 1 di/.test(of) && /pizzica per zoomare/.test(of));

  // Back: fullscreen → volantino (resta aperto)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('volantino-back')));
  await waitText('Fine del volantino');
  ok('back dal fullscreen → volantino', /Fine del volantino/.test(await bodyText()));

  // Back: volantino → confronta prezzi (provenienza offerta, ricerca "salmone" ancora attiva)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('volantino-back')));
  await waitText('risultati per "salmone"');
  ok('back dal volantino → confronta', /risultati per "salmone"/.test(await bodyText()));

  await setSearch('Lavazza');
  await waitText('Lavazza');
  ok('ricerca marca Lavazza', /Lavazza/.test(await bodyText()));

  await setSearch('zxqw');
  await waitText('Nessun articolo trovato');
  ok('nessun risultato', /Nessun articolo trovato/.test(await bodyText()));

  await setSearch('');
  await waitText('articoli confrontati');
  const resetVal = await searchVal();
  ok('elenco completo al reset', resetVal === '' && /articoli confrontati/.test(await bodyText()), `val=${resetVal}`);

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('volantino-back')));
  await new Promise(r => setTimeout(r, 500));
  ok('back → home (evento volantino-back)', /Confronta prezzi/.test(await bodyText()) && !/articoli confrontati/.test(await bodyText()));

  // ── Barra di ricerca supermercato ──
  await setSearch('Lidl');
  await waitText('volantini per "Lidl"');
  const lidlTxt = await bodyText();
  ok('ricerca supermercato mostra risultati', /volantini per "Lidl"/.test(lidlTxt), lidlTxt.match(/volantini per "Lidl" \(in tutte le categorie\)/)?.[0] ?? '');
  ok('risultati Lidl includono volantino', /Lidl/.test(lidlTxt));

  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('Lidl') && x.innerText.includes('pagine'));
    if (b) b.click();
  });
  await waitText('Fine del volantino');
  ok('apertura volantino dalla ricerca', /Fine del volantino/.test(await bodyText()));

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('volantino-back')));
  await new Promise(r => setTimeout(r, 500));
  ok('back → home con ricerca ancora attiva', /volantini per "Lidl"/.test(await bodyText()));

  await setSearch('');
  await new Promise(r => setTimeout(r, 400));
  ok('reset ricerca supermercato', !/volantini per "Lidl"/.test(await bodyText()));

  // ── CAP specifico della città ──
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('Volantini per'));
    if (b) b.click();
  });
  await waitText('Dove fai la spesa?');
  ok('modal zona con input città e CAP', await setPlaceholder('Es. Milano', 'Milano'));
  await waitText('MI · 20121');
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('MI · 20121'));
    if (b) b.click();
  });
  await waitText(/CAP specifico milano/i);
  const capTxt = await bodyText();
  ok('chip CAP specifico per città con più CAP', /Tutta la città/.test(capTxt) && /20121/.test(capTxt));
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.innerText.trim() === '20121');
    if (b) b.click();
  });
  await waitText('Volantini per 20121 · Milano');
  ok('zona con CAP specifico applicata', /Volantini per 20121 · Milano/.test(await bodyText()));

  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('Volantini per'));
    if (b) b.click();
  });
  await waitText('Dove fai la spesa?');
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.innerText.trim() === 'Tutta la città');
    if (b) b.click();
  });
  await waitText('Volantini per Milano');
  await page.waitForFunction(() => !/Volantini per 20121/.test(document.body.innerText), { timeout: 10000 });
  ok('ritorno a tutta la città', /Volantini per Milano/.test(await bodyText()) && !/Volantini per 20121/.test(await bodyText()));

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('volantino-back')));
  await new Promise(r => setTimeout(r, 700));
  ok('back → chiusura modulo', !/Confronta prezzi/.test(await bodyText()));

  // ── Confronta prezzi: categorie Alimentari / Casa e cura ──
  await clickBtn('Volantino');
  await waitText('Confronta prezzi');
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('Confronta prezzi'));
    if (b) b.click();
  });
  await waitText('articoli confrontati');
  const catTxt = await bodyText();
  ok('categoria Alimentari mostrata', /ALIMENTARI/i.test(catTxt));
  ok('categoria Casa e cura mostrata', /Casa e cura/i.test(catTxt));
  ok('confronto su tutti i volantini', /articoli confrontati su tutti i volantini/.test(catTxt));

  // ── Freeze barra di ricerca: il focus resta nell'input dopo la digitazione ──
  const searchInputFocus = await page.evaluate(() => {
    const i = document.querySelector('input[placeholder*="Cerca un alimento"]');
    i.focus();
    const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    s.call(i, 'ton'); i.dispatchEvent(new Event('input', { bubbles: true }));
    return new Promise(res => setTimeout(() => res(document.activeElement === i), 400));
  });
  ok('focus mantenuto durante la digitazione (niente freeze)', searchInputFocus === true);

  await setSearch('salmone');
  await waitText('Salmone');
  const dopo = await bodyText();
  ok('ricerca in categoria Alimentari', /ALIMENTARI/i.test(dopo) && /Salmone/.test(dopo));

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('volantino-back')));
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('volantino-back')));
  await new Promise(r => setTimeout(r, 700));
  ok('chiusura modulo volantino', !/Confronta prezzi/.test(await bodyText()));

  // ── Lista della spesa: badge "dove costa meno" + apertura volantino ──
  await clickBtn('Supermercato');
  await waitText('Cerca e aggiungi prodotti');
  await setPlaceholder('Cerca prodotto...', 'Salmone affumicato');
  await waitText('Salmone affumicato');
  await new Promise(r => setTimeout(r, 300));
  // Il suggerimento si seleziona con mousedown
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

  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('vedi nel volantino'));
    if (b) b.click();
  });
  await waitText(/Pagina \d+ di/);
  const volOff = await bodyText();
  ok('apertura volantino dal badge lista spesa', /pizzica per zoomare/.test(volOff) && /Pagina \d+ di/.test(volOff));
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('volantino-back')));
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('volantino-back')));
  await new Promise(r => setTimeout(r, 700));
  ok('ritorno alla lista della spesa', /vedi nel volantino/.test(await bodyText()));

  ok('0 richieste fallite', failed.filter(u => !u.includes('api.github.com') && !u.includes('raw.githubusercontent.com/davide-dari/chelona-test/dc-data')).length === 0, failed.filter(u => !u.includes('api.github.com') && !u.includes('raw.githubusercontent.com/davide-dari/chelona-test/dc-data')).slice(0, 3).join('\n'));
} catch (err) {
  ok('errore esecuzione', false, String(err).slice(0, 200));
}

await browser.close();

const failedR = results.filter(r => !r.pass);
console.log(`\n${results.length - failedR.length}/${results.length} OK`);
for (const r of results) console.log(`${r.pass ? '✓' : '✗'} ${r.name}${r.pass ? '' : ` — ${r.extra}`}`);
process.exit(failedR.length ? 1 : 0);