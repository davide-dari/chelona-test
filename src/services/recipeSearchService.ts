/**
 * recipeSearchService.ts
 * Cascade search: Local GZ DB → TheMealDB (free) → Edamam (optional, with user key)
 * Cache in sessionStorage to avoid duplicate requests.
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
  tacchino: 'turkey', merluzzo: 'cod',
};

const STOP_WORDS = new Set(['con', 'del', 'dei', 'degli', 'gli', 'alla', 'alle', 'allo', 'agli', 'e', 'di', 'da', 'in', 'su', 'per', 'tra', 'fra', 'al', 'ai', 'le', 'la', 'lo', 'il', 'un', 'una']);

function translateToEnglish(italianName: string): string {
  const words = italianName.toLowerCase().split(/\s+/);
  const translated = words
    .filter(w => !STOP_WORDS.has(w) && w.length > 2)
    .map(w => ITALIAN_TO_ENGLISH[w] || w);
  return [...new Set(translated)].slice(0, 3).join(' ');
}

function getSessionCache(): Record<string, any> {
  try { return JSON.parse(sessionStorage.getItem(SESSION_CACHE_KEY) || '{}'); }
  catch { return {}; }
}

function setSessionCache(cache: Record<string, any>) {
  try { sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cache)); } catch {}
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

    let match = db.find(r => r.titolo?.toLowerCase() === mealName.toLowerCase());
    if (!match && queryStr) {
      match = db.find(r => queryWords.slice(0, 2).every((w: string) => r.titolo?.toLowerCase().includes(w)));
    }
    if (!match && queryWords[0]) {
      match = db.find(r => r.titolo?.toLowerCase().includes(queryWords[0]));
    }
    if (!match) return null;

    return {
      source: 'local',
      titolo: match.titolo,
      immagine: match.immagine,
      difficolta: match.difficolta,
      ingredienti: match.ingredienti,
      preparazione: match.preparazione,
    };
  } catch { return null; }
}

// ── 2. TheMealDB (free, key="1") ─────────────────────────────────────────────
async function searchTheMealDB(mealName: string): Promise<RecipeResult | null> {
  try {
    const queries = [
      translateToEnglish(mealName),
      translateToEnglish(mealName).split(' ')[0],
    ].filter(Boolean);

    for (const query of queries) {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!data.meals || data.meals.length === 0) continue;

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
    }
    return null;
  } catch { return null; }
}

// ── 3. Edamam Recipe API (opzionale, con chiavi utente) ──────────────────────
async function searchEdamam(mealName: string): Promise<RecipeResult | null> {
  const appId = localStorage.getItem('chelona_edamam_app_id');
  const appKey = localStorage.getItem('chelona_edamam_app_key');
  if (!appId || !appKey) return null;

  try {
    const query = translateToEnglish(mealName) || mealName;
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

// ── PUBLIC CASCADE ────────────────────────────────────────────────────────────
export async function findRecipeForMeal(mealName: string): Promise<RecipeResult> {
  const cacheKey = mealName.toLowerCase().trim();
  const cache = getSessionCache();
  if (cache[cacheKey]) return cache[cacheKey];

  const local = await searchLocalDB(mealName);
  if (local) { cache[cacheKey] = local; setSessionCache(cache); return local; }

  const mealdb = await searchTheMealDB(mealName);
  if (mealdb) { cache[cacheKey] = mealdb; setSessionCache(cache); return mealdb; }

  const edamam = await searchEdamam(mealName);
  if (edamam) { cache[cacheKey] = edamam; setSessionCache(cache); return edamam; }

  return { source: 'local', titolo: mealName, notFound: true };
}
