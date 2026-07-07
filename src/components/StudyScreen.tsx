import React, { useState } from 'react';
import { ArrowLeft, Check, BookOpen, GraduationCap, ChevronDown, ChevronUp, RefreshCw, Award, Search, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateUUID } from '../utils/uuid';

interface StudyTopic {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  duration?: string;
  resources?: { label: string; url: string }[];
  exercise?: string;
}

interface StudyModule {
  id: string;
  type: 'study';
  title: string;
  status: 'wizard' | 'study';
  targetSubject?: string;
  level?: string;
  teacherIntro?: string;
  topics: StudyTopic[];
  x: number;
  y: number;
  w: number;
  h: number;
  folderId?: string;
}

interface StudyScreenProps {
  module: StudyModule;
  onClose: () => void;
  onSave: (m: StudyModule) => void;
  currentProfileId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOGO PIANI DIDATTICI INTEGRATI
// Aggiornati alla documentazione ufficiale Python 3.13 (2025)
// ─────────────────────────────────────────────────────────────────────────────

interface BuiltinCourse {
  id: string;
  category: string;
  subcategory: string;
  subject: string;
  emoji: string;
  color: string;
  bgColor: string;
  levels: { label: string; description: string }[];
  teacherIntro: string;
  topics: Omit<StudyTopic, 'isCompleted'>[];
}

const BUILTIN_COURSES: BuiltinCourse[] = [
  {
    id: 'python',
    category: 'Informatica',
    subcategory: 'Programmazione',
    subject: 'Python 3',
    emoji: '🐍',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    levels: [
      { label: 'Principiante', description: 'Parto da zero' },
      { label: 'Intermedio', description: 'Ho già alcune basi' },
      { label: 'Avanzato', description: 'Voglio perfezionarmi' },
    ],
    teacherIntro: `Benvenuto nel tuo percorso su "Pensare in Python" (Think Python)! 🐍

Questo corso è basato sul celebre libro "Come pensare da Informatico" di Allen B. Downey. L'obiettivo non è solo insegnarti il linguaggio Python, ma farti acquisire la mentalità per risolvere problemi complessi come un vero informatico.

📚 Documento di riferimento: "Pensare in Python: Come pensare da Informatico" (Versione 2.0.17)

Consigli pratici:
• Leggi attentamente ogni capitolo del libro e riproduci gli esempi in modalità interattiva.
• Fai attenzione al vocabolario: cerca di comprendere esattamente i nuovi termini.
• Fai amicizia col Debug: gli errori sono normali, imparare a scovarli è l'abilità più preziosa.
• Completa le esercitazioni pratiche (TurtleWorld, Giochi con le parole, Tkinter).

Sei pronto? Cominciamo dall'inizio. Un passo alla volta.`,
    topics: [
      {
        id: 'py-01',
        title: 'Introduzione e Basi',
        duration: '3–4 ore • Capitoli 1 e 2',
        description: `Inizia a pensare da informatico e comprendi le basi assolute di Python.

🔹 Argomenti Trattati:
• Il linguaggio Python (alto livello, interpretato) e modalità (interattiva vs script)
• Cos'è un programma e il concetto di Bug/Debug (sintassi, runtime, semantica)
• Linguaggi formali vs linguaggi naturali
• Valori e tipi di dato (int, float, str)
• Variabili, espressioni, istruzioni e operatori matematici
• Ordine delle operazioni (PEMDAS) e operazioni sulle stringhe
• Commenti per spiegare il *perché* del codice

💡 Concetto chiave: La programmazione è la suddivisione di un compito complesso in sotto-compiti semplici.`,
        exercise: 'Usa l\'interprete Python come calcolatrice. Se corri 10 km in 43m 30s, qual è la tua velocità media in miglia all\'ora? (1 miglio = 1,61 km)',
        resources: [
          { label: 'Pensare in Python - PDF', url: '#' },
        ],
      },
      {
        id: 'py-02',
        title: 'Funzioni e Progettazione dell\'Interfaccia',
        duration: '5–6 ore • Capitoli 3 e 4',
        description: `Scopri come raggruppare istruzioni in funzioni riutilizzabili ed esercitati con la grafica della tartaruga.

🔹 Argomenti Trattati:
• Chiamate di funzioni predefinite, conversione di tipo, funzioni matematiche
• Definizione di nuove funzioni (def) e flusso di esecuzione
• Parametri, argomenti e variabili locali
• Funzioni produttive vs funzioni vuote
• Importazione dei moduli
• Esercitazione: TurtleWorld. Disegno di linee e poligoni.
• Incapsulamento, Generalizzazione e Refactoring
• Progettazione di interfacce chiare e documentazione (docstring)

💡 Concetto chiave: L'incapsulamento appiccica un nome al codice, la generalizzazione lo rende riutilizzabile.`,
        exercise: 'Usa TurtleWorld per scrivere una funzione poligono(t, n, lunghezza) che disegni un poligono regolare di n lati. Poi usala per approssimare un cerchio.',
        resources: [
          { label: 'Pensare in Python - PDF', url: '#' },
        ],
      },
      {
        id: 'py-03',
        title: 'Controllo di Flusso: Condizioni, Ricorsione e Iterazione',
        duration: '6–8 ore • Capitoli 5 e 7',
        description: `Impara a far prendere decisioni al programma e a ripetere operazioni.

🔹 Argomenti Trattati:
• Operatore modulo (%) ed espressioni booleane (True/False)
• Operatori logici (and, or, not)
• Esecuzione condizionale (if, elif, else) e condizioni nidificate
• Ricorsione: funzioni che chiamano se stesse, caso base e ricorsione infinita
• Input da tastiera (raw_input / input)
• Iterazione con il ciclo while: aggiornamento variabili, cicli infiniti, break
• Algoritmi iterativi (es. calcolo radici quadrate, metodo di Newton)

💡 Concetto chiave: Ripetere operazioni simili è ciò che i computer fanno meglio delle persone.`,
        exercise: 'Scrivi un programma che verifichi iterativamente l\'ultimo teorema di Fermat, o crea un ciclo while per calcolare le radici quadrate tramite stime successive.',
        resources: [
          { label: 'Pensare in Python - PDF', url: '#' },
        ],
      },
      {
        id: 'py-04',
        title: 'Funzioni Produttive e Stringhe',
        duration: '5–7 ore • Capitoli 6, 8 e 9',
        description: `Crea funzioni che restituiscono valori e manipolano stringhe.

🔹 Argomenti Trattati:
• Valori di ritorno e sviluppo incrementale (impalcature)
• Composizione e funzioni booleane
• Le stringhe come sequenze di caratteri (indici e len)
• Attraversamento con cicli for e while
• Slicing delle stringhe
• Immutabilità delle stringhe e metodi (find, upper, lower)
• L'operatore "in" e il confronto di stringhe
• Esercitazione: Giochi con le parole (lettura di file di testo e ricerca schemi)

💡 Concetto chiave: Le stringhe non possono essere modificate direttamente, se ne crea una nuova variante.`,
        exercise: 'Leggi un dizionario di parole (words.txt) e scrivi una funzione che trovi la parola inglese più lunga che non contiene la lettera "e".',
        resources: [
          { label: 'Pensare in Python - PDF', url: '#' },
        ],
      },
      {
        id: 'py-05',
        title: 'Strutture di Dati: Liste, Dizionari e Tuple',
        duration: '8–10 ore • Capitoli 10, 11, 12 e 13',
        description: `Organizza i dati in modo efficiente usando le strutture integrate di Python.

🔹 Argomenti Trattati:
• Liste: sequenze mutabili, alias, metodi (append, sort), mappa/filtro/riduzione
• Dizionari: mappature chiave-valore, funzioni di hashing, contatori (istogrammi)
• Tuple: sequenze immutabili, assegnazione multipla, funzioni a lunghezza variabile (*args)
• Liste di tuple, dizionari e tuple (zip, enumerate)
• Esercitazione: Scelta della struttura di dati
• Analisi della frequenza delle parole, numeri casuali (random)
• Algoritmi complessi: Analisi di Markov per la generazione casuale di testi

💡 Concetto chiave: I dizionari usano tabelle hash per ottenere ricerche a tempo costante O(1).`,
        exercise: 'Esegui un\'analisi di Markov su un testo di un libro (es. scaricato da Progetto Gutenberg) per generare nuove frasi casuali.',
        resources: [
          { label: 'Pensare in Python - PDF', url: '#' },
        ],
      },
      {
        id: 'py-06',
        title: 'File e Persistenza',
        duration: '4–5 ore • Capitolo 14',
        description: `Mantieni i tuoi dati archiviati permanentemente.

🔹 Argomenti Trattati:
• Lettura e scrittura di file (open, read, write)
• L'operatore di formato (%) per inserire dati
• Modulo os: nomi di file, percorsi (relativi e assoluti), esplorazione directory
• Gestione delle eccezioni con try/except
• Database semplici (modulo anydbm o equivalente moderno)
• Serializzazione degli oggetti (pickling)
• Pipe per comunicare con il sistema operativo

💡 Concetto chiave: Gestire le eccezioni evita l'arresto anomalo del programma.`,
        exercise: 'Scrivi un programma che cerchi ricorsivamente in una directory e trovi tutti i file MP3 duplicati usando l\'hashing MD5.',
        resources: [
          { label: 'Pensare in Python - PDF', url: '#' },
        ],
      },
      {
        id: 'py-07',
        title: 'Programmazione Orientata agli Oggetti (OOP)',
        duration: '10–12 ore • Capitoli 15, 16, 17 e 18',
        description: `Definisci i tuoi tipi personalizzati per modellare il mondo reale.

🔹 Argomenti Trattati:
• Classi, oggetti, istanze e attributi (es. Punto, Rettangolo)
• Funzioni pure vs modificatori, sviluppo prototipale vs pianificato
• Metodi: l'oggetto "self", il metodo speciale __init__ e __str__
• Operator overloading (__add__, __cmp__) e polimorfismo
• Ereditarietà (IS-A) e composizione (HAS-A)
• Incapsulamento dei dati e Information Hiding
• Diagrammi di classe e di stato

💡 Concetto chiave: Nella OOP la parte attiva sono gli oggetti, si invoca l'azione direttamente su di essi.`,
        exercise: 'Implementa le classi Carta, Mazzo e Mano per un gioco di carte. Usa l\'ereditarietà per differenziare la Mano dal Mazzo e valuta combinazioni di poker.',
        resources: [
          { label: 'Pensare in Python - PDF', url: '#' },
        ],
      },
      {
        id: 'py-08',
        title: 'Interfacce Grafiche (Tkinter)',
        duration: '6–8 ore • Capitolo 19',
        description: `Passa dalla riga di comando a vere e proprie GUI visuali.

🔹 Argomenti Trattati:
• Interfacce grafiche (GUI) con Tkinter / Gui Swampy
• Pulsanti, Canvas, Caselle di testo (Entry/Text) e Menu
• Gestione Eventi e Callback (programmazione ad eventi)
• Packing e Gestori di geometria (come disporre i controlli)
• Binding: collegare azioni dell'utente (mouse, tastiera) al codice
• Invarianti di interfaccia e Debug delle GUI

💡 Concetto chiave: Nelle GUI, il flusso non è lineare ma dettato dagli eventi generati dall'utente.`,
        exercise: 'Crea un programma di visualizzazione di immagini o un editor di grafica vettoriale basilare (disegno di cerchi e linee) usando Canvas.',
        resources: [
          { label: 'Pensare in Python - PDF', url: '#' },
        ],
      },
    ],
  },
  // ─── Qui si possono aggiungere altri corsi in futuro ───
  {
    id: 'javascript',
    category: 'Informatica',
    subcategory: 'Programmazione',
    subject: 'JavaScript ES2025',
    emoji: '🌐',
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    levels: [
      { label: 'Principiante', description: 'Parto da zero' },
      { label: 'Intermedio', description: 'Ho già alcune basi' },
    ],
    teacherIntro: `Benvenuto nel corso di JavaScript! 🌐

JavaScript è l'unico linguaggio di programmazione eseguito nativamente dal browser. Nel 2025 è essenziale per lo sviluppo web frontend e fullstack (Node.js).

Consigli pratici:
• Apri la console del browser (F12) e sperimenta subito: è il tuo REPL gratuito.
• Ogni esercizio dovrebbe produrre qualcosa di visibile nel browser.
• Concentrati sulle moderne API ES2025 (async/await, optional chaining, nullish coalescing).`,
    topics: [
      {
        id: 'js-01',
        title: 'JavaScript Fondamentali: Variabili, Tipi, Operatori',
        duration: '4–5 ore • Settimana 1',
        description: `Basi del linguaggio: let/const, tipi primitivi, operatori.

🔹 Dichiarazione variabili:
• let nome = "Davide"    // blocco-scoped, riscrivibile
• const PI = 3.14        // blocco-scoped, non riscrivibile
• var (EVITA) → function-scoped, comportamento confuso

🔹 Tipi primitivi:
• number, string, boolean, null, undefined, Symbol, BigInt

🔹 Template literals:
const msg = \`Ciao \${nome}, hai \${età} anni!\`

🔹 Optional chaining e nullish coalescing (ES2020+):
const città = utente?.indirizzo?.città ?? "Non specificata"`,
        exercise: 'Scrivi una funzione che riceve un oggetto utente (con campi opzionali) e restituisce un saluto formattato, gestendo tutti i casi null/undefined.',
        resources: [
          { label: 'MDN – JavaScript', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide' },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────

export function StudyScreen({ module, onClose, onSave }: StudyScreenProps) {
  const [formData, setFormData] = useState<StudyModule>({
    ...module,
    title: module.title || 'Studio',
    status: module.status || 'wizard',
    topics: module.topics || []
  });

  const [currentView, setCurrentView] = useState<'catalog' | 'course'>('catalog');

  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(
    module.targetSubject ? (BUILTIN_COURSES.find(c => c.id === module.targetSubject)?.id ?? null) : null
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  const handleBack = () => {
    if (currentView === 'course') {
      setCurrentView('catalog');
    } else if (search.trim().length > 0) {
      setSearch('');
    } else if (selectedSubcategory) {
      setSelectedSubcategory(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    } else {
      onClose();
    }
  };

  const handleSelectCourse = (course: BuiltinCourse) => {
    let topics: StudyTopic[];

    // Se stiamo selezionando il corso già salvato nella card, mantieni il progresso!
    if (formData.targetSubject === course.id && formData.topics.length > 0) {
      topics = formData.topics;
    } else {
      // Altrimenti inizia da zero
      topics = course.topics.map(t => ({
        ...t,
        isCompleted: false,
      }));
    }

    const updatedModule: StudyModule = {
      ...formData,
      title: `${course.emoji} ${course.subject}`,
      status: 'study',
      targetSubject: course.id,
      teacherIntro: course.teacherIntro,
      topics,
    };

    setFormData(updatedModule);
    setCurrentView('course');
    onSave(updatedModule);
  };

  const toggleTopic = (topicId: string) => {
    const updatedTopics = formData.topics.map(t =>
      t.id === topicId ? { ...t, isCompleted: !t.isCompleted } : t
    );
    const updatedModule = { ...formData, topics: updatedTopics };
    setFormData(updatedModule);
    onSave(updatedModule);
  };

  const handleReset = () => {
    if (confirm("Vuoi davvero cancellare questo piano di studi e tornare alla selezione del corso?")) {
      const resetModule: StudyModule = {
        ...formData,
        title: 'Studio',
        status: 'wizard',
        topics: [],
        teacherIntro: undefined,
        targetSubject: undefined,
      };
      setFormData(resetModule);
      setCurrentView('catalog');
      onSave(resetModule);
    }
  };

  const completedCount = formData.topics.filter(t => t.isCompleted).length;
  const totalTopics = formData.topics.length;
  const progress = totalTopics > 0 ? (completedCount / totalTopics) * 100 : 0;

  const isSearching = search.trim().length > 0;
  
  const categories = Array.from(new Set(BUILTIN_COURSES.map(c => c.category)));
  
  const subcategories = selectedCategory 
    ? Array.from(new Set(BUILTIN_COURSES.filter(c => c.category === selectedCategory).map(c => c.subcategory)))
    : [];

  const coursesToDisplay = isSearching 
    ? BUILTIN_COURSES.filter(c => 
        c.subject.toLowerCase().includes(search.toLowerCase()) || 
        c.category.toLowerCase().includes(search.toLowerCase()) || 
        c.subcategory.toLowerCase().includes(search.toLowerCase())
      )
    : BUILTIN_COURSES.filter(c => c.category === selectedCategory && c.subcategory === selectedSubcategory);

  let viewMode: 'categories' | 'subcategories' | 'courses' = 'categories';
  if (isSearching) {
    viewMode = 'courses';
  } else if (selectedCategory && selectedSubcategory) {
    viewMode = 'courses';
  } else if (selectedCategory) {
    viewMode = 'subcategories';
  }

  return (
    <div className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col h-[100dvh] overflow-hidden font-sans transition-colors duration-300">
      
      {/* Header */}
      <header className="h-20 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-2xl px-6 flex items-center justify-between shrink-0 z-20 safe-area-header">
        <div className="flex items-center gap-4">
          <button onClick={handleBack} className="p-3 bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--border)] rounded-2xl transition-all shadow-sm">
            <ArrowLeft className="w-6 h-6 text-[var(--text-main)]" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">{formData.title}</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              {currentView === 'course' ? `${completedCount}/${totalTopics} Argomenti Completati` : 'Seleziona un Corso'}
            </p>
          </div>
        </div>
        {currentView === 'course' && (
          <button
            onClick={handleReset}
            className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-2xl transition-all"
            title="Cambia corso"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-32">

        {/* WIZARD: Selezione Corso */}
        {currentView === 'catalog' && (
          <div className="px-6 py-8">
            <div className="max-w-2xl mx-auto space-y-6">
              
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-4xl mx-auto">📚</div>
                <h3 className="text-2xl font-black text-[var(--text-main)]">Scegli cosa studiare</h3>
                
                {/* Breadcrumbs */}
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-[var(--text-muted)]">
                  <span 
                    className={`cursor-pointer hover:text-indigo-500 transition-colors ${!selectedCategory ? 'text-indigo-500' : ''}`}
                    onClick={() => { setSelectedCategory(null); setSelectedSubcategory(null); }}
                  >
                    Home
                  </span>
                  {selectedCategory && (
                    <>
                      <span>/</span>
                      <span 
                        className={`cursor-pointer hover:text-indigo-500 transition-colors ${!selectedSubcategory ? 'text-indigo-500' : ''}`}
                        onClick={() => setSelectedSubcategory(null)}
                      >
                        {selectedCategory}
                      </span>
                    </>
                  )}
                  {selectedSubcategory && (
                    <>
                      <span>/</span>
                      <span className="text-indigo-500">{selectedSubcategory}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cerca un corso, categoria o argomento..."
                  className="w-full pl-12 pr-5 py-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl outline-none focus:border-indigo-500 transition-all font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                />
              </div>

              {/* View: Categories */}
              {viewMode === 'categories' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className="p-6 bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] text-left hover:border-indigo-500/50 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-between group"
                    >
                      <h4 className="text-lg font-black text-[var(--text-main)] group-hover:text-indigo-500 transition-colors">{cat}</h4>
                      <ChevronDown className="w-5 h-5 text-[var(--text-muted)] group-hover:text-indigo-500 transition-colors shrink-0 -rotate-90" />
                    </button>
                  ))}
                </div>
              )}

              {/* View: Subcategories */}
              {viewMode === 'subcategories' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {subcategories.map(sub => (
                    <button
                      key={sub}
                      onClick={() => setSelectedSubcategory(sub)}
                      className="p-6 bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] text-left hover:border-indigo-500/50 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-between group"
                    >
                      <h4 className="text-lg font-black text-[var(--text-main)] group-hover:text-indigo-500 transition-colors">{sub}</h4>
                      <ChevronDown className="w-5 h-5 text-[var(--text-muted)] group-hover:text-indigo-500 transition-colors shrink-0 -rotate-90" />
                    </button>
                  ))}
                </div>
              )}

              {/* View: Courses */}
              {viewMode === 'courses' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {coursesToDisplay.map(course => (
                    <button
                      key={course.id}
                      onClick={() => handleSelectCourse(course)}
                      className="p-6 bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] text-left hover:border-indigo-500/50 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 ${course.bgColor} rounded-2xl flex items-center justify-center text-3xl shrink-0`}>
                          {course.emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className={`text-base font-black ${course.color}`}>{course.subject}</h4>
                          <p className="text-[11px] text-[var(--text-muted)] font-semibold mt-1">{course.topics.length} Argomenti</p>
                          <div className="flex flex-wrap gap-1 mt-3">
                            {course.levels.map(l => (
                              <span key={l.label} className="text-[9px] font-black px-2 py-0.5 bg-[var(--border)] text-[var(--text-muted)] rounded-full">{l.label}</span>
                            ))}
                          </div>
                        </div>
                        <Play className="w-5 h-5 text-[var(--text-muted)] group-hover:text-indigo-500 transition-colors shrink-0 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {viewMode === 'courses' && coursesToDisplay.length === 0 && (
                <div className="text-center py-12 space-y-2">
                  <p className="text-4xl">🔍</p>
                  <p className="font-bold text-[var(--text-muted)]">Nessun corso trovato per "{search}"</p>
                  <p className="text-xs text-[var(--text-muted)]">Prova a cercare con termini diversi.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STUDY VIEW: Corso Attivo */}
        {currentView === 'course' && (
          <div className="px-6 py-8">
            <div className="max-w-2xl mx-auto space-y-8">

              {/* Progress Card */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-sm">
                <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="40" stroke="var(--border)" strokeWidth="8" fill="transparent" />
                    <circle
                      cx="48" cy="48" r="40"
                      stroke="url(#progressGrad)" strokeWidth="8" fill="transparent"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={(2 * Math.PI * 40) * (1 - Math.min(progress, 100) / 100)}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute text-lg font-black text-[var(--text-main)]">{Math.round(progress)}%</span>
                </div>
                <div className="text-center sm:text-left space-y-1 flex-1">
                  <h3 className="text-lg font-black text-[var(--text-main)]">I tuoi progressi</h3>
                  <p className="text-xs text-[var(--text-muted)] font-semibold">
                    {completedCount} di {totalTopics} argomenti completati
                  </p>
                  {progress === 100 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase rounded-lg border border-emerald-500/20 mt-2">
                      <Award className="w-3.5 h-3.5" /> Corso Completato! 🎉
                    </span>
                  )}
                  {progress > 0 && progress < 100 && (
                    <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden mt-3">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Teacher Intro */}
              {formData.teacherIntro && (
                <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-[2rem] p-6 relative overflow-hidden">
                  <div className="absolute -top-6 -right-6 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2 mb-3">
                    <GraduationCap className="w-4 h-4" /> Introduzione del Professore
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] font-bold leading-relaxed whitespace-pre-line">
                    {formData.teacherIntro}
                  </p>
                </div>
              )}

              {/* Topics List */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Programma del Corso</h4>
                
                {formData.topics.map((t, index) => {
                  const isExpanded = expandedTopicId === t.id;
                  return (
                    <div
                      key={t.id}
                      className={`border rounded-3xl bg-[var(--card-bg)] transition-all overflow-hidden ${t.isCompleted ? 'border-indigo-500/25 opacity-80' : 'border-[var(--border)] hover:border-indigo-500/40'}`}
                    >
                      {/* Topic Header */}
                      <div className="p-5 flex items-center gap-4">
                        <button
                          onClick={() => toggleTopic(t.id)}
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                            t.isCompleted ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm shadow-indigo-500/30' : 'border-[var(--border)] hover:bg-indigo-500/10 hover:border-indigo-500/50 text-[var(--text-muted)]'
                          }`}
                        >
                          {t.isCompleted && <Check className="w-4 h-4 stroke-[3px]" />}
                        </button>

                        <div className="flex-1 min-w-0" onClick={() => setExpandedTopicId(isExpanded ? null : t.id)}>
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Lezione {index + 1}</span>
                            {t.duration && (
                              <span className="text-[9px] font-black bg-[var(--border)] text-[var(--text-muted)] px-2 py-0.5 rounded-md">
                                {t.duration}
                              </span>
                            )}
                          </div>
                          <h5 className={`text-sm font-bold text-[var(--text-main)] leading-snug ${t.isCompleted ? 'line-through opacity-50' : ''}`}>
                            {t.title}
                          </h5>
                        </div>

                        <button
                          onClick={() => setExpandedTopicId(isExpanded ? null : t.id)}
                          className="p-2 hover:bg-[var(--border)] rounded-xl text-[var(--text-muted)] transition-colors shrink-0"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>

                      {/* Expanded Content */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-[var(--border)] p-5 space-y-4 bg-[var(--bg)]/40">
                              {/* Description */}
                              <pre className="text-xs text-[var(--text-muted)] font-mono leading-relaxed whitespace-pre-wrap break-words bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 overflow-x-auto">
                                {t.description}
                              </pre>

                              {/* Exercise */}
                              {t.exercise && (
                                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 space-y-1">
                                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">💪 Esercizio Pratico</p>
                                  <p className="text-xs font-bold text-[var(--text-muted)] leading-relaxed">{t.exercise}</p>
                                </div>
                              )}

                              {/* Resources */}
                              {t.resources && t.resources.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">🔗 Risorse</p>
                                  <div className="flex flex-col gap-2">
                                    {t.resources.map((r, ri) => (
                                      <a
                                        key={ri}
                                        href={r.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-bold text-indigo-500 hover:text-indigo-400 hover:underline transition-colors truncate"
                                      >
                                        → {r.label}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Mark as Complete Button */}
                              <button
                                onClick={() => toggleTopic(t.id)}
                                className={`w-full py-3 rounded-2xl font-black text-xs transition-all ${
                                  t.isCompleted
                                    ? 'bg-[var(--border)] text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 border border-transparent'
                                    : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm'
                                }`}
                              >
                                {t.isCompleted ? 'Segna come Non Completato' : '✓ Segna come Completato'}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
