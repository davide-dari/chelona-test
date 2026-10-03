import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ArrowRight, FileText, Send, Share2, CheckCircle2, AlertTriangle,
  Building2, ShieldCheck, Search, Plus, Calendar, FileSignature,
  Download, ExternalLink, HelpCircle, ChevronRight, ChevronLeft, RefreshCw, X,
  Clock, Check, Sparkles, User, MapPin, Hash, Zap, Smartphone, Wand2, PenTool
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

type RecessoViewMode = 'intro' | 'wizard' | 'preview';

const RECESSO_CONTRACT_TYPES = [
  'Telefonia',
  'Internet & Fibra',
  'Luce & Energia',
  'Gas Metano',
  'Streaming & TV',
  'Palestra & Fitness',
  'Assicurazione',
  'Abbonamento Servizio',
  'Locazione',
  'Altro'
];

const capitalize = (str: string) => {
  if (!str) return '';
  return str.replace(/\b[\p{L}]/gu, l => l.toUpperCase());
};

export const RecessoScreen: React.FC<RecessoScreenProps> = ({
  onClose,
  showToast,
  defaultUserName = '',
  defaultUserFiscalCode = '',
  onSaveToSandbox,
}) => {
  // Modalità Schermata: Inizia con l'Introduzione originale
  const [viewMode, setViewMode] = useState<RecessoViewMode>('intro');

  // Step del wizard passo per passo (0..7 come in origine in Sintesi)
  // 0: Seleziona Azienda, 1: Tipo Contratto, 2: Numero Contratto, 3: Data Contratto,
  // 4: Nome Azienda (se custom), 5: Indirizzo Azienda (se custom), 6: PEC Azienda (se custom), 7: I tuoi dati
  const [wizardStep, setWizardStep] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<'all' | ProviderCategory>('all');
  const [searchProviderQuery, setSearchProviderQuery] = useState('');
  const [isManualCompany, setIsManualCompany] = useState<boolean>(false);

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

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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

  // Calcolo matematico in tempo reale dei termini legali (14gg vs 30gg)
  const legalTerms = useMemo(() => {
    return evaluateRecessoLegalTerms(formData.contractDate);
  }, [formData.contractDate]);

  // Validazione matematica del codice fiscale (algoritmo AdE omocodia & checksum)
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

  // Gestione selezione provider
  const handleSelectProvider = (p: Provider) => {
    setIsManualCompany(false);
    setFormData(prev => ({
      ...prev,
      providerId: p.id,
      companyName: p.name,
      companyAddress: p.address,
      companyPec: p.pec,
      contractType: prev.contractType || (p.contractTypes[0] || (p.category === 'mobile' || p.category === 'fisso' ? 'Telefonia' : p.category === 'energia' ? 'Luce & Energia' : p.category === 'streaming' ? 'Streaming & TV' : 'Palestra & Fitness')),
    }));
    setWizardStep(1);
  };

  const handleSelectCustomCompany = () => {
    setIsManualCompany(true);
    setFormData(prev => ({
      ...prev,
      providerId: undefined,
      companyName: '',
      companyAddress: '',
      companyPec: '',
    }));
    setWizardStep(1);
  };

  // Navigazione dinamica tra gli step visibili
  // Se l'azienda è censita e ha già nome, sede e PEC, gli step 4, 5, 6 vengono saltati direttamente a step 7 (i tuoi dati)
  const getNextStep = (current: number): number => {
    if (current === 3) {
      return isManualCompany ? 4 : 7;
    }
    return current + 1;
  };

  const getPrevStep = (current: number): number => {
    if (current === 7 && !isManualCompany) {
      return 3;
    }
    return current - 1;
  };

  const handleWizardNext = () => {
    switch (wizardStep) {
      case 0:
        if (!formData.companyName.trim()) {
          showToast?.('Seleziona un fornitore o scegli di compilare a mano', 'info');
          return;
        }
        setWizardStep(getNextStep(0));
        break;
      case 1:
        if (!formData.contractType.trim()) {
          showToast?.('Seleziona il tipo di contratto', 'error');
          return;
        }
        setWizardStep(getNextStep(1));
        break;
      case 2:
        if (!formData.contractNumber.trim()) {
          showToast?.('Inserisci il numero o identificativo del contratto', 'error');
          return;
        }
        setWizardStep(getNextStep(2));
        break;
      case 3:
        if (!formData.contractDate.trim()) {
          showToast?.('Inserisci la data del contratto per calcolare i termini legali', 'error');
          return;
        }
        setWizardStep(getNextStep(3));
        break;
      case 4:
        if (!formData.companyName.trim()) {
          showToast?.('Inserisci la ragione sociale dell\'azienda', 'error');
          return;
        }
        setWizardStep(getNextStep(4));
        break;
      case 5:
        setWizardStep(getNextStep(5));
        break;
      case 6:
        if (formData.companyPec.trim() && !formData.companyPec.includes('@')) {
          showToast?.('Indirizzo PEC non valido', 'error');
          return;
        }
        setWizardStep(getNextStep(6));
        break;
      case 7:
        if (!formData.userLastName.trim()) {
          showToast?.('Inserisci il cognome dell\'intestatario', 'error');
          return;
        }
        if (!formData.userCity.trim()) {
          showToast?.('Inserisci la città di residenza', 'error');
          return;
        }
        setViewMode('preview');
        break;
    }
  };

  const handleWizardBack = () => {
    if (wizardStep === 0) {
      setViewMode('intro');
    } else {
      setWizardStep(getPrevStep(wizardStep));
    }
  };

  // Azioni Schermata Anteprima
  const handleSendPec = () => {
    if (!formData.companyPec) {
      showToast?.('Nessun indirizzo PEC configurato per questo destinatario', 'error');
      return;
    }
    const mailto = buildRecessoMailto(formData, legalTerms);
    window.location.href = mailto;
    setShowSuccessModal(true);
    showToast?.('Apertura client PEC/Email in corso...', 'success');
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const res = await shareRecessoPdf(formData, legalTerms);
      if (res.success) {
        showToast?.(res.message, 'success');
        // Salva automaticamente nella Cassaforte Documenti cifrata AES-256
        if (onSaveToSandbox) {
          const { dataUri } = await generateRecessoPdfDoc(formData, legalTerms);
          onSaveToSandbox(
            `Disdetta_${formData.companyName || 'Contratto'}.pdf`,
            dataUri,
            'Disdette & Recessi'
          );
          showToast?.('PDF salvato nella Cassaforte Documenti cifrata', 'success');
        }
      } else {
        showToast?.(res.message, 'info');
      }
    } catch {
      showToast?.('Errore durante la generazione del documento PDF', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleResetAndStartNew = () => {
    setFormData(prev => ({
      ...prev,
      providerId: undefined,
      companyName: '',
      companyAddress: '',
      companyPec: '',
      contractType: '',
      contractNumber: '',
      contractDate: '',
      podOrPdr: '',
      signatureDataUrl: null,
      notes: '',
    }));
    setIsManualCompany(false);
    setWizardStep(0);
    setViewMode('intro');
  };

  // =========================================================================
  // 1. INTRO SCREEN (ORIGINALE SINTESI)
  // =========================================================================
  if (viewMode === 'intro') {
    return (
      <div className="fixed inset-0 z-50 h-[100dvh] bg-gradient-to-b from-orange-600 via-amber-600 to-orange-700 flex flex-col items-center justify-center p-8 relative overflow-hidden animate-fade-in select-none">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-20 -right-20"><FileText size={220} className="text-white" /></div>
          <div className="absolute -bottom-10 -left-10"><Sparkles size={160} className="text-white" /></div>
        </div>

        <div className="z-10 flex flex-col items-center text-center space-y-7 w-full max-w-sm">
          <div className="bg-white p-8 rounded-full shadow-2xl">
            <FileText size={72} className="text-orange-600" />
          </div>

          <div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Recesso Facile</h1>
            <p className="text-lg text-orange-100 font-medium leading-relaxed">
              Disdici contratti e servizi via PEC in modo semplice, rapido e a norma di legge.
            </p>
          </div>

          <div className="w-full bg-white/15 backdrop-blur-md rounded-2xl p-4 text-left border border-white/20 space-y-2 text-white text-xs font-semibold">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-amber-300 shrink-0" />
              <span>Diritto di Ripensamento entro 14gg (D.Lgs. 206/2005)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-amber-300 shrink-0" />
              <span>50 Aziende & Provider italiani censiti con PEC verificata</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-amber-300 shrink-0" />
              <span>Firma Touch vettoriale e salvataggio PDF nel Vault cifrato</span>
            </div>
          </div>

          <div className="w-full space-y-3.5 pt-2">
            <button
              type="button"
              onClick={() => {
                setWizardStep(0);
                setViewMode('wizard');
              }}
              className="w-full bg-white text-orange-700 py-5 px-8 rounded-2xl text-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              Inizia Ora <ArrowRight size={28} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-white/75 font-bold text-base hover:text-white transition-colors cursor-pointer"
            >
              Torna Indietro
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. WIZARD SCREEN (8 PASSI ORIGINALI SINTESI)
  // =========================================================================
  if (viewMode === 'wizard') {
    let stepTitle = '';
    let stepSubtitle = '';
    let stepContent: React.ReactNode = null;

    switch (wizardStep) {
      case 0:
        stepTitle = 'Seleziona Azienda';
        stepSubtitle = 'Scegli il provider del tuo contratto';
        stepContent = (
          <div className="flex flex-col gap-3.5 animate-fade-in pb-28 max-w-md mx-auto w-full">
            {/* Input Ricerca */}
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchProviderQuery}
                onChange={e => setSearchProviderQuery(e.target.value)}
                placeholder="Cerca azienda (TIM, Vodafone, Enel, Sky, McFIT...)"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] text-sm font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-orange-500 shadow-sm transition-colors"
              />
            </div>

            {/* Categorie Orizzontali a Pillole */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`shrink-0 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-orange-600 border-orange-600 text-white shadow-sm'
                    : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Tutte ({RECESSO_PROVIDERS.length})
              </button>
              {RECESSO_CATEGORIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedCategory === c.id
                      ? 'bg-orange-600 border-orange-600 text-white shadow-sm'
                      : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>

            {/* Pulsante Altra Azienda (Manuale) */}
            <button
              type="button"
              onClick={handleSelectCustomCompany}
              className="w-full p-4 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-variant)]/60 active:scale-95 transition-all text-left flex items-center justify-between gap-3 cursor-pointer hover:border-orange-500/50 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/15 text-orange-600">
                  <Building2 size={22} />
                </div>
                <div>
                  <p className="font-bold text-sm text-[var(--text-main)]">Altra azienda (compila a mano)</p>
                  <p className="text-[11px] text-[var(--text-muted)]">Inserisci fornitore o ente non in elenco</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-[var(--text-muted)]" />
            </button>

            {/* Elenco Provider */}
            <div className="flex flex-col gap-2 pt-1">
              {filteredProviders.length === 0 ? (
                <div className="text-center py-10 bg-[var(--surface-variant)]/40 border border-dashed border-[var(--border)] rounded-2xl text-[var(--text-muted)] text-sm">
                  Nessuna azienda trovata con questo nome
                </div>
              ) : (
                filteredProviders.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProvider(p)}
                    className="w-full p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] active:scale-95 transition-all text-left flex items-center justify-between gap-3 shadow-sm hover:border-orange-500/40 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-base text-[var(--text-main)] truncate">{p.name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {p.pec && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                            PEC
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface-variant)] text-[var(--text-muted)]">
                          {p.categoryLabel}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-[var(--text-muted)] shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        );
        break;

      case 1:
        stepTitle = 'Tipo di Contratto';
        stepSubtitle = 'Che tipo di contratto vuoi recedere?';
        stepContent = (
          <div className="flex flex-col gap-2.5 animate-fade-in justify-center h-full pb-28 max-w-md mx-auto w-full">
            {RECESSO_CONTRACT_TYPES.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setFormData({ ...formData, contractType: type });
                  setWizardStep(2);
                }}
                className={`w-full p-4 rounded-2xl border-2 transition-all active:scale-95 text-left font-black text-base flex items-center justify-between shadow-sm cursor-pointer ${
                  formData.contractType === type
                    ? 'bg-orange-500/10 border-orange-600 text-orange-600'
                    : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-main)] hover:border-orange-500/30'
                }`}
              >
                <span>{type}</span>
                {formData.contractType === type && <Check size={22} className="text-orange-600" />}
              </button>
            ))}
          </div>
        );
        break;

      case 2:
        stepTitle = 'Numero Contratto';
        stepSubtitle = 'Il numero identificativo o codice cliente';
        stepContent = (
          <div className="flex flex-col h-full justify-center pb-28 animate-fade-in max-w-md mx-auto w-full">
            <div className="bg-orange-500/15 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-600">
              <Hash size={40} />
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Es. 123456789 o Cod. Cliente"
              value={formData.contractNumber}
              onChange={e => setFormData({ ...formData, contractNumber: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleWizardNext()}
              className="w-full text-center text-2xl py-5 px-6 rounded-2xl bg-[var(--card-bg)] border-2 border-orange-500/30 focus:border-orange-500 outline-none font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/40 shadow-sm"
            />
          </div>
        );
        break;

      case 3:
        stepTitle = 'Data Contratto';
        stepSubtitle = 'Quando è stato stipulato?';
        stepContent = (
          <div className="flex flex-col h-full justify-center pb-28 animate-fade-in max-w-md mx-auto w-full space-y-4">
            <div className="bg-orange-500/15 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-2 text-orange-600">
              <Calendar size={40} />
            </div>
            <input
              autoFocus
              type="date"
              value={formData.contractDate}
              onChange={e => setFormData({ ...formData, contractDate: e.target.value })}
              className="w-full text-center text-2xl py-5 px-6 rounded-2xl bg-[var(--card-bg)] border-2 border-orange-500/30 focus:border-orange-500 outline-none font-bold text-[var(--text-main)] shadow-sm cursor-pointer"
            />
            {formData.contractDate && (
              <div className={`p-4 rounded-2xl border text-xs font-bold flex items-start gap-2.5 ${
                legalTerms.isRipensamento14Days
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
              }`}>
                <ShieldCheck size={20} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-sm">{legalTerms.summaryBadge}</p>
                  <p className="font-normal mt-0.5 leading-snug">{legalTerms.legalBasis}</p>
                </div>
              </div>
            )}
          </div>
        );
        break;

      case 4:
        stepTitle = 'Nome Azienda';
        stepSubtitle = 'La ragione sociale dell\'azienda o fornitore';
        stepContent = (
          <div className="flex flex-col h-full justify-center pb-28 animate-fade-in max-w-md mx-auto w-full">
            <input
              autoFocus
              type="text"
              placeholder="Es. Vodafone Italia S.p.A."
              value={formData.companyName}
              onChange={e => setFormData({ ...formData, companyName: capitalize(e.target.value) })}
              onKeyDown={e => e.key === 'Enter' && handleWizardNext()}
              className="w-full text-center text-2xl py-5 px-6 rounded-2xl bg-[var(--card-bg)] border-2 border-orange-500/30 focus:border-orange-500 outline-none font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/40 shadow-sm"
            />
          </div>
        );
        break;

      case 5:
        stepTitle = 'Indirizzo Azienda';
        stepSubtitle = 'Sede legale del fornitore';
        stepContent = (
          <div className="flex flex-col h-full justify-center pb-28 animate-fade-in max-w-md mx-auto w-full">
            <input
              autoFocus
              type="text"
              placeholder="Via Roma 10, 00100 Roma"
              value={formData.companyAddress}
              onChange={e => setFormData({ ...formData, companyAddress: capitalize(e.target.value) })}
              onKeyDown={e => e.key === 'Enter' && handleWizardNext()}
              className="w-full text-center text-xl py-5 px-6 rounded-2xl bg-[var(--card-bg)] border-2 border-orange-500/30 focus:border-orange-500 outline-none font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/40 shadow-sm"
            />
          </div>
        );
        break;

      case 6:
        stepTitle = 'PEC Azienda';
        stepSubtitle = 'Indirizzo PEC per invio della disdetta';
        stepContent = (
          <div className="flex flex-col h-full justify-center pb-28 animate-fade-in max-w-md mx-auto w-full">
            <input
              autoFocus
              type="email"
              placeholder="recesso@pec.azienda.it"
              value={formData.companyPec}
              onChange={e => setFormData({ ...formData, companyPec: e.target.value.toLowerCase() })}
              onKeyDown={e => e.key === 'Enter' && handleWizardNext()}
              className="w-full text-center text-xl py-5 px-6 rounded-2xl bg-[var(--card-bg)] border-2 border-orange-500/30 focus:border-orange-500 outline-none font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/40 shadow-sm"
            />
          </div>
        );
        break;

      case 7:
        stepTitle = 'I tuoi dati';
        stepSubtitle = 'Dati per il recesso dell\'intestatario';
        stepContent = (
          <div className="flex flex-col gap-3.5 pb-28 animate-fade-in overflow-y-auto pt-1 no-scrollbar max-w-md mx-auto w-full text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[var(--text-muted)] mb-1">Nome Intestatario</label>
                <input
                  type="text"
                  value={formData.userFirstName}
                  onChange={e => setFormData({ ...formData, userFirstName: capitalize(e.target.value) })}
                  placeholder="Mario"
                  className="w-full p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] font-bold text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-[var(--text-muted)] mb-1">Cognome Intestatario *</label>
                <input
                  type="text"
                  value={formData.userLastName}
                  onChange={e => setFormData({ ...formData, userLastName: capitalize(e.target.value) })}
                  placeholder="Rossi"
                  className="w-full p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] font-bold text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[var(--text-muted)] mb-1">Indirizzo di Residenza</label>
              <input
                type="text"
                value={formData.userAddress}
                onChange={e => setFormData({ ...formData, userAddress: capitalize(e.target.value) })}
                placeholder="Via Roma 10"
                className="w-full p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] font-bold text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block font-bold text-[var(--text-muted)] mb-1">CAP</label>
                <input
                  type="text"
                  maxLength={5}
                  value={formData.userCap}
                  onChange={e => setFormData({ ...formData, userCap: e.target.value.replace(/\D/g, '') })}
                  placeholder="00100"
                  className="w-full p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] font-bold text-xs text-center"
                />
              </div>
              <div>
                <label className="block font-bold text-[var(--text-muted)] mb-1">Città *</label>
                <input
                  type="text"
                  value={formData.userCity}
                  onChange={e => setFormData({ ...formData, userCity: capitalize(e.target.value) })}
                  placeholder="Roma"
                  className="w-full p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] font-bold text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-[var(--text-muted)] mb-1">Prov.</label>
                <input
                  type="text"
                  maxLength={2}
                  value={formData.userProvince}
                  onChange={e => setFormData({ ...formData, userProvince: e.target.value.toUpperCase() })}
                  placeholder="RM"
                  className="w-full p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] font-bold text-xs text-center"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[var(--text-muted)] mb-1">Codice Fiscale</label>
              <input
                type="text"
                maxLength={16}
                value={formData.userFiscalCode}
                onChange={e => setFormData({ ...formData, userFiscalCode: e.target.value.toUpperCase() })}
                placeholder="RSSMRA80A01H501U"
                className="w-full p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] font-mono font-bold text-xs"
              />
              {cfValidation && (
                <p className={`text-[10px] mt-1 font-bold ${cfValidation.isValid ? 'text-emerald-600' : 'text-amber-500'}`}>
                  {cfValidation.isValid ? '✓ Codice Fiscale formalmente valido' : `Attenzione: carattere di controllo atteso '${cfValidation.expectedCheckChar}'`}
                </p>
              )}
            </div>

            {(formData.contractType.includes('Luce') || formData.contractType.includes('Gas')) && (
              <div>
                <label className="block font-bold text-[var(--text-muted)] mb-1">
                  Codice {formData.contractType.includes('Luce') ? 'POD' : 'PDR'} (Opzionale)
                </label>
                <input
                  type="text"
                  value={formData.podOrPdr}
                  onChange={e => setFormData({ ...formData, podOrPdr: e.target.value.toUpperCase() })}
                  placeholder={formData.contractType.includes('Luce') ? 'IT001E...' : 'IT...'}
                  className="w-full p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] font-mono font-bold text-xs"
                />
              </div>
            )}
          </div>
        );
        break;
    }

    return (
      <div className="fixed inset-0 z-50 bg-[var(--bg)] flex flex-col overflow-hidden h-[100dvh]">
        <div className="pb-3 px-6 bg-[var(--card-bg)] shrink-0 z-10 border-b border-[var(--border)] pt-8">
          <div className="flex justify-between items-start gap-4 max-w-md mx-auto w-full">
            <div>
              <h1 className="text-2xl font-black text-[var(--text-main)] leading-tight">{stepTitle}</h1>
              <p className="text-[var(--text-muted)] mt-0.5 text-sm font-medium">{stepSubtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-full bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 px-6 py-6 overflow-y-auto no-scrollbar min-h-0">
          {stepContent}
        </div>

        {/* NavigationBar */}
        <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center bg-transparent pointer-events-none">
          <div className="w-full max-w-md flex justify-between items-center px-6 py-4 bg-[var(--card-bg)]/90 backdrop-blur-md border-t border-[var(--border)] pointer-events-auto">
            <button
              type="button"
              onClick={handleWizardBack}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <ChevronLeft size={20} /> Indietro
            </button>
            <button
              type="button"
              onClick={handleWizardNext}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-md cursor-pointer transition-all active:scale-95"
            >
              {wizardStep === 7 ? 'Anteprima' : 'Avanti'} <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. ANTEPRIMA & FIRMA DIGITALE TOUCH (ORIGINALE SINTESI)
  // =========================================================================
  const formalBody = buildRecessoFormalBody(formData, legalTerms);
  const previewSubject = `OGGETTO: Recesso dal contratto ${formData.contractType || 'servizio'} n. ${formData.contractNumber || '—'}`;

  return (
    <div className="fixed inset-0 z-40 bg-[var(--bg)] flex flex-col overflow-hidden h-[100dvh] animate-fade-in text-[var(--text-main)]">
      {/* Header Anteprima */}
      <div className="bg-orange-700 text-white rounded-b-[2.5rem] shadow-lg pt-7 pb-8 px-6 shrink-0 z-10">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-black">Anteprima Disdetta</h1>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-orange-100 font-medium text-xs">
          Rivedi i dati prima di inviare via PEC o scaricare il PDF firmato
        </p>
      </div>

      {/* Main Content Scrollable */}
      <div className="px-5 -mt-4 flex-1 flex flex-col relative z-20 min-h-0 overflow-y-auto no-scrollbar pb-36 max-w-xl mx-auto w-full space-y-4">
        {/* Badge Legale dei Termini */}
        <div className={`p-4 rounded-3xl border shadow-sm flex items-start gap-3 ${
          legalTerms.isRipensamento14Days
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
        }`}>
          <ShieldCheck size={22} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-sm">{legalTerms.summaryBadge}</p>
            <p className="text-xs font-normal mt-0.5">{legalTerms.legalBasis}</p>
          </div>
        </div>

        {/* Box Documento Formale */}
        <div className="bg-[var(--card-bg)] rounded-[2rem] shadow-sm border border-[var(--border)] p-5 space-y-3.5 text-xs">
          <div>
            <p className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-[10px]">A (Indirizzo PEC Ufficiale):</p>
            <p className="text-base font-black text-orange-600 dark:text-orange-400 mt-0.5 break-all">
              {formData.companyPec || '— (Nessuna PEC configurata)'}
            </p>
          </div>

          <div className="h-px bg-[var(--border)]" />

          <div>
            <p className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-[10px]">Oggetto:</p>
            <p className="text-xs font-black text-[var(--text-main)] mt-0.5 leading-snug">
              {previewSubject}
            </p>
          </div>

          <div className="h-px bg-[var(--border)]" />

          <div>
            <p className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-[10px] mb-1.5">Corpo della Comunicazione:</p>
            <pre className="p-3.5 rounded-2xl bg-[var(--surface-variant)] text-[11px] font-mono text-[var(--text-main)] leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
              {formalBody}
            </pre>
          </div>
        </div>

        {/* Firma Digitale Touch Retina 2x */}
        <div className="bg-[var(--card-bg)] rounded-[2rem] shadow-sm border border-[var(--border)] p-5 space-y-2">
          <div className="flex items-center gap-2">
            <PenTool size={18} className="text-orange-600" />
            <h4 className="font-black text-sm text-[var(--text-main)]">Firma Digitale con il Dito</h4>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Firma sullo schermo touch: la tua firma verrà impressa nel documento formale PDF a norma di legge.
          </p>
          <div className="pt-2">
            <SignaturePad
              value={formData.signatureDataUrl}
              onChange={sig => setFormData(prev => ({ ...prev, signatureDataUrl: sig }))}
            />
          </div>
        </div>

        {/* Disclaimer Legale Recessi */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs text-amber-700 dark:text-amber-300">
          <ShieldCheck size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Disclaimer Legale & Avvertenza Contrattuale:</p>
            <p className="leading-relaxed text-[11px] opacity-90">
              I modelli di disdetta generati sono formulari orientativi standardizzati secondo il Codice del Consumo (D.Lgs. 206/2005) e la L. 40/2007. <strong>Verificare sempre i termini contrattuali specifici aggiornati e l'indirizzo PEC formale del fornitore prima dell'invio</strong>. Chelona non costituisce consulenza legale professionale.
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar Fissa in Basso */}
      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-5 bg-[var(--card-bg)]/95 backdrop-blur-md border-t border-[var(--border)] z-30 flex justify-center">
        <div className="w-full max-w-md flex flex-col gap-2.5">
          {formData.companyPec ? (
            <button
              type="button"
              onClick={handleSendPec}
              className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black text-base rounded-2xl shadow-lg flex items-center justify-center gap-2.5 active:scale-95 transition-all cursor-pointer"
            >
              <Send size={20} /> INVIA PEC DIRETTA
            </button>
          ) : (
            <div className="w-full py-2.5 bg-[var(--surface-variant)] border border-[var(--border)] text-[var(--text-muted)] font-semibold text-xs rounded-2xl text-center px-4">
              Nessuna PEC: scarica il PDF firmato per l'invio manuale
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex-1 py-3 bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] font-black text-xs rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download size={16} /> {isGeneratingPdf ? 'Creazione PDF...' : 'Scarica PDF'}
            </button>

            <button
              type="button"
              onClick={() => { setWizardStep(7); setViewMode('wizard'); }}
              className="px-4 py-3 bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer"
            >
              Modifica Dati
            </button>

            <button
              type="button"
              onClick={handleResetAndStartNew}
              className="px-3 py-3 bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer"
              title="Nuovo Recesso"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Notifica Inviato con Successo */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-[var(--card-bg)] w-full max-w-sm rounded-[2.5rem] p-6 text-center space-y-4 shadow-2xl border border-[var(--border)]">
              <div className="bg-emerald-500/15 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 size={48} />
              </div>
              <h3 className="text-2xl font-black text-[var(--text-main)]">PEC Inviata!</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Il tuo client PEC/Email è stato aperto con la formattazione legale conforme. Ricorda di allegare la copia del documento di identità.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  onClose();
                }}
                className="w-full py-3.5 bg-emerald-600 text-white font-black text-sm rounded-xl active:scale-95 transition-all cursor-pointer"
              >
                Ho Fatto
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
