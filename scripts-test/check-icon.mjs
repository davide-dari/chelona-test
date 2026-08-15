import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--ignore-certificate-errors', '--allow-insecure-localhost'], ignoreHTTPSErrors: true });
const page = await browser.newPage();
await page.setViewport({ width: 420, height: 900 });
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
await page.evaluate(() => {
  const cards = [...document.querySelectorAll('button')];
  const b = cards.find(x => x.querySelector('img') && /shopfully/.test(x.querySelector('img').src) && x.textContent.includes('pagine'));
  if (b) b.click();
});
await wait(3000);
const inFlyer = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const titles = [...document.querySelectorAll('[title]')].map(t => t.title);
  const svgExt = [...document.querySelectorAll('svg')].filter(s => {
    const u = s.querySelector('path');
    return u && u.outerHTML.includes('M15 3h6v6') && /A2 2/.test(u.outerHTML);
  }).length;
  return { titles, svgExt };
});
console.log('titles nel viewer:', JSON.stringify(inFlyer.titles));
console.log('icone external-link nel viewer:', inFlyer.svgExt);
const siteRef = await page.evaluate(() => {
  const html = document.body.innerHTML;
  return { hasUrl: html.includes('doveconviene.it'), hasApri: html.includes('Apri sul sito') };
});
console.log('riferimenti sito nel DOM:', JSON.stringify(siteRef));
await browser.close();
