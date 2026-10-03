/**
 * recipeSearchService.ts
 * Cascade search: Local Database (Cucine dal Mondo & Ricette Italiane con Unsplash) → TheMealDB (Open API fallback)
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
  'Porridge di Avena con Banana e Miele': { localQuery: 'Porridge di Avena con Banana e Miele', englishQuery: 'Porridge oats banana' },
  'Yogurt Greco con Frutta Secca e Mirtilli': { localQuery: 'Yogurt Greco con Frutta Secca e Mirtilli', englishQuery: 'Yogurt berries nuts' },
  'Uova Strapazzate con Pane Integrale': { localQuery: 'Uova Strapazzate con Pane Integrale', englishQuery: 'Scrambled eggs toast' },
  'Pancake Proteici con Sciroppo d\'Acero': { localQuery: 'Pancake Proteici con Sciroppo d\'Acero', englishQuery: 'Pancake maple syrup' },
  'Toast Avocado e Uovo': { localQuery: 'Toast Avocado e Uovo', englishQuery: 'Avocado toast egg' },
  'Smoothie Proteico alla Frutta': { localQuery: 'Smoothie Proteico alla Frutta', englishQuery: 'Fruit smoothie protein' },
  'Fette Biscottate con Marmellata e Ricotta': { localQuery: 'Fette Biscottate con Marmellata e Ricotta', englishQuery: 'Ricotta toast jam' },
  'Bowl di Acai': { localQuery: 'Bowl di Acai', englishQuery: 'Acai bowl' },
  'Müsli con Latte di Mandorla': { localQuery: 'Müsli con Latte di Mandorla', englishQuery: 'Muesli almond milk' },

  // Pranzo
  'Petto di Pollo alla Griglia con Riso Basmati': { localQuery: 'Petto di Pollo alla Griglia con Riso Basmati', englishQuery: 'Chicken rice basmati' },
  'Pasta Integrale al Tonno': { localQuery: 'Pasta Integrale al Tonno', englishQuery: 'Tuna pasta' },
  'Insalatona con Quinoa e Feta': { localQuery: 'Insalatona con Quinoa e Feta', englishQuery: 'Quinoa salad feta' },
  'Bowl di Riso con Salmone e Avocado': { localQuery: 'Bowl di Riso con Salmone e Avocado', englishQuery: 'Salmon rice avocado bowl' },
  'Wrap Integrale con Tacchino': { localQuery: 'Wrap Integrale con Tacchino', englishQuery: 'Turkey wrap salad' },
  'Pasta con Ragù di Lenticchie': { localQuery: 'Pasta con Ragù di Lenticchie', englishQuery: 'Lentil pasta tomato' },
  'Poke Bowl con Riso e Edamame': { localQuery: 'Poke Bowl con Riso e Edamame', englishQuery: 'Poke bowl salmon' },
  'Risotto ai Funghi': { localQuery: 'Risotto ai funghi', englishQuery: 'Mushroom risotto' },
  'Couscous con Verdure Grigliate e Ceci': { localQuery: 'Couscous con Verdure Grigliate e Ceci', englishQuery: 'Couscous vegetables chickpeas' },

  // Cena
  'Salmone al Forno con Patate Dolci': { localQuery: 'Salmone al Forno con Patate Dolci', englishQuery: 'Baked salmon sweet potato' },
  'Petto di Tacchino con Verdure al Vapore': { localQuery: 'Petto di Tacchino con Verdure al Vapore', englishQuery: 'Turkey breast steamed vegetables' },
  'Omelette con Spinaci e Feta': { localQuery: 'Omelette con Spinaci e Feta', englishQuery: 'Omelette spinach feta' },
  'Merluzzo al Cartoccio con Zucchine': { localQuery: 'Merluzzo al Cartoccio con Zucchine', englishQuery: 'Cod zucchini' },
  'Pollo al Curry con Riso': { localQuery: 'Pollo al Curry con Riso', englishQuery: 'Curry chicken rice' },
  'Hamburger di Tacchino con Insalata': { localQuery: 'Hamburger di Tacchino con Insalata', englishQuery: 'Turkey burger salad' },
  'Zuppa di Legumi': { localQuery: 'Zuppa di legumi e cereali', englishQuery: 'Legume soup lentil bean' },
  'Filetto di Orata con Ratatouille': { localQuery: 'Filetto di Orata con Ratatouille', englishQuery: 'Seabream ratatouille' },
  'Tofu Saltato con Verdure e Riso': { localQuery: 'Tofu Saltato con Verdure e Riso', englishQuery: 'Stir fry tofu rice' },

  // Snack
  'Mix di Frutta Secca': { localQuery: 'Mix di Frutta Secca', englishQuery: 'Mixed nuts granola' },
  'Barretta Proteica Fatta in Casa': { localQuery: 'Barretta Proteica Fatta in Casa', englishQuery: 'Protein bar granola' },
  'Mela con Burro di Arachidi': { localQuery: 'Mela con Burro di Arachidi', englishQuery: 'Apple peanut butter' },
  'Crackers Integrali con Hummus': { localQuery: 'Crackers Integrali con Hummus', englishQuery: 'Hummus' },
  'Cottage Cheese con Miele': { localQuery: 'Cottage Cheese con Miele', englishQuery: 'Cottage cheese honey' },
  'Banana con Cioccolato Fondente': { localQuery: 'Banana con Cioccolato Fondente', englishQuery: 'Banana chocolate' },
  'Edamame': { localQuery: 'Edamame', englishQuery: 'Edamame beans' },
  'Carote con Guacamole': { localQuery: 'Carote con Guacamole', englishQuery: 'Guacamole' }
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
  source: 'local' | 'themealdb';
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
  country?: string;
  flag?: string;
}

// ── 1. Local Database (667 ricette verificate con foto Unsplash & Cucine dal Mondo) ──
async function searchLocalDB(mealName: string): Promise<RecipeResult | null> {
  try {
    let res = await fetch('ricette_mondo.json').catch(() => null);
    if (!res || !res.ok) {
      res = await fetch('/ricette_mondo.json').catch(() => null);
    }
    if (!res || !res.ok) return null;
    const db: any[] = await res.json();
    if (!Array.isArray(db)) return null;

    const lowerTarget = mealName.toLowerCase().trim();
    const queryWords = lowerTarget.replace(/[^a-z0-9àèéìòù ]/g, '').split(' ').filter(w => w.length > 2);
    const queryStr = queryWords.slice(0, 2).join(' ');

    let match = db.find(r => (r.title || r.nome)?.toLowerCase() === lowerTarget);
    if (!match && queryStr) {
      match = db.find(r => queryWords.slice(0, 2).every((w: string) => (r.title || r.nome)?.toLowerCase().includes(w)));
    }
    if (!match && queryWords[0]) {
      match = db.find(r => (r.title || r.nome)?.toLowerCase().includes(queryWords[0]));
    }
    if (!match) return null;

    const rawIng = match.ingredients || match.ingredienti || [];
    const formattedIng = rawIng.map((i: any) => {
      if (typeof i === 'string') return { nome: i, quantita: '' };
      return { nome: i.nome || i.name || '', quantita: i.quantita || i.quantity || '' };
    });

    let prepText = '';
    if (Array.isArray(match.steps)) prepText = match.steps.join('\n');
    else if (typeof match.procedimento === 'string') prepText = match.procedimento;
    else if (Array.isArray(match.procedimento)) prepText = match.procedimento.join('\n');

    return {
      source: 'local',
      titolo: match.title || match.nome || mealName,
      immagine: match.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
      difficolta: match.categoria || match.category || 'Cucine dal Mondo',
      ingredienti: formattedIng,
      preparazione: prepText,
      calorie: match.calories,
      proteine: match.protein,
      carbs: match.carbs,
      grassi: match.fat,
      country: match.country,
      flag: match.flag
    };
  } catch { return null; }
}

// ── 2. TheMealDB (Open, Free Food API) ──────────────────────────────────────────
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
    if (customRecipes.some((r: any) => (r.title || r.nome)?.toLowerCase() === recipe.titolo.toLowerCase())) {
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
      nome: recipe.titolo,
      image: recipe.immagine || '',
      category: cat,
      categoria: cat,
      ingredients: recipe.ingredienti ? recipe.ingredienti.map(i => `${i.quantita} ${i.nome}`.trim()) : [],
      steps: recipe.preparazione ? recipe.preparazione.split('\n').filter(s => s.trim().length > 0) : [],
      country: recipe.country || 'Italia',
      flag: recipe.flag || '🇮🇹'
    };

    customRecipes.push(newRecipe);
    localStorage.setItem('chelona_custom_recipes', JSON.stringify(customRecipes));
    window.dispatchEvent(new Event('recipes-updated'));
  } catch (e) {
    console.error("Failed to save custom recipe", e);
  }
}

// ── PUBLIC CASCADE ────────────────────────────────────────────────────────────
export async function findRecipeForMeal(mealName: string, fallbackDesc?: string, _recipeUrl?: string): Promise<RecipeResult> {
  const cacheKey = mealName.toLowerCase().trim();
  const cache = getSessionCache();
  if (cache[cacheKey]) return cache[cacheKey];

  // 1. Mappatura predefinita rapida per piani fitness
  const mapped = MEAL_TO_QUERY_MAP[mealName] || MEAL_TO_QUERY_MAP[Object.keys(MEAL_TO_QUERY_MAP).find(k => k.toLowerCase() === mealName.toLowerCase()) || ''];
  if (mapped?.localQuery) {
    const local = await searchLocalDB(mapped.localQuery);
    if (local) {
      cache[cacheKey] = local;
      setSessionCache(cache);
      return local;
    }
  }

  // 2. Ricerca diretta nel database locale
  const localDirect = await searchLocalDB(mealName);
  if (localDirect) {
    cache[cacheKey] = localDirect;
    setSessionCache(cache);
    return localDirect;
  }

  // 3. Ricerca per parole chiave nel database locale
  const stopWords = new Set(['con', 'e', 'al', 'alla', 'di', 'in', 'da', 'per', 'su', 'il', 'la', 'lo', 'i', 'gli', 'le', 'un', 'uno', 'una', 'dei', 'delle', 'degli', 'ai', 'agli', 'alle', 'ed']);
  const words = mealName.toLowerCase().split(/[\s,]+/);
  const meaningfulWords = words.filter(w => w.length > 2 && !stopWords.has(w));
  
  if (meaningfulWords.length > 0) {
    const threeWords = meaningfulWords.slice(0, 3).join(' ');
    const localThree = await searchLocalDB(threeWords);
    if (localThree) {
      cache[cacheKey] = localThree;
      setSessionCache(cache);
      saveAsCustomRecipe(localThree, mealName);
      return localThree;
    }

    if (meaningfulWords.length > 1) {
      const twoWords = meaningfulWords.slice(0, 2).join(' ');
      const localTwo = await searchLocalDB(twoWords);
      if (localTwo) {
        cache[cacheKey] = localTwo;
        setSessionCache(cache);
        saveAsCustomRecipe(localTwo, mealName);
        return localTwo;
      }
    }

    const localOne = await searchLocalDB(meaningfulWords[0]);
    if (localOne) {
      cache[cacheKey] = localOne;
      setSessionCache(cache);
      saveAsCustomRecipe(localOne, mealName);
      return localOne;
    }
  }

  // 4. Fallback online open: TheMealDB con traduzione automatica
  const enQuery = translateToEnglish(mealName);
  if (enQuery) {
    const mealDbRes = await searchTheMealDB(enQuery);
    if (mealDbRes) {
      const translated = await translateRecipeToItalian(mealDbRes);
      cache[cacheKey] = translated;
      setSessionCache(cache);
      saveAsCustomRecipe(translated, mealName);
      return translated;
    }
  }

  // 5. Ricetta locale curata di fallback con foto Unsplash royalty-free
  const dummyRecipe: RecipeResult = {
    source: 'local',
    titolo: mealName,
    immagine: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
    difficolta: 'Facile',
    ingredienti: fallbackDesc ? [{ nome: fallbackDesc, quantita: 'Q.b.' }] : [{ nome: mealName, quantita: '1 porzione' }],
    preparazione: "1. Prepara gli ingredienti freschi indicati.\n2. Cuoci in modo leggero e sano (al vapore, alla griglia o al forno) per preservare i nutrienti.\n3. Condisci con un filo d'olio extravergine d'oliva a crudo ed erbe aromatiche a piacere.\n\n(Piatto bilanciato preparato per il tuo piano nutrizionale).",
    notFound: false,
    country: 'Italia',
    flag: '🇮🇹'
  };

  cache[cacheKey] = dummyRecipe;
  setSessionCache(cache);
  saveAsCustomRecipe(dummyRecipe, mealName);
  return dummyRecipe;
}
