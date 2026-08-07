/*
 * Catalogo delle catene di supermercati presenti in Italia, con copertura
 * geografica (regioni + città) usata dal filtro "zona / città" del Volantino.
 *
 * È inclusa l'elenco delle insegne principali: nazionali e i più rilevanti
 * regionali/prossimità. La copertura è indicativa e basata sulla presenza
 * pubblica delle insegne.
 */

export interface ItalianSupermarket {
  id: string;
  label: string;
  short: string;
  /** Colore hex del marchio (usato per il drop del fallback) */
  color: string;
  /** Regioni coperte (o ['Italia'] per cestironi su tutto il Paese) */
  regions: string[];
  /** Principali città coperte */
  cities?: string[];
  /** Sito web ufficiale */
  website?: string;
  /** URL volantino online ufficiale (già verificato quando presente) */
  flyerUrl?: string;
  /** Giorno della settimana in cui la catena pubblica il nuovo volantino (0=domenica … 6=sabato) */
  renewalWeekday?: number;
  /** Logo ufficiale bundle (asset) */
  logo?: string;
  /** Insegna di risparmio / discount */
  discount?: boolean;
  /** Gruppo proprietà */
  group?: string;
  /** Ordine di grandezza punti vendita */
  points?: string;
}

export const ITALIAN_SUPERMARKETS: ItalianSupermarket[] = [
  {
    id: 'esselunga', label: 'Esselunga', short: 'ES', color: '#F37B21', website: 'https://www.esselunga.it/',
    flyerUrl: 'https://www.esselunga.it/it-it/promozioni/volantini.html',
    regions: ['Lombardia', 'Piemonte', 'Liguria', 'Emilia-Romagna', 'Toscana', 'Umbria', 'Lazio', 'Friuli-Venezia Giulia'],
    cities: ['Milano', 'Monza', 'Bergamo', 'Brescia', 'Torino', 'Genova', 'Bologna', 'Parma', 'Modena', 'Ravenna', 'Firenze', 'Pisa', 'Perugia', 'Roma', 'Udine'],
    points: '~200',
  },
  {
    id: 'coop', label: 'Coop', short: 'CC', color: '#E4001B', website: 'https://www.e-coop.it/',
    flyerUrl: 'https://coop.it/le-nostre-promozioni', regions: ['Italia'],
    cities: ['Milano', 'Roma', 'Torino', 'Genova', 'Bologna', 'Firenze', 'Napoli', 'Bari', 'Palermo', 'Catania', 'Cagliari', 'Verona', 'Trieste', 'Parma', 'Padova', 'Reggio Emilia', 'Livorno'],
    points: '1000+',
  },
  {
    id: 'conad', label: 'Conad', short: 'CO', color: '#D71920', website: 'https://www.conad.it/', regions: ['Italia'],
    cities: ['Roma', 'Milano', 'Napoli', 'Torino', 'Bologna', 'Firenze', 'Bari', 'Palermo', 'Genova', 'Verona', 'Parma', 'Pescara', 'Cagliari'],
    points: '3300+',
  },
  {
    id: 'lidl', label: 'Lidl', short: 'LI', color: '#0B4DA2', website: 'https://www.lidl.it/',
    flyerUrl: 'https://www.lidl.it/c/volantino', regions: ['Italia'], discount: true,
    points: '~700',
  },
  {
    id: 'aldi', label: 'Aldi', short: 'AL', color: '#0057A8',
    website: 'https://www.aldi.it/',
    flyerUrl: 'https://www.aldi.it/offerte/volantino', regions: ['Italia'], discount: true, points: '1000+',
  },
  {
    id: 'md', label: 'MD', short: 'MD', color: '#E30613',
    website: 'https://www.mdspa.it/',
    flyerUrl: 'https://www.mdspa.it/volantino/', regions: ['Italia'], discount: true, points: '~900',
  },
  {
    id: 'agora', label: "Agorà", short: 'AG', color: '#7A1FA2',
    website: 'https://www.gruppovege.it/',
    regions: ['Italia'], discount: true,
    group: 'Agorà Network (Végé)', points: '~1800',
  },
  {
    id: 'eurospin', label: 'Eurospin', short: 'EU', color: '#00923F',
    website: 'https://www.eurospin.it/',
    flyerUrl: 'https://www.eurospin.it/volantino/', regions: ['Italia'], discount: true, points: '1100+',
  },
  {
    id: 'carrefour', label: 'Carrefour', short: 'CA', color: '#003399', website: 'https://www.carrefour.it/',
    flyerUrl: 'https://www.carrefour.it/volantini/', regions: ['Italia'],
    points: '1300+',
  },
{
    id: 'todis', label: 'Todis', short: 'TD', color: '#E5001B',
    logo: '/logos/todis.svg', website: 'https://www.todis.it/', regions: ['Italia'],
    flyerUrl: 'https://www.todis.it/volantini/', discount: true, points: '~350',
  },
  {
    id: 'crai', label: 'Craï', short: 'CR', color: '#EB1C49',
    website: 'https://crai.it/',
    flyerUrl: 'https://crai.it/negozi-e-volantini', regions: ['Italia'], points: '2500+',
  },
  {
    id: 'penny', label: 'Penny Market', short: 'PM', color: '#0050AA', website: 'https://www.penny.it/',
    flyerUrl: 'https://www.penny.it/volantino', regions: ['Italia'], discount: true, points: '~400',
  },
  {
    id: 'sigma', label: 'Sigma', short: 'SG', color: '#0057A8',
    website: 'https://www.sigma-italia.it/',
    regions: ['Piemonte', 'Lombardia', 'Liguria', "Valle d'Aosta"],
    cities: ['Torino', 'Alessandria', 'Novara', 'Cuneo', 'Milano', 'Monza', 'Varese', 'Brescia', 'Bergamo', 'Como', 'Genova', 'Savona', 'Imperia', 'Aosta'],
    group: 'Consorzio Sigma', points: '~400',
  },
  {
    id: 'pampanorama', label: 'PAM Panorama', short: 'PA', color: '#E4001B',
    website: 'https://www.pampanorama.it/',
    flyerUrl: 'https://www.pampanorama.it/volantino',
    regions: ['Veneto', 'Friuli-Venezia Giulia', 'Trentino-Alto Adige', 'Emilia-Romagna', 'Lombardia', 'Lazio', 'Abruzzo'],
    cities: ['Venezia', 'Padova', 'Treviso', 'Verona', 'Udine', 'Trieste', 'Trento', 'Bologna', 'Parma', 'Roma', 'Pescara'],
    group: 'Gruppo Pam', points: '~550',
  },
  {
    id: 'tigre', label: 'Tigre', short: 'TI', color: '#FFB81C',
    website: 'https://www.e-tigre.it/',
    flyerUrl: 'https://www.e-tigre.it/volantino',
    regions: ['Lazio', 'Umbria', 'Marche', 'Abruzzo', 'Molise'],
    cities: ['Roma', 'Viterbo', 'Frosinone', 'Latina', 'Rieti', 'Tivoli', 'Perugia', 'Terni', 'Ancona', 'Pesaro', 'Macerata', 'Ascoli Piceno', "L'Aquila", 'Pescara', 'Chieti', 'Teramo', 'Campobasso'],
    discount: true, group: 'LiberaMente', points: '~130',
  },
  {
    id: 'gros', label: 'Gros', short: 'GR', color: '#009A44',
    website: 'https://www.gruppogros.com/',
    regions: ['Piemonte', 'Liguria', "Valle d'Aosta"],
    cities: ['Cuneo', 'Alessandria', 'Asti', 'Torino', 'Genova', 'Savona', 'Imperia', 'Sanremo', 'Aosta'],
    group: 'Végé', points: '~100',
  },
  {
    id: 'ipergros', label: 'IperGros', short: 'IG', color: '#86B817',
    website: 'https://www.gruppogros.com/',
    regions: ['Piemonte', 'Liguria'],
    cities: ['Cuneo', 'Torino', 'Asti', 'Savona', 'Imperia', 'Genova', 'Sanremo'],
    group: 'Végé', points: '~30',
  },
  {
    id: 'tomarket', label: 'ToMarket', short: 'TM', color: '#E8B81C',
    website: 'https://www.gruppogros.com/',
    regions: ['Piemonte'],
    cities: ['Torino', 'Cuneo', 'Alessandria', 'Asti'],
    group: 'Végé', points: '~30',
  },
  {
    id: 'megamarket', label: 'Megamarket', short: 'MM', color: '#C026D3',
    website: 'https://www.gruppovege.it/',
    regions: ['Sardegna'],
    cities: ['Cagliari', 'Sassari', 'Olbia', 'Oristano', 'Nuoro'],
    discount: true, group: 'Végé', points: '~25',
  },
  {
    id: 'familycenter', label: 'Family Center', short: 'FC', color: '#EC4899',
    website: 'https://www.gruppovege.it/',
    regions: ['Sardegna'],
    cities: ['Cagliari', 'Sassari', 'Olbia', 'Oristano', 'Nuoro'],
    group: 'Végé', points: '~30',
  },
  {
    id: 'bennet', label: 'Bennet', short: 'BN', color: '#7B2C8E',
    website: 'https://www.bennet.com/',
    flyerUrl: 'https://www.bennet.com/flyer',
    regions: ['Lombardia', 'Piemonte', 'Veneto', 'Emilia-Romagna', 'Friuli-Venezia Giulia'],
    cities: ['Milano', 'Monza', 'Como', 'Varese', 'Novara', 'Torino', 'Alessandria', 'Venezia', 'Verona', 'Bologna', 'Reggio Emilia', 'Parma', 'Modena', 'Udine', 'Pordenone', 'Genova'],
    group: 'Selex', points: '~80',
  },
  {
    id: 'iperal', label: 'Iperal', short: 'IP', color: '#007A3D', website: 'https://www.iperal.it/',
    flyerUrl: 'https://www.iperal.it/volantino/',
    regions: ['Lombardia', 'Veneto'],
    cities: ['Brescia', 'Bergamo', 'Milano', 'Monza', 'Como', 'Varese', 'Lecco', 'Cremona', 'Lodi', 'Mantova', 'Verona', 'Piacenza'],
    group: 'Adda Supermercati', points: '~180',
  },
  {
    id: 'unes', label: 'Unes', short: 'UN', color: '#E4001B',
    website: 'https://www.unes.it/',
    flyerUrl: 'https://www.unes.it/it/volantino',
    regions: ['Lombardia'],
    cities: ['Milano', 'Como', 'Varese', 'Pavia', 'Lecco', 'Lodi', 'Monza', 'Bergamo', 'Brescia'],
    group: 'Selex', points: '~160',
  },
  {
    id: 'ilgigante', label: 'Il Gigante', short: 'GI', color: '#F26522',
    website: 'https://ilgigante.net/',
    flyerUrl: 'https://ilgigante.net/volantini/',
    regions: ['Lombardia'],
    cities: ['Milano', 'Monza', 'Brescia', 'Bergamo', 'Como', 'Varese'],
    group: 'Sigma Lombardia', points: '~30',
  },
  {
    id: 'cadoro', label: 'Cadoro', short: 'CD', color: '#F5A623', website: 'https://www.cadoro.it/',
    flyerUrl: 'https://www.cadoro.it/promozioni/',
    regions: ['Lazio', 'Umbria', 'Abruzzo', 'Molise'],
    cities: ['Roma', 'Viterbo', 'Frosinone', 'Rieti', 'Latina', 'Terni', 'Perugia', "L'Aquila", 'Teramo', 'Pescara', 'Campobasso'],
    points: '~100',
  },
  {
    id: 'famila', label: 'Famila', short: 'FA', color: '#0057A8', website: 'https://www.famila.it/',
    flyerUrl: 'https://www.famila.it/faq/faq-famila-nazionale/promo-volantini',
    regions: ['Veneto', 'Emilia-Romagna', 'Piemonte', 'Lombardia', 'Toscana', 'Lazio'],
    cities: ['Venezia', 'Padova', 'Treviso', 'Verona', 'Trieste', 'Udine', 'Bologna', 'Modena', 'Ferrara', 'Ravenna', 'Torino', 'Novara', 'Milano', 'Firenze', 'Pisa', 'Roma'],
    group: 'Selex', points: '~200',
  },
  {
    id: 'sisa', label: 'Sisa', short: 'SI', color: '#E4001B',
    website: 'https://www.supersisa.com/',
    flyerUrl: 'https://www.supersisa.com/volantini/',
    regions: ['Marche', 'Abruzzo', 'Molise', 'Umbria', 'Toscana', 'Lazio'],
    cities: ['Ancona', 'Pesaro', 'Ascoli Piceno', 'Macerata', "L'Aquila", 'Pescara', 'Chieti', 'Teramo', 'Perugia', 'Firenze', 'Arezzo', 'Roma'],
    group: 'Consorzio Sisa', points: '~150',
  },
  {
    id: 'basar', label: 'Basar', short: 'BS', color: '#00843D',
    website: 'https://www.basar.it/',
    flyerUrl: 'https://www.basar.it/volantino',
    regions: ['Lazio'],
    cities: ['Roma', 'Viterbo', 'Frosinone', 'Latina', 'Rieti', 'Civitavecchia'],
    points: '~130',
  },
  {
    id: 'smeraldo', label: 'Punto Smeraldo', short: 'PS', color: '#0A9B44',
    website: 'https://www.puntosmeraldo.it/',
    flyerUrl: 'https://www.puntosmeraldo.it/volantino',
    regions: ['Sardegna'],
    cities: ['Cagliari', 'Sassari', 'Olbia', 'Oristano', 'Nuoro'],
    points: '~45',
  },
  {
    id: 'dambros', label: "D'Ambros", short: 'DA', color: '#0072BC',
    website: 'https://www.dambros.it/',
    flyerUrl: 'https://www.dambros.it/volantino',
    regions: ['Puglia', 'Campania'],
    cities: ['Bari', 'Foggia', 'Taranto', 'Barletta', 'Napoli', 'Salerno', 'Caserta'],
    points: '~60',
  },
  {
    id: 'ali', label: 'Alì', short: 'AL', color: '#E4001B',
    website: 'https://www.gruppoali.it/',
    flyerUrl: 'https://www.gruppoali.it/volantino',
    regions: ['Veneto'],
    cities: ['Padova', 'Venezia', 'Treviso', 'Verona', 'Vicenza', 'Rovigo', 'Belluno'],
    group: 'Alì – Italia', points: '~150',
  },
  {
    id: 'diperdi', label: 'Dì per Dì', short: 'DD', color: '#F5A800',
    website: 'https://www.gruppovege.it/',
    regions: ['Veneto', 'Friuli-Venezia Giulia', 'Trentino-Alto Adige', 'Emilia-Romagna'],
    cities: ['Venezia', 'Padova', 'Treviso', 'Verona', 'Udine', 'Pordenone', 'Trento', 'Rovereto', 'Bologna', 'Modena'],
    discount: true, group: 'Végé', points: '~60',
  },
{
    id: 'despar', label: 'Despar', short: 'DE', color: '#E4001B',
    logo: '/logos/despar.png', website: 'https://www.despar.it/',
    flyerUrl: 'https://www.despar.it/it/offerte-per-te/', regions: ['Italia'], discount: false,
    group: 'Despar Italia', points: '~700',
  },
  {
    id: 'migross', label: 'Migross', short: 'MG', color: '#009A1C',
    website: 'https://www.migross.it/',
    flyerUrl: 'https://www.migross.it/volantino',
    regions: ['Trentino-Alto Adige', 'Veneto', 'Friuli-Venezia Giulia'],
    cities: ['Trento', 'Rovereto', 'Bolzano', 'Merano', 'Verona', 'Treviso', 'Venezia', 'Pordenone', 'Udine'],
    group: 'Migross Supermercati', points: '~50',
  },
  {
    id: 'italmark', label: 'Italmark', short: 'IT', color: '#E4001B',
    website: 'https://www.italmark.it/',
    flyerUrl: 'https://www.italmark.it/volantino',
    regions: ['Lombardia', 'Veneto'],
    cities: ['Brescia', 'Verona', 'Sondrio', 'Mantova', 'Cremona', 'Bergamo'],
    points: '~110',
  },
  {
    id: 'insmercato', label: "IN'S Mercato", short: 'IN', color: '#E30613',
    website: 'https://www.insmercato.it/',
    flyerUrl: 'https://www.insmercato.it/volantino/',
    regions: ['Lombardia', 'Emilia-Romagna', 'Piemonte', 'Veneto', 'Puglia', 'Calabria', 'Sicilia'],
    cities: ['Milano', 'Monza', 'Bergamo', 'Brescia', 'Cremona', 'Mantova', 'Lodi', 'Pavia', 'Bologna', 'Parma', 'Modena', 'Torino', 'Genova', 'Verona', 'Bari', 'Taranto', 'Catanzaro', 'Reggio Calabria', 'Palermo', 'Catania'],
    discount: true, group: 'Selex', points: '~900',
  },
  {
    id: 'sidis', label: 'Sidis', short: 'SD', color: '#E4001B',
    website: 'https://www.sidis.sa.it/',
    flyerUrl: 'https://www.sidis.sa.it/volantino/',
    regions: ['Campania', 'Puglia', 'Sicilia'],
    cities: ['Napoli', 'Salerno', 'Caserta', 'Bari', 'Foggia', 'Palermo', 'Messina'],
    points: '~150',
  },
  {
    id: 'pewex', label: 'Pewex', short: 'PX', color: '#0055A5',
    website: 'https://www.pewex-supermercati.it/',
    flyerUrl: 'https://www.pewex-supermercati.it/promozioni/volantini/pewex/volantino-pewex',
    regions: ['Lombardia', 'Piemonte'],
    cities: ['Milano', 'Monza', 'Bergamo', 'Brescia', 'Cremona', 'Lodi', 'Pavia', 'Varese', 'Como', 'Novara'],
    discount: true, points: '~120',
  },
];

export const ITALIAN_REGIONS: string[] = [
  'Lombardia', 'Piemonte', 'Liguria', "Valle d'Aosta", 'Emilia-Romagna', 'Veneto',
  'Trentino-Alto Adige', 'Friuli-Venezia Giulia', 'Toscana', 'Umbria', 'Marche',
  'Abruzzo', 'Molise', 'Campania', 'Puglia', 'Basilicata', 'Calabria',
  'Sicilia', 'Sardegna', 'Lazio',
];

/** Mappa città → regione per le principali città italiane. */
export const CITY_REGIONS: Record<string, string> = {
  Roma: 'Lazio', 'Fiumicino': 'Lazio', 'Viterbo': 'Lazio', 'Frosinone': 'Lazio', 'Rieti': 'Lazio', 'Latina': 'Lazio', 'Civita Castellana': 'Lazio', 'Tivoli': 'Lazio',
  Milano: 'Lombardia', Monza: 'Lombardia', Bergamo: 'Lombardia', Brescia: 'Lombardia', Como: 'Lombardia', Varese: 'Lombardia', Pavia: 'Lombardia', Lecco: 'Lombardia', Lodi: 'Lombardia', Sondrio: 'Lombardia', Cremona: 'Lombardia', Mantova: 'Lombardia', Gallarate: 'Lombardia', 'Sesto San Giovanni': 'Lombardia', 'Busto Arsizio': 'Lombardia', Rho: 'Lombardia', Legnano: 'Lombardia', 'Cologno Monzese': 'Lombardia',
  Torino: 'Piemonte', Novara: 'Piemonte', Alessandria: 'Piemonte', Cuneo: 'Piemonte', Asti: 'Piemonte', Biella: 'Piemonte', Vercelli: 'Piemonte', Verbania: 'Piemonte', Moncalieri: 'Piemonte', Rivoli: 'Piemonte',
  Napoli: 'Campania', Salerno: 'Campania', Caserta: 'Campania', Avellino: 'Campania', Benevento: 'Campania', 'Giugliano in Campania': 'Campania', 'Torre del Greco': 'Campania', Pozzuoli: 'Campania',
  Palermo: 'Sicilia', Catania: 'Sicilia', Messina: 'Sicilia', Siracusa: 'Sicilia', Agrigento: 'Sicilia', Trapani: 'Sicilia', Ragusa: 'Sicilia', Caltanissetta: 'Sicilia', Enna: 'Sicilia', Marsala: 'Sicilia', Gela: 'Sicilia', Modica: 'Sicilia',
  Genova: 'Liguria', 'La Spezia': 'Liguria', Savona: 'Liguria', Imperia: 'Liguria', Sanremo: 'Liguria', 'Chiavari': 'Liguria',
  Bologna: 'Emilia-Romagna', Parma: 'Emilia-Romagna', Modena: 'Emilia-Romagna', 'Reggio Emilia': 'Emilia-Romagna', Ravenna: 'Emilia-Romagna', Rimini: 'Emilia-Romagna', Piacenza: 'Emilia-Romagna', Ferrara: 'Emilia-Romagna', Forli: 'Emilia-Romagna', Cesena: 'Emilia-Romagna', Carpi: 'Emilia-Romagna', Imola: 'Emilia-Romagna', Sassuolo: 'Emilia-Romagna',
  Venezia: 'Veneto', Verona: 'Veneto', Padova: 'Veneto', Vicenza: 'Veneto', Treviso: 'Veneto', Rovigo: 'Veneto', Belluno: 'Veneto', Mestre: 'Veneto', 'Castelfranco Veneto': 'Veneto',
  Bari: 'Puglia', Taranto: 'Puglia', Foggia: 'Puglia', Lecce: 'Puglia', Brindisi: 'Puglia', Barletta: 'Puglia', Andria: 'Puglia', Trani: 'Puglia', Monopoli: 'Puglia',
  Firenze: 'Toscana', Pisa: 'Toscana', Livorno: 'Toscana', Prato: 'Toscana', Arezzo: 'Toscana', Grosseto: 'Toscana', Siena: 'Toscana', Lucca: 'Toscana', Pistoia: 'Toscana', Massa: 'Toscana',
  Perugia: 'Umbria', Terni: 'Umbria', Foligno: 'Umbria', Gubbio: 'Umbria', 'Città di Castello': 'Umbria',
  "L'Aquila": 'Abruzzo', Pescara: 'Abruzzo', Chieti: 'Abruzzo', Teramo: 'Abruzzo', Avezzano: 'Abruzzo', Sulmona: 'Abruzzo',
  Campobasso: 'Molise', Isernia: 'Molise', Termoli: 'Molise',
  Potenza: 'Basilicata', Matera: 'Basilicata',
  Catanzaro: 'Calabria', 'Reggio Calabria': 'Calabria', Cosenza: 'Calabria', Crotone: 'Calabria', 'Vibo Valentia': 'Calabria', 'Lamezia Terme': 'Calabria',
  Trento: 'Trentino-Alto Adige', Bolzano: 'Trentino-Alto Adige', Rovereto: 'Trentino-Alto Adige', Merano: 'Trentino-Alto Adige', Bressanone: 'Trentino-Alto Adige',
  Trieste: 'Friuli-Venezia Giulia', Udine: 'Friuli-Venezia Giulia', Pordenone: 'Friuli-Venezia Giulia', Gorizia: 'Friuli-Venezia Giulia', Monfalcone: 'Friuli-Venezia Giulia',
  Cagliari: 'Sardegna', Sassari: 'Sardegna', Olbia: 'Sardegna', Oristano: 'Sardegna', Nuoro: 'Sardegna', Iglesias: 'Sardegna', "Quartu Sant'Elena": 'Sardegna', 'Carbonia': 'Sardegna',
  Aosta: "Valle d'Aosta", Courmayeur: "Valle d'Aosta", 'Saint-Vincent': "Valle d'Aosta",
};

const normCache = new Map<string, string>();
function norm(s: string): string {
  const k = s.toLowerCase();
  let r = normCache.get(k);
  if (r) return r;
  r = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, '').trim();
  normCache.set(k, r);
  return r;
}

/** Regione della città, se riconosciuta (match esatto). */
export function cityRegion(city: string): string | undefined {
  if (!city) return undefined;
  return CITY_REGIONS[city.trim()] ?? CITY_REGIONS[city.trim().replace(/[’']/g, '')];
}

/** La query è il nome di una regione (con estensioni tipo "Norditalia"? solo regioni). */
export function isRegionName(query: string): boolean {
  const n = norm(query.trim());
  if (!n) return false;
  return ITALIAN_REGIONS.some(r => norm(r) === n);
}

/** Suggerimenti di aree (regioni e città) per l'autocomplete. */
export function suggestZones(query: string, limit = 8): string[] {
  const n = norm(query.trim());
  if (!n) return [];
  const cities = Object.keys(CITY_REGIONS).filter(c => norm(c).startsWith(n));
  const regions = ITALIAN_REGIONS.filter(r => norm(r).startsWith(n) || norm(r).includes(n));
  return [...new Set([...regions, ...cities])].slice(0, limit);
}

/** Filtra le catene per zona (regione o città). */
export function supermarketsForZone(zone: string): ItalianSupermarket[] {
  if (!zone || !zone.trim()) return [...ITALIAN_SUPERMARKETS];
  const z = zone.trim();
  const reg = cityRegion(z) ?? (isRegionName(z) ? ITALIAN_REGIONS.find(r => norm(r) === norm(z)) : undefined);
  const zn = norm(z);
  return ITALIAN_SUPERMARKETS.filter(s => {
    if (s.regions.includes('Italia')) return true;
    if (reg) return s.regions.some(r => norm(r) === norm(reg));
    return s.cities?.some(c => norm(c) === zn);
  });
}

export function supermarketById(id: string): ItalianSupermarket | undefined {
  return ITALIAN_SUPERMARKETS.find(s => s.id === id);
}