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
const setCap = async (cap) => {
  const open = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.getAttribute('title') === 'Zona dei volantini'); if (b) b.click(); return true; });
  await new Promise(r => setTimeout(r, 900));
  await page.evaluate(() => { const i = document.querySelector('input[placeholder*="20100"]'); const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(i, ''); i.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.type('input[placeholder*="20100"]', cap);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'OK'); if (b) b.click(); });
  await new Promise(r => setTimeout(r, 2000));
};
const inChain = async (chain) => {
  await clickLast(chain);
  await new Promise(r => setTimeout(r, 1500));
  const t = await page.evaluate(() => document.body.innerText);
  const found = t.slice(0, 2500);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.getAttribute('title') === 'Zona dei volantini'); });
  // torna indietro alla home del volantino
  await page.evaluate(() => { const b = [...document.querySelectorAll('header button')].find(x => x.querySelector('svg.lucide-arrow-left')); if (b) b.click(); });
  await new Promise(r => setTimeout(r, 1200));
  return found;
};
// CAP Milano
await page.type('input[placeholder*="20100"]', '20100');
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'OK'); if (b) b.click(); });
await new Promise(r => setTimeout(r, 2000));
const banner = await page.evaluate(() => { const m = document.body.innerText.match(/Volantini per ([^\n]+)/); return m ? m[1] : null; });
console.log('1) banner Milano:', banner);
// esselunga: deve avere solo Lazio? no - con Milano deve avere i volantini nazionali e NON Esselunga Lazio/Toscana/Piemonte/Emilia
const essLomb = await inChain('Esselunga');
console.log('2) Esselunga con Milano: ha Lazio:', essLomb.includes('Esselunga Lazio'), '| ha Toscana:', essLomb.includes('Esselunga Toscana'), '| ha Piemonte:', essLomb.includes('Esselunga Piemonte'));
console.log('   Esselunga count volantini:', (essLomb.match(/Volantino Esselunga/g) || []).length);
// iper: deve avere Milano Portello e Busnago
const iper = await inChain('Iper');
console.log('3) Iper con Milano: ha Milano Portello:', iper.includes('Milano Portello'), '| ha Busnago:', iper.includes('Busnago'));
// passa a CAP Roma
await setCap('00100');
console.log('4) banner Roma:', await page.evaluate(() => { const m = document.body.innerText.match(/Volantini per ([^\n]+)/); return m ? m[1] : null; }));
const essRoma = await inChain('Esselunga');
console.log('5) Esselunga con Roma: ha Lazio:', essRoma.includes('Esselunga Lazio'), '| ha Toscana:', essRoma.includes('Esselunga Toscana'));
const iperRoma = await inChain('Iper');
console.log('6) Iper con Roma: ha Milano Portello:', iperRoma.includes('Milano Portello'));
// tutta italia: tutto visibile
await setCap(''); // non valido per test; uso il link tutta italia
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.getAttribute('title') === 'Zona dei volantini'); if (b) b.click(); });
await new Promise(r => setTimeout(r, 900));
await page.evaluate(() => { const bs = [...document.querySelectorAll('button')]; const b = bs.find(x => /Tutta Italia/i.test(x.textContent || '')); if (b) b.click(); });
await new Promise(r => setTimeout(r, 2000));
const all = await page.evaluate(() => document.body.innerText);
console.log('7) Tutta Italia: banner zona assente:', !/Volantini per/.test(all), '| header "Tutta Italia":', all.includes('Tutta Italia'));
console.log('   Tutta Italia: ha Esselunga Toscana:', all.includes('Esselunga Toscana'));
await page.screenshot({ path: '/tmp/zones2.png' });
console.log('fine');
await browser.close();
