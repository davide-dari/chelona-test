import { SupermarketCategory } from '../types';

export interface ScrapedOffer {
  id: string;
  storeId: string;
  productName: string;
  category: SupermarketCategory;
  discountPrice: number;
  originalPrice: number;
  discountPercent: string;
  badge?: string;
  validUntil: string;
  icon: string;
  brand?: string;
}

const DATES = {
  thisWeek: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
  nextWeek: new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString().slice(0, 10),
};

export const SUPERMARKET_OFFERS_DATABASE: Record<string, ScrapedOffer[]> = {
  'acqua-e-sapone': [
    { id: 'as-1', storeId: 'acqua-e-sapone', productName: 'Dash Pods Extra Igienizzante 38 Lavaggi', category: 'pulizia', discountPrice: 8.99, originalPrice: 14.90, discountPercent: '-40%', badge: 'Sottocosto', validUntil: DATES.thisWeek, icon: '🧺', brand: 'Dash' },
    { id: 'as-2', storeId: 'acqua-e-sapone', productName: 'Coccolino Ammorbidente Concentrato 80 Lavaggi', category: 'pulizia', discountPrice: 3.49, originalPrice: 5.99, discountPercent: '-41%', badge: 'Promo', validUntil: DATES.thisWeek, icon: '🧴', brand: 'Coccolino' },
    { id: 'as-3', storeId: 'acqua-e-sapone', productName: 'Lines Seta Ultra Pacco Doppio (28 assorbenti)', category: 'igiene', discountPrice: 4.29, originalPrice: 6.80, discountPercent: '-36%', badge: 'Offerta 2x', validUntil: DATES.thisWeek, icon: '🌸', brand: 'Lines' },
    { id: 'as-4', storeId: 'acqua-e-sapone', productName: 'Pantene Shampoo Rigenera e Protegge 400ml', category: 'igiene', discountPrice: 2.99, originalPrice: 4.50, discountPercent: '-33%', badge: 'Speciale Capelli', validUntil: DATES.nextWeek, icon: '🧴', brand: 'Pantene' },
    { id: 'as-5', storeId: 'acqua-e-sapone', productName: 'Dentifricio Oral-B Pro-Expert 75ml x2', category: 'igiene', discountPrice: 3.89, originalPrice: 5.90, discountPercent: '-34%', badge: 'Bipacco', validUntil: DATES.nextWeek, icon: '🪥', brand: 'Oral-B' },
    { id: 'as-6', storeId: 'acqua-e-sapone', productName: 'Detersivo Piatti Svelto Limone 3x1 Litro', category: 'pulizia', discountPrice: 4.49, originalPrice: 7.20, discountPercent: '-37%', badge: 'Scorta', validUntil: DATES.thisWeek, icon: '🧼', brand: 'Svelto' },
  ],
  'maurys': [
    { id: 'mau-1', storeId: 'maurys', productName: 'Carta Igienica Regina Foxy Mega 12 Rotoli', category: 'pulizia', discountPrice: 4.99, originalPrice: 8.50, discountPercent: '-41%', badge: 'SuperPrezzo', validUntil: DATES.thisWeek, icon: '🧻', brand: 'Regina' },
    { id: 'mau-2', storeId: 'maurys', productName: 'Bagnoschiuma Felce Azzurra Classico 650ml', category: 'igiene', discountPrice: 1.99, originalPrice: 3.20, discountPercent: '-37%', badge: 'Promo Casa', validUntil: DATES.thisWeek, icon: '🧴', brand: 'Felce Azzurra' },
    { id: 'mau-3', storeId: 'maurys', productName: 'Detersivo Lavatrice Chanteclair Sgrassatore 1.5L', category: 'pulizia', discountPrice: 2.79, originalPrice: 4.30, discountPercent: '-35%', badge: 'Bestseller', validUntil: DATES.nextWeek, icon: '🧺', brand: 'Chanteclair' },
    { id: 'mau-4', storeId: 'maurys', productName: 'Sacchi Immondizia Maury’s Extra Resistenti 20 pezzi', category: 'pulizia', discountPrice: 0.99, originalPrice: 1.80, discountPercent: '-45%', badge: 'Prezzo Maury’s', validUntil: DATES.nextWeek, icon: '🗑️', brand: "Maury's" },
    { id: 'mau-5', storeId: 'maurys', productName: 'Deodorante Ambiente Glade Spray Automatico + Ricarica', category: 'pulizia', discountPrice: 3.99, originalPrice: 6.90, discountPercent: '-42%', badge: 'Offerta Volantino', validUntil: DATES.thisWeek, icon: '🌸', brand: 'Glade' },
  ],
  'tigota': [
    { id: 'tig-1', storeId: 'tigota', productName: 'Neutro Roberts Bagnodoccia Idratante 450ml', category: 'igiene', discountPrice: 1.89, originalPrice: 3.10, discountPercent: '-39%', badge: 'Volantino Tigotà', validUntil: DATES.thisWeek, icon: '🧴', brand: 'Neutro Roberts' },
    { id: 'tig-2', storeId: 'tigota', productName: 'Ace Gentile Candeggina Candeggina Delicata 2L', category: 'pulizia', discountPrice: 2.39, originalPrice: 3.80, discountPercent: '-37%', badge: 'Offerta Casa', validUntil: DATES.thisWeek, icon: '🧼', brand: 'Ace' },
    { id: 'tig-3', storeId: 'tigota', productName: 'Nivea Crema Corpo Nutriente 400ml', category: 'igiene', discountPrice: 3.49, originalPrice: 5.50, discountPercent: '-36%', badge: 'Sconto 35%', validUntil: DATES.nextWeek, icon: '🧴', brand: 'Nivea' },
    { id: 'tig-4', storeId: 'tigota', productName: 'Swiffer Duster Kit Starter 5 Piumini', category: 'pulizia', discountPrice: 3.99, originalPrice: 6.20, discountPercent: '-35%', badge: 'Promo', validUntil: DATES.nextWeek, icon: '🧹', brand: 'Swiffer' },
  ],
  'esselunga': [
    { id: 'es-1', storeId: 'esselunga', productName: 'Olio Extra Vergine di Oliva Monini 1L', category: 'dispensa', discountPrice: 7.49, originalPrice: 11.90, discountPercent: '-37%', badge: 'Fidaty Sconto 40%', validUntil: DATES.thisWeek, icon: '🫒', brand: 'Monini' },
    { id: 'es-2', storeId: 'esselunga', productName: 'Pasta Barilla Formati Assortiti 500g', category: 'dispensa', discountPrice: 0.69, originalPrice: 1.15, discountPercent: '-40%', badge: 'Prezzo Corto', validUntil: DATES.thisWeek, icon: '🍝', brand: 'Barilla' },
    { id: 'es-3', storeId: 'esselunga', productName: 'Caffè Lavazza Qualità Rossa 4x250g', category: 'dispensa', discountPrice: 7.99, originalPrice: 12.50, discountPercent: '-36%', badge: 'Fidaty', validUntil: DATES.nextWeek, icon: '☕', brand: 'Lavazza' },
    { id: 'es-4', storeId: 'esselunga', productName: 'Filetti di Orata Fresca Esselunga 400g', category: 'carne-pesce', discountPrice: 6.90, originalPrice: 9.80, discountPercent: '-30%', badge: 'Reparto Pescheria', validUntil: DATES.thisWeek, icon: '🐟', brand: 'Esselunga' },
    { id: 'es-5', storeId: 'esselunga', productName: 'Mozzarella Santa Lucia Galbani 3x125g', category: 'latticini-uova', discountPrice: 2.49, originalPrice: 3.99, discountPercent: '-37%', badge: 'Prezzo Corto', validUntil: DATES.nextWeek, icon: '🧀', brand: 'Galbani' },
  ],
  'coop': [
    { id: 'coop-1', storeId: 'coop', productName: 'Parmigiano Reggiano DOP 24 Mesi Coop 500g', category: 'latticini-uova', discountPrice: 6.99, originalPrice: 9.90, discountPercent: '-30%', badge: 'Offerta Soci Coop', validUntil: DATES.thisWeek, icon: '🧀', brand: 'Coop' },
    { id: 'coop-2', storeId: 'coop', productName: 'Passata di Pomodoro Mutti 700g', category: 'dispensa', discountPrice: 0.99, originalPrice: 1.55, discountPercent: '-36%', badge: 'Sottocosto', validUntil: DATES.thisWeek, icon: '🍅', brand: 'Mutti' },
    { id: 'coop-3', storeId: 'coop', productName: 'Prosciutto Cotto Alta Qualità Origine Coop 120g', category: 'carne-pesce', discountPrice: 2.19, originalPrice: 3.20, discountPercent: '-31%', badge: 'Origine Coop', validUntil: DATES.nextWeek, icon: '🥓', brand: 'Coop' },
    { id: 'coop-4', storeId: 'coop', productName: 'Acqua Naturale San Benedetto 6x1.5L', category: 'bevande', discountPrice: 1.89, originalPrice: 3.00, discountPercent: '-37%', badge: 'Promo', validUntil: DATES.nextWeek, icon: '💧', brand: 'San Benedetto' },
  ],
  'conad': [
    { id: 'con-1', storeId: 'conad', productName: 'Tonno Rio Mare all’Olio di Oliva 8x80g', category: 'dispensa', discountPrice: 7.89, originalPrice: 11.90, discountPercent: '-34%', badge: 'Conad Carta Insieme', validUntil: DATES.thisWeek, icon: '🐟', brand: 'Rio Mare' },
    { id: 'con-2', storeId: 'conad', productName: 'Biscotti Mulino Bianco Pan di Stelle 700g', category: 'pane-pasticceria', discountPrice: 2.69, originalPrice: 3.99, discountPercent: '-32%', badge: 'Offerte Bis', validUntil: DATES.thisWeek, icon: '🍪', brand: 'Mulino Bianco' },
    { id: 'con-3', storeId: 'conad', productName: 'Petto di Pollo a Fette Verso Natura Conad 400g', category: 'carne-pesce', discountPrice: 4.49, originalPrice: 6.20, discountPercent: '-27%', badge: 'Verso Natura', validUntil: DATES.nextWeek, icon: '🍗', brand: 'Conad' },
  ],
  'eurospin': [
    { id: 'eur-1', storeId: 'eurospin', productName: 'Prosciutto di Parma DOP Amo Essere 100g', category: 'carne-pesce', discountPrice: 2.29, originalPrice: 3.10, discountPercent: '-26%', badge: 'Amo Essere Eccellenza', validUntil: DATES.thisWeek, icon: '🥓', brand: 'Eurospin' },
    { id: 'eur-2', storeId: 'eurospin', productName: 'Latte UHT Parzialmente Scremato Land 1L', category: 'latticini-uova', discountPrice: 0.79, originalPrice: 1.10, discountPercent: '-28%', badge: 'Prezzo Ok', validUntil: DATES.thisWeek, icon: '🥛', brand: 'Land' },
    { id: 'eur-3', storeId: 'eurospin', productName: 'Pizza Margherita Surgelata Tre Mulini x3', category: 'dispensa', discountPrice: 3.49, originalPrice: 4.90, discountPercent: '-28%', badge: 'Tre Mulini', validUntil: DATES.nextWeek, icon: '🍕', brand: 'Tre Mulini' },
  ],
  'lidl': [
    { id: 'lid-1', storeId: 'lidl', productName: 'Formaggio Grana Padano DOP Italiamo 300g', category: 'latticini-uova', discountPrice: 3.69, originalPrice: 4.99, discountPercent: '-26%', badge: 'Lidl Plus', validUntil: DATES.thisWeek, icon: '🧀', brand: 'Italiamo' },
    { id: 'lid-2', storeId: 'lidl', productName: 'Birra Peroni 6x33cl', category: 'bevande', discountPrice: 3.49, originalPrice: 4.90, discountPercent: '-28%', badge: 'Super Offerta', validUntil: DATES.thisWeek, icon: '🍺', brand: 'Peroni' },
    { id: 'lid-3', storeId: 'lidl', productName: 'Gelato Gelatelli Coni Panna e Cioccolato 6 pezzi', category: 'latticini-uova', discountPrice: 1.99, originalPrice: 2.99, discountPercent: '-33%', badge: 'Speciale Estate', validUntil: DATES.nextWeek, icon: '🍦', brand: 'Gelatelli' },
  ],
  'md': [
    { id: 'md-1', storeId: 'md', productName: 'Caffè Espresso in Grani Karisma 1Kg', category: 'dispensa', discountPrice: 5.99, originalPrice: 8.90, discountPercent: '-32%', badge: 'Prezzo MD', validUntil: DATES.thisWeek, icon: '☕', brand: 'Karisma' },
    { id: 'md-2', storeId: 'md', productName: 'Detersivo Piatti Dat5 Limone 1.25L', category: 'pulizia', discountPrice: 0.99, originalPrice: 1.50, discountPercent: '-34%', badge: 'Convenienza', validUntil: DATES.thisWeek, icon: '🧼', brand: 'Dat5' },
  ],
  'deco': [
    { id: 'dec-1', storeId: 'deco', productName: 'Mozzarella di Bufala Campana DOP Decò 250g', category: 'latticini-uova', discountPrice: 2.49, originalPrice: 3.60, discountPercent: '-30%', badge: 'Sapori di Sicilia', validUntil: DATES.thisWeek, icon: '🧀', brand: 'Decò' },
    { id: 'dec-2', storeId: 'deco', productName: 'Olio di Semi di Girasole Decò 1L', category: 'dispensa', discountPrice: 1.39, originalPrice: 1.99, discountPercent: '-30%', badge: 'Volantino Decò', validUntil: DATES.thisWeek, icon: '🛢️', brand: 'Decò' },
  ],
  'risparmio-casa': [
    { id: 'rc-1', storeId: 'risparmio-casa', productName: 'Detersivo Lavatrice Dash Polvere 100 Misurini', category: 'pulizia', discountPrice: 13.90, originalPrice: 22.00, discountPercent: '-36%', badge: 'Maxi Risparmio', validUntil: DATES.thisWeek, icon: '🧺', brand: 'Dash' },
    { id: 'rc-2', storeId: 'risparmio-casa', productName: 'Carta Casa Tuttofare 6 Rotoli', category: 'pulizia', discountPrice: 2.99, originalPrice: 4.80, discountPercent: '-37%', badge: 'Sottocosto Casa', validUntil: DATES.thisWeek, icon: '🧻', brand: 'Risparmio Casa' },
  ],
  'ins': [
    { id: 'ins-1', storeId: 'ins', productName: 'Riso Basmati Bio In’s 1Kg', category: 'dispensa', discountPrice: 1.79, originalPrice: 2.40, discountPercent: '-25%', badge: 'Bio IN’s', validUntil: DATES.thisWeek, icon: '🍚', brand: "IN's" },
    { id: 'ins-2', storeId: 'ins', productName: 'Succo di Frutta 100% Arancia In’s 1L', category: 'bevande', discountPrice: 0.99, originalPrice: 1.45, discountPercent: '-31%', badge: 'Prezzo In’s', validUntil: DATES.thisWeek, icon: '🧃', brand: "IN's" },
  ]
};

export function getScrapedFlyerOffers(storeId: string): ScrapedOffer[] {
  if (storeId in SUPERMARKET_OFFERS_DATABASE) {
    return SUPERMARKET_OFFERS_DATABASE[storeId];
  }
  // Generic fallback scraped offers generator for any store ID
  return [
    { id: `${storeId}-gen-1`, storeId, productName: 'Pasta Integrale 500g', category: 'dispensa', discountPrice: 0.79, originalPrice: 1.29, discountPercent: '-38%', badge: 'Volantino', validUntil: DATES.thisWeek, icon: '🍝' },
    { id: `${storeId}-gen-2`, storeId, productName: 'Latte UHT 1L', category: 'latticini-uova', discountPrice: 0.89, originalPrice: 1.25, discountPercent: '-28%', badge: 'Promo', validUntil: DATES.thisWeek, icon: '🥛' },
    { id: `${storeId}-gen-3`, storeId, productName: 'Olio Extra Vergine 1L', category: 'dispensa', discountPrice: 7.99, originalPrice: 11.50, discountPercent: '-30%', badge: 'Offerta', validUntil: DATES.nextWeek, icon: '🫒' },
    { id: `${storeId}-gen-4`, storeId, productName: 'Detersivo Piatti Concentrato 1L', category: 'pulizia', discountPrice: 1.29, originalPrice: 1.99, discountPercent: '-35%', badge: 'Sottocosto', validUntil: DATES.nextWeek, icon: '🧼' },
  ];
}
