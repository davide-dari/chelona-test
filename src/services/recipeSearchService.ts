/**
 * recipeSearchService.ts
 * Cascade search: Local GZ DB → GialloZafferano Scraper → TheMealDB (free fallback)
 * Offline/Rate-limit proof Translation using MyMemory & local dictionaries.
 */

const SESSION_CACHE_KEY = 'chelona_recipe_cache';

// --- Mappa IT→EN per termini comuni nei pasti della dieta ---
const ITALIAN_TO_ENGLISH: Record<string, string> = {
  pollo: 'chicken', petto: 'breast', tacchino: 'turkey',
  salmone: 'salmon', tonno: 'tuna', merluzzo: 'cod', orata: 'seabream',
  riso: 'rice', pasta: 'pasta', quinoa: 'quinoa', avena: 'oatmeal',
  uova: 'eggs', uovo: 'egg', strapazzate: 'scrambled',
  avocado: 'avocado', lenticchie: 'lentil', ceci: 'chickpea',
  spinaci: 'spinach', funghi: 'mushroom', zucchine: 'zucchini',
  patate: 'potato', broccoli: 'broccoli', carote: 'carrot',
  yogurt: 'yogurt', porridge: 'porridge', pancake: 'pancake',
  insalata: 'salad', zuppa: 'soup', curry: 'curry',
  forno: 'baked', griglia: 'grilled', vapore: 'steamed',
  tofu: 'tofu', couscous: 'couscous', risotto: 'risotto',
  hamburger: 'burger', wrap: 'wrap', bowl: 'bowl',
  basmati: 'basmati', dolci: 'sweet', legumi: 'legumes',
};

const STOP_WORDS = new Set(['con', 'del', 'dei', 'degli', 'gli', 'alla', 'alle', 'allo', 'agli', 'e', 'di', 'da', 'in', 'su', 'per', 'tra', 'fra', 'al', 'ai', 'le', 'la', 'lo', 'il', 'un', 'una']);

function translateToEnglish(italianName: string): string {
  const words = italianName.toLowerCase().split(/\s+/);
  const translated = words
    .filter(w => !STOP_WORDS.has(w) && w.length > 2)
    .map(w => ITALIAN_TO_ENGLISH[w] || w);
  return [...new Set(translated)].slice(0, 3).join(' ');
}

// --- Dizionario Locale EN -> IT per traduzione istantanea/fallback ---
const ENGLISH_TO_ITALIAN_DICT: Record<string, string> = {
  '1/2 cup': '1/2 tazza',
  '1 cup': '1 tazza',
  '1/4 cup': '1/4 tazza',
  '1/3 cup': '1/3 tazza',
  '2 cups': '2 tazze',
  '1 tbsp': '1 cucchiaio',
  '2 tbsp': '2 cucchiai',
  '1 tsp': '1 cucchiaino',
  '2 tsp': '2 cucchiaini',
  'pinch': 'pizzico',
  'to taste': 'q.b.',
  'taste': 'gusto',
  'grams': 'g',
  'ml': 'ml',
  'g': 'g',
  'oz': 'once',
  'lb': 'libbre',
  'pieces': 'pezzi',
  'piece': 'pezzo',
  'clove': 'spicchio',
  'cloves': 'spicchi',
  'can': 'lattina',
  'cans': 'lattine',
  'slice': 'fetta',
  'slices': 'fette',
  'easy': 'facile',
  'medium': 'medio',
  'hard': 'difficile',

  chicken: 'pollo',
  breast: 'petto',
  salmon: 'salmone',
  tuna: 'tonno',
  cod: 'merluzzo',
  seabream: 'orata',
  rice: 'riso',
  pasta: 'pasta',
  quinoa: 'quinoa',
  oatmeal: 'avena',
  oats: 'avena',
  egg: 'uovo',
  eggs: 'uova',
  scrambled: 'strapazzate',
  avocado: 'avocado',
  lentil: 'lenticchie',
  lentils: 'lenticchie',
  chickpea: 'ceci',
  chickpeas: 'ceci',
  spinach: 'spinaci',
  mushroom: 'funghi',
  mushrooms: 'funghi',
  zucchini: 'zucchine',
  potato: 'patata',
  potatoes: 'patate',
  sweet: 'dolce',
  'sweet potatoes': 'patate dolci',
  'sweet potato': 'patata dolce',
  broccoli: 'broccoli',
  carrot: 'carota',
  carrots: 'carote',
  yogurt: 'yogurt',
  porridge: 'porridge',
  pancake: 'pancake',
  pancakes: 'pancake',
  salad: 'insalata',
  soup: 'zuppa',
  curry: 'curry',
  baked: 'al forno',
  grilled: 'alla griglia',
  steamed: 'al vapore',
  tofu: 'tofu',
  couscous: 'couscous',
  risotto: 'risotto',
  burger: 'hamburger',
  wrap: 'wrap',
  bowl: 'ciotola (bowl)',
  milk: 'latte',
  water: 'acqua',
  honey: 'miele',
  banana: 'banana',
  blueberries: 'mirtilli',
  walnuts: 'noci',
  nuts: 'frutta secca',
  bread: 'pane',
  wholemeal: 'integrale',
  'whole wheat': 'integrale',
  toast: 'toast',
  whey: 'proteine del siero',
  protein: 'proteine',
  powder: 'in polvere',
  maple: 'acero',
  syrup: 'sciroppo',
  marmalade: 'marmellata',
  jam: 'marmellata',
  ricotta: 'ricotta',
  granola: 'granola',
  coconut: 'cocco',
  almond: 'mandorla',
  oil: 'olio',
  olive: 'oliva',
  extra: 'extra',
  virgin: 'vergine',
  salt: 'sale',
  pepper: 'pepe',
  garlic: 'aglio',
  onion: 'cipolla',
  beef: 'manzo',
  pork: 'maiale',
  cheese: 'formaggio',
  feta: 'feta',
  tomato: 'pomodoro',
  tomatoes: 'pomodori',
  cucumber: 'cetriolo',
  cucumbers: 'cetrioli',
  soy: 'soia',
  sauce: 'salsa',
  turkey: 'tacchino',
  flour: 'farina',
  butter: 'burro',
  lemon: 'limone',
  juice: 'succo',
  ginger: 'zenzero',
  parsley: 'prezzemolo',
  basil: 'basilico',
  oregano: 'origano',
  thyme: 'timo',
  rosemary: 'rosmarino',
  cinnamon: 'cannella',
  vanilla: 'vaniglia',
  sugar: 'zucchero',
  cream: 'crema/panna',
  cottage: 'fiocchi di latte',
  shrimp: 'gamberetto',
  shrimps: 'gamberetti',
  beans: 'fagioli',
  bean: 'fagiolo',
  lime: 'lime',
  cilantro: 'coriandolo',
  coriander: 'coriandolo',
  paprika: 'paprika',
  chili: 'peperoncino',
  chiles: 'peperoncini',
  chilli: 'peperoncino',
  tahini: 'tahina',
  sesame: 'sesamo',
  seeds: 'semi',
  seed: 'seme',
  mint: 'menta',
  dill: 'aneto',
};

// --- MAPPATURA DIRETTA DEI 35 PASTI DIETA A QUERY FUNZIONANTI ---
const MEAL_TO_QUERY_MAP: Record<string, { localQuery?: string; englishQuery?: string }> = {
  // Colazione
  'Porridge di Avena con Banana e Miele': { localQuery: 'Porridge', englishQuery: 'Porridge oats banana' },
  'Yogurt Greco con Frutta Secca e Mirtilli': { localQuery: 'Yogurt', englishQuery: 'Yogurt berries nuts' },
  'Uova Strapazzate con Pane Integrale': { localQuery: 'Pane', englishQuery: 'Scrambled eggs toast' },
  'Pancake Proteici con Sciroppo d\'Acero': { localQuery: 'Pancake', englishQuery: 'Pancake maple syrup' },
  'Toast Avocado e Uovo': { localQuery: 'Avocado toast', englishQuery: 'Avocado toast egg' },
  'Smoothie Proteico alla Frutta': { localQuery: 'Smoothie', englishQuery: 'Fruit smoothie protein' },
  'Fette Biscottate con Marmellata e Ricotta': { localQuery: 'Marmellata', englishQuery: 'Ricotta toast jam' },
  'Bowl di Acai': { localQuery: 'Avocado toast', englishQuery: 'Acai bowl' },
  'Müsli con Latte di Mandorla': { localQuery: 'Pancake', englishQuery: 'Muesli almond milk' },

  // Pranzo
  'Petto di Pollo alla Griglia con Riso Basmati': { localQuery: 'Pollo', englishQuery: 'Chicken rice basmati' },
  'Pasta Integrale al Tonno': { localQuery: 'Pasta', englishQuery: 'Tuna pasta' },
  'Insalatona con Quinoa e Feta': { localQuery: 'Insalata di quinoa', englishQuery: 'Quinoa salad feta' },
  'Bowl di Riso con Salmone e Avocado': { localQuery: 'Avocado, uova e salmone', englishQuery: 'Salmon rice avocado bowl' },
  'Wrap Integrale con Tacchino': { localQuery: 'Insalata con avocado', englishQuery: 'Turkey wrap salad' },
  'Pasta con Ragù di Lenticchie': { localQuery: 'Ragù', englishQuery: 'Lentil pasta tomato' },
  'Poke Bowl con Riso e Edamame': { localQuery: 'Insalata di gamberi', englishQuery: 'Poke bowl salmon' },
  'Risotto ai Funghi': { localQuery: 'Risotto ai funghi', englishQuery: 'Mushroom risotto' },
  'Couscous con Verdure Grigliate e Ceci': { localQuery: 'Couscous', englishQuery: 'Couscous vegetables chickpeas' },

  // Cena
  'Salmone al Forno con Patate Dolci': { localQuery: 'Salmone', englishQuery: 'Baked salmon sweet potato' },
  'Petto di Tacchino con Verdure al Vapore': { localQuery: 'Insalata con avocado', englishQuery: 'Turkey breast steamed vegetables' },
  'Omelette con Spinaci e Feta': { localQuery: 'Frittata', englishQuery: 'Omelette spinach feta' },
  'Merluzzo al Cartoccio con Zucchine': { localQuery: 'Merluzzo', englishQuery: 'Cod zucchini' },
  'Pollo al Curry con Riso': { localQuery: 'Pollo al curry', englishQuery: 'Curry chicken rice' },
  'Hamburger di Tacchino con Insalata': { localQuery: 'Burrito', englishQuery: 'Turkey burger salad' },
  'Zuppa di Legumi': { localQuery: 'Zuppa di legumi', englishQuery: 'Legume soup lentil bean' },
  'Filetto di Orata con Ratatouille': { localQuery: 'Orata al forno', englishQuery: 'Seabream ratatouille' },
  'Tofu Saltato con Verdure e Riso': { localQuery: 'Hummus', englishQuery: 'Stir fry tofu rice' },

  // Snack
  'Mix di Frutta Secca': { localQuery: 'Hummus', englishQuery: 'Mixed nuts granola' },
  'Barretta Proteica Fatta in Casa': { localQuery: 'Pancake', englishQuery: 'Protein bar granola' },
  'Mela con Burro di Arachidi': { localQuery: 'Pancake alla banana', englishQuery: 'Apple peanut butter' },
  'Crackers Integrali con Hummus': { localQuery: 'Hummus', englishQuery: 'Hummus' },
  'Cottage Cheese con Miele': { localQuery: 'Yogurt', englishQuery: 'Cottage cheese honey' },
  'Banana con Cioccolato Fondente': { localQuery: 'Pancake alla banana', englishQuery: 'Banana chocolate' },
  'Edamame': { localQuery: 'Hummus', englishQuery: 'Edamame beans' },
  'Carote con Guacamole': { localQuery: 'Guacamole', englishQuery: 'Guacamole' }
};

// --- FUNZIONI DI TRADUZIONE ---

async function translateText(text: string): Promise<string> {
  if (!text || !text.trim()) return text;
  
  const cleanText = text.trim().toLowerCase();
  if (ENGLISH_TO_ITALIAN_DICT[cleanText]) {
    return ENGLISH_TO_ITALIAN_DICT[cleanText];
  }

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3500); // 3.5 sec timeout
    
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|it&de=davidedari@gmail.com`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    
    if (res.ok) {
      const data = await res.json();
      if (data?.responseData?.translatedText) {
        return data.responseData.translatedText;
      }
    }
  } catch (e) {
    console.warn('[Translator] Failed translating:', text, e);
  }

  return translateWordByWord(text);
}

function translateWordByWord(text: string): string {
  return text.split(/\b/)
    .map(word => {
      const lower = word.toLowerCase();
      if (ENGLISH_TO_ITALIAN_DICT[lower]) {
        const trans = ENGLISH_TO_ITALIAN_DICT[lower];
        if (word[0] === word[0].toUpperCase() && word.length > 1) {
          return trans[0].toUpperCase() + trans.slice(1);
        }
        return trans;
      }
      return word;
    })
    .join('');
}

async function translateBatch(texts: string[]): Promise<string[]> {
  if (texts.length === 0) return [];
  const joined = texts.join('\n');
  try {
    const translated = await translateText(joined);
    const parts = translated.split('\n').map(p => p.trim());
    if (parts.length === texts.length) {
      return parts;
    }
  } catch (e) {
    console.warn('[Translator] Batch translation mismatch, falling back to individual');
  }
  return Promise.all(texts.map(t => translateText(t)));
}

async function translateBatchChunked(texts: string[]): Promise<string[]> {
  const results: string[] = [];
  let currentBatch: string[] = [];
  let currentLen = 0;
  
  for (const text of texts) {
    if (currentLen + text.length > 600 || currentBatch.length >= 12) {
      const trans = await translateBatch(currentBatch);
      results.push(...trans);
      currentBatch = [];
      currentLen = 0;
    }
    currentBatch.push(text);
    currentLen += text.length;
  }
  
  if (currentBatch.length > 0) {
    const trans = await translateBatch(currentBatch);
    results.push(...trans);
  }
  
  return results;
}

async function translateParagraph(text: string): Promise<string> {
  if (!text) return '';
  const paragraphs = text.split(/\n+/).filter(Boolean);
  const translatedParagraphs = await Promise.all(
    paragraphs.map(async (para) => {
      if (para.length > 200) {
        const sentences = para.split(/(?<=[.!?])\s+/).filter(Boolean);
        const transSentences = await translateBatchChunked(sentences);
        return transSentences.join(' ');
      }
      return translateText(para);
    })
  );
  return translatedParagraphs.join('\n\n');
}

async function translateRecipeToItalian(recipe: RecipeResult): Promise<RecipeResult> {
  const translated = { ...recipe };
  
  if (recipe.titolo) {
    translated.titolo = await translateText(recipe.titolo);
  }
  
  if (recipe.difficolta) {
    translated.difficolta = await translateText(recipe.difficolta);
  }
  
  if (recipe.preparazione) {
    translated.preparazione = await translateParagraph(recipe.preparazione);
  }
  
  if (recipe.ingredienti && recipe.ingredienti.length > 0) {
    // Traduci nomi e quantità in batch chunked per massimizzare la velocità
    const names = recipe.ingredienti.map(i => i.nome);
    const transNames = await translateBatchChunked(names);
    
    const quantities = recipe.ingredienti.map(i => i.quantita || '');
    const transQuantities = await translateBatchChunked(quantities);
    
    translated.ingredienti = recipe.ingredienti.map((ing, i) => ({
      nome: transNames[i] || ing.nome,
      quantita: transQuantities[i] || ing.quantita
    }));
  }
  
  return translated;
}

export interface RecipeResult {
  source: 'local' | 'themealdb' | 'edamam';
  titolo: string;
  immagine?: string;
  difficolta?: string;
  ingredienti?: { nome: string; quantita?: string }[];
  preparazione?: string;
  url?: string;
  calorie?: number;
  proteine?: number;
  carbs?: number;
  grassi?: number;
  notFound?: boolean;
}

// ── 1. Local GialloZafferano DB ──────────────────────────────────────────────
async function searchLocalDB(mealName: string): Promise<RecipeResult | null> {
  try {
    const res = await fetch('/ricette_mondo.json');
    const db: any[] = await res.json();
    const queryWords = mealName.toLowerCase().replace(/[^a-z0-9àèéìòù ]/g, '').split(' ').filter(w => w.length > 2);
    const queryStr = queryWords.slice(0, 2).join(' ');

    let match = db.find(r => r.nome?.toLowerCase() === mealName.toLowerCase());
    if (!match && queryStr) {
      match = db.find(r => queryWords.slice(0, 2).every((w: string) => r.nome?.toLowerCase().includes(w)));
    }
    if (!match && queryWords[0]) {
      match = db.find(r => r.nome?.toLowerCase().includes(queryWords[0]));
    }
    if (!match) return null;

    return {
      source: 'local',
      titolo: match.nome,
      immagine: match.image,
      difficolta: match.categoria || 'Ricetta Locale',
      ingredienti: match.ingredienti?.map((i: any) => typeof i === 'string' ? { nome: i } : i),
      preparazione: match.procedimento,
    };
  } catch { return null; }
}

// ── 2. TheMealDB (free, key="1") ─────────────────────────────────────────────
async function searchTheMealDB(query: string): Promise<RecipeResult | null> {
  try {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!data.meals || data.meals.length === 0) return null;

    const meal = data.meals[0];
    const ingredienti: { nome: string; quantita: string }[] = [];
    for (let i = 1; i <= 20; i++) {
      const nome = meal[`strIngredient${i}`];
      const quantita = meal[`strMeasure${i}`];
      if (nome?.trim()) ingredienti.push({ nome: nome.trim(), quantita: quantita?.trim() || '' });
    }

    return {
      source: 'themealdb',
      titolo: meal.strMeal,
      immagine: meal.strMealThumb,
      difficolta: meal.strArea ? `Cucina ${meal.strArea}` : meal.strCategory,
      ingredienti,
      preparazione: meal.strInstructions || '',
      url: meal.strSource || meal.strYoutube || undefined,
    };
  } catch { return null; }
}

// ── 3. GialloZafferano Scraper (via CORS Proxy) ────────────────────────────────
async function fetchRecipeFromGZUrl(recipeUrl: string): Promise<RecipeResult | null> {
  try {
    const recipeProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(recipeUrl)}`;
    const recipeRes = await fetch(recipeProxyUrl);
    if (!recipeRes.ok) return null;
    const recipeData = await recipeRes.json();
    const recipeHtml = recipeData.contents;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(recipeHtml, 'text/html');
    
    const title = doc.querySelector('h1.gz-title-recipe, h1')?.textContent?.trim();
    if (!title) return null;
    
    const image = doc.querySelector('picture img')?.getAttribute('src') || doc.querySelector('.gz-featured-image img')?.getAttribute('src') || '';
    
    const ingredienti: { nome: string; quantita: string }[] = [];
    const ingElements = doc.querySelectorAll('.gz-ingredient');
    ingElements.forEach(el => {
      // Nome ingrediente
      const anchor = el.querySelector('a');
      let nome = '';
      if (anchor) {
        nome = anchor.textContent?.trim() || '';
      } else {
        // Se non c'è il link, prendi il testo del nodo text
        const textNode = Array.from(el.childNodes).find(n => n.nodeType === 3 && n.textContent?.trim() !== '');
        nome = textNode?.textContent?.trim() || '';
      }
      
      const quantita = el.querySelector('span')?.textContent?.trim() || '';
      if (nome) ingredienti.push({ nome, quantita });
    });
    
    let preparazione = '';
    const stepElements = doc.querySelectorAll('.gz-content-recipe-step');
    stepElements.forEach((el, index) => {
      const stepText = el.textContent?.trim();
      if (stepText) {
        preparazione += `${index + 1}. ${stepText}\n\n`;
      }
    });
    
    if (!preparazione) {
      preparazione = doc.querySelector('.gz-content-recipe')?.textContent?.trim() || 'Vedi la ricetta sul sito di GialloZafferano.';
    }
    
    return {
      source: 'local', // Manteniamo 'local' per non mostrare loghi esterni
      titolo: title,
      immagine: image,
      difficolta: 'Ricetta Originale GialloZafferano',
      ingredienti,
      preparazione: preparazione.trim(),
      url: recipeUrl,
      notFound: false
    };
  } catch (e) {
    console.error("GZ fetch error:", e);
    return null;
  }
}

async function searchGialloZafferano(query: string): Promise<RecipeResult | null> {
  try {
    const gzSearchUrl = `https://www.giallozafferano.it/ricerca-ricette/${encodeURIComponent(query)}/`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(gzSearchUrl)}`;
    
    const searchRes = await fetch(proxyUrl);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const searchHtml = searchData.contents;
    
    const parser = new DOMParser();
    const searchDoc = parser.parseFromString(searchHtml, 'text/html');
    
    // Trova il primo link a una ricetta nei risultati
    const firstRecipeAnchor = searchDoc.querySelector('.gz-title a, article.gz-card a') as HTMLAnchorElement;
    if (!firstRecipeAnchor) return null;
    
    let recipeUrl = firstRecipeAnchor.getAttribute('href');
    if (!recipeUrl) return null;
    
    if (recipeUrl.startsWith('/')) {
      recipeUrl = 'https://www.giallozafferano.it' + recipeUrl;
    }
    
    return await fetchRecipeFromGZUrl(recipeUrl);
  } catch (e) {
    console.error("GZ search error:", e);
    return null;
  }
}

function getSessionCache(): Record<string, any> {
  try {
    const data = sessionStorage.getItem('chelona_recipe_cache');
    return data ? JSON.parse(data) : {};
  } catch { return {}; }
}

function setSessionCache(cache: Record<string, any>) {
  try { sessionStorage.setItem('chelona_recipe_cache', JSON.stringify(cache)); } catch {}
}

function saveAsCustomRecipe(recipe: RecipeResult, originalQuery: string) {
  try {
    const existing = localStorage.getItem('chelona_custom_recipes');
    let customRecipes = existing ? JSON.parse(existing) : [];
    
    // Check if already exists
    if (customRecipes.some((r: any) => r.title.toLowerCase() === recipe.titolo.toLowerCase())) {
      return;
    }

    let cat = 'Secondi';
    const q = originalQuery.toLowerCase();
    if (q.includes('porridge') || q.includes('pancake') || q.includes('yogurt') || q.includes('toast') || q.includes('uova')) cat = 'Colazione';
    else if (q.includes('pasta') || q.includes('riso') || q.includes('quinoa')) cat = 'Primi';
    else if (q.includes('pollo') || q.includes('salmone') || q.includes('merluzzo') || q.includes('manzo') || q.includes('hamburger')) cat = 'Secondi';

    const newRecipe = {
      id: `custom_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      title: recipe.titolo,
      image: recipe.immagine || '',
      category: cat,
      ingredients: recipe.ingredienti ? recipe.ingredienti.map(i => `${i.quantita} ${i.nome}`.trim()) : [],
      steps: recipe.preparazione ? recipe.preparazione.split('\n').filter(s => s.trim().length > 0) : []
    };

    customRecipes.push(newRecipe);
    localStorage.setItem('chelona_custom_recipes', JSON.stringify(customRecipes));
    
    // Dispatch an event so RecipesScreen can reload if it's open
    window.dispatchEvent(new Event('recipes-updated'));
  } catch (e) {
    console.error("Failed to save custom recipe", e);
  }
}

// ── PUBLIC CASCADE ────────────────────────────────────────────────────────────
export async function findRecipeForMeal(mealName: string, fallbackDesc?: string, recipeUrl?: string): Promise<RecipeResult> {
  const cacheKey = mealName.toLowerCase().trim();
  const cache = getSessionCache();
  if (cache[cacheKey]) return cache[cacheKey];

  if (recipeUrl) {
    const directResult = await fetchRecipeFromGZUrl(recipeUrl);
    if (directResult) {
      cache[cacheKey] = directResult;
      setSessionCache(cache);
      saveAsCustomRecipe(directResult, mealName);
      return directResult;
    }
  }

  // 1. Controlla la mappatura predefinita per trovare la migliore corrispondenza
  const mapped = MEAL_TO_QUERY_MAP[mealName] || MEAL_TO_QUERY_MAP[Object.keys(MEAL_TO_QUERY_MAP).find(k => k.toLowerCase() === mealName.toLowerCase()) || ''];
  
  if (mapped) {
    if (mapped.localQuery) {
      const local = await searchLocalDB(mapped.localQuery);
      if (local) {
        cache[cacheKey] = local;
        setSessionCache(cache);
        return local;
      }
    }
    if (mapped.localQuery) {
      // 2. GialloZafferano Scraper con query mappata (parola chiave)
      const gzResult = await searchGialloZafferano(mapped.localQuery);
      if (gzResult) {
        cache[cacheKey] = gzResult;
        setSessionCache(cache);
        saveAsCustomRecipe(gzResult, mealName);
        return gzResult;
      }
    }
  }

  // 2. Cascade generale di fallback se non è nella mappa o se falliscono i tentativi mappati
  const local = await searchLocalDB(mealName);
  if (local) { cache[cacheKey] = local; setSessionCache(cache); return local; }

  // 3. Estrazione intelligente delle parole chiavi per una ricerca allargata
  const stopWords = new Set(['con', 'e', 'al', 'alla', 'di', 'in', 'da', 'per', 'su', 'il', 'la', 'lo', 'i', 'gli', 'le', 'un', 'uno', 'una', 'dei', 'delle', 'degli', 'ai', 'agli', 'alle', 'ed']);
  const words = mealName.toLowerCase().split(/[\s,]+/);
  const meaningfulWords = words.filter(w => w.length > 2 && !stopWords.has(w));
  
  // Proviamo prima con le prime 3 parole significative (es. "couscous verdure grigliate")
  const threeWords = meaningfulWords.slice(0, 3).join(' ');
  if (threeWords.length > 5) {
    const gzThree = await searchGialloZafferano(threeWords);
    if (gzThree) {
      cache[cacheKey] = gzThree;
      setSessionCache(cache);
      saveAsCustomRecipe(gzThree, mealName);
      return gzThree;
    }
  }

  // Se fallisce, proviamo con solo le prime 2 parole (es. "couscous verdure")
  const twoWords = meaningfulWords.slice(0, 2).join(' ');
  if (twoWords.length > 3 && twoWords !== threeWords) {
    const gzTwo = await searchGialloZafferano(twoWords);
    if (gzTwo) {
      cache[cacheKey] = gzTwo;
      setSessionCache(cache);
      saveAsCustomRecipe(gzTwo, mealName);
      return gzTwo;
    }
  }
  // Se fallisce anche con 2 parole, proviamo solo la prima (es. "couscous")
  const oneWord = meaningfulWords.slice(0, 1).join(' ');
  if (oneWord.length > 3 && oneWord !== twoWords) {
    const gzOne = await searchGialloZafferano(oneWord);
    if (gzOne) {
      cache[cacheKey] = gzOne;
      setSessionCache(cache);
      saveAsCustomRecipe(gzOne, mealName);
      return gzOne;
    }
  }

  // 4. Prova GialloZafferano con il nome completo in italiano come ultima spiaggia
  const gzDirect = await searchGialloZafferano(mealName);
  if (gzDirect) {
    cache[cacheKey] = gzDirect;
    setSessionCache(cache);
    saveAsCustomRecipe(gzDirect, mealName);
    return gzDirect;
  }

  // Se non troviamo ASSOLUTAMENTE nulla, generiamo una ricetta fittizia
  // per non lasciare l'utente con una schermata vuota
  const dummyRecipe: RecipeResult = {
    source: 'local',
    titolo: mealName,
    difficolta: 'Facile',
    ingredienti: fallbackDesc ? [{ nome: fallbackDesc, quantita: 'Q.b.' }] : [{ nome: mealName, quantita: '1 porzione' }],
    preparazione: "1. Prepara gli ingredienti indicati.\n2. Cucina in modo semplice (al vapore, alla griglia o al forno) per mantenere intatte le proprietà nutrizionali.\n3. Condisci con un filo d'olio a crudo e spezie a piacere.\n\n(Ricetta generata automaticamente per il tuo piano alimentare).",
    notFound: false
  };
  
  cache[cacheKey] = dummyRecipe;
  setSessionCache(cache);
  saveAsCustomRecipe(dummyRecipe, mealName);
  return dummyRecipe;
}
