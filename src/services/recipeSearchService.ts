/**
 * recipeSearchService.ts
 * Cascade search: Local GZ DB → TheMealDB (free) → Edamam (optional, with user key)
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

// ── 3. Edamam Recipe API (opzionale, con chiavi utente) ──────────────────────
async function searchEdamam(query: string): Promise<RecipeResult | null> {
  const appId = localStorage.getItem('chelona_edamam_app_id');
  const appKey = localStorage.getItem('chelona_edamam_app_key');
  if (!appId || !appKey) return null;

  try {
    const url = `https://api.edamam.com/api/recipes/v2?type=public&q=${encodeURIComponent(query)}&app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}&to=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.hits || data.hits.length === 0) return null;

    const hit = data.hits[0].recipe;
    const servings = hit.yield || 1;
    const n = hit.totalNutrients || {};
    const ingredienti = hit.ingredientLines?.map((line: string) => ({ nome: line, quantita: '' })) || [];

    return {
      source: 'edamam',
      titolo: hit.label,
      immagine: hit.image,
      difficolta: hit.cuisineType?.[0] ? `Cucina ${hit.cuisineType[0]}` : undefined,
      ingredienti,
      preparazione: `Clicca "Vedi ricetta completa" per le istruzioni di preparazione.`,
      url: hit.url,
      calorie: Math.round((n.ENERC_KCAL?.quantity || 0) / servings),
      proteine: Math.round((n.PROCNT?.quantity || 0) / servings),
      carbs: Math.round((n.CHOCDF?.quantity || 0) / servings),
      grassi: Math.round((n.FAT?.quantity || 0) / servings),
    };
  } catch { return null; }
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

// ── PUBLIC CASCADE ────────────────────────────────────────────────────────────
export async function findRecipeForMeal(mealName: string): Promise<RecipeResult> {
  const cacheKey = mealName.toLowerCase().trim();
  const cache = getSessionCache();
  if (cache[cacheKey]) return cache[cacheKey];

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
    
    if (mapped.englishQuery) {
      const mealdb = await searchTheMealDB(mapped.englishQuery);
      if (mealdb) {
        const translated = await translateRecipeToItalian(mealdb);
        cache[cacheKey] = translated;
        setSessionCache(cache);
        return translated;
      }
      const edamam = await searchEdamam(mapped.englishQuery);
      if (edamam) {
        const translated = await translateRecipeToItalian(edamam);
        cache[cacheKey] = translated;
        setSessionCache(cache);
        return translated;
      }
    }
  }

  // 2. Cascade generale di fallback se non è nella mappa o se falliscono i tentativi mappati
  const local = await searchLocalDB(mealName);
  if (local) { cache[cacheKey] = local; setSessionCache(cache); return local; }

  const engQuery = translateToEnglish(mealName);
  if (engQuery) {
    const mealdb = await searchTheMealDB(engQuery);
    if (mealdb) {
      const translated = await translateRecipeToItalian(mealdb);
      cache[cacheKey] = translated;
      setSessionCache(cache);
      return translated;
    }

    const edamam = await searchEdamam(engQuery);
    if (edamam) {
      const translated = await translateRecipeToItalian(edamam);
      cache[cacheKey] = translated;
      setSessionCache(cache);
      return translated;
    }
  }

  return { source: 'local', titolo: mealName, notFound: true };
}
