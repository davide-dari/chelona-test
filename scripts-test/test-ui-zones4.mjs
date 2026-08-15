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
const banner = () => page.evaluate(() => { const m = document.body.innerText.match(/Volantini per ([^\n]+)/); return m ? m[1] : null; });
// click bottone griglia catene con testo esatto (senza subtitolo)
const openChainGrid = (name) => page.evaluate((name) => {
  const bs = [...document.querySelectorAll('button')].filter(x => {
    const t = (x.textContent||'').trim();
    return t === name || t === 'IP' + name || /^[A-Z]{2}/.test(t) && t.replace(/^[A-Z]{2}/,'') === name;
  });
  const b = bs[bs.length - 1];
  if (b) { b.click(); return true; } return false;
}, name);
const back = () => page.evaluate(() => { const b = document.querySelector('header button svg.lucide-arrow-left'); if (b) b.closest('button').click(); });
const chainText = async (name) => {
  await openChainGrid(name); await wait(2000);
  const t = await page.evaluate(() => document.body.innerText);
  await back(); await wait(1500);
  return t;
};
await page.type('input[placeholder*="20100"]', '20100');
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'OK'); if (b) b.click(); });
await wait(2500);
console.log('1) modal prima: aperta al primo ingresso (prima del CAP)');
console.log('2) banner Milano:', await banner());
let t = await chainText('Iper, La grande i');
console.log('3) Iper/Milano: Portello:', t.includes('Milano Portello'), '| Busnago:', t.includes('Busnago'), '| Serravalle(PIEM):', t.includes('Serravalle'), '| FESTA BIRRA(naz):', t.includes('FESTA DELLA BIRRA'));
t = await chainText('Esselunga');
console.log('4) Esselunga/Milano: Lazio:', t.includes('Esselunga Lazio'), '| Toscana:', t.includes('Esselunga Toscana'), '| Superstore(naz):', t.includes('Volantino Esselunga Superstore'));
// CAP Roma
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.getAttribute('title') === 'Zona dei volantini'); if (b) b.click(); });
await wait(900);
await page.evaluate(() => { const i = document.querySelector('input[placeholder*="20100"]'); const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(i, ''); i.dispatchEvent(new Event('input', { bubbles: true })); });
await page.type('input[placeholder*="20100"]', '00100');
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'OK'); if (b) b.click(); });
await wait(2500);
console.log('5) banner Roma:', await banner());
t = await chainText('Esselunga');
console.log('6) Esselunga/Roma: Lazio:', t.includes('Esselunga Lazio'), '| Toscana:', t.includes('Esselunga Toscana'));
t = await chainText('Iper, La grande i');
console.log('7) Iper/Roma: Portello:', t.includes('Milano Portello'), '| Speciale(naz):', /Volantino Iper(:|, la grande i(:|))?\s*$|FESTA DELLA BIRRA|SCONTI GUSTOSI/.test(t));
// CAP Sicilia (Palermo 90100) - deve mostrare Conad Sicilia e Iper Sicilia? no, Iper non c'è; eurospin sicilia si
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.getAttribute('title') === 'Zona dei volantini'); if (b) b.click(); });
await wait(900);
await page.evaluate(() => { const i = document.querySelector('input[placeholder*="20100"]'); const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(i, ''); i.dispatchEvent(new Event('input', { bubbles: true })); });
await page.type('input[placeholder*="20100"]', '90100');
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'OK'); if (b) b.click(); });
await wait(2500);
console.log('8) banner Palermo:', await banner());
t = await chainText('Conad');
console.log('9) Conad/Sicilia: Conad Sicilia:', t.includes('Conad Sicilia'), '| Conad Campania:', t.includes('Conad Campania'), '| Conad Veneto:', t.includes('Conad Veneto'), '| Conad Sardegna:', t.includes('Conad Sardegna'));
t = await chainText('Eurospin');
console.log('10) Eurospin/Sicilia: Eurospin Sicilia:', t.includes('Eurospin Sicilia'), '| Eurospin Toscana:', t.includes('Eurospin Toscana'), '| naz:', t.includes('Volantino Eurospin ') && !t.includes('Sicilia') && !t.includes('Toscana') ? 'no-context' : 'check-manuale');
// CAP non valido
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.getAttribute('title') === 'Zona dei volantini'); if (b) b.click(); });
await wait(900);
await page.evaluate(() => { const i = document.querySelector('input[placeholder*="20100"]'); const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(i, ''); i.dispatchEvent(new Event('input', { bubbles: true })); });
await page.type('input[placeholder*="20100"]', '99999');
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'OK'); if (b) b.click(); });
await wait(1500);
console.log('11) CAP 99999 → errore:', await page.evaluate(() => /CAP non valido/.test(document.body.innerText)));
console.log('fine');
await browser.close();
