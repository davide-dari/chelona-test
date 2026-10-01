import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, FileText, Send, Share2, CheckCircle2, AlertTriangle,
  Building2, ShieldCheck, Search, Plus, Calendar, FileSignature,
  Download, ExternalLink, HelpCircle, ChevronRight, RefreshCw, X,
  Clock, Check, Sparkles, User, MapPin, Hash, Zap, Smartphone
} from 'lucide-react';
import {
  RECESSO_PROVIDERS, RECESSO_CATEGORIES, Provider, ProviderCategory,
  getProviderById
} from '../data/recessoProviders';
import {
  RecessoFormData, evaluateRecessoLegalTerms, buildRecessoFormalBody,
  buildRecessoMailto, shareRecessoPdf, generateRecessoPdfDoc
} from '../services/recessoService';
import { validateFiscalCode } from '../services/cfValidator';
import { createSectionShortcut } from '../services/shortcutService';
import { SignaturePad } from './SignaturePad';

export interface RecessoScreenProps {
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  defaultUserName?: string;
  defaultUserFiscalCode?: string;
  onSaveToSandbox?: (title: string, base64: string, folderName?: string) => void;
}

export const RecessoScreen: React.FC<RecessoScreenProps> = ({
  onClose,
  showToast,
  defaultUserName = '',
  defaultUserFiscalCode = '',
  onSaveToSandbox,
}) => {
  // Wizard steps: 0 = Selezione Provider, 1 = Dati Contratto, 2 = Dati Intestatario, 3 = Firma & Anteprima
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<'all' | ProviderCategory>('all');
  const [searchProviderQuery, setSearchProviderQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState<RecessoFormData>(() => {
    const parts = (defaultUserName || '').trim().split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';
    return {
      providerId: undefined,
      companyName: '',
      companyAddress: '',
      companyPec: '',
      contractType: '',
      contractNumber: '',
      contractDate: '',
      podOrPdr: '',
      userFirstName: firstName,
      userLastName: lastName,
      userFiscalCode: (defaultUserFiscalCode || '').toUpperCase(),
      userAddress: '',
      userCap: '',
      userCity: '',
      userProvince: '',
      userPhone: '',
      userEmail: '',
      signatureDataUrl: null,
      notes: '',
    };
  });

  // Storico locale salvato
  const [savedRecessi, setSavedRecessi] = useState<Array<{ id: string; date: string; data: RecessoFormData }>>(() => {
    try {
      const raw = localStorage.getItem('chelona_saved_recessi_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Sincronizzazione automatica se i dati utente arrivano asincronamente dalla cassaforte
  useEffect(() => {
    if (defaultUserName && !formData.userLastName && !formData.userFirstName) {
      const parts = defaultUserName.trim().split(' ');
      setFormData(prev => ({
        ...prev,
        userFirstName: parts[0] || prev.userFirstName,
        userLastName: parts.slice(1).join(' ') || prev.userLastName,
      }));
    }
  }, [defaultUserName, formData.userFirstName, formData.userLastName]);

  useEffect(() => {
    if (defaultUserFiscalCode && !formData.userFiscalCode) {
      setFormData(prev => ({
        ...prev,
        userFiscalCode: defaultUserFiscalCode.toUpperCase(),
      }));
    }
  }, [defaultUserFiscalCode, formData.userFiscalCode]);

  // Calcolo matematico in tempo reale dei termini legali
  const legalTerms = useMemo(() => {
    return evaluateRecessoLegalTerms(formData.contractDate);
  }, [formData.contractDate]);

  // Validazione matematica del codice fiscale
  const cfValidation = useMemo(() => {
    if (!formData.userFiscalCode) return null;
    return validateFiscalCode(formData.userFiscalCode);
  }, [formData.userFiscalCode]);

  // Filtro provider
  const filteredProviders = useMemo(() => {
    return RECESSO_PROVIDERS.filter(p => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (searchProviderQuery.trim()) {
        const q = searchProviderQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.pec && p.pec.toLowerCase().includes(q));
      }
      return true;
    });
  }, [selectedCategory, searchProviderQuery]);

  const handleSelectProvider = (p: Provider) => {
    setFormData(prev => ({
      ...prev,
      providerId: p.id,
      companyName: p.name,
      companyAddress: p.address || '',
      companyPec: p.pec || '',
      contractType: p.contractTypes[0] || prev.contractType,
    }));
    setCurrentStep(1);
  };

  const handleSelectCustomCompany = () => {
    setFormData(prev => ({
      ...prev,
      providerId: 'custom',
      companyName: '',
      companyAddress: '',
      companyPec: '',
    }));
    setCurrentStep(1);
  };

  const handleSaveToHistory = () => {
    const newEntry = {
      id: `rec-${Date.now()}`,
      date: new Date().toLocaleDateString('it-IT'),
      data: { ...formData },
    };
    const updated = [newEntry, ...savedRecessi.slice(0, 19)];
    setSavedRecessi(updated);
    try {
      localStorage.setItem('chelona_saved_recessi_v1', JSON.stringify(updated));
    } catch {}
  };

  const handleSendPecEmail = () => {
    if (!formData.companyPec) {
      showToast?.('Inserisci l\'indirizzo PEC del destinatario', 'error');
      return;
    }
    const mailto = buildRecessoMailto(formData, legalTerms);
    window.location.href = mailto;
    handleSaveToHistory();
    showToast?.('Apertura client email/PEC...', 'success');
  };

  const handleSharePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const res = await shareRecessoPdf(formData, legalTerms);
      if (res.success) {
        handleSaveToHistory();
        showToast?.('PDF generato e condiviso con successo!', 'success');
      } else {
        showToast?.(res.message, 'error');
      }
    } catch (err: any) {
      showToast?.(`Errore: ${err?.message || err}`, 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSaveToDocumentsVault = async () => {
    if (!onSaveToSandbox) {
      showToast?.('Salvataggio automatico disponibile in archivio documenti', 'info');
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const { dataUri } = await generateRecessoPdfDoc(formData, legalTerms);
      const title = `Disdetta ${formData.companyName || 'Contratto'}`;
      await onSaveToSandbox(title, dataUri, 'Contratti');
      handleSaveToHistory();
    } catch (e: any) {
      showToast?.('Errore nel salvataggio in archivio', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col overflow-hidden select-none">
      {/* Top Navbar */}
      <header className="shrink-0 h-16 border-b border-[var(--border)] bg-[var(--card-bg)] px-4 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-center transition-colors cursor-pointer"
            title="Torna indietro"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20 shadow-inner">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base lg:text-lg leading-tight flex items-center gap-2">
                <span>Disdette & Recessi Facile</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  PEC Legale
                </span>
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] truncate">
                Disdetta contratti telefonia, energia, streaming e palestre
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await createSectionShortcut('recesso');
                showToast?.(res.message, res.success ? 'success' : 'info');
              } catch {
                showToast?.('Errore durante la creazione del collegamento', 'error');
              }
            }}
            className="w-10 h-10 rounded-2xl bg-[var(--surface-variant)] hover:bg-rose-500/10 hover:border-rose-500/30 border border-[var(--border)] text-rose-600 dark:text-rose-400 flex items-center justify-center transition-all cursor-pointer"
            title="Salva come App sulla Home (Android)"
          >
            <Smartphone className="w-4 h-4" />
          </button>

          {savedRecessi.length > 0 && (
            <button
              type="button"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="px-3 py-2 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Archivio ({savedRecessi.length})</span>
            </button>
          )}

          {currentStep > 0 && (
            <button
              type="button"
              onClick={() => setCurrentStep(0)}
              className="px-3.5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/20 active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nuovo Recesso</span>
            </button>
          )}
        </div>
      </header>

      {/* Stepper Bar */}
      <div className="shrink-0 bg-[var(--card-bg)] border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          {[
            { step: 0, label: '1. Scegli Azienda' },
            { step: 1, label: '2. Dati Contratto' },
            { step: 2, label: '3. Intestatario' },
            { step: 3, label: '4. Firma & Invia' },
          ].map((item) => (
            <button
              key={item.step}
              type="button"
              onClick={() => setCurrentStep(item.step)}
              className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold text-center transition-all cursor-pointer ${
                currentStep === item.step
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                  : currentStep > item.step
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Scrollable */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
        
        {/* STEP 0: SELEZIONE AZIENDA / PROVIDER */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div className="bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--border)] p-6 sm:p-7 shadow-sm">
              <div className="max-w-xl">
                <h3 className="text-xl font-black text-[var(--text-main)] mb-1">
                  Seleziona l'azienda o il servizio da disdire
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Oltre 30 fornitori italiani verificati con indirizzi PEC legali già configurati, oppure compila per qualsiasi altra azienda.
                </p>
              </div>

              {/* Barra di ricerca */}
              <div className="relative mt-5">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchProviderQuery}
                  onChange={e => setSearchProviderQuery(e.target.value)}
                  placeholder="Cerca fornitore (TIM, Vodafone, Enel, Sky, DAZN, Virgin Active...)"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>

              {/* Filtri Categoria */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  Tutti ({RECESSO_PROVIDERS.length})
                </button>
                {RECESSO_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pulsante Altra Azienda / Custom */}
            <button
              type="button"
              onClick={handleSelectCustomCompany}
              className="w-full p-4 rounded-3xl bg-[var(--card-bg)] border border-dashed border-[var(--border)] hover:border-rose-500/50 flex items-center justify-between gap-4 transition-all hover:shadow-md cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[var(--text-main)]">Altra Azienda o Gestore non in lista</h4>
                  <p className="text-xs text-[var(--text-muted)]">Inserisci manualmente nome, sede legale e indirizzo PEC</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
            </button>

            {/* Griglia Fornitori */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredProviders.map(p => (
                <div
                  key={p.id}
                  onClick={() => handleSelectProvider(p)}
                  className="p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] hover:border-rose-500/40 hover:shadow-lg transition-all text-left flex flex-col justify-between gap-3 cursor-pointer group active:scale-[0.99]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--surface-variant)] text-[var(--text-muted)]">
                        {p.categoryLabel}
                      </span>
                      {p.pec && (
                        <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>PEC OK</span>
                        </span>
                      )}
                    </div>
                    <h4 className="font-black text-base text-[var(--text-main)] group-hover:text-rose-600 transition-colors">
                      {p.name}
                    </h4>
                    {p.address && (
                      <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                        {p.address}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400 pt-2 border-t border-[var(--border)]">
                    <span>Compila Disdetta</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 1: DATI CONTRATTO & CALCOLO MATEMATICO TERMINI */}
        {currentStep === 1 && (
          <div className="bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--border)] p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-black uppercase text-rose-500 tracking-wider">Passo 2 di 4</span>
              <h3 className="text-xl font-black text-[var(--text-main)] mt-0.5">
                Dati del Contratto da Disdire
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Azienda selezionata: <strong className="text-[var(--text-main)]">{formData.companyName || 'Azienda personalizzata'}</strong>
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Nome Azienda / Società *</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Es. Vodafone Italia S.p.A."
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Indirizzo PEC Ufficiale *</label>
                  <input
                    type="email"
                    value={formData.companyPec}
                    onChange={e => setFormData({ ...formData, companyPec: e.target.value })}
                    placeholder="servizioclienti@pec.societa.it"
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Sede Legale Azienda (Opzionale)</label>
                <input
                  type="text"
                  value={formData.companyAddress}
                  onChange={e => setFormData({ ...formData, companyAddress: e.target.value })}
                  placeholder="Via Jervis 13, 10015 Ivrea (TO)"
                  className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Tipologia Servizio</label>
                  <input
                    type="text"
                    value={formData.contractType}
                    onChange={e => setFormData({ ...formData, contractType: e.target.value })}
                    placeholder="Es. Fibra Ottica, SIM Mobile, Fornitura Luce..."
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Numero Contratto / Codice Cliente *</label>
                  <input
                    type="text"
                    value={formData.contractNumber}
                    onChange={e => setFormData({ ...formData, contractNumber: e.target.value })}
                    placeholder="Es. 123456789"
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold"
                  />
                </div>
              </div>

              {/* Data Sottoscrizione con Calcolo Matematico dei 14gg */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                  Data Sottoscrizione Contratto (per calcolo Diritto di Ripensamento)
                </label>
                <input
                  type="date"
                  value={formData.contractDate}
                  onChange={e => setFormData({ ...formData, contractDate: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold"
                />
              </div>

              {/* Box Calcolo Matematico Termini Legali */}
              <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${
                legalTerms.isRipensamento14Days
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-300'
              }`}>
                <div className="flex items-center gap-2 font-black">
                  {legalTerms.isRipensamento14Days ? (
                    <Zap className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-blue-500" />
                  )}
                  <span>{legalTerms.summaryBadge}</span>
                </div>
                <p>
                  <strong>Riferimento normativo:</strong> {legalTerms.legalArticle} ({legalTerms.legalBasis}).
                </p>
                <p>
                  <strong>Data stimata efficacia cessazione:</strong> {legalTerms.effectiveDate}
                </p>
              </div>

              {/* Se energia o fornitura: POD / PDR */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                  Codice POD (Luce) o PDR (Gas) / Identificativo Linea (Opzionale)
                </label>
                <input
                  type="text"
                  value={formData.podOrPdr}
                  onChange={e => setFormData({ ...formData, podOrPdr: e.target.value })}
                  placeholder="Es. IT001E12345678"
                  className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(0)}
                className="flex-1 py-3 rounded-2xl bg-[var(--surface-variant)] text-xs font-bold text-[var(--text-muted)] cursor-pointer"
              >
                Indietro
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!formData.companyName.trim()) return showToast?.('Inserisci il nome dell\'azienda', 'error');
                  if (!formData.companyPec.trim()) return showToast?.('Inserisci l\'indirizzo PEC', 'error');
                  setCurrentStep(2);
                }}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Avanti: Dati Intestatario
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DATI INTESTATARIO & CODICE FISCALE */}
        {currentStep === 2 && (
          <div className="bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--border)] p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-black uppercase text-rose-500 tracking-wider">Passo 3 di 4</span>
              <h3 className="text-xl font-black text-[var(--text-main)] mt-0.5">
                Dati dell'Intestatario del Contratto
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                I dati formali del cliente che richiede la disdetta
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Nome *</label>
                  <input
                    type="text"
                    value={formData.userFirstName}
                    onChange={e => setFormData({ ...formData, userFirstName: e.target.value })}
                    placeholder="Mario"
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Cognome *</label>
                  <input
                    type="text"
                    value={formData.userLastName}
                    onChange={e => setFormData({ ...formData, userLastName: e.target.value })}
                    placeholder="Rossi"
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold"
                  />
                </div>
              </div>

              {/* Codice Fiscale con Validatore Matematico */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-[var(--text-muted)]">Codice Fiscale *</label>
                  {cfValidation && (
                    <span className={`text-[10px] font-bold ${cfValidation.isValid ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {cfValidation.isValid ? '✓ Codice Fiscale Valido' : cfValidation.message}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  maxLength={16}
                  value={formData.userFiscalCode}
                  onChange={e => setFormData({ ...formData, userFiscalCode: e.target.value.toUpperCase() })}
                  placeholder="RSSMRA80A01H501U"
                  className={`w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border text-xs font-bold uppercase font-mono transition-colors ${
                    cfValidation?.isValid ? 'border-emerald-500/50' : formData.userFiscalCode ? 'border-rose-500/50' : 'border-[var(--border)]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Indirizzo di Residenza *</label>
                <input
                  type="text"
                  value={formData.userAddress}
                  onChange={e => setFormData({ ...formData, userAddress: e.target.value })}
                  placeholder="Via Garibaldi 12"
                  className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">CAP</label>
                  <input
                    type="text"
                    maxLength={5}
                    value={formData.userCap}
                    onChange={e => setFormData({ ...formData, userCap: e.target.value })}
                    placeholder="00100"
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Città</label>
                  <input
                    type="text"
                    value={formData.userCity}
                    onChange={e => setFormData({ ...formData, userCity: e.target.value })}
                    placeholder="Roma"
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Provincia</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.userProvince}
                    onChange={e => setFormData({ ...formData, userProvince: e.target.value.toUpperCase() })}
                    placeholder="RM"
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Telefono / Cellulare</label>
                  <input
                    type="tel"
                    value={formData.userPhone}
                    onChange={e => setFormData({ ...formData, userPhone: e.target.value })}
                    placeholder="333 1234567"
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Email / PEC Mittente</label>
                  <input
                    type="email"
                    value={formData.userEmail}
                    onChange={e => setFormData({ ...formData, userEmail: e.target.value })}
                    placeholder="mittente@email.it"
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex-1 py-3 rounded-2xl bg-[var(--surface-variant)] text-xs font-bold text-[var(--text-muted)] cursor-pointer"
              >
                Indietro
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!formData.userLastName.trim()) return showToast?.('Inserisci il cognome dell\'intestatario', 'error');
                  setCurrentStep(3);
                }}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Avanti: Firma & Anteprima
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: FIRMA DIGITALE, ANTEPRIMA & INVIO */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--border)] p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <span className="text-xs font-black uppercase text-rose-500 tracking-wider">Passo 4 di 4</span>
                <h3 className="text-xl font-black text-[var(--text-main)] mt-0.5">
                  Apponi la Firma e Genera il Documento
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Firma col dito sul riquadro touch: la firma verrà incorporata ad altissima risoluzione nel PDF
                </p>
              </div>

              {/* SignaturePad */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-main)] mb-2">
                  Firma Autografa del Richiedente
                </label>
                <SignaturePad
                  value={formData.signatureDataUrl || null}
                  onChange={dataUrl => setFormData({ ...formData, signatureDataUrl: dataUrl })}
                  height={190}
                />
              </div>

              {/* Anteprima Testo Ufficiale PEC */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-main)] mb-2">
                  Anteprima Comunicazione Formale PEC
                </label>
                <pre className="w-full p-4 rounded-2xl bg-[var(--surface-variant)] border border-[var(--border)] text-[11px] text-[var(--text-main)] font-mono whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed shadow-inner">
                  {buildRecessoFormalBody(formData, legalTerms)}
                </pre>
              </div>

              {/* Bottoni di Azione */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSendPecEmail}
                  className="py-3.5 px-4 rounded-2xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-600/25 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Invia via PEC / Email</span>
                </button>

                <button
                  type="button"
                  onClick={handleSharePdf}
                  disabled={isGeneratingPdf}
                  className="py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{isGeneratingPdf ? 'Generazione...' : 'Scarica / Condividi PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveToDocumentsVault}
                  disabled={isGeneratingPdf}
                  className="py-3.5 px-4 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] active:scale-95 text-[var(--text-main)] font-bold text-xs flex items-center justify-center gap-2 border border-[var(--border)] transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Salva in Documenti</span>
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center px-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="py-2.5 px-4 rounded-xl bg-[var(--surface-variant)] text-xs font-bold text-[var(--text-muted)] cursor-pointer"
              >
                ← Torna a Intestatario
              </button>
            </div>
          </div>
        )}

        {/* Sezione Archivio Recessi Salvati */}
        {isHistoryOpen && (
          <div className="mt-8 bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--border)] p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                <Clock className="w-5 h-5 text-rose-500" />
                <span>Archivio Disdette Inviate</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                Chiudi
              </button>
            </div>

            <div className="space-y-2.5">
              {savedRecessi.map(item => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[var(--surface-variant)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <h4 className="font-bold text-sm text-[var(--text-main)]">{item.data.companyName}</h4>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Contratto: {item.data.contractNumber || 'N/D'} | PEC: {item.data.companyPec} | Data: {item.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(item.data);
                        setCurrentStep(3);
                        setIsHistoryOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-600/10 text-rose-600 font-bold hover:bg-rose-600/20 cursor-pointer"
                    >
                      Riapri
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
