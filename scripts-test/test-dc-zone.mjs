import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--ignore-certificate-errors', '--allow-insecure-localhost'], ignoreHTTPSErrors: true });
const page = await browser.newPage();
await page.setViewport({ width: 420, height: 900 });
await page.goto('https://localhost:4173', { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
await new Promise(r => setTimeout(r, 2000));
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
await clickText('Nuovo Profilo'); await wait(600);
await clickText('Inizia ora'); await wait(600);
await clickText('Configura Profilo'); await wait(600);
const inp = await page.evaluate(() => [...document.querySelectorAll('input')].map(i => i.placeholder));
inp.forEach((f, i) => { if (/nome|name/i.test(f || '')) setVal(i, 'Test'); if (/password|pass/i.test(f || '')) setVal(i, 'test123'); });
await wait(300);
await clickText('Crea Profilo'); await wait(2500);
await clickText('Casa', true); await wait(600);
await clickText('Volantino', true); await wait(4000);
// città piccola: Borgosesia (VC) — comune NON nelle 524, fallback capoluogo Vercelli (non in 524? verifichiamo) — uso una città piccola delle 524: "Abano Terme"? meglio testare comune piccolo che mappa al capoluogo: Fara Gera d'Adda (BG) -> Bergamo
await page.evaluate(() => {
  const el = document.querySelector('input[placeholder="Es. Milano"]');
  const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  s.call(el, 'Fara Gera d'); el.dispatchEvent(new Event('input', { bubbles: true }));
});
await wait(700);
const sugg = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => (b.textContent || '').trim()).filter(t => /Fara/.test(t)));
console.log('sugg Fara:', sugg.length > 0 ? JSON.stringify(sugg[0]) : 'NESSUNO');
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Fara Gera/.test(x.textContent || ''));
  if (b) b.click();
});
await wait(2500);
const st = await page.evaluate(() => {
  const banner = [...document.querySelectorAll('p')].map(p => p.textContent).find(t => t && t.startsWith('Volantini per'));
  const covers = [...document.querySelectorAll('img')].filter(i => /volantini/.test(i.src) && /shopfully/.test(i.src)).length;
  return { banner, covers };
});
console.log('zona Fara ->', JSON.stringify(st));
// tutta italia
await page.evaluate(() => {
  const pin = [...document.querySelectorAll('button')].find(x => x.title === 'Zona dei volantini');
  if (pin) pin.click();
});
await wait(800);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /tutti i volantini/.test(x.textContent || ''));
  if (b) b.click();
});
await wait(2500);
const naz = await page.evaluate(() => {
  const banner = [...document.querySelectorAll('p')].map(p => p.textContent).find(t => t && t.startsWith('Volantini per'));
  const covers = [...document.querySelectorAll('img')].filter(i => /volantini/.test(i.src) && /shopfully/.test(i.src)).length;
  return { banner, covers };
});
console.log('tutta italia ->', JSON.stringify(naz));
await browser.close();
