import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--ignore-certificate-errors', '--allow-insecure-localhost'], ignoreHTTPSErrors: true });
const page = await browser.newPage();
await page.setViewport({ width: 420, height: 900 });
page.on('pageerror', e => console.log('PAGE-ERR:', e.message));
await page.goto('https://localhost:4173', { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
await new Promise(r => setTimeout(r, 2500));
const clickText = (t, last = false) => page.evaluate((t, last) => {
  const bs = [...document.querySelectorAll('button')].filter(x => (x.textContent || '').trim().toLowerCase().includes(t.toLowerCase()));
  const b = last ? bs[bs.length - 1] : bs[0];
  if (b) { b.click(); return true; } return false;
}, t, last);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const setVal = (i, v) => page.evaluate((i, v) => {
  const el = document.querySelectorAll('input')[i];
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }));
}, i, v);
const checks = [];
const check = (n, ok, extra = '') => { checks.push([n, ok, extra]); console.log(`${checks.length}) ${n}: ${ok}${extra ? ' ' + extra : ''}`); };
await clickText('Nuovo Profilo'); await wait(800);
await clickText('Inizia ora'); await wait(800);
await clickText('Configura Profilo'); await wait(800);
const inp = await page.evaluate(() => [...document.querySelectorAll('input')].map(i => ({ ph: i.placeholder, t: i.type })));
inp.forEach((f, i) => { if (/nome|name/i.test(f.ph || '')) setVal(i, 'Test'); if (/password|pass/i.test(f.ph || '')) setVal(i, 'test123'); });
await wait(400);
await clickText('Crea Profilo'); await wait(3000);
await clickText('Casa', true); await wait(800);
await clickText('Volantino', true); await wait(4000);

// 1) campo città nella modal zona
const hasCity = await page.evaluate(() => !!document.querySelector('input[placeholder="Es. Milano"]'));
check('campo città presente', hasCity);
// 2) suggerimenti Milano
await page.evaluate(() => {
  const el = document.querySelector('input[placeholder="Es. Milano"]');
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  s.call(el, 'Mila'); el.dispatchEvent(new Event('input', { bubbles: true }));
});
await wait(700);
const sugg = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => (b.textContent || '').trim()).filter(t => /MilanoMI|Milano ·/.test(t)));
check('suggerimenti città (Milano)', sugg.length > 0, JSON.stringify(sugg.slice(0, 3)));
// 3) seleziona Milano
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /20121/.test(x.textContent || ''));
  if (b) b.click();
});
await wait(2500);
// 4) tabs categorie
const tabs = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => (b.textContent || '').trim()).filter(t => ['Iper e super','Discount','Elettronica','Cura casa e corpo','Bricolage'].includes(t)));
check('tabs categorie', tabs.length >= 5, JSON.stringify(tabs.slice(0, 6)));
// 5) volantini Milano iper-e-super
await page.evaluate(() => { const sc = document.querySelector('.overflow-y-auto'); if (sc) sc.scrollTop = 500; });
await wait(1500);
const milano = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('button')].filter(b => b.textContent && /pagine/.test(b.textContent) && !/volantino|pagina/i.test(b.textContent) && /Pagine|pagine/.test(b.textContent) === false);
  const covers = [...document.querySelectorAll('img')].filter(i => /shopfully/.test(i.src) && /volantini/.test(i.src));
  const loaded = covers.filter(i => i.complete && i.naturalWidth > 0).length;
  const banner = [...document.querySelectorAll('p')].map(p => p.textContent).find(t => t && t.startsWith('Volantini per'));
  return { covers: covers.length, loaded, banner };
});
check('volantini Milano (cover shopfully)', milano.covers > 10, JSON.stringify({ cover: milano.covers, loaded: milano.loaded, banner: milano.banner }));
// 6) apri il primo volantino
await page.evaluate(() => {
  const sc = document.querySelector('.overflow-y-auto');
  if (sc) sc.scrollTop = 0;
});
await wait(600);
await page.evaluate(() => {
  const cards = [...document.querySelectorAll('button')];
  const b = cards.find(x => x.querySelector('img') && /shopfully/.test(x.querySelector('img').src) && x.textContent.includes('pagine'));
  if (b) b.click();
});
await wait(3000);
const viewer = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')].filter(i => /page_assets/.test(i.src));
  const loaded = imgs.filter(i => i.complete && i.naturalWidth > 0).length;
  return { total: imgs.length, loaded };
});
check('viewer pagine volantino', viewer.total > 0 && viewer.loaded > 0, JSON.stringify(viewer));
// 7) richieste fallite
const failed = await page.evaluate(() => performance.getEntriesByType('resource').filter(r => r.responseStatus >= 400).map(r => r.name.split('/').pop()).slice(0, 6));
check('richieste fallite', failed.length === 0, JSON.stringify(failed));
await browser.close();
