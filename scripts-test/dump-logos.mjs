import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--ignore-certificate-errors', '--allow-insecure-localhost'], ignoreHTTPSErrors: true });
const page = await browser.newPage();
await page.setViewport({ width: 420, height: 900 });
page.on('pageerror', e => console.log('PAGE-ERR:', e.message));
await page.goto(process.argv[2], { waitUntil: 'networkidle0', timeout: 60000 });
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
await page.evaluate(() => { const bs = [...document.querySelectorAll('button')]; const b = bs.find(x => /Tutta Italia/i.test(x.textContent || '')); if (b) b.click(); });
await wait(3000);
const stats = await page.evaluate(() => {
  const all = [...document.querySelectorAll('img')];
  const of = all.filter(i => /openfoodfacts|raw\.github/i.test(i.src));
  return {
    imgTotali: all.length,
    imgOF: of.length,
    diCuiCaricate: of.filter(i => i.complete && i.naturalWidth > 0).length,
    urlOF: of.slice(0, 6).map(i => i.src.replace('https://raw.githubusercontent.com/openfoodfacts/brand-images/main/xx/stores/', '')),
    srcLocali: all.filter(i => !/openfoodfacts/i.test(i.src)).map(i => i.src.split('/').pop()).slice(0, 8),
  };
});
console.log(JSON.stringify(stats, null, 1));
await page.evaluate(() => window.scrollTo(0, 800));
await wait(2500);
const stats2 = await page.evaluate(() => {
  const all = [...document.querySelectorAll('img')];
  const of = all.filter(i => /openfoodfacts|raw\.github/i.test(i.src));
  return { imgTotali: all.length, imgOF: of.length, caricate: of.filter(i => i.complete && i.naturalWidth > 0).length };
});
console.log('dopo scroll:', JSON.stringify(stats2));
await browser.close();
