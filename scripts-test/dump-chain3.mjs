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
await page.type('input[placeholder*="20100"]', '20100');
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'OK'); if (b) b.click(); });
await wait(2500);
const iper = await page.evaluate(() => {
  const bs = [...document.querySelectorAll('button')];
  const withIper = bs.map((b, i) => ({ i, t: (b.textContent||'').trim().slice(0, 40) })).filter(x => /la grande i/i.test(x.t));
  return JSON.stringify(withIper);
});
console.log('bottoni Iper:', iper);
const t0 = await page.evaluate(() => document.body.innerText);
console.log('Lista Catene riga:', (t0.match(/Lista Catene[^\n]*\n[^\n]*/) || [''])[0].slice(0, 80));
await page.evaluate(() => {
  const bs = [...document.querySelectorAll('button')];
  // ultimo bottone che finisce esattamente con "Iper, La grande i" (griglia, senza subtitolo)
  const b = bs.filter(x => (x.textContent||'').trim() === 'IP' + 'Iper, La grande i' || (x.textContent||'').trim() === 'Iper, La grande i');
  if (b.length) b[b.length-1].click();
});
await wait(2000);
console.log('--- CHAIN VIEW IPER (Milano) ---');
console.log((await page.evaluate(() => document.body.innerText)).slice(0, 1800));
await browser.close();
