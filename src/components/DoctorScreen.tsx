import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Stethoscope, Clock, Phone, MapPin, Mail, Plus, Trash2,
  Check, Send, Settings, ChevronDown, ChevronUp, Copy, CheckCircle2,
  Calendar, AlertCircle, Edit3, X, Sparkles, Navigation, Pill, FileText,
  Search, ShieldCheck, Download, Upload, ExternalLink
} from 'lucide-react';
import {
  DoctorProfile, MedicineItem, DoctorState, DAYS_NAMES,
  loadDoctorState, saveDoctorState, computeDoctorStudioStatus,
  buildPrescriptionEmail, DEFAULT_DOCTOR_STATE, DoctorDaySchedule
} from '../services/doctorService';
import { validateFiscalCode } from '../services/cfValidator';

export interface DoctorScreenProps {
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  defaultPatientName?: string;
  defaultPatientFiscalCode?: string;
}

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

  // Modali
  const [isEditDoctorOpen, setIsEditDoctorOpen] = useState(false);
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  // Form Dottore temporaneo per modifica
  const [tempDoctor, setTempDoctor] = useState<DoctorProfile>(state.doctor);

  // Form Paziente per prescrizione
  const [patientName, setPatientName] = useState(defaultPatientName || 'Assistito');
  const [patientFiscalCode, setPatientFiscalCode] = useState(defaultPatientFiscalCode);
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Form Aggiungi Medicinale
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
    updateState(prev => ({
      ...prev,
      doctor: tempDoctor,
      configured: true,
    }));
    setIsEditDoctorOpen(false);
    showToast?.('Profilo medico aggiornato con successo', 'success');
  };

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
    window.location.href = `tel:${number.replace(/\s+/g, '')}`;
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
        showToast?.('Dati ripristinati correttamente!', 'success');
      } else {
        throw new Error('Formato non valido');
      }
    } catch {
      showToast?.('Codice di backup non valido', 'error');
    }
  };

  const doctorFullName = `${state.doctor.gender === 'F' ? 'Dott.ssa' : 'Dr.'} ${state.doctor.firstName} ${state.doctor.lastName}`.trim();

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
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20 shadow-inner">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base lg:text-lg leading-tight flex items-center gap-2">
                <span>Studio Medico & Ricette</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  Live
                </span>
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] truncate">
                {state.doctor.lastName ? doctorFullName : 'Configura il tuo medico di base'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenBackup}
            className="w-10 h-10 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-center transition-colors cursor-pointer"
            title="Backup e Ripristino"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleOpenEditDoctor}
            className="px-3.5 py-2 rounded-2xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-teal-600/20 cursor-pointer"
            title="Modifica dati studio"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Dati Medico</span>
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

              {state.doctor.notes && (
                <p className="text-xs text-[var(--text-muted)] italic bg-[var(--surface-variant)] p-2.5 rounded-xl border border-[var(--border)] mt-2">
                  ℹ️ {state.doctor.notes}
                </p>
              )}
            </div>

            {/* Card Stato Live con Calcolo Matematico */}
            <div className="bg-[var(--surface-variant)] border border-[var(--border)] rounded-3xl p-5 md:min-w-[280px] flex flex-col items-center sm:items-end text-center sm:text-right shadow-inner">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${
                  studioStatus.statusColor === 'emerald' ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.7)]' :
                  studioStatus.statusColor === 'amber' ? 'bg-amber-500 animate-bounce' :
                  'bg-rose-500'
                }`} />
                <span className={`text-base font-black tracking-wider ${
                  studioStatus.statusColor === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                  studioStatus.statusColor === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                  'text-rose-600 dark:text-rose-400'
                }`}>
                  {studioStatus.label}
                </span>
              </div>
              <p className="text-xs font-bold text-[var(--text-main)]">
                {studioStatus.detail}
              </p>
              <button
                type="button"
                onClick={() => setShowFullSchedule(!showFullSchedule)}
                className="mt-3 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{showFullSchedule ? 'Nascondi orari completi' : 'Visualizza tutti gli orari'}</span>
                {showFullSchedule ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Quick Actions (Chiama, Mappa, Email) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => handleCallDoctor(state.doctor.landline || state.doctor.mobile)}
              className="py-3 px-4 rounded-2xl bg-[var(--surface-variant)] hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-[var(--border)] text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Phone className="w-4 h-4 text-emerald-500" />
              <span>Chiama Studio</span>
            </button>

            {state.doctor.mobile && (
              <button
                type="button"
                onClick={() => handleCallDoctor(state.doctor.mobile)}
                className="py-3 px-4 rounded-2xl bg-[var(--surface-variant)] hover:bg-teal-500/10 hover:border-teal-500/30 border border-[var(--border)] text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Phone className="w-4 h-4 text-teal-500" />
                <span>Cellulare</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenNavigation}
              className="py-3 px-4 rounded-2xl bg-[var(--surface-variant)] hover:bg-blue-500/10 hover:border-blue-500/30 border border-[var(--border)] text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Navigation className="w-4 h-4 text-blue-500" />
              <span>Apri Mappa</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (selectedItems.length === 0) {
                  showToast?.('Seleziona almeno un farmaco o una visita dalla lista sotto', 'info');
                } else {
                  setIsEmailPreviewOpen(true);
                }
              }}
              className="py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-teal-600/20 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>Richiedi ({selectedMedIds.size})</span>
            </button>
          </div>

          {/* Griglia Orari Settimanali a comparsa */}
          <AnimatePresence>
            {showFullSchedule && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 pt-6 border-t border-[var(--border)]"
              >
                <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal-500" />
                  Orari di ricevimento studio
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {DAYS_NAMES.map(day => {
                    const sched = state.doctor.schedule[day.id];
                    const isToday = currentTime.getDay() === day.id;
                    const isClosed = !sched || sched.closed || !sched.slots || sched.slots.length === 0;

                    return (
                      <div
                        key={day.id}
                        className={`p-3 rounded-2xl border text-xs flex flex-col justify-between transition-all ${
                          isToday
                            ? 'bg-teal-500/10 border-teal-500/30 font-bold'
                            : 'bg-[var(--surface-variant)] border-[var(--border)]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`${isToday ? 'text-teal-600 dark:text-teal-400 font-black' : 'text-[var(--text-main)] font-semibold'}`}>
                            {day.name} {isToday && '(Oggi)'}
                          </span>
                          {isClosed ? (
                            <span className="text-[10px] text-rose-500 font-bold">CHIUSO</span>
                          ) : (
                            <span className="text-[10px] text-emerald-500 font-bold">APERTO</span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {isClosed ? (
                            'Nessun ricevimento'
                          ) : (
                            sched.slots.map((s, idx) => (
                              <div key={idx}>{s.start} - {s.end}</div>
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

        {/* Gestione Farmaci e Visite */}
        <div className="bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--border)] p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2">
                <Pill className="w-5 h-5 text-teal-500" />
                <span>Farmaci & Visite Mediche</span>
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Spunta gli elementi che desideri richiedere al tuo medico con un solo tap
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectedMedIds.size === filteredMedicines.length && filteredMedicines.length > 0 ? deselectAll : selectAllFiltered}
                className="px-3 py-2 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-xs font-bold text-[var(--text-muted)] transition-colors cursor-pointer"
              >
                {selectedMedIds.size === filteredMedicines.length && filteredMedicines.length > 0 ? 'Deseleziona tutti' : 'Seleziona tutti'}
              </button>
              <button
                type="button"
                onClick={() => setIsAddMedOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-teal-600/20 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Aggiungi</span>
              </button>
            </div>
          </div>

          {/* Filtri & Cerca */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cerca farmaco, principio attivo o visita..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl shrink-0">
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeCategoryFilter === 'all'
                    ? 'bg-[var(--card-bg)] text-teal-600 dark:text-teal-400 shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Tutti ({state.medicines.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('farmaco')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeCategoryFilter === 'farmaco'
                    ? 'bg-[var(--card-bg)] text-teal-600 dark:text-teal-400 shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Farmaci ({state.medicines.filter(m => m.type === 'farmaco').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('visita')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeCategoryFilter === 'visita'
                    ? 'bg-[var(--card-bg)] text-teal-600 dark:text-teal-400 shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                Visite ({state.medicines.filter(m => m.type === 'visita').length})
              </button>
            </div>
          </div>

          {/* Lista Farmaci */}
          {filteredMedicines.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-muted)] bg-[var(--surface-variant)] rounded-3xl border border-dashed border-[var(--border)]">
              <Pill className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-bold">Nessun farmaco o visita presente</p>
              <p className="text-xs mt-1">Tocca "Aggiungi" per memorizzare le tue ricette ricorrenti</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredMedicines.map(item => {
                const isSelected = selectedMedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelectMedicine(item.id)}
                    className={`p-4 rounded-3xl border text-left transition-all flex items-start gap-3.5 cursor-pointer active:scale-[0.99] relative ${
                      isSelected
                        ? 'bg-teal-500/10 border-teal-500/40 shadow-sm'
                        : 'bg-[var(--surface-variant)] border-[var(--border)] hover:border-teal-500/30'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-teal-600 text-white'
                        : 'border-2 border-[var(--border)] bg-[var(--card-bg)]'
                    }`}>
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>

                    <div className="flex-1 min-w-0 pr-8">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          item.type === 'farmaco'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                        }`}>
                          {item.type === 'farmaco' ? 'Farmaco' : 'Visita / Esame'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[var(--text-main)] truncate">
                        {item.name}
                      </h4>
                      {item.posology && (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                          💊 {item.posology}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[11px] text-[var(--text-muted)] italic mt-0.5">
                          {item.notes}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteMedicine(item.id, e)}
                      className="absolute top-3.5 right-3.5 w-8 h-8 rounded-xl bg-transparent hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                      title="Elimina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Floating Bottom Bar quando ci sono elementi selezionati */}
      <AnimatePresence>
        {selectedMedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="shrink-0 p-4 border-t border-[var(--border)] bg-[var(--card-bg)] shadow-xl"
          >
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
              <div>
                <span className="text-xs text-[var(--text-muted)]">Elementi selezionati:</span>
                <p className="text-sm font-black text-teal-600 dark:text-teal-400">
                  {selectedMedIds.size} {selectedMedIds.size === 1 ? 'prescrizione' : 'prescrizioni'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={deselectAll}
                  className="px-3.5 py-2.5 rounded-2xl bg-[var(--surface-variant)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={() => setIsEmailPreviewOpen(true)}
                  className="px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-600/30 active:scale-95 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Invia Richiesta al Dottore</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modale Modifica Dati Dottore & Orari */}
      {isEditDoctorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--border)] p-6 sm:p-8 max-w-2xl w-full my-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-[var(--text-main)]">Dati Medico & Orari Studio</h3>
                <p className="text-xs text-[var(--text-muted)]">Inserisci i recapiti ufficiali del tuo medico</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditDoctorOpen(false)}
                className="w-9 h-9 rounded-xl bg-[var(--surface-variant)] text-[var(--text-muted)] flex items-center justify-center hover:bg-[var(--border)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Genere / Titolo</label>
                  <select
                    value={tempDoctor.gender}
                    onChange={e => setTempDoctor({ ...tempDoctor, gender: e.target.value as 'M' | 'F' })}
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold"
                  >
                    <option value="M">Dr. (Maschile)</option>
                    <option value="F">Dott.ssa (Femminile)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Nome</label>
                  <input
                    type="text"
                    value={tempDoctor.firstName}
                    onChange={e => setTempDoctor({ ...tempDoctor, firstName: e.target.value })}
                    placeholder="Mario"
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Cognome *</label>
                  <input
                    type="text"
                    value={tempDoctor.lastName}
                    onChange={e => setTempDoctor({ ...tempDoctor, lastName: e.target.value })}
                    placeholder="Rossi"
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Email Ufficiale Ricette *</label>
                <input
                  type="email"
                  value={tempDoctor.email}
                  onChange={e => setTempDoctor({ ...tempDoctor, email: e.target.value })}
                  placeholder="dottore.rossi@medico.it"
                  className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Telefono Studio (Fisso)</label>
                  <input
                    type="tel"
                    value={tempDoctor.landline}
                    onChange={e => setTempDoctor({ ...tempDoctor, landline: e.target.value })}
                    placeholder="06 1234567"
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Cellulare Medico</label>
                  <input
                    type="tel"
                    value={tempDoctor.mobile}
                    onChange={e => setTempDoctor({ ...tempDoctor, mobile: e.target.value })}
                    placeholder="333 1234567"
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Indirizzo Studio</label>
                  <input
                    type="text"
                    value={tempDoctor.address}
                    onChange={e => setTempDoctor({ ...tempDoctor, address: e.target.value })}
                    placeholder="Via Roma 10"
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Città</label>
                  <input
                    type="text"
                    value={tempDoctor.city}
                    onChange={e => setTempDoctor({ ...tempDoctor, city: e.target.value })}
                    placeholder="Roma"
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold"
                  />
                </div>
              </div>

              {/* Orari Settimanali */}
              <div className="pt-2">
                <h4 className="text-xs font-black uppercase text-teal-600 dark:text-teal-400 mb-2">Orari Ricevimento Settimanali</h4>
                <div className="space-y-2">
                  {DAYS_NAMES.map(day => {
                    const sched = tempDoctor.schedule[day.id] || { closed: false, slots: [{ start: '09:00', end: '12:30' }] };
                    const isClosed = sched.closed;
                    const slot1 = sched.slots?.[0] || { start: '09:00', end: '12:30' };
                    const slot2 = sched.slots?.[1];

                    const updateDay = (newSched: DoctorDaySchedule) => {
                      setTempDoctor(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule, [day.id]: newSched },
                      }));
                    };

                    return (
                      <div key={day.id} className="p-3 rounded-2xl bg-[var(--surface-variant)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 sm:w-32">
                          <span className="font-bold text-[var(--text-main)]">{day.name}</span>
                        </div>

                        <div className="flex items-center gap-2 flex-1">
                          <button
                            type="button"
                            onClick={() => updateDay({ ...sched, closed: !isClosed })}
                            className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase transition-colors cursor-pointer ${
                              isClosed ? 'bg-rose-500/20 text-rose-600' : 'bg-emerald-500/20 text-emerald-600'
                            }`}
                          >
                            {isClosed ? 'Chiuso' : 'Aperto'}
                          </button>

                          {!isClosed && (
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Slot 1 */}
                              <div className="flex items-center gap-1 bg-[var(--card-bg)] px-2 py-1 rounded-xl border border-[var(--border)]">
                                <input
                                  type="time"
                                  value={slot1.start}
                                  onChange={e => {
                                    const newSlots = [...(sched.slots || [])];
                                    newSlots[0] = { ...slot1, start: e.target.value };
                                    updateDay({ ...sched, slots: newSlots });
                                  }}
                                  className="bg-transparent font-bold text-xs"
                                />
                                <span>-</span>
                                <input
                                  type="time"
                                  value={slot1.end}
                                  onChange={e => {
                                    const newSlots = [...(sched.slots || [])];
                                    newSlots[0] = { ...slot1, end: e.target.value };
                                    updateDay({ ...sched, slots: newSlots });
                                  }}
                                  className="bg-transparent font-bold text-xs"
                                />
                              </div>

                              {/* Slot 2 (Pomeriggio opzionale) */}
                              {slot2 ? (
                                <div className="flex items-center gap-1 bg-[var(--card-bg)] px-2 py-1 rounded-xl border border-[var(--border)]">
                                  <input
                                    type="time"
                                    value={slot2.start}
                                    onChange={e => {
                                      const newSlots = [...sched.slots];
                                      newSlots[1] = { ...slot2, start: e.target.value };
                                      updateDay({ ...sched, slots: newSlots });
                                    }}
                                    className="bg-transparent font-bold text-xs"
                                  />
                                  <span>-</span>
                                  <input
                                    type="time"
                                    value={slot2.end}
                                    onChange={e => {
                                      const newSlots = [...sched.slots];
                                      newSlots[1] = { ...slot2, end: e.target.value };
                                      updateDay({ ...sched, slots: newSlots });
                                    }}
                                    className="bg-transparent font-bold text-xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateDay({ ...sched, slots: [slot1] })}
                                    className="text-rose-500 hover:text-rose-700 ml-1 text-xs"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => updateDay({ ...sched, slots: [slot1, { start: '16:00', end: '19:00' }] })}
                                  className="text-[10px] text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                                >
                                  + Pomeriggio
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditDoctorOpen(false)}
                className="flex-1 py-3 rounded-2xl bg-[var(--surface-variant)] text-xs font-bold text-[var(--text-muted)] cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleSaveDoctor}
                className="flex-1 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-600/30 cursor-pointer"
              >
                Salva Modifiche
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Aggiungi Farmaco / Visita */}
      {isAddMedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--border)] p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-[var(--text-main)]">Aggiungi Prescrizione</h3>
              <button
                type="button"
                onClick={() => setIsAddMedOpen(false)}
                className="w-8 h-8 rounded-xl bg-[var(--surface-variant)] text-[var(--text-muted)] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewMedType('farmaco')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      newMedType === 'farmaco'
                        ? 'bg-blue-500/10 border-blue-500/40 text-blue-600'
                        : 'bg-[var(--surface-variant)] border-[var(--border)] text-[var(--text-muted)]'
                    }`}
                  >
                    Farmaco / Medicina
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewMedType('visita')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      newMedType === 'visita'
                        ? 'bg-purple-500/10 border-purple-500/40 text-purple-600'
                        : 'bg-[var(--surface-variant)] border-[var(--border)] text-[var(--text-muted)]'
                    }`}
                  >
                    Visita / Esame
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">
                  Nome {newMedType === 'farmaco' ? 'Farmaco e Dosaggio' : 'Visita Specialistica o Esame'} *
                </label>
                <input
                  type="text"
                  value={newMedName}
                  onChange={e => setNewMedName(e.target.value)}
                  placeholder={newMedType === 'farmaco' ? 'es. Tachipirina 1000mg compresse' : 'es. Visita cardiologica con ECG'}
                  className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold"
                />
              </div>

              {newMedType === 'farmaco' && (
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Posologia / Frequenza (Opzionale)</label>
                  <input
                    type="text"
                    value={newMedPosology}
                    onChange={e => setNewMedPosology(e.target.value)}
                    placeholder="es. 1 compressa al giorno dopo pranzo"
                    className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Note / Quesito Diagnostico (Opzionale)</label>
                <input
                  type="text"
                  value={newMedNotes}
                  onChange={e => setNewMedNotes(e.target.value)}
                  placeholder="es. Controllo annuale valori pressori"
                  className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsAddMedOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--surface-variant)] text-xs font-bold text-[var(--text-muted)] cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleAddMedicine}
                className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/30 cursor-pointer"
              >
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Anteprima Email Prescrizione */}
      {isEmailPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--border)] p-6 sm:p-8 max-w-lg w-full my-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-[var(--text-main)]">Richiesta Prescrizioni</h3>
                <p className="text-xs text-[var(--text-muted)]">Verifica il messaggio prima dell'invio</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailPreviewOpen(false)}
                className="w-8 h-8 rounded-xl bg-[var(--surface-variant)] text-[var(--text-muted)] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Nome e Cognome Paziente</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    className="w-full p-2 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Codice Fiscale Paziente</label>
                  <input
                    type="text"
                    value={patientFiscalCode}
                    onChange={e => setPatientFiscalCode(e.target.value.toUpperCase())}
                    placeholder="RSSMRA80A01H501U"
                    className="w-full p-2 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Note Aggiuntive per il Dottore</label>
                <textarea
                  rows={2}
                  value={additionalNotes}
                  onChange={e => setAdditionalNotes(e.target.value)}
                  placeholder="es. Per favore inviare le ricette dematerializzate via SMS/email"
                  className="w-full p-2 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-medium resize-none"
                />
              </div>

              {/* Anteprima Testo Email */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Anteprima Testo Ufficiale</label>
                <pre className="w-full p-3 rounded-2xl bg-[var(--surface-variant)] border border-[var(--border)] text-[11px] text-[var(--text-main)] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                  {generatedEmail.body}
                </pre>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsEmailPreviewOpen(false)}
                className="flex-1 py-3 rounded-xl bg-[var(--surface-variant)] text-xs font-bold text-[var(--text-muted)] cursor-pointer"
              >
                Modifica
              </button>
              <button
                type="button"
                onClick={handleSendEmail}
                className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>Apri Email e Invia</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Backup & Ripristino */}
      {isBackupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--border)] p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-[var(--text-main)]">Backup & Ripristino Medico</h3>
              <button
                type="button"
                onClick={() => setIsBackupOpen(false)}
                className="w-8 h-8 rounded-xl bg-[var(--surface-variant)] text-[var(--text-muted)] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Esporta Dati Attuali</label>
                <button
                  type="button"
                  onClick={handleCopyBackup}
                  className="w-full py-2.5 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] border border-[var(--border)] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {copiedBackup ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedBackup ? 'Copiato negli appunti!' : 'Copia codice di backup'}</span>
                </button>
              </div>

              <div className="pt-2 border-t border-[var(--border)]">
                <label className="block text-[11px] font-bold text-[var(--text-muted)] mb-1">Ripristina da Codice</label>
                <textarea
                  rows={3}
                  value={importCode}
                  onChange={e => setImportCode(e.target.value)}
                  placeholder="Incolla qui il codice di backup salvato in precedenza..."
                  className="w-full p-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-mono resize-none"
                />
                <button
                  type="button"
                  onClick={handleImportBackup}
                  disabled={!importCode.trim()}
                  className="w-full mt-2 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-bold cursor-pointer transition-all"
                >
                  Ripristina Dati
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
