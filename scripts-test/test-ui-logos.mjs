import puppeteer from 'puppeteer';
const URL = process.argv[2] || 'https://localhost:4173';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--ignore-certificate-errors', '--allow-insecure-localhost'], ignoreHTTPSErrors: true });
const page = await browser.newPage();
await page.setViewport({ width: 420, height: 900 });
page.on('pageerror', e => console.log('PAGE-ERR:', e.message));
const failed = [];
page.on('requestfailed', r => { if (/openfoodfacts|raw\.github/.test(r.url())) failed.push(r.url()); });
page.on('response', r => { if (/openfoodfacts|raw\.github/.test(r.url()) && r.status() >= 400) failed.push(r.url() + ' ' + r.status()); });
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
await new Promise(r => setTimeout(r, 2500));
const clickText = (t) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')].find(x => (x.textContent||'').trim().toLowerCase().includes(t.toLowerCase()));
  if (b) { b.click(); return true; } return false;
}, t);
const clickLast = (t) => page.evaluate((t) => {
  const bs = [...document.querySelectorAll('button')].filter(x => (x.textContent||'').trim().toLowerCase().includes(t.toLowerCase()));
  const b = bs[bs.length - 1];
  if (b) { b.click(); return true; } return false;
}, t);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await clickText('Nuovo Profilo'); await wait(800);
await clickText('Inizia ora'); await wait(800);
await clickText('Configura Profilo'); await wait(800);
const inp = await page.evaluate(() => [...document.querySelectorAll('input')].map(i => ({ ph: i.placeholder, t: i.type })));
const setVal = (i, v) => page.evaluate((i, v) => {
  const el = document.querySelectorAll('input')[i];
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }));
}, i, v);
inp.forEach((f, i) => { if (/nome|name/i.test(f.ph || '')) setVal(i, 'Test'); if (/password|pass/i.test(f.ph || '')) setVal(i, 'test123'); });
await wait(400);
await clickText('Crea Profilo'); await wait(3000);
await clickLast('Casa'); await wait(800);
await clickLast('Volantino'); await wait(4000);
// chiudi modal zona con Tutta Italia
await page.evaluate(() => { const bs = [...document.querySelectorAll('button')]; const b = bs.find(x => /Tutta Italia/i.test(x.textContent || '')); if (b) b.click(); });
await wait(2500);
const t = await page.evaluate(() => document.body.innerText);
console.log('1) nome catena nella card:', t.includes('Mediaworld'));
const ofImgs = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')].filter(i => /openfoodfacts|raw\.github/.test(i.src));
  const loaded = imgs.filter(i => i.complete && i.naturalWidth > 0).length;
  return { total: imgs.length, loaded };
});
console.log('2) loghi openfoodfacts nel DOM:', JSON.stringify(ofImgs));
const urls = await page.evaluate(() => [...document.querySelectorAll('img')].filter(i => /openfoodfacts|raw\.github/.test(i.src)).map(i => i.src).slice(0, 8));
console.log('3) esempi URL:', JSON.stringify(urls, null, 1));
console.log('4) richieste fallite:', failed.length ? JSON.stringify(failed.slice(0,5)) : 'nessuna');
// controlla che in Lista Catene i loghi ci siano
await page.evaluate(() => {
  const grid = [...document.querySelectorAll('button')].filter(b => /Lista Catene/i.test(b.textContent || ''));
});
console.log('5) copertine cover rimosse (no img centrovolantini cover):', await page.evaluate(() => [...document.querySelectorAll('img')].filter(i => /cover|centrovolantini/i.test(i.src)).length));
await page.screenshot({ path: '/tmp/logos.png' });
console.log('fine');
await browser.close();
