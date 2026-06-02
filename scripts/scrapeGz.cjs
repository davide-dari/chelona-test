const https = require('https');
const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const fetchHtml = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
};

(async () => {
  console.log("Fetching categories...");
  const categories = [
    { name: "Primi", url: "https://www.giallozafferano.it/ricette-cat/Primi/" },
    { name: "Secondi", url: "https://www.giallozafferano.it/ricette-cat/Secondi-piatti/" },
    { name: "Dolci", url: "https://www.giallozafferano.it/ricette-cat/Dolci-e-Desserts/" },
    { name: "Antipasti", url: "https://www.giallozafferano.it/ricette-cat/Antipasti/" }
  ];

  const db = [];

  for (const cat of categories) {
    console.log("Scraping category:", cat.name);
    const html = await fetchHtml(cat.url);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    // gz-card-recipe or gz-card
    const cards = doc.querySelectorAll('.gz-card');
    const recipesList = Array.from(cards).slice(0, 15).map(card => {
      const a = card.querySelector('.gz-title a');
      const img = card.querySelector('picture img');
      return {
        url: a ? a.href : null,
        title: a ? a.textContent.trim() : '',
        image: img ? img.getAttribute('src') || img.getAttribute('data-src') : ''
      };
    }).filter(r => r.url);

    for (const r of recipesList) {
      console.log("  Fetching recipe:", r.title);
      const rHtml = await fetchHtml(r.url);
      const rDom = new JSDOM(rHtml);
      const rDoc = rDom.window.document;
      
      const ingredients = Array.from(rDoc.querySelectorAll('.gz-ingredient')).map(el => {
         return el.textContent.trim().replace(/\s+/g, ' ');
      });
      
      const steps = Array.from(rDoc.querySelectorAll('.gz-content-recipe-step p')).map(el => {
         return el.textContent.trim();
      });

      if(ingredients.length > 0 && steps.length > 0) {
        db.push({
          id: Buffer.from(r.url).toString('base64').substring(0, 10),
          title: r.title,
          image: r.image,
          category: cat.name,
          ingredients: ingredients,
          steps: steps
        });
      }
    }
  }

  fs.writeFileSync('public/gz_recipes.json', JSON.stringify(db, null, 2));
  console.log(`Saved ${db.length} recipes to public/gz_recipes.json`);
})();
