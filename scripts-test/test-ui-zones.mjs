import puppeteer from 'puppeteer';
const URL = process.argv[2] || 'https://localhost:4173';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--ignore-certificate-errors', '--allow-insecure-localhost'], ignoreHTTPSErrors: true });
const page = await browser.newPage();
await page.setViewport({ width: 420, height: 900 });
page.on('pageerror', e => console.log('PAGE-ERR:', e.message));
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
const clickExact = (t) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')].find(x => (x.textContent||'').trim() === t);
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
console.log('submenu aperto:', await page.evaluate(() => !!document.body.innerText.match(/Confronta le offerte/)));
await clickLast('Volantino'); await new Promise(r => setTimeout(r, 4000));
const modal = await page.evaluate(() => !!document.body.innerText.match(/Dove fai la spesa/));
console.log('1) modal zona presente:', modal);
if (modal) {
  await page.type('input[placeholder*="20100"]', '20100');
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'OK');
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  const banner = await page.evaluate(() => { const m = document.body.innerText.match(/Volantini per ([^\n]+)/); return m ? m[1] : null; });
  console.log('2) banner zona:', banner);
  const list = await page.evaluate(() => document.body.innerText);
  console.log('3) mostra Iper Milano Portello (Lombardia):', list.includes('Milano Portello'));
  console.log('4) nasconde Esselunga Lazio:', !list.includes('Esselunga Lazio'));
  console.log('5) nasconde Eurospin Sicilia:', !list.includes('Eurospin Sicilia'));
  console.log('6) nasconde Conad Sicilia:', !list.includes('Conad Sicilia'));
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.getAttribute('title') === 'Zona dei volantini');
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 900));
  console.log('7) riapertura modal:', await page.evaluate(() => !!document.body.innerText.match(/Dove fai la spesa/)));
  await page.evaluate(() => { const i = document.querySelector('input[placeholder*="20100"]'); const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(i, ''); i.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.type('input[placeholder*="20100"]', '00100');
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'OK');
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  const list2 = await page.evaluate(() => document.body.innerText);
  const banner2 = await page.evaluate(() => { const m = document.body.innerText.match(/Volantini per ([^\n]+)/); return m ? m[1] : null; });
  console.log('8) CAP 00100 → banner:', banner2);
  console.log('9) mostra Roma e Lazio:', list2.includes('Roma e Lazio'));
  console.log('10) nasconde MD Lombardia:', !list2.includes('MD Lombardia'));
  console.log('11) nasconde Iper Milano Portello:', !list2.includes('Milano Portello'));
}
await page.screenshot({ path: '/tmp/zones.png' });
console.log('screenshot salvato');
await browser.close();
