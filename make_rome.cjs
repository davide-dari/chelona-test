const fs = require('fs');

let content = fs.readFileSync('src/components/AthensTransport.tsx', 'utf8');

// Replace component name and texts
content = content.replace(/AthensTransport/g, 'RomeTransport');
content = content.replace(/ATHENS_STATIONS/g, 'ROME_STATIONS');
content = content.replace(/POPULAR_ATHENS_BUSES/g, 'POPULAR_ROME_BUSES');
content = content.replace(/ATHENS_STREETS/g, 'ROME_STREETS');
content = content.replace(/AthensStreet/g, 'RomeStreet');
content = content.replace(/chelona_athens_fav_routes/g, 'chelona_rome_fav_routes');
content = content.replace(/Atene/g, 'Roma');
content = content.replace(/Athens/g, 'Rome');
content = content.replace(/OASA/g, 'ATAC');
content = content.replace(/37\.9838, lng: 23\.7275/g, '41.9028, lng: 12.4964');

// Now we need to replace the data block from "export const ROME_STATIONS: Record<string, MetroStation> = {"
// to "export const RomeTransport = () => {"

const startIdx = content.indexOf("export const ROME_STATIONS: Record<string, MetroStation> = {");
const endIdx = content.indexOf("export const RomeTransport = () => {");

const romeData = `export const ROME_STATIONS: Record<string, MetroStation> = {
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
  repubblica: { id: 'repubblica', nameIt: 'Repubblica', nameEl: 'Repubblica', lat: 41.9026, lng: 12.4952, lines: [1], attractions: ['Teatro dell\\'Opera', 'Via Nazionale'] },
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
  eur_fermi: { id: 'eur_fermi', nameIt: 'EUR Fermi', nameEl: 'EUR Fermi', lat: 41.8285, lng: 12.4704, lines: [2], attractions: ['Laghetto dell\\'EUR'] },
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
    destination: 'Borgo Sant\\'Angelo (Vaticano)',
    price: '1.50€ (BIT)',
    frequency: 'Ogni 10 - 15 minuti',
    hours: '05:30 - 24:00',
    stops: ['Termini', 'Nazionale', 'Piazza Venezia', 'Argentina', 'Chiesa Nuova', 'Traspontina/Conciliazione', 'Borgo Sant\\'Angelo'],
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
    description: 'Servizio navetta comodo per l\\'Aeroporto di Fiumicino con fermata intermedia in zona Vaticano.'
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

`;

const finalContent = content.substring(0, startIdx) + romeData + content.substring(endIdx);

fs.writeFileSync('src/components/RomeTransport.tsx', finalContent);
console.log('RomeTransport.tsx created successfully');
