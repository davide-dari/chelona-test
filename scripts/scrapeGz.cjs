const https = require('https');

// A simple fetch using node https since Cloudflare blocks some tools
const fetchHtml = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
};

const extractRecipes = (html) => {
  const recipes = [];
  const regex = /<article class="gz-card[^>]*>.*?<h2 class="gz-title"><a href="([^"]+)" title="([^"]+)">.*?<picture[^>]*>.*?<img.*?src="([^"]+)"/gs;
  let match;
  while ((match = regex.exec(html)) !== null) {
    recipes.push({ url: match[1], title: match[2], image: match[3] });
  }
  return recipes;
};

const extractRecipeDetails = (html) => {
  // Extract ingredients
  const ingredients = [];
  const ingRegex = /<dd class="gz-ingredient"><a[^>]*>(.*?)<\/a>.*?<span class="gz-name-featured-data">(.*?)<\/span>/gs;
  let match;
  while ((match = ingRegex.exec(html)) !== null) {
    ingredients.push(`${match[1].trim()} ${match[2].trim()}`);
  }

  if (ingredients.length === 0) {
    const ingRegex2 = /<dd class="gz-ingredient">.*?([^<>]+)<span class="gz-name-featured-data">(.*?)<\/span>/gs;
    while ((match = ingRegex2.exec(html)) !== null) {
      ingredients.push(`${match[1].trim()} ${match[2].trim()}`);
    }
  }

  // Extract steps
  const steps = [];
  const stepRegex = /<div class="gz-content-recipe-step">.*?<p>(.*?)<\/p>/gs;
  while ((match = stepRegex.exec(html)) !== null) {
    steps.push(match[1].replace(/<[^>]+>/g, '').trim());
  }

  return { ingredients, steps };
};

(async () => {
  console.log("Fetching categories...");
  const categories = [
    { name: "Primi Piatti", url: "https://www.giallozafferano.it/ricette-cat/Primi/" },
    { name: "Secondi Piatti", url: "https://www.giallozafferano.it/ricette-cat/Secondi-piatti/" },
    { name: "Dolci", url: "https://www.giallozafferano.it/ricette-cat/Dolci-e-Desserts/" },
    { name: "Antipasti", url: "https://www.giallozafferano.it/ricette-cat/Antipasti/" }
  ];

  const db = [];

  for (const cat of categories) {
    for (let page = 1; page <= 4; page++) {
      const pageUrl = page === 1 ? cat.url : cat.url.replace('/ricette-cat/', `/ricette-cat/page${page}/`);
      console.log("Scraping category:", cat.name, "Page:", page);
      const html = await fetchHtml(pageUrl);
      const recipesList = extractRecipes(html);

      for (const r of recipesList) {
        console.log("  Fetching recipe:", r.title);
        const rHtml = await fetchHtml(r.url);
        const details = extractRecipeDetails(rHtml);
        db.push({
          id: Buffer.from(r.url).toString('base64').substring(0, 10),
          title: r.title,
          image: r.image,
          category: cat.name,
          ingredients: details.ingredients,
          steps: details.steps
        });
      }
    }
  }

  const fs = require('fs');
  fs.writeFileSync('public/gz_recipes.json', JSON.stringify(db, null, 2));
  console.log(`Saved ${db.length} recipes to public/gz_recipes.json`);
})();
