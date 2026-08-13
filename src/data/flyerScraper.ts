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
    { id: 'as-7', storeId: 'acqua-e-sapone', productName: 'Chanteclair Sgrassatore Universale Marsiglia 600ml', category: 'pulizia', discountPrice: 1.99, originalPrice: 3.10, discountPercent: '-35%', badge: 'Convenienza', validUntil: DATES.nextWeek, icon: '🧼', brand: 'Chanteclair' },
    { id: 'as-8', storeId: 'acqua-e-sapone', productName: 'Gillette Mach3 Ricariche 8 Pezzi', category: 'igiene', discountPrice: 14.90, originalPrice: 21.50, discountPercent: '-30%', badge: 'Offerta', validUntil: DATES.thisWeek, icon: '🪒', brand: 'Gillette' },
    { id: 'as-9', storeId: 'acqua-e-sapone', productName: 'Vileda SuperMocio Fiocco', category: 'pulizia', discountPrice: 3.49, originalPrice: 5.50, discountPercent: '-36%', badge: 'Promo Casa', validUntil: DATES.thisWeek, icon: '🧹', brand: 'Vileda' },
    { id: 'as-10', storeId: 'acqua-e-sapone', productName: 'Infasil Deodorante Spray Neutro 150ml', category: 'igiene', discountPrice: 2.29, originalPrice: 3.50, discountPercent: '-34%', badge: 'Volantino', validUntil: DATES.thisWeek, icon: '🌸', brand: 'Infasil' },
  ],
  'esselunga': [
    { id: 'es-1', storeId: 'esselunga', productName: 'Olio Extra Vergine di Oliva Monini 1L', category: 'dispensa', discountPrice: 7.49, originalPrice: 11.90, discountPercent: '-37%', badge: 'Fidaty Sconto 40%', validUntil: DATES.thisWeek, icon: '🫒', brand: 'Monini' },
    { id: 'es-2', storeId: 'esselunga', productName: 'Pasta Barilla Formati Assortiti 500g', category: 'dispensa', discountPrice: 0.69, originalPrice: 1.15, discountPercent: '-40%', badge: 'Prezzo Corto', validUntil: DATES.thisWeek, icon: '🍝', brand: 'Barilla' },
    { id: 'es-3', storeId: 'esselunga', productName: 'Caffè Lavazza Qualità Rossa 4x250g', category: 'dispensa', discountPrice: 7.99, originalPrice: 12.50, discountPercent: '-36%', badge: 'Fidaty', validUntil: DATES.nextWeek, icon: '☕', brand: 'Lavazza' },
    { id: 'es-4', storeId: 'esselunga', productName: 'Filetti di Orata Fresca Esselunga 400g', category: 'carne-pesce', discountPrice: 6.90, originalPrice: 9.80, discountPercent: '-30%', badge: 'Reparto Pescheria', validUntil: DATES.thisWeek, icon: '🐟', brand: 'Esselunga' },
    { id: 'es-5', storeId: 'esselunga', productName: 'Mozzarella Santa Lucia Galbani 3x125g', category: 'latticini-uova', discountPrice: 2.49, originalPrice: 3.99, discountPercent: '-37%', badge: 'Prezzo Corto', validUntil: DATES.nextWeek, icon: '🧀', brand: 'Galbani' },
    { id: 'es-6', storeId: 'esselunga', productName: 'Petto di Pollo a Fette 400g', category: 'carne-pesce', discountPrice: 4.50, originalPrice: 6.80, discountPercent: '-33%', badge: 'Amici Animali', validUntil: DATES.thisWeek, icon: '🍗', brand: 'Naturama' },
    { id: 'es-7', storeId: 'esselunga', productName: 'Yogurt Greco Fage Total 0% 170g', category: 'latticini-uova', discountPrice: 1.25, originalPrice: 1.80, discountPercent: '-30%', badge: 'Fidaty', validUntil: DATES.thisWeek, icon: '🥛', brand: 'Fage' },
    { id: 'es-8', storeId: 'esselunga', productName: 'Acqua Naturale Levissima 6x1.5L', category: 'bevande', discountPrice: 1.98, originalPrice: 3.30, discountPercent: '-40%', badge: 'Prezzo Corto', validUntil: DATES.thisWeek, icon: '💧', brand: 'Levissima' },
    { id: 'es-9', storeId: 'esselunga', productName: 'Passata di Pomodoro Mutti 700g', category: 'dispensa', discountPrice: 1.15, originalPrice: 1.65, discountPercent: '-30%', badge: 'Fidaty', validUntil: DATES.nextWeek, icon: '🍅', brand: 'Mutti' },
    { id: 'es-10', storeId: 'esselunga', productName: 'Carta Igienica Scottonelle 12 Rotoli', category: 'pulizia', discountPrice: 4.89, originalPrice: 7.50, discountPercent: '-34%', badge: 'Prezzo Corto', validUntil: DATES.thisWeek, icon: '🧻', brand: 'Scottex' },
    { id: 'es-11', storeId: 'esselunga', productName: 'Birra Moretti Ricetta Originale 3x33cl', category: 'bevande', discountPrice: 2.19, originalPrice: 3.30, discountPercent: '-33%', badge: 'Sconto 30%', validUntil: DATES.nextWeek, icon: '🍺', brand: 'Birra Moretti' },
    { id: 'es-12', storeId: 'esselunga', productName: 'Uova Fresche Grandi Allevate a Terra x6', category: 'latticini-uova', discountPrice: 1.59, originalPrice: 2.20, discountPercent: '-27%', badge: 'Esselunga Bio', validUntil: DATES.thisWeek, icon: '🥚', brand: 'Esselunga' },
    { id: 'es-13', storeId: 'esselunga', productName: 'Salmone Affumicato Scozzese 100g', category: 'carne-pesce', discountPrice: 4.90, originalPrice: 7.50, discountPercent: '-34%', badge: 'Eccellenze', validUntil: DATES.thisWeek, icon: '🐟', brand: 'Esselunga Top' },
    { id: 'es-14', storeId: 'esselunga', productName: 'Biscotti Gocciole Pavesi 500g', category: 'dispensa', discountPrice: 1.99, originalPrice: 2.95, discountPercent: '-32%', badge: 'Prezzo Corto', validUntil: DATES.nextWeek, icon: '🍪', brand: 'Pavesi' },
    { id: 'es-15', storeId: 'esselunga', productName: 'Detersivo Lavatrice Dash Liquido 27 Lavaggi', category: 'pulizia', discountPrice: 5.49, originalPrice: 8.90, discountPercent: '-38%', badge: 'Fidaty', validUntil: DATES.thisWeek, icon: '🧺', brand: 'Dash' },
  ],
  'coop': [
    { id: 'coop-1', storeId: 'coop', productName: 'Parmigiano Reggiano DOP 24 Mesi Coop 500g', category: 'latticini-uova', discountPrice: 6.99, originalPrice: 9.90, discountPercent: '-30%', badge: 'Offerta Soci Coop', validUntil: DATES.thisWeek, icon: '🧀', brand: 'Coop' },
    { id: 'coop-2', storeId: 'coop', productName: 'Passata di Pomodoro Mutti 700g', category: 'dispensa', discountPrice: 0.99, originalPrice: 1.55, discountPercent: '-36%', badge: 'Sottocosto', validUntil: DATES.thisWeek, icon: '🍅', brand: 'Mutti' },
    { id: 'coop-3', storeId: 'coop', productName: 'Prosciutto Cotto Alta Qualità Origine Coop 120g', category: 'carne-pesce', discountPrice: 2.19, originalPrice: 3.20, discountPercent: '-31%', badge: 'Origine Coop', validUntil: DATES.nextWeek, icon: '🥓', brand: 'Coop' },
    { id: 'coop-4', storeId: 'coop', productName: 'Acqua Naturale San Benedetto 6x1.5L', category: 'bevande', discountPrice: 1.89, originalPrice: 3.00, discountPercent: '-37%', badge: 'Promo', validUntil: DATES.nextWeek, icon: '💧', brand: 'San Benedetto' },
    { id: 'coop-5', storeId: 'coop', productName: 'Latte Parzialmente Scremato UHT Granarolo 1L', category: 'latticini-uova', discountPrice: 1.05, originalPrice: 1.50, discountPercent: '-30%', badge: 'Offerta', validUntil: DATES.thisWeek, icon: '🥛', brand: 'Granarolo' },
    { id: 'coop-6', storeId: 'coop', productName: 'Biscotti Mulino Bianco Macine 800g', category: 'dispensa', discountPrice: 2.89, originalPrice: 4.20, discountPercent: '-31%', badge: 'Soci Coop', validUntil: DATES.thisWeek, icon: '🍪', brand: 'Mulino Bianco' },
    { id: 'coop-7', storeId: 'coop', productName: 'Tonno all\'Olio di Oliva Rio Mare 6x80g', category: 'dispensa', discountPrice: 5.99, originalPrice: 8.90, discountPercent: '-32%', badge: 'Convenienza', validUntil: DATES.nextWeek, icon: '🐟', brand: 'Rio Mare' },
    { id: 'coop-8', storeId: 'coop', productName: 'Coca-Cola Zero 4x33cl', category: 'bevande', discountPrice: 2.49, originalPrice: 3.60, discountPercent: '-30%', badge: 'Promo', validUntil: DATES.thisWeek, icon: '🥤', brand: 'Coca-Cola' },
    { id: 'coop-9', storeId: 'coop', productName: 'Orata Intera Fresca al Kg', category: 'carne-pesce', discountPrice: 8.90, originalPrice: 12.90, discountPercent: '-31%', badge: 'Pescato', validUntil: DATES.thisWeek, icon: '🐟', brand: 'Coop' },
    { id: 'coop-10', storeId: 'coop', productName: 'Carta Igienica Tenderly 12 Rotoli', category: 'pulizia', discountPrice: 3.99, originalPrice: 6.50, discountPercent: '-38%', badge: 'Soci Coop', validUntil: DATES.nextWeek, icon: '🧻', brand: 'Tenderly' },
    { id: 'coop-11', storeId: 'coop', productName: 'Dentifricio Mentadent P 75ml', category: 'igiene', discountPrice: 1.49, originalPrice: 2.50, discountPercent: '-40%', badge: 'Offerta', validUntil: DATES.thisWeek, icon: '🪥', brand: 'Mentadent' },
    { id: 'coop-12', storeId: 'coop', productName: 'Birra Ichnusa Non Filtrata 50cl', category: 'bevande', discountPrice: 1.19, originalPrice: 1.80, discountPercent: '-33%', badge: 'Soci Coop', validUntil: DATES.thisWeek, icon: '🍺', brand: 'Ichnusa' },
  ],
  'conad': [
    { id: 'con-1', storeId: 'conad', productName: 'Tonno Rio Mare all’Olio di Oliva 8x80g', category: 'dispensa', discountPrice: 7.89, originalPrice: 11.90, discountPercent: '-34%', badge: 'Conad Carta Insieme', validUntil: DATES.thisWeek, icon: '🐟', brand: 'Rio Mare' },
    { id: 'con-2', storeId: 'conad', productName: 'Biscotti Mulino Bianco Pan di Stelle 700g', category: 'dispensa', discountPrice: 2.69, originalPrice: 3.99, discountPercent: '-32%', badge: 'Offerte Bis', validUntil: DATES.thisWeek, icon: '🍪', brand: 'Mulino Bianco' },
    { id: 'con-3', storeId: 'conad', productName: 'Petto di Pollo a Fette Verso Natura Conad 400g', category: 'carne-pesce', discountPrice: 4.49, originalPrice: 6.20, discountPercent: '-27%', badge: 'Verso Natura', validUntil: DATES.nextWeek, icon: '🍗', brand: 'Conad' },
    { id: 'con-4', storeId: 'conad', productName: 'Olio di Semi di Girasole Conad 1L', category: 'dispensa', discountPrice: 1.49, originalPrice: 2.10, discountPercent: '-29%', badge: 'Prezzi Bassi', validUntil: DATES.thisWeek, icon: '🛢️', brand: 'Conad' },
    { id: 'con-5', storeId: 'conad', productName: 'Pasta Rummo Formati Classici 500g', category: 'dispensa', discountPrice: 0.89, originalPrice: 1.45, discountPercent: '-38%', badge: 'Offerta', validUntil: DATES.nextWeek, icon: '🍝', brand: 'Rummo' },
    { id: 'con-6', storeId: 'conad', productName: 'Detersivo Lavatrice Omino Bianco 35 Lavaggi', category: 'pulizia', discountPrice: 3.49, originalPrice: 5.90, discountPercent: '-40%', badge: 'Carta Insieme', validUntil: DATES.thisWeek, icon: '🧺', brand: 'Omino Bianco' },
    { id: 'con-7', storeId: 'conad', productName: 'Shampoo Fructis Garnier 250ml', category: 'igiene', discountPrice: 1.99, originalPrice: 3.20, discountPercent: '-37%', badge: 'Bellezza', validUntil: DATES.thisWeek, icon: '🧴', brand: 'Garnier' },
    { id: 'con-8', storeId: 'conad', productName: 'Salsiccia di Suino Conad 500g', category: 'carne-pesce', discountPrice: 3.99, originalPrice: 5.50, discountPercent: '-27%', badge: 'Reparto Macelleria', validUntil: DATES.nextWeek, icon: '🥩', brand: 'Conad' },
    { id: 'con-9', storeId: 'conad', productName: 'Yogurt Muller Mix Vari Gusti 150g', category: 'latticini-uova', discountPrice: 0.85, originalPrice: 1.30, discountPercent: '-34%', badge: 'Carta Insieme', validUntil: DATES.thisWeek, icon: '🥛', brand: 'Muller' },
    { id: 'con-10', storeId: 'conad', productName: 'Estathé Limone o Pesca 3x20cl', category: 'bevande', discountPrice: 1.49, originalPrice: 2.20, discountPercent: '-32%', badge: 'Sconto 30%', validUntil: DATES.thisWeek, icon: '🧃', brand: 'Estathé' },
  ],
  'eurospin': [
    { id: 'eur-1', storeId: 'eurospin', productName: 'Prosciutto di Parma DOP Amo Essere 100g', category: 'carne-pesce', discountPrice: 2.29, originalPrice: 3.10, discountPercent: '-26%', badge: 'Amo Essere Eccellenza', validUntil: DATES.thisWeek, icon: '🥓', brand: 'Eurospin' },
    { id: 'eur-2', storeId: 'eurospin', productName: 'Latte UHT Parzialmente Scremato Land 1L', category: 'latticini-uova', discountPrice: 0.79, originalPrice: 1.10, discountPercent: '-28%', badge: 'Prezzo Ok', validUntil: DATES.thisWeek, icon: '🥛', brand: 'Land' },
    { id: 'eur-3', storeId: 'eurospin', productName: 'Pizza Margherita Surgelata Tre Mulini x3', category: 'dispensa', discountPrice: 3.49, originalPrice: 4.90, discountPercent: '-28%', badge: 'Tre Mulini', validUntil: DATES.nextWeek, icon: '🍕', brand: 'Tre Mulini' },
    { id: 'eur-4', storeId: 'eurospin', productName: 'Polpa di Pomodoro Delizie dal Sole 3x400g', category: 'dispensa', discountPrice: 1.19, originalPrice: 1.69, discountPercent: '-29%', badge: 'Prezzo Shock', validUntil: DATES.thisWeek, icon: '🍅', brand: 'Delizie dal Sole' },
    { id: 'eur-5', storeId: 'eurospin', productName: 'Bagnoschiuma Natura Bella 500ml', category: 'igiene', discountPrice: 0.99, originalPrice: 1.50, discountPercent: '-34%', badge: 'Volantino', validUntil: DATES.thisWeek, icon: '🧴', brand: 'Natura Bella' },
    { id: 'eur-6', storeId: 'eurospin', productName: 'Detersivo Piatti Dexal Limone 1L', category: 'pulizia', discountPrice: 0.89, originalPrice: 1.25, discountPercent: '-28%', badge: 'Speciale Pulizia', validUntil: DATES.nextWeek, icon: '🧼', brand: 'Dexal' },
    { id: 'eur-7', storeId: 'eurospin', productName: 'Fette Biscottate Integrali Tre Mulini 300g', category: 'dispensa', discountPrice: 0.85, originalPrice: 1.20, discountPercent: '-29%', badge: 'Tre Mulini', validUntil: DATES.thisWeek, icon: '🍞', brand: 'Tre Mulini' },
    { id: 'eur-8', storeId: 'eurospin', productName: 'Hamburger di Bovino Adulto 2x110g', category: 'carne-pesce', discountPrice: 2.19, originalPrice: 2.99, discountPercent: '-26%', badge: 'Freschi', validUntil: DATES.thisWeek, icon: '🥩', brand: 'Eurospin' },
    { id: 'eur-9', storeId: 'eurospin', productName: 'Acqua Minerale Naturale Ginevra 6x2L', category: 'bevande', discountPrice: 1.20, originalPrice: 1.80, discountPercent: '-33%', badge: 'Convenienza', validUntil: DATES.nextWeek, icon: '💧', brand: 'Ginevra' },
    { id: 'eur-10', storeId: 'eurospin', productName: 'Caffè Macinato Don Jerez Classico 250g', category: 'dispensa', discountPrice: 1.39, originalPrice: 1.99, discountPercent: '-30%', badge: 'Don Jerez', validUntil: DATES.thisWeek, icon: '☕', brand: 'Don Jerez' },
  ],
  'lidl': [
    { id: 'lid-1', storeId: 'lidl', productName: 'Formaggio Grana Padano DOP Italiamo 300g', category: 'latticini-uova', discountPrice: 3.69, originalPrice: 4.99, discountPercent: '-26%', badge: 'Lidl Plus', validUntil: DATES.thisWeek, icon: '🧀', brand: 'Italiamo' },
    { id: 'lid-2', storeId: 'lidl', productName: 'Birra Peroni 6x33cl', category: 'bevande', discountPrice: 3.49, originalPrice: 4.90, discountPercent: '-28%', badge: 'Super Offerta', validUntil: DATES.thisWeek, icon: '🍺', brand: 'Peroni' },
    { id: 'lid-3', storeId: 'lidl', productName: 'Gelato Gelatelli Coni Panna e Cioccolato 6 pezzi', category: 'latticini-uova', discountPrice: 1.99, originalPrice: 2.99, discountPercent: '-33%', badge: 'Speciale Estate', validUntil: DATES.nextWeek, icon: '🍦', brand: 'Gelatelli' },
    { id: 'lid-4', storeId: 'lidl', productName: 'Patatine Rustiche Snack Day 200g', category: 'dispensa', discountPrice: 0.99, originalPrice: 1.49, discountPercent: '-33%', badge: 'Lidl Plus', validUntil: DATES.thisWeek, icon: '🥔', brand: 'Snack Day' },
    { id: 'lid-5', storeId: 'lidl', productName: 'Olio Extra Vergine di Oliva Primadonna 1L', category: 'dispensa', discountPrice: 6.99, originalPrice: 8.99, discountPercent: '-22%', badge: 'Sottocosto', validUntil: DATES.nextWeek, icon: '🫒', brand: 'Primadonna' },
    { id: 'lid-6', storeId: 'lidl', productName: 'Salmone Norvegese Affumicato 100g', category: 'carne-pesce', discountPrice: 3.49, originalPrice: 4.99, discountPercent: '-30%', badge: 'Lidl Plus', validUntil: DATES.thisWeek, icon: '🐟', brand: 'Gastronomia' },
    { id: 'lid-7', storeId: 'lidl', productName: 'Croissant Cien Albicocca 10 pezzi', category: 'dispensa', discountPrice: 1.49, originalPrice: 2.29, discountPercent: '-34%', badge: 'Offerta', validUntil: DATES.thisWeek, icon: '🥐', brand: 'Certossa' },
    { id: 'lid-8', storeId: 'lidl', productName: 'Detersivo Liquido Formil 40 Lavaggi', category: 'pulizia', discountPrice: 3.99, originalPrice: 5.50, discountPercent: '-27%', badge: 'Pulito Sicuro', validUntil: DATES.thisWeek, icon: '🧺', brand: 'Formil' },
  ],
  'md': [
    { id: 'md-1', storeId: 'md', productName: 'Caffè Espresso in Grani Karisma 1Kg', category: 'dispensa', discountPrice: 5.99, originalPrice: 8.90, discountPercent: '-32%', badge: 'Prezzo MD', validUntil: DATES.thisWeek, icon: '☕', brand: 'Karisma' },
    { id: 'md-2', storeId: 'md', productName: 'Detersivo Piatti Dat5 Limone 1.25L', category: 'pulizia', discountPrice: 0.99, originalPrice: 1.50, discountPercent: '-34%', badge: 'Convenienza', validUntil: DATES.thisWeek, icon: '🧼', brand: 'Dat5' },
    { id: 'md-3', storeId: 'md', productName: 'Mozzarella Malga Paradiso 3x100g', category: 'latticini-uova', discountPrice: 1.79, originalPrice: 2.50, discountPercent: '-28%', badge: 'Sconto 28%', validUntil: DATES.thisWeek, icon: '🧀', brand: 'Malga Paradiso' },
    { id: 'md-4', storeId: 'md', productName: 'Bastoncini di Merluzzo Surgelati Le Specialità 15 pezzi', category: 'carne-pesce', discountPrice: 1.99, originalPrice: 2.90, discountPercent: '-31%', badge: 'Prezzo Bomba', validUntil: DATES.nextWeek, icon: '🐟', brand: 'Le Specialità' },
    { id: 'md-5', storeId: 'md', productName: 'Carta Igienica 3 Veli Vivo 10 Rotoli', category: 'pulizia', discountPrice: 2.49, originalPrice: 3.80, discountPercent: '-34%', badge: 'Volantino MD', validUntil: DATES.thisWeek, icon: '🧻', brand: 'Vivo' },
  ],
  'deco': [
    { id: 'dec-1', storeId: 'deco', productName: 'Mozzarella di Bufala Campana DOP Decò 250g', category: 'latticini-uova', discountPrice: 2.49, originalPrice: 3.60, discountPercent: '-30%', badge: 'Sapori di Sicilia', validUntil: DATES.thisWeek, icon: '🧀', brand: 'Decò' },
    { id: 'dec-2', storeId: 'deco', productName: 'Olio di Semi di Girasole Decò 1L', category: 'dispensa', discountPrice: 1.39, originalPrice: 1.99, discountPercent: '-30%', badge: 'Volantino Decò', validUntil: DATES.thisWeek, icon: '🛢️', brand: 'Decò' },
    { id: 'dec-3', storeId: 'deco', productName: 'Pasta De Cecco Formati Assortiti 500g', category: 'dispensa', discountPrice: 0.99, originalPrice: 1.50, discountPercent: '-34%', badge: 'Prezzi Bassi', validUntil: DATES.nextWeek, icon: '🍝', brand: 'De Cecco' },
    { id: 'dec-4', storeId: 'deco', productName: 'Succo di Frutta Santal Vari Gusti 1L', category: 'bevande', discountPrice: 1.15, originalPrice: 1.70, discountPercent: '-32%', badge: 'Sconto 32%', validUntil: DATES.thisWeek, icon: '🧃', brand: 'Santal' },
  ],
  'risparmio-casa': [
    { id: 'rc-1', storeId: 'risparmio-casa', productName: 'Detersivo Lavatrice Dash Polvere 100 Misurini', category: 'pulizia', discountPrice: 13.90, originalPrice: 22.00, discountPercent: '-36%', badge: 'Maxi Risparmio', validUntil: DATES.thisWeek, icon: '🧺', brand: 'Dash' },
    { id: 'rc-2', storeId: 'risparmio-casa', productName: 'Carta Casa Tuttofare 6 Rotoli', category: 'pulizia', discountPrice: 2.99, originalPrice: 4.80, discountPercent: '-37%', badge: 'Sottocosto Casa', validUntil: DATES.thisWeek, icon: '🧻', brand: 'Risparmio Casa' },
    { id: 'rc-3', storeId: 'risparmio-casa', productName: 'Bagnoschiuma Borotalco Original 450ml', category: 'igiene', discountPrice: 1.89, originalPrice: 3.20, discountPercent: '-40%', badge: 'Convenienza', validUntil: DATES.nextWeek, icon: '🧴', brand: 'Borotalco' },
    { id: 'rc-4', storeId: 'risparmio-casa', productName: 'Ammorbidente Lenor 40 Lavaggi', category: 'pulizia', discountPrice: 1.99, originalPrice: 3.50, discountPercent: '-43%', badge: 'Sconto 43%', validUntil: DATES.thisWeek, icon: '🌸', brand: 'Lenor' },
    { id: 'rc-5', storeId: 'risparmio-casa', productName: 'Dentifricio Aquafresh 75ml x3', category: 'igiene', discountPrice: 2.99, originalPrice: 4.90, discountPercent: '-38%', badge: 'Scorta', validUntil: DATES.thisWeek, icon: '🪥', brand: 'Aquafresh' },
  ],
  'ins': [
    { id: 'ins-1', storeId: 'ins', productName: 'Riso Basmati Bio In’s 1Kg', category: 'dispensa', discountPrice: 1.79, originalPrice: 2.40, discountPercent: '-25%', badge: 'Bio IN’s', validUntil: DATES.thisWeek, icon: '🍚', brand: "IN's" },
    { id: 'ins-2', storeId: 'ins', productName: 'Succo di Frutta 100% Arancia In’s 1L', category: 'bevande', discountPrice: 0.99, originalPrice: 1.45, discountPercent: '-31%', badge: 'Prezzo In’s', validUntil: DATES.thisWeek, icon: '🧃', brand: "IN's" },
    { id: 'ins-3', storeId: 'ins', productName: 'Yogurt Intero alla Frutta In’s 2x125g', category: 'latticini-uova', discountPrice: 0.65, originalPrice: 0.95, discountPercent: '-31%', badge: 'Volantino IN’s', validUntil: DATES.nextWeek, icon: '🥛', brand: "IN's" },
    { id: 'ins-4', storeId: 'ins', productName: 'Filetti di Tonno in Olio di Oliva In’s 200g', category: 'dispensa', discountPrice: 2.99, originalPrice: 4.20, discountPercent: '-28%', badge: 'Sconto', validUntil: DATES.thisWeek, icon: '🐟', brand: "IN's" },
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
