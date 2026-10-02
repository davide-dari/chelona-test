import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ArrowRight, Stethoscope, Clock, Phone, MapPin, Mail, Plus, Trash2,
  Check, Send, Settings, ChevronDown, ChevronUp, Copy, CheckCircle2,
  Calendar, AlertCircle, Edit3, X, Sparkles, Navigation, Pill, FileText,
  Search, ShieldCheck, Download, Upload, ExternalLink, Smartphone, User,
  ChevronLeft, ChevronRight, Wand2, QrCode
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  DoctorProfile, MedicineItem, DoctorState, DAYS_NAMES,
  loadDoctorState, saveDoctorState, computeDoctorStudioStatus,
  buildPrescriptionEmail, DEFAULT_DOCTOR_STATE, DoctorDaySchedule
} from '../services/doctorService';
import { validateFiscalCode } from '../services/cfValidator';
import { createSectionShortcut } from '../services/shortcutService';

export interface DoctorScreenProps {
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  defaultPatientName?: string;
  defaultPatientFiscalCode?: string;
}

type DoctorViewMode =
  | 'intro_user'
  | 'reg_name'
  | 'intro_doctor'
  | 'reg_doctor'
  | 'reg_meds'
  | 'dashboard';

const capitalize = (str: string) => {
  if (!str) return '';
  return str.replace(/\b[\p{L}]/gu, l => l.toUpperCase());
};

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const DoctorScreen: React.FC<DoctorScreenProps> = ({
  onClose,
  showToast,
  defaultPatientName = '',
  defaultPatientFiscalCode = '',
}) => {
  const [state, setState] = useState<DoctorState>(() => loadDoctorState());
  const [selectedMedIds, setSelectedMedIds] = useState<Set<string>>(new Set());
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'farmaco' | 'visita'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modalità Schermata: Se non è configurato o manca il cognome del medico, parte dall'introduzione originale
  const isAlreadyConfigured = Boolean(state.configured && state.doctor.lastName.trim());
  const [viewMode, setViewMode] = useState<DoctorViewMode>(() => (isAlreadyConfigured ? 'dashboard' : 'intro_user'));

  // Step della registrazione guidata
  const [regNameStep, setRegNameStep] = useState<number>(0); // 0 = Nome, 1 = Cognome
  const [tempUserFirstName, setTempUserFirstName] = useState(() => {
    const parts = (defaultPatientName || '').trim().split(' ');
    return parts[0] || '';
  });
  const [tempUserLastName, setTempUserLastName] = useState(() => {
    const parts = (defaultPatientName || '').trim().split(' ');
    return parts.slice(1).join(' ') || '';
  });

  const [doctorRegStep, setDoctorRegStep] = useState<number>(0); // 0..7
  const [tempLandlineInput, setTempLandlineInput] = useState('');
  const [tempMobileInput, setTempMobileInput] = useState('');

  // Modali del dashboard
  const [isEditDoctorOpen, setIsEditDoctorOpen] = useState(false);
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  // Form Dottore temporaneo
  const [tempDoctor, setTempDoctor] = useState<DoctorProfile>(() => {
    const base = state.doctor;
    return {
      ...base,
      landlines: base.landlines || (base.landline ? [base.landline] : []),
      mobiles: base.mobiles || (base.mobile ? [base.mobile] : []),
    };
  });

  // Farmaci per la registrazione guidata
  const [tempMeds, setTempMeds] = useState<MedicineItem[]>(() => [...state.medicines]);
  const [wizardMedInput, setWizardMedInput] = useState('');
  const [wizardMedType, setWizardMedType] = useState<'farmaco' | 'visita'>('farmaco');

  // Form Paziente per prescrizione
  const [patientName, setPatientName] = useState(defaultPatientName || 'Assistito');
  const [patientFiscalCode, setPatientFiscalCode] = useState(defaultPatientFiscalCode);
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Form Aggiungi Medicinale rapido da Dashboard
  const [newMedName, setNewMedName] = useState('');
  const [newMedType, setNewMedType] = useState<'farmaco' | 'visita'>('farmaco');
  const [newMedPosology, setNewMedPosology] = useState('');
  const [newMedNotes, setNewMedNotes] = useState('');

  // Backup
  const [backupCode, setBackupCode] = useState('');
  const [importCode, setImportCode] = useState('');
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Timer per aggiornamento live dello stato orari (ogni 30 secondi)
  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Sincronizzazione automatica se i dati arrivano asincronamente dalla cassaforte
  useEffect(() => {
    if (defaultPatientName && (patientName === 'Assistito' || !patientName)) {
      setPatientName(defaultPatientName);
      const parts = defaultPatientName.trim().split(' ');
      if (!tempUserFirstName) setTempUserFirstName(parts[0] || '');
      if (!tempUserLastName) setTempUserLastName(parts.slice(1).join(' ') || '');
    }
  }, [defaultPatientName, patientName, tempUserFirstName, tempUserLastName]);

  useEffect(() => {
    if (defaultPatientFiscalCode && !patientFiscalCode) {
      setPatientFiscalCode(defaultPatientFiscalCode);
    }
  }, [defaultPatientFiscalCode, patientFiscalCode]);

  // Calcolo matematico in tempo reale dello stato dello studio
  const studioStatus = useMemo(() => {
    return computeDoctorStudioStatus(state.doctor.schedule, currentTime);
  }, [state.doctor.schedule, currentTime]);

  // Salvataggio su disco al cambio di stato
  const updateState = (updater: (prev: DoctorState) => DoctorState) => {
    setState(prev => {
      const next = updater(prev);
      saveDoctorState(next);
      return next;
    });
  };

  const handleOpenEditDoctor = () => {
    setTempDoctor(JSON.parse(JSON.stringify(state.doctor)));
    setIsEditDoctorOpen(true);
  };

  const handleSaveDoctor = () => {
    if (!tempDoctor.lastName.trim() && !tempDoctor.firstName.trim()) {
      showToast?.('Inserisci almeno il cognome del medico', 'error');
      return;
    }
    const finalDoc = {
      ...tempDoctor,
      landline: tempDoctor.landlines?.[0] || tempDoctor.landline || '',
      mobile: tempDoctor.mobiles?.[0] || tempDoctor.mobile || '',
    };
    updateState(prev => ({
      ...prev,
      doctor: finalDoc,
      configured: true,
    }));
    setIsEditDoctorOpen(false);
    showToast?.('Profilo medico aggiornato con successo', 'success');
  };

  // --- WIZARD HANDLERS ORIGINALI (SINTESI) ---

  const handleWizardUserNext = () => {
    if (regNameStep === 0) {
      if (tempUserFirstName.trim()) setRegNameStep(1);
      else showToast?.('Inserisci il nome', 'error');
    } else if (regNameStep === 1) {
      if (tempUserLastName.trim()) {
        const full = `${tempUserFirstName.trim()} ${tempUserLastName.trim()}`.trim();
        setPatientName(full);
        setViewMode('intro_doctor');
      } else {
        showToast?.('Inserisci il cognome', 'error');
      }
    }
  };

  const handleWizardUserBack = () => {
    if (regNameStep === 1) {
      setRegNameStep(0);
    } else {
      setViewMode('intro_user');
    }
  };

  const validateDoctorStep = () => {
    switch (doctorRegStep) {
      case 0: return true;
      case 1: return !!tempDoctor.lastName.trim();
      case 2: return isValidEmail(tempDoctor.email);
      case 3: return tempDoctor.address.trim().length > 3;
      case 4: return !!tempDoctor.city.trim();
      case 5: return /^\d{5}$/.test(tempDoctor.cap);
      case 6: return (tempDoctor.landlines && tempDoctor.landlines.length > 0) || (tempDoctor.mobiles && tempDoctor.mobiles.length > 0) || !!tempDoctor.mobile || !!tempDoctor.landline;
      case 7: return true;
      default: return false;
    }
  };

  const handleDoctorStepNext = () => {
    if (!validateDoctorStep()) {
      if (doctorRegStep === 6) showToast?.('Inserisci almeno un numero di telefono', 'error');
      else if (doctorRegStep === 2) showToast?.('Email non valida', 'error');
      else if (doctorRegStep === 5) showToast?.('CAP non valido (5 cifre)', 'error');
      else showToast?.('Compila il campo per continuare', 'error');
      return;
    }
    if (doctorRegStep < 7) {
      setDoctorRegStep(doctorRegStep + 1);
    } else {
      setViewMode('reg_meds');
    }
  };

  const handleDoctorStepBack = () => {
    if (doctorRegStep === 0) setViewMode('intro_doctor');
    else setDoctorRegStep(doctorRegStep - 1);
  };

  const addWizardLandline = () => {
    const val = tempLandlineInput.trim();
    if (val && val.length === 9) {
      setTempDoctor(prev => ({
        ...prev,
        landlines: [...(prev.landlines || []), val],
        landline: prev.landline || val
      }));
      setTempLandlineInput('');
    } else {
      showToast?.('Il numero fisso deve essere di 9 cifre', 'error');
    }
  };

  const addWizardMobile = () => {
    const val = tempMobileInput.trim();
    if (val && val.length === 10) {
      setTempDoctor(prev => ({
        ...prev,
        mobiles: [...(prev.mobiles || []), val],
        mobile: prev.mobile || val
      }));
      setTempMobileInput('');
    } else {
      showToast?.('Il numero di cellulare deve essere di 10 cifre', 'error');
    }
  };

  const updateDoctorDaySchedule = (dayId: number, field: 'start' | 'end' | 'closed', value: any) => {
    setTempDoctor(prev => {
      const currentDay = prev.schedule[dayId] || { closed: false, slots: [{ start: '09:00', end: '18:00' }] };
      const currentSlot = currentDay.slots[0] || { start: '09:00', end: '18:00' };

      let nextSchedule: DoctorDaySchedule;
      if (field === 'closed') {
        const closed = Boolean(value);
        nextSchedule = {
          closed,
          slots: closed ? [] : [{ start: currentSlot.start || '09:00', end: currentSlot.end || '18:00' }]
        };
      } else if (field === 'start') {
        nextSchedule = {
          closed: false,
          slots: [{ start: value, end: currentSlot.end || '18:00' }]
        };
      } else {
        nextSchedule = {
          closed: false,
          slots: [{ start: currentSlot.start || '09:00', end: value }]
        };
      }

      return {
        ...prev,
        schedule: {
          ...prev.schedule,
          [dayId]: nextSchedule
        }
      };
    });
  };

  const handleAddWizardMed = () => {
    if (!wizardMedInput.trim()) return;
    const newItem: MedicineItem = {
      id: `med-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: wizardMedInput.trim(),
      type: wizardMedType,
    };
    setTempMeds(prev => [newItem, ...prev]);
    setWizardMedInput('');
    showToast?.(`${wizardMedType === 'farmaco' ? 'Farmaco' : 'Visita'} aggiunto`, 'success');
  };

  const handleCompleteWizardRegistration = () => {
    const finalDoc: DoctorProfile = {
      ...tempDoctor,
      landline: tempDoctor.landlines?.[0] || tempDoctor.landline || '',
      mobile: tempDoctor.mobiles?.[0] || tempDoctor.mobile || '',
    };
    updateState(prev => ({
      ...prev,
      doctor: finalDoc,
      medicines: tempMeds,
      configured: true,
    }));
    const full = `${tempUserFirstName.trim()} ${tempUserLastName.trim()}`.trim();
    if (full) setPatientName(full);
    setViewMode('dashboard');
    showToast?.('Profilo e studio medico configurati con successo!', 'success');
  };

  // --- MEDICINES MANAGEMENT IN DASHBOARD ---

  const handleAddMedicine = () => {
    if (!newMedName.trim()) {
      showToast?.('Inserisci il nome del farmaco o della visita', 'error');
      return;
    }
    const newItem: MedicineItem = {
      id: `med-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newMedName.trim(),
      type: newMedType,
      posology: newMedPosology.trim() || undefined,
      notes: newMedNotes.trim() || undefined,
    };
    updateState(prev => ({
      ...prev,
      medicines: [newItem, ...prev.medicines],
    }));
    setNewMedName('');
    setNewMedPosology('');
    setNewMedNotes('');
    setIsAddMedOpen(false);
    showToast?.('Elemento aggiunto alla lista', 'success');
  };

  const handleDeleteMedicine = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateState(prev => ({
      ...prev,
      medicines: prev.medicines.filter(m => m.id !== id),
    }));
    setSelectedMedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    showToast?.('Elemento eliminato', 'info');
  };

  const toggleSelectMedicine = (id: string) => {
    setSelectedMedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    const ids = filteredMedicines.map(m => m.id);
    setSelectedMedIds(new Set(ids));
  };

  const deselectAll = () => {
    setSelectedMedIds(new Set());
  };

  // Filtro lista medicinali
  const filteredMedicines = useMemo(() => {
    return state.medicines.filter(m => {
      if (activeCategoryFilter !== 'all' && m.type !== activeCategoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return m.name.toLowerCase().includes(q) || (m.posology && m.posology.toLowerCase().includes(q));
      }
      return true;
    });
  }, [state.medicines, activeCategoryFilter, searchQuery]);

  const selectedItems = useMemo(() => {
    return state.medicines.filter(m => selectedMedIds.has(m.id));
  }, [state.medicines, selectedMedIds]);

  // Generazione email
  const generatedEmail = useMemo(() => {
    return buildPrescriptionEmail(
      state.doctor,
      patientName,
      patientFiscalCode,
      selectedItems,
      additionalNotes
    );
  }, [state.doctor, patientName, patientFiscalCode, selectedItems, additionalNotes]);

  const handleSendEmail = () => {
    if (!state.doctor.email) {
      showToast?.('Inserisci prima l\'indirizzo email del medico nelle impostazioni', 'error');
      setIsEditDoctorOpen(true);
      return;
    }
    window.location.href = generatedEmail.mailtoUrl;
    setIsEmailPreviewOpen(false);
    showToast?.('Apertura client email in corso...', 'success');
  };

  // Navigatore Google Maps
  const handleOpenNavigation = () => {
    const fullAddr = `${state.doctor.address}, ${state.doctor.city}`.trim();
    if (!fullAddr || fullAddr === ',') {
      showToast?.('Inserisci l\'indirizzo dello studio nelle impostazioni', 'info');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddr)}`;
    window.open(url, '_blank');
  };

  // Chiama medico
  const handleCallDoctor = (number: string) => {
    if (!number) {
      showToast?.('Nessun numero di telefono registrato', 'info');
      return;
    }
    const cleanNumber = number.replace(/\s+/g, '');
    try {
      window.open(`tel:${cleanNumber}`, '_system') || (window.location.href = `tel:${cleanNumber}`);
    } catch {
      window.location.href = `tel:${cleanNumber}`;
    }
  };

  // Backup
  const handleOpenBackup = () => {
    setBackupCode(JSON.stringify(state, null, 2));
    setImportCode('');
    setCopiedBackup(false);
    setIsBackupOpen(true);
  };

  const handleCopyBackup = () => {
    navigator.clipboard.writeText(backupCode);
    setCopiedBackup(true);
    showToast?.('Backup copiato negli appunti', 'success');
  };

  const handleImportBackup = () => {
    try {
      const parsed = JSON.parse(importCode);
      if (parsed && typeof parsed === 'object') {
        saveDoctorState(parsed);
        setState(parsed);
        setIsBackupOpen(false);
        showToast?.('Dati studio ripristinati con successo', 'success');
      } else {
        showToast?.('File di backup non valido', 'error');
      }
    } catch {
      showToast?.('Codice non valido o malformato', 'error');
    }
  };

  // Riconfigura guidata (torna alla procedura iniziale di configurazione)
  const handleRestartIntroWizard = () => {
    setTempDoctor(JSON.parse(JSON.stringify(state.doctor)));
    setTempMeds([...state.medicines]);
    const parts = patientName.trim().split(' ');
    setTempUserFirstName(parts[0] || '');
    setTempUserLastName(parts.slice(1).join(' ') || '');
    setRegNameStep(0);
    setDoctorRegStep(0);
    setViewMode('intro_user');
  };

  // =========================================================================
  // 1. INTRO USER SCREEN (ORIGINALE SINTESI)
  // =========================================================================
  if (viewMode === 'intro_user') {
    return (
      <div className="fixed inset-0 z-50 h-[100dvh] bg-gradient-to-b from-teal-600 to-teal-800 flex flex-col items-center justify-center p-8 relative overflow-hidden animate-fade-in select-none">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-20 -right-20"><User size={200} className="text-white" /></div>
        </div>
        <div className="z-10 flex flex-col items-center text-center space-y-8 w-full max-w-sm">
          <div className="bg-white p-8 rounded-full shadow-2xl">
            <User size={72} className="text-teal-600" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white mb-3">Benvenuto!</h1>
            <p className="text-xl text-teal-100 font-medium">Creiamo il tuo profilo medico.</p>
          </div>
          <div className="w-full space-y-4">
            <button
              type="button"
              onClick={() => {
                setRegNameStep(tempUserFirstName.trim() ? 1 : 0);
                setViewMode('reg_name');
              }}
              className="w-full bg-white text-teal-700 py-5 px-8 rounded-2xl text-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              Inizia Ora <ArrowRight size={28} />
            </button>
            <button
              type="button"
              onClick={isAlreadyConfigured ? () => setViewMode('dashboard') : onClose}
              className="text-white/70 font-bold text-lg hover:text-white transition-colors cursor-pointer"
            >
              Torna Indietro
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. REG NAME SCREEN (ORIGINALE SINTESI)
  // =========================================================================
  if (viewMode === 'reg_name') {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--bg)] flex flex-col overflow-hidden h-[100dvh]">
        <div className="pb-3 px-6 bg-[var(--card-bg)] shrink-0 z-10 border-b border-[var(--border)] pt-8">
          <div className="flex justify-between items-start gap-4 max-w-md mx-auto w-full">
            <div>
              <h1 className="text-2xl font-black text-[var(--text-main)] leading-tight">
                {regNameStep === 0 ? 'Come ti chiami?' : 'Il tuo cognome?'}
              </h1>
              <p className="text-[var(--text-muted)] mt-1 text-sm font-medium">
                {regNameStep === 0 ? 'Inserisci il tuo nome' : 'Inserisci il tuo cognome'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('intro_user')}
              className="p-2.5 rounded-full bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 px-6 py-6 flex flex-col justify-center max-w-md mx-auto w-full pb-28">
          {regNameStep === 0 ? (
            <div className="space-y-4 animate-fade-in">
              <input
                autoFocus
                type="text"
                placeholder="Mario"
                value={tempUserFirstName}
                onChange={e => setTempUserFirstName(capitalize(e.target.value))}
                onKeyDown={e => e.key === 'Enter' && handleWizardUserNext()}
                className="w-full text-center text-3xl py-5 px-6 rounded-2xl bg-[var(--card-bg)] border-2 border-teal-500/30 focus:border-teal-500 outline-none font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/40 shadow-sm"
              />
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <input
                autoFocus
                type="text"
                placeholder="Rossi"
                value={tempUserLastName}
                onChange={e => setTempUserLastName(capitalize(e.target.value))}
                onKeyDown={e => e.key === 'Enter' && handleWizardUserNext()}
                className="w-full text-center text-3xl py-5 px-6 rounded-2xl bg-[var(--card-bg)] border-2 border-teal-500/30 focus:border-teal-500 outline-none font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/40 shadow-sm"
              />
            </div>
          )}
        </div>

        {/* NavigationBar */}
        <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center bg-transparent pointer-events-none">
          <div className="w-full max-w-md flex justify-between items-center px-6 py-4 bg-[var(--card-bg)]/90 backdrop-blur-md border-t border-[var(--border)] pointer-events-auto">
            <button
              type="button"
              onClick={handleWizardUserBack}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <ChevronLeft size={20} /> Indietro
            </button>
            <button
              type="button"
              onClick={handleWizardUserNext}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md cursor-pointer transition-all active:scale-95"
            >
              Avanti <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. INTRO DOCTOR SCREEN (ORIGINALE SINTESI)
  // =========================================================================
  if (viewMode === 'intro_doctor') {
    return (
      <div className="fixed inset-0 z-50 h-[100dvh] bg-gradient-to-b from-blue-600 to-blue-800 flex flex-col items-center justify-center p-8 relative overflow-hidden animate-fade-in select-none">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-20 -right-20"><Stethoscope size={200} className="text-white" /></div>
        </div>
        <div className="z-10 flex flex-col items-center text-center space-y-8 w-full max-w-sm">
          <div className="bg-white p-8 rounded-full shadow-2xl">
            <Stethoscope size={72} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white mb-3">Ottimo!</h1>
            <p className="text-xl text-blue-100 font-medium">Adesso inseriamo i dati del tuo dottore.</p>
          </div>
          <div className="w-full space-y-4">
            <button
              type="button"
              onClick={() => {
                setDoctorRegStep(0);
                setViewMode('reg_doctor');
              }}
              className="w-full bg-white text-blue-700 py-5 px-8 rounded-2xl text-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              Continua <ArrowRight size={28} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('reg_name')}
              className="text-white/70 font-bold text-lg hover:text-white transition-colors cursor-pointer"
            >
              Torna Indietro
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. REG DOCTOR WIZARD (8 PASSI ORIGINALI SINTESI)
  // =========================================================================
  if (viewMode === 'reg_doctor') {
    let title = '';
    let subtitle = '';
    let content: React.ReactNode = null;

    switch (doctorRegStep) {
      case 0:
        title = 'Il tuo Dottore';
        subtitle = 'Uomo o donna?';
        content = (
          <div className="flex flex-col gap-5 animate-fade-in justify-center h-full pb-20 max-w-md mx-auto w-full">
            <button
              type="button"
              onClick={() => setTempDoctor({ ...tempDoctor, gender: 'M' })}
              className={`relative w-full p-6 sm:p-7 rounded-3xl border-2 transition-all active:scale-95 flex items-center gap-5 shadow-sm cursor-pointer ${
                tempDoctor.gender === 'M' ? 'bg-blue-500/10 border-blue-600 text-blue-600' : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)]'
              }`}
            >
              <div className={`p-5 rounded-2xl ${tempDoctor.gender === 'M' ? 'bg-blue-600 text-white' : 'bg-[var(--surface-variant)] text-[var(--text-muted)]'}`}>
                <User size={36} />
              </div>
              <div className="text-left flex-1">
                <span className="block text-2xl font-black text-[var(--text-main)]">Il Dottore</span>
                <span className="text-base font-semibold text-[var(--text-muted)]">(DR.)</span>
              </div>
              {tempDoctor.gender === 'M' && <Check size={28} className="text-blue-600" />}
            </button>

            <button
              type="button"
              onClick={() => setTempDoctor({ ...tempDoctor, gender: 'F' })}
              className={`relative w-full p-6 sm:p-7 rounded-3xl border-2 transition-all active:scale-95 flex items-center gap-5 shadow-sm cursor-pointer ${
                tempDoctor.gender === 'F' ? 'bg-pink-500/10 border-pink-500 text-pink-600' : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)]'
              }`}
            >
              <div className={`p-5 rounded-2xl ${tempDoctor.gender === 'F' ? 'bg-pink-500 text-white' : 'bg-[var(--surface-variant)] text-[var(--text-muted)]'}`}>
                <User size={36} />
              </div>
              <div className="text-left flex-1">
                <span className="block text-2xl font-black text-[var(--text-main)]">La Dottoressa</span>
                <span className="text-base font-semibold text-[var(--text-muted)]">(DOTT.SSA)</span>
              </div>
              {tempDoctor.gender === 'F' && <Check size={28} className="text-pink-600" />}
            </button>
          </div>
        );
        break;

      case 1:
        title = 'Cognome?';
        subtitle = 'Inserisci il cognome del medico';
        content = (
          <div className="flex flex-col h-full justify-center pb-20 animate-fade-in max-w-md mx-auto w-full">
            <div className="bg-blue-500/15 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
              <Stethoscope size={40} />
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Bianchi"
              value={tempDoctor.lastName}
              onChange={e => setTempDoctor({ ...tempDoctor, lastName: capitalize(e.target.value) })}
              onKeyDown={e => e.key === 'Enter' && handleDoctorStepNext()}
              className="w-full text-center text-3xl py-5 px-6 rounded-2xl bg-[var(--card-bg)] border-2 border-blue-500/30 focus:border-blue-500 outline-none font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/40 shadow-sm"
            />
          </div>
        );
        break;

      case 2:
        title = 'Email?';
        subtitle = 'Per inviare le ricette';
        content = (
          <div className="flex flex-col h-full justify-center pb-20 animate-fade-in max-w-md mx-auto w-full">
            <div className="bg-blue-500/15 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
              <Send size={38} />
            </div>
            <input
              autoFocus
              type="email"
              placeholder="medico@posta.it"
              value={tempDoctor.email}
              onChange={e => setTempDoctor({ ...tempDoctor, email: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleDoctorStepNext()}
              className="w-full text-center text-2xl py-5 px-6 rounded-2xl bg-[var(--card-bg)] border-2 border-blue-500/30 focus:border-blue-500 outline-none font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/40 shadow-sm"
            />
          </div>
        );
        break;

      case 3:
        title = 'Indirizzo?';
        subtitle = 'Dove si trova lo studio';
        content = (
          <div className="flex flex-col h-full justify-center pb-20 animate-fade-in max-w-md mx-auto w-full">
            <div className="bg-blue-500/15 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
              <MapPin size={40} />
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Via Roma 10"
              value={tempDoctor.address}
              onChange={e => setTempDoctor({ ...tempDoctor, address: capitalize(e.target.value) })}
              onKeyDown={e => e.key === 'Enter' && handleDoctorStepNext()}
              className="w-full text-center text-3xl py-5 px-6 rounded-2xl bg-[var(--card-bg)] border-2 border-blue-500/30 focus:border-blue-500 outline-none font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/40 shadow-sm"
            />
          </div>
        );
        break;

      case 4:
        title = 'Città?';
        subtitle = 'In che comune?';
        content = (
          <div className="flex flex-col h-full justify-center pb-20 animate-fade-in max-w-md mx-auto w-full">
            <input
              autoFocus
              type="text"
              placeholder="Roma"
              value={tempDoctor.city}
              onChange={e => setTempDoctor({ ...tempDoctor, city: capitalize(e.target.value) })}
              onKeyDown={e => e.key === 'Enter' && handleDoctorStepNext()}
              className="w-full text-center text-3xl py-5 px-6 rounded-2xl bg-[var(--card-bg)] border-2 border-blue-500/30 focus:border-blue-500 outline-none font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/40 shadow-sm"
            />
          </div>
        );
        break;

      case 5:
        title = 'CAP?';
        subtitle = 'Codice Postale (5 numeri)';
        content = (
          <div className="flex flex-col h-full justify-center pb-20 animate-fade-in max-w-md mx-auto w-full">
            <input
              autoFocus
              type="text"
              placeholder="00100"
              maxLength={5}
              value={tempDoctor.cap}
              onChange={e => setTempDoctor({ ...tempDoctor, cap: e.target.value.replace(/\D/g, '') })}
              onKeyDown={e => e.key === 'Enter' && handleDoctorStepNext()}
              className="w-full text-center text-3xl py-5 px-6 rounded-2xl bg-[var(--card-bg)] border-2 border-blue-500/30 focus:border-blue-500 outline-none font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/40 shadow-sm"
            />
          </div>
        );
        break;

      case 6:
        title = 'Contatti?';
        subtitle = 'Dove possiamo chiamarlo?';
        content = (
          <div className="flex flex-col h-full justify-start pt-2 pb-20 animate-fade-in overflow-y-auto px-1 max-w-md mx-auto w-full">
            <div className="space-y-6">
              {/* Telefono Fisso */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg"><Phone size={20} /></div>
                  <label className="text-base font-bold text-[var(--text-main)]">Telefono Fisso (9 cifre)</label>
                </div>
                <div className="bg-[var(--card-bg)] p-2 rounded-2xl border-2 border-[var(--border)] focus-within:border-blue-500 flex items-center shadow-sm w-full">
                  <input
                    type="tel"
                    maxLength={9}
                    placeholder="06..."
                    value={tempLandlineInput}
                    onChange={e => setTempLandlineInput(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 pl-4 py-2 text-xl font-bold text-[var(--text-main)] outline-none bg-transparent placeholder:text-[var(--text-muted)]/40 tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={addWizardLandline}
                    disabled={tempLandlineInput.length !== 9}
                    className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-600 text-white disabled:opacity-40 disabled:bg-gray-200 transition-all shrink-0 cursor-pointer"
                  >
                    <Plus size={24} />
                  </button>
                </div>
                {tempDoctor.landlines && tempDoctor.landlines.length > 0 && (
                  <div className="grid gap-2 animate-fade-in mt-1">
                    {tempDoctor.landlines.map((num, i) => (
                      <div key={i} className="flex justify-between items-center p-3 pl-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <span className="font-bold text-lg text-blue-600 tracking-wider">{num}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const l = [...(tempDoctor.landlines || [])];
                            l.splice(i, 1);
                            setTempDoctor({ ...tempDoctor, landlines: l });
                          }}
                          className="w-9 h-9 flex items-center justify-center bg-[var(--card-bg)] text-red-500 rounded-lg shadow-sm cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cellulare */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="p-2 bg-green-500/10 text-green-600 rounded-lg"><Smartphone size={20} /></div>
                  <label className="text-base font-bold text-[var(--text-main)]">Cellulare (10 cifre)</label>
                </div>
                <div className="bg-[var(--card-bg)] p-2 rounded-2xl border-2 border-[var(--border)] focus-within:border-green-500 flex items-center shadow-sm w-full">
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="333..."
                    value={tempMobileInput}
                    onChange={e => setTempMobileInput(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 pl-4 py-2 text-xl font-bold text-[var(--text-main)] outline-none bg-transparent placeholder:text-[var(--text-muted)]/40 tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={addWizardMobile}
                    disabled={tempMobileInput.length !== 10}
                    className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-600 text-white disabled:opacity-40 disabled:bg-gray-200 transition-all shrink-0 cursor-pointer"
                  >
                    <Plus size={24} />
                  </button>
                </div>
                {tempDoctor.mobiles && tempDoctor.mobiles.length > 0 && (
                  <div className="grid gap-2 animate-fade-in mt-1">
                    {tempDoctor.mobiles.map((num, i) => (
                      <div key={i} className="flex justify-between items-center p-3 pl-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                        <span className="font-bold text-lg text-green-600 tracking-wider">{num}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const m = [...(tempDoctor.mobiles || [])];
                            m.splice(i, 1);
                            setTempDoctor({ ...tempDoctor, mobiles: m });
                          }}
                          className="w-9 h-9 flex items-center justify-center bg-[var(--card-bg)] text-red-500 rounded-lg shadow-sm cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        break;

      case 7:
        title = 'Orari?';
        subtitle = 'Quando è aperto lo studio?';
        content = (
          <div className="flex flex-col h-full justify-start pt-2 pb-24 animate-fade-in overflow-y-auto px-1 max-w-md mx-auto w-full no-scrollbar">
            <div className="bg-blue-500/10 p-4 rounded-2xl mb-4 border border-blue-500/20 flex items-start gap-3">
              <Clock className="text-blue-600 shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-[var(--text-main)] leading-snug font-medium">
                Imposta gli orari di apertura e chiusura per ciascun giorno della settimana.
              </p>
            </div>

            <div className="space-y-3">
              {DAYS_NAMES.map(day => {
                const daySchedule = tempDoctor.schedule[day.id] || { closed: day.id === 0 || day.id === 6, slots: [{ start: '09:00', end: '18:00' }] };
                const isOpen = !daySchedule.closed;
                const slot = daySchedule.slots[0] || { start: '09:00', end: '18:00' };

                return (
                  <div
                    key={day.id}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      !isOpen ? 'bg-[var(--surface-variant)] border-[var(--border)] opacity-75' : 'bg-[var(--card-bg)] border-teal-500 shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className={`font-black text-lg ${!isOpen ? 'text-[var(--text-muted)]' : 'text-teal-600 dark:text-teal-400'}`}>
                        {day.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateDoctorDaySchedule(day.id, 'closed', isOpen)}
                        className={`relative h-8 w-20 rounded-full transition-colors flex items-center p-1 cursor-pointer ${
                          !isOpen ? 'bg-gray-300 dark:bg-gray-700' : 'bg-teal-600'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${!isOpen ? 'translate-x-0' : 'translate-x-12'}`} />
                        <span className={`absolute text-[10px] font-black ${!isOpen ? 'right-2.5 text-gray-500' : 'left-2.5 text-white'}`}>
                          {!isOpen ? 'OFF' : 'ON'}
                        </span>
                      </button>
                    </div>

                    {isOpen && (
                      <div className="flex items-center gap-3 animate-fade-in pt-1">
                        <div className="flex-1 bg-[var(--surface-variant)] rounded-xl border border-[var(--border)] px-2 py-1.5 flex flex-col items-center">
                          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Apre</span>
                          <input
                            type="time"
                            value={slot.start || '09:00'}
                            onChange={e => updateDoctorDaySchedule(day.id, 'start', e.target.value)}
                            className="bg-transparent font-bold text-[var(--text-main)] text-base outline-none text-center w-full p-0"
                          />
                        </div>
                        <div className="text-[var(--text-muted)] font-bold text-lg">-</div>
                        <div className="flex-1 bg-[var(--surface-variant)] rounded-xl border border-[var(--border)] px-2 py-1.5 flex flex-col items-center">
                          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Chiude</span>
                          <input
                            type="time"
                            value={slot.end || '18:00'}
                            onChange={e => updateDoctorDaySchedule(day.id, 'end', e.target.value)}
                            className="bg-transparent font-bold text-[var(--text-main)] text-base outline-none text-center w-full p-0"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
        break;
    }

    return (
      <div className="fixed inset-0 z-50 bg-[var(--bg)] flex flex-col overflow-hidden h-[100dvh]">
        <div className="pb-3 px-6 bg-[var(--card-bg)] shrink-0 z-10 border-b border-[var(--border)] pt-8">
          <div className="flex justify-between items-start gap-4 max-w-md mx-auto w-full">
            <div>
              <h1 className="text-2xl font-black text-[var(--text-main)] leading-tight">{title}</h1>
              <p className="text-[var(--text-muted)] mt-0.5 text-sm font-medium">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('dashboard')}
              className="p-2.5 rounded-full bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 px-6 py-6 overflow-y-auto no-scrollbar min-h-0">
          {content}
        </div>

        {/* NavigationBar */}
        <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center bg-transparent pointer-events-none">
          <div className="w-full max-w-md flex justify-between items-center px-6 py-4 bg-[var(--card-bg)]/90 backdrop-blur-md border-t border-[var(--border)] pointer-events-auto">
            <button
              type="button"
              onClick={handleDoctorStepBack}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <ChevronLeft size={20} /> Indietro
            </button>
            <button
              type="button"
              onClick={handleDoctorStepNext}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md cursor-pointer transition-all active:scale-95"
            >
              {doctorRegStep === 7 ? 'Farmaci & Visite' : 'Avanti'} <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 5. REG MEDS SCREEN (ORIGINALE SINTESI)
  // =========================================================================
  if (viewMode === 'reg_meds') {
    const filteredMedsList = tempMeds.filter(med => med.type === wizardMedType);

    return (
      <div className="fixed inset-0 z-50 bg-[var(--bg)] flex flex-col overflow-hidden h-[100dvh]">
        <div className="pb-3 px-6 bg-[var(--card-bg)] shrink-0 z-10 border-b border-[var(--border)] pt-8">
          <div className="flex justify-between items-start gap-4 max-w-md mx-auto w-full">
            <div>
              <h1 className="text-2xl font-black text-[var(--text-main)] leading-tight">Farmaci e Visite</h1>
              <p className="text-[var(--text-muted)] mt-0.5 text-sm font-medium">Aggiungi ciò che ti serve</p>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('dashboard')}
              className="p-2.5 rounded-full bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 px-6 py-6 overflow-y-auto no-scrollbar min-h-0 max-w-md mx-auto w-full pb-32">
          {/* Card Input Aggiunta */}
          <div className="bg-[var(--card-bg)] p-5 rounded-3xl border border-[var(--border)] shadow-sm mb-6">
            <div className="flex gap-2.5 mb-4">
              <button
                type="button"
                onClick={() => setWizardMedType('farmaco')}
                className={`flex-1 py-3 rounded-xl text-base font-bold border-2 transition-all cursor-pointer ${
                  wizardMedType === 'farmaco' ? 'bg-orange-500 border-orange-600 text-white shadow-sm' : 'bg-[var(--surface-variant)] text-[var(--text-muted)] border-transparent'
                }`}
              >
                Farmaco
              </button>
              <button
                type="button"
                onClick={() => setWizardMedType('visita')}
                className={`flex-1 py-3 rounded-xl text-base font-bold border-2 transition-all cursor-pointer ${
                  wizardMedType === 'visita' ? 'bg-blue-600 border-blue-700 text-white shadow-sm' : 'bg-[var(--surface-variant)] text-[var(--text-muted)] border-transparent'
                }`}
              >
                Visita
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[var(--text-muted)] ml-1">
                {wizardMedType === 'farmaco' ? 'Nome Farmaco' : 'Tipo Visita'}
              </label>
              <div className="flex items-center gap-2.5 w-full">
                <input
                  type="text"
                  placeholder={wizardMedType === 'farmaco' ? 'Es. Cardioaspirina 100mg...' : 'Es. Controllo pressione...'}
                  value={wizardMedInput}
                  onChange={e => setWizardMedInput(capitalize(e.target.value))}
                  onKeyDown={e => e.key === 'Enter' && handleAddWizardMed()}
                  className="flex-1 p-3.5 rounded-xl border border-[var(--border)] text-base font-bold bg-[var(--surface-variant)] outline-none focus:border-teal-500 text-[var(--text-main)] placeholder:text-[var(--text-muted)]/40 min-w-0"
                />
                <button
                  type="button"
                  onClick={handleAddWizardMed}
                  disabled={!wizardMedInput.trim()}
                  className="w-13 h-13 bg-teal-600 text-white rounded-xl shadow-md flex items-center justify-center active:scale-95 disabled:opacity-40 shrink-0 cursor-pointer"
                >
                  <Plus size={26} />
                </button>
              </div>
            </div>
          </div>

          {/* Elenco Aggiunti */}
          <div className="space-y-3">
            <h3 className="text-base font-black text-[var(--text-main)] border-b border-[var(--border)] pb-2 flex items-center justify-between">
              <span>Lista {wizardMedType === 'farmaco' ? 'Farmaci' : 'Visite'}</span>
              <span className="text-xs font-bold text-teal-600 bg-teal-500/10 px-2 py-0.5 rounded-full">
                {filteredMedsList.length}
              </span>
            </h3>

            {filteredMedsList.length === 0 ? (
              <div className="text-center py-8 bg-[var(--surface-variant)]/50 border-2 border-dashed border-[var(--border)] rounded-2xl">
                <p className="text-[var(--text-muted)] italic text-sm">Nessun elemento aggiunto</p>
              </div>
            ) : (
              filteredMedsList.map(med => (
                <div key={med.id} className="bg-[var(--card-bg)] border border-[var(--border)] p-4 rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2.5 rounded-xl shrink-0 ${med.type === 'farmaco' ? 'bg-orange-500/15 text-orange-600' : 'bg-blue-500/15 text-blue-600'}`}>
                      {med.type === 'farmaco' ? <Pill size={20} /> : <Stethoscope size={20} />}
                    </div>
                    <span className="text-base font-bold text-[var(--text-main)] truncate">{med.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTempMeds(prev => prev.filter(m => m.id !== med.id))}
                    className="text-red-500 bg-red-500/10 p-2.5 rounded-xl hover:bg-red-500/20 transition-colors cursor-pointer"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer con Completa Configurazione */}
        <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center bg-transparent pointer-events-none">
          <div className="w-full max-w-md p-5 bg-[var(--card-bg)]/90 backdrop-blur-md border-t border-[var(--border)] pointer-events-auto flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleCompleteWizardRegistration}
              className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white font-black text-lg rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all cursor-pointer"
            >
              <CheckCircle2 size={24} /> Completa Configurazione
            </button>
            <button
              type="button"
              onClick={() => { setDoctorRegStep(7); setViewMode('reg_doctor'); }}
              className="w-full py-2 text-[var(--text-muted)] font-bold text-xs active:scale-95 cursor-pointer"
            >
              Modifica orari o dati dottore
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 6. DASHBOARD PRINCIPALE DELLO STUDIO MEDICO
  // =========================================================================
  const doctorFullName = `${state.doctor.gender === 'F' ? 'Dott.ssa' : 'Dr.'} ${state.doctor.lastName || state.doctor.firstName || 'Medico di Famiglia'}`;

  return (
    <div className="fixed inset-0 z-40 bg-[var(--bg)] text-[var(--text-main)] flex flex-col overflow-hidden animate-fade-in">
      {/* Header Studio Medico */}
      <header className="h-16 lg:h-20 bg-[var(--card-bg)] border-b border-[var(--border)] px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-center transition-colors cursor-pointer"
            title="Torna indietro"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20 shadow-inner">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-base lg:text-lg leading-tight flex items-center gap-2 truncate">
                <span className="truncate">Studio Medico</span>
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] truncate">
                {state.doctor.lastName ? doctorFullName : 'Configura il tuo medico di base'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenBackup}
            className="w-10 h-10 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-center transition-colors cursor-pointer"
            title="Codice QR Profilo Medico"
          >
            <QrCode className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleOpenEditDoctor}
            className="w-10 h-10 rounded-2xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white flex items-center justify-center transition-all shadow-md shadow-teal-600/20 cursor-pointer"
            title="Impostazioni"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Scrollable */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
        
        {/* Banner Dottore & Stato Studio in Tempo Reale */}
        <div className="bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--border)] p-6 sm:p-7 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Info Medico */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                  {state.doctor.specialization || 'Medico di Famiglia'}
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] tracking-tight">
                {state.doctor.lastName ? doctorFullName : 'Nome del Medico non configurato'}
              </h3>
              
              {state.doctor.address && (
                <p className="text-xs sm:text-sm text-[var(--text-muted)] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-teal-500 shrink-0" />
                  <span>{state.doctor.address}, {state.doctor.cap} {state.doctor.city}</span>
                </p>
              )}

              {/* Bottoni Rapidi Chiamata & Indicazioni */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {state.doctor.mobile && (
                  <button
                    type="button"
                    onClick={() => handleCallDoctor(state.doctor.mobile)}
                    className="px-3.5 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Cellulare: {state.doctor.mobile}</span>
                  </button>
                )}
                {state.doctor.landline && (
                  <button
                    type="button"
                    onClick={() => handleCallDoctor(state.doctor.landline)}
                    className="px-3.5 py-2 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-teal-500" />
                    <span>Fisso: {state.doctor.landline}</span>
                  </button>
                )}
                {state.doctor.address && (
                  <button
                    type="button"
                    onClick={handleOpenNavigation}
                    className="px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Indicazioni Studio</span>
                  </button>
                )}
              </div>
            </div>

            {/* Badge Stato Apertura/Chiusura Live */}
            <div className="bg-[var(--surface-variant)] rounded-3xl p-5 border border-[var(--border)] min-w-[240px] flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Stato Studio Live
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  studioStatus.isOpen
                    ? studioStatus.isClosingSoon
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 animate-pulse'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                }`}>
                  {studioStatus.label}
                </span>
              </div>

              <div>
                <p className="text-base font-black text-[var(--text-main)] leading-snug">
                  {studioStatus.detail}
                </p>
                {studioStatus.nextOpeningText && (
                  <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-teal-500" />
                    <span>Prossima apertura: {studioStatus.nextOpeningText}</span>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowFullSchedule(!showFullSchedule)}
                className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center justify-between pt-2 border-t border-[var(--border)] hover:underline cursor-pointer"
              >
                <span>{showFullSchedule ? 'Nascondi orari completi' : 'Vedi orari completi'}</span>
                {showFullSchedule ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Tabella Orari Settimanali Espandibile */}
          <AnimatePresence>
            {showFullSchedule && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 pt-6 border-t border-[var(--border)] overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {DAYS_NAMES.map(day => {
                    const daySched = state.doctor.schedule[day.id];
                    const isToday = (currentTime.getDay() === day.id);
                    return (
                      <div
                        key={day.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isToday
                            ? 'bg-teal-500/10 border-teal-500/40 shadow-sm'
                            : 'bg-[var(--surface-variant)] border-[var(--border)]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-black ${isToday ? 'text-teal-600 dark:text-teal-400' : 'text-[var(--text-main)]'}`}>
                            {day.name} {isToday && '(Oggi)'}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            daySched?.closed ? 'bg-rose-500/15 text-rose-500' : 'bg-emerald-500/15 text-emerald-500'
                          }`}>
                            {daySched?.closed ? 'Chiuso' : 'Aperto'}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-[var(--text-muted)] space-y-0.5">
                          {daySched?.closed ? (
                            <p>Ambulatorio Chiuso</p>
                          ) : (
                            daySched?.slots.map((s, idx) => (
                              <p key={idx}>{s.start} - {s.end}</p>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sezione Richiesta Ricette & Farmaci Ripetitivi */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-[var(--text-main)] flex items-center gap-2">
                <Pill className="w-5 h-5 text-teal-500" />
                <span>Farmaci & Prestazioni Ripetitive</span>
                <span className="text-xs font-bold text-[var(--text-muted)]">
                  ({filteredMedicines.length})
                </span>
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Seleziona i farmaci o le visite da richiedere e genera la richiesta per il medico.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddMedOpen(true)}
                className="px-3.5 py-2 rounded-2xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-teal-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Aggiungi Farmaco / Visita</span>
              </button>
            </div>
          </div>

          {/* Barra Ricerca & Filtri Categoria */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-[var(--card-bg)] p-3 rounded-2xl border border-[var(--border)]">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cerca farmaco, principio attivo o visita..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeCategoryFilter === 'all'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Tutti
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('farmaco')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeCategoryFilter === 'farmaco'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Farmaci
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('visita')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeCategoryFilter === 'visita'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Visite
              </button>

              <div className="h-4 w-px bg-[var(--border)] mx-1" />

              <button
                type="button"
                onClick={selectedMedIds.size === filteredMedicines.length ? deselectAll : selectAllFiltered}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer whitespace-nowrap"
              >
                {selectedMedIds.size === filteredMedicines.length && filteredMedicines.length > 0 ? 'Deseleziona' : 'Seleziona tutti'}
              </button>
            </div>
          </div>

          {/* Griglia Farmaci / Visite */}
          {filteredMedicines.length === 0 ? (
            <div className="p-8 text-center bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 mx-auto flex items-center justify-center">
                <Pill className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[var(--text-main)]">Nessun medicinale o visita registrata</p>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Aggiungi i tuoi farmaci abituali o esami di routine per poter richiedere le ricette in un clic via email o messaggio.
              </p>
              <button
                type="button"
                onClick={() => setIsAddMedOpen(true)}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Aggiungi ora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredMedicines.map(med => {
                const isSelected = selectedMedIds.has(med.id);
                return (
                  <div
                    key={med.id}
                    onClick={() => toggleSelectMedicine(med.id)}
                    className={`p-4 rounded-3xl border transition-all text-left flex flex-col justify-between gap-3 cursor-pointer select-none group ${
                      isSelected
                        ? 'bg-teal-500/10 border-teal-500 shadow-md ring-2 ring-teal-500/20'
                        : 'bg-[var(--card-bg)] border-[var(--border)] hover:border-teal-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          med.type === 'farmaco'
                            ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        }`}>
                          {med.type === 'farmaco' ? <Pill className="w-4 h-4" /> : <Stethoscope className="w-4 h-4" />}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          med.type === 'farmaco'
                            ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        }`}>
                          {med.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteMedicine(med.id, e)}
                          className="w-7 h-7 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Elimina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors ${
                          isSelected
                            ? 'bg-teal-600 border-teal-600 text-white'
                            : 'border-[var(--border)] bg-[var(--surface-variant)] text-transparent'
                        }`}>
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-[var(--text-main)] leading-tight">
                        {med.name}
                      </h4>
                      {med.posology && (
                        <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1 font-medium">
                          <span>Posologia:</span>
                          <span className="text-[var(--text-main)]">{med.posology}</span>
                        </p>
                      )}
                      {med.notes && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 italic">
                          {med.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
                      <span>{isSelected ? 'Selezionato per ricetta' : 'Tocca per selezionare'}</span>
                      {isSelected && <span className="font-bold text-teal-600 dark:text-teal-400">Incluso</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Bar per Generare la Richiesta Ricetta */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-4 sm:bottom-6 inset-x-4 sm:inset-x-auto sm:right-6 sm:max-w-md z-30">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="p-4 bg-teal-600 text-white rounded-3xl shadow-2xl flex items-center justify-between gap-4 border border-teal-400/30"
          >
            <div>
              <p className="font-black text-sm leading-tight flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-200" />
                <span>{selectedItems.length} {selectedItems.length === 1 ? 'elemento selezionato' : 'elementi selezionati'}</span>
              </p>
              <p className="text-xs text-teal-100">
                Pronti per la richiesta al medico
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsEmailPreviewOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-white text-teal-700 hover:bg-teal-50 active:scale-95 font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Genera Richiesta</span>
            </button>
          </motion.div>
        </div>
      )}

      {/* Modale: Dati Medico (Settings) */}
      <AnimatePresence>
        {isEditDoctorOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--border)] max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-[var(--text-main)]">Dati Studio & Medico</h3>
                    <p className="text-xs text-[var(--text-muted)]">Informazioni usate per le comunicazioni e le ricette</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditDoctorOpen(false)}
                  className="p-2 rounded-xl bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[var(--text-muted)] mb-1">Titolo / Genere</label>
                    <select
                      value={tempDoctor.gender}
                      onChange={e => setTempDoctor({ ...tempDoctor, gender: e.target.value as 'M' | 'F' })}
                      className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] font-bold"
                    >
                      <option value="M">Dottore (Dr.)</option>
                      <option value="F">Dottoressa (Dott.ssa)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-[var(--text-muted)] mb-1">Specializzazione</label>
                    <input
                      type="text"
                      value={tempDoctor.specialization}
                      onChange={e => setTempDoctor({ ...tempDoctor, specialization: e.target.value })}
                      placeholder="Medico di Famiglia"
                      className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[var(--text-muted)] mb-1">Cognome Medico *</label>
                    <input
                      type="text"
                      value={tempDoctor.lastName}
                      onChange={e => setTempDoctor({ ...tempDoctor, lastName: capitalize(e.target.value) })}
                      placeholder="Rossi"
                      className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[var(--text-muted)] mb-1">Nome Medico</label>
                    <input
                      type="text"
                      value={tempDoctor.firstName}
                      onChange={e => setTempDoctor({ ...tempDoctor, firstName: capitalize(e.target.value) })}
                      placeholder="Mario"
                      className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[var(--text-muted)] mb-1">Email per Invio Ricette *</label>
                  <input
                    type="email"
                    value={tempDoctor.email}
                    onChange={e => setTempDoctor({ ...tempDoctor, email: e.target.value })}
                    placeholder="studio.rossi@email.it"
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[var(--text-muted)] mb-1">Telefono Mobile / WhatsApp</label>
                    <input
                      type="tel"
                      value={tempDoctor.mobile}
                      onChange={e => setTempDoctor({ ...tempDoctor, mobile: e.target.value })}
                      placeholder="333 1234567"
                      className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[var(--text-muted)] mb-1">Telefono Fisso Studio</label>
                    <input
                      type="tel"
                      value={tempDoctor.landline}
                      onChange={e => setTempDoctor({ ...tempDoctor, landline: e.target.value })}
                      placeholder="06 12345678"
                      className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block font-bold text-[var(--text-muted)] mb-1">Indirizzo Ambulatorio</label>
                    <input
                      type="text"
                      value={tempDoctor.address}
                      onChange={e => setTempDoctor({ ...tempDoctor, address: capitalize(e.target.value) })}
                      placeholder="Via Roma, 12"
                      className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[var(--text-muted)] mb-1">Città</label>
                    <input
                      type="text"
                      value={tempDoctor.city}
                      onChange={e => setTempDoctor({ ...tempDoctor, city: capitalize(e.target.value) })}
                      placeholder="Milano"
                      className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[var(--text-muted)] mb-1">Note & Istruzioni dello Studio</label>
                  <textarea
                    rows={2}
                    value={tempDoctor.notes}
                    onChange={e => setTempDoctor({ ...tempDoctor, notes: e.target.value })}
                    placeholder="Es. Per visite domiciliari chiamare entro le 10:00..."
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsEditDoctorOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--surface-variant)] cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleSaveDoctor}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs shadow-md cursor-pointer"
                >
                  Salva Modifiche
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modale: Aggiungi Farmaco / Visita */}
      <AnimatePresence>
        {isAddMedOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--border)] max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-base text-[var(--text-main)]">Nuovo Farmaco o Visita</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddMedOpen(false)}
                  className="p-2 rounded-xl bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-[var(--text-muted)] mb-1">Tipologia</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewMedType('farmaco')}
                      className={`p-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        newMedType === 'farmaco'
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-[var(--surface-variant)] text-[var(--text-muted)]'
                      }`}
                    >
                      <Pill className="w-3.5 h-3.5" />
                      <span>Farmaco</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewMedType('visita')}
                      className={`p-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        newMedType === 'visita'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-[var(--surface-variant)] text-[var(--text-muted)]'
                      }`}
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Visita Medica</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[var(--text-muted)] mb-1">Nome Farmaco / Visita *</label>
                  <input
                    type="text"
                    value={newMedName}
                    onChange={e => setNewMedName(e.target.value)}
                    placeholder={newMedType === 'farmaco' ? 'Es. Cardioaspirina 100mg' : 'Es. Controllo pressione arteriosa'}
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] font-bold text-xs"
                  />
                </div>

                {newMedType === 'farmaco' && (
                  <div>
                    <label className="block font-bold text-[var(--text-muted)] mb-1">Posologia / Frequenza (Opzionale)</label>
                    <input
                      type="text"
                      value={newMedPosology}
                      onChange={e => setNewMedPosology(e.target.value)}
                      placeholder="Es. 1 compressa la mattina a digiuno"
                      className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] font-medium text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-[var(--text-muted)] mb-1">Note Aggiuntive (Opzionale)</label>
                  <input
                    type="text"
                    value={newMedNotes}
                    onChange={e => setNewMedNotes(e.target.value)}
                    placeholder="Es. Richiesta urgente, piano terapeutico scaduto..."
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] font-medium text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsAddMedOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--surface-variant)] cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleAddMedicine}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs shadow-md cursor-pointer"
                >
                  Aggiungi alla Lista
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modale: Anteprima Richiesta & Invio Email */}
      <AnimatePresence>
        {isEmailPreviewOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--border)] max-w-lg w-full p-6 shadow-2xl space-y-4 my-8"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-[var(--text-main)]">Anteprima Richiesta Medico</h3>
                    <p className="text-xs text-[var(--text-muted)]">Verifica il messaggio formale prima di inviarlo</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEmailPreviewOpen(false)}
                  className="p-2 rounded-xl bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Dati Paziente */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-[var(--surface-variant)] p-3 rounded-2xl border border-[var(--border)]">
                <div>
                  <label className="block font-bold text-[var(--text-muted)] mb-0.5">Nome Assistito</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    className="w-full p-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[var(--text-muted)] mb-0.5">Codice Fiscale</label>
                  <input
                    type="text"
                    value={patientFiscalCode}
                    onChange={e => setPatientFiscalCode(e.target.value.toUpperCase())}
                    placeholder="RSSMRA..."
                    className="w-full p-1.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] font-mono font-bold text-xs"
                  />
                </div>
              </div>

              {/* Anteprima Testo Email Formale */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-muted)]">Destinatario:</span>
                  <span className="text-xs font-black text-teal-600 dark:text-teal-400">{state.doctor.email || 'Nessuna email configurata'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-muted)]">Oggetto:</span>
                  <span className="text-xs font-black text-[var(--text-main)] truncate max-w-[280px]">{generatedEmail.subject}</span>
                </div>

                <div className="p-3 bg-[var(--surface-variant)] rounded-2xl border border-[var(--border)] max-h-48 overflow-y-auto font-mono text-[11px] text-[var(--text-main)] whitespace-pre-wrap leading-relaxed">
                  {generatedEmail.body}
                </div>
              </div>

              {/* Azioni Invio */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedEmail.body);
                    showToast?.('Testo richiesta copiato per WhatsApp o messaggio', 'success');
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copia Testo</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEmailPreviewOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] cursor-pointer"
                  >
                    Chiudi
                  </button>
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Invia Email</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modale: QR Code Profilo Medico */}
      <AnimatePresence>
        {isBackupOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--border)] max-w-sm w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-base text-[var(--text-main)]">Codice QR Profilo</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBackupOpen(false)}
                  className="p-2 rounded-xl bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col items-center gap-4 text-center">
                <p className="text-xs text-[var(--text-muted)]">
                  Mostra questo codice QR per condividere i dati dello studio medico o per un backup rapido.
                </p>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <QRCodeSVG value={backupCode} size={200} />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
