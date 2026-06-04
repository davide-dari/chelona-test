const fs = require('fs');
const https = require('https');
const http = require('http');

// --- CONFIG ---
// Main categories + all their subcategories for maximum coverage
const CATEGORY_URLS = {
  'Antipasti': [
    'https://www.giallozafferano.it/ricette-cat/Antipasti/',
    'https://www.giallozafferano.it/ricette-cat/Antipasti/Verdura/',
    'https://www.giallozafferano.it/ricette-cat/Antipasti/Pesce/',
    'https://www.giallozafferano.it/ricette-cat/Antipasti/Sfiziosi/',
    'https://www.giallozafferano.it/ricette-cat/Antipasti/benessere/',
    'https://www.giallozafferano.it/ricette-cat/Antipasti/facili-e-veloci/',
    'https://www.giallozafferano.it/ricette-cat/Contorni/',
    'https://www.giallozafferano.it/ricette-cat/Insalate/',
    'https://www.giallozafferano.it/ricette-cat/Torte-salate/',
  ],
  'Primi': [
    'https://www.giallozafferano.it/ricette-cat/Primi/',
    'https://www.giallozafferano.it/ricette-cat/Primi/pasta/',
    'https://www.giallozafferano.it/ricette-cat/Primi/Pasta-fresca/',
    'https://www.giallozafferano.it/ricette-cat/Primi/Gnocchi/',
    'https://www.giallozafferano.it/ricette-cat/Primi/riso-cereali/',
    'https://www.giallozafferano.it/ricette-cat/Primi/zuppe-minestre-vellutate/',
  ],
  'Secondi': [
    'https://www.giallozafferano.it/ricette-cat/Secondi-piatti/',
    'https://www.giallozafferano.it/ricette-cat/Piatti-Unici/',
    'https://www.giallozafferano.it/ricette-cat/Pesce/',
  ],
  'Dolci': [
    'https://www.giallozafferano.it/ricette-cat/Dolci-e-Desserts/',
    'https://www.giallozafferano.it/ricette-cat/Dolci-e-Desserts/Torte/',
    'https://www.giallozafferano.it/ricette-cat/Dolci-e-Desserts/Al-cucchiaio/',
    'https://www.giallozafferano.it/ricette-cat/Dolci-e-Desserts/Biscotti/',
    'https://www.giallozafferano.it/ricette-cat/Dolci-e-Desserts/Gelati-e-Semifreddi/',
    'https://www.giallozafferano.it/ricette-cat/Dolci-e-Desserts/Salse-e-Creme/',
    'https://www.giallozafferano.it/ricette-cat/Dolci-e-Desserts/piccola-pasticceria/',
    'https://www.giallozafferano.it/ricette-cat/Dolci-e-Desserts/Cheesecakes/',
    'https://www.giallozafferano.it/ricette-cat/Marmellate-e-Conserve/',
    'https://www.giallozafferano.it/ricette-cat/Marmellate-e-Conserve/Marmellate/',
    'https://www.giallozafferano.it/ricette-cat/Marmellate-e-Conserve/Conserve/',
  ],
  'Colazione': [
    'https://www.giallozafferano.it/ricette-cat/Lievitati/',
    'https://www.giallozafferano.it/ricette-cat/Lievitati/Pizze-e-focacce/',
    'https://www.giallozafferano.it/ricette-cat/Lievitati/pane/',
    'https://www.giallozafferano.it/ricette-cat/Lievitati/Dolci/',
    'https://www.giallozafferano.it/ricette-cat/Bevande/',
    'https://www.giallozafferano.it/ricette-cat/Bevande/Analcolici/',
    'https://www.giallozafferano.it/ricette-cat/Bevande/Alcolici/',
    'https://www.giallozafferano.it/ricette-cat/Bevande/frappe-frullati/',
    'https://www.giallozafferano.it/ricette-cat/Salse-e-Sughi/',
    'https://www.giallozafferano.it/ricette-cat/Salse-e-Sughi/Sughi/',
    'https://www.giallozafferano.it/ricette-cat/Salse-e-Sughi/Salse-e-condimenti/',
  ],
};

const DELAY_MS = 200;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9',
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function extractRecipeUrls(html) {
  const urls = new Set();
  // Match JSON-LD "url" fields pointing to recipe pages
  const urlRegex = /"url"\s*:\s*"(https?:\\?\/\\?\/(ricette\.giallozafferano\.it|www\.giallozafferano\.it)\\?\/[^"]*\.html)"/g;
  let match;
  while ((match = urlRegex.exec(html)) !== null) {
    let url = match[1].replace(/\\\//g, '/');
    url = url.replace('http://', 'https://').replace('ricette.giallozafferano.it', 'www.giallozafferano.it');
    urls.add(url);
  }
  
  // Also match href links
  const hrefRegex = /href="(https?:\/\/(ricette\.giallozafferano\.it|www\.giallozafferano\.it)\/[A-Z][^"]*\.html)"/g;
  while ((match = hrefRegex.exec(html)) !== null) {
    let url = match[1].replace('http://', 'https://').replace('ricette.giallozafferano.it', 'www.giallozafferano.it');
    urls.add(url);
  }
  
  // Also match relative href links like /Ricetta-nome.html
  const relRegex = /href="\/([A-Z][^"]*\.html)"/g;
  while ((match = relRegex.exec(html)) !== null) {
    urls.add(`https://www.giallozafferano.it/${match[1]}`);
  }
  
  return Array.from(urls);
}

function findRecipeInJsonLd(data) {
  if (!data) return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeInJsonLd(item);
      if (found) return found;
    }
    return null;
  }
  if (data['@type'] === 'Recipe') return data;
  if (data['@graph']) return findRecipeInJsonLd(data['@graph']);
  return null;
}

function extractImage(recipe) {
  if (!recipe.image) return null;
  if (typeof recipe.image === 'string') return recipe.image;
  if (Array.isArray(recipe.image)) return recipe.image[0];
  if (recipe.image.url) return recipe.image.url;
  return null;
}

function extractInstructions(recipe) {
  if (!recipe.recipeInstructions) return '';
  if (typeof recipe.recipeInstructions === 'string') return recipe.recipeInstructions;
  if (Array.isArray(recipe.recipeInstructions)) {
    return recipe.recipeInstructions.map((step) => {
      if (typeof step === 'string') return step;
      if (step.text) return step.text;
      return '';
    }).filter(Boolean).join('\n');
  }
  return '';
}

function extractRecipeData(html, category) {
  try {
    const jsonLdRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const jsonData = JSON.parse(match[1]);
        const recipe = findRecipeInJsonLd(jsonData);
        if (recipe) {
          const name = recipe.name || '';
          const image = extractImage(recipe);
          if (!name || !image) return null;
          
          const ingredients = recipe.recipeIngredient || [];
          const instructions = extractInstructions(recipe);
          
          return {
            nome: name,
            categoria: category,
            ingredienti: ingredients,
            procedimento: instructions,
            image: image,
          };
        }
      } catch (e) {}
    }
  } catch (e) {}
  return null;
}

async function main() {
  console.log('🚀 GialloZafferano FULL Scraper v2');
  console.log('====================================\n');
  
  const allRecipeUrls = new Map(); // url -> category
  
  // Phase 1: Collect all recipe URLs from all category/subcategory pages
  for (const [categoryName, urls] of Object.entries(CATEGORY_URLS)) {
    console.log(`\n📂 Collecting URLs for: ${categoryName}`);
    for (const pageUrl of urls) {
      try {
        console.log(`  📄 Fetching ${pageUrl}...`);
        const html = await fetchUrl(pageUrl);
        const recipeUrls = extractRecipeUrls(html);
        let newCount = 0;
        for (const url of recipeUrls) {
          if (!allRecipeUrls.has(url)) {
            allRecipeUrls.set(url, categoryName);
            newCount++;
          }
        }
        console.log(`  ✅ Found ${recipeUrls.length} URLs, ${newCount} new (total: ${allRecipeUrls.size})`);
        await sleep(DELAY_MS);
      } catch (e) {
        console.error(`  ❌ Error: ${e.message}`);
      }
    }
  }
  
  console.log(`\n🔗 Total unique recipe URLs collected: ${allRecipeUrls.size}`);
  console.log('📥 Now fetching individual recipes...\n');
  
  // Phase 2: Fetch each recipe
  const allRecipes = [];
  const seenNames = new Set();
  let i = 0;
  const total = allRecipeUrls.size;
  
  for (const [url, category] of allRecipeUrls.entries()) {
    i++;
    if (i % 20 === 0 || i === 1) {
      console.log(`🍳 Fetching recipe ${i}/${total}... (${allRecipes.length} scraped so far)`);
    }
    try {
      const html = await fetchUrl(url);
      const recipe = extractRecipeData(html, category);
      if (recipe) {
        const key = recipe.nome.toLowerCase().trim();
        if (!seenNames.has(key)) {
          seenNames.add(key);
          allRecipes.push(recipe);
        }
      }
      await sleep(DELAY_MS);
    } catch (e) {
      // Skip errored recipes silently
    }
  }
  
  // Write output
  fs.writeFileSync('public/ricette_mondo.json', JSON.stringify(allRecipes, null, 2));
  console.log(`\n🎉 Done! Written ${allRecipes.length} recipes to public/ricette_mondo.json`);
  
  // Print stats
  const stats = {};
  for (const r of allRecipes) {
    stats[r.categoria] = (stats[r.categoria] || 0) + 1;
  }
  console.log('\n📊 Recipe counts by category:');
  for (const [cat, count] of Object.entries(stats)) {
    console.log(`  ${cat}: ${count}`);
  }
}

main().catch(console.error);
