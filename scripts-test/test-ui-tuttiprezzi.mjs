import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--ignore-certificate-errors', '--allow-insecure-localhost'], ignoreHTTPSErrors: true });
const page = await browser.newPage();
await page.setViewport({ width: 420, height: 900 });
page.on('pageerror', e => console.log('PAGE-ERR:', e.message));
const failed = [];
page.on('requestfailed', r => { if (/tuttiprezzi/.test(r.url())) failed.push(r.url()); });
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

await clickText('Nuovo Profilo'); await wait(800);
await clickText('Inizia ora'); await wait(800);
await clickText('Configura Profilo'); await wait(800);
const inp = await page.evaluate(() => [...document.querySelectorAll('input')].map(i => ({ ph: i.placeholder, t: i.type })));
inp.forEach((f, i) => { if (/nome|name/i.test(f.ph || '')) setVal(i, 'Test'); if (/password|pass/i.test(f.ph || '')) setVal(i, 'test123'); });
await wait(400);
await clickText('Crea Profilo'); await wait(3000);
await clickText('Casa', true); await wait(800);
await clickText('Volantino', true); await wait(3000);

// ═══ 1) Modal zona: campo città con autocomplete ═══
const cityOk = await page.evaluate(() => {
  const inputs = [...document.querySelectorAll('input')];
  const city = inputs.find(i => (i.placeholder || '').includes('Milano'));
  return !!city;
});
console.log('1) campo città presente:', cityOk);

// digita "Mila" nel campo città
await page.evaluate(() => {
  const inputs = [...document.querySelectorAll('input')];
  const city = inputs.find(i => (i.placeholder || '').includes('Milano'));
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  s.call(city, 'Mila'); city.dispatchEvent(new Event('input', { bubbles: true }));
});
await wait(700);
const sugg = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  return btns.filter(b => /^MilanoMI ·/.test((b.textContent || '').trim())).slice(0, 2).map(b => b.textContent.trim());
});
console.log('2) suggerimenti città (Milano MI):', JSON.stringify(sugg.slice(0, 2)));

// seleziona Milano → si applica la zona
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const b = btns.find(x => /^Milano\s*MI ·/.test((x.textContent || '').trim()));
  if (b) b.click();
});
await wait(1500);
const zoneLabel = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const b = btns.find(x => /Volantini per/.test(x.textContent || ''));
  return b ? b.textContent.trim() : null;
});
console.log('3) zona applicata (banner):', zoneLabel);

// ═══ 2) Sezione "Più marchi" con tabs categoria ═══
await clickText('Lista Catene'); // scroll giù per far vedere la sezione
await wait(500);
await page.evaluate(() => window.scrollTo(0, 2000));
await wait(800);
const tpSection = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const cat = btns.filter(b => ['Ipermercati', 'Supermercati', 'Discount', 'Tecnologia', 'Bricolage'].includes((b.textContent || '').trim()));
  const img = [...document.querySelectorAll('img')].filter(i => /tuttiprezzi/.test(i.src)).length;
  return { catTabs: cat.length, tpImg: img };
});
console.log('4) tabs categorie:', JSON.stringify(tpSection));

// clicca su un tab categoria "Tecnologia"
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const b = btns.find(x => (x.textContent || '').trim() === 'Tecnologia');
  if (b) b.click();
});
await wait(1200);
const techShops = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')].filter(i => /tuttiprezzi/.test(i.src));
  return { count: imgs.length, loaded: imgs.filter(i => i.complete && i.naturalWidth > 0).length };
});
console.log('5) negozi tecnologia (img tuttiprezzi):', JSON.stringify(techShops));

// ═══ 3) Apri un negozio e un volantino TP (viewer immagini) ═══
// click sul bottone Mediaworld DELLA SEZIONE TP (contiene img tuttiprezzi)
await page.evaluate(() => {
  const sc = document.querySelector('.overflow-y-auto');
  if (sc) sc.scrollTop = 5000;
});
await wait(800);
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const b = btns.find(x => (x.textContent || '').trim() === 'Tecnologia');
  if (b) b.click();
});
await wait(1200);
await page.evaluate(() => {
  const sc = document.querySelector('.overflow-y-auto');
  if (sc) sc.scrollTop = 5000;
});
await wait(1200);
const shopBtn = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const b = btns.find(x => /Mediaworld/.test(x.textContent || '') && (x.querySelector('img')?.src || '').includes('tuttiprezzi'));
  if (b) { b.click(); return b.textContent.trim(); }
  return null;
});
console.log('6) negozio aperto (sezione TP):', shopBtn);
await wait(1500);
const chain = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  return btns.filter(b => /pagine/.test(b.textContent || '')).length;
});
console.log('7) volantini nel negozio (con "pagine"):', chain);
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const b = btns.find(x => /pagine/.test(x.textContent || ''));
  if (b) b.click();
});
await wait(2500);
const viewer = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')].filter(i => /p_Page_/.test(i.src));
  return { pages: imgs.length, loaded: imgs.filter(i => i.complete && i.naturalWidth > 0).length, first: imgs[0] ? imgs[0].src.split('/').pop() : null };
});
console.log('8) viewer immagini:', JSON.stringify(viewer));
await page.screenshot({ path: '/tmp/tp-viewer.png' });
console.log('9) richieste fallite tuttiprezzi:', failed.length ? failed.slice(0, 5) : 'nessuna');
console.log('fine');
await browser.close();
