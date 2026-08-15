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
await clickText('Nuovo Profilo'); await wait(700);
await clickText('Inizia ora'); await wait(700);
await clickText('Configura Profilo'); await wait(700);
const inp = await page.evaluate(() => [...document.querySelectorAll('input')].map(i => i.placeholder));
inp.forEach((f, i) => { if (/nome|name/i.test(f || '')) setVal(i, 'Test'); if (/password|pass/i.test(f || '')) setVal(i, 'test123'); });
await wait(300);
await clickText('Crea Profilo'); await wait(2500);
await clickText('Casa', true); await wait(600);
await clickText('Volantino', true); await wait(4000);
// nessuna icona/collegamento esterno (doveconviene.it) nel modulo
const hasExternal = await page.evaluate(() => !!document.querySelector('[title="Apri sul sito"], .text-orange-500, a[href*="doveconviene"]'));
console.log('icona esterna presente:', hasExternal);
// apri volantino
await page.evaluate(() => {
  const cards = [...document.querySelectorAll('button')];
  const b = cards.find(x => x.querySelector('img') && /shopfully/.test(x.querySelector('img').src) && x.textContent.includes('pagine'));
  if (b) b.click();
});
await wait(3000);
// zoom inline NON più attivo: le pagine inline restano non trasformate (zoom solo in fullscreen)
const inlineZoom = await page.evaluate(async () => {
  const img = [...document.querySelectorAll('img')].find(i => /page_assets/.test(i.src));
  const el = img.parentElement;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const mk = (x, y, id) => new Touch({ identifier: id, target: el, clientX: x, clientY: y });
  const touch = (type, touches) => new TouchEvent(type, { touches, changedTouches: touches, bubbles: true, cancelable: true });
  const t1 = mk(cx - 40, cy, 1), t2 = mk(cx + 40, cy, 2);
  el.dispatchEvent(touch('touchstart', [t1, t2]));
  await new Promise(r => setTimeout(r, 30));
  const t3 = mk(cx - 120, cy, 1), t4 = mk(cx + 120, cy, 2);
  el.dispatchEvent(touch('touchmove', [t3, t4]));
  await new Promise(r => setTimeout(r, 30));
  el.dispatchEvent(touch('touchend', []));
  await new Promise(r => setTimeout(r, 100));
  return el.style.transform;
});
console.log('transform dopo pinch inline:', inlineZoom);
console.log('zoom inline assente:', !/scale\([2-4]/.test(inlineZoom));
await browser.close();
