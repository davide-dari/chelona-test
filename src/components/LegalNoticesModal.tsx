import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Scale, FileText, CheckCircle2, AlertTriangle, ExternalLink, Shield } from 'lucide-react';
import { APP_VERSION } from '../constants/version';

export type LegalTabType = 'disclaimer' | 'privacy' | 'oss';

export interface LegalNoticesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTabType;
}

export const LegalNoticesModal: React.FC<LegalNoticesModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'disclaimer'
}) => {
  const [activeTab, setActiveTab] = useState<LegalTabType>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--surface-variant)]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-bg)] text-[var(--accent)] flex items-center justify-center shrink-0 border border-[var(--border)]">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[var(--text-main)] leading-tight">
                Note Legali, Privacy & Trasparenza
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] font-medium">
                Chelona v{APP_VERSION} · Conformità Normativa & Proprietà Intellettuale
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-2 px-4 sm:px-6 bg-[var(--surface-variant)]/40 border-b border-[var(--border)] overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('disclaimer')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'disclaimer'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-variant)]'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Disclaimer & Marchi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-variant)]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Privacy Policy & GDPR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('oss')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'oss'
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-variant)]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>Licenze Open Source</span>
          </button>
        </div>

        {/* Tab Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 text-xs sm:text-[13px] text-[var(--text-main)] leading-relaxed space-y-6 custom-scrollbar select-text">
          {/* TAB 1: DISCLAIMER LEGALE & MARCHI */}
          {activeTab === 'disclaimer' && (
            <div className="space-y-6">
              {/* Sezione 1: Marchi e Fair Use Nominativo */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-black text-[var(--text-main)]">
                  <span className="w-6 h-6 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center text-xs">1</span>
                  <span>Proprietà Intellettuale & Marchi Commerciali (Nominative Fair Use)</span>
                </div>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  Tutti i marchi d'impresa, marchi registrati, loghi aziendali, denominazioni commerciali, insegne e ragioni sociali citati o rappresentati graficamente all'interno dell'applicazione <strong>Chelona</strong> appartengono esclusivamente ai rispettivi legittimi proprietari.
                </p>
                <div className="p-3.5 rounded-2xl bg-[var(--surface-variant)] border border-[var(--border)] text-[12px] space-y-2 text-[var(--text-muted)]">
                  <p>
                    Ciò include, a titolo meramente esemplificativo e non tassativo:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Insegne della Grande Distribuzione (GDO)</strong>: Conad, Coop, Esselunga, Lidl, Carrefour, Eurospin, Penny Market, Despar, Famila, Tigotà, Acqua & Sapone, Bennet, Pam, Crai, e similari.</li>
                    <li><strong>Operatori di Telecomunicazioni & Utilities</strong>: Vodafone, TIM, WindTre, Fastweb, Iliad, Sky Italia, Enel Energia, Eni Plenitude, A2A, e affini.</li>
                    <li><strong>Brand Automobilistici & Mobilità</strong>: Fiat, Volkswagen, Toyota, Ford, Renault, BMW, Mercedes-Benz, e altri costruttori di veicoli.</li>
                  </ul>
                  <p className="pt-1 font-medium text-[var(--text-main)]">
                    ⚖️ <strong>Clausola di Fair Use Nominativo</strong>: La presenza e l'esposizione di tali marchi e denominazioni avviene esclusivamente per finalità descrittive, identificative e referenziali a vantaggio esclusivo dell'utente privato, al solo fine di agevolare la gestione, l'archiviazione e la catalogazione personale dei propri scontrini, volantini, spese, contratti e veicoli, ai sensi e per gli effetti dell'<strong>art. 21, comma 1, lett. c) del D.Lgs. 10 febbraio 2005, n. 30 (Codice della Proprietà Industriale)</strong> e dell'<strong>art. 14 della Direttiva (UE) 2015/2436</strong>.
                  </p>
                  <p>
                    Chelona e i suoi sviluppatori <em>non sono in alcun modo sponsorizzati, affiliati, autorizzati, licenziatari né formalmente collegati ad alcuno dei titolari dei suddetti marchi</em>.
                  </p>
                </div>
              </div>

              {/* Sezione 2: Disclaimer Settoriali Obbligatori */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-sm font-black text-[var(--text-main)]">
                  <span className="w-6 h-6 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center text-xs">2</span>
                  <span>Avvertenze Legali & Disclaimer di Settore</span>
                </div>

                {/* Box Sanitario */}
                <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 space-y-1.5">
                  <h4 className="font-bold text-teal-700 dark:text-teal-300 flex items-center gap-2">
                    <span>🩺 Ambito Medico, Farmaci & Salute</span>
                  </h4>
                  <p className="text-teal-900/90 dark:text-teal-100/90 text-[11.5px] leading-relaxed">
                    Le funzionalità della sezione "Medico & Salute" sono fornite come semplice ausilio di memoria e organizzazione personale per il paziente. <strong>Chelona non costituisce consulenza medica, non effettua diagnosi cliniche e non sostituisce in alcun caso il parere, la visita o la prescrizione di un medico professionista iscritto all'Ordine dei Medici o del Servizio Sanitario Nazionale</strong>. In caso di emergenza o sintomi acuti, contattare immediatamente il 112.
                  </p>
                </div>

                {/* Box Finanziario */}
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1.5">
                  <h4 className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                    <span>💰 Ambito Finanziario, Budgeting & Spese</span>
                  </h4>
                  <p className="text-purple-900/90 dark:text-purple-100/90 text-[11.5px] leading-relaxed">
                    Tutti gli strumenti di budgeting, calcolo rate, suddivisione conti (Split) e monitoraggio spese hanno scopo esclusivamente informativo, matematico e statistico per uso personale. <strong>Non costituiscono in alcun caso consulenza finanziaria, previdenziale, fiscale o di investimento</strong>, né sollecitazione al pubblico risparmio ai sensi del D.Lgs. 58/1998 (TUF).
                  </p>
                </div>

                {/* Box Recessi */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                  <h4 className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <span>📄 Ambito Disdette & Recessi Contrattuali</span>
                  </h4>
                  <p className="text-amber-900/90 dark:text-amber-100/90 text-[11.5px] leading-relaxed">
                    I modelli di lettera di recesso e disdetta generati da Chelona costituiscono formulari orientativi standardizzati redatti sulla base delle norme generali del Codice del Consumo (D.Lgs. 206/2005) e della Legge Bersani (L. 40/2007). <strong>L'utente ha l'onere di verificare preventivamente i termini contrattuali specifici aggiornati, gli indirizzi PEC ufficiali e le clausole del singolo fornitore prima dell'invio formale</strong>.
                  </p>
                </div>
              </div>

              {/* Sezione 3: Immagini e Media */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-sm font-black text-[var(--text-main)]">
                  <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs">3</span>
                  <span>Immagini Culinare & Fotografie Royalty-Free</span>
                </div>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  Tutte le fotografie gastronomiche e ricettari incluse nell'applicazione sono tratte da archivi royalty-free con licenza libera per scopi commerciali e personali (Unsplash License) o sono state autoprodotte in formato vettoriale libero. Nessun contenuto visivo protetto da copyright o proprietà riservata di terze parti viene incorporato abusivamente.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: PRIVACY POLICY & GDPR */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-emerald-700 dark:text-emerald-300">Certificazione Local-First & Conformità GDPR</h4>
                  <p className="text-[11.5px] text-emerald-900/90 dark:text-emerald-100/90 leading-relaxed">
                    Chelona è sviluppata secondo i massimi canoni di <strong>Privacy by Design e Privacy by Default (art. 25 del Regolamento Generale UE 2016/679 - GDPR)</strong>. L'applicazione rispetta rigorosamente la sovranità e l'integrità dei dati personali dell'utente.
                  </p>
                </div>
              </div>

              {/* Punti Chiave Privacy */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-[var(--text-main)] text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>1. Nessun Server Remoto & Zero Telemetria</span>
                  </h4>
                  <p className="text-[var(--text-muted)] leading-relaxed pl-6">
                    Chelona non trasmette, non sincronizza e non carica mai i tuoi dati su server remoti di backend proprietari o cloud centralizzati. L'intera esecuzione logica e l'elaborazione dei documenti avvengono on-device direttamente sul tuo hardware. Non sono presenti librerie analitiche di terze parti né telemetria tracciante.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-[var(--text-main)] text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>2. Crittografia Simmetrica AES-256 a Riposo</span>
                  </h4>
                  <p className="text-[var(--text-muted)] leading-relaxed pl-6">
                    Tutti i documenti archiviati (carte d'identità, patenti, tessere sanitarie, PDF contrattuali, spese e memorie AI) sono protetti a livello hardware tramite crittografia simmetrica standard industriale <strong>AES-GCM a 256 bit</strong> con chiave derivata mediante algoritmo <strong>PBKDF2</strong>. Nemmeno gli sviluppatori hanno la possibilità di accedere o decifrare i tuoi dati.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-[var(--text-main)] text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>3. Intelligenza Artificiale Locale On-Device</span>
                  </h4>
                  <p className="text-[var(--text-muted)] leading-relaxed pl-6">
                    L'assistente "Il Matematico" e i motori linguistici di Chelona funzionano a livello algoritmico locale sul dispositivo. Le domande poste in chat, le risposte in memoria e le analisi testuali non lasciano mai il perimetro di sicurezza del tuo smartphone o tablet.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-[var(--text-main)] text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>4. Diritti dell'Interessato & Portabilità Completa</span>
                  </h4>
                  <p className="text-[var(--text-muted)] leading-relaxed pl-6">
                    Ai sensi degli <strong>articoli 15-22 del Regolamento UE 2016/679</strong>, l'utente è l'unico ed esclusivo Titolare e Custode dei propri dati. Puoi in qualsiasi istante:
                  </p>
                  <ul className="list-disc pl-11 space-y-1 text-[var(--text-muted)]">
                    <li>Esportare tutti i tuoi dati in un archivio ZIP o codice QR cifrato protetto da password (Diritto alla Portabilità).</li>
                    <li>Cancellare irreversibilmente tutti i dati memorizzati disinstallando l'applicazione o utilizzando la funzione di reset (Diritto all'Oblio).</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LICENZE OPEN SOURCE */}
          {activeTab === 'oss' && (
            <div className="space-y-5">
              <p className="text-[var(--text-muted)] leading-relaxed">
                Chelona è realizzata con orgoglio integrando componenti e librerie software open-source sviluppate dalla comunità globale, distribuite sotto licenze permesse (MIT, Apache 2.0, ISC, BSD). Si riconosce di seguito la piena paternità intellettuale degli autori originari:
              </p>

              <div className="space-y-3">
                {[
                  { name: 'React & React DOM', author: 'Meta Platforms, Inc.', license: 'MIT License' },
                  { name: 'Tailwind CSS', author: 'Tailwind Labs, Inc.', license: 'MIT License' },
                  { name: 'Capacitor Core & Plugins', author: 'Ionic / Drifty Co.', license: 'MIT License' },
                  { name: 'Lucide Icons', author: 'Lucide Project Contributors', license: 'ISC License' },
                  { name: 'Motion (Framer Motion)', author: 'Motion One / Framer B.V.', license: 'MIT License' },
                  { name: 'CryptoJS', author: 'Jeff Mott', license: 'MIT License' },
                  { name: 'JSZip', author: 'Stuart Knightley, David Duponchel, Franz Buchinger', license: 'MIT License' },
                  { name: 'PDF-Lib', author: 'Andrew Dillon', license: 'MIT License' },
                  { name: 'PDF.js', author: 'Mozilla Foundation', license: 'Apache License 2.0' },
                  { name: 'JScanify', author: 'Kolerr', license: 'MIT License' },
                  { name: 'HTML5-QRCode', author: 'Minhaz Himel', license: 'Apache License 2.0' },
                  { name: 'Recharts', author: 'Recharts Group', license: 'MIT License' },
                  { name: 'Three.js & Globe.GL', author: 'Ricardo Cabello & Vasco Asturiano', license: 'MIT License' },
                ].map((lib, i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-[var(--surface-variant)] border border-[var(--border)] flex items-center justify-between gap-3">
                    <div>
                      <h5 className="font-bold text-[var(--text-main)] text-xs">{lib.name}</h5>
                      <span className="text-[10px] text-[var(--text-muted)]">Autore / Copyright: {lib.author}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-[var(--surface-variant)] text-[10px] font-mono font-bold text-[var(--accent)] border border-[var(--border)] shrink-0">
                      {lib.license}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-variant)]/60 border border-[var(--border)] text-[11px] text-[var(--text-muted)] space-y-2">
                <p className="font-bold text-[var(--text-main)]">Termini Generali di Licenza MIT / Apache:</p>
                <p>
                  "THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE."
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[var(--border)] bg-[var(--surface-variant)]/30 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            Ho Compreso
          </button>
        </div>
      </motion.div>
    </div>
  );
};
