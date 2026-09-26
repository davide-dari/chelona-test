import { SupermarketCategory } from '../types';

export interface RecipeItem {
  id: string;
  title: string;
  category: string;
  ingredients: string[];
  steps: string[];
  image: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  tags?: string[];
}

export type DietTheme = 'carne' | 'pesce' | 'vegetariano' | 'sorprendimi';
export type MealType = 'pranzo' | 'cena';

export interface HarmoniousMenu {
  id: string;
  mealType: MealType;
  theme: 'carne' | 'pesce' | 'vegetariano';
  antipasto: RecipeItem | null;
  primo: RecipeItem | null;
  secondo: RecipeItem | null;
  chefAdvice: string;
  wineAdvice: string;
}

export interface ParsedIngredient {
  raw: string;
  name: string;
  quantity: string;
  category: SupermarketCategory;
}

const FISH_REGEX = /\b(pesce|pesci|salmone|tonno|spigola|spigole|orata|orate|merluzzo|merluzzi|calamaro|calamari|calamaretti|vongola|vongole|cozza|cozze|gambero|gamberi|gamberetto|gamberetti|gamberoni|scoglio|pescatora|alici|alice|sarda|sarde|sardina|sardine|polpo|polpi|polpetti|polipetti|crostacei|frutti di mare|baccalà|baccala|pesce spada|trota|trote|seppia|seppie|moscardino|moscardini|astice|astici|aragosta|aragoste|acciughe|acciuga|bottarga)\b/i;

const MEAT_REGEX = /\b(carne|carni|manzo|vitello|vitella|pollo|tacchino|maiale|suino|salsiccia|salsicce|pancetta|guanciale|ragù|ragu|bolognese|bistecca|bistecche|arrosto|macinato|spezzatino|agnello|coniglio|bresaola|prosciutto|salame|mortadella|speck|lardo|wurstel|carbonara|amatriciana|gricia|cotoletta|cotolette|tagliata)\b/i;

/** Rileva il tema culinario di una ricetta */
export function classifyRecipeTheme(recipe: RecipeItem): 'carne' | 'pesce' | 'vegetariano' {
  const text = `${recipe.title} ${(recipe.ingredients || []).join(' ')}`.toLowerCase();
  const isFish = FISH_REGEX.test(text);
  const isMeat = MEAT_REGEX.test(text);

  if (isFish && !isMeat) return 'pesce';
  if (isMeat && !isFish) return 'carne';
  if (isFish && isMeat) return 'pesce'; // priorità pesce per misto frutti di mare
  return 'vegetariano';
}

/** Esegue il parsing di un ingrediente ricavando nome pulito, quantità e categoria spesa */
export function parseIngredient(raw: string): ParsedIngredient {
  const trimmed = raw.trim();

  // Pattern 1: "Farina 00 400 g"
  const qtyEndMatch = trimmed.match(
    /^(.*?)\s+((?:\d[\d.,/]*(?:\s*[-–]\s*\d[\d.,/]*)?)\s*(?:g|kg|ml|l|cl|dl|oz|lb|tazza|tazze|cucchiai[oe]?|cucchiaino|cucchiaini|spicchi?|fette?|foglie|foglia|pizzico|rametti?|q\.b\.?|pezzi?|n°?\s*\d+|\d+\s*pezzi?|mazzetti?|mazzo|filetti?|bustina|bustine|lattine?|barattolo|bicchiere|bicchieri|fetta|fette|scatola|sacchetti?|confezione|pacchetto|fascio|cespo|gambi?|grappolo)?)$/i
  );
  // Pattern 2: "400 g Farina 00"
  const qtyStartMatch = trimmed.match(
    /^((?:\d[\d.,/]*(?:\s*[-–]\s*\d[\d.,/]*)?)\s*(?:g|kg|ml|l|cl|dl|oz|lb|tazze?|cucchiai[oe]?|cucchiaino|cucchiaini|spicchi?|fette?|foglie|foglia|pizzico|rametti?|q\.b\.?|pezzi?|mazzetti?|mazzo|filetti?|bustine?|lattine?|barattolo|bicchieri?|fette?|scatola|sacchetti?|confezione|pacchetto|fascio|cespo|gambi?|grappolo)?)\s+(.+)$/i
  );

  let name = trimmed;
  let quantity = '';

  if (qtyEndMatch && qtyEndMatch[2]?.trim()) {
    name = qtyEndMatch[1].trim();
    quantity = qtyEndMatch[2].trim();
  } else if (qtyStartMatch && /^\d/.test(qtyStartMatch[1]) && qtyStartMatch[2]?.trim()) {
    quantity = qtyStartMatch[1].trim();
    name = qtyStartMatch[2].trim();
  }

  // Pulisci prefissi ed eventuali note tra parentesi
  name = name.replace(/^[-•*]\s*/, '').replace(/\s*\([^)]*\)/g, '').trim();

  // Determina categoria supermercato
  let category: SupermarketCategory = 'dispensa';
  const t = name.toLowerCase();

  if (/(mela|banana|arancia|limone|pomodor|insalata|patat|cipoll|aglio|carot|zucchin|peperon|melanzan|broccol|spinac|fung|fragol|uva|pera|pesca|albicocc|cilieg|anguria|melone|kiwi|ananas|mango|avocado|asparag|porro|sedano|finocchi|rucola|lattuga|radicchio|verdur|frutt|basilic|prezzemol|rosmarin|timo|salvia|menta|origano|alloro)/i.test(t)) {
    category = 'frutta-verdura';
  } else if (/(latte|panna|burro|yogurt|mozzarella|parmigiano|grana|pecorino|ricotta|stracchino|mascarpone|formagg|gorgonzola|fontina|provola|scamorza|uov|uovo)/i.test(t)) {
    category = 'latticini-uova';
  } else if (/(carne|manzo|vitello|pollo|tacchino|maiale|salsiccia|pancetta|guanciale|ragù|bistecca|arrosto|macinato|spezzatino|agnello|prosciutto|salame|mortadella|speck|lardo|pesce|salmone|tonno|spigola|orata|merluzzo|calamar|vongol|cozz|gamber|alici|sard|polp|crostac|frutti di mare|baccal|pesce spada|seppia)/i.test(t)) {
    category = 'carne-pesce';
  } else if (/(pane|focaccia|pizza|panini|croissant|brioche|lievito|farina|biscott|grissini|crackers|fette biscottate)/i.test(t)) {
    category = 'pane-pasticceria';
  } else if (/(acqua|vino|birra|succo|bevanda|aranciata|coca|tè|caffè|liquore|prosecco|spumante)/i.test(t)) {
    category = 'bevande';
  } else if (/(pasta|riso|spaghetti|penne|fusilli|rigatoni|olio|aceto|sale|pepe|spezie|zucchero|miele|marmellata|passata|pelati|ceci|lenticchie|fagioli|tonno in scatola|mais|dado|brodo)/i.test(t)) {
    category = 'dispensa';
  }

  return { raw, name, quantity, category };
}

/** Consigli dello chef per ciascun tema e tipologia di pasto */
const CHEF_ADVICES: Record<'carne' | 'pesce' | 'vegetariano', { pranzo: { advice: string; wine: string }; cena: { advice: string; wine: string } }> = {
  pesce: {
    pranzo: {
      advice: 'Menu di mare fresco e leggero: i profumi del Mediterraneo aprono con un antipasto sfizioso, seguito da un primo ricco di sapori e un secondo delicato.',
      wine: 'Consiglio sommelier: Vermentino di Sardegna o Greco di Tufo fresco (8-10°C).'
    },
    cena: {
      advice: 'Cena di pesce elegante e ricercata: equilibrio perfetto tra la sapidità dei crostacei e la delicatezza del pescato del giorno.',
      wine: 'Consiglio sommelier: Franciacorta Satèn, Fiano di Avellino o Ribolla Gialla.'
    }
  },
  carne: {
    pranzo: {
      advice: 'Grande classico della tradizione italiana: ideale per un pranzo conviviale con antipasto rustico, primo saporito e secondo succulento.',
      wine: 'Consiglio sommelier: Chianti Classico o Barbera d\'Asti (16-18°C).'
    },
    cena: {
      advice: 'Cena ricca e avvolgente: sapori intensi con carni cotte a regola d\'arte e aromi toscani e piemontesi.',
      wine: 'Consiglio sommelier: Nebbiolo delle Langhe, Valpolicella Ripasso o Montepulciano d\'Abruzzo.'
    }
  },
  vegetariano: {
    pranzo: {
      advice: 'Menu vegetariano colorato e vivace: verdure di stagione, legumi e formaggi tipici in un equilibrio gustoso e nutriente.',
      wine: 'Consiglio sommelier: Sauvignon Blanc, Soave Classico o Rosato del Salento.'
    },
    cena: {
      advice: 'Cena green leggera ma appagante: consistenze vellutate, sapori mediterranei e facilità di digestione.',
      wine: 'Consiglio sommelier: Pinot Grigio dell\'Alto Adige o Falanghina del Sannio.'
    }
  }
};

/** Seleziona casualmente un elemento da un array */
function pickRandom<T>(arr: T[]): T | null {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Ottiene alternative compatibili per una specifica portata e tema */
export function getAlternativeDishes(
  recipes: RecipeItem[],
  course: 'Antipasti' | 'Primi' | 'Secondi',
  theme: 'carne' | 'pesce' | 'vegetariano',
  excludeId?: string
): RecipeItem[] {
  return recipes.filter(r => {
    if (r.category !== course) return false;
    if (excludeId && r.id === excludeId) return false;
    const t = classifyRecipeTheme(r);
    // Se il tema è carne o pesce, accetta anche piatti vegetariani se scarseggiano, ma privilegia il tema
    return t === theme || (theme !== 'vegetariano' && t === 'vegetariano');
  }).sort((a, b) => {
    const aMatch = classifyRecipeTheme(a) === theme ? 1 : 0;
    const bMatch = classifyRecipeTheme(b) === theme ? 1 : 0;
    return bMatch - aMatch;
  });
}

/** Genera un menu completo armonioso a 3 portate */
export function generateHarmoniousMenu(
  recipes: RecipeItem[],
  options: {
    mealType?: MealType;
    theme?: DietTheme;
    currentMenu?: {
      antipasto?: RecipeItem | null;
      primo?: RecipeItem | null;
      secondo?: RecipeItem | null;
    };
    locked?: {
      antipasto?: boolean;
      primo?: boolean;
      secondo?: boolean;
    };
  }
): HarmoniousMenu {
  const mealType = options.mealType || (new Date().getHours() < 15 ? 'pranzo' : 'cena');
  
  // Risolvi il tema: se surpreendimi, scegli random tra pesce, carne, vegetariano
  let effectiveTheme: 'carne' | 'pesce' | 'vegetariano';
  if (!options.theme || options.theme === 'sorprendimi') {
    const themes: ('carne' | 'pesce' | 'vegetariano')[] = ['pesce', 'carne', 'vegetariano'];
    effectiveTheme = themes[Math.floor(Math.random() * themes.length)];
  } else {
    effectiveTheme = options.theme;
  }

  // Se c'è un piatto bloccato, il suo tema ha priorità per armonizzare gli altri
  if (options.locked?.primo && options.currentMenu?.primo) {
    effectiveTheme = classifyRecipeTheme(options.currentMenu.primo);
  } else if (options.locked?.antipasto && options.currentMenu?.antipasto) {
    effectiveTheme = classifyRecipeTheme(options.currentMenu.antipasto);
  } else if (options.locked?.secondo && options.currentMenu?.secondo) {
    effectiveTheme = classifyRecipeTheme(options.currentMenu.secondo);
  }

  // Prepara liste di candidati per tema
  const antipastiList = getAlternativeDishes(recipes, 'Antipasti', effectiveTheme);
  const primiList = getAlternativeDishes(recipes, 'Primi', effectiveTheme);
  const secondiList = getAlternativeDishes(recipes, 'Secondi', effectiveTheme);

  // Rispetta i piatti bloccati, altrimenti scegline uno nuovo
  const antipasto = options.locked?.antipasto && options.currentMenu?.antipasto
    ? options.currentMenu.antipasto
    : pickRandom(antipastiList) || recipes.find(r => r.category === 'Antipasti') || null;

  const primo = options.locked?.primo && options.currentMenu?.primo
    ? options.currentMenu.primo
    : pickRandom(primiList) || recipes.find(r => r.category === 'Primi') || null;

  const secondo = options.locked?.secondo && options.currentMenu?.secondo
    ? options.currentMenu.secondo
    : pickRandom(secondiList) || recipes.find(r => r.category === 'Secondi') || null;

  const adviceMeta = CHEF_ADVICES[effectiveTheme][mealType];

  return {
    id: `menu_${Date.now()}`,
    mealType,
    theme: effectiveTheme,
    antipasto,
    primo,
    secondo,
    chefAdvice: adviceMeta.advice,
    wineAdvice: adviceMeta.wine
  };
}
