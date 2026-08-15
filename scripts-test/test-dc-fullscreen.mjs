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
// apri volantino
await page.evaluate(() => {
  const cards = [...document.querySelectorAll('button')];
  const b = cards.find(x => x.querySelector('img') && /shopfully/.test(x.querySelector('img').src) && x.textContent.includes('pagine'));
  if (b) b.click();
});
await wait(3000);
// 1) nel volantino le pagine NON sono zoommabili (nessun touchAction none / transform)
const inline = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')].filter(i => /page_assets/.test(i.src));
  return { n: imgs.length, t: imgs[0] ? getComputedStyle(imgs[0]).touchAction : '', tr: imgs[0] ? getComputedStyle(imgs[0]).transform : '' };
});
console.log('pagine inline:', JSON.stringify(inline));
// 2) click su una pagina -> fullscreen (pagina del volantino, dietro il modale z-150: le img page_assets sono dentro il modale)
await page.evaluate(() => {
  const img = [...document.querySelectorAll('img')].find(i => /page_assets/.test(i.src) && !i.closest('.bg-black'));
  img.click();
});
await wait(1200);
const fs = await page.evaluate(() => {
  const h1 = document.querySelector('h1');
  const ps = [...document.querySelectorAll('p')].map(p => p.textContent);
  const imgs = [...document.querySelectorAll('img')].filter(i => /page_assets/.test(i.src));
  const svg = imgs[0] ? getComputedStyle(imgs[0]) : null;
  const bg = document.querySelector('.bg-black');
  return { h1: h1 && h1.textContent, sub: ps.find(p => p.startsWith('Pagina ')), nImg: imgs.length, bgBlack: !!bg, w: imgs[0] ? imgs[0].getBoundingClientRect().width : 0, h: imgs[0] ? imgs[0].getBoundingClientRect().height : 0 };
});
console.log('fullscreen:', JSON.stringify(fs));
// 3) pinch nel fullscreen -> zoom
const pinch = await page.evaluate(async () => {
  const img = document.querySelector('.bg-black img');
  const el = img.parentElement;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const mk = (x, y, id) => new Touch({ identifier: id, target: el, clientX: x, clientY: y });
  const touch = (type, touches) => new TouchEvent(type, { touches, changedTouches: touches, bubbles: true, cancelable: true });
  el.dispatchEvent(touch('touchstart', [mk(cx - 40, cy, 1), mk(cx + 40, cy, 2)]));
  await new Promise(r => setTimeout(r, 30));
  el.dispatchEvent(touch('touchmove', [mk(cx - 150, cy, 1), mk(cx + 150, cy, 2)]));
  await new Promise(r => setTimeout(r, 30));
  el.dispatchEvent(touch('touchend', []));
  await new Promise(r => setTimeout(r, 100));
  return el.style.transform;
});
console.log('pinch fullscreen:', pinch, /scale\([2-4]/.test(pinch));
// 4) back dal fullscreen -> torna al volantino
await page.evaluate(() => {
  const hdr = document.querySelector('.bg-black header');
  const b = hdr.querySelector('button');
  b.click();
});
await wait(1200);
const back1 = await page.evaluate(() => {
  const bg = document.querySelector('.bg-black');
  const h1 = document.querySelector('h1');
  const imgs = [...document.querySelectorAll('img')].filter(i => /page_assets/.test(i.src));
  return { bgBlack: !!bg, h1: h1 && h1.textContent, pages: imgs.length };
});
console.log('dopo back dal fullscreen:', JSON.stringify(back1));
// 5) back dal volantino -> home categorie (pulsante zona visibile)
await page.evaluate(() => {
  const hdrs = [...document.querySelectorAll('header')];
  const hdr = hdrs.find(h => h.querySelector('button[title="Apri a tutto schermo"]')) || hdrs[hdrs.length - 1];
  const b = hdr.querySelector('button');
  b.click();
});
await wait(1200);
const back2 = await page.evaluate(() => {
  const zona = [...document.querySelectorAll('button')].find(x => x.title === 'Zona dei volantini');
  const tabs = [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => ['Iper e super','Discount'].includes(t));
  const maximize = !!document.querySelector('button[title="Apri a tutto schermo"]');
  return { zonaOpen: !!zona, tabs: tabs.length, stillFlyer: maximize };
});
console.log('dopo back dal volantino (home):', JSON.stringify(back2));
await browser.close();
