import React, { useState, useMemo, useEffect } from 'react';

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
export const ROME_STATIONS: Record<string, MetroStation> = {
  // Linea A (Arancione)
  battistini: { id: 'battistini', nameIt: 'Battistini', nameEl: 'Battistini', lat: 41.9062, lng: 12.4149, lines: [1] },
  cornelia: { id: 'cornelia', nameIt: 'Cornelia', nameEl: 'Cornelia', lat: 41.9009, lng: 12.4262, lines: [1] },
  valle_aurelia: { id: 'valle_aurelia', nameIt: 'Valle Aurelia', nameEl: 'Valle Aurelia', lat: 41.9025, lng: 12.4419, lines: [1], isTransfer: true },
  cipro: { id: 'cipro', nameIt: 'Cipro', nameEl: 'Cipro', lat: 41.9075, lng: 12.4475, lines: [1], attractions: ['Musei Vaticani'] },
  ottaviano: { id: 'ottaviano', nameIt: 'Ottaviano', nameEl: 'Ottaviano', lat: 41.9092, lng: 12.4578, lines: [1], attractions: ['Basilica di San Pietro', 'Vaticano'] },
  lepanto: { id: 'lepanto', nameIt: 'Lepanto', nameEl: 'Lepanto', lat: 41.9116, lng: 12.4665, lines: [1] },
  flaminio: { id: 'flaminio', nameIt: 'Flaminio', nameEl: 'Flaminio', lat: 41.9123, lng: 12.4761, lines: [1], attractions: ['Piazza del Popolo', 'Villa Borghese'] },
  spagna: { id: 'spagna', nameIt: 'Spagna', nameEl: 'Spagna', lat: 41.9064, lng: 12.4828, lines: [1], attractions: ['Piazza di Spagna', 'Trinità dei Monti'] },
  barberini: { id: 'barberini', nameIt: 'Barberini', nameEl: 'Barberini', lat: 41.9037, lng: 12.4886, lines: [1], attractions: ['Fontana di Trevi', 'Via Veneto'] },
  repubblica: { id: 'repubblica', nameIt: 'Repubblica', nameEl: 'Repubblica', lat: 41.9026, lng: 12.4952, lines: [1], attractions: ['Teatro dell\'Opera', 'Via Nazionale'] },
  termini: { id: 'termini', nameIt: 'Termini', nameEl: 'Termini', lat: 41.9014, lng: 12.5009, lines: [1, 2], isTransfer: true, attractions: ['Stazione Termini', 'Piazza dei Cinquecento'] },
  vittorio_emanuele: { id: 'vittorio_emanuele', nameIt: 'Vittorio Emanuele', nameEl: 'Vittorio Emanuele', lat: 41.8953, lng: 12.5046, lines: [1], attractions: ['Piazza Vittorio'] },
  manzoni: { id: 'manzoni', nameIt: 'Manzoni', nameEl: 'Manzoni', lat: 41.8906, lng: 12.5065, lines: [1] },
  san_giovanni: { id: 'san_giovanni', nameIt: 'San Giovanni', nameEl: 'San Giovanni', lat: 41.8858, lng: 12.5097, lines: [1, 3], isTransfer: true, attractions: ['Basilica di San Giovanni in Laterano'] },
  re_di_roma: { id: 're_di_roma', nameIt: 'Re di Roma', nameEl: 'Re di Roma', lat: 41.8814, lng: 12.5147, lines: [1] },
  ponte_lungo: { id: 'ponte_lungo', nameIt: 'Ponte Lungo', nameEl: 'Ponte Lungo', lat: 41.8767, lng: 12.5209, lines: [1] },
  furio_camillo: { id: 'furio_camillo', nameIt: 'Furio Camillo', nameEl: 'Furio Camillo', lat: 41.8732, lng: 12.5262, lines: [1] },
  colli_albani: { id: 'colli_albani', nameIt: 'Colli Albani', nameEl: 'Colli Albani', lat: 41.8692, lng: 12.5312, lines: [1] },
  arco_di_travertino: { id: 'arco_di_travertino', nameIt: 'Arco di Travertino', nameEl: 'Arco di Travertino', lat: 41.8655, lng: 12.5367, lines: [1] },
  porta_furba: { id: 'porta_furba', nameIt: 'Porta Furba', nameEl: 'Porta Furba', lat: 41.8624, lng: 12.5414, lines: [1] },
  numidio_quadrato: { id: 'numidio_quadrato', nameIt: 'Numidio Quadrato', nameEl: 'Numidio Quadrato', lat: 41.8595, lng: 12.5463, lines: [1] },
  lucio_sestio: { id: 'lucio_sestio', nameIt: 'Lucio Sestio', nameEl: 'Lucio Sestio', lat: 41.8569, lng: 12.5511, lines: [1] },
  giulio_agricola: { id: 'giulio_agricola', nameIt: 'Giulio Agricola', nameEl: 'Giulio Agricola', lat: 41.8541, lng: 12.5562, lines: [1] },
  subaugusta: { id: 'subaugusta', nameIt: 'Subaugusta', nameEl: 'Subaugusta', lat: 41.8517, lng: 12.5606, lines: [1] },
  cinecitta: { id: 'cinecitta', nameIt: 'Cinecittà', nameEl: 'Cinecittà', lat: 41.8485, lng: 12.5661, lines: [1], attractions: ['Cinecittà Studios'] },
  anagnina: { id: 'anagnina', nameIt: 'Anagnina', nameEl: 'Anagnina', lat: 41.8418, lng: 12.5806, lines: [1] },

  // Linea B (Blu)
  laurentina: { id: 'laurentina', nameIt: 'Laurentina', nameEl: 'Laurentina', lat: 41.8266, lng: 12.4806, lines: [2] },
  eur_fermi: { id: 'eur_fermi', nameIt: 'EUR Fermi', nameEl: 'EUR Fermi', lat: 41.8285, lng: 12.4704, lines: [2], attractions: ['Laghetto dell\'EUR'] },
  eur_palasport: { id: 'eur_palasport', nameIt: 'EUR Palasport', nameEl: 'EUR Palasport', lat: 41.8314, lng: 12.4665, lines: [2] },
  eur_magliana: { id: 'eur_magliana', nameIt: 'EUR Magliana', nameEl: 'EUR Magliana', lat: 41.8383, lng: 12.4632, lines: [2], isTransfer: true },
  marconi: { id: 'marconi', nameIt: 'Marconi', nameEl: 'Marconi', lat: 41.8475, lng: 12.4746, lines: [2] },
  basilica_san_paolo: { id: 'basilica_san_paolo', nameIt: 'Basilica San Paolo', nameEl: 'Basilica San Paolo', lat: 41.8558, lng: 12.4789, lines: [2], isTransfer: true, attractions: ['Basilica di San Paolo fuori le Mura'] },
  garbatella: { id: 'garbatella', nameIt: 'Garbatella', nameEl: 'Garbatella', lat: 41.8661, lng: 12.4836, lines: [2] },
  piramide: { id: 'piramide', nameIt: 'Piramide', nameEl: 'Piramide', lat: 41.8755, lng: 12.4822, lines: [2], isTransfer: true, attractions: ['Piramide Cestia', 'Stazione Ostiense', 'Cimitero Acattolico'] },
  circo_massimo: { id: 'circo_massimo', nameIt: 'Circo Massimo', nameEl: 'Circo Massimo', lat: 41.8833, lng: 12.4883, lines: [2], attractions: ['Circo Massimo', 'Aventino', 'FAO'] },
  colosseo: { id: 'colosseo', nameIt: 'Colosseo', nameEl: 'Colosseo', lat: 41.8914, lng: 12.4912, lines: [2], attractions: ['Colosseo', 'Fori Imperiali', 'Arco di Costantino'] },
  cavour: { id: 'cavour', nameIt: 'Cavour', nameEl: 'Cavour', lat: 41.8953, lng: 12.4939, lines: [2], attractions: ['Rione Monti'] },
  castro_pretorio: { id: 'castro_pretorio', nameIt: 'Castro Pretorio', nameEl: 'Castro Pretorio', lat: 41.9056, lng: 12.5056, lines: [2] },
  policlinico: { id: 'policlinico', nameIt: 'Policlinico', nameEl: 'Policlinico', lat: 41.9083, lng: 12.5122, lines: [2], attractions: ['Policlinico Umberto I', 'Università La Sapienza'] },
  bologna: { id: 'bologna', nameIt: 'Bologna', nameEl: 'Bologna', lat: 41.9136, lng: 12.5206, lines: [2], isTransfer: true },
  tiburtina: { id: 'tiburtina', nameIt: 'Tiburtina', nameEl: 'Tiburtina', lat: 41.9097, lng: 12.5303, lines: [2], attractions: ['Stazione Tiburtina'] },
  rebibbia: { id: 'rebibbia', nameIt: 'Rebibbia', nameEl: 'Rebibbia', lat: 41.9261, lng: 12.5728, lines: [2] },
  jonio: { id: 'jonio', nameIt: 'Jonio', nameEl: 'Jonio', lat: 41.9483, lng: 12.5275, lines: [2] },

  // Linea C (Verde)
  lodi: { id: 'lodi', nameIt: 'Lodi', nameEl: 'Lodi', lat: 41.8864, lng: 12.5181, lines: [3] },
  pigneto: { id: 'pigneto', nameIt: 'Pigneto', nameEl: 'Pigneto', lat: 41.8889, lng: 12.5261, lines: [3], attractions: ['Quartiere Pigneto'] },
  malatesta: { id: 'malatesta', nameIt: 'Malatesta', nameEl: 'Malatesta', lat: 41.8867, lng: 12.5358, lines: [3] },
  teano: { id: 'teano', nameIt: 'Teano', nameEl: 'Teano', lat: 41.8894, lng: 12.5511, lines: [3] },
  pantano: { id: 'pantano', nameIt: 'Monte Compatri-Pantano', nameEl: 'Monte Compatri-Pantano', lat: 41.8656, lng: 12.7114, lines: [3] }
};

export const LINE_SEQUENCES: Record<number, string[]> = {
  1: [
    'battistini', 'cornelia', 'valle_aurelia', 'cipro', 'ottaviano', 'lepanto', 'flaminio',
    'spagna', 'barberini', 'repubblica', 'termini', 'vittorio_emanuele', 'manzoni', 'san_giovanni',
    're_di_roma', 'ponte_lungo', 'furio_camillo', 'colli_albani', 'arco_di_travertino', 'porta_furba',
    'numidio_quadrato', 'lucio_sestio', 'giulio_agricola', 'subaugusta', 'cinecitta', 'anagnina'
  ],
  2: [
    'laurentina', 'eur_fermi', 'eur_palasport', 'eur_magliana', 'marconi', 'basilica_san_paolo',
    'garbatella', 'piramide', 'circo_massimo', 'colosseo', 'cavour', 'termini', 'castro_pretorio',
    'policlinico', 'bologna', 'tiburtina', 'rebibbia', 'jonio'
  ],
  3: [
    'san_giovanni', 'lodi', 'pigneto', 'malatesta', 'teano', 'pantano'
  ]
};

export const LINE_INFO = [
  { id: 1, name: 'Linea A (Arancione)', color: '#FF7F00', text: 'Battistini ↔ Anagnina', desc: 'Attraversa Roma da nord-ovest a sud-est, passando per il Vaticano e il centro storico.' },
  { id: 2, name: 'Linea B (Blu)', color: '#0055A4', text: 'Laurentina ↔ Rebibbia/Jonio', desc: 'Collega la zona sud (EUR) con nord-est, fermando al Colosseo e Termini.' },
  { id: 3, name: 'Linea C (Verde)', color: '#009246', text: 'San Giovanni ↔ Pantano', desc: 'La prima linea metropolitana di Roma completamente automatizzata.' }
];

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

export const POPULAR_ROME_BUSES: BusLine[] = [
  {
    code: '40',
    name: 'Termini ↔ San Pietro (Express)',
    origin: 'Stazione Termini',
    destination: 'Borgo Sant\'Angelo (Vaticano)',
    price: '1.50€ (BIT)',
    frequency: 'Ogni 10 - 15 minuti',
    hours: '05:30 - 24:00',
    stops: ['Termini', 'Nazionale', 'Piazza Venezia', 'Argentina', 'Chiesa Nuova', 'Traspontina/Conciliazione', 'Borgo Sant\'Angelo'],
    description: 'Linea Express molto usata dai turisti per collegare rapidamente la Stazione Termini con il Vaticano, con poche fermate intermedie.'
  },
  {
    code: '64',
    name: 'Termini ↔ San Pietro (Storico)',
    origin: 'Stazione Termini',
    destination: 'Stazione San Pietro',
    price: '1.50€ (BIT)',
    frequency: 'Ogni 8 - 12 minuti',
    hours: '05:30 - 24:00',
    stops: ['Termini', 'Repubblica', 'Nazionale', 'Venezia', 'Argentina', 'Corso Vittorio Emanuele', 'San Pietro FS'],
    description: 'La linea bus più celebre di Roma, attraversa tutto il centro storico. Attenzione ai borseggiatori nelle ore di punta.'
  },
  {
    code: '85',
    name: 'Termini ↔ Arco di Travertino',
    origin: 'Stazione Termini',
    destination: 'Arco di Travertino (Metro A)',
    price: '1.50€ (BIT)',
    frequency: 'Ogni 12 - 20 minuti',
    hours: '05:30 - 24:00',
    stops: ['Termini', 'Piazza Venezia', 'Via dei Fori Imperiali', 'Colosseo', 'San Giovanni', 'Appia Nuova', 'Arco di Travertino'],
    description: 'La linea ideale per un tour panoramico del centro archeologico: passa lungo i Fori Imperiali e il Colosseo.'
  },
  {
    code: 'H',
    name: 'Termini ↔ Trastevere',
    origin: 'Stazione Termini',
    destination: 'Dei Capasso',
    price: '1.50€ (BIT)',
    frequency: 'Ogni 15 minuti',
    hours: '05:30 - 24:00',
    stops: ['Termini', 'Nazionale', 'Piazza Venezia', 'Trastevere', 'Stazione Trastevere', 'Gianicolense'],
    description: 'Il bus perfetto per raggiungere il quartiere di Trastevere direttamente dalla Stazione Termini.'
  },
  {
    code: 'SitBus',
    name: 'Shuttle Aeroporto Fiumicino',
    origin: 'Termini (Via Marsala)',
    destination: 'Aeroporto di Fiumicino',
    price: '7.00€',
    frequency: 'Ogni 30 - 45 minuti',
    hours: '04:45 - 23:45',
    stops: ['Termini', 'Vaticano (Via Crescenzio)', 'Aeroporto Fiumicino T3'],
    description: 'Servizio navetta comodo per l\'Aeroporto di Fiumicino con fermata intermedia in zona Vaticano.'
  }
];

export interface RomeStreet {
  id: string;
  nameIt: string;
  nameEl: string;
  lat: number;
  lng: number;
  type: 'street' | 'square' | 'monument';
}

export const ROME_STREETS: Record<string, RomeStreet> = {
  via_del_corso: { id: 'via_del_corso', nameIt: 'Via del Corso', nameEl: 'Via del Corso', lat: 41.9038, lng: 12.4789, type: 'street' },
  piazza_navona: { id: 'piazza_navona', nameIt: 'Piazza Navona', nameEl: 'Piazza Navona', lat: 41.8992, lng: 12.4731, type: 'square' },
  campo_de_fiori: { id: 'campo_de_fiori', nameIt: 'Campo de Fiori', nameEl: 'Campo de Fiori', lat: 41.8956, lng: 12.4722, type: 'square' },
  pantheon: { id: 'pantheon', nameIt: 'Pantheon', nameEl: 'Pantheon', lat: 41.8986, lng: 12.4769, type: 'monument' },
  trastevere: { id: 'trastevere', nameIt: 'Trastevere', nameEl: 'Trastevere', lat: 41.8883, lng: 12.4694, type: 'street' }
};

export const RomeTransport = () => {
  const [activeTab, setActiveTab] = useState<'metro' | 'planner' | 'buses' | 'map'>('metro');
  const [selectedLine, setSelectedLine] = useState<number>(3);
  const [selectedStation, setSelectedStation] = useState<string | null>('syntagma');

  // Stato per calcolatore di percorsi
  const [origin, setOrigin] = useState<string>('piraeus');
  const [destination, setDestination] = useState<string>('airport');

  // Stato per ricerca bus
  const [busSearch, setBusSearch] = useState<string>('');

  // Stati per la geolocalizzazione ed autocompilazione delle vie di tutta la Grecia via Nominatim API
  const [originApiSuggestions, setOriginApiSuggestions] = useState<any[]>([]);
  const [destApiSuggestions, setDestApiSuggestions] = useState<any[]>([]);
  const [isLoadingOrigin, setIsLoadingOrigin] = useState(false);
  const [isLoadingDest, setIsLoadingDest] = useState(false);
  const [customOriginCoords, setCustomOriginCoords] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [customDestCoords, setCustomDestCoords] = useState<{ lat: number; lng: number; name: string } | null>(null);

  // Stati per la ricerca autocompletamento
  const [originSearch, setOriginSearch] = useState('Pireo (Porto)');
  const [destSearch, setDestSearch] = useState('Aeroporto di Roma');
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);

  // Effetto per cercare vie in Grecia in tempo reale (de-bounced) per la Partenza
  useEffect(() => {
    const query = originSearch.trim();
    if (query.length < 3) {
      setOriginApiSuggestions([]);
      return;
    }
    
    // Se corrisponde a una delle stazioni offline, non chiamiamo l'API
    const offlineMatch = Object.values(ROME_STATIONS).some(
      s => s.nameIt.toLowerCase() === query.toLowerCase()
    );
    if (offlineMatch) return;

    const timer = setTimeout(async () => {
      setIsLoadingOrigin(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}, Greece&format=json&limit=5`,
          { headers: { 'User-Agent': 'ChelonaVaultApp/1.13.48' } }
        );
        const data = await response.json();
        if (Array.isArray(data)) {
          setOriginApiSuggestions(data.map(item => {
            const parts = item.display_name.split(',');
            const shortName = parts[0] + (parts[1] ? `, ${parts[1].trim()}` : '') + (parts[2] ? `, ${parts[2].trim()}` : '');
            return {
              id: `custom_${item.lat}_${item.lon}`,
              name: shortName,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon)
            };
          }));
        }
      } catch (error) {
        console.error("Error fetching geocoding", error);
      } finally {
        setIsLoadingOrigin(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [originSearch]);

  // Effetto per cercare vie in Grecia in tempo reale (de-bounced) per l'Arrivo
  useEffect(() => {
    const query = destSearch.trim();
    if (query.length < 3) {
      setDestApiSuggestions([]);
      return;
    }
    
    // Se corrisponde a una delle stazioni offline, non chiamiamo l'API
    const offlineMatch = Object.values(ROME_STATIONS).some(
      s => s.nameIt.toLowerCase() === query.toLowerCase()
    );
    if (offlineMatch) return;

    const timer = setTimeout(async () => {
      setIsLoadingDest(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}, Greece&format=json&limit=5`,
          { headers: { 'User-Agent': 'ChelonaVaultApp/1.13.48' } }
        );
        const data = await response.json();
        if (Array.isArray(data)) {
          setDestApiSuggestions(data.map(item => {
            const parts = item.display_name.split(',');
            const shortName = parts[0] + (parts[1] ? `, ${parts[1].trim()}` : '') + (parts[2] ? `, ${parts[2].trim()}` : '');
            return {
              id: `custom_${item.lat}_${item.lon}`,
              name: shortName,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon)
            };
          }));
        }
      } catch (error) {
        console.error("Error fetching geocoding", error);
      } finally {
        setIsLoadingDest(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [destSearch]);




  const handleSelectOrigin = (id: string, name: string) => {
    setOrigin(id);
    setOriginSearch(name);
    setShowOriginSuggestions(false);
    if (id.startsWith('custom_')) {
      const parts = id.split('_');
      setCustomOriginCoords({
        lat: parseFloat(parts[1]),
        lng: parseFloat(parts[2]),
        name: name
      });
    }
  };

  const handleSelectDest = (id: string, name: string) => {
    setDestination(id);
    setDestSearch(name);
    setShowDestSuggestions(false);
    if (id.startsWith('custom_')) {
      const parts = id.split('_');
      setCustomDestCoords({
        lat: parseFloat(parts[1]),
        lng: parseFloat(parts[2]),
        name: name
      });
    }
  };

  // Liste delle suggest per autocompletamento
  const originSuggestions = useMemo(() => {
    const query = originSearch.toLowerCase().trim();
    if (!query) {
      return [
        ...Object.values(ROME_STATIONS).slice(0, 4).map(s => ({ id: s.id, name: s.nameIt, isStation: true })),
        ...Object.values(ROME_STREETS).slice(0, 4).map(s => ({ id: `street_${s.id}`, name: s.nameIt, isStation: false }))
      ];
    }
    
    const matchedStations = Object.values(ROME_STATIONS)
      .filter(s => s.nameIt.toLowerCase().includes(query) || s.nameEl.toLowerCase().includes(query))
      .map(s => ({ id: s.id, name: s.nameIt, isStation: true }));

    const matchedStreets = Object.values(ROME_STREETS)
      .filter(s => s.nameIt.toLowerCase().includes(query) || s.nameEl.toLowerCase().includes(query))
      .map(s => ({ id: `street_${s.id}`, name: s.nameIt, isStation: false }));

    const apiMatched = originApiSuggestions.map(item => ({
      id: item.id,
      name: item.name,
      isStation: false,
      isApi: true
    }));

    return [...matchedStations, ...matchedStreets, ...apiMatched].slice(0, 8);
  }, [originSearch, originApiSuggestions]);

  const destSuggestions = useMemo(() => {
    const query = destSearch.toLowerCase().trim();
    if (!query) {
      return [
        ...Object.values(ROME_STATIONS).slice(0, 4).map(s => ({ id: s.id, name: s.nameIt, isStation: true })),
        ...Object.values(ROME_STREETS).slice(0, 4).map(s => ({ id: `street_${s.id}`, name: s.nameIt, isStation: false }))
      ];
    }
    
    const matchedStations = Object.values(ROME_STATIONS)
      .filter(s => s.nameIt.toLowerCase().includes(query) || s.nameEl.toLowerCase().includes(query))
      .map(s => ({ id: s.id, name: s.nameIt, isStation: true }));

    const matchedStreets = Object.values(ROME_STREETS)
      .filter(s => s.nameIt.toLowerCase().includes(query) || s.nameEl.toLowerCase().includes(query))
      .map(s => ({ id: `street_${s.id}`, name: s.nameIt, isStation: false }));

    const apiMatched = destApiSuggestions.map(item => ({
      id: item.id,
      name: item.name,
      isStation: false,
      isApi: true
    }));

    return [...matchedStations, ...matchedStreets, ...apiMatched].slice(0, 8);
  }, [destSearch, destApiSuggestions]);



  // Stato per i percorsi preferiti
  const [favorites, setFavorites] = useState<{ id: string; origin: string; destination: string; originName: string; destinationName: string }[]>(() => {
    try {
      const saved = localStorage.getItem('chelona_rome_fav_routes');
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
      const originName = ROME_STATIONS[origId]?.nameIt || origId;
      const destinationName = ROME_STATIONS[destId]?.nameIt || destId;
      newFavs = [...favorites, { id: favId, origin: origId, destination: destId, originName, destinationName }];
    }
    setFavorites(newFavs);
    localStorage.setItem('chelona_rome_fav_routes', JSON.stringify(newFavs));
  };

  const isFavorite = (origId: string, destId: string) => {
    return favorites.some(f => f.id === `${origId}-${destId}`);
  };


  const resolveStationId = (val: string): string => {
    if (val.startsWith('street_')) {
      const streetId = val.replace('street_', '');
      const street = ROME_STREETS[streetId];
      if (street) {
        let closestId = 'syntagma';
        let minDistance = Infinity;
        Object.entries(ROME_STATIONS).forEach(([stId, station]) => {
          const dLat = station.lat - street.lat;
          const dLng = station.lng - street.lng;
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);
          if (dist < minDistance) {
            minDistance = dist;
            closestId = stId;
          }
        });
        return closestId;
      }
    } else if (val.startsWith('custom_')) {
      const parts = val.split('_');
      const lat = parseFloat(parts[1]);
      const lng = parseFloat(parts[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        let closestId = 'syntagma';
        let minDistance = Infinity;
        Object.entries(ROME_STATIONS).forEach(([stId, station]) => {
          const dLat = station.lat - lat;
          const dLng = station.lng - lng;
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);
          if (dist < minDistance) {
            minDistance = dist;
            closestId = stId;
          }
        });
        return closestId;
      }
    }
    return val;
  };

  const getDistanceInMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const dLat = lat2 - lat1;
    const dLng = (lng2 - lng1) * Math.cos(lat1 * Math.PI / 180);
    return Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 111000);
  };

  const getCoords = (id: string, customCoords: any) => {
    if (id.startsWith('street_')) {
      const streetId = id.replace('street_', '');
      const street = ROME_STREETS[streetId];
      if (street) return { lat: street.lat, lng: street.lng };
    } else if (id.startsWith('custom_')) {
      const parts = id.split('_');
      return { lat: parseFloat(parts[1]), lng: parseFloat(parts[2]) };
    } else {
      const station = ROME_STATIONS[id];
      if (station) return { lat: station.lat, lng: station.lng };
    }
    return { lat: 41.9028, lng: 12.4964 }; // Centro di Roma default
  };

  // 4. ALGORITMO BFS LOCALE PER CALCOLARE I PERCORSI METRO INTERAMENTE OFFLINE
  const calculatedRoute = useMemo(() => {
    if (!origin || !destination) return null;
    const resolvedOrigin = resolveStationId(origin);
    const resolvedDestination = resolveStationId(destination);

    if (resolvedOrigin === resolvedDestination) {
      return {
        path: [ROME_STATIONS[resolvedOrigin]],
        stops: 0,
        transfers: [],
        time: 0,
        resolvedOrigin,
        resolvedDestination
      };
    }

    // Costruiamo la mappa di adiacenza
    const adjList: Record<string, string[]> = {};
    Object.keys(ROME_STATIONS).forEach(id => {
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
    const queue: string[][] = [[resolvedOrigin]];
    const visited = new Set<string>([resolvedOrigin]);

    let pathFound: string[] | null = null;

    while (queue.length > 0) {
      const currentPath = queue.shift()!;
      const lastNode = currentPath[currentPath.length - 1];

      if (lastNode === resolvedDestination) {
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
    const stationsPath = pathFound.map(id => ROME_STATIONS[id]);

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
      time: estimatedTime,
      resolvedOrigin,
      resolvedDestination
    };
  }, [origin, destination]);


  // Lista stazioni per i selector
  const selectorStations = useMemo(() => {
    return Object.values(ROME_STATIONS).sort((a, b) => a.nameIt.localeCompare(b.nameIt));
  }, []);

  // Ricerca bus
  const filteredBuses = useMemo(() => {
    if (!busSearch.trim()) return POPULAR_ROME_BUSES;
    const query = busSearch.toLowerCase();
    return POPULAR_ROME_BUSES.filter(b => 
      b.code.toLowerCase().includes(query) || 
      b.name.toLowerCase().includes(query) || 
      b.origin.toLowerCase().includes(query) || 
      b.destination.toLowerCase().includes(query)
    );
  }, [busSearch]);

  // Consiglia autobus utili in base al percorso calcolato
  const recommendedBuses = useMemo(() => {
    if (!calculatedRoute) return [];
    
    // Raccogliamo i termini di ricerca (stazioni del percorso, via partenza, via arrivo)
    const terms = new Set<string>();
    
    // Aggiungiamo i nomi delle stazioni sul percorso metro
    calculatedRoute.path.forEach(station => {
      terms.add(station.nameIt.toLowerCase());
      terms.add(station.nameEl.toLowerCase());
      // Rimuoviamo eventuali dettagli tra parentesi se presenti, es. "Pireo (Porto)" -> "pireo"
      const cleanIt = station.nameIt.split('(')[0].trim().toLowerCase();
      if (cleanIt.length > 2) terms.add(cleanIt);
    });

    // Aggiungiamo i nomi cercati di partenza e arrivo
    const cleanOrigin = originSearch.split(',')[0].split('(')[0].trim().toLowerCase();
    if (cleanOrigin.length > 2) terms.add(cleanOrigin);
    const cleanDest = destSearch.split(',')[0].split('(')[0].trim().toLowerCase();
    if (cleanDest.length > 2) terms.add(cleanDest);

    // Seleziona i bus che hanno una fermata o un capolinea/descrizione correlati ai termini
    return POPULAR_ROME_BUSES.filter(bus => {
      // 1. Controlla le fermate del bus
      const matchesStop = bus.stops.some(stop => {
        const stopLower = stop.toLowerCase();
        return Array.from(terms).some(term => 
          stopLower.includes(term) || term.includes(stopLower)
        );
      });

      // 2. Controlla origine/destinazione/descrizione del bus
      const matchesMeta = Array.from(terms).some(term => 
        bus.name.toLowerCase().includes(term) || 
        bus.origin.toLowerCase().includes(term) || 
        bus.destination.toLowerCase().includes(term) ||
        bus.description.toLowerCase().includes(term)
      );

      return matchesStop || matchesMeta;
    });
  }, [calculatedRoute, originSearch, destSearch]);

  const activeStationData = selectedStation ? ROME_STATIONS[selectedStation] : null;

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
                    const st = ROME_STATIONS[stationId];
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
                          Stazione residenziale di transito. Connette i vari quartieri urbani dell'area metropolitana di Roma.
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
                        setOriginSearch(fav.originName);
                        setDestination(fav.destination);
                        setDestSearch(fav.destinationName);
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
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">
                  Pianifica il tuo tragitto nella metro
                </h3>
                <button
                  onClick={() => toggleFavorite(origin, destination)}
                  className={`flex items-center justify-center p-2 rounded-xl transition-all active:scale-95 ${
                    isFavorite(origin, destination)
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                      : 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/30 hover:bg-cyan-500/20'
                  }`}
                  title={isFavorite(origin, destination) ? 'Rimuovi dai Preferiti' : 'Salva nei Preferiti'}
                >
                  <Star className={`w-4 h-4 ${isFavorite(origin, destination) ? 'fill-amber-500 text-amber-500' : ''}`} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
                
                {/* Partenza */}
                <div className="space-y-1 relative">
                  <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block pl-1">Partenza (Stazione o Via)</label>
                  <input
                    type="text"
                    value={originSearch}
                    onChange={(e) => {
                      setOriginSearch(e.target.value);
                      setShowOriginSuggestions(true);
                      
                      // Cerca corrispondenza esatta al volo per aggiornare lo stato interno
                      const query = e.target.value.toLowerCase().trim();
                      const bestMatch = [
                        ...Object.values(ROME_STATIONS).map(s => ({ id: s.id, name: s.nameIt })),
                        ...Object.values(ROME_STREETS).map(s => ({ id: `street_${s.id}`, name: s.nameIt }))
                      ].find(item => item.name.toLowerCase() === query);
                      
                      if (bestMatch) {
                        setOrigin(bestMatch.id);
                      }
                    }}
                    onFocus={() => setShowOriginSuggestions(true)}
                    onBlur={() => {
                      setTimeout(() => setShowOriginSuggestions(false), 250);
                    }}
                    placeholder="Esempio: Ermou, Pireo, Omonia..."
                    className="w-full bg-[var(--bg)] text-[var(--text-main)] border border-[var(--border)] focus:border-cyan-500 p-3 rounded-2xl text-xs font-bold outline-none transition-colors"
                  />
                  {showOriginSuggestions && originSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                      {originSuggestions.map(item => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectOrigin(item.id, item.name)}
                          className="px-4 py-2.5 hover:bg-[var(--surface-variant)] text-xs font-bold cursor-pointer transition-colors border-b border-[var(--border)] last:border-b-0 flex justify-between items-center"
                        >
                          <span>{item.isStation ? '🚉' : '🛣️'} {item.name}</span>
                          <span className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-wider bg-[var(--bg)] px-1.5 py-0.5 rounded-md border border-[var(--border)]">
                            {item.isStation ? 'Metro' : 'Via'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Arrivo */}
                <div className="space-y-1 relative">
                  <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider block pl-1">Arrivo (Stazione o Via)</label>
                  <input
                    type="text"
                    value={destSearch}
                    onChange={(e) => {
                      setDestSearch(e.target.value);
                      setShowDestSuggestions(true);
                      
                      // Cerca corrispondenza esatta al volo per aggiornare lo stato interno
                      const query = e.target.value.toLowerCase().trim();
                      const bestMatch = [
                        ...Object.values(ROME_STATIONS).map(s => ({ id: s.id, name: s.nameIt })),
                        ...Object.values(ROME_STREETS).map(s => ({ id: `street_${s.id}`, name: s.nameIt }))
                      ].find(item => item.name.toLowerCase() === query);
                      
                      if (bestMatch) {
                        setDestination(bestMatch.id);
                      }
                    }}
                    onFocus={() => setShowDestSuggestions(true)}
                    onBlur={() => {
                      setTimeout(() => setShowDestSuggestions(false), 250);
                    }}
                    placeholder="Esempio: Aeroporto, Acropoli, Plaka..."
                    className="w-full bg-[var(--bg)] text-[var(--text-main)] border border-[var(--border)] focus:border-cyan-500 p-3 rounded-2xl text-xs font-bold outline-none transition-colors"
                  />
                  {showDestSuggestions && destSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                      {destSuggestions.map(item => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectDest(item.id, item.name)}
                          className="px-4 py-2.5 hover:bg-[var(--surface-variant)] text-xs font-bold cursor-pointer transition-colors border-b border-[var(--border)] last:border-b-0 flex justify-between items-center"
                        >
                          <span>{item.isStation ? '🚉' : '🛣️'} {item.name}</span>
                          <span className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-wider bg-[var(--bg)] px-1.5 py-0.5 rounded-md border border-[var(--border)]">
                            {item.isStation ? 'Metro' : 'Via'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pulsante Inverti Direzione (Desktop) */}
                <button
                  onClick={() => {
                    const tempVal = origin;
                    const tempText = originSearch;
                    setOrigin(destination);
                    setOriginSearch(destSearch);
                    setDestination(tempVal);
                    setDestSearch(tempText);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl border border-cyan-400 shadow-md active:scale-90 transition-all shrink-0 hidden sm:block z-20"
                  title="Inverti Stazioni"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              </div>

              {/* Tasto Inverti per mobile */}
              <button
                onClick={() => {
                  const tempVal = origin;
                  const tempText = originSearch;
                  setOrigin(destination);
                  setOriginSearch(destSearch);
                  setDestination(tempVal);
                  setDestSearch(tempText);
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

                {/* Consigli Pedonali per le Vie di Roma */}
                {(origin.startsWith('street_') || origin.startsWith('custom_') || destination.startsWith('street_') || destination.startsWith('custom_')) && (
                  <div className="bg-[var(--bg)] p-3.5 rounded-2xl border border-[var(--border)] space-y-2.5 text-xs text-[var(--text-main)] font-medium">
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider pl-1">🏃 Indicazioni a Piedi Consigliate</p>
                    
                    {(origin.startsWith('street_') || origin.startsWith('custom_')) && (() => {
                      let lat = 0;
                      let lng = 0;
                      let name = '';
                      if (origin.startsWith('street_')) {
                        const streetId = origin.replace('street_', '');
                        const street = ROME_STREETS[streetId];
                        if (street) {
                          lat = street.lat;
                          lng = street.lng;
                          name = street.nameIt;
                        }
                      } else if (origin.startsWith('custom_')) {
                        const parts = origin.split('_');
                        lat = parseFloat(parts[1]);
                        lng = parseFloat(parts[2]);
                        name = customOriginCoords?.name || originSearch || 'Partenza selezionata';
                      }

                      const station = ROME_STATIONS[calculatedRoute.resolvedOrigin];
                      if (!station) return null;
                      const distance = getDistanceInMeters(lat, lng, station.lat, station.lng);
                      return (
                        <div className="flex gap-2.5 items-start pl-1">
                          <span className="text-cyan-500 text-sm">🚶</span>
                          <div>
                            <p className="font-bold">Partenza da {name}</p>
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-normal">
                              Cammina circa <strong className="text-cyan-500 font-black">{distance} metri</strong> per raggiungere la stazione della metro più vicina: <strong className="text-[var(--text-main)]">{station.nameIt}</strong>.
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {(destination.startsWith('street_') || destination.startsWith('custom_')) && (() => {
                      let lat = 0;
                      let lng = 0;
                      let name = '';
                      if (destination.startsWith('street_')) {
                        const streetId = destination.replace('street_', '');
                        const street = ROME_STREETS[streetId];
                        if (street) {
                          lat = street.lat;
                          lng = street.lng;
                          name = street.nameIt;
                        }
                      } else if (destination.startsWith('custom_')) {
                        const parts = destination.split('_');
                        lat = parseFloat(parts[1]);
                        lng = parseFloat(parts[2]);
                        name = customDestCoords?.name || destSearch || 'Destinazione selezionata';
                      }

                      const station = ROME_STATIONS[calculatedRoute.resolvedDestination];
                      if (!station) return null;
                      const distance = getDistanceInMeters(station.lat, station.lng, lat, lng);
                      return (
                        <div className="flex gap-2.5 items-start pl-1 border-t border-[var(--border)] pt-2.5">
                          <span className="text-amber-500 text-sm">🚶</span>
                          <div>
                            <p className="font-bold">Arrivo a {name}</p>
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-normal">
                              Scendi alla stazione <strong className="text-[var(--text-main)]">{station.nameIt}</strong> e cammina circa <strong className="text-amber-500 font-black">{distance} metri</strong> per raggiungere la via di destinazione.
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Timeline Grafica delle Fermate */}
                <div className="space-y-3">

                  <div className="flex justify-between items-center px-1">
                    <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">
                      Dettaglio del Percorso
                    </h4>
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

                {/* Collegamenti Bus Consigliati */}
                {recommendedBuses.length > 0 && (
                  <div className="bg-[var(--bg)] p-3.5 rounded-2xl border border-[var(--border)] space-y-2.5 text-xs text-[var(--text-main)] font-medium">
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider pl-1 flex items-center gap-1.5">
                      <span>🚌</span> Collegamenti Bus Consigliati
                    </p>
                    
                    <div className="space-y-2">
                      {recommendedBuses.map((bus) => (
                        <div 
                          key={bus.code} 
                          className="bg-[var(--card-bg)] p-3 rounded-xl border border-[var(--border)] flex justify-between items-start gap-3 hover:border-cyan-500/50 transition-all cursor-pointer"
                          onClick={() => {
                            setBusSearch(bus.code);
                            setActiveTab('buses');
                          }}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 rounded-lg flex items-center justify-center font-black shrink-0 text-xs shadow-sm">
                              {bus.code}
                            </div>
                            <div>
                              <h5 className="text-[11px] font-black text-[var(--text-main)] leading-normal">
                                {bus.name}
                              </h5>
                              <p className="text-[9px] text-[var(--text-muted)] mt-0.5 leading-normal">
                                Capolinea: <span className="font-bold">{bus.origin} ↔ {bus.destination}</span>
                              </p>
                            </div>
                          </div>
                          <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                            {bus.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottone Navigazione Reale */}
                {(() => {
                  const oCoords = getCoords(origin, customOriginCoords);
                  const dCoords = getCoords(destination, customDestCoords);
                  return (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${oCoords.lat},${oCoords.lng}&destination=${dCoords.lat},${dCoords.lng}&travelmode=transit`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-tr from-cyan-500 to-blue-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-cyan-500/20 active:scale-[0.98] hover:brightness-110 transition-all text-center"
                    >
                      <Navigation className="w-4 h-4 shrink-0" />
                      Visualizza Navigazione Live (Google Maps)
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  );
                })()}

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
                Cerca o seleziona una linea bus ad Roma
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

                    {/* Bottone Navigatore su ATAC Telematics */}
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

            {/* Card ATAC Telematics Live */}
            <div className="bg-gradient-to-tr from-cyan-900 to-blue-900 text-white rounded-3xl border border-cyan-800 p-5 shadow-lg relative overflow-hidden space-y-3">
              {/* Background design elements */}
              <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-xl" />
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white shrink-0 border border-white/20">
                  <ExternalLink className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-cyan-300">Live ATAC Telematics</h4>
                  <p className="text-[9px] text-white/70">Senza credenziali o token</p>
                </div>
              </div>

              <p className="text-[11px] leading-relaxed text-white/80">
                Vuoi vedere dove si trovano i bus di Roma in tempo reale e controllare i tabelloni elettronici di attesa di qualsiasi fermata? Utilizza il portale ufficiale di telemetria mobile di Roma.
              </p>

              <div className="pt-1">
                <a 
                  href="http://telematics.oasa.gr/" 
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-[0.98] shadow-md shadow-cyan-950/20 text-center"
                >
                  <Bus className="w-4 h-4 shrink-0" />
                  Apri Telemetria Live ATAC
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
                  <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Scarica la piantina ufficiale del gestore di Roma.</p>
                </div>
              </div>

              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Puoi consultare e scaricare la piantina ufficiale della metropolitana di Roma in formato PDF sul tuo smartphone per averla sempre disponibile anche in assenza di segnale o sotto i tunnel sotterranei delle stazioni.
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

              {/* Rappresentazione grafica SVG interattiva del centro di Roma */}
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
                    <h4 className="text-xs font-black text-[var(--text-main)] mt-0.5">{ROME_STATIONS[selectedStation].nameIt}</h4>
                    <p className="text-[9px] text-[var(--text-muted)] font-bold">{ROME_STATIONS[selectedStation].nameEl}</p>
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
