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
console.log('nuovo profilo:', await clickText('Nuovo Profilo'));
await new Promise(r => setTimeout(r, 1200));
console.log((await page.evaluate(() => document.body.innerText)).slice(0, 900));
console.log('--- BTNS ---', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('button')].map(b => (b.textContent||'').trim().slice(0,30)).filter(Boolean))));
await browser.close();
