const fs = require('fs');
const https = require('https');
const http = require('http');

// --- CONFIG ---
const CATEGORIES = {
  'Antipasti': 'https://www.giallozafferano.it/ricette-cat/Antipasti/',
  'Primi': 'https://www.giallozafferano.it/ricette-cat/Primi/',
  'Secondi': 'https://www.giallozafferano.it/ricette-cat/Secondi-piatti/',
  'Dolci': 'https://www.giallozafferano.it/ricette-cat/Dolci-e-Desserts/',
  'Colazione': 'https://www.giallozafferano.it/ricette-cat/Lievitati/',
};

const DELAY_MS = 300; // Delay between requests to avoid blocks
const MAX_PAGES_PER_CAT = 100; // Safety limit

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
      // Handle redirects
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

// Extract recipe URLs from category listing page
function extractRecipeUrls(html) {
  const urls = [];
  // Match JSON-LD "url" fields pointing to recipe pages
  const urlRegex = /"url"\s*:\s*"(https?:\\?\/\\?\/(ricette\.giallozafferano\.it|www\.giallozafferano\.it)\\?\/[^"]*\.html)"/g;
  let match;
  while ((match = urlRegex.exec(html)) !== null) {
    let url = match[1].replace(/\\\//g, '/');
    // Normalize to https://www.giallozafferano.it
    url = url.replace('http://', 'https://').replace('ricette.giallozafferano.it', 'www.giallozafferano.it');
    if (!urls.includes(url)) {
      urls.push(url);
    }
  }
  
  // Also match href links to recipe pages
  const hrefRegex = /href="(https?:\/\/(ricette\.giallozafferano\.it|www\.giallozafferano\.it)\/[^"]*\.html)"/g;
  while ((match = hrefRegex.exec(html)) !== null) {
    let url = match[1].replace('http://', 'https://').replace('ricette.giallozafferano.it', 'www.giallozafferano.it');
    if (!urls.includes(url)) {
      urls.push(url);
    }
  }
  
  return urls;
}

// Check if there's a next page link
function hasNextPage(html, currentPage) {
  // Look for pagination links
  const nextPage = currentPage + 1;
  return html.includes(`page=${nextPage}`) || html.includes(`page/${nextPage}`) || html.includes(`?page=${nextPage}`);
}

// Extract recipe data from individual recipe page using JSON-LD
function extractRecipeData(html, category) {
  try {
    // Find JSON-LD script blocks
    const jsonLdRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const jsonData = JSON.parse(match[1]);
        const recipe = findRecipeInJsonLd(jsonData);
        if (recipe) {
          const name = recipe.name || '';
          const image = extractImage(recipe);
          if (!name || !image) return null; // Skip if no name or image
          
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
      } catch (e) {
        // Try next JSON-LD block
      }
    }
  } catch (e) {
    // Fallback
  }
  return null;
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
    return recipe.recipeInstructions.map((step, i) => {
      if (typeof step === 'string') return step;
      if (step.text) return step.text;
      return '';
    }).filter(Boolean).join('\n');
  }
  return '';
}

async function scrapeCategory(categoryName, baseUrl) {
  console.log(`\n📂 Scraping category: ${categoryName} from ${baseUrl}`);
  const allRecipeUrls = [];
  
  // First, get page 1
  let page = 1;
  while (page <= MAX_PAGES_PER_CAT) {
    const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
    console.log(`  📄 Fetching page ${page}...`);
    try {
      const html = await fetchUrl(url);
      const urls = extractRecipeUrls(html);
      
      if (urls.length === 0) {
        console.log(`  ⚠️ No recipes found on page ${page}, stopping pagination`);
        break;
      }
      
      const newUrls = urls.filter(u => !allRecipeUrls.includes(u));
      if (newUrls.length === 0) {
        console.log(`  ⚠️ No new recipes on page ${page}, stopping`);
        break;
      }
      
      allRecipeUrls.push(...newUrls);
      console.log(`  ✅ Found ${newUrls.length} new recipe URLs (total: ${allRecipeUrls.length})`);
      
      // Check if there's a next page
      if (!hasNextPage(html, page)) {
        console.log(`  📊 No more pages found`);
        break;
      }
      
      page++;
      await sleep(DELAY_MS);
    } catch (e) {
      console.error(`  ❌ Error fetching page ${page}: ${e.message}`);
      break;
    }
  }
  
  console.log(`  🔗 Total unique recipe URLs for ${categoryName}: ${allRecipeUrls.length}`);
  
  // Now fetch each recipe page
  const recipes = [];
  for (let i = 0; i < allRecipeUrls.length; i++) {
    const recipeUrl = allRecipeUrls[i];
    if ((i + 1) % 10 === 0 || i === 0) {
      console.log(`  🍳 Fetching recipe ${i + 1}/${allRecipeUrls.length}...`);
    }
    try {
      const html = await fetchUrl(recipeUrl);
      const recipe = extractRecipeData(html, categoryName);
      if (recipe) {
        recipes.push(recipe);
      }
      await sleep(DELAY_MS);
    } catch (e) {
      console.error(`  ❌ Error fetching recipe: ${e.message}`);
    }
  }
  
  console.log(`  ✅ Successfully scraped ${recipes.length} recipes for ${categoryName}`);
  return recipes;
}

async function main() {
  console.log('🚀 GialloZafferano Complete Scraper');
  console.log('===================================\n');
  
  const allRecipes = [];
  const seenNames = new Set();
  
  for (const [categoryName, categoryUrl] of Object.entries(CATEGORIES)) {
    const recipes = await scrapeCategory(categoryName, categoryUrl);
    
    for (const recipe of recipes) {
      // Deduplicate by name
      const key = recipe.nome.toLowerCase().trim();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        allRecipes.push(recipe);
      }
    }
    
    console.log(`\n📊 Running total: ${allRecipes.length} unique recipes\n`);
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
