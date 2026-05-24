import { generateUUID } from '../utils/uuid';

export interface BusStop {
  name: string;
  description: string;
  coords: { lat: number; lng: number };
  mapsUrl: string;
}

export interface BusTrip {
  time: string; // e.g. "10:15"
  price: string; // e.g. "1.80€"
  duration: string; // e.g. "20 min"
  originStop: BusStop;
  destinationStop: BusStop;
  directionsUrl: string;
}

export interface BusRoute {
  id: string;
  title: string; // e.g. "Egina - Perdika - Marathonas"
  destinationName: string; // e.g. "Perdika"
  dayType: 'weekdays' | 'weekends'; // weekdays (Lunedì - Venerdì) or weekends (Sabato - Domenica)
  departureTimes: string[]; // From Aegina, e.g. ["10:30", "11:30"]
  returnTimes: string[]; // From Destination, e.g. ["10:50", "11:50"]
  departureTrips: BusTrip[]; // Rich detail for each departure
  returnTrips: BusTrip[]; // Rich detail for each return
}

export interface AeginaTransportData {
  lastUpdated: string; // e.g. "19 Maggio 2026"
  routes: BusRoute[];
}

// 1. Definiamo le fermate predefinite con le relative coordinate e info
export const BUS_STOPS: Record<string, BusStop> = {
  aegina: {
    name: 'Capolinea Centrale KTEL Egina (Porto)',
    description: 'Situato proprio di fronte al porto di Egina Town, accanto alla biglietteria principale.',
    coords: { lat: 37.747065, lng: 23.426188 },
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=37.747065,23.426188'
  },
  perdika: {
    name: 'Fermata Autobus Perdika',
    description: 'Situato vicino al porto turistico e ai famosi ristoranti di pesce di Perdika.',
    coords: { lat: 37.6917, lng: 23.4522 },
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=37.6917,23.4522'
  },
  souvala: {
    name: 'Fermata Autobus Souvala',
    description: 'Nei pressi del porto e della spiaggia di Souvala.',
    coords: { lat: 37.7717, lng: 23.4912 },
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=37.7717,23.4912'
  },
  vagia: {
    name: 'Fermata Autobus Vagia',
    description: 'Vicino alla spiaggia e all\'area degli hotel a Vagia.',
    coords: { lat: 37.7731, lng: 23.5186 },
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=37.7731,23.5186'
  },
  nektarios: {
    name: 'Fermata Monastero San Nettario',
    description: 'Direttamente di fronte all\'ingresso del maestoso Monastero di San Nettario (Agios Nektarios).',
    coords: { lat: 37.7483, lng: 23.4833 },
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=37.7483,23.4833'
  },
  marina: {
    name: 'Fermata Agia Marina',
    description: 'All\'incrocio principale nei pressi della spiaggia sabbiosa di Agia Marina.',
    coords: { lat: 37.7411, lng: 23.5350 },
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=37.7411,23.5350'
  },
  aphaia: {
    name: 'Fermata Tempio di Afaia',
    description: 'Accanto all\'ingresso principale del sito archeologico del Tempio di Afaia.',
    coords: { lat: 37.7547, lng: 23.5332 },
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=37.7547,23.5332'
  }
};

// Helper per calcolare i dettagli del viaggio ed il link Maps
function createBusTrip(time: string, origin: BusStop, dest: BusStop, price = '2.00€', duration = '20 min'): BusTrip {
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.coords.lat},${origin.coords.lng}&destination=${dest.coords.lat},${dest.coords.lng}&travelmode=transit`;
  return {
    time,
    price,
    duration,
    originStop: origin,
    destinationStop: dest,
    directionsUrl
  };
}

// 2. Database locale pre-caricato di fallback (Maggio 2026)
export const FALLBACK_TRANSPORT_DATA: AeginaTransportData = {
  lastUpdated: '23 Maggio 2026',
  routes: [
    // --- WEEKDAYS (Lunedì - Venerdì) ---
    {
      id: 'wk-souvala',
      title: 'Egina - Souvala - Vagia',
      destinationName: 'Souvala - Vagia',
      dayType: 'weekdays',
      departureTimes: ['10:15', '14:30'],
      returnTimes: ['07:00', '10:45', '15:00'],
      departureTrips: [
        createBusTrip('10:15', BUS_STOPS.aegina, BUS_STOPS.vagia, '2.00€', '25 min'),
        createBusTrip('14:30', BUS_STOPS.aegina, BUS_STOPS.vagia, '2.00€', '25 min')
      ],
      returnTrips: [
        createBusTrip('07:00', BUS_STOPS.vagia, BUS_STOPS.aegina, '2.00€', '25 min'),
        createBusTrip('10:45', BUS_STOPS.vagia, BUS_STOPS.aegina, '2.00€', '25 min'),
        createBusTrip('15:00', BUS_STOPS.vagia, BUS_STOPS.aegina, '2.00€', '25 min')
      ]
    },
    {
      id: 'wk-nektarios',
      title: 'Egina - Agios Nektarios (San Nettario)',
      destinationName: 'Agios Nektarios',
      dayType: 'weekdays',
      departureTimes: ['07:00', '09:30', '10:15', '11:00', '12:00', '13:00', '14:30'],
      returnTimes: ['07:50', '09:45', '11:05', '11:55', '12:55', '15:20'],
      departureTrips: [
        createBusTrip('07:00', BUS_STOPS.aegina, BUS_STOPS.nektarios, '1.80€', '15 min'),
        createBusTrip('09:30', BUS_STOPS.aegina, BUS_STOPS.nektarios, '1.80€', '15 min'),
        createBusTrip('10:15', BUS_STOPS.aegina, BUS_STOPS.nektarios, '1.80€', '15 min'),
        createBusTrip('11:00', BUS_STOPS.aegina, BUS_STOPS.nektarios, '1.80€', '15 min'),
        createBusTrip('12:00', BUS_STOPS.aegina, BUS_STOPS.nektarios, '1.80€', '15 min'),
        createBusTrip('13:00', BUS_STOPS.aegina, BUS_STOPS.nektarios, '1.80€', '15 min'),
        createBusTrip('14:30', BUS_STOPS.aegina, BUS_STOPS.nektarios, '1.80€', '15 min')
      ],
      returnTrips: [
        createBusTrip('07:50', BUS_STOPS.nektarios, BUS_STOPS.aegina, '1.80€', '15 min'),
        createBusTrip('09:45', BUS_STOPS.nektarios, BUS_STOPS.aegina, '1.80€', '15 min'),
        createBusTrip('11:05', BUS_STOPS.nektarios, BUS_STOPS.aegina, '1.80€', '15 min'),
        createBusTrip('11:55', BUS_STOPS.nektarios, BUS_STOPS.aegina, '1.80€', '15 min'),
        createBusTrip('12:55', BUS_STOPS.nektarios, BUS_STOPS.aegina, '1.80€', '15 min'),
        createBusTrip('15:20', BUS_STOPS.nektarios, BUS_STOPS.aegina, '1.80€', '15 min')
      ]
    },
    {
      id: 'wk-marina',
      title: 'Egina - Agia Marina',
      destinationName: 'Agia Marina',
      dayType: 'weekdays',
      departureTimes: ['07:00', '10:15', '11:00', '12:00', '14:30'],
      returnTimes: ['07:30', '10:55', '11:30', '12:30', '15:10'],
      departureTrips: [
        createBusTrip('07:00', BUS_STOPS.aegina, BUS_STOPS.marina, '2.00€', '30 min'),
        createBusTrip('10:15', BUS_STOPS.aegina, BUS_STOPS.marina, '2.00€', '30 min'),
        createBusTrip('11:00', BUS_STOPS.aegina, BUS_STOPS.marina, '2.00€', '30 min'),
        createBusTrip('12:00', BUS_STOPS.aegina, BUS_STOPS.marina, '2.00€', '30 min'),
        createBusTrip('14:30', BUS_STOPS.aegina, BUS_STOPS.marina, '2.00€', '30 min')
      ],
      returnTrips: [
        createBusTrip('07:30', BUS_STOPS.marina, BUS_STOPS.aegina, '2.00€', '30 min'),
        createBusTrip('10:55', BUS_STOPS.marina, BUS_STOPS.aegina, '2.00€', '30 min'),
        createBusTrip('11:30', BUS_STOPS.marina, BUS_STOPS.aegina, '2.00€', '30 min'),
        createBusTrip('12:30', BUS_STOPS.marina, BUS_STOPS.aegina, '2.00€', '30 min'),
        createBusTrip('15:10', BUS_STOPS.marina, BUS_STOPS.aegina, '2.00€', '30 min')
      ]
    },
    {
      id: 'wk-aphaia',
      title: 'Egina - Tempio di Afaia',
      destinationName: 'Tempio di Afaia',
      dayType: 'weekdays',
      departureTimes: ['07:00', '10:15', '11:00', '12:00', '14:30'],
      returnTimes: ['07:40', '11:00', '11:45', '12:40', '15:15'],
      departureTrips: [
        createBusTrip('07:00', BUS_STOPS.aegina, BUS_STOPS.aphaia, '2.00€', '25 min'),
        createBusTrip('10:15', BUS_STOPS.aegina, BUS_STOPS.aphaia, '2.00€', '25 min'),
        createBusTrip('11:00', BUS_STOPS.aegina, BUS_STOPS.aphaia, '2.00€', '25 min'),
        createBusTrip('12:00', BUS_STOPS.aegina, BUS_STOPS.aphaia, '2.00€', '25 min'),
        createBusTrip('14:30', BUS_STOPS.aegina, BUS_STOPS.aphaia, '2.00€', '25 min')
      ],
      returnTrips: [
        createBusTrip('07:40', BUS_STOPS.aphaia, BUS_STOPS.aegina, '2.00€', '25 min'),
        createBusTrip('11:00', BUS_STOPS.aphaia, BUS_STOPS.aegina, '2.00€', '25 min'),
        createBusTrip('11:45', BUS_STOPS.aphaia, BUS_STOPS.aegina, '2.00€', '25 min'),
        createBusTrip('12:40', BUS_STOPS.aphaia, BUS_STOPS.aegina, '2.00€', '25 min'),
        createBusTrip('15:15', BUS_STOPS.aphaia, BUS_STOPS.aegina, '2.00€', '25 min')
      ]
    },
    {
      id: 'wk-perdika',
      title: 'Egina - Perdika - Marathonas',
      destinationName: 'Perdika',
      dayType: 'weekdays',
      departureTimes: ['07:30', '11:30', '14:30'],
      returnTimes: ['07:50', '11:50', '14:50'],
      departureTrips: [
        createBusTrip('07:30', BUS_STOPS.aegina, BUS_STOPS.perdika, '1.80€', '20 min'),
        createBusTrip('11:30', BUS_STOPS.aegina, BUS_STOPS.perdika, '1.80€', '20 min'),
        createBusTrip('14:30', BUS_STOPS.aegina, BUS_STOPS.perdika, '1.80€', '20 min')
      ],
      returnTrips: [
        createBusTrip('07:50', BUS_STOPS.perdika, BUS_STOPS.aegina, '1.80€', '20 min'),
        createBusTrip('11:50', BUS_STOPS.perdika, BUS_STOPS.aegina, '1.80€', '20 min'),
        createBusTrip('14:50', BUS_STOPS.perdika, BUS_STOPS.aegina, '1.80€', '20 min')
      ]
    },

    // --- WEEKENDS (Sabato - Domenica) ---
    {
      id: 'we-souvala',
      title: 'Egina - Souvala - Vagia',
      destinationName: 'Souvala - Vagia',
      dayType: 'weekends',
      departureTimes: ['10:15', '13:00'],
      returnTimes: ['10:45', '13:25'],
      departureTrips: [
        createBusTrip('10:15', BUS_STOPS.aegina, BUS_STOPS.vagia, '2.00€', '25 min'),
        createBusTrip('13:00', BUS_STOPS.aegina, BUS_STOPS.vagia, '2.00€', '25 min')
      ],
      returnTrips: [
        createBusTrip('10:45', BUS_STOPS.vagia, BUS_STOPS.aegina, '2.00€', '25 min'),
        createBusTrip('13:25', BUS_STOPS.vagia, BUS_STOPS.aegina, '2.00€', '25 min')
      ]
    },
    {
      id: 'we-nektarios',
      title: 'Egina - Agios Nektarios (San Nettario)',
      destinationName: 'Agios Nektarios',
      dayType: 'weekends',
      departureTimes: ['09:30', '10:15', '11:00', '12:00', '13:00', '13:45', '14:30', '16:00'],
      returnTimes: ['09:50', '11:15', '12:00', '13:00', '14:00', '15:30', '16:50'],
      departureTrips: [
        createBusTrip('09:30', BUS_STOPS.aegina, BUS_STOPS.nektarios, '1.80€', '15 min'),
        createBusTrip('10:15', BUS_STOPS.aegina, BUS_STOPS.nektarios, '1.80€', '15 min'),
        createBusTrip('11:00', BUS_STOPS.aegina, BUS_STOPS.nektarios, '1.80€', '15 min'),
        createBusTrip('12:00', BUS_STOPS.aegina, BUS_STOPS.nektarios, '1.80€', '15 min'),
        createBusTrip('13:00', BUS_STOPS.aegina, BUS_STOPS.nektarios, '1.80€', '15 min'),
        createBusTrip('13:45', BUS_STOPS.aegina, BUS_STOPS.nektarios, '1.80€', '15 min'),
        createBusTrip('14:30', BUS_STOPS.aegina, BUS_STOPS.nektarios, '1.80€', '15 min'),
        createBusTrip('16:00', BUS_STOPS.aegina, BUS_STOPS.nektarios, '1.80€', '15 min')
      ],
      returnTrips: [
        createBusTrip('09:50', BUS_STOPS.nektarios, BUS_STOPS.aegina, '1.80€', '15 min'),
        createBusTrip('11:15', BUS_STOPS.nektarios, BUS_STOPS.aegina, '1.80€', '15 min'),
        createBusTrip('12:00', BUS_STOPS.nektarios, BUS_STOPS.aegina, '1.80€', '15 min'),
        createBusTrip('13:00', BUS_STOPS.nektarios, BUS_STOPS.aegina, '1.80€', '15 min'),
        createBusTrip('14:00', BUS_STOPS.nektarios, BUS_STOPS.aegina, '1.80€', '15 min'),
        createBusTrip('15:30', BUS_STOPS.nektarios, BUS_STOPS.aegina, '1.80€', '15 min'),
        createBusTrip('16:50', BUS_STOPS.nektarios, BUS_STOPS.aegina, '1.80€', '15 min')
      ]
    },
    {
      id: 'we-marina',
      title: 'Egina - Agia Marina',
      destinationName: 'Agia Marina',
      dayType: 'weekends',
      departureTimes: ['10:15', '11:00', '12:00', '13:00', '14:30', '16:00'],
      returnTimes: ['11:00', '11:40', '12:40', '13:40', '15:15', '16:30'],
      departureTrips: [
        createBusTrip('10:15', BUS_STOPS.aegina, BUS_STOPS.marina, '2.00€', '30 min'),
        createBusTrip('11:00', BUS_STOPS.aegina, BUS_STOPS.marina, '2.00€', '30 min'),
        createBusTrip('12:00', BUS_STOPS.aegina, BUS_STOPS.marina, '2.00€', '30 min'),
        createBusTrip('13:00', BUS_STOPS.aegina, BUS_STOPS.marina, '2.00€', '30 min'),
        createBusTrip('14:30', BUS_STOPS.aegina, BUS_STOPS.marina, '2.00€', '30 min'),
        createBusTrip('16:00', BUS_STOPS.aegina, BUS_STOPS.marina, '2.00€', '30 min')
      ],
      returnTrips: [
        createBusTrip('11:00', BUS_STOPS.marina, BUS_STOPS.aegina, '2.00€', '30 min'),
        createBusTrip('11:40', BUS_STOPS.marina, BUS_STOPS.aegina, '2.00€', '30 min'),
        createBusTrip('12:40', BUS_STOPS.marina, BUS_STOPS.aegina, '2.00€', '30 min'),
        createBusTrip('13:40', BUS_STOPS.marina, BUS_STOPS.aegina, '2.00€', '30 min'),
        createBusTrip('15:15', BUS_STOPS.marina, BUS_STOPS.aegina, '2.00€', '30 min'),
        createBusTrip('16:30', BUS_STOPS.marina, BUS_STOPS.aegina, '2.00€', '30 min')
      ]
    },
    {
      id: 'we-aphaia',
      title: 'Egina - Tempio di Afaia',
      destinationName: 'Tempio di Afaia',
      dayType: 'weekends',
      departureTimes: ['10:15', '11:00', '12:00', '13:00', '14:30', '16:00'],
      returnTimes: ['11:10', '11:50', '12:50', '13:50', '15:20', '16:40'],
      departureTrips: [
        createBusTrip('10:15', BUS_STOPS.aegina, BUS_STOPS.aphaia, '2.00€', '25 min'),
        createBusTrip('11:00', BUS_STOPS.aegina, BUS_STOPS.aphaia, '2.00€', '25 min'),
        createBusTrip('12:00', BUS_STOPS.aegina, BUS_STOPS.aphaia, '2.00€', '25 min'),
        createBusTrip('13:00', BUS_STOPS.aegina, BUS_STOPS.aphaia, '2.00€', '25 min'),
        createBusTrip('14:30', BUS_STOPS.aegina, BUS_STOPS.aphaia, '2.00€', '25 min'),
        createBusTrip('16:00', BUS_STOPS.aegina, BUS_STOPS.aphaia, '2.00€', '25 min')
      ],
      returnTrips: [
        createBusTrip('11:10', BUS_STOPS.aphaia, BUS_STOPS.aegina, '2.00€', '25 min'),
        createBusTrip('11:50', BUS_STOPS.aphaia, BUS_STOPS.aegina, '2.00€', '25 min'),
        createBusTrip('12:50', BUS_STOPS.aphaia, BUS_STOPS.aegina, '2.00€', '25 min'),
        createBusTrip('13:50', BUS_STOPS.aphaia, BUS_STOPS.aegina, '2.00€', '25 min'),
        createBusTrip('15:20', BUS_STOPS.aphaia, BUS_STOPS.aegina, '2.00€', '25 min'),
        createBusTrip('16:40', BUS_STOPS.aphaia, BUS_STOPS.aegina, '2.00€', '25 min')
      ]
    },
    {
      id: 'we-perdika',
      title: 'Egina - Perdika - Marathonas',
      destinationName: 'Perdika',
      dayType: 'weekends',
      departureTimes: ['10:30', '11:30', '13:00', '14:30', '16:00'],
      returnTimes: ['10:50', '11:50', '13:20', '14:50', '16:20'],
      departureTrips: [
        createBusTrip('10:30', BUS_STOPS.aegina, BUS_STOPS.perdika, '1.80€', '20 min'),
        createBusTrip('11:30', BUS_STOPS.aegina, BUS_STOPS.perdika, '1.80€', '20 min'),
        createBusTrip('13:00', BUS_STOPS.aegina, BUS_STOPS.perdika, '1.80€', '20 min'),
        createBusTrip('14:30', BUS_STOPS.aegina, BUS_STOPS.perdika, '1.80€', '20 min'),
        createBusTrip('16:00', BUS_STOPS.aegina, BUS_STOPS.perdika, '1.80€', '20 min')
      ],
      returnTrips: [
        createBusTrip('10:50', BUS_STOPS.perdika, BUS_STOPS.aegina, '1.80€', '20 min'),
        createBusTrip('11:50', BUS_STOPS.perdika, BUS_STOPS.aegina, '1.80€', '20 min'),
        createBusTrip('13:20', BUS_STOPS.perdika, BUS_STOPS.aegina, '1.80€', '20 min'),
        createBusTrip('14:50', BUS_STOPS.perdika, BUS_STOPS.aegina, '1.80€', '20 min'),
        createBusTrip('16:20', BUS_STOPS.perdika, BUS_STOPS.aegina, '1.80€', '20 min')
      ]
    }
  ]
};

// Funzione di utilità per tradurre il testo dei mesi greci in italiano
function translateGreekDate(greekDate: string): string {
  let date = greekDate.replace("Τελευταία ενημέρωση :", "").trim();
  const months: Record<string, string> = {
    'Ιαν': 'Gennaio',
    'Φεβ': 'Febbraio',
    'Μάρ': 'Marzo',
    'Μαρ': 'Marzo',
    'Απρ': 'Aprile',
    'Μάι': 'Maggio',
    'Μαι': 'Maggio',
    'Ιούν': 'Giugno',
    'Ιουν': 'Giugno',
    'Ιούλ': 'Luglio',
    'Ιουλ': 'Luglio',
    'Αυγ': 'Agosto',
    'Σεπ': 'Settembre',
    'Οκτ': 'Ottobre',
    'Νοέ': 'Novembre',
    'Νοε': 'Novembre',
    'Δεκ': 'Dicembre'
  };
  for (const [gr, it] of Object.entries(months)) {
    if (date.includes(gr)) {
      date = date.replace(gr, it);
      break;
    }
  }
  return date;
}

// Mappatura delle tratte in italiano e relativi capolinea di arrivo/partenza
const ROUTES_MAP: Record<number, { title: string; destName: string; origin: BusStop; dest: BusStop; price: string; duration: string }> = {
  0: { title: 'Egina - Souvala - Vagia', destName: 'Souvala - Vagia', origin: BUS_STOPS.aegina, dest: BUS_STOPS.vagia, price: '2.00€', duration: '25 min' },
  1: { title: 'Egina - Agios Nektarios (San Nettario)', destName: 'Agios Nektarios', origin: BUS_STOPS.aegina, dest: BUS_STOPS.nektarios, price: '1.80€', duration: '15 min' },
  2: { title: 'Egina - Agia Marina', destName: 'Agia Marina', origin: BUS_STOPS.aegina, dest: BUS_STOPS.marina, price: '2.00€', duration: '30 min' },
  3: { title: 'Egina - Tempio di Afaia', destName: 'Tempio di Afaia', origin: BUS_STOPS.aegina, dest: BUS_STOPS.aphaia, price: '2.00€', duration: '25 min' },
  4: { title: 'Egina - Perdika - Marathonas', destName: 'Perdika', origin: BUS_STOPS.aegina, dest: BUS_STOPS.perdika, price: '1.80€', duration: '20 min' }
};

export async function fetchLiveAeginaTransport(): Promise<AeginaTransportData> {
  try {
    // Scarichiamo la pagina in tempo reale (Capacitor WebView gestisce fetch cross-origin bypassando CORS)
    const response = await fetch('https://www.aeginaportal.gr/ktel.html');
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const htmlText = await response.text();
    
    // Parsiamo l'HTML con il parser del browser
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    
    // Trova l'ultimo aggiornamento (se presente nel DOM)
    let lastUpdatedStr = FALLBACK_TRANSPORT_DATA.lastUpdated;
    const timeElem = doc.querySelector('time[itemprop="dateModified"]');
    if (timeElem && timeElem.textContent) {
      lastUpdatedStr = translateGreekDate(timeElem.textContent);
    }
    
    // Trova tutti i wrapper degli orari (le tabelle)
    const ktelWrappers = Array.from(doc.querySelectorAll('.ktel-wrapper'));
    if (ktelWrappers.length === 0) {
      throw new Error('Nessuna tabella orari KTEL trovata nella pagina');
    }
    
    const parsedRoutes: BusRoute[] = [];
    
    // Iteriamo sui wrapper delle tabelle
    ktelWrappers.forEach((wrapper) => {
      // Determiniamo il tipo di giorno (feriali o festivi) dall'H2 sovrastante la tabella
      const h2 = wrapper.querySelector('h2');
      if (!h2) return;
      
      const titleText = h2.textContent || '';
      let dayType: 'weekdays' | 'weekends' = 'weekdays';
      if (titleText.includes('ΣΑΒΒΑΤΟ') || titleText.includes('SATURDAY')) {
        dayType = 'weekends';
      }
      
      // Parsiamo la tabella
      const table = wrapper.querySelector('table');
      if (!table) return;
      
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      
      // Creiamo un contenitore per ogni colonna di orari (la tabella ha 10 colonne)
      // Col 0: Souvala Dep (Aegina -> Vagia)
      // Col 1: Souvala Ret (Vagia -> Aegina)
      // Col 2: Nektarios Dep (Aegina -> Nektarios)
      // Col 3: Nektarios Ret (Nektarios -> Aegina)
      // Col 4: Marina Dep (Aegina -> Marina)
      // Col 5: Marina Ret (Marina -> Aegina)
      // Col 6: Aphaia Dep (Aegina -> Aphaia)
      // Col 7: Aphaia Ret (Aphaia -> Aegina)
      // Col 8: Perdika Dep (Aegina -> Perdika)
      // Col 9: Perdika Ret (Perdika -> Aegina)
      const timesByCol: string[][] = Array.from({ length: 10 }, () => []);
      
      rows.forEach((row) => {
        const tds = Array.from(row.querySelectorAll('td'));
        if (tds.length < 10) return; // riga non valida o parziale
        
        tds.forEach((td, colIdx) => {
          const time = (td.textContent || '').trim();
          if (time && time !== '-' && time !== '–') {
            // Controlla se è un orario valido formato HH:MM
            if (/^\d{2}:\d{2}$/.test(time)) {
              timesByCol[colIdx].push(time);
            }
          }
        });
      });
      
      // Adesso associamo le colonne alle 5 rotte
      for (let routeIdx = 0; routeIdx < 5; routeIdx++) {
        const routeMeta = ROUTES_MAP[routeIdx];
        const depCol = routeIdx * 2;
        const retCol = routeIdx * 2 + 1;
        
        const depTimes = timesByCol[depCol];
        const retTimes = timesByCol[retCol];
        
        // Creiamo i relativi oggetti BusTrip
        const departureTrips = depTimes.map(t => 
          createBusTrip(t, routeMeta.origin, routeMeta.dest, routeMeta.price, routeMeta.duration)
        );
        const returnTrips = retTimes.map(t => 
          createBusTrip(t, routeMeta.dest, routeMeta.origin, routeMeta.price, routeMeta.duration)
        );
        
        parsedRoutes.push({
          id: `${dayType === 'weekdays' ? 'wk' : 'we'}-${routeIdx}`,
          title: routeMeta.title,
          destinationName: routeMeta.destName,
          dayType,
          departureTimes: depTimes,
          returnTimes: retTimes,
          departureTrips,
          returnTrips
        });
      }
    });
    
    if (parsedRoutes.length === 0) {
      throw new Error('Impossibile estrarre orari strutturati dalle tabelle');
    }
    
    return {
      lastUpdated: lastUpdatedStr,
      routes: parsedRoutes
    };
  } catch (err) {
    console.warn('Aggiornamento orari KTEL da AeginaPortal fallito. Uso i dati offline di backup.', err);
    // In caso di errore, restituiamo i dati offline pre-caricati
    return FALLBACK_TRANSPORT_DATA;
  }
}
