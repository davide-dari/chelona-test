import React, { useState, useMemo } from 'react';
import { 
  Bus, MapPin, Navigation, ExternalLink, Info, Compass, 
  ArrowLeftRight, Search, Clock, DollarSign, Download, Map, HelpCircle,
  Star
} from 'lucide-react';


// Interfaccia Fermata e Corsa
export interface MetroStation {
  id: string;
  nameIt: string;
  nameEl: string;
  lat: number;
  lng: number;
  lines: number[];
  attractions?: string[];
  isTransfer?: boolean;
}

// 1. MASTER LIST STATIONS CON COORDINATE REALI
export const ATHENS_STATIONS: Record<string, MetroStation> = {
  // Linea 1 (Verde)
  piraeus: { id: 'piraeus', nameIt: 'Pireo (Porto)', nameEl: 'Πειραιάς', lat: 37.9482, lng: 23.6425, lines: [1, 3], isTransfer: true, attractions: ['Porto di Atene (Traghetti per le isole)', 'Museo Archeologico del Pireo', 'Museo della Ferrovia'] },
  faliro: { id: 'faliro', nameIt: 'Faliro', nameEl: 'Φάληρο', lat: 37.9442, lng: 23.6661, lines: [1], attractions: ['Stadio Karaiskakis (Olympiacos)', 'Collegamento Tram per le spiagge e la costa'] },
  moschato: { id: 'moschato', nameIt: 'Moschato', nameEl: 'Μοσχάτο', lat: 37.9548, lng: 23.6798, lines: [1] },
  kallithea: { id: 'kallithea', nameIt: 'Kallithea', nameEl: 'Καλλιθέα', lat: 37.9622, lng: 23.6980, lines: [1] },
  tavros: { id: 'tavros', nameIt: 'Tavros', nameEl: 'Ταύρος', lat: 37.9685, lng: 23.7077, lines: [1] },
  petralona: { id: 'petralona', nameIt: 'Petralona', nameEl: 'Πετράλωνα', lat: 37.9683, lng: 23.7153, lines: [1], attractions: ['Quartiere residenziale tipico', 'Collina di Filopappo (accesso ovest)'] },
  thissio: { id: 'thissio', nameIt: 'Thissio', nameEl: 'Θησείο', lat: 37.9768, lng: 23.7206, lines: [1], attractions: ['Tempio di Efesto', 'Passeggiata pedonale sotto l\'Acropoli Apostolou Pavlou', 'Antica Agorà'] },
  monastiraki: { id: 'monastiraki', nameIt: 'Monastiraki', nameEl: 'Μοναστηράκι', lat: 37.9761, lng: 23.7257, lines: [1, 3], isTransfer: true, attractions: ['Mercato delle Pulci', 'Piazza Monastiraki', 'Biblioteca di Adriano', 'Antica Agorà', 'Stoa di Attalo'] },
  omonia: { id: 'omonia', nameIt: 'Omonia', nameEl: 'Ομόνοια', lat: 37.9842, lng: 23.7282, lines: [1, 2], isTransfer: true, attractions: ['Piazza Omonia (Fontana monumentale)', 'Mercato Centrale di Atene (Varvakios)', 'Punti di ristoro storici'] },
  victoria: { id: 'victoria', nameIt: 'Victoria', nameEl: 'Βικτώρια', lat: 37.9902, lng: 23.7301, lines: [1], attractions: ['Museo Archeologico Nazionale (10 min a piedi)', 'Piazza Victoria'] },
  attiki: { id: 'attiki', nameIt: 'Attiki', nameEl: 'Αττική', lat: 37.9992, lng: 23.7226, lines: [1, 2], isTransfer: true },
  agios_nikolaos: { id: 'agios_nikolaos', nameIt: 'Agios Nikolaos', nameEl: 'Άγιος Νικόλαος', lat: 38.0069, lng: 23.7277, lines: [1] },
  kato_patisia: { id: 'kato_patisia', nameIt: 'Kato Patisia', nameEl: 'Κάτω Πατήσια', lat: 38.0125, lng: 23.7287, lines: [1] },
  agios_eleftherios: { id: 'agios_eleftherios', nameIt: 'Agios Eleftherios', nameEl: 'Άγιος Ελευθέριος', lat: 38.0203, lng: 23.7317, lines: [1] },
  ano_patisia: { id: 'ano_patisia', nameIt: 'Ano Patisia', nameEl: 'Άνω Πατήσια', lat: 38.0261, lng: 23.7345, lines: [1] },
  perissos: { id: 'perissos', nameIt: 'Perissos', nameEl: 'Περισσός', lat: 38.0328, lng: 23.7447, lines: [1] },
  pefkakia: { id: 'pefkakia', nameIt: 'Pefkakia', nameEl: 'Πευκάκια', lat: 38.0401, lng: 23.7511, lines: [1] },
  nea_ionia: { id: 'nea_ionia', nameIt: 'Nea Ionia', nameEl: 'Νέα Ιωνία', lat: 38.0442, lng: 23.7554, lines: [1] },
  irakleio: { id: 'irakleio', nameIt: 'Irakleio', nameEl: 'Ηράκλειο', lat: 38.0463, lng: 23.7661, lines: [1] },
  eirini: { id: 'eirini', nameIt: 'Eirini (Stadio Olimpico)', nameEl: 'Ειρήνη', lat: 38.0435, lng: 23.7831, lines: [1], attractions: ['OAKA Complesso Olimpico', 'Stadio Olimpico di Atene', 'Mall di Atene'] },
  neratziotissa: { id: 'neratziotissa', nameIt: 'Neratziotissa', nameEl: 'Νερατζιώτισσα', lat: 38.0453, lng: 23.7932, lines: [1], attractions: ['Interscambio con la Ferrovia Suburbana (Proastiakos)'] },
  marousi: { id: 'marousi', nameIt: 'Marousi', nameEl: 'Μαρούσι', lat: 38.0560, lng: 23.8048, lines: [1] },
  kat: { id: 'kat', nameIt: 'KAT', nameEl: 'ΚΑΤ', lat: 38.0642, lng: 23.8066, lines: [1] },
  kifisia: { id: 'kifisia', nameIt: 'Kifisia', nameEl: 'Κηφισιά', lat: 38.0739, lng: 23.8105, lines: [1], attractions: ['Elegante quartiere residenziale del nord', 'Museo di Storia Naturale Goulandris', 'Shopping d\'alta moda'] },

  // Linea 2 (Rossa)
  anthoupoli: { id: 'anthoupoli', nameIt: 'Anthoupoli', nameEl: 'Ανθούπολη', lat: 38.0163, lng: 23.6898, lines: [2] },
  peristeri: { id: 'peristeri', nameIt: 'Peristeri', nameEl: 'Περιστέρι', lat: 38.0125, lng: 23.6975, lines: [2] },
  agios_antonios: { id: 'agios_antonios', nameIt: 'Agios Antonios', nameEl: 'Άγιος Αντώνιος', lat: 38.0065, lng: 23.7032, lines: [2] },
  sepolia: { id: 'sepolia', nameIt: 'Sepolia', nameEl: 'Σεπόλια', lat: 38.0025, lng: 23.7142, lines: [2], attractions: ['Campo da basket di Giannis Antetokounmpo'] },
  larissa_station: { id: 'larissa_station', nameIt: 'Stazione Larissa (FS)', nameEl: 'Σταθμός Λαρίσης', lat: 37.9926, lng: 23.7203, lines: [2], attractions: ['Stazione Ferroviaria Centrale di Atene (Treni per Salonicco, Meteora, ecc.)'] },
  metaxourgeio: { id: 'metaxourgeio', nameIt: 'Metaxourgeio', nameEl: 'Μεταξουργείο', lat: 37.9861, lng: 23.7207, lines: [2], attractions: ['Galleria Municipale di Atene', 'Quartiere alla moda con teatri e ristoranti'] },
  panepistimio: { id: 'panepistimio', nameIt: 'Panepistimio', nameEl: 'Πανεπιστήμιο', lat: 37.9802, lng: 23.7329, lines: [2], attractions: ['Trilogia di Atene (Accademia, Università, Biblioteca Nazionale)', 'Piazza Korai'] },
  syntagma: { id: 'syntagma', nameIt: 'Syntagma (Piazza Costituzione)', nameEl: 'Σύνταγμα', lat: 37.9756, lng: 23.7352, lines: [2, 3], isTransfer: true, attractions: ['Piazza Syntagma', 'Hellenic Parliament (Cambio della Guardia)', 'Giardini Nazionali', 'Via Ermou (Shopping)'] },
  akropoli: { id: 'akropoli', nameIt: 'Acropoli', nameEl: 'Ακρόπολη', lat: 37.9686, lng: 23.7299, lines: [2], attractions: ['Partenone e Acropoli di Atene', 'Nuovo Museo dell\'Acropoli', 'Quartiere Plaka', 'Odeon di Erode Attico'] },
  syngrou_fix: { id: 'syngrou_fix', nameIt: 'Syngrou-Fix', nameEl: 'Συγγρού-Φιξ', lat: 37.9645, lng: 23.7266, lines: [2], attractions: ['EMST Museo Nazionale d\'Arte Contemporanea', 'Quartiere Koukaki'] },
  neos_kosmos: { id: 'neos_kosmos', nameIt: 'Neos Kosmos', nameEl: 'Νέος Κόσμος', lat: 37.9578, lng: 23.7285, lines: [2] },
  agios_ioannis: { id: 'agios_ioannis', nameIt: 'Agios Ioannis', nameEl: 'Άγιος Ιωάννης', lat: 37.9562, lng: 23.7371, lines: [2] },
  dafni: { id: 'dafni', nameIt: 'Dafni', nameEl: 'Δάφνη', lat: 37.9501, lng: 23.7410, lines: [2] },
  agios_dimitrios: { id: 'agios_dimitrios', nameIt: 'Agios Dimitrios', nameEl: 'Άγιος Δημήτριος', lat: 37.9405, lng: 23.7408, lines: [2] },
  ilioupoli: { id: 'ilioupoli', nameIt: 'Ilioupoli', nameEl: 'Ηλιούπολη', lat: 37.9304, lng: 23.7431, lines: [2] },
  alimos: { id: 'alimos', nameIt: 'Alimos', nameEl: 'Άλιμος', lat: 37.9184, lng: 23.7412, lines: [2] },
  argyroupoli: { id: 'argyroupoli', nameIt: 'Argyroupoli', nameEl: 'Αργυρούπολη', lat: 37.9042, lng: 23.7420, lines: [2] },
  elliniko: { id: 'elliniko', nameIt: 'Elliniko', nameEl: 'Ελληνικό', lat: 37.8922, lng: 23.7417, lines: [2], attractions: ['Area dell\'ex aeroporto di Atene', 'Parco Metropolitano Ellinikon'] },

  // Linea 3 (Blu)
  dimotiko_theatro: { id: 'dimotiko_theatro', nameIt: 'Teatro Municipale', nameEl: 'Δημοτικό Θέατρο', lat: 37.9427, lng: 23.6468, lines: [3], attractions: ['Teatro Municipale del Pireo', 'Piazza Korai'] },
  maniatika: { id: 'maniatika', nameIt: 'Maniatika', nameEl: 'Μανιάτικα', lat: 37.9592, lng: 23.6438, lines: [3] },
  nikaia: { id: 'nikaia', nameIt: 'Nikaia', nameEl: 'Νίκαια', lat: 37.9660, lng: 23.6473, lines: [3] },
  korydallos: { id: 'korydallos', nameIt: 'Korydallos', nameEl: 'Κορυδαλλός', lat: 37.9769, lng: 23.6521, lines: [3] },
  agia_varvara: { id: 'agia_varvara', nameIt: 'Agia Varvara', nameEl: 'Αγία Βαρβάρα', lat: 37.9839, lng: 23.6599, lines: [3] },
  agia_marina: { id: 'agia_marina', nameIt: 'Agia Marina', nameEl: 'Αγία Μαρίνα', lat: 37.9892, lng: 23.6766, lines: [3] },
  egaleo: { id: 'egaleo', nameIt: 'Egaleo', nameEl: 'Αιγάλεω', lat: 37.9872, lng: 23.6819, lines: [3], attractions: ['Parco Baroutadiko'] },
  eleonas: { id: 'eleonas', nameIt: 'Eleonas', nameEl: 'Ελαιώνας', lat: 37.9877, lng: 23.6989, lines: [3] },
  kerameikos: { id: 'kerameikos', nameIt: 'Kerameikos (Gazi)', nameEl: 'Κεραμεικός', lat: 37.9785, lng: 23.7113, lines: [3], attractions: ['Area archeologica del Ceramico', 'Quartiere Gazi (Club, discoteche, ristoranti)', 'Technopolis (Eventi e concerti)'] },
  evangelismos: { id: 'evangelismos', nameIt: 'Evangelismos', nameEl: 'Ευαγγελισμός', lat: 37.9760, lng: 23.7465, lines: [3], attractions: ['Galleria d\'Arte Nazionale', 'Museo Bizantino e Cristiano', 'Museo della Guerra', 'Collina del Licabetto (funicolare a 10 min)'] },
  megaro_moussikis: { id: 'megaro_moussikis', nameIt: 'Megaro Moussikis', nameEl: 'Μέγαρο Μουσικής', lat: 37.9785, lng: 23.7548, lines: [3], attractions: ['Athens Concert Hall (Megaron)', 'Ambasciata USA'] },
  ambelokipi: { id: 'ambelokipi', nameIt: 'Ambelokipi', nameEl: 'Αμπελόκηποι', lat: 37.9871, lng: 23.7663, lines: [3] },
  panormou: { id: 'panormou', nameIt: 'Panormou', nameEl: 'Πανόρμου', lat: 37.9926, lng: 23.7728, lines: [3] },
  katehaki: { id: 'katehaki', nameIt: 'Katehaki', nameEl: 'Κατεχάκη', lat: 37.9793, lng: 23.7760, lines: [3] },
  ethniki_amyna: { id: 'ethniki_amyna', nameIt: 'Ethniki Amyna', nameEl: 'Εθνική Άμυνα', lat: 37.9995, lng: 23.7845, lines: [3] },
  holargos: { id: 'holargos', nameIt: 'Holargos', nameEl: 'Χολαργός', lat: 38.0048, lng: 23.7946, lines: [3] },
  nomismatokopio: { id: 'nomismatokopio', nameIt: 'Nomismatokopio', nameEl: 'Νομισματοκοπείο', lat: 38.0094, lng: 23.8052, lines: [3] },
  agia_paraskevi: { id: 'agia_paraskevi', nameIt: 'Agia Paraskevi', nameEl: 'Αγία Παρασκευή', lat: 38.0175, lng: 23.8123, lines: [3] },
  chalandri: { id: 'chalandri', nameIt: 'Chalandri', nameEl: 'Χαλάνδρι', lat: 38.0219, lng: 23.8214, lines: [3] },
  doukissis_plakentias: { id: 'doukissis_plakentias', nameIt: 'Doukissis Plakentias', nameEl: 'Δουκίσσης Πλακεντίας', lat: 38.0264, lng: 23.8329, lines: [3], attractions: ['Interscambio con la Ferrovia Suburbana (Treno per Aeroporto)'] },
  pallini: { id: 'pallini', nameIt: 'Pallini', nameEl: 'Παλλήνη', lat: 37.9998, lng: 23.8821, lines: [3] },
  paiania_kantza: { id: 'paiania_kantza', nameIt: 'Paiania-Kantza', nameEl: 'Παιανία-Κάντζα', lat: 37.9840, lng: 23.8967, lines: [3] },
  koropi: { id: 'koropi', nameIt: 'Koropi', nameEl: 'Κορωπί', lat: 37.9126, lng: 23.8965, lines: [3] },
  airport: { id: 'airport', nameIt: 'Aeroporto di Atene', nameEl: 'Αεροδρόμιο', lat: 37.9364, lng: 23.9446, lines: [3], attractions: ['Aeroporto Internazionale Eleftherios Venizelos'] }
};

// 2. SEQUENZE ORDINATE DI STAZIONI PER LINEA
export const LINE_SEQUENCES: Record<number, string[]> = {
  1: [
    'piraeus', 'faliro', 'moschato', 'kallithea', 'tavros', 'petralona', 
    'thissio', 'monastiraki', 'omonia', 'victoria', 'attiki', 'agios_nikolaos', 
    'kato_patisia', 'agios_eleftherios', 'ano_patisia', 'perissos', 'pefkakia', 
    'nea_ionia', 'irakleio', 'eirini', 'neratziotissa', 'marousi', 'kat', 'kifisia'
  ],
  2: [
    'anthoupoli', 'peristeri', 'agios_antonios', 'sepolia', 'attiki', 
    'larissa_station', 'metaxourgeio', 'omonia', 'panepistimio', 'syntagma', 
    'akropoli', 'syngrou_fix', 'neos_kosmos', 'agios_ioannis', 'dafni', 
    'agios_dimitrios', 'ilioupoli', 'alimos', 'argyroupoli', 'elliniko'
  ],
  3: [
    'dimotiko_theatro', 'piraeus', 'maniatika', 'nikaia', 'korydallos', 
    'agia_varvara', 'agia_marina', 'egaleo', 'eleonas', 'kerameikos', 
    'monastiraki', 'syntagma', 'evangelismos', 'megaro_moussikis', 'ambelokipi', 
    'panormou', 'katehaki', 'ethniki_amyna', 'holargos', 'nomismatokopio', 
    'agia_paraskevi', 'chalandri', 'doukissis_plakentias', 'pallini', 
    'paiania_kantza', 'koropi', 'airport'
  ]
};

// Informazioni sulle linee per UI
export const LINE_INFO = [
  { id: 1, name: 'Linea 1 (Verde)', color: '#007A33', text: 'Pireo ↔ Kifisia', desc: 'Collega il porto storico con l\'elegante sobborgo nord.' },
  { id: 2, name: 'Linea 2 (Rossa)', color: '#DA291C', text: 'Anthoupoli ↔ Elliniko', desc: 'Attraversa il cuore di Atene passando per l\'Acropoli e Syntagma.' },
  { id: 3, name: 'Linea 3 (Blu)', color: '#003DA5', text: 'Teatro Municipale ↔ Aeroporto', desc: 'Collega il porto, il centro storico e l\'aeroporto internazionale.' }
];

// 3. SELEZIONE BUS TURISTICI DI ATENE
export interface BusLine {
  code: string;
  name: string;
  origin: string;
  destination: string;
  price: string;
  frequency: string;
  hours: string;
  stops: string[];
  description: string;
}

export const POPULAR_ATHENS_BUSES: BusLine[] = [
  {
    code: 'X95',
    name: 'Syntagma ↔ Aeroporto Express',
    origin: 'Piazza Syntagma (Centro)',
    destination: 'Aeroporto di Atene Terminal Arrivi',
    price: '5.50€ (Ridotto 2.70€)',
    frequency: 'Ogni 15 - 20 minuti',
    hours: '24 ore su 24 / 7 giorni su 7',
    stops: ['Piazza Syntagma', 'Evangelismos', 'Hilton', 'Ilisia', 'Piazza Mavili', 'Aeroporto (Terminal)'],
    description: 'Il mezzo più comodo, economico ed utilizzato per raggiungere l\'aeroporto direttamente dal centro città senza preoccuparsi delle scale della metro.'
  },
  {
    code: '040',
    name: 'Pireo ↔ Syntagma',
    origin: 'Porto del Pireo (Akti Miaouli)',
    destination: 'Piazza Syntagma (Centro)',
    price: '1.20€ (Biglietto urbano standard)',
    frequency: 'Ogni 15 - 25 minuti',
    hours: '24 ore su 24 (Servizio notturno ridotto)',
    stops: ['Porto del Pireo', 'Teatro Municipale', 'Tzitzifies (Sito Niarchos)', 'Viale Syngrou', 'Syngrou-Fix', 'Syntagma'],
    description: 'Linea urbana essenziale che unisce il porto passeggeri del Pireo alla piazza centrale Syntagma. Ottimo sostituto notturno quando la metro è chiusa.'
  },
  {
    code: 'X96',
    name: 'Pireo ↔ Aeroporto Express',
    origin: 'Porto del Pireo',
    destination: 'Aeroporto di Atene Terminal Arrivi',
    price: '5.50€ (Ridotto 2.70€)',
    frequency: 'Ogni 25 - 40 minuti',
    hours: '24 ore su 24 / 7 giorni su 7',
    stops: ['Porto del Pireo', 'Faliro', 'Edem (Edem Tram)', 'Glyfada', 'Voula', 'Aeroporto (Terminal)'],
    description: 'Collega direttamente il porto d\'imbarco traghetti del Pireo all\'aeroporto percorrendo tutta la riviera costiera meridionale (Riviera di Atene).'
  },
  {
    code: '224',
    name: 'Kaisariani ↔ Omonia ↔ El. Venizelou',
    origin: 'Cimitero di Kaisariani',
    destination: 'Viale El. Venizelou',
    price: '1.20€ (Biglietto urbano standard)',
    frequency: 'Ogni 10 - 15 minuti',
    hours: '05:00 - 23:45',
    stops: ['Kaisariani', 'Evangelismos (Metro)', 'Piazza Syntagma', 'Piazza Omonia', 'Politecnico', 'El. Venizelou'],
    description: 'Famoso bus urbano che taglia longitudinalmente tutto il centro nevralgico, passando per Syntagma e Omonia. Comodissimo per spostarsi tra hotel e siti d\'interesse.'
  }
];

export const AthensTransport = () => {
  const [activeTab, setActiveTab] = useState<'metro' | 'planner' | 'buses' | 'map'>('metro');
  const [selectedLine, setSelectedLine] = useState<number>(3);
  const [selectedStation, setSelectedStation] = useState<string | null>('syntagma');

  // Stato per calcolatore di percorsi
  const [origin, setOrigin] = useState<string>('piraeus');
  const [destination, setDestination] = useState<string>('airport');

  // Stato per ricerca bus
  const [busSearch, setBusSearch] = useState<string>('');

  // Stato per i percorsi preferiti
  const [favorites, setFavorites] = useState<{ id: string; origin: string; destination: string; originName: string; destinationName: string }[]>(() => {
    try {
      const saved = localStorage.getItem('chelona_athens_fav_routes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (origId: string, destId: string) => {
    const favId = `${origId}-${destId}`;
    let newFavs;
    if (favorites.some(f => f.id === favId)) {
      newFavs = favorites.filter(f => f.id !== favId);
    } else {
      const originName = ATHENS_STATIONS[origId]?.nameIt || origId;
      const destinationName = ATHENS_STATIONS[destId]?.nameIt || destId;
      newFavs = [...favorites, { id: favId, origin: origId, destination: destId, originName, destinationName }];
    }
    setFavorites(newFavs);
    localStorage.setItem('chelona_athens_fav_routes', JSON.stringify(newFavs));
  };

  const isFavorite = (origId: string, destId: string) => {
    return favorites.some(f => f.id === `${origId}-${destId}`);
  };


  // 4. ALGORITMO BFS LOCALE PER CALCOLARE I PERCORSI METRO INTERAMENTE OFFLINE
  const calculatedRoute = useMemo(() => {
    if (!origin || !destination) return null;
    if (origin === destination) {
      return {
        path: [ATHENS_STATIONS[origin]],
        stops: 0,
        transfers: [],
        time: 0
      };
    }

    // Costruiamo la mappa di adiacenza
    const adjList: Record<string, string[]> = {};
    Object.keys(ATHENS_STATIONS).forEach(id => {
      adjList[id] = [];
    });

    // Popoliamo i vicini scorrendo le linee
    Object.entries(LINE_SEQUENCES).forEach(([lineNumStr, seq]) => {
      const lineNum = parseInt(lineNumStr);
      for (let i = 0; i < seq.length; i++) {
        const curr = seq[i];
        if (i > 0) {
          const prev = seq[i - 1];
          if (!adjList[curr].includes(prev)) adjList[curr].push(prev);
        }
        if (i < seq.length - 1) {
          const next = seq[i + 1];
          if (!adjList[curr].includes(next)) adjList[curr].push(next);
        }
      }
    });

    // BFS standard per trovare il cammino minimo
    const queue: string[][] = [[origin]];
    const visited = new Set<string>([origin]);

    let pathFound: string[] | null = null;

    while (queue.length > 0) {
      const currentPath = queue.shift()!;
      const lastNode = currentPath[currentPath.length - 1];

      if (lastNode === destination) {
        pathFound = currentPath;
        break;
      }

      const neighbors = adjList[lastNode] || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...currentPath, neighbor]);
        }
      }
    }

    if (!pathFound) return null;

    // Dettaglio sul percorso
    const stationsPath = pathFound.map(id => ATHENS_STATIONS[id]);

    // Rileva i punti di interscambio/cambio linea
    // Un cambio avviene se la stazione successiva e precedente si trovano su linee diverse e il passeggero deve cambiare
    const transfers: { stationId: string; fromLine: number; toLine: number }[] = [];
    
    // Determiniamo quale linea stiamo usando fermata per fermata
    let activeLine = 0;
    
    // Trova una linea comune iniziale tra la stazione 0 e 1
    if (stationsPath.length > 1) {
      const commonLines = stationsPath[0].lines.filter(l => stationsPath[1].lines.includes(l));
      activeLine = commonLines[0] || stationsPath[0].lines[0];
    } else {
      activeLine = stationsPath[0].lines[0];
    }

    const pathLinesUsed: number[] = [activeLine];

    for (let i = 1; i < stationsPath.length; i++) {
      const curr = stationsPath[i];
      const prev = stationsPath[i - 1];
      
      if (!curr.lines.includes(activeLine)) {
        // C'è stato un cambio di linea! Troviamo la nuova linea comune tra curr e il successivo (o semplicemente tra curr e prev)
        const commonLines = curr.lines.filter(l => prev.lines.includes(l));
        const newActiveLine = curr.lines.filter(l => !commonLines.includes(l))[0] || curr.lines[0];
        
        transfers.push({
          stationId: prev.id,
          fromLine: activeLine,
          toLine: newActiveLine
        });
        
        activeLine = newActiveLine;
      }
      pathLinesUsed.push(activeLine);
    }

    // Calcolo tempi: ~2 minuti a stazione, +5 minuti per ogni cambio di linea
    const estimatedTime = (stationsPath.length - 1) * 2 + transfers.length * 5;

    return {
      path: stationsPath,
      pathLinesUsed,
      stops: stationsPath.length - 1,
      transfers,
      time: estimatedTime
    };
  }, [origin, destination]);

  // Lista stazioni per i selector
  const selectorStations = useMemo(() => {
    return Object.values(ATHENS_STATIONS).sort((a, b) => a.nameIt.localeCompare(b.nameIt));
  }, []);

  // Ricerca bus
  const filteredBuses = useMemo(() => {
    if (!busSearch.trim()) return POPULAR_ATHENS_BUSES;
    const query = busSearch.toLowerCase();
    return POPULAR_ATHENS_BUSES.filter(b => 
      b.code.toLowerCase().includes(query) || 
      b.name.toLowerCase().includes(query) || 
      b.origin.toLowerCase().includes(query) || 
      b.destination.toLowerCase().includes(query)
    );
  }, [busSearch]);

  const activeStationData = selectedStation ? ATHENS_STATIONS[selectedStation] : null;

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text-main)] overflow-hidden fade-in">
      
      {/* Tab Navigation Menu */}
      <div className="flex bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-1 shrink-0 mb-4 shadow-sm mx-1">
        <button
          onClick={() => setActiveTab('metro')}
          className={`flex-1 py-3 px-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex flex-col items-center gap-1.5 transition-all ${
            activeTab === 'metro' ? 'bg-cyan-500 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Compass className="w-4 h-4" />
          Metropolitana
        </button>
        <button
          onClick={() => setActiveTab('planner')}
          className={`flex-1 py-3 px-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex flex-col items-center gap-1.5 transition-all ${
            activeTab === 'planner' ? 'bg-cyan-500 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Navigation className="w-4 h-4" />
          Calcola Percorso
        </button>
        <button
          onClick={() => setActiveTab('buses')}
          className={`flex-1 py-3 px-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex flex-col items-center gap-1.5 transition-all ${
            activeTab === 'buses' ? 'bg-cyan-500 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Bus className="w-4 h-4" />
          Bus e Servizi
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 py-3 px-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex flex-col items-center gap-1.5 transition-all ${
            activeTab === 'map' ? 'bg-cyan-500 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Map className="w-4 h-4" />
          Mappa Rete
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-1 pb-16">
        
        {/* TAB 1: METROPOLITANA */}
        {activeTab === 'metro' && (
          <div className="space-y-4 fade-in">
            {/* Selettore Linea */}
            <div className="grid grid-cols-3 gap-2">
              {LINE_INFO.map(line => (
                <button
                  key={line.id}
                  onClick={() => {
                    setSelectedLine(line.id);
                    setSelectedStation(LINE_SEQUENCES[line.id][0]);
                  }}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-[0.98] ${
                    selectedLine === line.id 
                      ? 'bg-[var(--card-bg)] shadow-md' 
                      : 'bg-[var(--card-bg)]/50 opacity-70'
                  }`}
                  style={{ borderLeft: `5px solid ${line.color}` }}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: line.color }}>
                    {line.name}
                  </span>
                  <span className="text-xs font-bold text-[var(--text-main)] mt-1">
                    {line.text}
                  </span>
                </button>
              ))}
            </div>

            {/* Layout due colonne per grandi schermi o singolo per mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Colonna 1: Timeline della Linea */}
              <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] p-4 shadow-sm">
                <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-4 px-1">
                  Stazioni in sequenza ({LINE_SEQUENCES[selectedLine].length})
                </h3>
                
                <div className="relative pl-6 space-y-4 max-h-[380px] overflow-y-auto custom-scrollbar pr-2">
                  {/* Linea verticale colorata della metro */}
                  <div 
                    className="absolute top-3 bottom-3 left-2 w-1 rounded-full" 
                    style={{ backgroundColor: LINE_INFO.find(l => l.id === selectedLine)?.color }} 
                  />

                  {LINE_SEQUENCES[selectedLine].map((stationId, index) => {
                    const st = ATHENS_STATIONS[stationId];
                    const isSelected = selectedStation === stationId;
                    return (
                      <button
                        key={stationId}
                        onClick={() => setSelectedStation(stationId)}
                        className={`relative w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                          isSelected 
                            ? 'bg-cyan-500/10 border border-cyan-500/20 shadow-sm' 
                            : 'hover:bg-[var(--surface-variant)] border border-transparent'
                        }`}
                      >
                        {/* Pallino fermata */}
                        <div 
                          className={`absolute -left-[23px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white ring-4 transition-all ${
                            isSelected ? 'bg-cyan-500 ring-cyan-500/20 scale-110' : 'bg-gray-400 ring-transparent'
                          }`}
                          style={!isSelected ? { backgroundColor: LINE_INFO.find(l => l.id === selectedLine)?.color } : {}}
                        />

                        <div className="min-w-0 pr-2">
                          <h4 className={`text-xs font-black truncate leading-tight ${isSelected ? 'text-cyan-600' : 'text-[var(--text-main)]'}`}>
                            {st.nameIt}
                          </h4>
                          <span className="text-[9px] text-[var(--text-muted)] block font-medium">
                            {st.nameEl}
                          </span>
                        </div>

                        {/* Badge Interscambio */}
                        <div className="flex gap-1 shrink-0">
                          {st.lines.map(lNum => {
                            const lCol = LINE_INFO.find(li => li.id === lNum)?.color;
                            return (
                              <span 
                                key={lNum}
                                className="text-[8px] font-black text-white px-1.5 py-0.5 rounded-md flex items-center justify-center min-w-4 shadow-sm"
                                style={{ backgroundColor: lCol }}
                              >
                                {lNum}
                              </span>
                            );
                          })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colonna 2: Dettagli Stazione Selezionata */}
              {activeStationData && (
                <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] p-4 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    {/* Intestazione Stazione */}
                    <div className="flex justify-between items-start border-b border-[var(--border)] pb-3">
                      <div>
                        <h3 className="text-lg font-black text-[var(--text-main)] leading-tight">
                          {activeStationData.nameIt}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 font-bold uppercase tracking-wider">
                          Σταθμός: {activeStationData.nameEl}
                        </p>
                      </div>

                      <div className="flex gap-1">
                        {activeStationData.lines.map(lNum => {
                          const lCol = LINE_INFO.find(li => li.id === lNum)?.color;
                          return (
                            <span 
                              key={lNum} 
                              className="text-[10px] font-black text-white w-6 h-6 rounded-lg flex items-center justify-center shadow-md"
                              style={{ backgroundColor: lCol }}
                            >
                              M{lNum}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Attrazioni Vicine */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-cyan-500" /> Punti d'Interesse & Info
                      </h4>
                      {activeStationData.attractions ? (
                        <div className="flex flex-wrap gap-1.5">
                          {activeStationData.attractions.map((attr, i) => (
                            <span 
                              key={i} 
                              className="text-[10px] font-medium bg-[var(--surface-variant)] text-[var(--text-main)] px-2.5 py-1 rounded-full border border-[var(--border)]"
                            >
                              🏛️ {attr}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--text-muted)] italic leading-relaxed pl-1">
                          Stazione residenziale di transito. Connette i vari quartieri urbani dell'area metropolitana di Atene.
                        </p>
                      )}
                    </div>

                    {/* Coordinate e note tecniche */}
                    <div className="bg-[var(--bg)] p-3 rounded-2xl border border-[var(--border)] space-y-1.5 text-[10px] text-[var(--text-muted)]">
                      <p className="font-bold flex justify-between">
                        <span>Coordinate GPS:</span>
                        <span className="text-[var(--text-main)] font-mono">{activeStationData.lat.toFixed(4)}, {activeStationData.lng.toFixed(4)}</span>
                      </p>
                      <p className="font-bold flex justify-between">
                        <span>Tipologia:</span>
                        <span className="text-[var(--text-main)]">{activeStationData.isTransfer ? 'Nodo di Interscambio 🔄' : 'Stazione Standard 🚉'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Azioni di Navigazione */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)]">
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${activeStationData.lat},${activeStationData.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 bg-[var(--bg)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--text-main)] py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-[0.97]"
                    >
                      <MapPin className="w-4 h-4 text-cyan-500" /> Mappa
                    </a>
                    
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeStationData.lat},${activeStationData.lng}&travelmode=transit`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 bg-gradient-to-tr from-cyan-500 to-blue-500 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-md active:scale-[0.97] hover:brightness-115 transition-all"
                    >
                      <Navigation className="w-4 h-4" /> Naviga
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CALCOLATORE PERCORSO */}
        {activeTab === 'planner' && (
          <div className="space-y-4 fade-in">
            {/* Percorsi Preferiti */}
            {favorites.length > 0 && (
              <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] p-4 shadow-sm space-y-3">
                <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider px-1 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Percorsi Preferiti
                </h4>
                <div className="flex flex-wrap gap-2">
                  {favorites.map((fav) => (
                    <div 
                      key={fav.id}
                      className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] hover:border-cyan-500/50 rounded-2xl py-2 px-3 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                      onClick={() => {
                        setOrigin(fav.origin);
                        setDestination(fav.destination);
                      }}
                    >
                      <span className="text-xs font-bold text-[var(--text-main)]">
                        {fav.originName} ➔ {fav.destinationName}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(fav.origin, fav.destination);
                        }}
                        className="text-amber-500 hover:text-red-500 p-0.5 transition-colors flex items-center justify-center"
                        title="Rimuovi dai preferiti"
                      >
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Box input percorsi */}
            <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] p-4 shadow-sm space-y-4">
              <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider px-1">
                Pianifica il tuo tragitto nella metro
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                
                {/* Partenza */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block pl-1">Partenza</label>
                  <select 
                    value={origin} 
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full bg-[var(--bg)] text-[var(--text-main)] border border-[var(--border)] focus:border-cyan-500 p-3 rounded-2xl text-xs font-bold outline-none appearance-none transition-colors"
                  >
                    {selectorStations.map(st => (
                      <option key={st.id} value={st.id}>🟢 {st.nameIt}</option>
                    ))}
                  </select>
                </div>

                {/* Arrivo */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block pl-1">Arrivo</label>
                  <select 
                    value={destination} 
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full bg-[var(--bg)] text-[var(--text-main)] border border-[var(--border)] focus:border-cyan-500 p-3 rounded-2xl text-xs font-bold outline-none appearance-none transition-colors"
                  >
                    {selectorStations.map(st => (
                      <option key={st.id} value={st.id}>🔴 {st.nameIt}</option>
                    ))}
                  </select>
                </div>

                {/* Pulsante Inverti Direzione */}
                <button
                  onClick={() => {
                    const temp = origin;
                    setOrigin(destination);
                    setDestination(temp);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl border border-cyan-400 shadow-md active:scale-90 transition-all shrink-0 hidden sm:block"
                  title="Inverti Stazioni"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              </div>

              {/* Tasto Inverti per mobile */}
              <button
                onClick={() => {
                  const temp = origin;
                  setOrigin(destination);
                  setDestination(temp);
                }}
                className="w-full flex items-center justify-center gap-2 bg-[var(--bg)] hover:bg-[var(--border)] border border-[var(--border)] text-xs font-bold py-2.5 rounded-xl sm:hidden active:scale-95 transition-all text-[var(--text-muted)]"
              >
                <ArrowLeftRight className="w-4 h-4" /> Inverti Partenza/Arrivo
              </button>
            </div>

            {/* Risultato della Pianificazione */}
            {calculatedRoute && (
              <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] p-4 shadow-sm space-y-4 fade-in">
                
                {/* Statistiche del viaggio */}
                <div className="grid grid-cols-3 gap-2 bg-[var(--bg)] p-3 rounded-2xl border border-[var(--border)]">
                  <div className="text-center">
                    <p className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Durata Stima</p>
                    <p className="text-sm font-black text-cyan-600 mt-1 flex items-center justify-center gap-1">
                      <Clock className="w-4 h-4" /> ~{calculatedRoute.time} min
                    </p>
                  </div>
                  <div className="text-center border-x border-[var(--border)]">
                    <p className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Fermate</p>
                    <p className="text-sm font-black text-[var(--text-main)] mt-1">
                      {calculatedRoute.stops} fermate
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Cambi Linea</p>
                    <p className={`text-sm font-black mt-1 ${calculatedRoute.transfers.length > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {calculatedRoute.transfers.length === 0 ? 'Diretto 🟢' : `${calculatedRoute.transfers.length} cambi 🔄`}
                    </p>
                  </div>
                </div>

                {/* Timeline Grafica delle Fermate */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">
                      Dettaglio del Percorso
                    </h4>
                    <button
                      onClick={() => toggleFavorite(origin, destination)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                        isFavorite(origin, destination)
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                          : 'bg-cyan-500/10 text-cyan-600 border border-cyan-500/30 hover:bg-cyan-500/20'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFavorite(origin, destination) ? 'fill-amber-500 text-amber-500' : ''}`} />
                      {isFavorite(origin, destination) ? 'Rimuovi dai Preferiti' : 'Salva nei Preferiti'}
                    </button>
                  </div>


                  <div className="relative pl-7 space-y-4">
                    {/* Linea verticale grafica */}
                    <div className="absolute top-3 bottom-3 left-2.5 w-1 bg-gray-300 rounded-full" />

                    {calculatedRoute.path.map((station, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === calculatedRoute.path.length - 1;
                      const activeLineNum = calculatedRoute.pathLinesUsed[idx];
                      const activeLineCol = LINE_INFO.find(l => l.id === activeLineNum)?.color || '#999';

                      // Verifica se in questa stazione c'è un interscambio
                      const transferInfo = calculatedRoute.transfers.find(t => t.stationId === station.id);

                      return (
                        <div key={idx} className="relative flex flex-col">
                          
                          {/* Nodo colorato sul percorso */}
                          <div 
                            className={`absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white ring-4 transition-all ${
                              isFirst ? 'bg-emerald-500 ring-emerald-500/20 scale-110' : 
                              isLast ? 'bg-red-500 ring-red-500/20 scale-110' : 
                              'bg-gray-400 ring-transparent'
                            }`}
                            style={(!isFirst && !isLast) ? { backgroundColor: activeLineCol } : {}}
                          />

                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className={`text-xs font-black ${isFirst ? 'text-emerald-600 font-black text-sm' : isLast ? 'text-red-500 font-black text-sm' : 'text-[var(--text-main)]'}`}>
                                {station.nameIt} {isFirst && '(Partenza)'} {isLast && '(Arrivo)'}
                              </h5>
                              <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-0.5">
                                {station.nameEl}
                              </p>
                            </div>
                            
                            {/* Mostra badge della linea attiva */}
                            <span 
                              className="text-[8px] font-black text-white px-2 py-0.5 rounded-md shadow-sm"
                              style={{ backgroundColor: activeLineCol }}
                            >
                              M{activeLineNum}
                            </span>
                          </div>

                          {/* Se c'è un cambio di linea in questa fermata */}
                          {transferInfo && (
                            <div className="my-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-700 font-bold flex items-center gap-2 max-w-xs animate-pulse">
                              <ArrowLeftRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>
                                Cambia a <strong>M{transferInfo.toLine}</strong> in direzione di arrivo.
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottone Navigazione Reale */}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${ATHENS_STATIONS[origin].lat},${ATHENS_STATIONS[origin].lng}&destination=${ATHENS_STATIONS[destination].lat},${ATHENS_STATIONS[destination].lng}&travelmode=transit`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-tr from-cyan-500 to-blue-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-cyan-500/20 active:scale-[0.98] hover:brightness-110 transition-all text-center"
                >
                  <Navigation className="w-4 h-4 shrink-0" />
                  Visualizza Navigazione Live (Google Maps)
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>

              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUTOBUS E SERVIZI */}
        {activeTab === 'buses' && (
          <div className="space-y-4 fade-in">
            {/* Barra di ricerca bus */}
            <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] p-4 shadow-sm space-y-3">
              <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider px-1">
                Cerca o seleziona una linea bus ad Atene
              </h3>
              
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Cerca per codice bus, nome o destinazione..."
                  value={busSearch}
                  onChange={(e) => setBusSearch(e.target.value)}
                  className="w-full bg-[var(--bg)] text-[var(--text-main)] border border-[var(--border)] focus:border-cyan-500 pl-11 pr-4 py-3 rounded-2xl text-xs font-bold outline-none transition-colors"
                />
              </div>
            </div>

            {/* Lista dei Bus filtrati */}
            <div className="space-y-3">
              {filteredBuses.length === 0 ? (
                <div className="bg-[var(--card-bg)] p-6 rounded-3xl border border-[var(--border)] text-center text-xs text-[var(--text-muted)] font-bold">
                  Nessuna linea trovata corrispondente alla ricerca.
                </div>
              ) : (
                filteredBuses.map((bus) => (
                  <div key={bus.code} className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] p-4 shadow-sm space-y-3">
                    
                    {/* Header Bus */}
                    <div className="flex justify-between items-start border-b border-[var(--border)] pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 rounded-xl flex flex-col items-center justify-center font-black shrink-0 shadow-sm">
                          <span className="text-xs">{bus.code}</span>
                        </div>
                        <div>
                          <h4 className="font-black text-xs text-[var(--text-main)]">{bus.name}</h4>
                          <p className="text-[9px] text-[var(--text-muted)] mt-0.5 leading-none">Frequenza: <span className="font-bold text-cyan-500">{bus.frequency}</span></p>
                        </div>
                      </div>

                      <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-1 rounded-lg">
                        {bus.price}
                      </span>
                    </div>

                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed pl-1">
                      {bus.description}
                    </p>

                    {/* Dettagli tecnici in pillole */}
                    <div className="grid grid-cols-2 gap-2 bg-[var(--bg)] p-2.5 rounded-xl border border-[var(--border)] text-[9px] text-[var(--text-muted)] font-bold">
                      <p className="flex justify-between">
                        <span>Orari d'esercizio:</span>
                        <span className="text-[var(--text-main)]">{bus.hours}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Tipologia:</span>
                        <span className="text-[var(--text-main)]">{bus.code.startsWith('X') ? 'Espresso ⚡' : 'Urbano 🚌'}</span>
                      </p>
                    </div>

                    {/* Fermate principali */}
                    <div className="space-y-1.5 pl-1">
                      <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider">Fermate Principali:</p>
                      <div className="flex flex-wrap gap-1">
                        {bus.stops.map((stop, i) => (
                          <span key={i} className="text-[9px] bg-[var(--bg)] text-[var(--text-main)] border border-[var(--border)] px-2 py-0.5 rounded-md">
                            📍 {stop}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottone Navigatore su OASA Telematics */}
                    <div className="pt-1.5">
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&origin=${bus.origin}&destination=${bus.destination}&travelmode=transit`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-center gap-1.5 bg-[var(--bg)] hover:bg-[var(--border)] text-[var(--text-main)] border border-[var(--border)] py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-[0.98]"
                      >
                        <Navigation className="w-3.5 h-3.5 text-cyan-500" /> Pianifica Tragitto per {bus.code}
                      </a>
                    </div>

                  </div>
                ))
              )}
            </div>

            {/* Card OASA Telematics Live */}
            <div className="bg-gradient-to-tr from-cyan-900 to-blue-900 text-white rounded-3xl border border-cyan-800 p-5 shadow-lg relative overflow-hidden space-y-3">
              {/* Background design elements */}
              <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-xl" />
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white shrink-0 border border-white/20">
                  <ExternalLink className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-cyan-300">Live OASA Telematics</h4>
                  <p className="text-[9px] text-white/70">Senza credenziali o token</p>
                </div>
              </div>

              <p className="text-[11px] leading-relaxed text-white/80">
                Vuoi vedere dove si trovano i bus di Atene in tempo reale e controllare i tabelloni elettronici di attesa di qualsiasi fermata? Utilizza il portale ufficiale di telemetria mobile di Atene.
              </p>

              <div className="pt-1">
                <a 
                  href="http://telematics.oasa.gr/" 
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-[0.98] shadow-md shadow-cyan-950/20 text-center"
                >
                  <Bus className="w-4 h-4 shrink-0" />
                  Apri Telemetria Live OASA
                </a>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: MAPPA DI RETE */}
        {activeTab === 'map' && (
          <div className="space-y-4 fade-in">
            {/* Box descrittivo mappa */}
            <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] p-4 shadow-sm space-y-3">
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-600 flex items-center justify-center shrink-0">
                  <Map className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="font-black text-xs text-[var(--text-main)]">Mappa ad Alta Risoluzione della Metro</h4>
                  <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Scarica la piantina ufficiale del gestore di Atene.</p>
                </div>
              </div>

              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Puoi consultare e scaricare la piantina ufficiale della metropolitana di Atene in formato PDF sul tuo smartphone per averla sempre disponibile anche in assenza di segnale o sotto i tunnel sotterranei delle stazioni.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5">
                {/* Bottone PDF Ufficiale */}
                <a 
                  href="https://www.oasa.gr/wp-content/uploads/2021/04/afissa_metro_may2020.pdf" 
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 bg-[var(--bg)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--text-main)] py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-[0.97]"
                >
                  <Download className="w-4 h-4 text-cyan-500 shrink-0" /> PDF Ufficiale
                </a>
                
                {/* Bottone Mappa Interattiva Web */}
                <a 
                  href="https://www.athensmap360.com/athens-metro-map" 
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 bg-gradient-to-tr from-cyan-500 to-blue-500 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-md active:scale-[0.97] hover:brightness-110 transition-all text-center"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" /> Mappa Interattiva Web
                </a>
              </div>
            </div>

            {/* Mappa stilizzata SVG interattiva */}
            <div className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] p-4 shadow-sm space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">
                  Mappa Topologica Interattiva M1/M2/M3
                </h3>
                <span className="text-[8px] font-black bg-cyan-500/10 text-cyan-600 px-2 py-0.5 rounded-md uppercase">
                  Clicca sui Nodi
                </span>
              </div>

              {/* Rappresentazione grafica SVG interattiva del centro di Atene */}
              <div className="w-full aspect-[1.3] bg-[var(--bg)] rounded-2xl border border-[var(--border)] p-3 relative flex items-center justify-center overflow-hidden">
                
                <svg viewBox="0 0 400 300" className="w-full h-full select-none">
                  {/* Linee di collegamento sul grafico */}
                  
                  {/* Linea 1 (Verde) - Diagonale da in basso a sinistra ad in alto a destra */}
                  <line x1="50" y1="280" x2="350" y2="40" stroke="#007A33" strokeWidth="6" strokeLinecap="round" />
                  
                  {/* Linea 2 (Rossa) - Quasi verticale */}
                  <line x1="180" y1="20" x2="220" y2="280" stroke="#DA291C" strokeWidth="6" strokeLinecap="round" />
                  
                  {/* Linea 3 (Blu) - Diagonale orizzontale */}
                  <line x1="40" y1="180" x2="360" y2="100" stroke="#003DA5" strokeWidth="6" strokeLinecap="round" />

                  {/* Stazioni di interscambio e principali */}
                  
                  {/* Pireo (Linea 1 e 3) */}
                  <g className="cursor-pointer" onClick={() => { setSelectedStation('piraeus'); setSelectedLine(3); }}>
                    <circle cx="50" cy="280" r="10" fill="white" stroke="#333" strokeWidth="3" />
                    <circle cx="50" cy="280" r="5" fill="#003DA5" />
                    <text x="65" y="284" fontSize="8" fontWeight="bold" fill="var(--text-main)">Pireo (M1/M3)</text>
                  </g>

                  {/* Kifisia (Linea 1) */}
                  <g className="cursor-pointer" onClick={() => { setSelectedStation('kifisia'); setSelectedLine(1); }}>
                    <circle cx="350" cy="40" r="8" fill="white" stroke="#007A33" strokeWidth="3" />
                    <text x="290" y="44" fontSize="8" fontWeight="bold" fill="var(--text-main)">Kifisia (M1)</text>
                  </g>

                  {/* Omonia (Linea 1 e 2) - Intersezione Verde/Rosso */}
                  <g className="cursor-pointer" onClick={() => { setSelectedStation('omonia'); setSelectedLine(2); }}>
                    <circle cx="188" cy="80" r="10" fill="white" stroke="#333" strokeWidth="3" />
                    <circle cx="188" cy="80" r="5" fill="#DA291C" />
                    <text x="132" y="80" fontSize="8" fontWeight="bold" fill="var(--text-main)">Omonia (M1/M2)</text>
                  </g>

                  {/* Monastiraki (Linea 1 e 3) - Intersezione Verde/Blu */}
                  <g className="cursor-pointer" onClick={() => { setSelectedStation('monastiraki'); setSelectedLine(3); }}>
                    <circle cx="152" cy="150" r="10" fill="white" stroke="#333" strokeWidth="3" />
                    <circle cx="152" cy="150" r="5" fill="#003DA5" />
                    <text x="80" y="152" fontSize="8" fontWeight="bold" fill="var(--text-main)">Monastiraki (M1/M3)</text>
                  </g>

                  {/* Syntagma (Linea 2 e 3) - Intersezione Rosso/Blu */}
                  <g className="cursor-pointer" onClick={() => { setSelectedStation('syntagma'); setSelectedLine(3); }}>
                    <circle cx="205" cy="140" r="12" fill="white" stroke="#333" strokeWidth="3" />
                    <circle cx="205" cy="140" r="6" fill="#DA291C" />
                    <circle cx="205" cy="140" r="3" fill="#003DA5" />
                    <text x="222" y="143" fontSize="9" fontWeight="black" fill="var(--text-main)">Syntagma (M2/M3)</text>
                  </g>

                  {/* Acropoli (Linea 2) */}
                  <g className="cursor-pointer" onClick={() => { setSelectedStation('akropoli'); setSelectedLine(2); }}>
                    <circle cx="212" cy="190" r="8" fill="white" stroke="#DA291C" strokeWidth="3" />
                    <text x="225" y="194" fontSize="8" fontWeight="bold" fill="var(--text-main)">Acropoli (M2)</text>
                  </g>

                  {/* Kerameikos (Linea 3) */}
                  <g className="cursor-pointer" onClick={() => { setSelectedStation('kerameikos'); setSelectedLine(3); }}>
                    <circle cx="108" cy="162" r="8" fill="white" stroke="#003DA5" strokeWidth="3" />
                    <text x="70" y="180" fontSize="8" fontWeight="bold" fill="var(--text-main)">Kerameikos (M3)</text>
                  </g>

                  {/* Aeroporto (Linea 3) */}
                  <g className="cursor-pointer" onClick={() => { setSelectedStation('airport'); setSelectedLine(3); }}>
                    <circle cx="360" cy="100" r="8" fill="white" stroke="#003DA5" strokeWidth="3" />
                    <text x="315" y="115" fontSize="8" fontWeight="bold" fill="var(--text-main)">Airport (M3)</text>
                  </g>
                </svg>

                {/* Sfondo mappa con reticolo soft */}
                <div className="absolute inset-0 bg-[radial-gradient(#00000010_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
              </div>

              {/* Mini card informativa della stazione cliccata sulla mappa */}
              {selectedStation && (
                <div className="bg-[var(--bg)] p-3 rounded-2xl border border-[var(--border)] flex items-center justify-between shadow-sm animate-fade-in">
                  <div>
                    <span className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-wider">Stazione selezionata</span>
                    <h4 className="text-xs font-black text-[var(--text-main)] mt-0.5">{ATHENS_STATIONS[selectedStation].nameIt}</h4>
                    <p className="text-[9px] text-[var(--text-muted)] font-bold">{ATHENS_STATIONS[selectedStation].nameEl}</p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('metro');
                    }}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl shadow-md transition-all active:scale-95"
                  >
                    Vedi Dettagli 🔎
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
