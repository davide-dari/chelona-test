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
    teacherIntro: `Benvenuto nel tuo percorso su Python 3! 🐍

Python è il linguaggio di programmazione più versatile e richiesto del mercato nel 2025. Usato in ambito web, intelligenza artificiale, data science, automazione e molto altro.

📚 Documento di riferimento principale: docs.python.org/3 — il tutorial ufficiale è la tua bibbia.

Consigli pratici:
• Non cercare di memorizzare tutto: impara a leggere la documentazione ufficiale.
• Dopo ogni argomento, scrivi almeno un piccolo programma da zero.
• Usa Python REPL (digita "python" nel terminale) per sperimentare subito.
• Installa VS Code con l'estensione Python (Pylance) per un ambiente professionale.
• Leggi codice altrui su GitHub: osserva come i professionisti organizzano i progetti.

Sei pronto? Cominciamo dall'inizio. Un passo alla volta.`,
    topics: [
      {
        id: 'py-01',
        title: 'Installazione e Ambiente di Sviluppo',
        duration: '2–3 ore • Settimana 1',
        description: `Configura il tuo ambiente professionale prima di scrivere una sola riga di codice.

🔹 Cosa fare:
1. Scarica Python 3.13+ da python.org/downloads
2. Verifica installazione: apri il terminale e digita "python --version"
3. Installa VS Code (code.visualstudio.com)
4. Installa l'estensione "Python" (Microsoft) e "Pylance" in VS Code
5. Crea la tua prima cartella di progetto e apri VS Code lì

🔹 Concetti da capire:
• Cos'è un interprete vs compilatore
• Cos'è un ambiente virtuale (venv): perché isolare dipendenze
• Cos'è il PATH di sistema

🔹 Esercizio pratico:
Crea un file hello.py con il contenuto: print("Ciao, sono Python!") ed eseguilo da terminale con: python hello.py`,
        exercise: 'Crea hello.py e stampaci il tuo nome e la data di oggi.',
        resources: [
          { label: 'Download Python 3.13', url: 'https://www.python.org/downloads/' },
          { label: 'Documentazione ufficiale Python', url: 'https://docs.python.org/3/' },
          { label: 'VS Code Download', url: 'https://code.visualstudio.com/' },
        ],
      },
      {
        id: 'py-02',
        title: 'Sintassi Base, Variabili e Tipi di Dato',
        duration: '4–6 ore • Settimana 1',
        description: `Impara il vocabolario fondamentale del linguaggio.

🔹 Tipi di dato primitivi in Python:
• int → numeri interi: x = 10
• float → numeri decimali: y = 3.14
• str → testo: nome = "Davide"
• bool → vero/falso: attivo = True
• None → assenza di valore

🔹 Conversione di tipo (type casting):
• int("42") → 42
• str(100) → "100"
• float("3.14") → 3.14

🔹 Input dall'utente:
nome = input("Come ti chiami? ")
print(f"Ciao, {nome}!")

🔹 f-string (Python 3.6+):
età = 25
print(f"Ho {età} anni e il doppio è {età * 2}")

🔹 Operatori:
• Aritmetici: + - * / // % **
• Confronto: == != > < >= <=
• Logici: and or not`,
        exercise: 'Scrivi un programma che chiede all\'utente nome ed età, e stampa: "Ciao [nome], tra 10 anni avrai [età+10] anni!"',
        resources: [
          { label: 'Tutorial Python – Variabili', url: 'https://docs.python.org/3/tutorial/introduction.html' },
        ],
      },
      {
        id: 'py-03',
        title: 'Strutture di Controllo: if, for, while',
        duration: '4–5 ore • Settimana 1',
        description: `Le strutture di controllo decidono il flusso di esecuzione del programma.

🔹 Condizionali (if/elif/else):
voto = 85
if voto >= 90:
    print("Ottimo!")
elif voto >= 70:
    print("Buono")
else:
    print("Da migliorare")

🔹 Ciclo for – itera su sequenze:
for i in range(5):          # 0, 1, 2, 3, 4
    print(i)

for lettera in "Python":
    print(lettera)

🔹 Ciclo while – esegue finché la condizione è vera:
contatore = 0
while contatore < 5:
    print(contatore)
    contatore += 1

🔹 break e continue:
• break: esce immediatamente dal ciclo
• continue: salta all'iterazione successiva

🔹 List comprehension (sintassi elegante):
quadrati = [x**2 for x in range(10)]`,
        exercise: 'Scrivi un programma che stampa tutti i numeri pari da 1 a 100, poi calcola la loro somma.',
        resources: [
          { label: 'Strutture di controllo – docs ufficiali', url: 'https://docs.python.org/3/tutorial/controlflow.html' },
        ],
      },
      {
        id: 'py-04',
        title: 'Funzioni e Scope',
        duration: '5–6 ore • Settimana 2',
        description: `Le funzioni organizzano il codice in blocchi riutilizzabili.

🔹 Definire una funzione:
def saluta(nome, lingua="italiano"):
    if lingua == "italiano":
        return f"Ciao, {nome}!"
    return f"Hello, {nome}!"

print(saluta("Davide"))
print(saluta("Davide", lingua="inglese"))

🔹 Parametri speciali:
• Posizionali: f(a, b)
• Keyword: f(nome="Davide")
• Default: f(x, y=10)
• *args → lista di argomenti variabili
• **kwargs → dizionario di argomenti keyword

🔹 Scope (visibilità delle variabili):
• Locale: variabile definita dentro la funzione
• Globale: definita fuori, visibile ovunque
• nonlocal: per modificare variabile nel contesto esterno (nested functions)

🔹 Funzioni lambda (anonime):
doppio = lambda x: x * 2
print(doppio(5))  # → 10

🔹 Annotazioni di tipo (Python 3.5+):
def somma(a: int, b: int) -> int:
    return a + b`,
        exercise: 'Crea una funzione calcolatrice con operazioni +, -, *, /. Gestisci la divisione per zero con try/except.',
        resources: [
          { label: 'Funzioni – docs ufficiali', url: 'https://docs.python.org/3/tutorial/controlflow.html#defining-functions' },
        ],
      },
      {
        id: 'py-05',
        title: 'Strutture Dati: Liste, Tuple, Dizionari, Set',
        duration: '6–8 ore • Settimana 2',
        description: `Python offre strutture dati potenti e già pronte all'uso.

🔹 Lista []:
• Ordinata, modificabile, ammette duplicati
• frutti = ["mela", "banana", "kiwi"]
• frutti.append("arancia")
• frutti.sort() / frutti.reverse()
• frutti[0] → "mela" | frutti[-1] → "kiwi"
• frutti[1:3] → slicing

🔹 Tupla ():
• Ordinata, IMMUTABILE
• coords = (40.7, -74.0)  # latitudine, longitudine

🔹 Dizionario {}:
• Coppie chiave:valore, non ordinate (Python 3.7+ mantiene l'ordine di inserimento)
• persona = {"nome": "Davide", "età": 30}
• persona["città"] = "Milano"
• persona.get("telefono", "Non disponibile")

🔹 Set {}:
• Insieme non ordinato, NO duplicati
• numeri = {1, 2, 3, 2, 1}  # → {1, 2, 3}
• Operazioni: unione |, intersezione &, differenza -

🔹 Metodi utili:
• len(), max(), min(), sum(), sorted(), enumerate(), zip()`,
        exercise: 'Crea un rubrica telefonica: aggiungi, cerca, modifica ed elimina contatti usando un dizionario. Salva su file JSON.',
        resources: [
          { label: 'Strutture dati – docs ufficiali', url: 'https://docs.python.org/3/tutorial/datastructures.html' },
        ],
      },
      {
        id: 'py-06',
        title: 'Stringhe e Manipolazione del Testo',
        duration: '3–4 ore • Settimana 2',
        description: `Le stringhe in Python sono immutabili e ricche di metodi integrati.

🔹 Metodi essenziali:
• testo.upper() / .lower() / .capitalize()
• testo.strip() / .lstrip() / .rstrip()
• testo.split(",") → lista
• ",".join(lista) → stringa
• testo.replace("a", "e")
• testo.find("llo") → posizione (o -1)
• testo.startswith("Py") / .endswith(".py")
• testo.count("l") → numero occorrenze

🔹 f-string avanzate (Python 3.12+):
prezzo = 12.5
print(f"Prezzo: {prezzo:.2f} €")          # 2 decimali
print(f"Contatore: {1000000:,}")           # separatore migliaia

🔹 Multilinea e raw string:
testo = """
Questo è un testo
su più righe
"""
percorso = r"C:\Users\Davide\file.txt"     # raw string

🔹 Espressioni regolari (modulo re):
import re
email_pattern = r'[\w.-]+@[\w.-]+\.\w+'
match = re.search(email_pattern, "contatto: test@email.com")`,
        exercise: 'Scrivi una funzione che valida un indirizzo email e una funzione che conta le occorrenze di ogni lettera in una frase.',
        resources: [
          { label: 'Stringhe – docs ufficiali', url: 'https://docs.python.org/3/library/stdtypes.html#text-sequence-type-str' },
        ],
      },
      {
        id: 'py-07',
        title: 'Gestione Errori (Exception Handling)',
        duration: '3–4 ore • Settimana 3',
        description: `La gestione degli errori rende il programma robusto e professionale.

🔹 Try / Except / Else / Finally:
try:
    risultato = 10 / int(input("Inserisci un numero: "))
    print(f"Risultato: {risultato}")
except ValueError:
    print("Devi inserire un numero intero!")
except ZeroDivisionError:
    print("Non puoi dividere per zero!")
else:
    print("Operazione riuscita!")    # eseguito solo se nessun errore
finally:
    print("Operazione completata.")  # eseguito SEMPRE

🔹 Eccezioni built-in più comuni:
• ValueError, TypeError, KeyError, IndexError
• FileNotFoundError, PermissionError
• ZeroDivisionError, OverflowError
• AttributeError, NameError

🔹 Eccezioni personalizzate:
class SaldoInsufficienzaError(Exception):
    def __init__(self, saldo, importo):
        super().__init__(f"Saldo {saldo}€ insufficiente per {importo}€")

🔹 Context manager (with):
with open("file.txt", "r") as f:
    contenuto = f.read()  # il file viene chiuso automaticamente`,
        exercise: 'Scrivi un programma che legge un file CSV, gestisce errori di file non trovato o formato errato, e stampa le statistiche dei dati.',
        resources: [
          { label: 'Gestione errori – docs ufficiali', url: 'https://docs.python.org/3/tutorial/errors.html' },
        ],
      },
      {
        id: 'py-08',
        title: 'File, I/O e Modulo os/pathlib',
        duration: '4–5 ore • Settimana 3',
        description: `Leggi, scrivi e gestisci file e directory in modo professionale.

🔹 Lettura e scrittura file:
# Scrittura
with open("notes.txt", "w", encoding="utf-8") as f:
    f.write("Prima riga\n")
    f.writelines(["Seconda\n", "Terza\n"])

# Lettura
with open("notes.txt", "r", encoding="utf-8") as f:
    tutto = f.read()
    righe = f.readlines()  # lista di righe

🔹 File JSON (modulo json):
import json
dati = {"nome": "Davide", "età": 30}
with open("dati.json", "w") as f:
    json.dump(dati, f, indent=2)

with open("dati.json") as f:
    caricati = json.load(f)

🔹 pathlib (Python 3.4+ — approccio moderno):
from pathlib import Path
cartella = Path("documenti")
cartella.mkdir(exist_ok=True)
file = cartella / "test.txt"
file.write_text("Ciao!")
print(file.read_text())

🔹 modulo os:
import os
os.getcwd()    # directory corrente
os.listdir()   # contenuto cartella
os.rename("old.txt", "new.txt")`,
        exercise: 'Crea un sistema di log che salva messaggi con timestamp in un file. Implementa funzioni: aggiungi_log(), leggi_log(), cancella_log().',
        resources: [
          { label: 'File I/O – docs ufficiali', url: 'https://docs.python.org/3/tutorial/inputoutput.html' },
          { label: 'pathlib – docs', url: 'https://docs.python.org/3/library/pathlib.html' },
        ],
      },
      {
        id: 'py-09',
        title: 'Programmazione a Oggetti (OOP)',
        duration: '8–10 ore • Settimana 4',
        description: `La OOP è il paradigma dominante per organizzare progetti complessi.

🔹 Classe e oggetto:
class Automobile:
    """Rappresenta un'automobile."""
    
    marche_disponibili = ["Fiat", "BMW", "Tesla"]  # attributo di classe
    
    def __init__(self, marca: str, modello: str, anno: int):
        self.marca = marca          # attributo di istanza
        self.modello = modello
        self.anno = anno
        self._km = 0               # "_" indica attributo "privato per convenzione"
    
    def guida(self, km: int) -> None:
        self._km += km
        print(f"{self.marca} {self.modello} ha percorso {km} km.")
    
    @property
    def km_totali(self) -> int:
        return self._km
    
    def __repr__(self) -> str:
        return f"Automobile({self.marca!r}, {self.modello!r}, {self.anno})"

mia_auto = Automobile("Fiat", "Panda", 2022)
mia_auto.guida(150)

🔹 Ereditarietà:
class Ibrida(Automobile):
    def __init__(self, marca, modello, anno, batteria_kwh):
        super().__init__(marca, modello, anno)
        self.batteria = batteria_kwh

🔹 Principi SOLID – da conoscere:
• S: Single Responsibility
• O: Open/Closed
• L: Liskov Substitution
• I: Interface Segregation
• D: Dependency Inversion`,
        exercise: 'Crea un sistema bancario con classi: ContoBancario, ContoCorriente, ContoRisparmio. Implementa deposito, prelievo, trasferimento, estratto conto.',
        resources: [
          { label: 'OOP – docs ufficiali', url: 'https://docs.python.org/3/tutorial/classes.html' },
        ],
      },
      {
        id: 'py-10',
        title: 'Moduli, Pacchetti e pip',
        duration: '3–4 ore • Settimana 4',
        description: `Organizza il codice in moduli e usa le migliaia di librerie disponibili.

🔹 Moduli built-in essenziali:
• math → funzioni matematiche: math.sqrt(), math.pi, math.ceil()
• random → numeri casuali: random.randint(1,6), random.choice(lista)
• datetime → date/ore: datetime.now(), date.today()
• collections → Counter, defaultdict, deque
• itertools → chain, product, combinations, permutations
• functools → reduce, partial, lru_cache

🔹 Creare un modulo personalizzato:
# File: calcoli.py
def somma(a, b): return a + b
VERSIONE = "1.0"

# File: main.py
import calcoli
from calcoli import somma, VERSIONE

🔹 Pacchetti – directory con __init__.py:
mio_progetto/
    __init__.py
    database.py
    interfaccia.py
    utils/
        __init__.py
        helpers.py

🔹 pip – gestore dei pacchetti:
pip install requests          # installa
pip install requests==2.31.0  # versione specifica
pip list                      # elenca installati
pip freeze > requirements.txt # salva dipendenze
pip install -r requirements.txt # installa da file

🔹 Ambienti virtuali:
python -m venv mio_env
source mio_env/bin/activate   # Mac/Linux
mio_env\\Scripts\\activate      # Windows`,
        exercise: 'Crea un pacchetto Python con 3 moduli: uno per la matematica, uno per le stringhe, uno per la gestione file. Documentalo con docstring.',
        resources: [
          { label: 'Libreria standard Python', url: 'https://docs.python.org/3/library/index.html' },
          { label: 'PyPI – Python Package Index', url: 'https://pypi.org/' },
        ],
      },
      {
        id: 'py-11',
        title: 'Argomenti Avanzati: Decoratori, Generatori e Comprehension',
        duration: '6–8 ore • Settimana 5',
        description: `Questi strumenti ti distinguono da un programmatore medio.

🔹 Decoratori – modificano il comportamento di una funzione:
import time
import functools

def cronometra(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        inizio = time.perf_counter()
        risultato = func(*args, **kwargs)
        fine = time.perf_counter()
        print(f"{func.__name__} eseguita in {fine-inizio:.4f}s")
        return risultato
    return wrapper

@cronometra
def calcolo_pesante(n):
    return sum(range(n))

🔹 Generatori – sequenze lazy (risparmiano memoria):
def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

gen = fibonacci()
for _ in range(10):
    print(next(gen))

🔹 Generator expression:
somma_quadrati = sum(x**2 for x in range(1000000))  # usa pochissima memoria

🔹 Dict/Set comprehension:
quadrati = {x: x**2 for x in range(10)}
pari = {x for x in range(20) if x % 2 == 0}

🔹 Context Manager personalizzato:
from contextlib import contextmanager

@contextmanager
def timer(nome):
    inizio = time.perf_counter()
    yield
    print(f"{nome}: {time.perf_counter()-inizio:.3f}s")

with timer("Operazione"):
    time.sleep(0.1)`,
        exercise: 'Implementa un decoratore @retry(n) che riprova una funzione n volte in caso di eccezione. Crea un generatore infinito della sequenza di Collatz.',
        resources: [
          { label: 'Decoratori – Real Python Guide', url: 'https://realpython.com/primer-on-python-decorators/' },
          { label: 'Iteratori e Generatori – docs', url: 'https://docs.python.org/3/howto/functional.html#generators' },
        ],
      },
      {
        id: 'py-12',
        title: 'Type Hints e Programmazione Funzionale',
        duration: '4–5 ore • Settimana 5',
        description: `Python 3.12+ ha reso le type annotations uno standard de facto.

🔹 Type Hints (PEP 484, 526):
from typing import Optional, Union, Any
from collections.abc import Callable, Iterator

def elabora(dati: list[int], moltiplicatore: float = 1.0) -> list[float]:
    return [x * moltiplicatore for x in dati]

def trova_utente(id: int) -> Optional[dict[str, Any]]:
    # None se non trovato, dict se trovato
    ...

🔹 TypedDict e dataclasses:
from dataclasses import dataclass, field
from typing import TypedDict

@dataclass
class Prodotto:
    nome: str
    prezzo: float
    categoria: str = "generale"
    tag: list[str] = field(default_factory=list)
    
    def __post_init__(self):
        if self.prezzo < 0:
            raise ValueError("Il prezzo non può essere negativo")

🔹 Programmazione funzionale:
from functools import reduce, partial
from itertools import chain, starmap

numeri = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
pari = list(filter(lambda x: x % 2 == 0, numeri))
doppi = list(map(lambda x: x * 2, numeri))
somma = reduce(lambda a, b: a + b, numeri)

🔹 mypy – verifica statica dei tipi:
pip install mypy
mypy mio_script.py`,
        exercise: 'Riscrivi il sistema bancario dell\'esercizio precedente usando @dataclass con type hints completi. Validalo con mypy.',
        resources: [
          { label: 'Type Hints – docs Python', url: 'https://docs.python.org/3/library/typing.html' },
          { label: 'Dataclasses – docs Python', url: 'https://docs.python.org/3/library/dataclasses.html' },
        ],
      },
      {
        id: 'py-13',
        title: 'Testing con pytest',
        duration: '5–6 ore • Settimana 6',
        description: `Il codice non testato è codice rotto. pytest è lo standard di settore.

🔹 Installazione e primo test:
pip install pytest

# File: test_calcoli.py
def somma(a, b): return a + b

def test_somma_positivi():
    assert somma(2, 3) == 5

def test_somma_negativi():
    assert somma(-1, -1) == -2

def test_somma_zero():
    assert somma(5, 0) == 5

# Esegui: pytest test_calcoli.py -v

🔹 Fixtures – configurazione riutilizzabile:
import pytest

@pytest.fixture
def database_vuoto():
    db = {"utenti": []}
    yield db
    # cleanup dopo il test

def test_aggiungi_utente(database_vuoto):
    database_vuoto["utenti"].append("Davide")
    assert len(database_vuoto["utenti"]) == 1

🔹 Parametrize – test multipli con un'unica funzione:
@pytest.mark.parametrize("input,expected", [
    (2, 4), (3, 9), (4, 16), (-3, 9)
])
def test_quadrato(input, expected):
    assert input**2 == expected

🔹 Mocking – simulare dipendenze esterne:
from unittest.mock import patch, MagicMock

def test_chiamata_api():
    with patch('requests.get') as mock_get:
        mock_get.return_value.json.return_value = {"status": "ok"}
        # ...`,
        exercise: 'Scrivi una test suite completa (almeno 15 test) per il sistema bancario creato in precedenza. Raggiungi 100% di copertura del codice con "pytest --cov".',
        resources: [
          { label: 'pytest – documentazione ufficiale', url: 'https://docs.pytest.org/en/stable/' },
          { label: 'Testing in Python – Real Python', url: 'https://realpython.com/python-testing/' },
        ],
      },
      {
        id: 'py-14',
        title: 'Progetto Finale: Applicazione Reale',
        duration: '10–15 ore • Settimana 6–7',
        description: `Metti insieme tutto ciò che hai imparato in un progetto completo e reale.

🔹 Idee progetto per principianti:
• Task Manager CLI: salva to-do su JSON, cerca, filtra, segna come completati
• Analizzatore Testo: conta parole, trova parole più usate, calcola statistiche

🔹 Idee progetto per intermedi:
• Web Scraper: usa requests + BeautifulSoup per raccogliere dati (es. prezzo prodotti)
• Bot Telegram: usa python-telegram-bot per un bot che risponde a comandi

🔹 Idee progetto per avanzati:
• REST API: usa FastAPI per creare un'API con autenticazione JWT
• Dashboard Data: usa pandas + matplotlib per analizzare un CSV reale (es. dati meteo)

🔹 Struttura professionale del progetto:
mio_progetto/
├── src/
│   └── mio_progetto/
│       ├── __init__.py
│       ├── core.py
│       └── utils.py
├── tests/
│   └── test_core.py
├── requirements.txt
├── README.md
└── pyproject.toml      # standard moderno (PEP 518)

🔹 Pubblica su GitHub:
git init && git add . && git commit -m "init"
gh repo create mio-progetto --public --source=.
git push origin main`,
        exercise: 'Realizza uno dei progetti proposta e pubblicalo su GitHub con README completo, test e istruzioni di installazione.',
        resources: [
          { label: 'FastAPI – framework web moderno', url: 'https://fastapi.tiangolo.com/' },
          { label: 'python-telegram-bot', url: 'https://python-telegram-bot.org/' },
          { label: 'pandas – data analysis', url: 'https://pandas.pydata.org/docs/' },
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
