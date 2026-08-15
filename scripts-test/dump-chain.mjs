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
await clickText('Nuovo Profilo'); await new Promise(r => setTimeout(r, 800));
await clickText('Inizia ora'); await new Promise(r => setTimeout(r, 800));
await clickText('Configura Profilo'); await new Promise(r => setTimeout(r, 800));
const inp = await page.evaluate(() => [...document.querySelectorAll('input')].map(i => ({ ph: i.placeholder, t: i.type })));
const setVal = (i, v) => page.evaluate((i, v) => {
  const el = document.querySelectorAll('input')[i];
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }));
}, i, v);
inp.forEach((f, i) => { if (/nome|name/i.test(f.ph || '')) setVal(i, 'Test'); if (/password|pass/i.test(f.ph || '')) setVal(i, 'test123'); });
await new Promise(r => setTimeout(r, 400));
await clickText('Crea Profilo'); await new Promise(r => setTimeout(r, 3000));
await clickLast('Casa'); await new Promise(r => setTimeout(r, 800));
await clickLast('Volantino'); await new Promise(r => setTimeout(r, 4000));
await page.type('input[placeholder*="20100"]', '20100');
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'OK'); if (b) b.click(); });
await new Promise(r => setTimeout(r, 2500));
console.log('banner:', await page.evaluate(() => { const m = document.body.innerText.match(/Volantini per ([^\n]+)/); return m ? m[1] : null; }));
console.log('catene visibili:', await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')].map(b => (b.textContent||'').trim());
  return btns.filter(t => t.length < 20 && !t.startsWith('Volantino')).slice(0, 40);
}));
await clickLast('Esselunga');
await new Promise(r => setTimeout(r, 2000));
console.log('--- CHAIN VIEW ESSELUNGA (Milano) ---');
console.log((await page.evaluate(() => document.body.innerText)).slice(0, 1200));
await browser.close();
