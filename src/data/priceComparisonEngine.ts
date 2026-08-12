/**
 * Price Comparison Engine — Motore di confronto prezzi tra supermercati.
 *
 * Unisce i dati di:
 *   - volantinoOffers.ts  → matrice prezzi base (40+ prodotti × 18 catene)
 *   - flyerScraper.ts     → offerte promozionali attive con sconti (12 catene)
 *
 * Espone funzioni per cercare, confrontare e classificare i prezzi.
 */

import { VOLANTINO_STORES, PRODUCT_BRANDS, DEFAULT_VOLANTINO_OFFERS } from './volantinoOffers';
import { SUPERMARKET_OFFERS_DATABASE, type ScrapedOffer } from './flyerScraper';
import { ITALIAN_SUPERMARKETS } from './italianSupermarkets';
import type { SupermarketCategory } from '../types';

/* ────────────────── Interfaces ────────────────── */

export interface ProductPrice {
  storeId: string;
  storeName: string;
  price: number;
  originalPrice?: number;
  discountPercent?: string;
  isPromo: boolean;
  badge?: string;
  validUntil?: string;
}

export interface ComparisonResult {
  productName: string;
  quantity: string;
  brand?: string;
  emoji: string;
  category: ProductCategory;
  prices: ProductPrice[];
  bestPrice: number;
  bestStore: string;
  bestStoreName: string;
  worstPrice: number;
  savings: number;          // bestPrice - worstPrice (negative = you save)
  savingsPercent: number;   // percentage difference
}

export interface BasketComparison {
  storeId: string;
  storeName: string;
  total: number;
  itemCount: number;
  missingItems: string[];
}

export type ProductCategory =
  | 'latticini'
  | 'pasta-riso'
  | 'carne-pesce'
  | 'frutta-verdura'
  | 'dispensa'
  | 'bevande'
  | 'pulizia'
  | 'igiene'
  | 'pane'
  | 'altro';

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  'latticini': '🧀 Latticini & Uova',
  'pasta-riso': '🍝 Pasta & Riso',
  'carne-pesce': '🥩 Carne & Pesce',
  'frutta-verdura': '🍎 Frutta & Verdura',
  'dispensa': '🫒 Dispensa',
  'bevande': '🥤 Bevande',
  'pulizia': '🧹 Casa & Pulizia',
  'igiene': '🧴 Igiene Personale',
  'pane': '🍞 Pane & Dolci',
  'altro': '📦 Altro',
};

export const PRODUCT_CATEGORY_EMOJI: Record<ProductCategory, string> = {
  'latticini': '🧀',
  'pasta-riso': '🍝',
  'carne-pesce': '🥩',
  'frutta-verdura': '🍎',
  'dispensa': '🫒',
  'bevande': '🥤',
  'pulizia': '🧹',
  'igiene': '🧴',
  'pane': '🍞',
  'altro': '📦',
};

/* ────────────────── Product Emoji Map ────────────────── */

const PRODUCT_EMOJI: Record<string, string> = {
  'Latte intero': '🥛', 'Uova': '🥚', 'Pane in cassetta': '🍞',
  'Spaghetti': '🍝', 'Penne rigate': '🍝', 'Riso Carnaroli': '🍚',
  'Passata di pomodoro': '🍅', 'Pomodori pelati': '🍅',
  'Olio extravergine di oliva': '🫒', 'Tonno in scatola': '🐟',
  'Mozzarella': '🧀', 'Parmigiano Reggiano': '🧀',
  'Yogurt bianco': '🫙', 'Burro': '🧈',
  'Petto di pollo': '🍗', 'Filetto di salmone': '🐟',
  'Macinato di manzo': '🥩', 'Prosciutto cotto': '🥓',
  'Bresaola': '🥓', 'Banana': '🍌', 'Mele Golden': '🍎',
  'Arancia': '🍊', 'Patate': '🥔', 'Pomodori cuore di bue': '🍅',
  'Insalata iceberg': '🥬', 'Carote': '🥕',
  'Caffè macinato': '☕', 'Zucchero': '🍚', 'Farina 00': '🌾',
  'Fette biscottate': '🍞', 'Biscotti secchi': '🍪',
  'Cioccolato fondente': '🍫', 'Nutella': '🍫',
  'Acqua minerale': '💧', 'Bibita cola': '🥤', 'Birra': '🍺',
  'Detersivo piatti': '🧼', 'Carta igienica': '🧻',
  'Dentifricio': '🪥', 'Scottex': '🧻', 'Sapone mani': '🧴',
};

/* ────────────────── Product Category Classification ────────────────── */

function classifyProduct(name: string): ProductCategory {
  const t = name.toLowerCase();
  if (/(latte|mozzarell|parmigian|grana|yogurt|burro|formaggi|uova|uovo|ricott|panna|stracchin|gorgonzol|pecorino|provolone|scamorza|fontina|emmental|brie|feta|mascarpone|sottilette)/i.test(t)) return 'latticini';
  if (/(spaghetti|penne|pasta|riso|fusilli|farfalle|rigatoni|linguine|tagliatelle|orecchiette|lasagne|bucatini|gnocchi)/i.test(t)) return 'pasta-riso';
  if (/(pollo|salmone|manzo|macinato|prosciutt|bresaola|tonno|carne|pesce|tacchin|vitello|agnello|salsiccia|salame|speck|mortadell|wurstel|gamberi)/i.test(t)) return 'carne-pesce';
  if (/(banana|mela|arancia|patata|pomodor|insalata|carota|fragol|pera|pesca|limone|kiwi|uva|zucchina|peperone|cipoll|aglio|broccol|spinaci|funghi|cetriolo|finocchio|sedano)/i.test(t)) return 'frutta-verdura';
  if (/(caffè|caffe|zucchero|farina|olio|aceto|passata|pelati|nutella|cioccolato|miele|marmellata|legumi|lenticchie|ceci|fagioli|surgelat|dadi|brodo|semi)/i.test(t)) return 'dispensa';
  if (/(acqua|birra|vino|succo|cola|bibita|aranciata|spumante|prosecco|champagne|gassosa|tonica|energy)/i.test(t)) return 'bevande';
  if (/(detersivo|candeggina|carta igienica|scottex|ammorbidente|sapone|spugna|sacchett|igienizzante)/i.test(t)) return 'pulizia';
  if (/(dentifricio|shampoo|balsamo|deodorante|bagnoschiuma|crema|fazzoletti|pannolini|assorbenti|rasoio)/i.test(t)) return 'igiene';
  if (/(pane|focaccia|biscott|fette biscottate|croissant|brioche|crackers|grissini|torta|merendine)/i.test(t)) return 'pane';
  return 'altro';
}

/* ────────────────── Normalize for search ────────────────── */

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/* ────────────────── Build Unified Price Database ────────────────── */

interface RawPriceEntry {
  productName: string;
  quantity: string;
  storeId: string;
  price: number;
  originalPrice?: number;
  discountPercent?: string;
  isPromo: boolean;
  badge?: string;
  validUntil?: string;
  brand?: string;
}

function getStoreName(storeId: string): string {
  const vs = VOLANTINO_STORES.find(s => s.id === storeId);
  if (vs) return vs.label;
  const is = ITALIAN_SUPERMARKETS.find(s => s.id === storeId);
  if (is) return is.label;
  return storeId.charAt(0).toUpperCase() + storeId.slice(1);
}

/** Build the complete price database from all sources */
function buildPriceDatabase(): RawPriceEntry[] {
  const entries: RawPriceEntry[] = [];

  // 1) Import from volantinoOffers DEMO matrix (base prices)
  for (const offer of DEFAULT_VOLANTINO_OFFERS) {
    entries.push({
      productName: offer.productName,
      quantity: offer.quantity || '',
      storeId: offer.storeId,
      price: offer.price,
      isPromo: false,
      brand: offer.brand,
    });
  }

  // 2) Import from flyerScraper (promo prices — these override base prices)
  for (const [storeId, offers] of Object.entries(SUPERMARKET_OFFERS_DATABASE)) {
    for (const offer of offers as ScrapedOffer[]) {
      entries.push({
        productName: offer.productName,
        quantity: '',
        storeId,
        price: offer.discountPrice,
        originalPrice: offer.originalPrice,
        discountPercent: offer.discountPercent,
        isPromo: true,
        badge: offer.badge,
        validUntil: offer.validUntil,
        brand: offer.brand,
      });
    }
  }

  return entries;
}

// Cache the database
let _priceDB: RawPriceEntry[] | null = null;
function getPriceDB(): RawPriceEntry[] {
  if (!_priceDB) _priceDB = buildPriceDatabase();
  return _priceDB;
}

/** Group entries by normalized product name */
function groupByProduct(): Map<string, RawPriceEntry[]> {
  const db = getPriceDB();
  const map = new Map<string, RawPriceEntry[]>();

  for (const entry of db) {
    const key = norm(entry.productName);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }

  return map;
}

let _grouped: Map<string, RawPriceEntry[]> | null = null;
function getGrouped(): Map<string, RawPriceEntry[]> {
  if (!_grouped) _grouped = groupByProduct();
  return _grouped;
}

/* ────────────────── Core Functions ────────────────── */

function entriesToComparison(productName: string, entries: RawPriceEntry[]): ComparisonResult {
  // Deduplicate: for same store, prefer promo price (lower price)
  const storeMap = new Map<string, RawPriceEntry>();
  for (const e of entries) {
    const existing = storeMap.get(e.storeId);
    if (!existing || e.price < existing.price) {
      storeMap.set(e.storeId, e);
    }
  }

  const prices: ProductPrice[] = Array.from(storeMap.values())
    .map(e => ({
      storeId: e.storeId,
      storeName: getStoreName(e.storeId),
      price: e.price,
      originalPrice: e.originalPrice,
      discountPercent: e.discountPercent,
      isPromo: e.isPromo,
      badge: e.badge,
      validUntil: e.validUntil,
    }))
    .sort((a, b) => a.price - b.price);

  const best = prices[0];
  const worst = prices[prices.length - 1];
  const qty = entries.find(e => e.quantity)?.quantity || '';
  const brand = entries.find(e => e.brand)?.brand || PRODUCT_BRANDS[productName];

  return {
    productName,
    quantity: qty,
    brand,
    emoji: PRODUCT_EMOJI[productName] || '🛒',
    category: classifyProduct(productName),
    prices,
    bestPrice: best?.price || 0,
    bestStore: best?.storeId || '',
    bestStoreName: best?.storeName || '',
    worstPrice: worst?.price || 0,
    savings: worst && best ? worst.price - best.price : 0,
    savingsPercent: worst && best && worst.price > 0 ? Math.round(((worst.price - best.price) / worst.price) * 100) : 0,
  };
}

/**
 * Compare prices for a specific product across all stores.
 */
export function compareProduct(name: string): ComparisonResult | null {
  const grouped = getGrouped();
  const key = norm(name);
  const entries = grouped.get(key);
  if (!entries || entries.length === 0) return null;
  return entriesToComparison(name, entries);
}

/**
 * Search products matching a query, return results sorted by best price.
 */
export function searchProducts(query: string, limit = 20): ComparisonResult[] {
  const grouped = getGrouped();
  const q = norm(query);
  if (q.length < 2) return [];

  const results: ComparisonResult[] = [];
  for (const [key, entries] of grouped) {
    if (key.includes(q) || entries.some(e => (e.brand && norm(e.brand).includes(q)))) {
      const name = entries[0].productName;
      results.push(entriesToComparison(name, entries));
    }
  }

  return results.sort((a, b) => a.bestPrice - b.bestPrice).slice(0, limit);
}

/**
 * Get all unique products with their comparison results.
 */
export function getAllProducts(): ComparisonResult[] {
  const grouped = getGrouped();
  const results: ComparisonResult[] = [];
  const seen = new Set<string>();

  for (const [key, entries] of grouped) {
    if (seen.has(key)) continue;
    seen.add(key);
    const name = entries[0].productName;
    results.push(entriesToComparison(name, entries));
  }

  return results.sort((a, b) => a.productName.localeCompare(b.productName, 'it'));
}

/**
 * Get products filtered by category.
 */
export function getProductsByCategory(category: ProductCategory): ComparisonResult[] {
  return getAllProducts().filter(p => p.category === category);
}

/**
 * Get top deals — products with the highest savings percentage.
 */
export function getTopDeals(limit = 10): ComparisonResult[] {
  return getAllProducts()
    .filter(p => p.prices.length >= 2 && p.savings > 0)
    .sort((a, b) => b.savingsPercent - a.savingsPercent)
    .slice(0, limit);
}

/**
 * Get flash deals — promo offers with highest discounts.
 */
export function getFlashDeals(limit = 8): ComparisonResult[] {
  const db = getPriceDB();
  const promos = db.filter(e => e.isPromo && e.originalPrice && e.discountPercent);

  // Group promos by product
  const grouped = new Map<string, RawPriceEntry[]>();
  for (const e of promos) {
    const key = norm(e.productName);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  }

  const results: ComparisonResult[] = [];
  for (const [, entries] of grouped) {
    results.push(entriesToComparison(entries[0].productName, entries));
  }

  return results
    .sort((a, b) => {
      const aDisc = Math.abs(parseInt(a.prices[0]?.discountPercent || '0'));
      const bDisc = Math.abs(parseInt(b.prices[0]?.discountPercent || '0'));
      return bDisc - aDisc;
    })
    .slice(0, limit);
}

/**
 * Compare a basket of products — find the cheapest store for the whole basket.
 */
export function compareBestBasket(productNames: string[]): BasketComparison[] {
  const allStoreIds = new Set<string>();
  const comparisons: ComparisonResult[] = [];

  for (const name of productNames) {
    const comp = compareProduct(name);
    if (comp) {
      comparisons.push(comp);
      comp.prices.forEach(p => allStoreIds.add(p.storeId));
    }
  }

  const results: BasketComparison[] = [];
  for (const storeId of allStoreIds) {
    let total = 0;
    let itemCount = 0;
    const missing: string[] = [];

    for (const comp of comparisons) {
      const price = comp.prices.find(p => p.storeId === storeId);
      if (price) {
        total += price.price;
        itemCount++;
      } else {
        missing.push(comp.productName);
      }
    }

    results.push({
      storeId,
      storeName: getStoreName(storeId),
      total: Math.round(total * 100) / 100,
      itemCount,
      missingItems: missing,
    });
  }

  return results.sort((a, b) => {
    // Prefer stores with more items, then cheaper
    if (a.itemCount !== b.itemCount) return b.itemCount - a.itemCount;
    return a.total - b.total;
  });
}

/**
 * Get stats for a specific store.
 */
export function getStoreStats(storeId: string): {
  totalProducts: number;
  promoProducts: number;
  avgSavings: number;
  bestDealsCount: number;
} {
  const db = getPriceDB();
  const storeEntries = db.filter(e => e.storeId === storeId);
  const promos = storeEntries.filter(e => e.isPromo);

  // Count how many products this store is the cheapest for
  const all = getAllProducts();
  const bestDeals = all.filter(p => p.bestStore === storeId);

  // Average savings from promos
  let totalDiscount = 0;
  let discountCount = 0;
  for (const p of promos) {
    if (p.originalPrice && p.price < p.originalPrice) {
      totalDiscount += ((p.originalPrice - p.price) / p.originalPrice) * 100;
      discountCount++;
    }
  }

  return {
    totalProducts: storeEntries.length,
    promoProducts: promos.length,
    avgSavings: discountCount > 0 ? Math.round(totalDiscount / discountCount) : 0,
    bestDealsCount: bestDeals.length,
  };
}

/**
 * Get all available category options (only those that have products).
 */
export function getAvailableCategories(): { id: ProductCategory; label: string; emoji: string; count: number }[] {
  const all = getAllProducts();
  const counts = new Map<ProductCategory, number>();
  for (const p of all) {
    counts.set(p.category, (counts.get(p.category) || 0) + 1);
  }
  return (Object.keys(PRODUCT_CATEGORY_LABELS) as ProductCategory[])
    .filter(cat => counts.has(cat))
    .map(cat => ({
      id: cat,
      label: PRODUCT_CATEGORY_LABELS[cat],
      emoji: PRODUCT_CATEGORY_EMOJI[cat],
      count: counts.get(cat) || 0,
    }));
}

/**
 * Invalidate cache (call when data changes).
 */
export function invalidateCache(): void {
  _priceDB = null;
  _grouped = null;
}
