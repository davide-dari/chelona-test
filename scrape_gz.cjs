const fs = require('fs');
const path = require('path');
const https = require('https');

const RICETTE_FILE = path.join(__dirname, 'public', 'ricette_mondo.json');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      if (res.statusCode === 301 || res.statusCode === 302) {
        return resolve(fetchUrl(res.headers.location));
      }
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseRecipe(html, url) {
  try {
    const titleMatch = html.match(/<h1 class="gz-title-recipe gz-mbot2x"[^>]*>([^<]+)<\/h1>/);
    const title = titleMatch ? titleMatch[1].trim() : null;
    if (!title) return null;

    const imgMatch = html.match(/<picture class="gz-featured-image"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/);
    const imgUrl = imgMatch ? imgMatch[1] : '';

    const catMatch = html.match(/<div class="gz-breadcrumb"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/g);
    let category = 'Piatti Unici';
    if (catMatch && catMatch.length > 1) {
      category = catMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    const ingTextMatches = [...html.matchAll(/<dd class="gz-ingredient"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>[\s\S]*?<span[^>]*>([^<]+)<\/span>/g)];
    const ingredients = ingTextMatches.map(m => `${m[1].trim()} ${m[2].trim()}`);

    const stepsMatches = [...html.matchAll(/<div class="gz-content-recipe-step"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g)];
    const steps = stepsMatches.map(m => m[1].replace(/<[^>]+>/g, '').trim());

    if (ingredients.length === 0 || steps.length === 0) return null;

    return {
      nome: title,
      categoria: category,
      ingredienti: ingredients,
      procedimento: steps,
      image: imgUrl
    };

  } catch (e) {
    return null;
  }
}

async function scrape() {
  console.log('Fetching RSS...');
  const feed = await fetchUrl('https://www.giallozafferano.it/feed');
  const links = [...feed.matchAll(/<guid>([^<]+)<\/guid>/g)].map(m => m[1]);
  console.log(`Found ${links.length} recipes in feed.`);

  let existing = [];
  try {
    existing = JSON.parse(fs.readFileSync(RICETTE_FILE, 'utf8'));
  } catch (e) {}

  const existingTitles = new Set(existing.map(r => r.nome || r.title));
  let added = 0;

  for (const link of links) {
    console.log(`Scraping: ${link}`);
    try {
      const html = await fetchUrl(link);
      const recipe = parseRecipe(html, link);
      if (recipe && !existingTitles.has(recipe.nome)) {
        existing.push(recipe);
        existingTitles.add(recipe.nome);
        added++;
        console.log(`✅ Added: ${recipe.nome}`);
      } else {
        console.log(`❌ Skipped or already exists`);
      }
    } catch (e) {
      console.log(`Error on ${link}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  fs.writeFileSync(RICETTE_FILE, JSON.stringify(existing, null, 2));
  console.log(`Done! Added ${added} new recipes.`);
}

scrape();
