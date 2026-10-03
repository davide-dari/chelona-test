/**
 * MathLanguageEngine — "Il Matematico"
 * Motore Matematico di Comprensione Linguistica, Distanze di Stringa,
 * Stemming Morfologico Italiano, Fonetica e Corrispondenza Semantica On-Device.
 * 
 * 100% On-Device • Zero Latenza • Zero Chiamate Cloud
 */

import type { SupermarketCategory } from '../types';

/**
 * Classifica automatica delle categorie per la lista spesa
 */
export function detectSupermarketCategory(name: string): SupermarketCategory {
  const n = name.toLowerCase().trim();
  if (/\b(?:mela|mele|banana|banane|arancia|arance|limon[ei]|frutt[ae]|verdur[ae]|pomodor[oi]|pomodorin[oi]|insalat[ae]|carot[ae]|zocchin[ae]|zucchine?|cipoll[ae]|patat[ae]|aglio|basilico|spinac[ie]|pesc[ae]|fragol[ae]|melanzan[ae]|peperon[ei]|fungh?i?|broccol[oi]|cavol[oi]|zucc[ahie]|asparag[oi]|carciof[oi]|sedano?|porr[oi]|finocchi?o?|cetriol[oi]|rucola|radicchio|pisell[oi]|fagiolin[oi]|albicocc[ae]|cilieg[ie]|kiwi|ananas|uva|mirtill[oi]|lampon[ei]|more|avocado)\b/i.test(n)) return 'frutta-verdura';
  if (/\b(?:latt[ei]|formagg[oi]|yogurt|burro?|mozzarell[ae]|parmigiano?|grana|uov[ao]|ricott[ae]|panna|stracchino?|gorgonzola|mascarpone?|pecorino?|provol[ae]|scamorz[ae]|fontina|caciocavallo|crescenza|brie|feta)\b/i.test(n)) return 'latticini-uova';
  if (/\b(?:carn[ei]|pesc[ei]|poll[oi]|manzo?|maiale?|tonno?|salmon[ei]|merluzzo?|prosciutt[oi]|salame?|affettat[oi]|bresaol[ae]|tacchino?|salsicci[ae]|wurstel|orata|spigola|gamber[oi]|calamar[oi]|seppi[ae]|polpo?|cozz[ae]|vongol[ae]|acciugh?e?|alici?|vitello?|agnello?|pancetta|guanciale|mortadella|speck|bistecc[ae]|filett[oi]|tranci[oi])\b/i.test(n)) return 'carne-pesce';
  if (/\b(?:pan[ei]|focacci[ae]|cornett[oi]|biscott[oi]|croissant|fett[ae]\s+biscottat[ae]|tort[ae]|brioche|dolc[ei]|lievito?|pangrattato|crostin[oi]|piadin[ae])\b/i.test(n)) return 'pane-pasticceria';
  if (/\b(?:past[aeo]?|ris[oi]|risott[oi]|farin[ae]|oli[oi]|aceto|sal[ei]|zuccher[oi]|caff[eè]?|passat[ae]|pelat[ie]|legum[ie]|ceci|fagiol[ie]|lenticchi[ae]|tonno|crackers|cereali|miele|marmellat[ae]|cioccolat[oi]|cacao|spezie|origano|rosmarino|timo|noc[ie]|mandorl[ae]|nocciol[ae]|pinol[ie]|pistacch[ie]|arachid[ie]|gnocch[ie]|mais|orzo|farro|aven[ae]|couscous)\b/i.test(n)) return 'dispensa';
  if (/\b(?:acqu[ae]|vin[oi]|birr[ae]|succ[ohi]|coc[ae]|aranciat[ae]|tè|the|bevand[ae]|spumant[ei]|champagne)\b/i.test(n)) return 'bevande';
  if (/\b(?:detersiv[oi]|sgrassator[ei]|candeggin[ae]|spugn[ae]|scottex|carta\s+igienic[ae]|lavatric[ei]|lavastovigli[ae]|sacchett[oi]|panni|alcool|ammoniac[ae])\b/i.test(n)) return 'pulizia';
  if (/\b(?:shampoo|bagnoschiuma|dentifrici[oi]|sapon[ei]|deodorant[ei]|balsamo|crema|rasoi|schiuma\s+da\s+barba|fazzolett[oi])\b/i.test(n)) return 'igiene';
  return 'altro';
}

// ============================================================================
// 1. DISTANZE MATEMATICHE & SIMILARITÀ
// ============================================================================

/**
 * Normalizza il testo in italiano:
 * Rimuove accenti, punteggiatura, spazi multipli e converte in minuscolo.
 */
export function normalizeItalianText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // rimuove accenti (è -> e, à -> a, ecc.)
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Distanza di Levenshtein classica con complessità spaziale O(min(N, M)).
 */
export function levenshteinDistance(s1: string, s2: string): number {
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;

  let v0 = new Array(s2.length + 1);
  let v1 = new Array(s2.length + 1);

  for (let i = 0; i <= s2.length; i++) v0[i] = i;

  for (let i = 0; i < s1.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < s2.length; j++) {
      const cost = s1[i] === s2[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= s2.length; j++) v0[j] = v1[j];
  }

  return v1[s2.length];
}

/**
 * Distanza di Damerau-Levenshtein:
 * Tiene conto delle trasposizioni di caratteri adiacenti (es. 'ingrendiente' -> 'ingrediente').
 */
export function damerauLevenshteinDistance(source: string, target: string): number {
  if (source === target) return 0;
  const n = source.length;
  const m = target.length;
  if (n === 0) return m;
  if (m === 0) return n;

  const d: number[][] = [];
  for (let i = 0; i <= n; i++) {
    d[i] = [];
    d[i][0] = i;
  }
  for (let j = 0; j <= m; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = source[i - 1] === target[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,      // cancellazione
        d[i][j - 1] + 1,      // inserimento
        d[i - 1][j - 1] + cost // sostituzione
      );

      // Trasposizione
      if (
        i > 1 &&
        j > 1 &&
        source[i - 1] === target[j - 2] &&
        source[i - 2] === target[j - 1]
      ) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[n][m];
}

/**
 * Similarità di Jaro-Winkler:
 * Ideale per prefissi e token corti.
 */
export function jaroWinklerSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1.length || !s2.length) return 0.0;

  const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  let transpositions = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) /
    3.0;

  // Winkler prefix scaling (fino a 4 caratteri)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1.0 - jaro);
}

/**
 * Similarità N-gram Jaccard:
 * J(A, B) = |A ∩ B| / |A ∪ B|
 */
export function nGramJaccardSimilarity(s1: string, s2: string, n = 2): number {
  if (s1 === s2) return 1.0;
  if (s1.length < n || s2.length < n) return s1 === s2 ? 1.0 : 0.0;

  const getNGrams = (str: string): Set<string> => {
    const grams = new Set<string>();
    for (let i = 0; i <= str.length - n; i++) {
      grams.add(str.slice(i, i + n));
    }
    return grams;
  };

  const g1 = getNGrams(s1);
  const g2 = getNGrams(s2);

  let intersection = 0;
  for (const g of g1) {
    if (g2.has(g)) intersection++;
  }

  const union = g1.size + g2.size - intersection;
  return union === 0 ? 0.0 : intersection / union;
}

// ============================================================================
// 2. STEMMING MORFOLOGICO ITALIANO & FONETICA
// ============================================================================

/**
 * Mappa di irregolarità comuni nei cibi/termini italiani
 */
const IRREGULAR_STEMS: Record<string, string> = {
  uova: 'uov',
  uovo: 'uov',
  tuorlo: 'tuorl',
  tuorli: 'tuorl',
  albume: 'album',
  albumi: 'album',
  asparago: 'asparag',
  asparagi: 'asparag',
  fungo: 'fung',
  funghi: 'fung',
  noce: 'noc',
  noci: 'noc',
  pesce: 'pesc',
  pesci: 'pesc',
  fico: 'fic',
  fichi: 'fic',
  pomodoro: 'pomodor',
  pomodori: 'pomodor',
  pomodorino: 'pomodor',
  pomodorini: 'pomodor',
  carota: 'carot',
  carote: 'carot',
  zucchina: 'zucchin',
  zucchine: 'zucchin',
  melanzana: 'melanzan',
  melanzane: 'melanzan',
  patata: 'patat',
  patate: 'patat',
  cipolla: 'cipoll',
  cipolle: 'cipoll',
  mela: 'mel',
  mele: 'mel',
  pera: 'per',
  pere: 'per',
  arancia: 'aranc',
  arance: 'aranc',
  spaghetto: 'spaghett',
  spaghetti: 'spaghett',
  fusillo: 'fusill',
  fusilli: 'fusill',
  salmone: 'salmon',
  salmoni: 'salmon',
  formaggio: 'formagg',
  formaggi: 'formagg',
  peperone: 'peperon',
  peperoni: 'peperon',
  carciofo: 'carciof',
  carciofi: 'carciof',
  broccolo: 'broccol',
  broccoli: 'broccol',
  fagiolo: 'fagiol',
  fagioli: 'fagiol',
  cece: 'cec',
  ceci: 'cec',
  pisello: 'pisell',
  piselli: 'pisell',
  gambero: 'gamber',
  gamberi: 'gamber',
  gamberetto: 'gamber',
  gamberetti: 'gamber',
  salsiccia: 'salsicc',
  salsicce: 'salsicc',
  calamaro: 'calamar',
  calamari: 'calamar',
  seppia: 'seppi',
  seppie: 'seppi',
  cozza: 'cozz',
  cozze: 'cozz',
  vongola: 'vongol',
  vongole: 'vongol',
  limone: 'limon',
  limoni: 'limon',
  fragola: 'fragol',
  fragole: 'fragol',
  pesca: 'pesc',
  pesche: 'pesc',
};

/**
 * Algoritmo di stemming morfologico italiano ad alte prestazioni.
 * Riduce parole plurali, diminutive o flessionali alla radice semantica comune.
 */
export function italianStem(word: string): string {
  const clean = normalizeItalianText(word);
  if (!clean || clean.length <= 2) return clean;

  if (IRREGULAR_STEMS[clean]) return IRREGULAR_STEMS[clean];

  let stem = clean;

  // Rimozione suffissi alterativi / diminutivi / accrescitivi
  // (es. pomodorini -> pomodor, fettine -> fett, bocconcini -> bocconc)
  stem = stem
    .replace(/(?:issim[oaie]|ment[ei]|zion[ei]|tore|tric[ei])$/, '')
    .replace(/(?:ett[oaie]|in[oaie]|ell[oaie]|on[ei]|acci[oaie])$/, '');

  if (stem.length <= 2) stem = clean;

  // Normalizzazione plurale/singolare italiano
  if (stem.endsWith('chi') || stem.endsWith('che')) {
    stem = stem.slice(0, -3) + 'c';
  } else if (stem.endsWith('ghi') || stem.endsWith('ghe')) {
    stem = stem.slice(0, -3) + 'g';
  } else if (stem.endsWith('ci') || stem.endsWith('ce')) {
    stem = stem.slice(0, -2) + 'c';
  } else if (stem.endsWith('gi') || stem.endsWith('ge')) {
    stem = stem.slice(0, -2) + 'g';
  } else if (stem.endsWith('ie') || stem.endsWith('ia')) {
    stem = stem.slice(0, -2);
  } else if (stem.endsWith('i') || stem.endsWith('e') || stem.endsWith('o') || stem.endsWith('a')) {
    stem = stem.slice(0, -1);
  }

  return stem.length >= 2 ? stem : clean;
}

/**
 * Chiave fonetica italiana per intercettare errori di pronuncia / digitazione.
 * Converte schemi sonori affini:
 * ch, c prima di vocali, doppie consonanti, ecc.
 */
export function italianPhoneticKey(word: string): string {
  let s = normalizeItalianText(word);
  if (!s) return '';

  // Riduci doppie consonanti
  s = s.replace(/([a-z])\1+/g, '$1');

  // Normalizzazioni fonetiche
  s = s.replace(/chi|che/g, 'k');
  s = s.replace(/ghi|ghe/g, 'g');
  s = s.replace(/gli/g, 'li');
  s = s.replace(/gn/g, 'n');
  s = s.replace(/qu|kw/g, 'k');
  s = s.replace(/c(?=[ei])/g, 's');
  s = s.replace(/c/g, 'k');
  s = s.replace(/h/g, '');
  s = s.replace(/z/g, 's');
  s = s.replace(/x/g, 'ks');

  return s;
}

/**
 * Calcola la similarità composita fuzzy fra due token in [0, 1].
 * Combina:
 * 1. Uguaglianza esatta (1.0)
 * 2. Stem match (0.95)
 * 3. Phonetic match (0.90)
 * 4. Damerau-Levenshtein / Jaro-Winkler / N-gram
 */
export function tokenFuzzySimilarity(t1: string, t2: string): number {
  const norm1 = normalizeItalianText(t1);
  const norm2 = normalizeItalianText(t2);

  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  // Se una delle due stringhe è una frase multi-parola e contiene l'altra come parola distinta (es: 'tonno' in 'tonno sott olio')
  const hasMultipleWords = norm1.includes(' ') || norm2.includes(' ');
  if (hasMultipleWords) {
    if (new RegExp(`(?:^|\\s)${norm1}(?:\\s|$)`).test(norm2)) return 0.95;
    if (new RegExp(`(?:^|\\s)${norm2}(?:\\s|$)`).test(norm1)) return 0.95;
  }

  const stem1 = italianStem(norm1);
  const stem2 = italianStem(norm2);
  if (stem1 && stem2 && stem1 === stem2) return 0.94;
  if (stem1.length >= 4 && stem2.length >= 4) {
    if (stem1 === stem2) return 0.92;
  }

  const phon1 = italianPhoneticKey(norm1);
  const phon2 = italianPhoneticKey(norm2);
  if (phon1 && phon2 && phon1 === phon2 && Math.abs(norm1.length - norm2.length) <= 1) return 0.88;

  const maxLen = Math.max(norm1.length, norm2.length);
  const dLev = damerauLevenshteinDistance(norm1, norm2);
  const levSim = Math.max(0, 1.0 - dLev / maxLen);

  const jaroSim = jaroWinklerSimilarity(norm1, norm2);
  const ngramSim = nGramJaccardSimilarity(norm1, norm2, 2);

  return Math.max(levSim, jaroSim * 0.95, ngramSim);
}

// ============================================================================
// 3. DIZIONARIO SINONIMI & ONTOLOGIA CIBI E INGREDIENTI
// ============================================================================

export const FOOD_SYNONYMS: Record<string, string[]> = {
  pollo: ['petto di pollo', 'coscia di pollo', 'cosce di pollo', 'fusi di pollo', 'straccetti di pollo', 'pollo a fette', 'alette di pollo', 'bocconcini di pollo'],
  tacchino: ['petto di tacchino', 'fesa di tacchino', 'straccetti di tacchino', 'fesa'],
  tonno: ['tonno in scatola', 'tonno sott olio', 'trancio di tonno', 'filetto di tonno', 'tonno fresco'],
  salmone: ['salmone fresco', 'filetto di salmone', 'salmone affumicato', 'trancio di salmone'],
  merluzzo: ['filetto di merluzzo', 'baccala', 'baccalà', 'nasello'],
  orata: ['filetto di orata'],
  spigola: ['branzino', 'filetto di branzino', 'filetto di spigola'],
  pesce: ['pesce spada', 'pesce fresco', 'pesce azzurro', 'pesce persico'],
  gamberi: ['gambero', 'gamberetti', 'mazzancolle', 'scampi', 'gamberoni'],
  calamari: ['calamaro', 'totani', 'seppie', 'seppia', 'anelli di calamaro'],
  polpo: ['polipo', 'tentacoli di polpo'],
  cozze: ['cozza', 'mitili'],
  vongole: ['vongola', 'telline'],
  pasta: ['spaghetti', 'penne', 'rigatoni', 'fusilli', 'farfalle', 'tagliatelle', 'pasta integrale', 'tortiglioni', 'paccheri', 'orecchiette', 'linguine', 'bucatini'],
  riso: ['riso basmati', 'riso carnaroli', 'riso arborio', 'riso venere', 'riso integrale', 'risotto'],
  gnocchi: ['gnocchi di patate', 'chicche di patate'],
  couscous: ['cuscus'],
  uova: ['uovo', 'tuorlo', 'tuorli', 'albume', 'albumi'],
  carne: ['macinato', 'carne macinata', 'tritato', 'manzo', 'maiale', 'vitello', 'bistecca', 'hamburger', 'fettina', 'fettine', 'spezzatino', 'tagliata'],
  maiale: ['arista', 'lonza', 'costine', 'braciola', 'pancetta'],
  salsiccia: ['salsicce', 'salamella', 'luganega'],
  prosciutto: ['prosciutto cotto', 'prosciutto crudo', 'speck', 'bresaola', 'mortadella', 'salame', 'guanciale', 'affettati'],
  pomodori: ['pomodoro', 'pomodorini', 'pomodoro ciliegino', 'datterini', 'pelati', 'passata di pomodoro', 'polpa di pomodoro', 'sugo'],
  parmigiano: ['grana', 'grana padano', 'parmigiano reggiano', 'parmigiano grattugiato', 'pecorino', 'formaggio grattugiato'],
  formaggio: ['mozzarella', 'ricotta', 'stracchino', 'scamorza', 'gorgonzola', 'provola', 'fontina', 'caciocavallo', 'feta', 'burrata', 'mascarpone', 'crescenza', 'emmental'],
  pane: ['pane fresco', 'pane raffermo', 'pancarre', 'pan bauletto', 'crostini', 'pangrattato', 'pane grattugiato', 'bruschetta', 'focaccia'],
  zucchine: ['zucchina', 'zucchine tagliate', 'zucchine rondelle', 'fiori di zucca'],
  carote: ['carota', 'carote a julienne'],
  melanzane: ['melanzana', 'melanzane a fette', 'melanzane grigliate'],
  peperoni: ['peperone', 'peperoni rossi', 'peperoni gialli', 'friggitelli'],
  patate: ['patata', 'patate dolci', 'patate lesse', 'patatine'],
  cipolle: ['cipolla', 'cipolla rossa', 'cipolla bianca', 'cipolla bionda', 'scalogno', 'cipollotto', 'porri', 'porro'],
  funghi: ['fungo', 'champignon', 'porcini', 'chiodini', 'funghi secchi', 'tartufo'],
  spinaci: ['spinacio', 'bietole', 'erbette', 'spinaci surgelati'],
  zucca: ['zucca gialla', 'zucca butternut'],
  carciofi: ['carciofo', 'cuori di carciofo'],
  asparagi: ['asparago'],
  piselli: ['pisello', 'pisellini', 'piselli surgelati'],
  fagiolini: ['tegoline', 'cornetti'],
  broccoli: ['broccolo', 'cavolfiore', 'cime di rapa', 'cavolo'],
  sedano: ['costa di sedano', 'sedano rapa'],
  finocchi: ['finocchio'],
  insalata: ['lattuga', 'rucola', 'radicchio', 'valeriana', 'iceberg'],
  farina: ['farina 00', 'farina 0', 'farina integrale', 'farina manitoba', 'farina d avena', 'farina di riso', 'fecola di patate', 'amido di mais', 'maizena'],
  latte: ['latte scremato', 'latte parzialmente scremato', 'latte intero', 'latte di mandorla', 'latte di soia', 'latte d avena'],
  panna: ['panna fresca', 'panna da cucina', 'panna liquida', 'panna montata'],
  olio: ['olio extravergine', 'olio di oliva', 'olio evo', 'olio di semi'],
  burro: ['burro chiarificato', 'burro di arachidi'],
  ceci: ['ceci cotti', 'ceci in scatola', 'ceci in barattolo', 'farina di ceci'],
  lenticchie: ['lenticchie secche', 'lenticchie in barattolo', 'lenticchie in scatola'],
  fagioli: ['fagioli borlotti', 'fagioli cannellini', 'fagioli neri', 'fagioli rossi'],
  tofu: ['tofu al naturale', 'tofu affumicato', 'seitan', 'tempeh'],
  avena: ['fiocchi d avena', 'farina d avena', 'porridge'],
  quinoa: ['quinoa bianca', 'quinoa rossa', 'farro', 'orzo', 'couscous'],
  mele: ['mela', 'mela renetta', 'mele golden'],
  pere: ['pera', 'pere abate'],
  banane: ['banana'],
  arance: ['arancia', 'mandarini', 'clementine', 'spremuta'],
  limone: ['limoni', 'succo di limone', 'scorza di limone'],
  fragole: ['fragola'],
  pesche: ['pesca', 'albicocche', 'albicocca'],
  mirtilli: ['frutti di bosco', 'more', 'lamponi'],
  avocado: ['avocado maturo'],
  noci: ['noce', 'mandorle', 'mandorla', 'nocciole', 'nocciola', 'pinoli', 'pistacchi'],
  miele: ['miele millefiori', 'miele d acacia'],
  cioccolato: ['cioccolato fondente', 'cioccolato al latte', 'cacao', 'cacao amaro', 'gocce di cioccolato'],
  lievito: ['lievito di birra', 'lievito per dolci', 'lievito istantaneo'],
};

// Condimenti ed elementi base di cucina (non penalizzano severamente se mancano)
export const BASIC_STAPLES = new Set([
  'olio', 'sale', 'pepe', 'acqua', 'aglio', 'farina', 'zucchero', 'aceto', 'rosmarino', 'basilico', 'origano'
]);

// Parole italiane da filtrare prima dell'estrazione ingredienti
const CONVERSATIONAL_FOOD_STOPWORDS = new Set([
  'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
  'il', 'lo', 'la', 'i', 'gli', 'le', 'l', 'd', 'c',
  'un', 'uno', 'una', 'un\'', 'po', 'po\'',
  'del', 'dello', 'della', 'dei', 'degli', 'delle',
  'al', 'allo', 'alla', 'ai', 'agli', 'alle',
  'nel', 'nello', 'nella', 'nei', 'negli', 'nelle',
  'sul', 'sullo', 'sulla', 'sui', 'sugli', 'sulle',
  'ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno',
  'avanzato', 'avanzata', 'avanzati', 'avanzate',
  'rimasto', 'rimasta', 'rimasti', 'rimaste',
  'vecchio', 'vecchia', 'vecchi', 'vecchie',
  'frigo', 'frigorifero',
  'casa', 'disposizione', 'fresco', 'fresca', 'freschi', 'fresche',
  'cosa', 'posso', 'preparare', 'cucinare', 'fare', 'trovare', 'mi', 'consigli', 'consigliami',
  'stasera', 'oggi', 'domani', 'pranzo', 'cena', 'colazione', 'merenda',
  'ricetta', 'ricette', 'col', 'colla', 'coi', 'e', 'ed', 'anche',
  'ingrediente', 'ingredienti', 'ingrendiente', 'ingrendienti', 'ingrendinte', 'ingrendinti', 'ingredinte', 'ingredinti', 'igrediente', 'igredienti', 'ingr', 'ingred', 'ingrend',
  'ingrandiente', 'ingrandienti', 'ingrandinte', 'ingrandinti', 'ingridiente', 'ingridienti', 'ingridinte', 'ingridinti', 'ingradiente', 'ingradienti', 'ingreediente', 'ingreedienti', 'ingridenti', 'ingridente', 'ingredineti', 'ingredineto', 'ingredieti',
  'base', 'a base di', 'devo', 'devo fare', 'devo preparare',
  'cibo', 'cibi', 'alimento', 'alimenti', 'roba',
  'vorrei', 'dimmi', 'trovami', 'suggerisci', 'idee', 'piatto', 'piatti',
  'due', 'tre', 'quattro', 'cinque', 'chilo', 'chili', 'kg', 'etto', 'etti', 'g', 'grammi',
  'barattolo', 'scatoletta', 'bustina', 'scatola', 'confezione', 'pacchetto', 'fetta', 'fette',
  'questo', 'questa', 'questi', 'queste', 'quello', 'quella', 'quelli', 'quelle',
  'mio', 'mia', 'miei', 'mie', 'tuo', 'tua', 'tuoi', 'tue', 'suo', 'sua', 'suoi', 'sue', 'nostro', 'nostra', 'nostri', 'nostre',
  'sono', 'sei', 'e', 'ed', 'sia',
  'alcun', 'alcuno', 'alcuna', 'alcuni', 'alcune', 'tutto', 'tutta', 'tutti', 'tutte',
  'trova', 'cerca', 'cercami', 'mostra', 'mostrami', 'apri', 'vai',
  'corrispondente', 'corrispondenti', 'simile', 'simili', 'affinita', 'affine', 'affini', 'tipo', 'come', 'quali', 'quale'
]);

// ============================================================================
// 4. ESTRAZIONE ENTITÀ IN LINGUAGGIO NATURALE
// ============================================================================

export interface ExtractedFoodEntity {
  raw: string;
  normalized: string;
  canonical: string;
  stem: string;
}

/**
 * Trova il nome canonico del cibo.
 * Ritorna il nome canonico se corrisponde a un cibo/ingrediente noto, altrimenti null.
 */
export function resolveCanonicalFood(token: string): string | null {
  const norm = normalizeItalianText(token);
  if (!norm || norm.length < 3) return null;
  if (
    CONVERSATIONAL_FOOD_STOPWORDS.has(norm) || 
    /^i(?:n)?g(?:r|ren|ran|rid|reed|rad)?d(?:i|ien|in)?t[ei]?$/i.test(norm) ||
    (norm.startsWith('ingr') && (norm.includes('dien') || norm.includes('dian') || norm.includes('dint'))) ||
    norm.startsWith('igred')
  ) return null;
  const stem = italianStem(norm);

  // 1. Corrispondenza diretta con chiave canonica o radice
  for (const [key, syns] of Object.entries(FOOD_SYNONYMS)) {
    if (norm === key || stem === italianStem(key)) return key;
    if (syns.some(s => norm === s || stem === italianStem(s))) return key;
  }

  // 2. Corrispondenza per parola intera contenuta
  for (const [key, syns] of Object.entries(FOOD_SYNONYMS)) {
    if (new RegExp(`(?:^|\\s)${key}(?:\\s|$)`).test(norm)) return key;
    if (syns.some(s => new RegExp(`(?:^|\\s)${s}(?:\\s|$)`).test(norm))) return key;
  }

  // 3. Controlla condimenti base
  if (BASIC_STAPLES.has(norm) || BASIC_STAPLES.has(stem)) return norm;

  // 4. Fuzzy similarity ad alta soglia (>= 0.85) per correzione refusi (es: 'tonoo' -> 'tonno', 'poloo' -> 'pollo')
  let bestKey: string | null = null;
  let bestSim = 0.85;

  for (const [key, syns] of Object.entries(FOOD_SYNONYMS)) {
    const simKey = tokenFuzzySimilarity(norm, key);
    if (simKey > bestSim) {
      bestSim = simKey;
      bestKey = key;
    }
    for (const s of syns) {
      const simSyn = tokenFuzzySimilarity(norm, s);
      if (simSyn > bestSim) {
        bestSim = simSyn;
        bestKey = key;
      }
    }
  }

  if (bestKey) return bestKey;

  // 5. Se la parola appartiene a una categoria alimentare del supermercato
  const cat = detectSupermarketCategory(norm);
  if (cat === 'frutta-verdura' || cat === 'carne-pesce' || cat === 'latticini-uova' || cat === 'pane-pasticceria' || cat === 'dispensa') {
    return norm;
  }

  return null;
}

/**
 * Estrae entità di ingredienti/cibo da una frase italiana conversazionale complessa.
 * Es: "ho un po' di pollo avanzato, due carote e delle zucchine in frigo"
 * -> ['pollo', 'carote', 'zucchine']
 * Es: "pasta col tonno" -> ['pasta', 'tonno']
 * Es: "pomodorini e grana" -> ['pomodorini', 'grana']
 */
export function extractFoodEntities(sentence: string): ExtractedFoodEntity[] {
  if (!sentence || !sentence.trim()) return [];

  // Pulisci frase
  const clean = normalizeItalianText(sentence);
  
  // Spezza con congiunzioni, virgole e marcatori
  const clauses = clean.split(/(?:,|\be\b|\bed\b|\bcon\b|\bpiu\b|\bpiù\b|\bo\b|\binoltre\b)/g);
  const candidates: string[] = [];

  const isStopWord = (w: string) => {
    const nw = normalizeItalianText(w);
    return CONVERSATIONAL_FOOD_STOPWORDS.has(nw) || 
      /^i(?:n)?g(?:r|ren|ran|rid|reed|rad)?d(?:i|ien|in)?t[ei]?$/i.test(nw) ||
      (nw.startsWith('ingr') && (nw.includes('dien') || nw.includes('dian') || nw.includes('dint'))) ||
      nw.startsWith('igred');
  };

  for (const clause of clauses) {
    const words = clause.trim().split(/\s+/).filter(Boolean);
    const filtered = words.filter(w => !isStopWord(w) && w.length >= 2);
    
    if (filtered.length === 0) continue;

    // Se ci sono parole composte (es: "petto di pollo" o "pomodori secchi" o "pasta integrale")
    const joined = filtered.join(' ');
    // Controlla se la frase intera corrisponde a un cibo noto o sinonimo
    let matchedCompound = false;
    for (const [canonical, syns] of Object.entries(FOOD_SYNONYMS)) {
      if (joined === canonical || syns.some(s => joined === s)) {
        candidates.push(canonical);
        matchedCompound = true;
        break;
      }
    }

    if (!matchedCompound) {
      // Altrimenti aggiungi le singole parole significative
      for (const w of filtered) {
        if (!isStopWord(w)) {
          candidates.push(w);
        }
      }
    }
  }

  // Risolvi sinonimi e radici canoniche
  const results: ExtractedFoodEntity[] = [];
  const seen = new Set<string>();

  for (const raw of candidates) {
    const norm = normalizeItalianText(raw);
    const canonical = resolveCanonicalFood(norm);
    if (!canonical) continue; // Salta parole che non sono alimenti!

    const stem = italianStem(canonical);
    const dedupeKey = stem;
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      results.push({
        raw,
        normalized: norm,
        canonical,
        stem,
      });
    }
  }

  return results;
}

// ============================================================================
// 5. CACHE IN-MEMORY RICETTARIO COMPLETO (617+ RICETTE MONDO & CUSTOM)
// ============================================================================

export interface RecipeCatalogItem {
  id: string;
  title: string;
  category: string;
  image?: string;
  ingredients: string[];
  steps?: string[];
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  tags?: string[];
  country?: string;
  flag?: string;
}

let cachedRecipeCatalog: RecipeCatalogItem[] | null = null;
let isCatalogLoading = false;

/**
 * Carica e indicizza tutte le 617 ricette dal JSON locale e le ricette personalizzate.
 */
export async function getOrLoadAllRecipes(): Promise<RecipeCatalogItem[]> {
  if (cachedRecipeCatalog && cachedRecipeCatalog.length > 0) {
    return cachedRecipeCatalog;
  }

  const items: RecipeCatalogItem[] = [];

  // 1. Carica ricette create/salvate dall'utente dal localStorage
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const rawCustom = localStorage.getItem('chelona_custom_recipes');
      if (rawCustom) {
        const parsed = JSON.parse(rawCustom);
        if (Array.isArray(parsed)) {
          for (const c of parsed) {
            items.push({
              id: c.id || `custom_${Math.random()}`,
              title: c.title || c.nome || 'Ricetta Personalizzata',
              category: c.category || c.categoria || 'Secondi',
              image: c.image || c.immagine || '',
              ingredients: Array.isArray(c.ingredients) ? c.ingredients : (Array.isArray(c.ingredienti) ? c.ingredienti : []),
              steps: c.steps || c.procedimento || [],
              calories: c.calories,
              protein: c.protein,
              carbs: c.carbs,
              fat: c.fat,
              tags: c.tags,
            });
          }
        }
      }
    } catch (e) {
      console.warn('[MathEngine] Errore lettura custom recipes:', e);
    }
  }

  // 2. Carica da public/ricette_mondo.json (617 ricette)
  if (typeof window === 'undefined') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'public', 'ricette_mondo.json');
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          for (const r of data) {
            items.push({
              id: r.id || `rec_${Math.random()}`,
              title: r.title || r.nome || 'Ricetta',
              category: r.category || r.categoria || 'Primi',
              image: r.image || r.immagine || '',
              ingredients: Array.isArray(r.ingredients) ? r.ingredients : (Array.isArray(r.ingredienti) ? r.ingredienti : []),
              steps: Array.isArray(r.steps) ? r.steps : (typeof r.procedimento === 'string' ? r.procedimento.split('\n').filter(Boolean) : []),
              calories: r.calories,
              protein: r.protein,
              carbs: r.carbs,
              fat: r.fat,
              tags: r.tags,
              country: r.country || 'Italia',
              flag: r.flag || '🇮🇹',
            });
          }
        }
      }
    } catch (e) {
      console.warn('[MathEngine] Read ricette_mondo.json fs error:', e);
    }
  } else if (typeof fetch === 'function') {
    try {
      isCatalogLoading = true;
      let res = await fetch('ricette_mondo.json').catch(() => null);
      if (!res || !res.ok) {
        res = await fetch('/ricette_mondo.json').catch(() => null);
      }
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const r of data) {
            items.push({
              id: r.id || `rec_${Math.random()}`,
              title: r.title || r.nome || 'Ricetta',
              category: r.category || r.categoria || 'Primi',
              image: r.image || r.immagine || '',
              ingredients: Array.isArray(r.ingredients) ? r.ingredients : (Array.isArray(r.ingredienti) ? r.ingredienti : []),
              steps: Array.isArray(r.steps) ? r.steps : (typeof r.procedimento === 'string' ? r.procedimento.split('\n').filter(Boolean) : []),
              calories: r.calories,
              protein: r.protein,
              carbs: r.carbs,
              fat: r.fat,
              tags: r.tags,
              country: r.country || 'Italia',
              flag: r.flag || '🇮🇹',
            });
          }
        }
      }
    } catch (e) {
      console.warn('[MathEngine] Fetch ricette_mondo.json fallback:', e);
    } finally {
      isCatalogLoading = false;
    }
  }

  // 3. Fallback incorporato di emergenza con classici italiani se il fetch è ancora in corso
  if (items.length === 0) {
    items.push(
      {
        id: 'fallback_tonno_pasta',
        title: 'Pasta Integrale al Tonno',
        category: 'Primi',
        ingredients: ['320g pasta integrale', '160g tonno sott olio', '1 spicchio aglio', 'pomodorini q.b.', 'olio extravergine d oliva', 'sale'],
        calories: 420,
        protein: 26,
      },
      {
        id: 'fallback_pollo_verdure',
        title: 'Petto di Pollo con Carote e Zucchine',
        category: 'Secondi',
        ingredients: ['400g petto di pollo', '2 carote', '2 zucchine', 'olio extravergine d oliva', 'sale', 'rosmarino'],
        calories: 340,
        protein: 38,
      },
      {
        id: 'fallback_pomodorini_pasta',
        title: 'Spaghetti con Pomodorini e Grana',
        category: 'Primi',
        ingredients: ['320g spaghetti', '300g pomodorini', 'grana padano grattugiato', 'basilico fresco', 'olio extravergine d oliva', 'sale'],
        calories: 450,
        protein: 16,
      }
    );
  }

  cachedRecipeCatalog = items;
  return items;
}

// Inizializza il precaricamento asincrono immediato a zero blocking
if (typeof window !== 'undefined') {
  setTimeout(() => {
    getOrLoadAllRecipes().catch(() => {});
  }, 50);
}

// ============================================================================
// 6. CALCOLO MATEMATICO CORRISPONDENZA RICETTE & COPERTURA INGREDIENTI
// ============================================================================

export interface RecipeMatchResult {
  recipe: RecipeCatalogItem;
  score: number; // 0..100
  matchedUserIngredients: string[];
  matchedRecipeIngredients: string[];
  missingIngredients: string[];
  userCoveragePercent: number; // % degli ingredienti dell'utente presenti nella ricetta
  recipeCoveragePercent: number; // % degli ingredienti della ricetta che l'utente ha già
  hasKeyProteins: boolean;
}

/**
 * Motore Matematico di Corrispondenza Ricette:
 * Data una lista di ingredienti cercati dall'utente, calcola il coefficiente di copertura,
 * ponderando:
 * - Copertura ingredienti dell'utente (peso: 60%)
 * - Bonus titolo (peso: 25%)
 * - Copertura globale ingredienti ricetta escludendo staples (peso: 15%)
 */
export function matchRecipesByIngredients(
  userEntities: ExtractedFoodEntity[],
  catalog: RecipeCatalogItem[]
): RecipeMatchResult[] {
  if (!userEntities || userEntities.length === 0 || !catalog || catalog.length === 0) {
    return [];
  }

  const results: RecipeMatchResult[] = [];

  for (const recipe of catalog) {
    const rawIngs = recipe.ingredients || [];
    const recipeTitle = normalizeItalianText(recipe.title);
    
    // Normalizza e isola nomi degli ingredienti della ricetta
    const parsedRecipeIngs = rawIngs.map(i => {
      const text = typeof i === 'string' ? i : (i as any).name || (i as any).nome || '';
      return {
        original: text,
        clean: normalizeItalianText(text),
        stems: normalizeItalianText(text).split(/\s+/).map(italianStem),
      };
    });

    const matchedUserIngs = new Set<string>();
    const matchedRecipeIngs = new Set<string>();

    for (const u of userEntities) {
      // 1. Controlla nel titolo con confine di parola
      const inTitle = new RegExp(`(?:^|\\s)${u.canonical}(?:\\s|$)`).test(recipeTitle) ||
                      new RegExp(`(?:^|\\s)${u.normalized}(?:\\s|$)`).test(recipeTitle) ||
                      recipeTitle.split(/\s+/).some(t => italianStem(t) === u.stem);
      if (inTitle) {
        matchedUserIngs.add(u.canonical);
      }

      // 2. Controlla in ogni ingrediente della ricetta
      for (const rIng of parsedRecipeIngs) {
        let isMatch = false;

        // Corrispondenza con token dell'ingrediente (es: 'petto di pollo' contiene 'pollo')
        const rTokens = rIng.clean.split(/\s+/).filter(Boolean);
        for (const token of rTokens) {
          if (token === u.canonical || token === u.normalized) {
            isMatch = true;
            break;
          }
          const tStem = italianStem(token);
          if (tStem && u.stem && tStem === u.stem) {
            isMatch = true;
            break;
          }
          // Fuzzy match per piccoli refusi
          if (tokenFuzzySimilarity(u.canonical, token) >= 0.88 || tokenFuzzySimilarity(u.normalized, token) >= 0.88) {
            isMatch = true;
            break;
          }
        }

        if (isMatch) {
          matchedUserIngs.add(u.canonical);
          matchedRecipeIngs.add(rIng.original);
        }
      }
    }

    // Se nessun ingrediente dell'utente è presente, scarta
    if (matchedUserIngs.size === 0) continue;

    // Calcolo ingredienti mancanti (escludendo condimenti elementari di base)
    const missingIngredients: string[] = [];
    for (const rIng of parsedRecipeIngs) {
      if (!matchedRecipeIngs.has(rIng.original)) {
        const isStaple = Array.from(BASIC_STAPLES).some(s => rIng.clean.includes(s));
        if (!isStaple) {
          missingIngredients.push(rIng.original);
        }
      }
    }

    const userCoverage = matchedUserIngs.size / userEntities.length;
    const totalMeaningfulIngs = Math.max(1, parsedRecipeIngs.filter(r => !Array.from(BASIC_STAPLES).some(s => r.clean.includes(s))).length);
    const recipeCoverage = matchedRecipeIngs.size / totalMeaningfulIngs;

    // Bonus se il titolo della ricetta contiene uno degli ingredienti cercati
    let titleBonus = 0;
    for (const u of userEntities) {
      if (recipeTitle.includes(u.normalized) || recipeTitle.includes(u.canonical) || recipeTitle.includes(u.stem)) {
        titleBonus += 0.15;
      }
    }
    titleBonus = Math.min(0.30, titleBonus);

    // Score composito ponderato
    const compositeScore = Math.min(100, Math.round((userCoverage * 0.55 + titleBonus + recipeCoverage * 0.25) * 100));

    results.push({
      recipe,
      score: compositeScore,
      matchedUserIngredients: Array.from(matchedUserIngs),
      matchedRecipeIngredients: Array.from(matchedRecipeIngs),
      missingIngredients,
      userCoveragePercent: Math.round(userCoverage * 100),
      recipeCoveragePercent: Math.round(recipeCoverage * 100),
      hasKeyProteins: recipe.protein ? recipe.protein >= 20 : false,
    });
  }

  // Ordina per punteggio decrescente
  return results.sort((a, b) => b.score - a.score);
}

// ============================================================================
// 7. FORMATTAZIONE CONVERSAZIONALE EMPATICA IN ITALIANO
// ============================================================================

export function formatRecipeMatchResponse(
  userEntities: ExtractedFoodEntity[],
  matches: RecipeMatchResult[]
): { text: string; actions: any[]; autoAction?: any } {
  const userIngredientsList = userEntities.map(e => e.canonical).join(', ');

  if (!matches || matches.length === 0) {
    return {
      text: `Non ho trovato ricette con **${userIngredientsList}**.`,
      actions: [
        { label: '📖 Sfoglia Ricettario', type: 'recipes' },
      ],
    };
  }

  const topMatches = matches.slice(0, 3);
  const best = topMatches[0];

  const text = `Ecco le ricette perfette con i tuoi ingredienti (${userIngredientsList}):`;
  const actions: any[] = [];

  topMatches.forEach((m) => {
    const r = m.recipe;
    actions.push({
      label: r.title,
      type: 'recipes',
      recipe: r,
    });
  });

  // Bottone per aggiungere gli ingredienti mancanti alla spesa
  if (best.missingIngredients.length > 0) {
    const itemsToAdd = best.missingIngredients.slice(0, 5).map(raw => {
      const cleanName = cleanIngredientDisplayName(raw);
      return {
        name: cleanName,
        category: detectSupermarketCategory(cleanName),
      };
    });

    actions.push({
      label: `🛒 Aggiungi mancanti alla Lista Spesa (${itemsToAdd.length})`,
      type: 'add_shopping_items',
      items: itemsToAdd,
    });
  }

  actions.push({
    label: '📖 Tutte le Ricette',
    type: 'recipes',
  });

  return {
    text,
    actions,
  };
}

/**
 * Pulisce le stringhe di ingredienti dai pesi/grammature per l'inserimento in lista spesa.
 * Es: "400g petto di pollo" -> "Petto di pollo"
 */
export function cleanIngredientDisplayName(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l|cl|etto|etti|cucchiai[o]?|cucchiain[o]?|pizzic[o]?|bustin[ae]|fett[ae]|spicchi[o]?)\s*(?:di|d')?\s*/i, '')
    .replace(/^\d+\s*/, '')
    .replace(/\s*q\.?b\.?/i, '')
    .trim()
    .replace(/^./, c => c.toUpperCase());
}

/**
 * Pulisce la query di ricerca di un piatto rimuovendo parole conversazionali,
 * richieste di ingredienti, verbi, articoli e preposizioni.
 */
export function cleanDishSearchQuery(query: string): string {
  let norm = normalizeItalianText(query);
  if (!norm) return '';

  // Rimuovi prefissi interrogativi, verbali o conversazionali comuni
  norm = norm
    .replace(/^(?:quando\s+chiedo\s+(?:gli\s+)?(?:ingrandienti|ingredienti|la\s+ricetta|le\s+ricette)|quando\s+chiedo|chiedo\s+gli\s+(?:ingrandienti|ingredienti|la\s+ricetta)|chiedo|vorrei\s+sapere|vorrei\s+conoscere|vorrei|dimmi|dammi|mi\s+dici|mi\s+dai|fammi\s+vedere|mostrami|spiegami|quali\s+sono|quale\s+e|qual\s+e|che|cosa|cerca|trova|come\s+fare|come\s+si\s+fa|come\s+preparare|come\s+si\s+prepara|come\s+cucinare|come\s+si\s+cucina)\s+/i, '')
    .trim();

  // Rimuovi parole relative a ricetta/ingredienti (comprese forme scorrette e refusi come ingrandienti, igredienti)
  norm = norm
    .replace(/^(?:la\s+ricetta|le\s+ricette|ricetta|ricette|gli\s+ingredienti|gli\s+ingrandienti|gli\s+ingrendienti|gli\s+igredienti|gli\s+ingridienti|gli\s+ingred|gli\s+ingrand|ingredienti|ingrandienti|ingrendienti|igredienti|ingridienti|ingrediente|ingrandiente|ingrendiente|igrediente|ingridiente|ingred|ingrand|igred)\s+/i, '')
    .trim();

  // Rimuovi particelle verbali (es: "servono per", "ci vogliono per", "usare per", "necessari per")
  norm = norm
    .replace(/^(?:che\s+servono\s+per|servono\s+per|ci\s+vogliono\s+per|usare\s+per|necessari\s+per|da\s+usare\s+per)\s+/i, '')
    .trim();

  // Rimuovi preposizioni di raccordo (di, del, della, dello, dei, degli, delle, per, a base di)
  norm = norm
    .replace(/^(?:a\s+base\s+di|di|del|dello|della|dei|degli|delle|per)\s+/i, '')
    .trim();

  // Rimuovi articoli determinativi iniziali
  norm = norm
    .replace(/^(?:il|lo|la|i|gli|le|l[\'\s])\s*/i, '')
    .trim();

  // Rimuovi suffissi conversazionali finali
  norm = norm
    .replace(/\s+(?:per\s+(?:il\s+)?pranzo|per\s+(?:la\s+)?cena|di\s+domani|per\s+domani)$/i, '')
    .trim();

  return norm;
}

/**
 * Cerca una ricetta per nome/titolo specifico nel catalogo con corrispondenza fuzzy
 */
export function searchRecipeByDishTitle(query: string, catalog: RecipeCatalogItem[]): RecipeCatalogItem | null {
  const cleanQ = cleanDishSearchQuery(query);
  if (!cleanQ || cleanQ.length < 3) return null;

  // Evita falsi positivi con parole generiche o stopwords
  if (CONVERSATIONAL_FOOD_STOPWORDS.has(cleanQ) || cleanQ === 'un' || cleanQ === 'uno' || cleanQ === 'una' || cleanQ === 'un ingrediente' || cleanQ === 'ingrediente') {
    return null;
  }

  // 1. Corrispondenza esatta
  for (const r of catalog) {
    const t = normalizeItalianText(r.title);
    if (t === cleanQ) return r;
  }

  // 2. Corrispondenza per sottostringa (es: "carbonara" in "Spaghetti alla Carbonara")
  for (const r of catalog) {
    const t = normalizeItalianText(r.title);
    if (t.includes(cleanQ) || cleanQ.includes(t)) return r;
  }

  // 3. Corrispondenza su singole parole chiave del titolo (es. parole con >= 4 lettere)
  const cleanTokens = cleanQ.split(/\s+/).filter(tok => tok.length >= 4 && !CONVERSATIONAL_FOOD_STOPWORDS.has(tok));
  if (cleanTokens.length > 0) {
    for (const r of catalog) {
      const t = normalizeItalianText(r.title);
      const titleTokens = t.split(/\s+/);
      const allFound = cleanTokens.every(ct => titleTokens.some(tt => tt === ct || tt.startsWith(ct) || ct.startsWith(tt)));
      if (allFound) return r;
    }
  }

  // 4. Similarità fuzzy
  let bestRecipe: RecipeCatalogItem | null = null;
  let bestSim = 0.74;
  for (const r of catalog) {
    const t = normalizeItalianText(r.title);
    const sim = tokenFuzzySimilarity(cleanQ, t);
    if (sim > bestSim) {
      bestSim = sim;
      bestRecipe = r;
    }
  }

  return bestRecipe;
}

/**
 * Formatta la risposta per una singola ricetta trovata per titolo
 */
export function formatSingleRecipeResponse(recipe: RecipeCatalogItem): { text: string; actions: any[]; autoAction?: any } {
  let out = `Ecco la ricetta per **${recipe.title}** (${recipe.category}):`;
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    const list = recipe.ingredients.slice(0, 6).map(i => {
      const line = typeof i === 'string' ? i : (i as any).name || (i as any).nome || '';
      return cleanIngredientDisplayName(line);
    }).filter(Boolean);
    if (list.length > 0) {
      out += `\n• **Ingredienti**: ${list.join(', ')}`;
    }
  }

  const itemsToAdd = (recipe.ingredients || []).slice(0, 8).map(raw => {
    const line = typeof raw === 'string' ? raw : (raw as any).name || (raw as any).nome || '';
    const cleanName = cleanIngredientDisplayName(line);
    return {
      name: cleanName,
      category: detectSupermarketCategory(cleanName),
    };
  }).filter(i => i.name.length > 0);

  const actions: any[] = [
    { label: recipe.title, type: 'recipes', recipe: recipe },
  ];

  if (itemsToAdd.length > 0) {
    actions.push({
      label: `🛒 Aggiungi ingredienti alla Lista Spesa (${itemsToAdd.length})`,
      type: 'add_shopping_items',
      items: itemsToAdd,
    });
  }

  actions.push({ label: '📖 Tutte le Ricette', type: 'recipes' });

  return {
    text: out,
    actions,
  };
}

export interface CountryMatchResult {
  country: string;
  countryCode: string;
  flag: string;
  recipes: RecipeCatalogItem[];
}

/**
 * Riconosce query legate a una cucina nazionale o internazionale specifica (es. "ricette giapponesi", "cosa cucino di messicano", "cucina greca")
 */
export function searchRecipesByCountryOrCuisine(query: string, catalog: RecipeCatalogItem[]): CountryMatchResult | null {
  const norm = normalizeItalianText(query);

  const CUISINE_RULES: { country: string; flag: string; code: string; patterns: RegExp[] }[] = [
    {
      country: 'Giappone',
      flag: '🇯🇵',
      code: 'JP',
      patterns: [/giappon/i, /sushi/i, /ramen/i, /teriyaki/i, /gyoza/i, /dorayaki/i, /okonomiyaki/i, /miso/i]
    },
    {
      country: 'Messico',
      flag: '🇲🇽',
      code: 'MX',
      patterns: [/messic/i, /taco/i, /guacamole/i, /quesadilla/i, /enchilada/i, /fajita/i, /chili con carne/i]
    },
    {
      country: 'India',
      flag: '🇮🇳',
      code: 'IN',
      patterns: [/indi/i, /curry/i, /tikka masala/i, /dahl/i, /biryani/i, /samosa/i, /tandoori/i]
    },
    {
      country: 'Grecia',
      flag: '🇬🇷',
      code: 'GR',
      patterns: [/grec/i, /moussaka/i, /souvlaki/i, /tzatziki/i, /spanakopita/i]
    },
    {
      country: 'Spagna',
      flag: '🇪🇸',
      code: 'ES',
      patterns: [/spagn/i, /paella/i, /tortilla de patatas/i, /gazpacho/i, /patatas bravas/i, /crema catalana/i, /tapas/i]
    },
    {
      country: 'USA',
      flag: '🇺🇸',
      code: 'US',
      patterns: [/american/i, /usa/i, /stati uniti/i, /smash burger/i, /cheesecake/i, /pancake/i, /mac (?:&|and) cheese/i, /pulled pork/i, /brownie/i]
    },
    {
      country: 'Francia',
      flag: '🇫🇷',
      code: 'FR',
      patterns: [/frances/i, /quiche/i, /ratatouille/i, /cr[eè]pe/i, /soupe (?:à|a) l'oignon/i, /bourguignon/i]
    },
    {
      country: 'Thailandia',
      flag: '🇹🇭',
      code: 'TH',
      patterns: [/thailand/i, /thai/i, /pad thai/i, /curry verde/i, /tom yum/i]
    },
    {
      country: 'Marocco',
      flag: '🇲🇦',
      code: 'MA',
      patterns: [/marocch/i, /couscous/i, /tajine/i, /harira/i, /pastilla/i]
    },
    {
      country: 'Cina',
      flag: '🇨🇳',
      code: 'CN',
      patterns: [/cines/i, /cantonese/i, /jiaozi/i, /involtini primavera/i, /pollo alle mandorle/i]
    },
    {
      country: 'Libano',
      flag: '🇱🇧',
      code: 'LB',
      patterns: [/liban/i, /hummus/i, /falafel/i, /tabboul/i, /shish taouk/i, /babaganoush/i]
    },
    {
      country: 'Regno Unito',
      flag: '🇬🇧',
      code: 'GB',
      patterns: [/britannic/i, /ingles/i, /fish and chips/i, /shepherd's pie/i]
    },
    {
      country: 'Brasile',
      flag: '🇧🇷',
      code: 'BR',
      patterns: [/brasil/i, /feijoada/i, /p[aã]o de queijo/i]
    },
    {
      country: 'Argentina',
      flag: '🇦🇷',
      code: 'AR',
      patterns: [/argentin/i, /empanada/i, /chimichurri/i]
    },
    {
      country: 'Germania',
      flag: '🇩🇪',
      code: 'DE',
      patterns: [/tedesc/i, /germani/i, /strudel/i]
    },
    {
      country: 'Italia',
      flag: '🇮🇹',
      code: 'IT',
      patterns: [/italian/i, /tradizione italiana/i]
    }
  ];

  // Caso speciale "cucine dal mondo" / "ricette dal mondo" / "internazionale"
  if (/cucin[ae] dal mondo|ricett[ae] dal mondo|cucin[ae] internazional|dal mondo/i.test(norm)) {
    const internationalDishes = catalog.filter(r => r.country && r.country !== 'Italia');
    return {
      country: 'Cucine dal Mondo',
      countryCode: 'WORLD',
      flag: '🌍',
      recipes: internationalDishes.length > 0 ? internationalDishes : catalog.slice(0, 6)
    };
  }

  for (const rule of CUISINE_RULES) {
    if (rule.patterns.some(p => p.test(norm))) {
      const matched = catalog.filter(r => r.country === rule.country || (r.tags && r.tags.includes(rule.country)));
      if (matched.length > 0) {
        return {
          country: rule.country,
          countryCode: rule.code,
          flag: rule.flag,
          recipes: matched
        };
      }
    }
  }

  return null;
}

export function formatCountryRecipesResponse(match: CountryMatchResult): { text: string; actions: any[] } {
  let out = `${match.flag} **Cucina ${match.country === 'Cucine dal Mondo' ? 'dal Mondo' : match.country}**:\n`;
  out += `Ecco una selezione delle migliori ricette autentiche disponibili su Chelona:\n`;

  const topRecipes = match.recipes.slice(0, 4);
  for (const r of topRecipes) {
    out += `\n• **${r.title}** (${r.category})${r.calories ? ` — ~${r.calories} kcal` : ''}`;
  }

  const actions: any[] = topRecipes.map(r => ({
    label: `${r.flag || match.flag} ${r.title}`,
    type: 'recipes',
    recipe: r
  }));

  actions.push({
    label: `🌍 Mostra tutte le Cucine dal Mondo`,
    type: 'recipes',
    category: 'Cucine dal Mondo'
  });

  return { text: out, actions };
}

// ============================================================================
// 8. RESOLVER SEMANTICI MATEMATICI PER TUTTE LE SEZIONI DELL'APP
// ============================================================================

import { RECESSO_PROVIDERS, type Provider } from '../data/recessoProviders';
import { loadDoctorState, computeDoctorStudioStatus, type DoctorState } from './doctorService';

/**
 * Classifica semantica avanzata delle categorie di spesa con radici linguistiche
 */
export function detectExpenseCategorySemantic(desc: string): string {
  const norm = normalizeItalianText(desc);
  if (/farmac|medicin|tachipirin|oki|dottor|visita|sanit|salut|ottic|dentist|analis/i.test(norm)) return 'Salute & Farmacia';
  if (/benzin|diesel|carburant|riforniment|casell|autostrad|telepass|parcheggi|mezz|treno|bigliett/i.test(norm)) return 'Trasporti & Auto';
  if (/conad|coop|lidl|esselung|carrefour|eurospin|spesa|supermercat|alimentar|panetteri|fruttivendol/i.test(norm)) return 'Supermercato & Alimentari';
  if (/ristorant|pizzeri|trattori|bar|caffe|aperitiv|pranz|cena|pub|mcdonald|poke|sushi/i.test(norm)) return 'Ristoranti & Bar';
  if (/bollett|enel|eni|luce|gas|acquedott|tari|affitt|condomini|wifi|fibra|internet/i.test(norm)) return 'Casa & Utenze';
  if (/amazon|vestit|scarpe|zara|shopping|negozi|abbigliament|elettronic/i.test(norm)) return 'Shopping & Abbigliamento';
  if (/cinem|teatr|concerto|museo|palestr|abbonament|sport|svago|netflix|spotify|playstation/i.test(norm)) return 'Svago & Intrattenimento';
  return 'Spesa Generale';
}

export interface ExtractedExpenseResult {
  amount: number;
  description: string;
  category: string;
}

/**
 * Riconosce e analizza matematicamente registrazioni di spese in linguaggio naturale.
 * Es: "ho speso 15 euro in farmacia" -> { amount: 15, description: "Farmacia", category: "Salute & Farmacia" }
 * Es: "ho pagato 45 euro di benzina" -> { amount: 45, description: "Benzina", category: "Trasporti & Auto" }
 */
export function extractExpenseQuery(query: string): ExtractedExpenseResult | null {
  const q = query.trim();

  // Pattern 1: ho speso / spesa di / pagato / costa X euro per/in/a/di...
  const match1 = q.match(/(?:ho\s+(?:speso|pagato|versato)|spesa\s+di|costo\s+di|uscita\s+di|segna\s+spesa\s+di)\s+(?:circa\s+)?(\d+(?:[.,]\d+)?)\s*(?:€|euro)?(?:\s+(?:per|in|a|al|alla|allo|su|di)\s+(.+))?/i);
  if (match1) {
    const amount = parseFloat(match1[1].replace(',', '.'));
    if (!isNaN(amount) && amount > 0) {
      const rawDesc = (match1[2] || 'Spesa').trim();
      const description = rawDesc.charAt(0).toUpperCase() + rawDesc.slice(1);
      return {
        amount,
        description,
        category: detectExpenseCategorySemantic(description),
      };
    }
  }

  // Pattern 2: 15 euro in farmacia / 20€ benzina
  const match2 = q.match(/(\d+(?:[.,]\d+)?)\s*(?:€|euro)\s+(?:per|in|a|al|alla|allo|su|di)\s+(.+)/i);
  if (match2) {
    const amount = parseFloat(match2[1].replace(',', '.'));
    if (!isNaN(amount) && amount > 0) {
      const rawDesc = match2[2].trim();
      const description = rawDesc.charAt(0).toUpperCase() + rawDesc.slice(1);
      return {
        amount,
        description,
        category: detectExpenseCategorySemantic(description),
      };
    }
  }

  return null;
}

export interface ExtractedVehicleResult {
  vehicle?: any;
  deadlineType: 'revisione' | 'bollo' | 'assicurazione' | 'tagliando' | 'gomme' | 'batteria' | 'km' | 'generale';
  isAllVehicles: boolean;
}

/**
 * Risolve query su veicoli, scadenze e manutenzione.
 * Es: "quando devo fare la revisione alla punto?"
 * Es: "quando scade il bollo della golf?"
 */
export function extractVehicleQuery(query: string, vehicles: any[]): ExtractedVehicleResult | null {
  const norm = normalizeItalianText(query);
  if (!norm.includes('auto') && !norm.includes('macchina') && !norm.includes('veicol') &&
      !norm.includes('revision') && !norm.includes('bollo') && !norm.includes('assicuraz') &&
      !norm.includes('tagliand') && !norm.includes('gomm') && !norm.includes('pneumat') &&
      !norm.includes('batteri') && !norm.includes('km') && !norm.includes('chilometr')) {
    return null;
  }

  // Tipo di scadenza
  let deadlineType: ExtractedVehicleResult['deadlineType'] = 'generale';
  if (norm.includes('revision')) deadlineType = 'revisione';
  else if (norm.includes('bollo') || norm.includes('tassa')) deadlineType = 'bollo';
  else if (norm.includes('assicuraz') || norm.includes('polizz') || norm.includes('rca')) deadlineType = 'assicurazione';
  else if (norm.includes('tagliand') || norm.includes('olio')) deadlineType = 'tagliando';
  else if (norm.includes('gomm') || norm.includes('pneumat') || norm.includes('battistrad')) deadlineType = 'gomme';
  else if (norm.includes('batteri')) deadlineType = 'batteria';
  else if (norm.includes('km') || norm.includes('chilometr')) deadlineType = 'km';

  // Trova quale veicolo è citato
  let matchedVehicle = vehicles.length === 1 ? vehicles[0] : undefined;
  if (vehicles.length > 1) {
    for (const v of vehicles) {
      const brand = normalizeItalianText(v.brand || '');
      const model = normalizeItalianText(v.model || '');
      const plate = normalizeItalianText(v.plate || '');
      const name = normalizeItalianText(v.name || '');

      if (
        (model && norm.includes(model)) ||
        (brand && norm.includes(brand)) ||
        (plate && norm.includes(plate)) ||
        (name && norm.includes(name)) ||
        (model && tokenFuzzySimilarity(norm, model) >= 0.85)
      ) {
        matchedVehicle = v;
        break;
      }
    }
  }

  return {
    vehicle: matchedVehicle,
    deadlineType,
    isAllVehicles: !matchedVehicle,
  };
}

export interface ExtractedDocumentResult {
  docType: 'patente' | 'identita' | 'passaporto' | 'tessera_sanitaria' | 'generale';
  matchedDoc?: any;
}

/**
 * Risolve query su documenti personali e scadenze.
 * Es: "quando scade la patente?"
 */
export function extractDocumentQuery(query: string, documents: any[]): ExtractedDocumentResult | null {
  const norm = normalizeItalianText(query);
  let docType: ExtractedDocumentResult['docType'] = 'generale';

  if (norm.includes('patent') || norm.includes('guida')) docType = 'patente';
  else if (norm.includes('identita') || norm.includes('carta identita') || norm.includes('cie')) docType = 'identita';
  else if (norm.includes('passaport')) docType = 'passaporto';
  else if (norm.includes('tessera sanitar') || norm.includes('codice fiscal') || norm.includes('sanitaria')) docType = 'tessera_sanitaria';
  else if (norm.includes('document')) docType = 'generale';
  else return null;

  const matchedDoc = documents.find(d => {
    const title = normalizeItalianText(d.title || d.type || '');
    if (docType === 'patente' && title.includes('patent')) return true;
    if (docType === 'identita' && (title.includes('identit') || title.includes('cie'))) return true;
    if (docType === 'passaporto' && title.includes('passaport')) return true;
    if (docType === 'tessera_sanitaria' && (title.includes('sanitar') || title.includes('fiscale'))) return true;
    return false;
  });

  return { docType, matchedDoc };
}

export interface ExtractedDoctorResult {
  intent: 'status' | 'prescription' | 'contact' | 'info';
  medicineName?: string;
  doctorState: DoctorState;
}

/**
 * Risolve query per lo Studio Medico & Ricette Farmaci.
 * Es: "quando apre lo studio del dottore?"
 * Es: "mi serve la ricetta per la tachipirina"
 */
export function extractDoctorQuery(query: string): ExtractedDoctorResult | null {
  const norm = normalizeItalianText(query);

  // Se la query riguarda chiaramente cucina, cibo, ricette gastronomiche o pasti, NON è una query medica!
  const isCulinaryContext =
    norm.includes('cucin') || norm.includes('mangia') || norm.includes('pranz') ||
    norm.includes('cena') || norm.includes('colazion') || norm.includes('spuntin') ||
    norm.includes('piatt') || norm.includes('ingredient') || norm.includes('igredient') ||
    norm.includes('aliment') || norm.includes('pasta') || norm.includes('second') ||
    norm.includes('dolce') || norm.includes('forno') || norm.includes('padella') ||
    norm.includes('frigo') || norm.includes('ricettario') ||
    norm.includes('torta') || norm.includes('biscott');

  if (isCulinaryContext && !norm.includes('medic') && !norm.includes('dottor') && !norm.includes('farmac')) {
    return null;
  }

  const doctorState = loadDoctorState();
  const commonMeds = ['tachipirina', 'oki', 'aspirina', 'aulin', 'brufen', 'paracetamolo', 'ibuprofene', 'cortisone', 'antibiotico', 'cardioaspirina', 'novalgina', 'gentalyn', 'pantoprazolo', 'voltaren'];
  const hasCommonMed = commonMeds.some(m => norm.includes(m));
  const hasDoctorProfileMed = doctorState.medicines.some(m => norm.includes(normalizeItalianText(m.name)));

  // Contesto medico verificato
  const hasMedicalKeywords =
    norm.includes('medic') || norm.includes('dottor') || norm.includes('studio') ||
    norm.includes('farmac') || norm.includes('medicin') || norm.includes('prescrizion') ||
    norm.includes('ambulatori') || norm.includes('visita') || norm.includes('asl') ||
    norm.includes('mutua') || norm.includes('terapia') || hasCommonMed || hasDoctorProfileMed;

  // "ricetta" da sola è culinaria al 99% a meno che non sia specificata "ricetta medica" o sia in un contesto medico
  const hasMedicalRecipe =
    norm.includes('ricetta medic') || norm.includes('ricetta del medic') ||
    norm.includes('ricetta del dottor') || (norm.includes('ricetta') && hasMedicalKeywords);

  if (!hasMedicalKeywords && !hasMedicalRecipe) return null;

  // Intento 1: Stato orari / apertura
  if (norm.includes('orari') || norm.includes('apert') || norm.includes('chius') || norm.includes('quando apre') || norm.includes('a che ora') || norm.includes('oggi apre')) {
    return { intent: 'status', doctorState };
  }

  // Intento 2: Contatti / telefono / indirizzo
  if (norm.includes('telefon') || norm.includes('numero') || norm.includes('chiam') || norm.includes('indirizz') || norm.includes('dove si trova')) {
    return { intent: 'contact', doctorState };
  }

  // Intento 3: Richiesta ricetta medica o prescrizione farmaco
  if (hasMedicalRecipe || norm.includes('prescriz') || norm.includes('farmac') || norm.includes('medicin')) {
    // Cerca se ha nominato un farmaco specifico del profilo medico
    let medicineName: string | undefined;
    for (const m of doctorState.medicines) {
      if (norm.includes(normalizeItalianText(m.name))) {
        medicineName = m.name;
        break;
      }
    }
    // Farmaci noti da banco comuni
    const commonMeds = ['tachipirina', 'oki', 'aspirina', 'aulin', 'brufen', 'paracetamolo', 'ibuprofene', 'cortisone', 'antibiotico', 'cardioaspirina', 'novalgina', 'gentalyn', 'pantoprazolo', 'voltaren'];
    if (!medicineName) {
      for (const cm of commonMeds) {
        if (norm.includes(cm)) {
          medicineName = cm.charAt(0).toUpperCase() + cm.slice(1);
          break;
        }
      }
    }
    if (!medicineName && (hasMedicalRecipe || norm.includes('prescriz'))) {
      const match = query.match(/(?:per|del|di)\s+([a-zA-Z0-9\s]{3,25})/i);
      if (match && !norm.includes('dottor') && !norm.includes('medic')) {
        const candidate = match[1].trim().toLowerCase();
        // Assicurati che non sia una parola comune o culinaria
        const nonMedWords = ['pranzo', 'cena', 'domani', 'cucinare', 'mangiare', 'fare', 'preparare', 'favore', 'cortesia'];
        if (!nonMedWords.some(w => candidate.includes(w))) {
          medicineName = match[1].trim();
        }
      }
    }
    return { intent: 'prescription', medicineName, doctorState };
  }

  return { intent: 'info', doctorState };
}

export interface ExtractedRecessoResult {
  provider?: Provider;
  intent: 'disdetta' | 'pec' | 'termini' | 'info';
}

/**
 * Risolve richieste di disdette, recessi contrattuali e indirizzi PEC.
 * Es: "voglio disdire vodafone"
 * Es: "qual è la pec di sky?"
 */
export function extractRecessoQuery(query: string): ExtractedRecessoResult | null {
  const norm = normalizeItalianText(query);
  const isRecessoContext =
    norm.includes('disdett') || norm.includes('recess') || norm.includes('disdir') ||
    norm.includes('cancellar') || norm.includes('abbonament') || norm.includes('pec') ||
    norm.includes('fornitor') || norm.includes('contratt');

  if (!isRecessoContext) return null;

  // Cerca il provider corrispondente nel database PEC ufficiale
  let matchedProvider: Provider | undefined;
  for (const p of RECESSO_PROVIDERS) {
    const pName = normalizeItalianText(p.name);
    const pSlug = normalizeItalianText(p.id);
    if (norm.includes(pName) || norm.includes(pSlug) || tokenFuzzySimilarity(norm, pName) >= 0.85) {
      matchedProvider = p;
      break;
    }
  }

  let intent: ExtractedRecessoResult['intent'] = 'disdetta';
  if (norm.includes('pec') || norm.includes('email') || norm.includes('indirizzo')) {
    intent = 'pec';
  } else if (norm.includes('giorni') || norm.includes('preavvis') || norm.includes('ripensament') || norm.includes('14')) {
    intent = 'termini';
  }

  return {
    provider: matchedProvider,
    intent,
  };
}
