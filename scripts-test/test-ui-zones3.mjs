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
const setCap = async (cap) => {
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.getAttribute('title') === 'Zona dei volantini'); if (b) b.click(); });
  await wait(900);
  await page.evaluate(() => { const i = document.querySelector('input[placeholder*="20100"]'); const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(i, ''); i.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.type('input[placeholder*="20100"]', cap);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'OK'); if (b) b.click(); });
  await wait(2500);
};
const back = () => page.evaluate(() => { const b = document.querySelector('header button svg.lucide-arrow-left'); if (b) b.closest('button').click(); });
// clicca il bottone catena nella griglia (testo corto, senza subtitolo offerte)
const chainText = async (name) => {
  const ok = await page.evaluate((name) => {
    const bs = [...document.querySelectorAll('button')].filter(x => {
      const t = (x.textContent||'').trim();
      return t.includes(name) && t.length < 30;
    });
    const b = bs[bs.length - 1];
    if (b) { b.click(); return true; }
    return false;
  }, name);
  await wait(2000);
  const t = await page.evaluate(() => document.body.innerText);
  await back(); await wait(1500);
  return { ok, t };
};
const gridChains = async () => page.evaluate(() => {
  const t = document.body.innerText;
  const m = t.match(/Lista Catene\s*\n?\s*(\d+)\s*insegne/);
  return m ? m[1] : '?';
});
const banner = () => page.evaluate(() => { const m = document.body.innerText.match(/Volantini per ([^\n]+)/); return m ? m[1] : null; });
await page.type('input[placeholder*="20100"]', '20100');
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'OK'); if (b) b.click(); });
await wait(2500);
console.log('1) banner Milano:', await banner());
console.log('2) insegne Milano:', await gridChains());
let r = await chainText('Esselunga');
console.log('3) Esselunga/Milano: Lazio:', r.t.includes('Esselunga Lazio'), '| Toscana:', r.t.includes('Esselunga Toscana'), '| Superstore(naz):', r.t.includes('Volantino Esselunga Superstore'));
r = await chainText('Iper, La grande i');
console.log('4) Iper/Milano: Milano Portello:', r.t.includes('Milano Portello'), '| Busnago:', r.t.includes('Busnago'), '| Serravalle:', r.t.includes('Serravalle'), '| Speciale(naz):', r.t.includes('Volantino Iper: Speciale') || r.t.includes('Volantino Iper, la grande i: Speciale'));
r = await chainText('MD Discount');
console.log('4b) MD/Milano: MD Lombardia:', r.t.includes('MD Lombardia'), '| nazionale:', r.t.includes('Volantino MD Discount'));
await setCap('00100');
console.log('5) banner Roma:', await banner());
console.log('6) insegne Roma:', await gridChains());
r = await chainText('Esselunga');
console.log('7) Esselunga/Roma: Lazio:', r.t.includes('Esselunga Lazio'), '| Toscana:', r.t.includes('Esselunga Toscana'));
r = await chainText('Iper, La grande i');
console.log('8) Iper/Roma: Milano Portello:', r.t.includes('Milano Portello'), '| nazionale:', /Volantino Iper/.test(r.t));
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.getAttribute('title') === 'Zona dei volantini'); if (b) b.click(); });
await wait(900);
await page.evaluate(() => { const bs = [...document.querySelectorAll('button')]; const b = bs.find(x => /Tutta Italia/i.test(x.textContent || '')); if (b) b.click(); });
await wait(2500);
const all = await page.evaluate(() => document.body.innerText);
console.log('9) Tutta Italia: banner assente:', !/Volantini per/.test(all), '| insegne:', (all.match(/Lista Catene\s*\n?\s*(\d+)\s*insegne/) || [])[1]);
r = await chainText('Iper, La grande i');
console.log('10) Iper/Tutta Italia: Milano Portello:', r.t.includes('Milano Portello'), '| Serravalle:', r.t.includes('Serravalle'));
console.log('11) header Tutta Italia:', all.includes('Tutta Italia'));
await page.screenshot({ path: '/tmp/zones3.png' });
console.log('fine');
await browser.close();
