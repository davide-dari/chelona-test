/*
 * Statistiche offerte — prezzi rilevati dai volantini nazionali attivi
 * (Settembre - Ottobre 2026) delle principali catene, via lettura OCR delle pagine.
 * Ogni gruppo raggruppa articoli dello stesso tipo o equivalenti.
 * q = quantità in kg, litri o pezzi (u). p = prezzo €.
 * fid = volantino di origine (VOLANTINI_DB), pg = pagina (0-based) dell'offerta.
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

export type OfferCategory = 'alimentari' | 'casa';

export interface OfferGroup {
  id: string;
  g: string;   // nome gruppo
  e: string;   // emoji
  c: OfferCategory;
  o: OfferEntry[];
}

export const OFFER_DATE = 'Settembre - Ottobre 2026';

/* Carta fedeltà delle catene (nome mostrato nel confronto prezzi quando il
   volantino indica prezzi riservati ai possessori della carta). */
export const FIDELITY_CARDS: Record<string, string> = {
  "Conad": "Carta Insieme",
  "Coop": "Carta Socio Coop",
  "Esselunga": "Carta Fìdaty",
  "Carrefour": "Spesa Amica PAY",
  "Pam": "PerTe Plus",
  "Decò": "Carta Essere Decò",
  "Crai": "Carta Più Crai",
  "MD": "Buona Spesa Card",
  "Despar": "Despar Tribù",
  "Interspar": "Despar Tribù",
  "Famila": "Club Famila",
  "Bennet": "Bennet Club",
  "Tigros": "Tigros Card",
  "Iperal": "CartAmica",
  "Il Gigante": "blucard",
  "Alì": "Carta Fedeltà Alì",
  "Basko": "Prima Card",
  "Penny": "PennyCard",
  "Penny Market": "PennyCard",
  "Acqua e Sapone": "Carta Club",
  "Tigotà": "Fidelity Tigotà",
  "Risparmio Casa": "Risparmio Card",
  "C+C Cash & Carry": "C+C Card",
  "Saturn": "MediaWorld Club / Saturn Card",
  "Mediaworld": "MediaWorld Club",
  "MediaWorld": "MediaWorld Club",
  "La Saponeria": "Club La Saponeria"
};

/* Mappa nomi insegna (da confronto prezzi) → slug catena (volantiniDb) */
export const STORE_SLUG_MAP: Record<string, string> = {
  'Pewex': 'pewex',
  'Pim': 'pim',
  'Dem': 'dem',
  'Il Castoro': 'il-castoro',
  'Ipertriscount': 'ipertriscount',
  'Ipercarni': 'ipercarni',
  'CTS': 'cts',
  'Top': 'top',
  'Effepiù': 'effepiu',
  'Sir': 'sir',
  'Sacoph': 'sacoph',
  'Idromarket': 'idromarket',
  'MA': 'ma',
  'Gros': 'gros',
  'Crai': 'crai',
  'Decò': 'deco',
  'Esselunga': 'esselunga',
  'Eurospin': 'eurospin',
  'Interspar': 'despar',
  'Despar': 'despar',
  'Lidl': 'lidl',
  'MD': 'md-discount',
  'Pam': 'pam',
  'Todis': 'todis',
  'Conad': 'conad',
  'Coop': 'coop',
  'Ipercoop': 'ipercoop',
  'Aldi': 'aldi',
  'Carrefour': 'carrefour',
  'Penny': 'penny-market',
  'Penny Market': 'penny-market',
  'Bennet': 'bennet',
  'Famila': 'famila',
  'Il Gigante': 'il-gigante',
  'Iperal': 'iperal',
  'Tigros': 'tigros',
  'Basko': 'basko',
  'Migross': 'migross',
  'Alì': 'ali-supermercati',
  'Unes': 'unes',
  'Acqua e Sapone': 'acqua-e-sapone',
  'Acqua & Sapone': 'acqua-e-sapone',
  'La Saponeria': 'la-saponeria',
  'Tigotà': 'tigota',
  'Risparmio Casa': 'risparmiocasa',
  'NaturaSì': 'naturasi',
  "iN's": 'ins',
  "In's": 'ins',
  'Dpiù': 'dpiu',
  'A&O': 'aeo',
  'Oasi': 'oasi',
  'Tigre': 'tigre',
  'Coal': 'coal',
  'Italmark': 'italmark',
  'Prix': 'prix',
  'Metro': 'metro',
  'Saturn': 'saturn',
  'saturn': 'saturn',
  'Media-Saturn': 'saturn',
  'mediasaturn': 'saturn',
  'Mediaworld': 'mediaworld-italia',
  'MediaWorld': 'mediaworld-italia',
  'Unieuro': 'unieuro',
  'Euronics': 'euronics',
  'Expert': 'expert-italia',
  'Trony': 'trony',
  'Comet': 'comet',
  'Orizzonte': 'orizzonte',
  'Super Elite': 'superelite',
  'Elite': 'superelite',
};

/* Normalizza una stringa per il confronto (minuscole, senza accenti) */
export const normalizeOfferName = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/* Forme alternative di un token (singolare/plurale italiano) per associare
   prodotti identici ma di tipologia diversa (es. pomodori ↔ pomodoro). */
export const expandToken = (t: string): string[] => {
  const forms = new Set<string>([t]);
  if (t.length < 4) return [...forms];
  const last = t[t.length - 1];
  const base = t.slice(0, -1);
  if (last === 'i') { forms.add(base + 'o'); }
  else if (last === 'e') { forms.add(base + 'a'); forms.add(base + 'o'); }
  else if (last === 'a') { forms.add(base + 'o'); }
  else if (last === 'o') { forms.add(base + 'a'); }
  return [...forms];
};

const OFFER_STOPWORDS = new Set(['di', 'del', 'della', 'delle', 'al', 'allo', 'alla', 'alle', 'in', 'e', 'a', 'da', 'con', 'per', 'più', 'l']);

/* Trova le offerte che corrispondono a un prodotto della lista della spesa.
   Scoring basato sulla copertura dei token del prodotto sui nomi delle offerte
   (peso maggiore se il token compare nel nome prodotto, minore nel nome gruppo). */
export const findOffersForName = (name: string): OfferEntry[] => {
  const q = normalizeOfferName(name);
  if (q.length < 3) return [];
  const qTokens = q.split(' ').filter(t => t.length >= 3 && !OFFER_STOPWORDS.has(t));
  if (!qTokens.length) return [];
  const qLen = q.split(' ').filter(t => !OFFER_STOPWORDS.has(t)).join('').length;

  const matches: { e: OfferEntry; score: number }[] = [];
  for (const g of OFFER_GROUPS) {
    const gTokens = new Set(normalizeOfferName(g.g).split(' ').filter(t => t.length >= 3));
    for (const e of g.o) {
      const nTokens = new Set(normalizeOfferName(e.n).split(' ').filter(t => t.length >= 3));
      const bTokens = new Set(normalizeOfferName(e.b).split(' ').filter(t => t.length >= 3));
      const nForms = new Set<string>();
      for (const nt of nTokens) for (const f of expandToken(nt)) nForms.add(f);
      const gForms = new Set<string>();
      for (const gt of gTokens) for (const f of expandToken(gt)) gForms.add(f);
      let hit = 0;
      let covered = 0;
      let firstHit = false;
      const first = qTokens[0];
      for (const t of qTokens) {
        const tl = t.length;
        let th = 0;
        if (gTokens.has(t)) th = 1.5;
        if (nTokens.has(t)) th = Math.max(th, 2);
        if (bTokens.has(t)) th = Math.max(th, 0.8);
        if (th === 0) {
          for (const nt of nTokens) {
            if (nt.startsWith(t) && tl >= 5) { th = 1.2; break; }
          }
        }
        if (th === 0 && nForms.has(t)) th = 1.8;
        if (th === 0 && gForms.has(t)) th = 1.3;
        if (th > 0) {
          hit += th * tl;
          covered += tl;
          if (t === first) firstHit = true;
        }
      }
      if (firstHit && covered / qLen >= 0.45) matches.push({ e, score: hit });
    }
  }
  if (!matches.length) return [];
  const best = Math.max(...matches.map(m => m.score));
  return matches
    .filter(m => m.score === best)
    .map(m => m.e)
    .sort((a, b) => a.p / a.q - b.p / b.q);
};

export interface ConvenientDeal {
  groupId: string;
  groupName: string;
  emoji: string;
  store: string;
  chainSlug: string;
  productName: string;
  brand: string;
  price: number;
  qty: number;
  unit: 'kg' | 'l' | 'pz';
  unitPrice: number;
  avgUnitPrice: number;
  savingPct: number;
  fid: string;
  page: number; // 1-based display page (pg + 1)
}

/* Calcola e restituisce le migliori offerte convenienti dalla sezione Confronta Prezzi
   (solo quelle con reale convenienza e forte risparmio rispetto alla media dei supermercati). */
export const getBestConvenientDeals = (limit = 6): ConvenientDeal[] => {
  const deals: ConvenientDeal[] = [];

  for (const g of OFFER_GROUPS) {
    if (g.o.length < 2) continue;
    const unitPrices = g.o.map(e => e.p / e.q);
    const avg = unitPrices.reduce((a, b) => a + b, 0) / unitPrices.length;
    const best = g.o.reduce((min, cur) => (cur.p / cur.q < min.p / min.q ? cur : min), g.o[0]);
    const bestUnit = best.p / best.q;
    const savingPct = Math.round((1 - bestUnit / avg) * 100);

    // Solo quelle convenienti: almeno 20% sotto la media dei supermercati
    if (savingPct >= 20) {
      deals.push({
        groupId: g.id,
        groupName: g.g,
        emoji: g.e,
        store: best.s,
        chainSlug: STORE_SLUG_MAP[best.s] || best.s.toLowerCase(),
        productName: best.n,
        brand: best.b,
        price: best.p,
        qty: best.q,
        unit: best.u,
        unitPrice: bestUnit,
        avgUnitPrice: avg,
        savingPct,
        fid: best.fid,
        page: typeof best.pg === 'number' ? best.pg + 1 : 1,
      });
    }
  }

  // Ordina per percentuale di risparmio decrescente
  deals.sort((a, b) => b.savingPct - a.savingPct);

  // Diversifica le catene per offrire una panoramica equilibrata (max 2 per catena)
  const storeCounts: Record<string, number> = {};
  const selected: ConvenientDeal[] = [];

  for (const d of deals) {
    const count = storeCounts[d.store] || 0;
    if (count < 2) {
      storeCounts[d.store] = count + 1;
      selected.push(d);
      if (selected.length >= limit) break;
    }
  }

  return selected.length > 0 ? selected : deals.slice(0, limit);
};

export const OFFER_GROUPS: OfferGroup[] = [
  {
    "id": "penne",
    "g": "Penne e pasta corta (500 g)",
    "e": "🍝",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Tre Mulini",
        "n": "Penne Rigate trafilate al bronzo 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.65,
        "fid": "105",
        "pg": 2
      },
      {
        "s": "Lidl",
        "b": "Combino",
        "n": "Penne Rigate 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.69,
        "fid": "559",
        "pg": 2
      },
      {
        "s": "Aldi",
        "b": "Cucina Nobile",
        "n": "Penne Rigate 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.69,
        "fid": "2328",
        "pg": 3
      },
      {
        "s": "Penny",
        "b": "Cuor di Terra",
        "n": "Penne Rigate 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.69,
        "fid": "69",
        "pg": 2
      },
      {
        "s": "Todis",
        "b": "L'Arte delle Paste",
        "n": "Penne Rigate 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.75,
        "fid": "493",
        "pg": 3
      },
      {
        "s": "Famila",
        "b": "Selex",
        "n": "Penne Rigate 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.79,
        "fid": "106",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Carrefour Classic",
        "n": "Penne Rigate 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.85,
        "fid": "54",
        "pg": 5
      },
      {
        "s": "Despar",
        "b": "Despar",
        "n": "Penne Rigate 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.85,
        "fid": "2256",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Penne Rigate 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.89,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Bennet",
        "b": "Bennet",
        "n": "Penne Rigate 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.89,
        "fid": "1862",
        "pg": 5
      },
      {
        "s": "Pam",
        "b": "Pam Panorama",
        "n": "Penne Rigate 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.89,
        "fid": "275",
        "pg": 4
      },
      {
        "s": "Decò",
        "b": "Decò",
        "n": "Penne Rigate trafilate al bronzo 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.89,
        "fid": "546",
        "pg": 3
      },
      {
        "s": "Tigros",
        "b": "Barilla",
        "n": "Penne Rigate N.73 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.89,
        "fid": "391",
        "pg": 4
      },
      {
        "s": "Crai",
        "b": "Crai",
        "n": "Penne Rigate 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.92,
        "fid": "5042573",
        "pg": 2
      },
      {
        "s": "Coop",
        "b": "Fior Fiore Coop",
        "n": "Penne Rigate 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.95,
        "fid": "1965",
        "pg": 6
      },
      {
        "s": "MD",
        "b": "Gragnano IGP",
        "n": "Rigatoni Gragnano IGP 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.99,
        "fid": "114",
        "pg": 4
      },
      {
        "s": "Pewex",
        "b": "La Molisana",
        "n": "Penne Rigate N.20 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.99,
        "fid": "833",
        "pg": 2
      },
      {
        "s": "Dem",
        "b": "Garofalo",
        "n": "Penne Ziti Rigate 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.05,
        "fid": "1308",
        "pg": 3
      },
      {
        "s": "Esselunga",
        "b": "Esselunga",
        "n": "Penne Rigate 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.09,
        "fid": "789",
        "pg": 3
      },
      {
        "s": "Iperal",
        "b": "De Cecco",
        "n": "Penne Rigate N.41 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.15,
        "fid": "1957",
        "pg": 5
      },
      {
        "s": "Il Gigante",
        "b": "Rummo",
        "n": "Penne Rigate N.66 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.19,
        "fid": "9",
        "pg": 3
      },
      {
        "s": "Alì",
        "b": "Voiello",
        "n": "Penne Rigate Grano Aureo 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.19,
        "fid": "405",
        "pg": 3
      }
    ]
  },
  {
    "id": "pasta-integrale",
    "g": "Pasta integrale (500 g)",
    "e": "🌾",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Tre Mulini",
        "n": "Pasta integrale trafilata al bronzo 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.65,
        "fid": "105",
        "pg": 2
      },
      {
        "s": "Lidl",
        "b": "Combino",
        "n": "Penne integrali Bio 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.79,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Aldi",
        "b": "Cucina Nobile",
        "n": "Fusilli integrali 100% grano italiano 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.79,
        "fid": "2328",
        "pg": 3
      },
      {
        "s": "MD",
        "b": "Bio",
        "n": "Penne integrali biologiche 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.85,
        "fid": "114",
        "pg": 4
      },
      {
        "s": "Conad",
        "b": "Conad Verso Natura Bio",
        "n": "Penne integrali Bio 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.99,
        "fid": "398",
        "pg": 5
      },
      {
        "s": "Coop",
        "b": "Vivi Verde Coop",
        "n": "Fusilli integrali Bio 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.05,
        "fid": "1965",
        "pg": 6
      },
      {
        "s": "Carrefour",
        "b": "Carrefour Bio",
        "n": "Tortiglioni integrali Bio 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.99,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Esselunga",
        "b": "Esselunga Bio",
        "n": "Penne integrali Bio 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.19,
        "fid": "789",
        "pg": 3
      },
      {
        "s": "Pam",
        "b": "Pam Semplici e Buoni",
        "n": "Spaghetti integrali 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.99,
        "fid": "275",
        "pg": 4
      },
      {
        "s": "Decò",
        "b": "Decò Benessere",
        "n": "Penne rigate integrali 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.89,
        "fid": "546",
        "pg": 3
      }
    ]
  },
  {
    "id": "gnocchi",
    "g": "Gnocchi di patate (500 g)",
    "e": "🥟",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Tre Mulini",
        "n": "Gnocchetti di patate 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.69,
        "fid": "105",
        "pg": 2
      },
      {
        "s": "Lidl",
        "b": "Chef Select",
        "n": "Gnocchi di patate freschi 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.79,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Aldi",
        "b": "Cucina Nobile",
        "n": "Gnocchi di patate 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.79,
        "fid": "2328",
        "pg": 2
      },
      {
        "s": "MD",
        "b": "Le Specialità di Beppe",
        "n": "Gnocchetti di patate 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.85,
        "fid": "114",
        "pg": 5
      },
      {
        "s": "Penny",
        "b": "Cuor di Terra",
        "n": "Gnocchi di patate freschi 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.85,
        "fid": "69",
        "pg": 3
      },
      {
        "s": "Todis",
        "b": "L'Arte delle Paste",
        "n": "Gnocchi di patate 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.89,
        "fid": "493",
        "pg": 4
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Gnocchi di patate 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.99,
        "fid": "398",
        "pg": 5
      },
      {
        "s": "Coop",
        "b": "Coop",
        "n": "Gnocchi di patate freschi 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.09,
        "fid": "1965",
        "pg": 5
      },
      {
        "s": "Esselunga",
        "b": "Esselunga",
        "n": "Gnocchi di patate freschi 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.15,
        "fid": "789",
        "pg": 4
      },
      {
        "s": "Pewex",
        "b": "Giovanni Rana",
        "n": "Gnocchi di patate freschi 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.49,
        "fid": "833",
        "pg": 3
      },
      {
        "s": "Famila",
        "b": "Mamma Emma",
        "n": "Gnocchi di patate con patate fresche cotte al vapore 400 g",
        "q": 0.4,
        "u": "kg",
        "p": 1.79,
        "fid": "106",
        "pg": 4
      }
    ]
  },
  {
    "id": "passata",
    "g": "Passata di pomodoro",
    "e": "🍅",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Delizie dal Sole",
        "n": "Passata di pomodoro datterino 360 g",
        "q": 0.36,
        "u": "kg",
        "p": 0.79,
        "fid": "105",
        "pg": 2
      },
      {
        "s": "Lidl",
        "b": "Freshona",
        "n": "Passata di pomodoro 100% italiano 700 g",
        "q": 0.7,
        "u": "kg",
        "p": 0.79,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Aldi",
        "b": "Cucina Nobile",
        "n": "Passata classica di pomodoro 700 g",
        "q": 0.7,
        "u": "kg",
        "p": 0.79,
        "fid": "2328",
        "pg": 2
      },
      {
        "s": "Penny",
        "b": "Le Primizie",
        "n": "Passata di pomodoro italiano 700 g",
        "q": 0.7,
        "u": "kg",
        "p": 0.82,
        "fid": "69",
        "pg": 2
      },
      {
        "s": "MD",
        "b": "Voglia di Dolcezza",
        "n": "Passata di pomodoro vellutata 700 g",
        "q": 0.7,
        "u": "kg",
        "p": 0.85,
        "fid": "114",
        "pg": 3
      },
      {
        "s": "Esselunga",
        "b": "Esselunga",
        "n": "Passata rustica 700 g",
        "q": 0.7,
        "u": "kg",
        "p": 0.85,
        "fid": "789",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Passata di pomodoro classica 700 g",
        "q": 0.7,
        "u": "kg",
        "p": 0.89,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Coop",
        "b": "Coop",
        "n": "Passata di pomodoro italiano 700 g",
        "q": 0.7,
        "u": "kg",
        "p": 0.89,
        "fid": "1965",
        "pg": 5
      },
      {
        "s": "Carrefour",
        "b": "Carrefour Classic",
        "n": "Passata di pomodoro vellutata 700 g",
        "q": 0.7,
        "u": "kg",
        "p": 0.89,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Pam",
        "b": "Pam",
        "n": "Passata di pomodoro verace 700 g",
        "q": 0.7,
        "u": "kg",
        "p": 0.95,
        "fid": "275",
        "pg": 3
      },
      {
        "s": "Decò",
        "b": "Decò",
        "n": "Passata rustica trafilata 700 g",
        "q": 0.7,
        "u": "kg",
        "p": 0.95,
        "fid": "546",
        "pg": 4
      },
      {
        "s": "Bennet",
        "b": "Mutti",
        "n": "Passata di pomodoro classica Mutti 700 g",
        "q": 0.7,
        "u": "kg",
        "p": 1.19,
        "fid": "1862",
        "pg": 3
      },
      {
        "s": "Pewex",
        "b": "Mutti",
        "n": "Passata di pomodoro Mutti 700 g",
        "q": 0.7,
        "u": "kg",
        "p": 1.15,
        "fid": "833",
        "pg": 2
      },
      {
        "s": "Tigros",
        "b": "Cirio",
        "n": "Passata Verace Cirio 700 g",
        "q": 0.7,
        "u": "kg",
        "p": 1.09,
        "fid": "391",
        "pg": 4
      },
      {
        "s": "Iperal",
        "b": "Pomi",
        "n": "Passata di pomodoro Pomi 700 g",
        "q": 0.7,
        "u": "kg",
        "p": 0.99,
        "fid": "1957",
        "pg": 3
      }
    ]
  },
  {
    "id": "pomodori",
    "g": "Pomodori",
    "e": "🍅",
    "c": "alimentari",
    "o": [
      {
        "s": "Lidl",
        "b": "Ortofrutta",
        "n": "Pomodoro a grappolo al kg",
        "q": 1,
        "u": "kg",
        "p": 1.49,
        "fid": "559",
        "pg": 1
      },
      {
        "s": "Eurospin",
        "b": "Fresco del Giorno",
        "n": "Pomodori Picadilly 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.99,
        "fid": "105",
        "pg": 1
      },
      {
        "s": "Aldi",
        "b": "I Colori del Sapore",
        "n": "Pomodoro ciliegino 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.99,
        "fid": "2328",
        "pg": 1
      },
      {
        "s": "Pam",
        "b": "Pam Panorama",
        "n": "Pomodoro datterino 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 0.99,
        "fid": "275",
        "pg": 2
      },
      {
        "s": "Penny",
        "b": "Orto Penny",
        "n": "Pomodori ramati al kg",
        "q": 1,
        "u": "kg",
        "p": 1.59,
        "fid": "69",
        "pg": 1
      },
      {
        "s": "Conad",
        "b": "Conad Percorso Qualità",
        "n": "Pomodoro ciliegino IGP 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.29,
        "fid": "398",
        "pg": 2
      },
      {
        "s": "Coop",
        "b": "Origine Coop",
        "n": "Pomodoro datterino dolce 350 g",
        "q": 0.35,
        "u": "kg",
        "p": 1.19,
        "fid": "1965",
        "pg": 2
      },
      {
        "s": "Carrefour",
        "b": "Filiera Qualità",
        "n": "Pomodori datterini 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.39,
        "fid": "54",
        "pg": 2
      },
      {
        "s": "Esselunga",
        "b": "Esselunga",
        "n": "Pomodoro datterino 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.48,
        "fid": "789",
        "pg": 2
      },
      {
        "s": "Pewex",
        "b": "Gros Orto",
        "n": "Pomodori San Marzano al kg",
        "q": 1,
        "u": "kg",
        "p": 1.69,
        "fid": "833",
        "pg": 1
      },
      {
        "s": "Decò",
        "b": "Decò Ortofrutta",
        "n": "Pomodoro cuore di bue al kg",
        "q": 1,
        "u": "kg",
        "p": 1.99,
        "fid": "546",
        "pg": 2
      }
    ]
  },
  {
    "id": "latte",
    "g": "Latte UHT (1 L)",
    "e": "🥛",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Land",
        "n": "Latte UHT parzialmente scremato 1 L",
        "q": 1,
        "u": "l",
        "p": 0.79,
        "fid": "105",
        "pg": 2
      },
      {
        "s": "Lidl",
        "b": "Milbona",
        "n": "Latte UHT parzialmente scremato 100% italiano 1 L",
        "q": 1,
        "u": "l",
        "p": 0.85,
        "fid": "559",
        "pg": 2
      },
      {
        "s": "Aldi",
        "b": "Milsani",
        "n": "Latte UHT parzialmente scremato 1 L",
        "q": 1,
        "u": "l",
        "p": 0.85,
        "fid": "2328",
        "pg": 3
      },
      {
        "s": "Penny",
        "b": "Valbontà",
        "n": "Latte UHT parzialmente scremato 1 L",
        "q": 1,
        "u": "l",
        "p": 0.85,
        "fid": "69",
        "pg": 2
      },
      {
        "s": "MD",
        "b": "Malga Paradiso",
        "n": "Latte UHT parzialmente scremato 1 L",
        "q": 1,
        "u": "l",
        "p": 0.89,
        "fid": "114",
        "pg": 3
      },
      {
        "s": "Todis",
        "b": "Colle Maggio",
        "n": "Latte UHT parzialmente scremato 1 L",
        "q": 1,
        "u": "l",
        "p": 0.89,
        "fid": "493",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Latte UHT parzialmente scremato 1 L",
        "q": 1,
        "u": "l",
        "p": 0.95,
        "fid": "398",
        "pg": 3
      },
      {
        "s": "Coop",
        "b": "Coop",
        "n": "Latte UHT parzialmente scremato 1 L",
        "q": 1,
        "u": "l",
        "p": 0.99,
        "fid": "1965",
        "pg": 4
      },
      {
        "s": "Pam",
        "b": "Granarolo",
        "n": "Latte Granarolo parzialmente scremato 1 L",
        "q": 1,
        "u": "l",
        "p": 0.99,
        "fid": "275",
        "pg": 5
      },
      {
        "s": "Carrefour",
        "b": "Carrefour Classic",
        "n": "Latte UHT parzialmente scremato 1 L",
        "q": 1,
        "u": "l",
        "p": 0.95,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Esselunga",
        "b": "Esselunga",
        "n": "Latte UHT parzialmente scremato 1 L",
        "q": 1,
        "u": "l",
        "p": 0.99,
        "fid": "789",
        "pg": 2
      },
      {
        "s": "Pewex",
        "b": "Parmalat",
        "n": "Latte Parmalat Bontà e Linea Parz. Scremato 1 L",
        "q": 1,
        "u": "l",
        "p": 1.19,
        "fid": "833",
        "pg": 3
      },
      {
        "s": "Bennet",
        "b": "Centrale del Latte",
        "n": "Latte UHT Parzialmente Scremato 1 L",
        "q": 1,
        "u": "l",
        "p": 1.09,
        "fid": "1862",
        "pg": 4
      },
      {
        "s": "Tigros",
        "b": "Zymil",
        "n": "Latte Parmalat Zymil Alta Digeribilità 1 L",
        "q": 1,
        "u": "l",
        "p": 1.39,
        "fid": "391",
        "pg": 3
      }
    ]
  },
  {
    "id": "yogurt",
    "g": "Yogurt",
    "e": "🫙",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Land",
        "n": "Yogurt intero vari gusti 125 g ×2",
        "q": 0.25,
        "u": "kg",
        "p": 0.69,
        "fid": "105",
        "pg": 2
      },
      {
        "s": "Lidl",
        "b": "Milbona",
        "n": "Yogurt magro alla frutta 125 g ×2",
        "q": 0.25,
        "u": "kg",
        "p": 0.75,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Aldi",
        "b": "Milsani",
        "n": "Yogurt cremoso vari gusti 125 g ×2",
        "q": 0.25,
        "u": "kg",
        "p": 0.75,
        "fid": "2328",
        "pg": 2
      },
      {
        "s": "MD",
        "b": "Malga Paradiso",
        "n": "Yogurt compatto 125 g ×2",
        "q": 0.25,
        "u": "kg",
        "p": 0.79,
        "fid": "114",
        "pg": 4
      },
      {
        "s": "Crai",
        "b": "Müller",
        "n": "Yogurt vari gusti 125 g ×2",
        "q": 0.25,
        "u": "kg",
        "p": 0.89,
        "fid": "5042573",
        "pg": 1
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Yogurt intero cremoso 125 g ×2",
        "q": 0.25,
        "u": "kg",
        "p": 0.89,
        "fid": "398",
        "pg": 3
      },
      {
        "s": "Coop",
        "b": "Coop",
        "n": "Yogurt magro con frutta in pezzi 125 g ×2",
        "q": 0.25,
        "u": "kg",
        "p": 0.95,
        "fid": "1965",
        "pg": 3
      },
      {
        "s": "Pam",
        "b": "Yomo",
        "n": "Yogurt Yomo 100% latte italiano 125 g ×2",
        "q": 0.25,
        "u": "kg",
        "p": 1.09,
        "fid": "275",
        "pg": 4
      },
      {
        "s": "Esselunga",
        "b": "Danone Danacol",
        "n": "Danone Danacol fragola 100 g ×4",
        "q": 0.4,
        "u": "kg",
        "p": 2.79,
        "fid": "789",
        "pg": 3
      },
      {
        "s": "Pewex",
        "b": "Müller",
        "n": "Yogurt Müller Mix 150 g",
        "q": 0.15,
        "u": "kg",
        "p": 0.79,
        "fid": "833",
        "pg": 3
      },
      {
        "s": "Decò",
        "b": "Fage",
        "n": "Yogurt Greco Fage Total 0% 150 g",
        "q": 0.15,
        "u": "kg",
        "p": 1.15,
        "fid": "546",
        "pg": 2
      }
    ]
  },
  {
    "id": "parmigiano",
    "g": "Parmigiano/Grana grattugiato (100 g)",
    "e": "🧀",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Land",
        "n": "Parmigiano Reggiano DOP grattugiato 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 1.49,
        "fid": "105",
        "pg": 0
      },
      {
        "s": "Lidl",
        "b": "Antichi Maestri",
        "n": "Grana Padano DOP grattugiato fresco 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 1.55,
        "fid": "559",
        "pg": 2
      },
      {
        "s": "Aldi",
        "b": "Regione Che Vai",
        "n": "Parmigiano Reggiano DOP 24 mesi grattugiato 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 1.59,
        "fid": "2328",
        "pg": 3
      },
      {
        "s": "MD",
        "b": "Malga Paradiso",
        "n": "Grana Padano DOP grattugiato 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 1.59,
        "fid": "114",
        "pg": 3
      },
      {
        "s": "Penny",
        "b": "Cuor di Terra",
        "n": "Parmigiano Reggiano DOP grattugiato 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 1.65,
        "fid": "69",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Conad Sapori & Dintorni",
        "n": "Parmigiano Reggiano DOP grattugiato 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 1.79,
        "fid": "398",
        "pg": 3
      },
      {
        "s": "Coop",
        "b": "Fior Fiore Coop",
        "n": "Parmigiano Reggiano DOP 30 mesi grattugiato 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 1.85,
        "fid": "1965",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Carrefour Extra",
        "n": "Grana Padano DOP Riserva grattugiato 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 1.79,
        "fid": "54",
        "pg": 3
      },
      {
        "s": "Pam",
        "b": "Pam Panorama",
        "n": "Parmigiano Reggiano DOP grattugiato 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 1.89,
        "fid": "275",
        "pg": 4
      },
      {
        "s": "Esselunga",
        "b": "Esselunga",
        "n": "Grana Padano grattugiato fresco 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 1.93,
        "fid": "789",
        "pg": 2
      },
      {
        "s": "Pewex",
        "b": "Parmareggio",
        "n": "Parmareggio Parmigiano Reggiano 30 Mesi Grattugiato 60 g",
        "q": 0.06,
        "u": "kg",
        "p": 1.25,
        "fid": "833",
        "pg": 2
      },
      {
        "s": "Famila",
        "b": "Gran Biraghi",
        "n": "Gran Biraghi Formaggio Grattugiato Fresco 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 1.49,
        "fid": "106",
        "pg": 3
      }
    ]
  },
  {
    "id": "grana",
    "g": "Grana Padano / formaggi duri (al kg)",
    "e": "🧀",
    "c": "alimentari",
    "o": [
      {
        "s": "Decò",
        "b": "Decò",
        "n": "Grana Padano DOP al kg",
        "q": 1,
        "u": "kg",
        "p": 11.2,
        "fid": "546",
        "pg": 4
      },
      {
        "s": "Eurospin",
        "b": "Land",
        "n": "Grana Padano DOP trancio sottovuoto al kg",
        "q": 1,
        "u": "kg",
        "p": 11.5,
        "fid": "105",
        "pg": 1
      },
      {
        "s": "Lidl",
        "b": "Italiamo",
        "n": "Grana Padano DOP stagionato 16 mesi al kg",
        "q": 1,
        "u": "kg",
        "p": 11.9,
        "fid": "559",
        "pg": 2
      },
      {
        "s": "Decò",
        "b": "Galbani",
        "n": "Galbanone al kg",
        "q": 1,
        "u": "kg",
        "p": 11.9,
        "fid": "546",
        "pg": 4
      },
      {
        "s": "MD",
        "b": "Malga Paradiso",
        "n": "Grana Padano DOP oltre 16 mesi al kg",
        "q": 1,
        "u": "kg",
        "p": 12.2,
        "fid": "114",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Grana Padano DOP porzionato al kg",
        "q": 1,
        "u": "kg",
        "p": 12.9,
        "fid": "398",
        "pg": 3
      },
      {
        "s": "Coop",
        "b": "Coop",
        "n": "Grana Padano DOP stagionato al kg",
        "q": 1,
        "u": "kg",
        "p": 13.2,
        "fid": "1965",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Carrefour",
        "n": "Parmigiano Reggiano DOP 24 mesi al kg",
        "q": 1,
        "u": "kg",
        "p": 14.9,
        "fid": "54",
        "pg": 3
      },
      {
        "s": "Decò",
        "b": "Decò",
        "n": "Toma Piemontese DOP al kg",
        "q": 1,
        "u": "kg",
        "p": 14.5,
        "fid": "546",
        "pg": 2
      },
      {
        "s": "Esselunga",
        "b": "Esselunga",
        "n": "Parmigiano Reggiano DOP 24 mesi al kg",
        "q": 1,
        "u": "kg",
        "p": 15.9,
        "fid": "789",
        "pg": 2
      },
      {
        "s": "Pewex",
        "b": "Gros Banco Taglio",
        "n": "Pecorino Romano DOP al kg",
        "q": 1,
        "u": "kg",
        "p": 16.9,
        "fid": "833",
        "pg": 2
      }
    ]
  },
  {
    "id": "mozzarella",
    "g": "Mozzarella",
    "e": "🫓",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Land",
        "n": "Mozzarella per pizze 1 kg",
        "q": 1,
        "u": "kg",
        "p": 4.99,
        "fid": "105",
        "pg": 1
      },
      {
        "s": "Lidl",
        "b": "Milbona",
        "n": "Mozzarella fresca 125 g ×3",
        "q": 0.375,
        "u": "kg",
        "p": 1.99,
        "fid": "559",
        "pg": 2
      },
      {
        "s": "Aldi",
        "b": "Milsani",
        "n": "Mozzarella di latte italiano 125 g ×3",
        "q": 0.375,
        "u": "kg",
        "p": 1.99,
        "fid": "2328",
        "pg": 2
      },
      {
        "s": "Penny",
        "b": "Valbontà",
        "n": "Mozzarella 125 g ×3",
        "q": 0.375,
        "u": "kg",
        "p": 2.09,
        "fid": "69",
        "pg": 3
      },
      {
        "s": "MD",
        "b": "Malga Paradiso",
        "n": "Treccia di mozzarella 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 1.69,
        "fid": "114",
        "pg": 4
      },
      {
        "s": "Todis",
        "b": "Colle Maggio",
        "n": "Mozzarella fiordilatte 100 g ×3",
        "q": 0.3,
        "u": "kg",
        "p": 1.89,
        "fid": "493",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Mozzarella classica 125 g ×3",
        "q": 0.375,
        "u": "kg",
        "p": 2.29,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Coop",
        "b": "Coop",
        "n": "Mozzarella Fior di Latte 125 g ×3",
        "q": 0.375,
        "u": "kg",
        "p": 2.39,
        "fid": "1965",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Santa Lucia",
        "n": "Mozzarella Galbani Santa Lucia 125 g ×3",
        "q": 0.375,
        "u": "kg",
        "p": 2.79,
        "fid": "54",
        "pg": 3
      },
      {
        "s": "Pam",
        "b": "Granarolo",
        "n": "Mozzarella Granarolo fresca 100 g ×3",
        "q": 0.3,
        "u": "kg",
        "p": 2.49,
        "fid": "275",
        "pg": 4
      },
      {
        "s": "Pewex",
        "b": "La Mandorla",
        "n": "Mozzarella di Bufala Campana DOP 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 2.89,
        "fid": "833",
        "pg": 2
      },
      {
        "s": "Bennet",
        "b": "Pettinicchio",
        "n": "Fior di Latte Pettinicchio 100 g ×3",
        "q": 0.3,
        "u": "kg",
        "p": 2.69,
        "fid": "1862",
        "pg": 3
      }
    ]
  },
  {
    "id": "ricotta",
    "g": "Ricotta fresca",
    "e": "🫙",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Land",
        "n": "Ricotta fresca 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 0.55,
        "fid": "105",
        "pg": 1
      },
      {
        "s": "Lidl",
        "b": "Milbona",
        "n": "Ricotta vaccina 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 0.59,
        "fid": "559",
        "pg": 2
      },
      {
        "s": "Aldi",
        "b": "Milsani",
        "n": "Ricotta fresca 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 0.59,
        "fid": "2328",
        "pg": 2
      },
      {
        "s": "Penny",
        "b": "Valbontà",
        "n": "Ricotta fresca di siero di latte 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 0.65,
        "fid": "69",
        "pg": 2
      },
      {
        "s": "MD",
        "b": "Malga Paradiso",
        "n": "Ricotta vaccina fresca 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 0.69,
        "fid": "114",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Ricotta fresca vaccina 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 0.79,
        "fid": "398",
        "pg": 3
      },
      {
        "s": "Coop",
        "b": "Coop",
        "n": "Ricotta fresca 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 0.85,
        "fid": "1965",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Santa Lucia",
        "n": "Ricotta Galbani Santa Lucia 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 0.99,
        "fid": "54",
        "pg": 3
      },
      {
        "s": "Esselunga",
        "b": "Vallelata",
        "n": "Ricotta fresca Vallelata 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 1.09,
        "fid": "789",
        "pg": 2
      },
      {
        "s": "Pewex",
        "b": "Granarolo",
        "n": "Ricotta Granarolo fresca 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 0.95,
        "fid": "833",
        "pg": 3
      }
    ]
  },
  {
    "id": "spalmabile",
    "g": "Formaggio fresco spalmabile (200 g)",
    "e": "🧀",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Land",
        "n": "Formaggio fresco spalmabile 200 g",
        "q": 0.2,
        "u": "kg",
        "p": 0.79,
        "fid": "105",
        "pg": 2
      },
      {
        "s": "Lidl",
        "b": "Milbona",
        "n": "Formaggio fresco spalmabile cremoso 200 g",
        "q": 0.2,
        "u": "kg",
        "p": 0.85,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Aldi",
        "b": "Milsani",
        "n": "Formaggio spalmabile 200 g",
        "q": 0.2,
        "u": "kg",
        "p": 0.85,
        "fid": "2328",
        "pg": 3
      },
      {
        "s": "Esselunga",
        "b": "Esselunga",
        "n": "Formaggio fresco spalmabile 200 g",
        "q": 0.2,
        "u": "kg",
        "p": 0.85,
        "fid": "789",
        "pg": 2
      },
      {
        "s": "MD",
        "b": "Malga Paradiso",
        "n": "Cremosino spalmabile 200 g",
        "q": 0.2,
        "u": "kg",
        "p": 0.89,
        "fid": "114",
        "pg": 4
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Formaggio fresco spalmabile 200 g",
        "q": 0.2,
        "u": "kg",
        "p": 0.99,
        "fid": "398",
        "pg": 3
      },
      {
        "s": "Coop",
        "b": "Coop",
        "n": "Formaggio fresco spalmabile 200 g",
        "q": 0.2,
        "u": "kg",
        "p": 1.05,
        "fid": "1965",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Philadelphia",
        "n": "Philadelphia Original 150 g",
        "q": 0.15,
        "u": "kg",
        "p": 1.39,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Pewex",
        "b": "Philadelphia",
        "n": "Philadelphia Classico vaschetta 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 1.99,
        "fid": "833",
        "pg": 3
      },
      {
        "s": "Pam",
        "b": "Exquisa",
        "n": "Exquisa Formaggio Spalmabile Classico 175 g",
        "q": 0.175,
        "u": "kg",
        "p": 1.19,
        "fid": "275",
        "pg": 4
      }
    ]
  },
  {
    "id": "prosciutto-parma",
    "g": "Prosciutto di Parma (100 g)",
    "e": "🍖",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Bottega del Gusto",
        "n": "Prosciutto di Parma DOP 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 2.59,
        "fid": "105",
        "pg": 1
      },
      {
        "s": "Lidl",
        "b": "Dal Salumiere",
        "n": "Prosciutto di Parma DOP stagionato 18 mesi 90 g",
        "q": 0.09,
        "u": "kg",
        "p": 2.49,
        "fid": "559",
        "pg": 2
      },
      {
        "s": "Aldi",
        "b": "Regione Che Vai",
        "n": "Prosciutto di Parma DOP 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 2.69,
        "fid": "2328",
        "pg": 3
      },
      {
        "s": "MD",
        "b": "La Fattoria",
        "n": "Prosciutto di Parma DOP 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 2.69,
        "fid": "114",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Conad Sapori & Dintorni",
        "n": "Prosciutto di Parma DOP 20 mesi 90 g",
        "q": 0.09,
        "u": "kg",
        "p": 2.99,
        "fid": "398",
        "pg": 2
      },
      {
        "s": "Coop",
        "b": "Fior Fiore Coop",
        "n": "Prosciutto di Parma DOP stagionato 24 mesi 90 g",
        "q": 0.09,
        "u": "kg",
        "p": 3.19,
        "fid": "1965",
        "pg": 3
      },
      {
        "s": "Carrefour",
        "b": "Citterio",
        "n": "Tagliofresco Prosciutto di Parma DOP Citterio 80 g",
        "q": 0.08,
        "u": "kg",
        "p": 2.89,
        "fid": "54",
        "pg": 3
      },
      {
        "s": "Pam",
        "b": "Pam Panorama",
        "n": "Fiocco di prosciutto crudo stagionato 90 g",
        "q": 0.09,
        "u": "kg",
        "p": 3.99,
        "fid": "275",
        "pg": 8
      },
      {
        "s": "Esselunga",
        "b": "Esselunga Top",
        "n": "Prosciutto di Parma DOP 24 mesi 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 3.89,
        "fid": "789",
        "pg": 2
      },
      {
        "s": "Pewex",
        "b": "Gros Banco Salumi",
        "n": "Prosciutto di Parma DOP al banco (all'etto)",
        "q": 0.1,
        "u": "kg",
        "p": 2.79,
        "fid": "833",
        "pg": 2
      }
    ]
  },
  {
    "id": "salame",
    "g": "Salame (al kg)",
    "e": "🥫",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Bottega del Gusto",
        "n": "Salame Napoli 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 1.29,
        "fid": "105",
        "pg": 1
      },
      {
        "s": "Lidl",
        "b": "Dal Salumiere",
        "n": "Salame Milano a fette 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 1.39,
        "fid": "559",
        "pg": 2
      },
      {
        "s": "Aldi",
        "b": "Il Tagliere del Re",
        "n": "Salame Ungherese 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 1.39,
        "fid": "2328",
        "pg": 2
      },
      {
        "s": "MD",
        "b": "La Fattoria",
        "n": "Salame Nostrano intero al kg",
        "q": 1,
        "u": "kg",
        "p": 12.9,
        "fid": "114",
        "pg": 3
      },
      {
        "s": "Penny",
        "b": "Sapore di Mare e Terra",
        "n": "Salame tipo Milano 150 g",
        "q": 0.15,
        "u": "kg",
        "p": 1.99,
        "fid": "69",
        "pg": 2
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Salame Golfetta al banco al kg",
        "q": 1,
        "u": "kg",
        "p": 18.9,
        "fid": "398",
        "pg": 2
      },
      {
        "s": "Coop",
        "b": "Coop",
        "n": "Salame Felino IGP al kg",
        "q": 1,
        "u": "kg",
        "p": 19.5,
        "fid": "1965",
        "pg": 3
      },
      {
        "s": "Carrefour",
        "b": "Negroni",
        "n": "Salame Ungherese Negroni 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 1.99,
        "fid": "54",
        "pg": 3
      },
      {
        "s": "Pewex",
        "b": "Beretta",
        "n": "Salame Milano Beretta al banco al kg",
        "q": 1,
        "u": "kg",
        "p": 16.9,
        "fid": "833",
        "pg": 2
      }
    ]
  },
  {
    "id": "bresaola",
    "g": "Bresaola",
    "e": "🥩",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Bottega del Gusto",
        "n": "Bresaola 120 g",
        "q": 0.12,
        "u": "kg",
        "p": 1.49,
        "fid": "105",
        "pg": 1
      },
      {
        "s": "Lidl",
        "b": "Dal Salumiere",
        "n": "Bresaola della Valtellina IGP Punta d'Anca 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 2.49,
        "fid": "559",
        "pg": 2
      },
      {
        "s": "Aldi",
        "b": "Il Tagliere del Re",
        "n": "Bresaola della Valtellina IGP 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 2.59,
        "fid": "2328",
        "pg": 3
      },
      {
        "s": "MD",
        "b": "La Fattoria",
        "n": "Bresaola punta d'anca a fette 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 2.69,
        "fid": "114",
        "pg": 3
      },
      {
        "s": "Penny",
        "b": "Cuor di Terra",
        "n": "Bresaola della Valtellina IGP 90 g",
        "q": 0.09,
        "u": "kg",
        "p": 2.69,
        "fid": "69",
        "pg": 3
      },
      {
        "s": "Pam",
        "b": "Pam",
        "n": "Bresaola della Valtellina IGP 80 g",
        "q": 0.08,
        "u": "kg",
        "p": 3.69,
        "fid": "275",
        "pg": 8
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Bresaola della Valtellina IGP 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 3.19,
        "fid": "398",
        "pg": 2
      },
      {
        "s": "Coop",
        "b": "Origine Coop",
        "n": "Bresaola della Valtellina IGP punta d'anca 90 g",
        "q": 0.09,
        "u": "kg",
        "p": 3.29,
        "fid": "1965",
        "pg": 3
      },
      {
        "s": "Carrefour",
        "b": "Rigamonti",
        "n": "Bresaola Rigamonti della Valtellina IGP 90 g",
        "q": 0.09,
        "u": "kg",
        "p": 3.49,
        "fid": "54",
        "pg": 3
      },
      {
        "s": "Pewex",
        "b": "Rigamonti",
        "n": "Bresaola Punta d'Anca Rigamonti al banco (all'etto)",
        "q": 0.1,
        "u": "kg",
        "p": 2.99,
        "fid": "833",
        "pg": 2
      }
    ]
  },
  {
    "id": "affettati",
    "g": "Affettati (100 g)",
    "e": "🥪",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Bottega del Gusto",
        "n": "Arrosto a fette 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 1.99,
        "fid": "105",
        "pg": 1
      },
      {
        "s": "Lidl",
        "b": "Dulano",
        "n": "Prosciutto cotto alta qualità a fette 120 g",
        "q": 0.12,
        "u": "kg",
        "p": 1.69,
        "fid": "559",
        "pg": 2
      },
      {
        "s": "Aldi",
        "b": "Il Tagliere del Re",
        "n": "Petto di tacchino al forno 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 1.79,
        "fid": "2328",
        "pg": 2
      },
      {
        "s": "MD",
        "b": "La Fattoria",
        "n": "Mortadella Bologna IGP 120 g",
        "q": 0.12,
        "u": "kg",
        "p": 1.29,
        "fid": "114",
        "pg": 3
      },
      {
        "s": "Esselunga",
        "b": "Esselunga",
        "n": "Arrosto di tacchino a fette 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 2.15,
        "fid": "789",
        "pg": 2
      },
      {
        "s": "Esselunga",
        "b": "Esselunga",
        "n": "Würstel di puro suino 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 1.58,
        "fid": "789",
        "pg": 2
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Prosciutto cotto nazionale alta qualità 120 g",
        "q": 0.12,
        "u": "kg",
        "p": 2.29,
        "fid": "398",
        "pg": 3
      },
      {
        "s": "Carrefour",
        "b": "Rovagnati",
        "n": "Gran Biscotto Rovagnati a fette 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 2.69,
        "fid": "54",
        "pg": 3
      },
      {
        "s": "Pewex",
        "b": "Ferrarini",
        "n": "Prosciutto Cotto Alta Qualità Ferrarini all'etto",
        "q": 0.1,
        "u": "kg",
        "p": 1.89,
        "fid": "833",
        "pg": 2
      }
    ]
  },
  {
    "id": "hamburger",
    "g": "Hamburger surgelati",
    "e": "🍔",
    "c": "alimentari",
    "o": [
      {
        "s": "MD",
        "b": "MD",
        "n": "Tris di hamburger 450 g",
        "q": 0.45,
        "u": "kg",
        "p": 2.2,
        "fid": "114",
        "pg": 2
      },
      {
        "s": "Eurospin",
        "b": "Buon'Ora",
        "n": "Hamburger di tacchino e pollo 400 g",
        "q": 0.4,
        "u": "kg",
        "p": 2.29,
        "fid": "105",
        "pg": 3
      },
      {
        "s": "Penny",
        "b": "Penny Macelleria",
        "n": "Mini burger di bovino 300 g",
        "q": 0.3,
        "u": "kg",
        "p": 2.49,
        "fid": "69",
        "pg": 2
      },
      {
        "s": "Aldi",
        "b": "Il Podere",
        "n": "Hamburger di bovino scottona 2 × 150 g",
        "q": 0.3,
        "u": "kg",
        "p": 2.99,
        "fid": "2328",
        "pg": 2
      },
      {
        "s": "Lidl",
        "b": "Lidl",
        "n": "Hamburger di bovino 6 × 80 g",
        "q": 0.48,
        "u": "kg",
        "p": 4.99,
        "fid": "559",
        "pg": 0
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Hamburger di Chianina 200 g",
        "q": 0.2,
        "u": "kg",
        "p": 3.29,
        "fid": "398",
        "pg": 3
      },
      {
        "s": "Coop",
        "b": "Fior Fiore Coop",
        "n": "Burger di Angus irlandese 2 × 150 g",
        "q": 0.3,
        "u": "kg",
        "p": 3.99,
        "fid": "1965",
        "pg": 3
      },
      {
        "s": "Carrefour",
        "b": "Amadori",
        "n": "Evviva Burger di pollo Amadori 200 g",
        "q": 0.2,
        "u": "kg",
        "p": 1.99,
        "fid": "54",
        "pg": 3
      },
      {
        "s": "Pewex",
        "b": "Aia",
        "n": "Dakota Hamburger di tacchino Aia 200 g",
        "q": 0.2,
        "u": "kg",
        "p": 1.89,
        "fid": "833",
        "pg": 2
      }
    ]
  },
  {
    "id": "salmone",
    "g": "Salmone",
    "e": "🐟",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Ondina",
        "n": "Filetti di salmone all'olio 150 g",
        "q": 0.15,
        "u": "kg",
        "p": 2.39,
        "fid": "105",
        "pg": 3
      },
      {
        "s": "Lidl",
        "b": "Nautica",
        "n": "Salmone scozzese affumicato 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 2.99,
        "fid": "559",
        "pg": 2
      },
      {
        "s": "Aldi",
        "b": "Golden Seafood",
        "n": "Salmone norvegese affumicato 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 2.99,
        "fid": "2328",
        "pg": 2
      },
      {
        "s": "Penny",
        "b": "Al Mare",
        "n": "Salmone affumicato norvegese 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 3.19,
        "fid": "69",
        "pg": 2
      },
      {
        "s": "MD",
        "b": "Poseidon",
        "n": "Salmone norvegese affumicato a fette 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 3.29,
        "fid": "114",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Salmone norvegese affumicato 100 g",
        "q": 0.1,
        "u": "kg",
        "p": 3.69,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Labeyrie",
        "n": "Salmone affumicato norvegese Labeyrie 150 g",
        "q": 0.15,
        "u": "kg",
        "p": 5.49,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Pam",
        "b": "Pam Panorama",
        "n": "Salmone affumicato biologico 75 g",
        "q": 0.075,
        "u": "kg",
        "p": 4.49,
        "fid": "275",
        "pg": 5
      },
      {
        "s": "Lidl",
        "b": "Lidl Pescheria",
        "n": "Filetto di salmone con pelle 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 7.49,
        "fid": "559",
        "pg": 0
      },
      {
        "s": "Pewex",
        "b": "Gros Pescheria",
        "n": "Trancio di salmone fresco al kg",
        "q": 1,
        "u": "kg",
        "p": 13.9,
        "fid": "833",
        "pg": 2
      }
    ]
  },
  {
    "id": "tonno",
    "g": "Tonno in scatola",
    "e": "🥫",
    "c": "alimentari",
    "o": [
      {
        "s": "Esselunga",
        "b": "Esselunga",
        "n": "Tonno al naturale 3 × 56 g",
        "q": 0.168,
        "u": "kg",
        "p": 0.99,
        "fid": "789",
        "pg": 3
      },
      {
        "s": "Eurospin",
        "b": "Athena",
        "n": "Tonno all'olio di girasole 3 × 80 g",
        "q": 0.24,
        "u": "kg",
        "p": 1.89,
        "fid": "105",
        "pg": 2
      },
      {
        "s": "Lidl",
        "b": "NIXE",
        "n": "Tonno all'olio di oliva 3 × 80 g",
        "q": 0.24,
        "u": "kg",
        "p": 2.19,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Aldi",
        "b": "Golden Seafood",
        "n": "Tonno all'olio di oliva 4 × 80 g",
        "q": 0.32,
        "u": "kg",
        "p": 2.69,
        "fid": "2328",
        "pg": 3
      },
      {
        "s": "MD",
        "b": "Poseidon",
        "n": "Tonno all'olio vegetale 4 × 80 g",
        "q": 0.32,
        "u": "kg",
        "p": 2.49,
        "fid": "114",
        "pg": 9
      },
      {
        "s": "Penny",
        "b": "Al Mare",
        "n": "Tonno all'olio di oliva 3 × 80 g",
        "q": 0.24,
        "u": "kg",
        "p": 2.29,
        "fid": "69",
        "pg": 2
      },
      {
        "s": "Todis",
        "b": "Pescantico",
        "n": "Tonno all'olio di oliva 3 × 80 g",
        "q": 0.24,
        "u": "kg",
        "p": 2.39,
        "fid": "493",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Tonno all'olio di oliva pescato a canna 3 × 80 g",
        "q": 0.24,
        "u": "kg",
        "p": 2.79,
        "fid": "398",
        "pg": 3
      },
      {
        "s": "Coop",
        "b": "Coop",
        "n": "Tonno all'olio di oliva solidale 3 × 80 g",
        "q": 0.24,
        "u": "kg",
        "p": 2.89,
        "fid": "1965",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Rio Mare",
        "n": "Tonno Rio Mare all'olio di oliva 4 × 80 g",
        "q": 0.32,
        "u": "kg",
        "p": 3.99,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Pewex",
        "b": "Rio Mare",
        "n": "Tonno Rio Mare all'olio di oliva 6 × 80 g",
        "q": 0.48,
        "u": "kg",
        "p": 5.79,
        "fid": "833",
        "pg": 2
      },
      {
        "s": "Famila",
        "b": "Nostromo",
        "n": "Tonno Nostromo all'olio di oliva zero spreco 3 × 65 g",
        "q": 0.195,
        "u": "kg",
        "p": 2.49,
        "fid": "106",
        "pg": 3
      },
      {
        "s": "Tigros",
        "b": "Mareblu",
        "n": "Tonno Mareblu Vero Sapore 3 × 60 g",
        "q": 0.18,
        "u": "kg",
        "p": 2.29,
        "fid": "391",
        "pg": 3
      }
    ]
  },
  {
    "id": "merluzzo",
    "g": "Merluzzo",
    "e": "🐟",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Ondina",
        "n": "Cuori di filetto di merluzzo 400 g",
        "q": 0.4,
        "u": "kg",
        "p": 3.49,
        "fid": "105",
        "pg": 3
      },
      {
        "s": "Lidl",
        "b": "Ocean Sea",
        "n": "Filetti di merluzzo d'Alaska 400 g",
        "q": 0.4,
        "u": "kg",
        "p": 3.59,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Aldi",
        "b": "Golden Seafood",
        "n": "Filetti di merluzzo del Pacifico 400 g",
        "q": 0.4,
        "u": "kg",
        "p": 3.69,
        "fid": "2328",
        "pg": 2
      },
      {
        "s": "MD",
        "b": "Le Specialità di Beppe",
        "n": "Cuori di merluzzo surgelati 400 g",
        "q": 0.4,
        "u": "kg",
        "p": 3.69,
        "fid": "114",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Cuori di filetto di merluzzo nordico 400 g",
        "q": 0.4,
        "u": "kg",
        "p": 4.49,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Coop",
        "b": "Coop",
        "n": "Filetti di merluzzo carbonaro 400 g",
        "q": 0.4,
        "u": "kg",
        "p": 4.69,
        "fid": "1965",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Findus",
        "n": "Fiori di Merluzzo Findus 300 g",
        "q": 0.3,
        "u": "kg",
        "p": 4.99,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Pam",
        "b": "Pam Panorama",
        "n": "Filetti di merluzzo sudafricano 400 g",
        "q": 0.4,
        "u": "kg",
        "p": 6.49,
        "fid": "275",
        "pg": 6
      },
      {
        "s": "Pewex",
        "b": "Findus",
        "n": "I Fiori di Merluzzo Findus 400 g",
        "q": 0.4,
        "u": "kg",
        "p": 5.99,
        "fid": "833",
        "pg": 3
      }
    ]
  },
  {
    "id": "polpo",
    "g": "Polpo cotto",
    "e": "🐙",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Ondina",
        "n": "Tentacoli di polpo cotti al vapore 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 5.49,
        "fid": "105",
        "pg": 3
      },
      {
        "s": "Lidl",
        "b": "Nautica",
        "n": "Tentacoli di polpo cotti 200 g",
        "q": 0.2,
        "u": "kg",
        "p": 4.99,
        "fid": "559",
        "pg": 2
      },
      {
        "s": "MD",
        "b": "MD",
        "n": "Tentacolo di polpo cotto 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 5.99,
        "fid": "114",
        "pg": 2
      },
      {
        "s": "Aldi",
        "b": "Golden Seafood",
        "n": "Polpo cotto a tranci 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 5.99,
        "fid": "2328",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Conad Sapori & Dintorni",
        "n": "Tentacoli di polpo cotti 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 6.99,
        "fid": "398",
        "pg": 3
      },
      {
        "s": "Coop",
        "b": "Fior Fiore Coop",
        "n": "Polpo cotto al vapore 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 7.49,
        "fid": "1965",
        "pg": 4
      },
      {
        "s": "Pewex",
        "b": "Gros Pescheria",
        "n": "Polpo verace fresco al kg",
        "q": 1,
        "u": "kg",
        "p": 18.9,
        "fid": "833",
        "pg": 2
      }
    ]
  },
  {
    "id": "antipasti-mare",
    "g": "Antipasto di mare",
    "e": "🦐",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Ondina",
        "n": "Insalata di mare con verdure 550 g",
        "q": 0.55,
        "u": "kg",
        "p": 4.49,
        "fid": "105",
        "pg": 3
      },
      {
        "s": "Lidl",
        "b": "Nautica",
        "n": "Insalata di mare al naturale 400 g",
        "q": 0.4,
        "u": "kg",
        "p": 3.99,
        "fid": "559",
        "pg": 2
      },
      {
        "s": "MD",
        "b": "Poseidon",
        "n": "Antipasto di mare all'olio 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 4.89,
        "fid": "114",
        "pg": 4
      },
      {
        "s": "Todis",
        "b": "Todis",
        "n": "Antipasto di mare 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 5.49,
        "fid": "493",
        "pg": 9
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Insalata di mare mista 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 5.99,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Coop",
        "b": "Coop",
        "n": "Insalata di mare con gamberi e calamari 400 g",
        "q": 0.4,
        "u": "kg",
        "p": 5.49,
        "fid": "1965",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Carrefour Extra",
        "n": "Antipasto di mare ricco all'olio 550 g",
        "q": 0.55,
        "u": "kg",
        "p": 6.29,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Pewex",
        "b": "Medusa",
        "n": "Insalata di Mare Medusa vaschetta 450 g",
        "q": 0.45,
        "u": "kg",
        "p": 5.89,
        "fid": "833",
        "pg": 3
      }
    ]
  },
  {
    "id": "olio",
    "g": "Olio di semi di girasole (1 L)",
    "e": "🛢️",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Friggi Bene",
        "n": "Olio di semi di girasole 1 L",
        "q": 1,
        "u": "l",
        "p": 1.39,
        "fid": "105",
        "pg": 0
      },
      {
        "s": "Lidl",
        "b": "Vita D'or",
        "n": "Olio di semi di girasole 1 L",
        "q": 1,
        "u": "l",
        "p": 1.45,
        "fid": "559",
        "pg": 2
      },
      {
        "s": "Aldi",
        "b": "Bellasan",
        "n": "Olio di semi di girasole puro 1 L",
        "q": 1,
        "u": "l",
        "p": 1.45,
        "fid": "2328",
        "pg": 2
      },
      {
        "s": "Penny",
        "b": "Le Primizie",
        "n": "Olio di semi di girasole 1 L",
        "q": 1,
        "u": "l",
        "p": 1.49,
        "fid": "69",
        "pg": 2
      },
      {
        "s": "MD",
        "b": "Vivo Meglio",
        "n": "Olio di semi di girasole 1 L",
        "q": 1,
        "u": "l",
        "p": 1.49,
        "fid": "114",
        "pg": 3
      },
      {
        "s": "Todis",
        "b": "Olio Verde",
        "n": "Olio di semi di girasole 1 L",
        "q": 1,
        "u": "l",
        "p": 1.55,
        "fid": "493",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Olio di semi di girasole 1 L",
        "q": 1,
        "u": "l",
        "p": 1.69,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Coop",
        "b": "Coop",
        "n": "Olio di semi di girasole 1 L",
        "q": 1,
        "u": "l",
        "p": 1.75,
        "fid": "1965",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Carrefour Classic",
        "n": "Olio di semi di girasole 1 L",
        "q": 1,
        "u": "l",
        "p": 1.69,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Pam",
        "b": "Cuore",
        "n": "Olio di semi di mais Cuore 1 L",
        "q": 1,
        "u": "l",
        "p": 3.49,
        "fid": "275",
        "pg": 4
      },
      {
        "s": "Pewex",
        "b": "Girasole Bio",
        "n": "Olio di semi di girasole 1 L",
        "q": 1,
        "u": "l",
        "p": 1.59,
        "fid": "833",
        "pg": 3
      },
      {
        "s": "Bennet",
        "b": "Friol",
        "n": "Olio per friggere Friol 1 L",
        "q": 1,
        "u": "l",
        "p": 2.29,
        "fid": "1862",
        "pg": 4
      }
    ]
  },
  {
    "id": "farina",
    "g": "Farina tipo 00 (1 kg)",
    "e": "🌾",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Tre Mulini",
        "n": "Farina tipo 00 per tutti gli usi 1 kg",
        "q": 1,
        "u": "kg",
        "p": 0.59,
        "fid": "105",
        "pg": 2
      },
      {
        "s": "Lidl",
        "b": "Castello",
        "n": "Farina di grano tenero tipo 00 1 kg",
        "q": 1,
        "u": "kg",
        "p": 0.59,
        "fid": "559",
        "pg": 2
      },
      {
        "s": "Aldi",
        "b": "Cucina Nobile",
        "n": "Farina tipo 00 1 kg",
        "q": 1,
        "u": "kg",
        "p": 0.59,
        "fid": "2328",
        "pg": 2
      },
      {
        "s": "MD",
        "b": "Cà Bianca",
        "n": "Farina grano tenero 00 1 kg",
        "q": 1,
        "u": "kg",
        "p": 0.62,
        "fid": "114",
        "pg": 3
      },
      {
        "s": "Penny",
        "b": "Cuor di Terra",
        "n": "Farina di grano tenero tipo 00 1 kg",
        "q": 1,
        "u": "kg",
        "p": 0.65,
        "fid": "69",
        "pg": 2
      },
      {
        "s": "Esselunga",
        "b": "Esselunga",
        "n": "Farina tipo 00 1 kg",
        "q": 1,
        "u": "kg",
        "p": 0.65,
        "fid": "789",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Farina di grano tenero tipo 00 1 kg",
        "q": 1,
        "u": "kg",
        "p": 0.69,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Coop",
        "b": "Coop",
        "n": "Farina di grano tenero tipo 00 1 kg",
        "q": 1,
        "u": "kg",
        "p": 0.72,
        "fid": "1965",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Barilla",
        "n": "Farina tipo 00 Barilla 1 kg",
        "q": 1,
        "u": "kg",
        "p": 0.89,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Pewex",
        "b": "Caputo",
        "n": "Farina Caputo Pizzeria Tipo 00 1 kg",
        "q": 1,
        "u": "kg",
        "p": 1.19,
        "fid": "833",
        "pg": 3
      },
      {
        "s": "Famila",
        "b": "Molino Spadoni",
        "n": "Farina d'America Manitoba Molino Spadoni 1 kg",
        "q": 1,
        "u": "kg",
        "p": 1.39,
        "fid": "106",
        "pg": 4
      }
    ]
  },
  {
    "id": "maionese",
    "g": "Maionese",
    "e": "🥚",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Delizie dal Sole",
        "n": "Maionese in tubo 150 ml",
        "q": 0.15,
        "u": "l",
        "p": 0.79,
        "fid": "105",
        "pg": 2
      },
      {
        "s": "Lidl",
        "b": "Kania",
        "n": "Maionese classica vaso vetro 500 ml",
        "q": 0.5,
        "u": "l",
        "p": 1.49,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Aldi",
        "b": "Cucina Nobile",
        "n": "Maionese classica 450 ml",
        "q": 0.45,
        "u": "l",
        "p": 1.49,
        "fid": "2328",
        "pg": 2
      },
      {
        "s": "MD",
        "b": "Calvé",
        "n": "Maionese classica Calvé 450 ml",
        "q": 0.45,
        "u": "l",
        "p": 2.29,
        "fid": "114",
        "pg": 9
      },
      {
        "s": "Penny",
        "b": "San Fabio",
        "n": "Maionese con uova da allevamento a terra 450 ml",
        "q": 0.45,
        "u": "l",
        "p": 1.59,
        "fid": "69",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Maionese classica vaso 500 ml",
        "q": 0.5,
        "u": "l",
        "p": 1.79,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Coop",
        "b": "Coop",
        "n": "Maionese classica con uova fresche 250 ml",
        "q": 0.25,
        "u": "l",
        "p": 1.15,
        "fid": "1965",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Calvé",
        "n": "Maionese Calvé Raffinata 225 ml",
        "q": 0.225,
        "u": "l",
        "p": 1.69,
        "fid": "54",
        "pg": 3
      },
      {
        "s": "Pewex",
        "b": "Kraft",
        "n": "Maionese Kraft Maionese Leggera vaso 465 g",
        "q": 0.465,
        "u": "l",
        "p": 2.19,
        "fid": "833",
        "pg": 3
      },
      {
        "s": "Tigros",
        "b": "Hellmann's",
        "n": "Maionese Hellmann's Real top down 430 ml",
        "q": 0.43,
        "u": "l",
        "p": 2.69,
        "fid": "391",
        "pg": 4
      }
    ]
  },
  {
    "id": "cracker",
    "g": "Cracker salati",
    "e": "🍘",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Tre Mulini",
        "n": "Cracker salati senza granelli di sale in superficie 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.19,
        "fid": "105",
        "pg": 2
      },
      {
        "s": "Lidl",
        "b": "Certosa",
        "n": "Taralli all'olio extra vergine 300 g",
        "q": 0.3,
        "u": "kg",
        "p": 1.99,
        "fid": "559",
        "pg": 9
      },
      {
        "s": "Aldi",
        "b": "Cucina Nobile",
        "n": "Cracker salati sfogliati 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.25,
        "fid": "2328",
        "pg": 3
      },
      {
        "s": "MD",
        "b": "TUC",
        "n": "Cracker classici TUC 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 1.59,
        "fid": "114",
        "pg": 9
      },
      {
        "s": "Penny",
        "b": "Cuor di Terra",
        "n": "Cracker salati 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.29,
        "fid": "69",
        "pg": 3
      },
      {
        "s": "Despar",
        "b": "Despar",
        "n": "Pizzelle vari tipi 180 g",
        "q": 0.18,
        "u": "kg",
        "p": 2.99,
        "fid": "2256",
        "pg": 4
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Cracker salati con sale in superficie 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.49,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Coop",
        "b": "Coop",
        "n": "Cracker leggeri con farina integrale 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.59,
        "fid": "1965",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Mulino Bianco",
        "n": "Cracker Salati Mulino Bianco 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.79,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Pewex",
        "b": "Doria",
        "n": "Doriano Cracker Doria con sale grosso 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.69,
        "fid": "833",
        "pg": 3
      },
      {
        "s": "Esselunga",
        "b": "Misura",
        "n": "Cracker Integrali Misura con fibre 385 g",
        "q": 0.385,
        "u": "kg",
        "p": 1.99,
        "fid": "789",
        "pg": 4
      }
    ]
  },
  {
    "id": "crema-spalmabile",
    "g": "Crema spalmabile nocciola (230 g)",
    "e": "🍫",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Dolciando",
        "n": "Crema alle nocciole bicolore 400 g",
        "q": 0.4,
        "u": "kg",
        "p": 1.69,
        "fid": "105",
        "pg": 2
      },
      {
        "s": "Lidl",
        "b": "Choco Nussa",
        "n": "Crema alle nocciole 13% nocciole 400 g",
        "q": 0.4,
        "u": "kg",
        "p": 1.79,
        "fid": "559",
        "pg": 2
      },
      {
        "s": "Aldi",
        "b": "Choceur",
        "n": "Crema spalmabile alle nocciole 400 g",
        "q": 0.4,
        "u": "kg",
        "p": 1.79,
        "fid": "2328",
        "pg": 3
      },
      {
        "s": "MD",
        "b": "MD",
        "n": "Crema spalmabile nocciola 230 g",
        "q": 0.23,
        "u": "kg",
        "p": 1.49,
        "fid": "114",
        "pg": 9
      },
      {
        "s": "Penny",
        "b": "Choco Bella",
        "n": "Crema spalmabile nocciola e cacao 400 g",
        "q": 0.4,
        "u": "kg",
        "p": 1.89,
        "fid": "69",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Crema spalmabile alle nocciole 400 g",
        "q": 0.4,
        "u": "kg",
        "p": 2.19,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Nutella",
        "n": "Nutella Ferrero vaso 450 g",
        "q": 0.45,
        "u": "kg",
        "p": 3.49,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Coop",
        "b": "Novi",
        "n": "Crema Novi con 45% di nocciole 200 g",
        "q": 0.2,
        "u": "kg",
        "p": 2.89,
        "fid": "1965",
        "pg": 5
      },
      {
        "s": "Pewex",
        "b": "Nutella",
        "n": "Nutella Ferrero formato convenienza 950 g",
        "q": 0.95,
        "u": "kg",
        "p": 6.49,
        "fid": "833",
        "pg": 3
      },
      {
        "s": "Esselunga",
        "b": "Rigoni di Asiago",
        "n": "Nocciolata Biologica Senza Olio di Palma 325 g",
        "q": 0.325,
        "u": "kg",
        "p": 3.29,
        "fid": "789",
        "pg": 4
      }
    ]
  },
  {
    "id": "avena",
    "g": "Fiocchi di avena (500 g)",
    "e": "🥣",
    "c": "alimentari",
    "o": [
      {
        "s": "Lidl",
        "b": "Crownfield",
        "n": "Fiocchi di avena integrali 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.99,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Eurospin",
        "b": "Tre Mulini",
        "n": "Fiocchi di avena 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.09,
        "fid": "105",
        "pg": 2
      },
      {
        "s": "Aldi",
        "b": "GUT bio",
        "n": "Fiocchi d'avena Bio 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.19,
        "fid": "2328",
        "pg": 3
      },
      {
        "s": "MD",
        "b": "Vivo Meglio",
        "n": "Fiocchi d'avena integrali 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.19,
        "fid": "114",
        "pg": 3
      },
      {
        "s": "Penny",
        "b": "Naturgut",
        "n": "Fiocchi di avena biologici 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.25,
        "fid": "69",
        "pg": 3
      },
      {
        "s": "Pam",
        "b": "Pam Panorama",
        "n": "Fiocchi di avena integrali 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.39,
        "fid": "275",
        "pg": 9
      },
      {
        "s": "Conad",
        "b": "Conad Verso Natura Bio",
        "n": "Fiocchi di avena Bio 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.49,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Coop",
        "b": "Vivi Verde Coop",
        "n": "Fiocchi di avena integrali Bio 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.59,
        "fid": "1965",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Carrefour Bio",
        "n": "Fiocchi di avena Bio 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.55,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Esselunga",
        "b": "Quaker",
        "n": "Quaker White Oats Avena 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 2.19,
        "fid": "789",
        "pg": 4
      }
    ]
  },
  {
    "id": "pomodori-secchi",
    "g": "Pomodori secchi",
    "e": "🍅",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Delizie dal Sole",
        "n": "Pomodori secchi sott'olio 280 g",
        "q": 0.28,
        "u": "kg",
        "p": 1.39,
        "fid": "105",
        "pg": 2
      },
      {
        "s": "Lidl",
        "b": "Baresa",
        "n": "Pomodori secchi all'olio di girasole 280 g",
        "q": 0.28,
        "u": "kg",
        "p": 1.49,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Aldi",
        "b": "Cucina Nobile",
        "n": "Pomodori secchi marinati 280 g",
        "q": 0.28,
        "u": "kg",
        "p": 1.49,
        "fid": "2328",
        "pg": 3
      },
      {
        "s": "MD",
        "b": "Le Specialità di Beppe",
        "n": "Pomodori secchi sott'olio 290 g",
        "q": 0.29,
        "u": "kg",
        "p": 1.59,
        "fid": "114",
        "pg": 4
      },
      {
        "s": "Despar",
        "b": "Despar",
        "n": "Pomodori secchi 150 g",
        "q": 0.15,
        "u": "kg",
        "p": 1.99,
        "fid": "2256",
        "pg": 4
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Pomodori secchi sott'olio 280 g",
        "q": 0.28,
        "u": "kg",
        "p": 2.19,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Coop",
        "b": "Fior Fiore Coop",
        "n": "Pomodori secchi di Puglia sott'olio EVO 280 g",
        "q": 0.28,
        "u": "kg",
        "p": 2.89,
        "fid": "1965",
        "pg": 5
      },
      {
        "s": "Carrefour",
        "b": "Ponti",
        "n": "Pomodori Secchi Zero Olio Ponti 280 g",
        "q": 0.28,
        "u": "kg",
        "p": 2.79,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Pewex",
        "b": "Gros Dispensa",
        "n": "Pomodori essiccati al sole pugliesi 200 g",
        "q": 0.2,
        "u": "kg",
        "p": 1.89,
        "fid": "833",
        "pg": 3
      }
    ]
  },
  {
    "id": "caffe-capsule",
    "g": "Caffè in capsule (30 pezzi)",
    "e": "☕",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Don Jerez",
        "n": "Capsule compatibili Nespresso 30 pz",
        "q": 30,
        "u": "pz",
        "p": 4.49,
        "fid": "105",
        "pg": 3
      },
      {
        "s": "Lidl",
        "b": "Bellarom",
        "n": "Capsule caffè espresso compatibili 30 pz",
        "q": 30,
        "u": "pz",
        "p": 4.79,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Aldi",
        "b": "Barissimo",
        "n": "Capsule caffè Crema / Ristretto 30 pz",
        "q": 30,
        "u": "pz",
        "p": 4.89,
        "fid": "2328",
        "pg": 3
      },
      {
        "s": "MD",
        "b": "Caffè Reale",
        "n": "Capsule compatibili A Modo Mio 30 pz",
        "q": 30,
        "u": "pz",
        "p": 4.99,
        "fid": "114",
        "pg": 4
      },
      {
        "s": "Crai",
        "b": "Borbone",
        "n": "Caffè Borbone capsule Miscela Nera 30 pezzi",
        "q": 30,
        "u": "pz",
        "p": 5.99,
        "fid": "5042573",
        "pg": 1
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Capsule espresso compatibili Nespresso 30 pz",
        "q": 30,
        "u": "pz",
        "p": 5.49,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Coop",
        "b": "Fior Fiore Coop",
        "n": "Capsule caffè espresso intenso 30 pz",
        "q": 30,
        "u": "pz",
        "p": 5.89,
        "fid": "1965",
        "pg": 5
      },
      {
        "s": "Carrefour",
        "b": "Lavazza",
        "n": "Lavazza Crema e Gusto capsule compatibili Nespresso 30 pz",
        "q": 30,
        "u": "pz",
        "p": 7.49,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Pam",
        "b": "Caffè Vergnano",
        "n": "Capsule Vergnano Èspresso Cremoso 30 pz",
        "q": 30,
        "u": "pz",
        "p": 6.99,
        "fid": "275",
        "pg": 4
      },
      {
        "s": "Pewex",
        "b": "Borbone",
        "n": "Caffè Borbone Miscela Blu 50 capsule compatibili",
        "q": 50,
        "u": "pz",
        "p": 9.49,
        "fid": "833",
        "pg": 3
      },
      {
        "s": "Esselunga",
        "b": "Nescafé",
        "n": "Dolce Gusto Espresso Barista 30 capsule",
        "q": 30,
        "u": "pz",
        "p": 8.99,
        "fid": "789",
        "pg": 4
      }
    ]
  },
  {
    "id": "caffe-macinato",
    "g": "Caffè macinato",
    "e": "☕",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Don Jerez",
        "n": "Caffè macinato per moka classico 2 × 250 g",
        "q": 0.5,
        "u": "kg",
        "p": 2.89,
        "fid": "105",
        "pg": 2
      },
      {
        "s": "Lidl",
        "b": "Bellarom",
        "n": "Caffè macinato miscela classica 2 × 250 g",
        "q": 0.5,
        "u": "kg",
        "p": 2.99,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Aldi",
        "b": "Barissimo",
        "n": "Caffè macinato espresso classico 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 1.59,
        "fid": "2328",
        "pg": 3
      },
      {
        "s": "MD",
        "b": "Caffè Reale",
        "n": "Caffè macinato gusto forte 2 × 250 g",
        "q": 0.5,
        "u": "kg",
        "p": 3.19,
        "fid": "114",
        "pg": 4
      },
      {
        "s": "Penny",
        "b": "Valbontà",
        "n": "Caffè macinato classico per moka 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 1.69,
        "fid": "69",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Lavazza",
        "n": "Lavazza Qualità Rossa macinato 4 × 250 g",
        "q": 1,
        "u": "kg",
        "p": 9.99,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Coop",
        "b": "Illy",
        "n": "Illy Caffè tostato classico macinato moka 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 5.99,
        "fid": "1965",
        "pg": 5
      },
      {
        "s": "Carrefour",
        "b": "Segafredo",
        "n": "Segafredo Intermezzo macinato moka 2 × 250 g",
        "q": 0.5,
        "u": "kg",
        "p": 4.49,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Crai",
        "b": "Lavazza",
        "n": "Crema e Gusto Classico 4 × 250 g",
        "q": 1,
        "u": "kg",
        "p": 18.7,
        "fid": "5042573",
        "pg": 0
      },
      {
        "s": "Pewex",
        "b": "Kimbo",
        "n": "Kimbo Aroma Italiano 4 × 250 g",
        "q": 1,
        "u": "kg",
        "p": 8.99,
        "fid": "833",
        "pg": 2
      },
      {
        "s": "Esselunga",
        "b": "Pellini",
        "n": "Pellini Top 100% Arabica macinato per moka 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 4.29,
        "fid": "789",
        "pg": 4
      }
    ]
  },
  {
    "id": "the",
    "g": "Thè freddo (1,5 L)",
    "e": "🧃",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Blues",
        "n": "Thè alla pesca / limone 1,5 L",
        "q": 1.5,
        "u": "l",
        "p": 0.55,
        "fid": "105",
        "pg": 4
      },
      {
        "s": "Lidl",
        "b": "Freeway",
        "n": "Thè freddo al limone / pesca 1,5 L",
        "q": 1.5,
        "u": "l",
        "p": 0.59,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Aldi",
        "b": "Rio d'Oro",
        "n": "Thè alla pesca / limone 1,5 L",
        "q": 1.5,
        "u": "l",
        "p": 0.59,
        "fid": "2328",
        "pg": 2
      },
      {
        "s": "MD",
        "b": "Vivi Meglio",
        "n": "Thè freddo limone senza zuccheri 1,5 L",
        "q": 1.5,
        "u": "l",
        "p": 0.65,
        "fid": "114",
        "pg": 4
      },
      {
        "s": "Penny",
        "b": "Penny",
        "n": "Thè alla pesca 1,5 L",
        "q": 1.5,
        "u": "l",
        "p": 0.65,
        "fid": "69",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Thè al limone / pesca 1,5 L",
        "q": 1.5,
        "u": "l",
        "p": 0.79,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Estathé",
        "n": "Estathé limone / pesca bottiglia 1,5 L",
        "q": 1.5,
        "u": "l",
        "p": 1.49,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Pam",
        "b": "San Benedetto",
        "n": "Thè San Benedetto pesca / limone 1,5 L",
        "q": 1.5,
        "u": "l",
        "p": 0.89,
        "fid": "275",
        "pg": 5
      },
      {
        "s": "Pewex",
        "b": "Estathé",
        "n": "Estathé bicchierino tris 3 × 200 ml",
        "q": 0.6,
        "u": "l",
        "p": 1.59,
        "fid": "833",
        "pg": 3
      },
      {
        "s": "Esselunga",
        "b": "FuzeTea",
        "n": "FuzeTea Limone e Lemongrass 1,25 L",
        "q": 1.25,
        "u": "l",
        "p": 1.19,
        "fid": "789",
        "pg": 4
      }
    ]
  },
  {
    "id": "birra",
    "g": "Birra in lattina",
    "e": "🍺",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Best Bräu",
        "n": "Birra bionda lattina 50 cl",
        "q": 0.5,
        "u": "l",
        "p": 0.55,
        "fid": "105",
        "pg": 4
      },
      {
        "s": "Lidl",
        "b": "Perlenbacher",
        "n": "Birra Premium Pils lattina 50 cl",
        "q": 0.5,
        "u": "l",
        "p": 0.59,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "MD",
        "b": "Wiktor",
        "n": "Birra Wiktor lattina 50 cl",
        "q": 0.5,
        "u": "l",
        "p": 0.59,
        "fid": "114",
        "pg": 6
      },
      {
        "s": "Aldi",
        "b": "Karlskrone",
        "n": "Birra Lager lattina 50 cl",
        "q": 0.5,
        "u": "l",
        "p": 0.59,
        "fid": "2328",
        "pg": 3
      },
      {
        "s": "Penny",
        "b": "Adelscott",
        "n": "Birra bionda doppio malto lattina 50 cl",
        "q": 0.5,
        "u": "l",
        "p": 0.79,
        "fid": "69",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Moretti",
        "n": "Birra Moretti ricetta originale 3 × 33 cl",
        "q": 0.99,
        "u": "l",
        "p": 1.99,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Heineken",
        "n": "Birra Heineken bottiglia 66 cl",
        "q": 0.66,
        "u": "l",
        "p": 1.19,
        "fid": "54",
        "pg": 5
      },
      {
        "s": "Pam",
        "b": "Peroni",
        "n": "Birra Peroni classica 3 × 33 cl",
        "q": 0.99,
        "u": "l",
        "p": 1.89,
        "fid": "275",
        "pg": 5
      },
      {
        "s": "MD",
        "b": "Tennent's",
        "n": "Birra Tennent's Super lattina 50 cl",
        "q": 0.5,
        "u": "l",
        "p": 1.39,
        "fid": "114",
        "pg": 6
      },
      {
        "s": "MD",
        "b": "Ichnusa",
        "n": "Birra Ichnusa 33 cl ×3",
        "q": 0.99,
        "u": "l",
        "p": 2.2,
        "fid": "114",
        "pg": 6
      },
      {
        "s": "Pewex",
        "b": "Ichnusa",
        "n": "Birra Ichnusa Non Filtrata 50 cl",
        "q": 0.5,
        "u": "l",
        "p": 1.29,
        "fid": "833",
        "pg": 3
      },
      {
        "s": "Esselunga",
        "b": "Corona",
        "n": "Birra Corona Extra 33 cl ×3",
        "q": 0.99,
        "u": "l",
        "p": 3.49,
        "fid": "789",
        "pg": 4
      }
    ]
  },
  {
    "id": "prosecco",
    "g": "Prosecco",
    "e": "🍾",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Castelli Modenesi",
        "n": "Prosecco DOC frizzante 75 cl",
        "q": 0.75,
        "u": "l",
        "p": 2.89,
        "fid": "105",
        "pg": 4
      },
      {
        "s": "Lidl",
        "b": "Allini",
        "n": "Prosecco DOC Treviso Extra Dry 75 cl",
        "q": 0.75,
        "u": "l",
        "p": 3.29,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Aldi",
        "b": "Castell'Arquato",
        "n": "Prosecco DOC Spumante Extra Dry 75 cl",
        "q": 0.75,
        "u": "l",
        "p": 3.39,
        "fid": "2328",
        "pg": 3
      },
      {
        "s": "MD",
        "b": "Corte Viola",
        "n": "Prosecco DOC Millesimato 75 cl",
        "q": 0.75,
        "u": "l",
        "p": 3.49,
        "fid": "114",
        "pg": 5
      },
      {
        "s": "Penny",
        "b": "Corte delle Calli",
        "n": "Prosecco Treviso DOC Spumante 75 cl",
        "q": 0.75,
        "u": "l",
        "p": 3.59,
        "fid": "69",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Conad Sapori & Dintorni",
        "n": "Valdobbiadene Prosecco Superiore DOCG 75 cl",
        "q": 0.75,
        "u": "l",
        "p": 4.99,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Mionetto",
        "n": "Mionetto Prosecco DOC Treviso Prestige 75 cl",
        "q": 0.75,
        "u": "l",
        "p": 5.99,
        "fid": "54",
        "pg": 5
      },
      {
        "s": "Lidl",
        "b": "Lidl Cantina",
        "n": "Prosecco Valdobbiadene Superiore DOCG 75 cl",
        "q": 0.75,
        "u": "l",
        "p": 6.59,
        "fid": "559",
        "pg": 0
      },
      {
        "s": "Pewex",
        "b": "Valdo",
        "n": "Valdo Prosecco Marca Oro DOCG 75 cl",
        "q": 0.75,
        "u": "l",
        "p": 5.49,
        "fid": "833",
        "pg": 3
      },
      {
        "s": "Esselunga",
        "b": "Villa Sandi",
        "n": "Villa Sandi Prosecco Il Fresco DOC 75 cl",
        "q": 0.75,
        "u": "l",
        "p": 5.89,
        "fid": "789",
        "pg": 4
      }
    ]
  },
  {
    "id": "vino",
    "g": "Vino da tavola (1 L)",
    "e": "🍷",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Gaudioso",
        "n": "Vino bianco/rosato in brick 1 L",
        "q": 1,
        "u": "l",
        "p": 0.85,
        "fid": "105",
        "pg": 4
      },
      {
        "s": "Lidl",
        "b": "Corte Aurelia",
        "n": "Vino rosso da tavola brick 1 L",
        "q": 1,
        "u": "l",
        "p": 0.89,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Aldi",
        "b": "Tavernello",
        "n": "Tavernello Vino Bianco d'Italia brik 1 L",
        "q": 1,
        "u": "l",
        "p": 1.19,
        "fid": "2328",
        "pg": 3
      },
      {
        "s": "MD",
        "b": "La Botte",
        "n": "Vino rosso da tavola 1 L",
        "q": 1,
        "u": "l",
        "p": 0.95,
        "fid": "114",
        "pg": 5
      },
      {
        "s": "Penny",
        "b": "Cantina Penny",
        "n": "Vino bianco da tavola brik 1 L",
        "q": 1,
        "u": "l",
        "p": 0.99,
        "fid": "69",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Tavernello",
        "n": "Tavernello Vino Rosso d'Italia brik 1 L",
        "q": 1,
        "u": "l",
        "p": 1.25,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Ronco",
        "n": "Vino Ronco bianco brik 1 L",
        "q": 1,
        "u": "l",
        "p": 1.29,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Despar",
        "b": "Bottegaro",
        "n": "Montepulciano d'Abruzzo DOC 75 cl",
        "q": 0.75,
        "u": "l",
        "p": 7.9,
        "fid": "2256",
        "pg": 2
      },
      {
        "s": "Pewex",
        "b": "Casale del Giglio",
        "n": "Shiraz Lazio IGT Casale del Giglio 75 cl",
        "q": 0.75,
        "u": "l",
        "p": 7.49,
        "fid": "833",
        "pg": 3
      },
      {
        "s": "Esselunga",
        "b": "Corvo",
        "n": "Corvo Glicine Bianco Terre Siciliane IGT 75 cl",
        "q": 0.75,
        "u": "l",
        "p": 4.49,
        "fid": "789",
        "pg": 4
      }
    ]
  },
  {
    "id": "gelato",
    "g": "Gelato",
    "e": "🍨",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Dolciando",
        "n": "Gelato vaschetta gusti assortiti 1 kg",
        "q": 1,
        "u": "kg",
        "p": 2.39,
        "fid": "105",
        "pg": 3
      },
      {
        "s": "Lidl",
        "b": "Gelatelli",
        "n": "Gelato vaschetta stracciatella / vaniglia 900 g",
        "q": 0.9,
        "u": "kg",
        "p": 2.29,
        "fid": "559",
        "pg": 2
      },
      {
        "s": "Aldi",
        "b": "Mucca",
        "n": "Gelato in vaschetta assortito 1 kg",
        "q": 1,
        "u": "kg",
        "p": 2.49,
        "fid": "2328",
        "pg": 2
      },
      {
        "s": "MD",
        "b": "Le Specialità di Beppe",
        "n": "Gelato crema e cioccolato vaschetta 1 kg",
        "q": 1,
        "u": "kg",
        "p": 2.59,
        "fid": "114",
        "pg": 3
      },
      {
        "s": "Crai",
        "b": "Algida",
        "n": "Carte d'Or vaschetta 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 2.99,
        "fid": "5042573",
        "pg": 0
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Gelato affogato amarena vaschetta 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 2.79,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Maxibon",
        "n": "Maxibon Classic Motta 4 pz",
        "q": 0.384,
        "u": "kg",
        "p": 3.29,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Pam",
        "b": "Kinder",
        "n": "Gelato Kinder Bueno 285 g",
        "q": 0.285,
        "u": "kg",
        "p": 3.49,
        "fid": "275",
        "pg": 6
      },
      {
        "s": "Pewex",
        "b": "Cornetto",
        "n": "Cornetto Classico Algida 6 pz",
        "q": 0.45,
        "u": "kg",
        "p": 3.69,
        "fid": "833",
        "pg": 2
      },
      {
        "s": "Esselunga",
        "b": "Haagen-Dazs",
        "n": "Haagen-Dazs Macadamia Nut Brittle 460 ml",
        "q": 0.4,
        "u": "kg",
        "p": 4.49,
        "fid": "789",
        "pg": 4
      }
    ]
  },
  {
    "id": "plumcake",
    "g": "Plumcake",
    "e": "🧁",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Dolciando",
        "n": "Plumcake allo yogurt 10 pezzi 330 g",
        "q": 0.33,
        "u": "kg",
        "p": 1.19,
        "fid": "105",
        "pg": 2
      },
      {
        "s": "Lidl",
        "b": "Sondey",
        "n": "Plumcake con yogurt 10 pz 330 g",
        "q": 0.33,
        "u": "kg",
        "p": 1.25,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Aldi",
        "b": "Monarc",
        "n": "Plumcake classico con yogurt 330 g",
        "q": 0.33,
        "u": "kg",
        "p": 1.25,
        "fid": "2328",
        "pg": 3
      },
      {
        "s": "MD",
        "b": "Cà Bianca",
        "n": "Plumcake senza zuccheri aggiunti 330 g",
        "q": 0.33,
        "u": "kg",
        "p": 1.39,
        "fid": "114",
        "pg": 4
      },
      {
        "s": "Penny",
        "b": "San Fabio",
        "n": "Plumcake allo yogurt 10 pz 330 g",
        "q": 0.33,
        "u": "kg",
        "p": 1.29,
        "fid": "69",
        "pg": 3
      },
      {
        "s": "Pam",
        "b": "Pam Panorama",
        "n": "Plumcake allo yogurt 198 g",
        "q": 0.198,
        "u": "kg",
        "p": 0.99,
        "fid": "275",
        "pg": 9
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Plumcake classico con yogurt 100% italiano 330 g",
        "q": 0.33,
        "u": "kg",
        "p": 1.59,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Mulino Bianco",
        "n": "Plumcake Mulino Bianco con yogurt 10 pz 330 g",
        "q": 0.33,
        "u": "kg",
        "p": 1.99,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Pewex",
        "b": "Mulino Bianco",
        "n": "Plumcake con gocce di cioccolato Mulino Bianco 350 g",
        "q": 0.35,
        "u": "kg",
        "p": 2.19,
        "fid": "833",
        "pg": 3
      }
    ]
  },
  {
    "id": "frutta",
    "g": "Frutta di stagione",
    "e": "🍈",
    "c": "alimentari",
    "o": [
      {
        "s": "Lidl",
        "b": "Lidl Orto",
        "n": "Melone giallo al kg",
        "q": 1,
        "u": "kg",
        "p": 0.89,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Pam",
        "b": "Pam",
        "n": "Anguria baby 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 0.99,
        "fid": "275",
        "pg": 2
      },
      {
        "s": "Eurospin",
        "b": "Fresco del Giorno",
        "n": "Mele Golden Delicious al kg",
        "q": 1,
        "u": "kg",
        "p": 1.29,
        "fid": "105",
        "pg": 1
      },
      {
        "s": "Aldi",
        "b": "I Colori del Sapore",
        "n": "Banane origine Ecuador al kg",
        "q": 1,
        "u": "kg",
        "p": 1.19,
        "fid": "2328",
        "pg": 1
      },
      {
        "s": "Penny",
        "b": "Orto Penny",
        "n": "Uva bianca da tavola al kg",
        "q": 1,
        "u": "kg",
        "p": 1.69,
        "fid": "69",
        "pg": 1
      },
      {
        "s": "Crai",
        "b": "Crai",
        "n": "Pere coscia 1 kg",
        "q": 1,
        "u": "kg",
        "p": 1.89,
        "fid": "5042573",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Conad Percorso Qualità",
        "n": "Pesche noci a polpa gialla al kg",
        "q": 1,
        "u": "kg",
        "p": 1.99,
        "fid": "398",
        "pg": 2
      },
      {
        "s": "Coop",
        "b": "Origine Coop",
        "n": "Mele Gala Melinda DOP al kg",
        "q": 1,
        "u": "kg",
        "p": 1.89,
        "fid": "1965",
        "pg": 2
      },
      {
        "s": "Carrefour",
        "b": "Carrefour Bio",
        "n": "Limoni biologici non trattati 500 g",
        "q": 0.5,
        "u": "kg",
        "p": 1.39,
        "fid": "54",
        "pg": 2
      },
      {
        "s": "Pewex",
        "b": "Gros Ortofrutta",
        "n": "Fichi neri d'Abruzzo al kg",
        "q": 1,
        "u": "kg",
        "p": 2.49,
        "fid": "833",
        "pg": 1
      }
    ]
  },
  {
    "id": "verdura",
    "g": "Verdura",
    "e": "🥬",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Fresco del Giorno",
        "n": "Zucchine scure al kg",
        "q": 1,
        "u": "kg",
        "p": 1.39,
        "fid": "105",
        "pg": 1
      },
      {
        "s": "Lidl",
        "b": "Lidl",
        "n": "Peperoni rossi/gialli al kg",
        "q": 1,
        "u": "kg",
        "p": 1.79,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Lidl",
        "b": "Lidl",
        "n": "Patate sacco 2 kg",
        "q": 2,
        "u": "kg",
        "p": 1.99,
        "fid": "559",
        "pg": 4
      },
      {
        "s": "Aldi",
        "b": "I Colori del Sapore",
        "n": "Melanzane tonde al kg",
        "q": 1,
        "u": "kg",
        "p": 1.49,
        "fid": "2328",
        "pg": 1
      },
      {
        "s": "Penny",
        "b": "Orto Penny",
        "n": "Carote novelle in vaschetta 1 kg",
        "q": 1,
        "u": "kg",
        "p": 0.99,
        "fid": "69",
        "pg": 1
      },
      {
        "s": "MD",
        "b": "Buona Spesa",
        "n": "Insalata iceberg a cespo",
        "q": 0.5,
        "u": "kg",
        "p": 0.89,
        "fid": "114",
        "pg": 2
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Insalata mista quarta gamma busta 200 g",
        "q": 0.2,
        "u": "kg",
        "p": 0.79,
        "fid": "398",
        "pg": 2
      },
      {
        "s": "Coop",
        "b": "Origine Coop",
        "n": "Finocchi dolci al kg",
        "q": 1,
        "u": "kg",
        "p": 1.69,
        "fid": "1965",
        "pg": 2
      },
      {
        "s": "Carrefour",
        "b": "Filiera Qualità",
        "n": "Cetrioli italiani al kg",
        "q": 1,
        "u": "kg",
        "p": 1.29,
        "fid": "54",
        "pg": 2
      },
      {
        "s": "Pewex",
        "b": "Gros Orto",
        "n": "Broccoli romaneschi al kg",
        "q": 1,
        "u": "kg",
        "p": 1.79,
        "fid": "833",
        "pg": 1
      }
    ]
  },
  {
    "id": "carta",
    "g": "Carta igienica (20 rotoli)",
    "e": "🧻",
    "c": "casa",
    "o": [
      {
        "s": "Eurospin",
        "b": "Soft Dream",
        "n": "Carta igienica delicata 20 rotoli 2 veli",
        "q": 20,
        "u": "pz",
        "p": 2.69,
        "fid": "105",
        "pg": 4
      },
      {
        "s": "Lidl",
        "b": "Floralys",
        "n": "Carta igienica 3 veli super morbida 10 rotoli",
        "q": 10,
        "u": "pz",
        "p": 2.99,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Aldi",
        "b": "Solo",
        "n": "Carta igienica maxi rotoli 4 veli 8 rotoli",
        "q": 8,
        "u": "pz",
        "p": 2.89,
        "fid": "2328",
        "pg": 4
      },
      {
        "s": "MD",
        "b": "Botanika",
        "n": "Carta igienica maxi rotoli 12 rotoli",
        "q": 12,
        "u": "pz",
        "p": 3.49,
        "fid": "114",
        "pg": 5
      },
      {
        "s": "Acqua e Sapone",
        "b": "Scottex",
        "n": "Scottex L'Originale Carta Igienica 24 rotoli",
        "q": 24,
        "u": "pz",
        "p": 5.99,
        "fid": "4536410",
        "pg": 2
      },
      {
        "s": "Tigotà",
        "b": "Foxy",
        "n": "Foxy Seta Carta Igienica 4 veli 12 rotoli",
        "q": 12,
        "u": "pz",
        "p": 4.49,
        "fid": "580",
        "pg": 3
      },
      {
        "s": "Risparmio Casa",
        "b": "Regina",
        "n": "Rotoloni Regina Carta Igienica 4 rotoli lunghi come 8",
        "q": 8,
        "u": "pz",
        "p": 2.99,
        "fid": "606",
        "pg": 2
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Carta igienica 3 veli maxi formato 12 rotoli",
        "q": 12,
        "u": "pz",
        "p": 3.99,
        "fid": "398",
        "pg": 5
      },
      {
        "s": "Coop",
        "b": "Coop",
        "n": "Carta igienica ecologica 100% riciclata 8 rotoli",
        "q": 8,
        "u": "pz",
        "p": 2.99,
        "fid": "1965",
        "pg": 5
      },
      {
        "s": "Carrefour",
        "b": "Scottonelle",
        "n": "Carta Igienica Scottonelle soffice 18 rotoli",
        "q": 18,
        "u": "pz",
        "p": 4.99,
        "fid": "54",
        "pg": 5
      },
      {
        "s": "Pewex",
        "b": "Foxy",
        "n": "Foxy Mega Carta Igienica 4 mega rotoli",
        "q": 8,
        "u": "pz",
        "p": 3.19,
        "fid": "833",
        "pg": 3
      }
    ]
  },
  {
    "id": "dentifricio",
    "g": "Dentifricio",
    "e": "🪥",
    "c": "casa",
    "o": [
      {
        "s": "Eurospin",
        "b": "Near",
        "n": "Dentifricio protezione carie 125 ml",
        "q": 1,
        "u": "pz",
        "p": 0.79,
        "fid": "105",
        "pg": 4
      },
      {
        "s": "Lidl",
        "b": "Dentalux",
        "n": "Dentifricio Complex 7 Total Care 125 ml",
        "q": 1,
        "u": "pz",
        "p": 0.89,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Aldi",
        "b": "Dentofit",
        "n": "Dentifricio sbiancante Pro-White 125 ml",
        "q": 1,
        "u": "pz",
        "p": 0.89,
        "fid": "2328",
        "pg": 4
      },
      {
        "s": "Acqua e Sapone",
        "b": "Oral-B",
        "n": "Oral-B Pro-Expert Protezione Professionale 75 ml",
        "q": 1,
        "u": "pz",
        "p": 1.49,
        "fid": "4536410",
        "pg": 1
      },
      {
        "s": "Tigotà",
        "b": "Mentadent",
        "n": "Mentadent P Prevenzione Completa 75 ml ×2",
        "q": 2,
        "u": "pz",
        "p": 1.99,
        "fid": "580",
        "pg": 2
      },
      {
        "s": "Risparmio Casa",
        "b": "Sensodyne",
        "n": "Sensodyne Ripara & Protegge dentifricio 75 ml",
        "q": 1,
        "u": "pz",
        "p": 2.49,
        "fid": "606",
        "pg": 2
      },
      {
        "s": "Crai",
        "b": "Colgate",
        "n": "Tripla Azione 75 ml ×2",
        "q": 2,
        "u": "pz",
        "p": 1.99,
        "fid": "5042573",
        "pg": 2
      },
      {
        "s": "Conad",
        "b": "Colgate",
        "n": "Colgate Total Original protezione antibatterica 75 ml",
        "q": 1,
        "u": "pz",
        "p": 1.89,
        "fid": "398",
        "pg": 5
      },
      {
        "s": "Carrefour",
        "b": "Aquafresh",
        "n": "Aquafresh Tripla Protezione tubetto 75 ml",
        "q": 1,
        "u": "pz",
        "p": 0.99,
        "fid": "54",
        "pg": 5
      },
      {
        "s": "Pewex",
        "b": "Mentadent",
        "n": "Mentadent White Now sbiancante istantaneo 75 ml",
        "q": 1,
        "u": "pz",
        "p": 1.89,
        "fid": "833",
        "pg": 3
      }
    ]
  },
  {
    "id": "candeggina",
    "g": "Candeggina (2 L)",
    "e": "🧴",
    "c": "casa",
    "o": [
      {
        "s": "Eurospin",
        "b": "Dexal",
        "n": "Candeggina delicata igienizzante 2 L",
        "q": 2,
        "u": "l",
        "p": 1.29,
        "fid": "105",
        "pg": 4
      },
      {
        "s": "Lidl",
        "b": "W5",
        "n": "Candeggina densa con beccuccio 2 L",
        "q": 2,
        "u": "l",
        "p": 1.35,
        "fid": "559",
        "pg": 3
      },
      {
        "s": "Aldi",
        "b": "Tandil",
        "n": "Candeggina classica igienizzante 2 L",
        "q": 2,
        "u": "l",
        "p": 1.35,
        "fid": "2328",
        "pg": 4
      },
      {
        "s": "MD",
        "b": "Dat5",
        "n": "Candeggina profumata 2 L",
        "q": 2,
        "u": "l",
        "p": 1.39,
        "fid": "114",
        "pg": 5
      },
      {
        "s": "Acqua e Sapone",
        "b": "Ace",
        "n": "Ace Candeggina Classica igiene sicura 3 L",
        "q": 3,
        "u": "l",
        "p": 2.19,
        "fid": "4536410",
        "pg": 2
      },
      {
        "s": "Tigotà",
        "b": "Ace",
        "n": "Ace Gentile Candeggina per colorati 2 L",
        "q": 2,
        "u": "l",
        "p": 2.49,
        "fid": "580",
        "pg": 3
      },
      {
        "s": "Risparmio Casa",
        "b": "Candeggina Più",
        "n": "Candeggina densa igienizzante 2 L",
        "q": 2,
        "u": "l",
        "p": 1.19,
        "fid": "606",
        "pg": 2
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Candeggina classica con cloro attivo 2 L",
        "q": 2,
        "u": "l",
        "p": 1.49,
        "fid": "398",
        "pg": 5
      },
      {
        "s": "Coop",
        "b": "Coop",
        "n": "Candeggina delicata igienizzante 2 L",
        "q": 2,
        "u": "l",
        "p": 1.55,
        "fid": "1965",
        "pg": 5
      },
      {
        "s": "Carrefour",
        "b": "Carrefour",
        "n": "Candeggina profumata agli agrumi 2 L",
        "q": 2,
        "u": "l",
        "p": 1.45,
        "fid": "54",
        "pg": 5
      },
      {
        "s": "Pewex",
        "b": "Ace",
        "n": "Ace Candeggina Spray Mousse con candeggina 700 ml",
        "q": 0.7,
        "u": "l",
        "p": 1.79,
        "fid": "833",
        "pg": 3
      }
    ]
  },
  {
    "id": "wurstel-pollo",
    "g": "Würstel di pollo (250 g)",
    "e": "🌭",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Tobias",
        "n": "Würstel di pollo e tacchino 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 0.69,
        "fid": "105",
        "pg": 2
      },
      {
        "s": "Lidl",
        "b": "Dulano",
        "n": "Würstel di pollo e tacchino 4 pz 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 0.75,
        "fid": "559",
        "pg": 2
      },
      {
        "s": "Aldi",
        "b": "Il Tagliere del Re",
        "n": "Würstel di pollo 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 0.75,
        "fid": "2328",
        "pg": 2
      },
      {
        "s": "Todis",
        "b": "Todis",
        "n": "Würstel di pollo 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 0.79,
        "fid": "493",
        "pg": 9
      },
      {
        "s": "MD",
        "b": "La Fattoria",
        "n": "Würstel di puro pollo 3 pz 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 0.79,
        "fid": "114",
        "pg": 3
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Würstel di pollo e tacchino senza glutine 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 0.89,
        "fid": "398",
        "pg": 3
      },
      {
        "s": "Carrefour",
        "b": "Wudy AIA",
        "n": "Wudy AIA Classico di pollo e tacchino 250 g",
        "q": 0.25,
        "u": "kg",
        "p": 0.99,
        "fid": "54",
        "pg": 3
      },
      {
        "s": "Pewex",
        "b": "Wudy AIA",
        "n": "Wudy AIA Maxipack 3 × 100 g",
        "q": 0.3,
        "u": "kg",
        "p": 1.19,
        "fid": "833",
        "pg": 2
      }
    ]
  },
  {
    "id": "basi-pizza",
    "g": "Basi per pizza (2 × 200 g)",
    "e": "🍕",
    "c": "alimentari",
    "o": [
      {
        "s": "Eurospin",
        "b": "Tre Mulini",
        "n": "Basi per pizza rotonde 2 × 200 g",
        "q": 0.4,
        "u": "kg",
        "p": 1.69,
        "fid": "105",
        "pg": 2
      },
      {
        "s": "Lidl",
        "b": "Chef Select",
        "n": "Pasta fresca per pizza arrotolata con carta forno 385 g",
        "q": 0.385,
        "u": "kg",
        "p": 1.19,
        "fid": "559",
        "pg": 2
      },
      {
        "s": "Aldi",
        "b": "Cucina Nobile",
        "n": "Base per pizza rettangolare pronta da infornare 400 g",
        "q": 0.4,
        "u": "kg",
        "p": 1.29,
        "fid": "2328",
        "pg": 2
      },
      {
        "s": "MD",
        "b": "Le Specialità di Beppe",
        "n": "Pinsa romana fresca precotta 230 g",
        "q": 0.23,
        "u": "kg",
        "p": 1.49,
        "fid": "114",
        "pg": 3
      },
      {
        "s": "Todis",
        "b": "Todis",
        "n": "Basi bianche per pizza tonda 2 × 200 g",
        "q": 0.4,
        "u": "kg",
        "p": 2.59,
        "fid": "493",
        "pg": 9
      },
      {
        "s": "Conad",
        "b": "Conad",
        "n": "Base per pizza tonda fresca pronta 385 g",
        "q": 0.385,
        "u": "kg",
        "p": 1.49,
        "fid": "398",
        "pg": 4
      },
      {
        "s": "Carrefour",
        "b": "Buitoni",
        "n": "Buitoni Pasta per Pizza Rettangolare 385 g",
        "q": 0.385,
        "u": "kg",
        "p": 1.99,
        "fid": "54",
        "pg": 4
      },
      {
        "s": "Pewex",
        "b": "Pinsa Pinsami",
        "n": "Pinsami La Pinsa Romana Classica 2 basi 460 g",
        "q": 0.46,
        "u": "kg",
        "p": 2.99,
        "fid": "833",
        "pg": 3
      },
      {
        "s": "Esselunga",
        "b": "Buitoni",
        "n": "Buitoni Gran Pizza spessa arrotolata 385 g",
        "q": 0.385,
        "u": "kg",
        "p": 2.19,
        "fid": "789",
        "pg": 3
      }
    ]
  }
];
