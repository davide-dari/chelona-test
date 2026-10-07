/**
 * Servizio Intelligente di Traduzione Ricette in Italiano (Chelona Recipe Translator)
 * 
 * Rileva automaticamente la lingua di una ricetta (titolo, categoria, ingredienti, dosi e passaggi)
 * e la traduce fedelmente in lingua italiana:
 * - Dizionario culinario integrato ad alta velocità (0ms offline)
 * - Supporto traduzione online (Inglese, Spagnolo, Francese, Tedesco -> Italiano)
 * - Batching intelligente e caching in memoria/localStorage per latenza minima
 * - Decodifica sicura di entità HTML
 */

import { UserRecipeItem } from './userRecipesService';

// Dizionario culinario ad alta frequenza per traduzione istantanea e offline
const CULINARY_DICT: Record<string, string> = {
  // Unità di misura e quantità
  'cup': 'tazza',
  'cups': 'tazze',
  'tbsp': 'cucchiaio',
  'tbsps': 'cucchiai',
  'tablespoon': 'cucchiaio',
  'tablespoons': 'cucchiai',
  'tsp': 'cucchiaino',
  'tsps': 'cucchiaini',
  'teaspoon': 'cucchiaino',
  'teaspoons': 'cucchiaini',
  'pinch': 'pizzico',
  'pinches': 'pizzichi',
  'dash': 'goccia/spruzzata',
  'to taste': 'q.b.',
  'taste': 'gusto',
  'clove': 'spicchio',
  'cloves': 'spicchi',
  'can': 'lattina',
  'cans': 'lattine',
  'slice': 'fetta',
  'slices': 'fette',
  'piece': 'pezzo',
  'pieces': 'pezzi',
  'pound': 'libbra (circa 450g)',
  'pounds': 'libbre',
  'lb': 'libbra',
  'lbs': 'libbre',
  'ounce': 'oncia (circa 28g)',
  'ounces': 'once',
  'oz': 'once',
  'grams': 'g',
  'gram': 'g',
  'g': 'g',
  'kg': 'kg',
  'ml': 'ml',
  'liter': 'litro',
  'liters': 'litri',
  'stalk': 'costa',
  'stalks': 'coste',
  'bunch': 'mazzetto',
  'bunches': 'mazzetti',
  'sprig': 'rametto',
  'sprigs': 'rametti',
  'package': 'confezione',
  'packages': 'confezioni',
  'packet': 'bustina',
  'head': 'cespo/testa',

  // Difficoltà e tempi
  'easy': 'facile',
  'medium': 'media',
  'hard': 'difficile',
  'expert': 'difficile',
  'prep time': 'tempo di preparazione',
  'cook time': 'tempo di cottura',
  'servings': 'porzioni',

  // Categorie
  'appetizer': 'Antipasti',
  'appetizers': 'Antipasti',
  'starter': 'Antipasti',
  'starters': 'Antipasti',
  'main course': 'Secondi Piatti',
  'main dish': 'Secondi Piatti',
  'main dishes': 'Secondi Piatti',
  'first course': 'Primi Piatti',
  'first courses': 'Primi Piatti',
  'pasta dish': 'Primi Piatti',
  'pasta dishes': 'Primi Piatti',
  'side dish': 'Contorni',
  'side dishes': 'Contorni',
  'sides': 'Contorni',
  'salad': 'Contorni',
  'salads': 'Contorni',
  'dessert': 'Dolci & Dessert',
  'desserts': 'Dolci & Dessert',
  'sweet': 'Dolci & Dessert',
  'sweets': 'Dolci & Dessert',
  'breakfast': 'Colazione & Merenda',
  'snack': 'Colazione & Merenda',
  'snacks': 'Colazione & Merenda',
  'beverage': 'Bevande',
  'drinks': 'Bevande',
  'one pot': 'Piatti Unici',
  'one-pot': 'Piatti Unici',

  // Ingredienti comuni
  'flour': 'farina',
  'all-purpose flour': 'farina 00',
  'whole wheat flour': 'farina integrale',
  'sugar': 'zucchero',
  'granulated sugar': 'zucchero semolato',
  'brown sugar': 'zucchero di canna',
  'powdered sugar': 'zucchero a velo',
  'salt': 'sale',
  'kosher salt': 'sale grosso/marino',
  'black pepper': 'pepe nero',
  'pepper': 'pepe',
  'olive oil': 'olio d\'oliva',
  'extra virgin olive oil': 'olio extravergine d\'oliva',
  'vegetable oil': 'olio vegetale/di semi',
  'butter': 'burro',
  'unsalted butter': 'burro non salato',
  'egg': 'uovo',
  'eggs': 'uova',
  'egg yolks': 'tuorli d\'uovo',
  'egg whites': 'albumi d\'uovo',
  'milk': 'latte',
  'whole milk': 'latte intero',
  'heavy cream': 'panna fresca liquida',
  'sour cream': 'panna acida',
  'water': 'acqua',
  'garlic': 'aglio',
  'onion': 'cipolla',
  'onions': 'cipolle',
  'red onion': 'cipolla rossa',
  'shallot': 'scalogno',
  'shallots': 'scalogni',
  'tomato': 'pomodoro',
  'tomatoes': 'pomodori',
  'cherry tomatoes': 'pomodorini ciliegino',
  'tomato paste': 'concentrato di pomodoro',
  'tomato sauce': 'salsa di pomodoro',
  'canned tomatoes': 'pomodori pelati in scatola',
  'chicken': 'pollo',
  'chicken breast': 'petto di pollo',
  'chicken thighs': 'cosce di pollo',
  'beef': 'manzo',
  'ground beef': 'carne macinata di manzo',
  'pork': 'maiale',
  'bacon': 'pancetta/bacon',
  'ham': 'prosciutto',
  'salmon': 'salmone',
  'tuna': 'tonno',
  'shrimp': 'gamberi',
  'shrimps': 'gamberi',
  'prawns': 'mazzancolle/gamberoni',
  'cod': 'merluzzo',
  'parmesan cheese': 'parmigiano reggiano grattugiato',
  'parmesan': 'parmigiano',
  'cheddar cheese': 'formaggio cheddar',
  'mozzarella cheese': 'mozzarella',
  'cream cheese': 'formaggio spalmabile',
  'ricotta': 'ricotta',
  'lemon': 'limone',
  'lemon juice': 'succo di limone',
  'lemon zest': 'scorza di limone',
  'lime': 'lime',
  'lime juice': 'succo di lime',
  'basil': 'basilico',
  'parsley': 'prezzemolo',
  'fresh parsley': 'prezzemolo fresco',
  'oregano': 'origano',
  'rosemary': 'rosmarino',
  'thyme': 'timo',
  'cinnamon': 'cannella',
  'vanilla extract': 'estratto di vaniglia',
  'vanilla': 'vaniglia',
  'baking powder': 'lievito per dolci in polvere',
  'baking soda': 'bicarbonato di sodio',
  'yeast': 'lievito di birra',
  'mushrooms': 'funghi',
  'mushroom': 'fungo',
  'zucchini': 'zucchine',
  'spinach': 'spinaci',
  'carrots': 'carote',
  'carrot': 'carota',
  'celery': 'sedano',
  'potato': 'patata',
  'potatoes': 'patate',
  'sweet potato': 'patata dolce',
  'sweet potatoes': 'patate dolci',
  'bell pepper': 'peperone',
  'bell peppers': 'peperoni',
  'cucumber': 'cetriolo',
  'avocado': 'avocado',
  'rice': 'riso',
  'pasta': 'pasta',
  'noodles': 'tagliolini/noodles',
  'spaghetti': 'spaghetti',
  'bread': 'pane',
  'breadcrumbs': 'pangrattato',
  'honey': 'miele',
  'maple syrup': 'sciroppo d\'acero',
  'soy sauce': 'salsa di soia',
  'mustard': 'senape',
  'mayonnaise': 'maionese',
  'vinegar': 'aceto',
  'balsamic vinegar': 'aceto balsamico',
  'chocolate': 'cioccolato',
  'chocolate chips': 'gocce di cioccolato',
  'cocoa powder': 'cacao in polvere',

  // Tecniche culinarie comuni
  'preheat': 'preriscaldare',
  'preheat the oven': 'preriscaldare il forno',
  'bake': 'infornare',
  'cook': 'cuocere',
  'simmer': 'sobbollire a fuoco lento',
  'boil': 'far bollire',
  'stir': 'mescolare',
  'whisk': 'sbattere con una frusta',
  'mix': 'amalgamare',
  'chop': 'tritare',
  'chopped': 'tritato',
  'mince': 'sminuzzare finemente',
  'minced': 'sminuzzato finemente',
  'dice': 'tagliare a dadini',
  'diced': 'tagliato a dadini',
  'to slice': 'affettare',
  'sliced': 'a fette',
  'drain': 'scolare',
  'melt': 'fondere/sciogliere',
  'melted': 'fuso/sciolto',
  'pour': 'versare',
  'heat': 'scaldare',
  'garnish': 'guarnire',
  'serve': 'servire',
  'cool': 'lasciar raffreddare',
  'golden brown': 'dorato',
};

// Parole chiave tipiche italiane per evitare traduzioni inutili
const ITALIAN_MARKERS = new Set([
  'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una',
  'e', 'ed', 'o', 'od', 'se', 'non', 'che', 'ci', 'vi', 'ne',
  'cucchiaio', 'cucchiai', 'cucchiaino', 'cucchiaini', 'pizzico', 'q.b.',
  'olio', 'sale', 'pepe', 'farina', 'burro', 'uovo', 'uova',
  'pomodoro', 'pomodori', 'cipolla', 'cipolle', 'aglio',
  'pasta', 'riso', 'carne', 'pesce', 'latte', 'zucchero',
  'cuocere', 'infornare', 'mescolare', 'scaldare', 'versare', 'tagliare',
  'facile', 'media', 'difficile', 'minuti', 'minuto', 'secondi', 'primi', 'antipasti', 'dolci'
]);

// Parole chiave tipiche inglesi/straniere che indicano necessità di traduzione
const FOREIGN_MARKERS = new Set([
  'the', 'and', 'with', 'for', 'from', 'into', 'about', 'some',
  'tablespoon', 'tablespoons', 'tbsp', 'teaspoon', 'teaspoons', 'tsp',
  'cup', 'cups', 'pinch', 'clove', 'cloves', 'slice', 'slices', 'piece', 'pieces',
  'pound', 'pounds', 'ounce', 'ounces', 'oz', 'grams',
  'preheat', 'oven', 'skillet', 'pan', 'pot', 'bowl', 'heat', 'stir', 'whisk',
  'bake', 'baking', 'cook', 'cooking', 'boil', 'simmer', 'drain', 'melt', 'melted',
  'pour', 'mix', 'chop', 'chopped', 'diced', 'minced', 'sliced', 'season', 'sprinkle',
  'garnish', 'serve', 'serving', 'servings', 'minutes', 'hours', 'golden', 'brown',
  'flour', 'sugar', 'butter', 'egg', 'eggs', 'chicken', 'beef', 'pork', 'garlic', 'onion',
  'powder', 'extract', 'sauce', 'cheese', 'recipe', 'instructions', 'ingredients', 'easy', 'medium', 'hard'
]);

// In-memory cache per traduzioni già eseguite
const translationMemoryCache = new Map<string, string>();

/**
 * Pulisce le entità HTML e normalizza il testo
 */
function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&#10;/g, '\n')
    .replace(/&#010;/g, '\n')
    .replace(/&#13;/g, '\r')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Determina se un testo è già in italiano oppure è in lingua straniera
 */
export function isItalianText(text: string): boolean {
  if (!text || text.trim().length === 0) return true;
  const words = text
    .toLowerCase()
    .replace(/[^a-zàèéìòùáéíóú\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2);

  if (words.length === 0) return true;

  let italianScore = 0;
  let foreignScore = 0;

  for (const w of words) {
    if (ITALIAN_MARKERS.has(w)) italianScore++;
    if (FOREIGN_MARKERS.has(w)) foreignScore++;
  }

  // Se ci sono forti indicatori stranieri e pochi italiani, non è italiano
  if (foreignScore >= 2 && foreignScore > italianScore) return false;
  if (foreignScore >= 1 && italianScore === 0 && words.length >= 2) return false;
  return true;
}

/**
 * Determina se una ricetta necessita di traduzione in italiano
 */
export function needsItalianTranslation(recipe: Partial<UserRecipeItem>): boolean {
  if (!recipe) return false;

  // 1. Controllo titolo
  if (recipe.title && !isItalianText(recipe.title)) return true;

  // 2. Controllo ingredienti (campionamento)
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    let foreignIngCount = 0;
    const sample = recipe.ingredients.slice(0, 6);
    for (const ing of sample) {
      if (!isItalianText(ing)) foreignIngCount++;
    }
    if (foreignIngCount >= 2) return true;
  }

  // 3. Controllo passaggi di preparazione
  if (recipe.steps && recipe.steps.length > 0) {
    const rawStep = recipe.steps[0];
    const firstStep = typeof rawStep === 'string' ? rawStep : (rawStep as any)?.instruction || '';
    if (firstStep && !isItalianText(firstStep)) return true;
  }

  return false;
}

/**
 * Rileva la lingua di origine presunta (en, es, fr, de)
 */
function detectSourceLang(text: string): string {
  const lower = text.toLowerCase();
  // Spagnolo specifico
  if (/\b(cucharada|cucharadita|sartén|calentar|aceite|cebolla|huevo|huevos|para|con)\b/.test(lower)) return 'es';
  // Francese specifico
  if (/\b(cuillère|cuillères|poêle|chauffer|beurre|oeuf|oeufs|avec|dans|pour)\b/.test(lower)) return 'fr';
  // Tedesco specifico (non parole comuni all'inglese come butter)
  if (/\b(löffel|teelöffel|esslöffel|pfanne|knoblauch|zwiebel|und|mit|für)\b/.test(lower)) return 'de';
  // Default inglese
  return 'en';
}

/**
 * Traduzione di una singola frase o termine in Italiano
 */
export async function translateTextToItalian(text: string, sourceLang?: string): Promise<string> {
  const clean = text.trim();
  if (!clean) return clean;

  // 1. Se già in italiano, mantieni invariato
  if (isItalianText(clean)) return clean;

  const cacheKey = clean.toLowerCase();
  if (translationMemoryCache.has(cacheKey)) {
    return translationMemoryCache.get(cacheKey)!;
  }

  // 2. Controllo dizionario culinario offline istantaneo
  if (CULINARY_DICT[cacheKey]) {
    const res = CULINARY_DICT[cacheKey];
    translationMemoryCache.set(cacheKey, res);
    return res;
  }

  // 3. Traduzione remota tramite API MyMemory (gratuita e specializzata)
  const lang = sourceLang || detectSourceLang(clean);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${lang}|it&de=davidedari@gmail.com`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const rawTranslated = data?.responseData?.translatedText;
      if (rawTranslated && typeof rawTranslated === 'string' && !rawTranslated.startsWith('INVALID')) {
        const decoded = decodeHtmlEntities(rawTranslated);
        translationMemoryCache.set(cacheKey, decoded);
        return decoded;
      }
    }
  } catch (err) {
    // Timeout o offline
  }

  // 4. Fallback: traduzione parola per parola con dizionario culinario
  const fallback = translateWordByWordFallback(clean);
  translationMemoryCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Fallback parola per parola basato su espressioni regolari e dizionario culinario
 */
function translateWordByWordFallback(text: string): string {
  let result = text;
  // Sostituisci prima le frasi composte del dizionario
  for (const [key, val] of Object.entries(CULINARY_DICT)) {
    if (key.includes(' ')) {
      const reg = new RegExp(`\\b${key}\\b`, 'gi');
      result = result.replace(reg, val);
    }
  }

  // Poi le singole parole
  return result.replace(/\b[a-zA-Z-]+\b/g, (matched) => {
    const lower = matched.toLowerCase();
    if (CULINARY_DICT[lower]) {
      const trans = CULINARY_DICT[lower];
      if (matched[0] === matched[0].toUpperCase() && matched.length > 1) {
        return trans.charAt(0).toUpperCase() + trans.slice(1);
      }
      return trans;
    }
    return matched;
  });
}

/**
 * Traduce una lista di testi in batch aggregato per ridurre al minimo le richieste HTTP
 */
export async function translateBatchToItalian(texts: string[], sourceLang?: string): Promise<string[]> {
  if (texts.length === 0) return [];

  const results: string[] = new Array(texts.length).fill('');
  const toTranslateIndices: number[] = [];
  const toTranslateTexts: string[] = [];

  for (let i = 0; i < texts.length; i++) {
    const t = texts[i].trim();
    if (!t) {
      results[i] = t;
    } else if (isItalianText(t)) {
      results[i] = t;
    } else if (translationMemoryCache.has(t.toLowerCase())) {
      results[i] = translationMemoryCache.get(t.toLowerCase())!;
    } else if (CULINARY_DICT[t.toLowerCase()]) {
      const translated = CULINARY_DICT[t.toLowerCase()];
      translationMemoryCache.set(t.toLowerCase(), translated);
      results[i] = translated;
    } else {
      toTranslateIndices.push(i);
      toTranslateTexts.push(t);
    }
  }

  if (toTranslateTexts.length === 0) {
    return results;
  }

  // Suddividi in blocchi di massimo 10 righe o 600 caratteri
  const chunks: { indices: number[]; texts: string[] }[] = [];
  let curIndices: number[] = [];
  let curTexts: string[] = [];
  let curLen = 0;

  for (let i = 0; i < toTranslateTexts.length; i++) {
    const txt = toTranslateTexts[i];
    if (curLen + txt.length > 600 || curTexts.length >= 10) {
      chunks.push({ indices: curIndices, texts: curTexts });
      curIndices = [];
      curTexts = [];
      curLen = 0;
    }
    curIndices.push(toTranslateIndices[i]);
    curTexts.push(txt);
    curLen += txt.length;
  }
  if (curTexts.length > 0) {
    chunks.push({ indices: curIndices, texts: curTexts });
  }

  for (const chunk of chunks) {
    const joined = chunk.texts.join('\n');
    const lang = sourceLang || detectSourceLang(joined);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(joined)}&langpair=${lang}|it&de=davidedari@gmail.com`;

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const raw = data?.responseData?.translatedText;
        if (raw && typeof raw === 'string' && !raw.startsWith('INVALID')) {
          const parts = decodeHtmlEntities(raw).split('\n').map(p => p.trim());
          if (parts.length === chunk.texts.length) {
            for (let k = 0; k < chunk.texts.length; k++) {
              const original = chunk.texts[k];
              const translated = parts[k] || original;
              translationMemoryCache.set(original.toLowerCase(), translated);
              results[chunk.indices[k]] = translated;
            }
            continue;
          }
        }
      }
    } catch {}

    // Fallback individuale se il batch remoto fallisce o ha discrepanze
    for (let k = 0; k < chunk.texts.length; k++) {
      const original = chunk.texts[k];
      const translated = await translateTextToItalian(original, lang);
      results[chunk.indices[k]] = translated;
    }
  }

  return results;
}

/**
 * Traduce un'intera ricetta UserRecipeItem in Italiano se necessario
 */
export async function translateUserRecipeToItalian(recipe: UserRecipeItem): Promise<UserRecipeItem> {
  if (!recipe) return recipe;
  if (!needsItalianTranslation(recipe)) return recipe;

  const translated: UserRecipeItem = { ...recipe };

  // 1. Traduzione Titolo
  if (recipe.title && !isItalianText(recipe.title)) {
    translated.title = await translateTextToItalian(recipe.title);
  }

  // 2. Mappatura Categoria in Italiano standard
  if (recipe.category) {
    const catLower = recipe.category.toLowerCase().trim();
    if (CULINARY_DICT[catLower]) {
      translated.category = CULINARY_DICT[catLower];
    }
  }

  // 3. Mappatura Difficoltà
  if (recipe.difficulty) {
    const diffLower = recipe.difficulty.toLowerCase().trim();
    if (diffLower === 'easy') translated.difficulty = 'facile';
    else if (diffLower === 'medium') translated.difficulty = 'media';
    else if (diffLower === 'hard') translated.difficulty = 'difficile';
  }

  // 4. Traduzione Ingredienti in batch
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    translated.ingredients = await translateBatchToItalian(recipe.ingredients);
  }

  // 5. Traduzione Passaggi di preparazione (steps) in batch
  if (recipe.steps && recipe.steps.length > 0) {
    const rawSteps = recipe.steps.map(s => typeof s === 'string' ? s : (s as any)?.instruction || '');
    const translatedInstructions = await translateBatchToItalian(rawSteps);
    translated.steps = translatedInstructions;
  }

  return translated;
}
