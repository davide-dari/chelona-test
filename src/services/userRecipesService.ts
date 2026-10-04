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
 * Parser sicuro ed esaustivo di Schema.org JSON-LD e metadati HTML (incluso Microdata e OpenGraph)
 */
export function extractRecipeFromHtml(html: string, originalUrl: string): UserRecipeItem {
  let recipeLd: any = null;

  const isRecipeType = (typeVal: any): boolean => {
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

  // 1. Cerca blocchi script type="application/ld+json"
  const scriptRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    const rawJson = match[1]?.trim();
    if (!rawJson) continue;

    try {
      const data = JSON.parse(rawJson);
      
      const searchForRecipe = (node: any): any => {
        if (!node) return null;
        if (Array.isArray(node)) {
          for (const item of node) {
            const found = searchForRecipe(item);
            if (found) return found;
          }
        } else if (typeof node === 'object') {
          if (isRecipeType(node['@type'])) {
            return node;
          }
          if (node['@graph']) {
            const found = searchForRecipe(node['@graph']);
            if (found) return found;
          }
        }
        return null;
      };

      const found = searchForRecipe(data);
      if (found) {
        recipeLd = found;
        break;
      }
    } catch {
      // JSON malformato o troncato, continua la scansione dei blocchi successivi
    }
  }

  // 2. Fallback HTML Microdata (itemscope itemtype="http://schema.org/Recipe")
  let microdataTitle = '';
  let microdataImage = '';
  const microdataIngredients: string[] = [];
  const microdataSteps: string[] = [];
  let microdataYield = '';
  let microdataPrep = '';
  let microdataCook = '';
  let microdataCategory = '';
  let microdataCuisine = '';

  if (!recipeLd) {
    try {
      // Ingredienti microdata
      const ingRegex = /<[^>]+itemprop=["'](?:recipeIngredient|ingredients)["'][^>]*>([\s\S]*?)<\/[^>]+>/gi;
      let ingMatch: RegExpExecArray | null;
      while ((ingMatch = ingRegex.exec(html)) !== null) {
        const text = cleanText(ingMatch[1]);
        if (text) microdataIngredients.push(text);
      }

      // Istruzioni microdata
      const stepRegex = /<[^>]+itemprop=["'](?:recipeInstructions|instruction|step)["'][^>]*>([\s\S]*?)<\/[^>]+>/gi;
      let stepMatch: RegExpExecArray | null;
      while ((stepMatch = stepRegex.exec(html)) !== null) {
        const text = cleanText(stepMatch[1]);
        if (text && text.length > 5) microdataSteps.push(text);
      }

      // Titolo microdata
      const nameMatch = html.match(/<[^>]+itemprop=["']name["'][^>]*>([^<]+)<\/[^>]+>/i);
      if (nameMatch) microdataTitle = cleanText(nameMatch[1]);

      // Immagine microdata
      const imgMatch = html.match(/<img[^>]+itemprop=["']image["'][^>]+src=["']([^"']*)["']/i) ||
                       html.match(/<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']*)["']/i);
      if (imgMatch) microdataImage = imgMatch[1].trim();

      // Yield / porzioni
      const yieldMatch = html.match(/<[^>]+itemprop=["']recipeYield["'][^>]+content=["']([^"']*)["']/i) ||
                         html.match(/<[^>]+itemprop=["']recipeYield["'][^>]*>([^<]+)<\/[^>]+>/i);
      if (yieldMatch) microdataYield = cleanText(yieldMatch[1]);

      // Prep / Cook time
      const prepMatch = html.match(/<[^>]+itemprop=["']prepTime["'][^>]+content=["']([^"']*)["']/i) ||
                        html.match(/<[^>]+itemprop=["']prepTime["'][^>]*>([^<]+)<\/[^>]+>/i);
      if (prepMatch) microdataPrep = cleanText(prepMatch[1]);

      const cookMatch = html.match(/<[^>]+itemprop=["']cookTime["'][^>]+content=["']([^"']*)["']/i) ||
                        html.match(/<[^>]+itemprop=["']cookTime["'][^>]*>([^<]+)<\/[^>]+>/i);
      if (cookMatch) microdataCook = cleanText(cookMatch[1]);

      // Category / Cuisine
      const catMatch = html.match(/<[^>]+itemprop=["']recipeCategory["'][^>]*>([^<]+)<\/[^>]+>/i);
      if (catMatch) microdataCategory = cleanText(catMatch[1]);

      const cuisineMatch = html.match(/<[^>]+itemprop=["']recipeCuisine["'][^>]*>([^<]+)<\/[^>]+>/i);
      if (cuisineMatch) microdataCuisine = cleanText(cuisineMatch[1]);
    } catch {
      // Ignora errori di parsing microdata
    }
  }

  // 3. Fallback OpenGraph / Meta tag
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

  // Assembla i dati
  const title = cleanText(recipeLd?.name || recipeLd?.headline || microdataTitle || ogTitle || htmlTitle || 'Ricetta Importata');
  const ingredients = recipeLd ? parseIngredients(recipeLd.recipeIngredient || recipeLd.ingredients) : (microdataIngredients.length > 0 ? microdataIngredients : []);
  const steps = recipeLd ? parseInstructions(recipeLd.recipeInstructions) : (microdataSteps.length > 0 ? microdataSteps : []);
  const image = parseImageUrl(recipeLd?.image) || (microdataImage ? microdataImage : '') || (ogImage ? ogImage.trim() : '') || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800';
  
  const servings = parseServings(recipeLd?.recipeYield || microdataYield);
  const prepTimeMinutes = parseDurationISO(recipeLd?.prepTime || microdataPrep);
  const cookTimeMinutes = parseDurationISO(recipeLd?.cookTime || microdataCook);
  const calories = parseCalories(recipeLd?.nutrition?.calories);

  const rawCat = Array.isArray(recipeLd?.recipeCategory) ? recipeLd.recipeCategory[0] : (recipeLd?.recipeCategory || microdataCategory);
  const rawCuisine = Array.isArray(recipeLd?.recipeCuisine) ? recipeLd.recipeCuisine[0] : (recipeLd?.recipeCuisine || microdataCuisine);
  const category = mapToChelonaCategory(rawCat, rawCuisine);

  let country = rawCuisine ? cleanText(rawCuisine) : 'Italia';
  if (category === 'Cucine dal Mondo' && country.toLowerCase() === 'italia') {
    country = 'Mondo';
  }

  const sourceName = extractSourceName(originalUrl);
  const id = `user_rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

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
    sourceUrl: originalUrl,
    sourceName,
    isCustom: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Scarica una pagina web e ne estrae la ricetta.
 * Usa CapacitorHttp se in ambiente nativo, oppure fallback con CORS proxy in browser.
 */
export async function fetchAndExtractRecipeFromUrl(rawUrl: string): Promise<UserRecipeItem> {
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

  const recipe = extractRecipeFromHtml(html, url);
  return recipe;
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

/** Salva o aggiorna una ricetta personalizzata dell'utente */
export function saveUserRecipe(recipeData: Partial<UserRecipeItem> & { title: string; category: string }): UserRecipeItem {
  const existing = loadUserRecipes();
  const now = Date.now();

  const id = recipeData.id || `user_rec_${now}_${Math.random().toString(36).slice(2, 7)}`;
  const cleanRecipe: UserRecipeItem = {
    id,
    title: recipeData.title.trim(),
    category: recipeData.category || 'Primi',
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
    createdAt: recipeData.createdAt || now,
    updatedAt: now,
  };

  const index = existing.findIndex(r => r.id === id);
  let updatedList: UserRecipeItem[];

  if (index >= 0) {
    updatedList = [...existing];
    updatedList[index] = cleanRecipe;
  } else {
    updatedList = [cleanRecipe, ...existing];
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(USER_RECIPES_STORAGE_KEY, JSON.stringify(updatedList));
  }

  notifyRecipesUpdated();
  return cleanRecipe;
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
