/**
 * userRecipesService.ts
 * Servizio per la gestione completa delle ricette create dall'utente
 * e dell'importatore sicuro da link web (Schema.org JSON-LD / OpenGraph).
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { RecipeItem } from './menuPlannerService';

export const USER_RECIPES_STORAGE_KEY = 'chelona_user_recipes';
export const LEGACY_CUSTOM_RECIPES_KEY = 'chelona_custom_recipes';

export interface UserRecipeItem extends RecipeItem {
  servings?: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  sourceUrl?: string;
  sourceName?: string;
  isCustom?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export type UserRecipeInput = Partial<UserRecipeItem> & { title: string; category?: string };

export interface CulinaryPreset {
  id: string;
  name: string;
  category: string;
  emoji: string;
  image: string;
}

export const CULINARY_PRESETS: CulinaryPreset[] = [
  {
    id: 'pasta_pomodoro',
    name: 'Pasta al Pomodoro & Basilico',
    category: 'Primi',
    emoji: '🍝',
    image: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281292?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'pasta_carbonara',
    name: 'Pasta & Carbonara Rustica',
    category: 'Primi',
    emoji: '🍳',
    image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'risotto_zafferano',
    name: 'Risotto Dorato e Mantecato',
    category: 'Primi',
    emoji: '🍚',
    image: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'pizza_margherita',
    name: 'Pizza Margherita Verace',
    category: 'Primi',
    emoji: '🍕',
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'bistecca_griglia',
    name: 'Bistecca & Tagliata con Rosmarino',
    category: 'Secondi',
    emoji: '🥩',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'pollo_arrosto',
    name: 'Pollo Arrosto con Patate al Forno',
    category: 'Secondi',
    emoji: '🍗',
    image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'salmone_grigliato',
    name: 'Salmone Scottato alle Erbe Aromatiche',
    category: 'Secondi',
    emoji: '🐟',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'insalata_mediterranea',
    name: 'Insalata Fresca Mediterranea',
    category: 'Antipasti',
    emoji: '🥗',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'bruschette_miste',
    name: 'Bruschette con Pomodorini & Olio EVO',
    category: 'Antipasti',
    emoji: '🥖',
    image: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'torta_cioccolato',
    name: 'Dolce al Cioccolato Fondente',
    category: 'Dolci',
    emoji: '🍫',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'tiramisu',
    name: 'Tiramisù Tradizionale al Mascarpone',
    category: 'Dolci',
    emoji: '☕',
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'crostata_frutta',
    name: 'Crostata di Frutta Fresca',
    category: 'Dolci',
    emoji: '🍓',
    image: 'https://images.unsplash.com/photo-1519869325930-281384150729?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'pancake_frutti_bosco',
    name: 'Pancake Soffici con Frutti di Bosco',
    category: 'Colazione',
    emoji: '🥞',
    image: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'fitness_bowl_avena',
    name: 'Porridge & Fitness Bowl Proteica',
    category: 'Fitness & Dieta',
    emoji: '💪',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'sushi_roll',
    name: 'Sushi Roll & Uramaki Giapponese',
    category: 'Cucine dal Mondo',
    emoji: '🍣',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'tacos_messicani',
    name: 'Tacos Messicani Speziati con Lime',
    category: 'Cucine dal Mondo',
    emoji: '🌮',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'curry_speziato',
    name: 'Curry Aromatico con Riso Basmati',
    category: 'Cucine dal Mondo',
    emoji: '🍛',
    image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'zuppa_vellutata',
    name: 'Vellutata Cremosa di Verdure di Stagione',
    category: 'Primi',
    emoji: '🥣',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&auto=format&fit=crop&q=80',
  },
];

/** Decodifica le entità HTML comuni */
export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/** Pulisce il testo rimuovendo tag HTML residui e spazi multipli */
export function cleanText(raw: string): string {
  if (!raw) return '';
  return decodeHtmlEntities(raw.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converte durate ISO 8601 (es. PT15M, PT1H30M, PT45S, P0DT0H20M, PT1.5H) in minuti interi.
 */
export function parseDurationISO(durationStr: any): number | undefined {
  if (!durationStr) return undefined;
  if (typeof durationStr === 'number') return durationStr > 0 ? Math.round(durationStr) : undefined;
  if (typeof durationStr !== 'string') return undefined;

  const str = durationStr.trim();
  // Se è già un numero
  const numMatch = str.match(/^(\d+(?:[.,]\d+)?)(?:\s*(?:minuti|minuto|min|m))?$/i);
  if (numMatch) {
    const val = parseFloat(numMatch[1].replace(',', '.'));
    return isNaN(val) ? undefined : Math.round(val);
  }

  // Regex ISO 8601 Durations (P...T...H...M...S) con supporto decimali (es. PT1.5H)
  const isoMatch = str.match(/P(?:(\d+(?:[.,]\d+)?)D)?(?:T(?:(\d+(?:[.,]\d+)?)H)?(?:(\d+(?:[.,]\d+)?)M)?(?:(\d+(?:[.,]\d+)?)S)?)?/i);
  if (isoMatch && (isoMatch[1] || isoMatch[2] || isoMatch[3] || isoMatch[4])) {
    const days = parseFloat((isoMatch[1] || '0').replace(',', '.'));
    const hours = parseFloat((isoMatch[2] || '0').replace(',', '.'));
    const minutes = parseFloat((isoMatch[3] || '0').replace(',', '.'));
    const seconds = parseFloat((isoMatch[4] || '0').replace(',', '.'));
    const totalMinutes = Math.round((days * 24 * 60) + (hours * 60) + minutes + (seconds / 60));
    return totalMinutes > 0 ? totalMinutes : undefined;
  }

  // Supporto testuale es. "1 ora e 20 minuti", "mezz'ora"
  let parsedMin = 0;
  if (/mezz[' ]?ora/i.test(str)) {
    parsedMin += 30;
  }
  const hMatch = str.match(/(\d+(?:[.,]\d+)?)\s*(?:ora|ore|h)/i);
  if (hMatch) parsedMin += Math.round(parseFloat(hMatch[1].replace(',', '.')) * 60);
  const mMatch = str.match(/(\d+)\s*(?:minuti|minuto|min|m)\b/i);
  if (mMatch) parsedMin += parseInt(mMatch[1], 10);

  return parsedMin > 0 ? parsedMin : undefined;
}

/** Estrae il numero di porzioni da recipeYield (es: "4 porzioni", 4, [4], ["4 persone"]) */
export function parseServings(yieldData: any): number | undefined {
  if (yieldData == null) return undefined;
  const target = Array.isArray(yieldData) ? yieldData[0] : yieldData;
  if (typeof target === 'number' && target > 0 && target < 100) return Math.round(target);
  if (typeof target === 'string') {
    const match = target.match(/(\d+)/);
    if (match) {
      const val = parseInt(match[1], 10);
      if (val > 0 && val < 100) return val;
    }
  }
  return undefined;
}

/** Estrae le calorie da nutrition.calories (es. "350 kcal", 350, [350], { value: 350 }) */
export function parseCalories(caloriesData: any): number | undefined {
  if (caloriesData == null) return undefined;
  const target = Array.isArray(caloriesData) 
    ? caloriesData[0] 
    : (typeof caloriesData === 'object' && caloriesData !== null && caloriesData.value !== undefined ? caloriesData.value : caloriesData);
  if (typeof target === 'number' && target > 0) return Math.round(target);
  if (typeof target === 'string') {
    const match = target.match(/(\d+(?:[.,]\d+)?)/);
    if (match) {
      const val = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(val) && val > 0) return Math.round(val);
    }
  }
  return undefined;
}

/** Estrae la migliore URL immagine da vari formati Schema.org / OpenGraph */
export function parseImageUrl(imageData: any): string | undefined {
  if (!imageData) return undefined;
  
  const normalize = (u: any): string | undefined => {
    if (typeof u !== 'string') return undefined;
    const trimmed = u.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    return undefined;
  };

  const direct = normalize(imageData);
  if (direct) return direct;

  if (Array.isArray(imageData) && imageData.length > 0) {
    const first = imageData[0];
    const fromFirst = normalize(first) || normalize(first?.url) || normalize(first?.contentUrl);
    if (fromFirst) return fromFirst;
  }

  if (typeof imageData === 'object') {
    const fromObj = normalize(imageData?.url) || normalize(imageData?.contentUrl);
    if (fromObj) return fromObj;
  }

  return undefined;
}

/**
 * Normalizza le istruzioni da recipeInstructions Schema.org
 * Può essere: array di HowToStep, HowToSection con sottosezioni, array di stringhe o stringa con newlines.
 */
export function parseInstructions(instructionsData: any): string[] {
  if (!instructionsData) return [];
  const steps: string[] = [];

  const processItem = (item: any) => {
    if (!item) return;
    if (typeof item === 'string') {
      const cleaned = cleanText(item);
      if (cleaned.length > 0) steps.push(cleaned);
      return;
    }
    if (typeof item === 'object') {
      const type = item['@type'];
      const isSection = type === 'HowToSection' || (Array.isArray(type) && type.includes('HowToSection'));
      if (isSection && item.itemListElement) {
        if (item.name) {
          steps.push(`=== ${cleanText(item.name)} ===`);
        }
        const subList = Array.isArray(item.itemListElement) ? item.itemListElement : [item.itemListElement];
        for (const sub of subList) {
          processItem(sub);
        }
      } else if (item.text || item.description || item.name) {
        const text = cleanText(item.text || item.description || item.name);
        if (text.length > 0) steps.push(text);
      }
    }
  };

  if (Array.isArray(instructionsData)) {
    for (const item of instructionsData) {
      processItem(item);
    }
  } else if (typeof instructionsData === 'string') {
    // Può essere un blocco unico con a capo o numeri
    const parts = instructionsData.split(/\r?\n+/).map(cleanText).filter(s => s.length > 0);
    if (parts.length > 1) {
      steps.push(...parts);
    } else {
      // Se è un paragrafo lungo, prova a dividerlo su punti seguiti da maiuscole
      const sentences = instructionsData
        .replace(/([.!?])\s+([A-ZÀ-Ú])/g, '$1|SPLIT|$2')
        .split('|SPLIT|')
        .map(cleanText)
        .filter(s => s.length > 0);
      steps.push(...(sentences.length > 0 ? sentences : [cleanText(instructionsData)]));
    }
  }

  return steps.filter(s => s.length > 0);
}

/**
 * Normalizza gli ingredienti da recipeIngredient Schema.org
 */
export function parseIngredients(ingredientsData: any): string[] {
  if (!ingredientsData) return [];
  const list: string[] = [];

  if (Array.isArray(ingredientsData)) {
    for (const item of ingredientsData) {
      if (typeof item === 'string') {
        const cleaned = cleanText(item);
        if (cleaned.length > 0) list.push(cleaned);
      } else if (item && typeof item === 'object') {
        if (item.text || item.description) {
          const cleaned = cleanText(item.text || item.description);
          if (cleaned.length > 0) list.push(cleaned);
        } else if (item.name) {
          const cleaned = cleanText(`${item.amount || ''} ${item.unit || ''} ${item.name}`);
          if (cleaned.length > 0) list.push(cleaned);
        }
      }
    }
  } else if (typeof ingredientsData === 'string') {
    const parts = ingredientsData.split(/\r?\n+/).map(cleanText).filter(s => s.length > 0);
    list.push(...parts);
  }

  return list;
}

/** Estrae il dominio o nome del sito da una URL */
export function extractSourceName(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const parts = host.split('.');
    if (parts.length >= 2) {
      const subdomains = new Set(['ricette', 'blog', 'cucina', 'm', 'it', 'en', 'es', 'fr', 'de']);
      let mainPart = parts[0];
      if (subdomains.has(mainPart) && parts.length > 2) {
        mainPart = parts[1];
      } else if (parts.length >= 2) {
        mainPart = parts[parts.length - 2];
      }
      return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
    }
    return host;
  } catch {
    return 'Web';
  }
}

/** Mappa la categoria da recipeCategory / tags a una categoria valida di Chelona */
export function mapToChelonaCategory(cat: string | undefined, cuisine?: string): string {
  const normCat = (cat || '').toLowerCase();
  const normCuisine = (cuisine || '').toLowerCase().trim();

  // Se è chiaramente un dolce
  if (normCat.includes('dolc') || normCat.includes('dessert') || normCat.includes('torta') || normCat.includes('biscott') || normCat.includes('crostata')) {
    return 'Dolci';
  }

  // Se ha una cucina estera specifica (Messicana, Giapponese, Cinese, Greca, ecc.)
  if (normCuisine && !['italia', 'italiana', 'italian'].includes(normCuisine)) {
    return 'Cucine dal Mondo';
  }

  if (normCat.includes('antipas') || normCat.includes('appetizer') || normCat.includes('starter') || normCat.includes('bruschett') || normCat.includes('finger')) {
    return 'Antipasti';
  }
  if (normCat.includes('second') || normCat.includes('carne') || normCat.includes('pesce') || normCat.includes('arrosto') || normCat.includes('main')) {
    return 'Secondi';
  }
  if (normCat.includes('prim') || normCat.includes('pasta') || normCat.includes('riso') || normCat.includes('zuppa') || normCat.includes('minestra')) {
    return 'Primi';
  }
  if (normCat.includes('fit') || normCat.includes('diet') || normCat.includes('light') || normCat.includes('healthy') || normCat.includes('proteic')) {
    return 'Fitness & Dieta';
  }
  if (normCat.includes('colazion') || normCat.includes('breakfast') || normCat.includes('brunch') || normCat.includes('pancake')) {
    return 'Colazione';
  }

  return 'Primi';
}

/**
 * Risolve un URL relativo o assoluto rispetto a baseUrl
 */
export function resolveUrl(urlStr: string | undefined, baseUrl: string): string {
  if (!urlStr) return baseUrl;
  try {
    return new URL(urlStr, baseUrl).href;
  } catch {
    return urlStr;
  }
}

/** Verifica se il tipo Schema.org indica una Recipe */
export const isRecipeType = (typeVal: any): boolean => {
  if (!typeVal) return false;
  if (typeof typeVal === 'string') {
    const clean = typeVal.toLowerCase().trim();
    return clean === 'recipe' || clean.endsWith('/recipe') || clean.endsWith(':recipe');
  }
  if (Array.isArray(typeVal)) {
    return typeVal.some(isRecipeType);
  }
  return false;
};

/** Verifica se il tipo Schema.org indica un ItemList */
export const isItemListType = (typeVal: any): boolean => {
  if (!typeVal) return false;
  if (typeof typeVal === 'string') {
    const clean = typeVal.toLowerCase().trim();
    return clean === 'itemlist' || clean.endsWith('/itemlist') || clean.endsWith(':itemlist');
  }
  if (Array.isArray(typeVal)) {
    return typeVal.some(isItemListType);
  }
  return false;
};

/**
 * Converte un nodo JSON-LD di tipo Recipe in un UserRecipeItem standard
 */
export function convertJsonLdRecipeToItem(
  recipeLd: any,
  originalUrl: string,
  index: number = 0,
  fallbackTitle?: string,
  fallbackImage?: string
): UserRecipeItem | null {
  if (!recipeLd || typeof recipeLd !== 'object') return null;

  const rawTitle = recipeLd.name || recipeLd.headline || fallbackTitle;
  const title = cleanText(typeof rawTitle === 'string' ? rawTitle : '');
  if (!title || title.length < 2) return null;

  const ingredients = parseIngredients(recipeLd.recipeIngredient || recipeLd.ingredients);
  const steps = parseInstructions(recipeLd.recipeInstructions);
  const image = parseImageUrl(recipeLd.image) || fallbackImage || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800';

  const servings = parseServings(recipeLd.recipeYield);
  const prepTimeMinutes = parseDurationISO(recipeLd.prepTime);
  const cookTimeMinutes = parseDurationISO(recipeLd.cookTime || recipeLd.totalTime);
  const calories = parseCalories(recipeLd.nutrition?.calories);

  const rawCat = Array.isArray(recipeLd.recipeCategory) ? recipeLd.recipeCategory[0] : recipeLd.recipeCategory;
  const rawCuisine = Array.isArray(recipeLd.recipeCuisine) ? recipeLd.recipeCuisine[0] : recipeLd.recipeCuisine;
  const category = mapToChelonaCategory(rawCat || title, rawCuisine);

  let country = rawCuisine ? cleanText(rawCuisine) : 'Italia';
  if (category === 'Cucine dal Mondo' && country.toLowerCase() === 'italia') {
    country = 'Mondo';
  }

  const recipeUrl = resolveUrl(recipeLd.url, originalUrl);
  const sourceName = extractSourceName(recipeUrl);
  const now = Date.now();
  const id = `user_rec_${now}_${index}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    id,
    title,
    category,
    ingredients,
    steps,
    image,
    servings: servings || 4,
    prepTimeMinutes,
    cookTimeMinutes,
    calories,
    country,
    sourceUrl: recipeUrl,
    sourceName,
    isCustom: true,
    createdAt: now + index,
    updatedAt: now,
  };
}

/**
 * Pulisce il testo JSON-LD rimuovendo wrapper CDATA, commenti e decodificando entità HTML.
 */
export function cleanJsonLdText(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  // Rimuovi wrapper CDATA /* <![CDATA[ */ ... /* ]]> */ o //<![CDATA[ ... //]]> o <![CDATA[ ... ]]>
  cleaned = cleaned.replace(/^\s*\/\*\s*<!\[CDATA\[\s*\*\/|\/\*\s*\]\]>\s*$/gi, '');
  cleaned = cleaned.replace(/^\s*\/\/\s*<!\[CDATA\[|\/\/\s*\]\]>\s*$/gi, '');
  cleaned = cleaned.replace(/^\s*<!\[CDATA\[|\]\]>\s*$/gi, '');
  // Rimuovi commenti HTML <!-- ... -->
  cleaned = cleaned.replace(/^\s*<!--|-->\s*$/g, '');
  // Rimuovi commenti C-style avvolgenti /* ... */
  cleaned = cleaned.replace(/^\s*\/\*[\s\S]*?\*\//, '').replace(/\/\*[\s\S]*?\*\/\s*$/, '');
  cleaned = cleaned.trim();
  if (cleaned.includes('&quot;') || cleaned.includes('&amp;') || cleaned.includes('&#')) {
    cleaned = decodeHtmlEntities(cleaned);
  }
  return cleaned.trim();
}

/**
 * Parsing di un singolo blocco HTML Microdata (itemscope itemtype="http://schema.org/Recipe")
 */
function parseMicrodataBlock(block: string, originalUrl: string, index: number): UserRecipeItem | null {
  try {
    // 1. Titolo da meta content o da tag innestato
    const contentNameMatch = block.match(/<[^>]+itemprop=["']name["'][^>]+content=["']([^"']*)["']/i) ||
                             block.match(/<[^>]+content=["']([^"']*)["'][^>]+itemprop=["']name["']/i);
    const tagNameMatch = block.match(/<([a-z0-9]+)\b[^>]*itemprop=["']name["'][^>]*>([\s\S]*?)<\/\1>/i);
    const rawTitle = contentNameMatch ? contentNameMatch[1] : (tagNameMatch ? tagNameMatch[2] : '');
    const titleMatch = cleanText(rawTitle);
    if (!titleMatch || titleMatch.length < 2) return null;

    // 2. Immagine
    const imgMatch = block.match(/<img[^>]+itemprop=["']image["'][^>]+(?:src|data-src)=["']([^"']*)["']/i) ||
                     block.match(/<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']*)["']/i) ||
                     block.match(/<img[^>]+(?:src|data-src)=["']([^"']*)["'][^>]+itemprop=["']image["']/i);
    const image = imgMatch && imgMatch[1].trim()
      ? resolveUrl(imgMatch[1].trim(), originalUrl)
      : 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800';

    // 3. Ingredienti
    const microdataIngredients: string[] = [];
    const ingTagRegex = /<([a-z0-9]+)\b[^>]*itemprop=["'](?:recipeIngredient|ingredients)["'][^>]*>([\s\S]*?)<\/\1>/gi;
    let ingMatch: RegExpExecArray | null;
    while ((ingMatch = ingTagRegex.exec(block)) !== null) {
      const text = cleanText(ingMatch[2]);
      if (text) microdataIngredients.push(text);
    }
    const ingMetaRegex = /<meta\b[^>]*itemprop=["'](?:recipeIngredient|ingredients)["'][^>]+content=["']([^"']*)["']/gi;
    let ingMetaM: RegExpExecArray | null;
    while ((ingMetaM = ingMetaRegex.exec(block)) !== null) {
      const text = cleanText(ingMetaM[1]);
      if (text) microdataIngredients.push(text);
    }

    // 4. Procedimento / Passaggi
    const microdataSteps: string[] = [];
    const containerRegex = /<([a-z0-9]+)\b[^>]*itemprop=["']recipeInstructions["'][^>]*>([\s\S]*?)<\/\1>/gi;
    let contMatch: RegExpExecArray | null;
    while ((contMatch = containerRegex.exec(block)) !== null) {
      const inner = contMatch[2];
      const liRegex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      let liM: RegExpExecArray | null;
      let count = 0;
      while ((liM = liRegex.exec(inner)) !== null) {
        const t = cleanText(liM[1]);
        if (t && t.length > 3) {
          microdataSteps.push(t);
          count++;
        }
      }
      if (count === 0) {
        const pRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
        let pM: RegExpExecArray | null;
        while ((pM = pRegex.exec(inner)) !== null) {
          const t = cleanText(pM[1]);
          if (t && t.length > 3) {
            microdataSteps.push(t);
            count++;
          }
        }
      }
      if (count === 0) {
        const parts = inner.split(/<br\s*\/?>|\r?\n+/).map(cleanText).filter(s => s.length > 3);
        if (parts.length > 0) {
          microdataSteps.push(...parts);
        } else {
          const raw = cleanText(inner);
          if (raw.length > 3) microdataSteps.push(raw);
        }
      }
    }

    // Se non ha trovato contenitori di passaggi, cerca singoli elementi step (es. <li itemprop="step">)
    if (microdataSteps.length === 0) {
      const stepItemRegex = /<([a-z0-9]+)\b[^>]*itemprop=["'](?:step|instruction|recipeInstructions)["'][^>]*>([\s\S]*?)<\/\1>/gi;
      let stepMatch: RegExpExecArray | null;
      while ((stepMatch = stepItemRegex.exec(block)) !== null) {
        const text = cleanText(stepMatch[2]);
        if (text && text.length > 3) {
          microdataSteps.push(text);
        }
      }
    }

    const yieldMatch = block.match(/<[^>]+itemprop=["']recipeYield["'][^>]+content=["']([^"']*)["']/i) ||
                       block.match(/<[^>]+itemprop=["']recipeYield["'][^>]*>([^<]+)<\/[^>]+>/i);
    const servings = parseServings(yieldMatch ? cleanText(yieldMatch[1]) : undefined);

    const prepMatch = block.match(/<[^>]+itemprop=["']prepTime["'][^>]+content=["']([^"']*)["']/i) ||
                      block.match(/<[^>]+itemprop=["']prepTime["'][^>]*>([^<]+)<\/[^>]+>/i);
    const prepTimeMinutes = parseDurationISO(prepMatch ? cleanText(prepMatch[1]) : undefined);

    const cookMatch = block.match(/<[^>]+itemprop=["']cookTime["'][^>]+content=["']([^"']*)["']/i) ||
                      block.match(/<[^>]+itemprop=["']cookTime["'][^>]*>([^<]+)<\/[^>]+>/i);
    const cookTimeMinutes = parseDurationISO(cookMatch ? cleanText(cookMatch[1]) : undefined);

    const catMatch = block.match(/<[^>]+itemprop=["']recipeCategory["'][^>]+content=["']([^"']*)["']/i) ||
                     block.match(/<[^>]+itemprop=["']recipeCategory["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
    const microdataCategory = catMatch ? cleanText(catMatch[1]) : '';

    const cuisineMatch = block.match(/<[^>]+itemprop=["']recipeCuisine["'][^>]+content=["']([^"']*)["']/i) ||
                         block.match(/<[^>]+itemprop=["']recipeCuisine["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
    const microdataCuisine = cuisineMatch ? cleanText(cuisineMatch[1]) : '';

    const category = mapToChelonaCategory(microdataCategory || titleMatch, microdataCuisine);
    let country = microdataCuisine ? cleanText(microdataCuisine) : 'Italia';
    if (category === 'Cucine dal Mondo' && country.toLowerCase() === 'italia') {
      country = 'Mondo';
    }

    const now = Date.now();
    return {
      id: `user_rec_${now}_${index}_${Math.random().toString(36).slice(2, 7)}`,
      title: titleMatch,
      category,
      ingredients: microdataIngredients,
      steps: microdataSteps,
      image,
      servings: servings || 4,
      prepTimeMinutes,
      cookTimeMinutes,
      country,
      sourceUrl: originalUrl,
      sourceName: extractSourceName(originalUrl),
      isCustom: true,
      createdAt: now + index,
      updatedAt: now,
    };
  } catch {
    return null;
  }
}

/**
 * Estrae TUTTE le ricette presenti in una pagina HTML.
 * Riconosce:
 * - Schema.org JSON-LD (@type: Recipe, @type: ItemList, blocchi @graph, molteplici script JSON-LD)
 * - Molteplici blocchi HTML Microdata (itemscope itemtype="http://schema.org/Recipe")
 * - Schede ricetta HTML (per pagine di raccolta o indice)
 * - Fallback OpenGraph / Meta tag
 */
export function extractAllRecipesFromHtml(html: string, originalUrl: string): UserRecipeItem[] {
  if (!html || typeof html !== 'string') return [];

  const collectedRawNodes: any[] = [];
  const seenTitles = new Set<string>();
  const recipes: UserRecipeItem[] = [];

  const addRecipe = (rec: UserRecipeItem | null) => {
    if (!rec || !rec.title) return;
    const normKey = rec.title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    if (!normKey) return;
    if (!seenTitles.has(normKey)) {
      seenTitles.add(normKey);
      recipes.push(rec);
    }
  };

  // 1. Cerca TUTTI i blocchi script type="application/ld+json" (anche con attributi extra, CDATA o spazi)
  const scriptRegex = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json(?:;[^"'>]*)?["']?[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  const traverseJson = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const item of node) {
        traverseJson(item);
      }
      return;
    }
    if (typeof node !== 'object') return;

    if (isRecipeType(node['@type'])) {
      collectedRawNodes.push(node);
    }

    if (isItemListType(node['@type']) && node.itemListElement) {
      const elements = Array.isArray(node.itemListElement) ? node.itemListElement : [node.itemListElement];
      for (const el of elements) {
        if (!el) continue;
        if (typeof el === 'object') {
          if (isRecipeType(el['@type'])) {
            collectedRawNodes.push(el);
          } else if (el.item && typeof el.item === 'object') {
            if (isRecipeType(el.item['@type'])) {
              collectedRawNodes.push(el.item);
            } else if (isItemListType(el.item['@type'])) {
              traverseJson(el.item);
            } else if (el.item.name) {
              collectedRawNodes.push({
                '@type': 'Recipe',
                name: el.item.name,
                description: el.item.description || el.description,
                image: el.item.image || el.image,
                url: el.item.url || el.url,
                recipeIngredient: el.item.recipeIngredient || el.item.ingredients,
                recipeInstructions: el.item.recipeInstructions,
                prepTime: el.item.prepTime,
                cookTime: el.item.cookTime,
                recipeYield: el.item.recipeYield,
                recipeCategory: el.item.recipeCategory,
                recipeCuisine: el.item.recipeCuisine,
                nutrition: el.item.nutrition,
              });
            } else {
              traverseJson(el.item);
            }
          } else {
            const itemUrl = (typeof el.item === 'string' ? el.item : undefined) || el.url;
            const itemName = el.name;
            if (isItemListType(el['@type'])) {
              traverseJson(el);
            } else if (itemName && (itemUrl || el.image || el.description || el.recipeIngredient)) {
              collectedRawNodes.push({
                '@type': 'Recipe',
                name: itemName,
                description: el.description,
                image: el.image,
                url: itemUrl,
                recipeIngredient: el.recipeIngredient || el.ingredients,
                recipeInstructions: el.recipeInstructions,
                prepTime: el.prepTime,
                cookTime: el.cookTime,
                recipeYield: el.recipeYield,
                recipeCategory: el.recipeCategory,
                recipeCuisine: el.recipeCuisine,
                nutrition: el.nutrition,
              });
            } else {
              traverseJson(el);
            }
          }
        }
      }
    }

    if (node['@graph']) {
      traverseJson(node['@graph']);
    }

    for (const key of Object.keys(node)) {
      if (key !== '@graph' && key !== 'itemListElement' && typeof node[key] === 'object' && node[key] !== null) {
        traverseJson(node[key]);
      }
    }
  };

  while ((match = scriptRegex.exec(html)) !== null) {
    const rawJson = match[1]?.trim();
    if (!rawJson) continue;

    try {
      const cleanJson = cleanJsonLdText(rawJson);
      const data = JSON.parse(cleanJson);
      traverseJson(data);
    } catch {
      // JSON malformato o commenti non standard, continua la scansione
    }
  }

  // Converti i nodi JSON-LD raccolti in UserRecipeItem
  for (let i = 0; i < collectedRawNodes.length; i++) {
    const recItem = convertJsonLdRecipeToItem(collectedRawNodes[i], originalUrl, recipes.length);
    addRecipe(recItem);
  }

  // 2. Cerca TUTTI i blocchi HTML Microdata (itemscope itemtype="http://schema.org/Recipe")
  const microdataTagRegex = /<([a-z0-9]+)\b[^>]*itemtype=["']https?:\/\/schema\.org\/Recipe["'][^>]*>/gi;
  let tagMatch: RegExpExecArray | null;
  const startIndices: number[] = [];

  while ((tagMatch = microdataTagRegex.exec(html)) !== null) {
    startIndices.push(tagMatch.index);
  }

  if (startIndices.length > 0) {
    for (let i = 0; i < startIndices.length; i++) {
      const start = startIndices[i];
      const end = (i + 1 < startIndices.length) ? startIndices[i + 1] : Math.min(start + 25000, html.length);
      const block = html.slice(start, end);
      const microItem = parseMicrodataBlock(block, originalUrl, recipes.length);
      addRecipe(microItem);
    }
  }

  // 3. Fallback Schede Ricetta HTML per pagine di raccolta / archivio blog (se nessuna ricetta strutturata trovata)
  if (recipes.length === 0) {
    // 3a. Cerca titoli di ricette numerate in articoli di raccolta (es. "10 ricette veloci con le zucchine": <h2>1. Titolo</h2>)
    const headingRegex = /<h([2-4])[^>]*>([\s\S]*?)<\/h\1>/gi;
    const headings: { title: string; startIndex: number; endIndex: number }[] = [];
    let hm: RegExpExecArray | null;
    while ((hm = headingRegex.exec(html)) !== null) {
      const rawText = cleanText(hm[2]);
      const numMatch = rawText.match(/^(?:(?:ricetta\s+(?:n\.?\s*)?|#)?\s*\d+[\.\)\-:]\s*|(?:\d+°\s+)?ricetta:\s*)(.+)$/i);
      if (numMatch && numMatch[1].trim().length >= 3) {
        headings.push({
          title: cleanText(numMatch[1]),
          startIndex: hm.index,
          endIndex: hm.index + hm[0].length,
        });
      }
    }

    if (headings.length >= 2) {
      for (let i = 0; i < headings.length; i++) {
        const h = headings[i];
        const nextStart = (i + 1 < headings.length) ? headings[i + 1].startIndex : Math.min(h.endIndex + 12000, html.length);
        const sectionHtml = html.slice(h.endIndex, nextStart);

        const imgM = sectionHtml.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/i);
        const linkM = sectionHtml.match(/<a[^>]+href=["']([^"']+)["']/i);
        const cardImage = imgM ? resolveUrl(imgM[1].trim(), originalUrl) : 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800';
        const cardUrl = resolveUrl(linkM ? linkM[1].trim() : undefined, originalUrl);
        const category = mapToChelonaCategory(h.title);

        addRecipe({
          id: `user_rec_${Date.now()}_${recipes.length}_${Math.random().toString(36).slice(2, 7)}`,
          title: h.title,
          category,
          ingredients: [],
          steps: [],
          image: cardImage,
          servings: 4,
          country: 'Italia',
          sourceUrl: cardUrl,
          sourceName: extractSourceName(cardUrl),
          isCustom: true,
          createdAt: Date.now() + recipes.length,
          updatedAt: Date.now(),
        });
      }
    }

    // 3b. Schede HTML in <article>, <div>, <li> o <section>
    const cardRegex = /<(?:article|div|li|section)\b[^>]*(?:class|id)=["'][^"']*(?:recipe-card|ricetta-card|recipe_item|recipe-item|card-recipe|teaser-recipe|archive-recipe|post-recipe|recipe_card|c-recipe|recipe-teaser)[^"']*["'][^>]*>([\s\S]*?)<\/(?:article|div|li|section)>/gi;
    let cardMatch: RegExpExecArray | null;
    let cardCount = 0;

    while ((cardMatch = cardRegex.exec(html)) !== null && cardCount < 30) {
      const cardHtml = cardMatch[1];
      const titleM = cardHtml.match(/<h[2-4][^>]*>(?:<a[^>]+>)?([^<]+)(?:<\/a>)?<\/h[2-4]>/i) ||
                     cardHtml.match(/<a[^>]+title=["']([^"']+)["']/i) ||
                     cardHtml.match(/<a[^>]+class=["'][^"']*(?:title|heading)[^"']*["'][^>]*>([^<]+)<\/a>/i);
      if (titleM) {
        const cardTitle = cleanText(titleM[1]);
        if (cardTitle.length >= 3) {
          const imgM = cardHtml.match(/<img[^>]+src=["']([^"']+)["']/i) || cardHtml.match(/<img[^>]+data-src=["']([^"']+)["']/i);
          const linkM = cardHtml.match(/<a[^>]+href=["']([^"']+)["']/i);
          const cardImage = imgM ? resolveUrl(imgM[1].trim(), originalUrl) : 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800';
          const cardUrl = resolveUrl(linkM ? linkM[1].trim() : undefined, originalUrl);
          const category = mapToChelonaCategory(cardTitle);

          addRecipe({
            id: `user_rec_${Date.now()}_${recipes.length}_${Math.random().toString(36).slice(2, 7)}`,
            title: cardTitle,
            category,
            ingredients: [],
            steps: [],
            image: cardImage,
            servings: 4,
            country: 'Italia',
            sourceUrl: cardUrl,
            sourceName: extractSourceName(cardUrl),
            isCustom: true,
            createdAt: Date.now() + recipes.length,
            updatedAt: Date.now(),
          });
          cardCount++;
        }
      }
    }
  }

  // 4. Fallback finale OpenGraph / Meta tag se ancora 0 ricette
  if (recipes.length === 0) {
    const extractMetaContent = (nameOrProp: string): string => {
      const escaped = nameOrProp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rgx1 = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, 'i');
      const m1 = html.match(rgx1);
      if (m1 && m1[1]) return m1[1];

      const rgx2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i');
      const m2 = html.match(rgx2);
      if (m2 && m2[1]) return m2[1];

      return '';
    };

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const htmlTitle = titleMatch ? cleanText(titleMatch[1]) : '';
    const ogTitle = cleanText(extractMetaContent('og:title') || extractMetaContent('twitter:title'));
    const ogImage = extractMetaContent('og:image') || extractMetaContent('twitter:image');

    const title = ogTitle || htmlTitle || 'Ricetta Importata';
    const image = (ogImage ? ogImage.trim() : '') || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800';
    const category = mapToChelonaCategory(title);

    recipes.push({
      id: `user_rec_${Date.now()}_0_${Math.random().toString(36).slice(2, 7)}`,
      title,
      category,
      ingredients: [],
      steps: [],
      image,
      servings: 4,
      country: 'Italia',
      sourceUrl: originalUrl,
      sourceName: extractSourceName(originalUrl),
      isCustom: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  return recipes;
}

/**
 * Parser per singola ricetta da HTML (retrocompatibile con codice esistente)
 */
export function extractRecipeFromHtml(html: string, originalUrl: string): UserRecipeItem {
  const all = extractAllRecipesFromHtml(html, originalUrl);
  return all[0];
}

/**
 * Scarica una pagina web ed estrae TUTTE le ricette presenti.
 * Usa CapacitorHttp in ambiente nativo (zero CORS) e fallback proxy in browser.
 */
export async function fetchAndExtractRecipesFromUrl(rawUrl: string): Promise<UserRecipeItem[]> {
  const url = rawUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error('Inserisci un link URL valido che inizia con https:// o http://');
  }

  let html = '';

  // 1. Prova prima con CapacitorHttp nativo (zero CORS su Android/iOS)
  try {
    const res = await CapacitorHttp.get({
      url,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    if (res && res.data && typeof res.data === 'string') {
      html = res.data;
    }
  } catch (nativeErr) {
    console.warn('[UserRecipesService] CapacitorHttp direct failed, trying web fallbacks:', nativeErr);
  }

  // 2. Se non ha funzionato o siamo nel browser in dev, prova fetch diretto
  if (!html) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        html = await res.text();
      }
    } catch {
      // CORS block probabile, prosegui ai proxy
    }
  }

  // 3. Fallback con CORS proxy se il browser blocca la richiesta diretta
  if (!html) {
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    ];

    for (const proxyUrl of proxies) {
      try {
        const res = await fetch(proxyUrl);
        if (res.ok) {
          html = await res.text();
          if (html.length > 500) break;
        }
      } catch (err) {
        console.warn(`[UserRecipesService] Proxy ${proxyUrl} failed:`, err);
      }
    }
  }

  if (!html || html.trim().length === 0) {
    throw new Error('Impossibile scaricare la pagina. Verifica la connessione internet o che il link sia accessibile.');
  }

  const recipes = extractAllRecipesFromHtml(html, url);
  if (!recipes || recipes.length === 0) {
    throw new Error('Nessuna ricetta valida trovata in questa pagina.');
  }

  return recipes;
}

/**
 * Scarica una pagina web e ne estrae la prima ricetta trovata (retrocompatibile).
 */
export async function fetchAndExtractRecipeFromUrl(rawUrl: string): Promise<UserRecipeItem> {
  const recipes = await fetchAndExtractRecipesFromUrl(rawUrl);
  return recipes[0];
}

/** Carica tutte le ricette create dall'utente dal localStorage */
export function loadUserRecipes(): UserRecipeItem[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return [];
  }

  try {
    // 1. Chiave principale
    const raw = localStorage.getItem(USER_RECIPES_STORAGE_KEY);
    let list: UserRecipeItem[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed;
      }
    }

    // 2. Recupero retrocompatibile da chelona_custom_recipes
    const legacyRaw = localStorage.getItem(LEGACY_CUSTOM_RECIPES_KEY);
    if (legacyRaw) {
      try {
        const legacyList = JSON.parse(legacyRaw);
        if (Array.isArray(legacyList) && legacyList.length > 0) {
          for (const leg of legacyList) {
            if (!list.some(r => r.id === leg.id)) {
              list.push({
                ...leg,
                isCustom: true,
                createdAt: leg.createdAt || Date.now(),
                updatedAt: leg.updatedAt || Date.now(),
              });
            }
          }
          // Salva nella nuova chiave per consolidare
          localStorage.setItem(USER_RECIPES_STORAGE_KEY, JSON.stringify(list));
        }
      } catch (e) {
        console.warn('Errore lettura legacy custom recipes', e);
      }
    }

    return list;
  } catch (e) {
    console.error('[UserRecipesService] Errore nel caricamento delle ricette utente:', e);
    return [];
  }
}

/** Notifica l'applicazione e l'AI di Chelona che le ricette utente sono cambiate */
function notifyRecipesUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('chelona_user_recipes_updated'));
  }
}

/** Salva o aggiorna multiple ricette create o importate dall'utente in un colpo solo */
export function saveUserRecipes(
  recipesData: (Partial<UserRecipeItem> & { title: string; category?: string })[]
): UserRecipeItem[] {
  if (!recipesData || recipesData.length === 0) return [];
  const existing = loadUserRecipes();
  const now = Date.now();
  const savedList: UserRecipeItem[] = [];

  for (let i = 0; i < recipesData.length; i++) {
    const recipeData = recipesData[i];
    const id = recipeData.id || `user_rec_${now}_${i}_${Math.random().toString(36).slice(2, 7)}`;
    const category = recipeData.category || 'Primi';
    const cleanRecipe: UserRecipeItem = {
      id,
      title: recipeData.title.trim(),
      category,
      ingredients: Array.isArray(recipeData.ingredients) ? recipeData.ingredients.filter(Boolean) : [],
      steps: Array.isArray(recipeData.steps) ? recipeData.steps.filter(Boolean) : [],
      image: recipeData.image || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800',
      servings: recipeData.servings && recipeData.servings > 0 ? Number(recipeData.servings) : 4,
      prepTimeMinutes: recipeData.prepTimeMinutes ? Number(recipeData.prepTimeMinutes) : undefined,
      cookTimeMinutes: recipeData.cookTimeMinutes ? Number(recipeData.cookTimeMinutes) : undefined,
      calories: recipeData.calories ? Number(recipeData.calories) : undefined,
      country: recipeData.country?.trim() || 'Italia',
      flag: recipeData.flag || (recipeData.country === 'Italia' ? '🇮🇹' : '🌍'),
      tags: recipeData.tags || ['Personalizzata', 'La mia ricetta'],
      sourceUrl: recipeData.sourceUrl,
      sourceName: recipeData.sourceName || (recipeData.sourceUrl ? extractSourceName(recipeData.sourceUrl) : undefined),
      isCustom: true,
      createdAt: recipeData.createdAt || (now + i),
      updatedAt: now,
    };
    savedList.push(cleanRecipe);
  }

  // Prepend new recipes, update existing ones if id matched
  const newIds = new Set(savedList.map(r => r.id));
  const remainingExisting = existing.filter(r => !newIds.has(r.id));
  const updatedList = [...savedList, ...remainingExisting];

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(USER_RECIPES_STORAGE_KEY, JSON.stringify(updatedList));
  }

  notifyRecipesUpdated();
  return savedList;
}

/** Salva o aggiorna una ricetta personalizzata dell'utente */
export function saveUserRecipe(
  recipeData: Partial<UserRecipeItem> & { title: string; category?: string }
): UserRecipeItem {
  const result = saveUserRecipes([recipeData]);
  return result[0];
}

/** Elimina una ricetta utente per ID */
export function deleteUserRecipe(id: string): UserRecipeItem[] {
  const existing = loadUserRecipes();
  const updatedList = existing.filter(r => r.id !== id);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(USER_RECIPES_STORAGE_KEY, JSON.stringify(updatedList));
  }

  notifyRecipesUpdated();
  return updatedList;
}

/** Comprime un'immagine selezionata dall'utente (fotocamera o galleria) per occupare meno di 100KB in localStorage */
export function compressImageFile(file: File, maxWidth = 900, maxHeight = 900, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Errore durante il caricamento dell\'immagine selezionata'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Errore durante la lettura del file'));
    reader.readAsDataURL(file);
  });
}
