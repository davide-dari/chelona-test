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
await clickText('Nuovo Profilo'); await new Promise(r => setTimeout(r, 800));
await clickText('Inizia ora'); await new Promise(r => setTimeout(r, 800));
await clickText('Configura Profilo'); await new Promise(r => setTimeout(r, 800));
const inp = await page.evaluate(() => [...document.querySelectorAll('input')].map(i => ({ ph: i.placeholder, t: i.type })));
console.log('INPUTS:', JSON.stringify(inp));
const setVal = (i, v) => page.evaluate((i, v) => {
  const el = document.querySelectorAll('input')[i];
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }));
}, i, v);
inp.forEach((f, i) => { if (/nome|name/i.test(f.ph || '')) setVal(i, 'Test'); if (/password|pass/i.test(f.ph || '')) setVal(i, 'test123'); });
await new Promise(r => setTimeout(r, 400));
await clickText('Crea Profilo'); await new Promise(r => setTimeout(r, 3000));
console.log((await page.evaluate(() => document.body.innerText)).slice(0, 900));
console.log('--- BTNS ---', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('button')].map(b => (b.textContent||'').trim().slice(0,28)).filter(Boolean))));
await browser.close();
