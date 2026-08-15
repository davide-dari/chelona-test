/*
 * Statistiche offerte — prezzi rilevati dai volantini nazionali attivi
 * (10-23 agosto 2026) delle principali catene, via lettura OCR delle pagine.
 * Ogni gruppo raggruppa articoli dello stesso tipo o equivalenti.
 * q = quantità in kg, litri o pezzi (u). p = prezzo €.
 * fid = volantino di origine (doveconvieneDb), pg = pagina (0-based) dell'offerta.
 */
export interface OfferEntry {
  s: string;   // catena
  b: string;   // marca
  n: string;   // prodotto
  q: number;   // quantità
  u: 'kg' | 'l' | 'pz';
  p: number;   // prezzo €
  fid: string; // volantino di origine
  pg: number;  // pagina (0-based) dove è visibile l'offerta
}

export interface OfferGroup {
  id: string;
  g: string;   // nome gruppo
  e: string;   // emoji
  o: OfferEntry[];
}

export const OFFER_DATE = '10-23 agosto 2026';

export const OFFER_GROUPS: OfferGroup[] = [
  {
    id: 'penne',
    g: 'Penne e pasta corta (500 g)',
    e: '🍝',
    o: [
      { s: 'Esselunga', b: 'Esselunga', n: 'Penne Rigate 500 g', q: 0.5, u: 'kg', p: 1.09, fid: '1596886', pg: 3 },
      { s: 'MD', b: 'Gragnano IGP', n: 'Rigatoni 500 g', q: 0.5, u: 'kg', p: 0.99, fid: '1661165', pg: 9 },
    ],
  },
  {
    id: 'pasta-integrale',
    g: 'Pasta integrale (500 g)',
    e: '🌾',
    o: [
      { s: 'Eurospin', b: 'Family', n: 'Pasta integrale trafilata al bronzo 500 g', q: 0.5, u: 'kg', p: 0.65, fid: '1661286', pg: 2 },
    ],
  },
  {
    id: 'gnocchi',
    g: 'Gnocchi di patate (500 g)',
    e: '🥟',
    o: [
      { s: 'Eurospin', b: 'Family', n: 'Gnocchetti di patate 500 g', q: 0.5, u: 'kg', p: 0.69, fid: '1661286', pg: 2 },
    ],
  },
  {
    id: 'passata',
    g: 'Passata di pomodoro',
    e: '🍅',
    o: [
      { s: 'Eurospin', b: 'Family', n: 'Passata di pomodoro datterino 360 g', q: 0.36, u: 'kg', p: 0.79, fid: '1661286', pg: 2 },
      { s: 'Esselunga', b: 'Esselunga', n: 'Passata rustica 700 g', q: 0.7, u: 'kg', p: 0.85, fid: '1596886', pg: 3 },
    ],
  },
  {
    id: 'pomodori',
    g: 'Pomodori',
    e: '🍅',
    o: [
      { s: 'Pam', b: 'Pam', n: 'Pomodoro datterino 250 g', q: 0.25, u: 'kg', p: 0.99, fid: '1660704', pg: 2 },
    ],
  },
  {
    id: 'latte',
    g: 'Latte UHT (1 L)',
    e: '🥛',
    o: [
      { s: 'Pam', b: 'Granarolo', n: 'Latte parzialmente scremato 1 L', q: 1, u: 'l', p: 0.99, fid: '1660704', pg: 5 },
    ],
  },
  {
    id: 'yogurt',
    g: 'Yogurt',
    e: '🫙',
    o: [
      { s: 'Crai', b: 'Müller', n: 'Yogurt vari gusti 125 g ×2', q: 0.25, u: 'kg', p: 0.89, fid: '1659539', pg: 1 },
    ],
  },
  {
    id: 'parmigiano',
    g: 'Parmigiano/Grana grattugiato (100 g)',
    e: '🧀',
    o: [
      { s: 'Eurospin', b: 'Eurospin', n: 'Parmigiano Reggiano DOP grattugiato 100 g', q: 0.1, u: 'kg', p: 1.49, fid: '1661286', pg: 0 },
      { s: 'Esselunga', b: 'Esselunga', n: 'Grana Padano grattugiato fresco 100 g', q: 0.1, u: 'kg', p: 1.93, fid: '1596886', pg: 2 },
    ],
  },
  {
    id: 'grana',
    g: 'Grana Padano / formaggi duri (al kg)',
    e: '🧀',
    o: [
      { s: 'Decò', b: 'Decò', n: 'Grana Padano DOP al kg', q: 1, u: 'kg', p: 11.2, fid: '1663733', pg: 4 },
      { s: 'Decò', b: 'Galbani', n: 'Galbanone al kg', q: 1, u: 'kg', p: 11.9, fid: '1663733', pg: 4 },
      { s: 'Decò', b: 'Decò', n: 'Toma Piemontese DOP al kg', q: 1, u: 'kg', p: 14.5, fid: '1663733', pg: 2 },
    ],
  },
  {
    id: 'mozzarella',
    g: 'Mozzarella',
    e: '🫓',
    o: [
      { s: 'Eurospin', b: 'Eurospin', n: 'Mozzarella per pizze 1 kg', q: 1, u: 'kg', p: 4.99, fid: '1661286', pg: 1 },
    ],
  },
  {
    id: 'ricotta',
    g: 'Ricotta fresca',
    e: '🫙',
    o: [
      { s: 'Eurospin', b: 'Eurospin', n: 'Ricotta fresca 250 g', q: 0.25, u: 'kg', p: 0.55, fid: '1661286', pg: 1 },
    ],
  },
  {
    id: 'spalmabile',
    g: 'Formaggio fresco spalmabile (200 g)',
    e: '🧀',
    o: [
      { s: 'Esselunga', b: 'Esselunga', n: 'Formaggio fresco spalmabile 200 g', q: 0.2, u: 'kg', p: 0.85, fid: '1596886', pg: 2 },
    ],
  },
  {
    id: 'prosciutto-parma',
    g: 'Prosciutto di Parma (100 g)',
    e: '🍖',
    o: [
      { s: 'Eurospin', b: 'Eurospin', n: 'Prosciutto di Parma DOP 100 g', q: 0.1, u: 'kg', p: 2.59, fid: '1661286', pg: 1 },
      { s: 'Pam', b: 'Pam', n: 'Fiocco di prosciutto crudo stagionato 90 g', q: 0.09, u: 'kg', p: 3.99, fid: '1660704', pg: 8 },
    ],
  },
  {
    id: 'salame',
    g: 'Salame (al kg)',
    e: '🥫',
    o: [
      { s: 'Eurospin', b: 'Eurospin', n: 'Salame Napoli 100 g', q: 0.1, u: 'kg', p: 1.29, fid: '1661286', pg: 1 },
    ],
  },
  {
    id: 'bresaola',
    g: 'Bresaola',
    e: '🥩',
    o: [
      { s: 'Eurospin', b: 'Eurospin', n: 'Bresaola 120 g', q: 0.12, u: 'kg', p: 1.49, fid: '1661286', pg: 1 },
      { s: 'Pam', b: 'Pam', n: 'Bresaola della Valtellina IGP 80 g', q: 0.08, u: 'kg', p: 3.69, fid: '1660704', pg: 8 },
    ],
  },
  {
    id: 'affettati',
    g: 'Affettati (100 g)',
    e: '🥪',
    o: [
      { s: 'Eurospin', b: 'Eurospin', n: 'Arrosto a fette 100 g', q: 0.1, u: 'kg', p: 1.99, fid: '1661286', pg: 1 },
      { s: 'Esselunga', b: 'Esselunga', n: 'Arrosto di tacchino a fette 100 g', q: 0.1, u: 'kg', p: 2.15, fid: '1596886', pg: 2 },
      { s: 'Esselunga', b: 'Esselunga', n: 'Würstel di puro suino 100 g', q: 0.1, u: 'kg', p: 1.58, fid: '1596886', pg: 2 },
    ],
  },
  {
    id: 'hamburger',
    g: 'Hamburger surgelati',
    e: '🍔',
    o: [
      { s: 'MD', b: 'MD', n: 'Tris di hamburger 450 g', q: 0.45, u: 'kg', p: 2.2, fid: '1661165', pg: 2 },
      { s: 'Lidl', b: 'Lidl', n: 'Hamburger di bovino 6 × 80 g', q: 0.48, u: 'kg', p: 4.99, fid: '1661504', pg: 0 },
    ],
  },
  {
    id: 'salmone',
    g: 'Salmone',
    e: '🐟',
    o: [
      { s: 'Lidl', b: 'Lidl', n: 'Filetto di salmone con pelle 500 g', q: 0.5, u: 'kg', p: 7.49, fid: '1661504', pg: 0 },
      { s: 'Eurospin', b: 'Eurospin', n: 'Filetti di salmone all\'olio 150 g', q: 0.15, u: 'kg', p: 2.39, fid: '1661286', pg: 3 },
      { s: 'Pam', b: 'Pam', n: 'Salmone affumicato biologico 75 g', q: 0.075, u: 'kg', p: 4.49, fid: '1660704', pg: 5 },
    ],
  },
  {
    id: 'tonno',
    g: 'Tonno in scatola',
    e: '🥫',
    o: [
      { s: 'Esselunga', b: 'Esselunga', n: 'Tonno al naturale 3 × 56 g', q: 0.168, u: 'kg', p: 0.99, fid: '1596886', pg: 3 },
      { s: 'MD', b: 'Poseidon', n: 'Tonno all\'olio vegetale 4 × 80 g', q: 0.32, u: 'kg', p: 2.49, fid: '1661165', pg: 9 },
    ],
  },
  {
    id: 'merluzzo',
    g: 'Merluzzo',
    e: '🐟',
    o: [
      { s: 'Pam', b: 'Pam', n: 'Filetti di merluzzo sudafricano 400 g', q: 0.4, u: 'kg', p: 6.49, fid: '1660704', pg: 6 },
    ],
  },
  {
    id: 'polpo',
    g: 'Polpo cotto',
    e: '🐙',
    o: [
      { s: 'MD', b: 'MD', n: 'Tentacolo di polpo cotto 250 g', q: 0.25, u: 'kg', p: 5.99, fid: '1661165', pg: 2 },
    ],
  },
  {
    id: 'antipasti-mare',
    g: 'Antipasto di mare',
    e: '🦐',
    o: [
      { s: 'Todis', b: 'Todis', n: 'Antipasto di mare 500 g', q: 0.5, u: 'kg', p: 5.49, fid: '1657287', pg: 9 },
    ],
  },
  {
    id: 'olio',
    g: 'Olio di semi di girasole (1 L)',
    e: '🛢️',
    o: [
      { s: 'Eurospin', b: 'Eurospin', n: 'Olio di semi di girasole 1 L', q: 1, u: 'l', p: 1.39, fid: '1661286', pg: 0 },
    ],
  },
  {
    id: 'farina',
    g: 'Farina tipo 00 (1 kg)',
    e: '🌾',
    o: [
      { s: 'Esselunga', b: 'Esselunga', n: 'Farina tipo 00 1 kg', q: 1, u: 'kg', p: 0.65, fid: '1596886', pg: 3 },
    ],
  },
  {
    id: 'maionese',
    g: 'Maionese',
    e: '🥚',
    o: [
      { s: 'MD', b: 'Calvé', n: 'Maionese classica 450 ml', q: 0.45, u: 'l', p: 2.29, fid: '1661165', pg: 9 },
    ],
  },
  {
    id: 'cracker',
    g: 'Cracker salati',
    e: '🍘',
    o: [
      { s: 'MD', b: 'TUC', n: 'Cracker classici 250 g', q: 0.25, u: 'kg', p: 1.59, fid: '1661165', pg: 9 },
      { s: 'Lidl', b: 'Certosa', n: 'Taralli all\'olio extra vergine 300 g', q: 0.3, u: 'kg', p: 1.99, fid: '1661504', pg: 9 },
      { s: 'Interspar', b: 'Interspar', n: 'Pizzelle vari tipi 180 g', q: 0.18, u: 'kg', p: 2.99, fid: '1641777', pg: 4 },
    ],
  },
  {
    id: 'crema-spalmabile',
    g: 'Crema spalmabile nocciola (230 g)',
    e: '🍫',
    o: [
      { s: 'MD', b: 'MD', n: 'Crema spalmabile nocciola 230 g', q: 0.23, u: 'kg', p: 1.49, fid: '1661165', pg: 9 },
    ],
  },
  {
    id: 'avena',
    g: 'Fiocchi di avena (500 g)',
    e: '🥣',
    o: [
      { s: 'Pam', b: 'Pam', n: 'Fiocchi di avena integrali 500 g', q: 0.5, u: 'kg', p: 1.39, fid: '1660704', pg: 9 },
    ],
  },
  {
    id: 'pomodori-secchi',
    g: 'Pomodori secchi',
    e: '🍅',
    o: [
      { s: 'Interspar', b: 'Interspar', n: 'Pomodori secchi 150 g', q: 0.15, u: 'kg', p: 1.99, fid: '1641777', pg: 4 },
    ],
  },
  {
    id: 'caffe-capsule',
    g: 'Caffè in capsule (30 pezzi)',
    e: '☕',
    o: [
      { s: 'Crai', b: 'Borbone', n: 'Caffè Borbone capsule 30 pezzi', q: 30, u: 'pz', p: 5.99, fid: '1659539', pg: 1 },
    ],
  },
  {
    id: 'caffe-macinato',
    g: 'Caffè macinato',
    e: '☕',
    o: [
      { s: 'Crai', b: 'Lavazza', n: 'Crema e Gusto Classico 4 × 250 g', q: 1, u: 'kg', p: 18.7, fid: '1659539', pg: 0 },
    ],
  },
  {
    id: 'the',
    g: 'Thè freddo (1,5 L)',
    e: '🧃',
    o: [
      { s: 'Eurospin', b: 'Eurospin', n: 'Thè alla pesca 1,5 L', q: 1.5, u: 'l', p: 0.55, fid: '1661286', pg: 4 },
    ],
  },
  {
    id: 'birra',
    g: 'Birra in lattina',
    e: '🍺',
    o: [
      { s: 'MD', b: 'Wiktor', n: 'Birra Wiktor lattina 50 cl', q: 0.5, u: 'l', p: 0.59, fid: '1661165', pg: 6 },
      { s: 'MD', b: 'Tennent\'s', n: 'Birra Tennent\'s Super lattina 50 cl', q: 0.5, u: 'l', p: 1.39, fid: '1661165', pg: 6 },
      { s: 'MD', b: 'Ichnusa', n: 'Birra Ichnusa 33 cl ×3', q: 0.99, u: 'l', p: 2.2, fid: '1661165', pg: 6 },
    ],
  },
  {
    id: 'prosecco',
    g: 'Prosecco',
    e: '🍾',
    o: [
      { s: 'Eurospin', b: 'Eurospin', n: 'Prosecco DOC frizzante', q: 0.75, u: 'l', p: 2.89, fid: '1661286', pg: 4 },
      { s: 'Lidl', b: 'Lidl', n: 'Prosecco Valdobbiadene Superiore DOCG', q: 0.75, u: 'l', p: 6.59, fid: '1661504', pg: 0 },
    ],
  },
  {
    id: 'vino',
    g: 'Vino da tavola (1 L)',
    e: '🍷',
    o: [
      { s: 'Eurospin', b: 'Eurospin', n: 'Vino bianco/rosato in brick 1 L', q: 1, u: 'l', p: 0.85, fid: '1661286', pg: 4 },
      { s: 'Interspar', b: 'Bottegaro', n: 'Montepulciano d\'Abruzzo DOC 75 cl', q: 0.75, u: 'l', p: 7.9, fid: '1641777', pg: 2 },
    ],
  },
  {
    id: 'gelato',
    g: 'Gelato',
    e: '🍨',
    o: [
      { s: 'Crai', b: 'Algida', n: 'Carte d\'Or vaschetta 500 g', q: 0.5, u: 'kg', p: 2.99, fid: '1659539', pg: 0 },
      { s: 'Pam', b: 'Kinder', n: 'Gelato Kinder Bueno 285 g', q: 0.285, u: 'kg', p: 3.49, fid: '1660704', pg: 6 },
    ],
  },
  {
    id: 'plumcake',
    g: 'Plumcake',
    e: '🧁',
    o: [
      { s: 'Pam', b: 'Pam', n: 'Plumcake allo yogurt 198 g', q: 0.198, u: 'kg', p: 0.99, fid: '1660704', pg: 9 },
    ],
  },
  {
    id: 'frutta',
    g: 'Frutta di stagione',
    e: '🍈',
    o: [
      { s: 'Lidl', b: 'Lidl', n: 'Melone giallo al kg', q: 1, u: 'kg', p: 0.89, fid: '1661504', pg: 3 },
      { s: 'Pam', b: 'Pam', n: 'Anguria baby 500 g', q: 0.5, u: 'kg', p: 0.99, fid: '1660704', pg: 2 },
      { s: 'Crai', b: 'Crai', n: 'Pere coscia 1 kg', q: 1, u: 'kg', p: 1.89, fid: '1659539', pg: 3 },
    ],
  },
  {
    id: 'verdura',
    g: 'Verdura',
    e: '🥬',
    o: [
      { s: 'Lidl', b: 'Lidl', n: 'Peperoni rossi/gialli al kg', q: 1, u: 'kg', p: 1.79, fid: '1661504', pg: 3 },
      { s: 'Lidl', b: 'Lidl', n: 'Patate 2 kg', q: 2, u: 'kg', p: 1.99, fid: '1661504', pg: 4 },
    ],
  },
  {
    id: 'carta',
    g: 'Carta igienica (20 rotoli)',
    e: '🧻',
    o: [
      { s: 'Eurospin', b: 'Eurospin', n: 'Carta igienica delicata 20 rotoli', q: 20, u: 'pz', p: 2.69, fid: '1661286', pg: 4 },
    ],
  },
  {
    id: 'dentifricio',
    g: 'Dentifricio',
    e: '🪥',
    o: [
      { s: 'Crai', b: 'Colgate', n: 'Tripla Azione 75 ml ×2', q: 2, u: 'pz', p: 1.99, fid: '1659539', pg: 2 },
    ],
  },
  {
    id: 'candeggina',
    g: 'Candeggina (2 L)',
    e: '🧴',
    o: [
      { s: 'Eurospin', b: 'Eurospin', n: 'Candeggina delicata 2 L', q: 2, u: 'l', p: 1.29, fid: '1661286', pg: 4 },
    ],
  },
  {
    id: 'wurstel-pollo',
    g: 'Würstel di pollo (250 g)',
    e: '🌭',
    o: [
      { s: 'Todis', b: 'Todis', n: 'Würstel di pollo 250 g', q: 0.25, u: 'kg', p: 0.79, fid: '1657287', pg: 9 },
    ],
  },
  {
    id: 'basi-pizza',
    g: 'Basi per pizza (2 × 200 g)',
    e: '🍕',
    o: [
      { s: 'Todis', b: 'Todis', n: 'Basi bianche per pizza tonda 2 × 200 g', q: 0.4, u: 'kg', p: 2.59, fid: '1657287', pg: 9 },
    ],
  },
];