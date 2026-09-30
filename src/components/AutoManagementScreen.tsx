import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft, Car, Wrench, Calendar, Fuel, User, Gauge, FileText, Scan, Check,
  QrCode, Bell, ChevronRight, X, ShieldCheck, Edit2, Trash2, Plus, Info, Clock,
  AlertTriangle, AlertCircle, Eye, Zap, Flame, Droplets, DollarSign, History,
  Layers, CheckCircle2, Navigation, Paperclip, Upload, Sparkles
} from 'lucide-react';
import { AutoModule, FuelType, AutoMaintenanceRecord, AutoKmRecord } from '../types';
import { DocumentScanner } from './DocumentScanner';
import { DocumentViewer } from './DocumentViewer';
import { CAR_BRANDS } from '../utils/carBrands';
import { AutoEditScreen } from './AutoEditScreen';
import { ConfirmDialog } from './ConfirmDialog';
import { notificationService } from '../services/notificationService';
import {
  computeVehicleDeadlines,
  AutoDeadlineItem,
  getAutoDeadlineTargetDate,
  isDeadlineFeminine,
  formatDeadlineCountdown
} from '../utils/autoDeadlines';
import { motion, AnimatePresence } from 'motion/react';

interface AutoManagementScreenProps {
  module: AutoModule;
  onSave: (updated: AutoModule) => void;
  onAutoSave?: (updated: AutoModule) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  onShare?: (module: any) => void;
}

type TabType = 'overview' | 'mileage' | 'maintenance' | 'documents';

export const AutoManagementScreen = ({
  module,
  onSave,
  onAutoSave,
  onCancel,
  onDelete,
  onShare
}: AutoManagementScreenProps) => {
  const [data, setData] = useState<AutoModule>({ ...module });
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Quick KM Modal
  const [isQuickKmOpen, setIsQuickKmOpen] = useState(false);
  const [quickKmInput, setQuickKmInput] = useState(data.currentKm || '');
  const [quickKmNote, setQuickKmNote] = useState('');

  // Quick Deadline Update Modal
  const [quickEditDeadline, setQuickEditDeadline] = useState<AutoDeadlineItem | null>(null);
  const [quickEditDate, setQuickEditDate] = useState('');
  const [quickEditKm, setQuickEditKm] = useState('');
  const [quickEditDoc, setQuickEditDoc] = useState<string | undefined>(undefined);

  // Maintenance Modal
  const [isAddMaintenanceOpen, setIsAddMaintenanceOpen] = useState(false);
  const [newMaintenance, setNewMaintenance] = useState<{
    type: 'tagliando' | 'gomme' | 'freni' | 'revisione' | 'batteria' | 'riparazione' | 'altro';
    title: string;
    date: string;
    km: string;
    cost: string;
    notes: string;
    doc?: string;
  }>({
    type: 'tagliando',
    title: '',
    date: new Date().toISOString().split('T')[0],
    km: data.currentKm || '',
    cost: '',
    notes: '',
    doc: undefined,
  });

  // Document attachments & Viewer
  const [capturingField, setCapturingField] = useState<{
    key: keyof AutoModule | 'maintenanceDoc' | 'quickEditDoc';
    title: string;
  } | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ title: string; data: string } | null>(null);

  // Direct File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileTargetKey, setFileTargetKey] = useState<keyof AutoModule | 'maintenanceDoc' | 'quickEditDoc' | null>(null);

  // Notification Preferences
  const [localPrefs, setLocalPrefs] = useState<Record<string, { enabled: boolean; offset: number }>>({});

  // Sync incoming module updates
  useEffect(() => {
    setData({ ...module });
    setQuickKmInput(module.currentKm || '');
  }, [module]);

  // Listen for trigger events (e.g. from widgets or shortcuts)
  useEffect(() => {
    const handleOpenKm = () => {
      setQuickKmInput(data.currentKm || '');
      setQuickKmNote('');
      setIsQuickKmOpen(true);
    };
    window.addEventListener('open-auto-km-update', handleOpenKm);
    return () => window.removeEventListener('open-auto-km-update', handleOpenKm);
  }, [data.currentKm]);

  // Load notification prefs immediately on mount or data.id change
  useEffect(() => {
    const prefs: Record<string, { enabled: boolean; offset: number }> = {};
    [
      'lastInsurance',
      'lastTax',
      'lastRevision',
      'battery12vExpiryDate',
      'hybridBatteryExpiryDate',
      'lastGplCylinder',
      'lastMethaneCylinder',
    ].forEach(field => {
      const p = notificationService.get(data.id, field);
      prefs[field] = {
        enabled: p ? p.enabled : false,
        offset: p ? p.reminderOffset : 7
      };
    });
    setLocalPrefs(prefs);
  }, [data.id]);

  const saveUpdated = (updated: AutoModule) => {
    setData(updated);
    if (onAutoSave) {
      onAutoSave(updated);
    } else {
      onSave(updated);
    }
  };

  const brandLogo = data.brand ? data.brand.toLowerCase().replace(/ /g, '-') : '';
  const hasLogo = CAR_BRANDS.includes(brandLogo);

  // Compute all vehicle deadlines (using centralized automotive rules)
  const deadlines = useMemo(() => {
    return computeVehicleDeadlines(data);
  }, [data]);

  // Overall status summary for the Hero Banner
  const statusSummary = useMemo(() => {
    const expired = deadlines.filter(d => d.status === 'expired');
    const urgent = deadlines.filter(d => d.status === 'urgent');
    const configured = deadlines.filter(d => d.isConfigured);

    if (expired.length > 0) {
      return {
        level: 'expired' as const,
        title: `${expired.length} Scadenz${expired.length > 1 ? 'e Scadute' : 'a Scaduta'}`,
        description: `${expired[0].label}: ${expired[0].statusText}. Attenzione richiesta.`,
        badgeClass: 'bg-red-500/10 text-red-500 border-red-500/20',
        icon: AlertCircle,
      };
    }
    if (urgent.length > 0) {
      return {
        level: 'urgent' as const,
        title: `${urgent.length} Scadenz${urgent.length > 1 ? 'e in Arrivo' : 'a in Arrivo'}`,
        description: `${urgent[0].label}: ${urgent[0].statusText}. Pianifica il controllo.`,
        badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        icon: Clock,
      };
    }
    if (configured.length > 0) {
      return {
        level: 'valid' as const,
        title: 'Tutto in Regola',
        description: 'Tutti i controlli tecnici e gli adempimenti sono in regola.',
        badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        icon: ShieldCheck,
      };
    }
    return {
      level: 'unconfigured' as const,
      title: 'Configura Scadenze',
      description: 'Inserisci assicurazione, bollo e tagliando per monitorare lo stato del veicolo.',
      badgeClass: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
      icon: Calendar,
    };
  }, [deadlines]);

  // Direct File Upload Trigger
  const triggerFileUpload = (key: keyof AutoModule | 'maintenanceDoc' | 'quickEditDoc') => {
    setFileTargetKey(key);
    fileInputRef.current?.click();
  };

  const handleDirectFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fileTargetKey) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      if (fileTargetKey === 'maintenanceDoc') {
        setNewMaintenance(prev => ({ ...prev, doc: base64 }));
      } else if (fileTargetKey === 'quickEditDoc') {
        setQuickEditDoc(base64);
      } else {
        const updated = { ...data, [fileTargetKey]: base64 };
        saveUpdated(updated);
      }
      setFileTargetKey(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Quick KM save handler
  const handleSaveQuickKm = () => {
    const cleanStr = quickKmInput.replace(/\D/g, '');
    if (!cleanStr) return;
    const kmNum = Number(cleanStr);
    if (isNaN(kmNum) || kmNum < 0) return;

    const newHistory: AutoKmRecord[] = [
      ...(data.kmHistory || []),
      {
        id: `km_${Date.now()}`,
        date: new Date().toISOString(),
        km: kmNum,
        note: quickKmNote.trim() || undefined,
      },
    ];

    const updated: AutoModule = {
      ...data,
      currentKm: String(kmNum),
      lastKmUpdatedAt: new Date().toISOString(),
      kmHistory: newHistory,
    };

    saveUpdated(updated);
    setIsQuickKmOpen(false);
  };

  // Open Quick Edit Modal for any deadline
  const handleOpenQuickEdit = (item: AutoDeadlineItem) => {
    setQuickEditDeadline(item);
    if (item.isKmBased) {
      if (item.field === 'lastServiceKm') {
        setQuickEditKm(data.lastServiceKm || data.currentKm || '');
      } else if (item.field === 'tiresKm') {
        setQuickEditKm(data.tiresKm || data.currentKm || '');
      }
      setQuickEditDate('');
    } else {
      setQuickEditDate(item.originalDate || item.date || new Date().toISOString().split('T')[0]);
      setQuickEditKm('');
    }
    setQuickEditDoc(item.docKey ? (data[item.docKey] as string | undefined) : undefined);
  };

  // Save Quick Edit Modal
  const handleSaveQuickDeadline = () => {
    if (!quickEditDeadline) return;

    const updated = { ...data };

    if (quickEditDeadline.isKmBased) {
      const cleanKm = quickEditKm.replace(/\D/g, '');
      if (quickEditDeadline.field === 'lastServiceKm') {
        updated.lastServiceKm = cleanKm;
        if (quickEditDoc) updated.serviceDoc = quickEditDoc;
      } else if (quickEditDeadline.field === 'tiresKm') {
        updated.tiresKm = cleanKm;
        if (quickEditDoc) updated.tireDoc = quickEditDoc;
      }
      // If entered km is higher than currentKm, keep currentKm updated
      if (cleanKm && (!data.currentKm || Number(cleanKm) > Number(data.currentKm))) {
        updated.currentKm = cleanKm;
        updated.lastKmUpdatedAt = new Date().toISOString();
      }
    } else {
      if (quickEditDate) {
        (updated as any)[quickEditDeadline.field] = quickEditDate;
      }
      if (quickEditDeadline.docKey && quickEditDoc) {
        (updated as any)[quickEditDeadline.docKey] = quickEditDoc;
      }

      // Schedule notification if reminder active for this field
      if (localPrefs[quickEditDeadline.field]?.enabled && quickEditDate) {
        const targetDate = getAutoDeadlineTargetDate(quickEditDeadline.field, quickEditDate, updated);
        if (targetDate) {
          const offset = localPrefs[quickEditDeadline.field].offset;
          const nd = new Date(targetDate.getTime() - offset * 24 * 3600 * 1000);
          nd.setHours(9, 0, 0, 0);
          if (nd.getTime() > Date.now()) {
            notificationService.scheduleNotification(
              `Scadenza ${quickEditDeadline.label}`,
              `Promemoria per ${data.brand || 'Veicolo'} ${data.model || ''}: la scadenza ${quickEditDeadline.label} è tra ${offset} giorni (${targetDate.toLocaleDateString('it-IT')})!`,
              nd
            );
          }
        }
      }
    }

    saveUpdated(updated);
    setQuickEditDeadline(null);
  };

  // Add Maintenance record handler
  const handleSaveMaintenance = () => {
    if (!newMaintenance.title.trim()) return;

    const cleanedCost = newMaintenance.cost ? Number(newMaintenance.cost.replace(',', '.')) : undefined;
    const finalCost = isNaN(cleanedCost as number) ? undefined : cleanedCost;

    const newRecord: AutoMaintenanceRecord = {
      id: `maint_${Date.now()}`,
      date: newMaintenance.date,
      type: newMaintenance.type,
      title: newMaintenance.title.trim(),
      km: newMaintenance.km ? newMaintenance.km.replace(/\D/g, '') : undefined,
      cost: finalCost,
      notes: newMaintenance.notes.trim() || undefined,
      doc: newMaintenance.doc,
    };

    const updatedHistory = [newRecord, ...(data.maintenanceHistory || [])];

    // If it's a tagliando or gomme, automatically update vehicle lastServiceKm or tiresKm!
    let updatedServiceKm = data.lastServiceKm;
    let updatedTiresKm = data.tiresKm;
    let updatedCurrentKm = data.currentKm;
    const newKmHistory = [...(data.kmHistory || [])];

    if (newRecord.km) {
      if (newRecord.type === 'tagliando') updatedServiceKm = newRecord.km;
      if (newRecord.type === 'gomme') updatedTiresKm = newRecord.km;
      
      const newKmNum = Number(newRecord.km);
      if (!data.currentKm || newKmNum > Number(data.currentKm)) {
        updatedCurrentKm = newRecord.km;
        newKmHistory.push({
          id: `km_${Date.now()}`,
          date: newRecord.date,
          km: newKmNum,
          note: `Da intervento: ${newRecord.title}`,
        });
      }
    }

    const updated: AutoModule = {
      ...data,
      lastServiceKm: updatedServiceKm,
      tiresKm: updatedTiresKm,
      currentKm: updatedCurrentKm,
      lastKmUpdatedAt: newRecord.km ? new Date().toISOString() : data.lastKmUpdatedAt,
      serviceDoc: newRecord.type === 'tagliando' && newRecord.doc ? newRecord.doc : data.serviceDoc,
      tireDoc: newRecord.type === 'gomme' && newRecord.doc ? newRecord.doc : data.tireDoc,
      maintenanceHistory: updatedHistory,
      kmHistory: newKmHistory,
    };

    saveUpdated(updated);
    setIsAddMaintenanceOpen(false);
    setNewMaintenance({
      type: 'tagliando',
      title: '',
      date: new Date().toISOString().split('T')[0],
      km: updated.currentKm || '',
      cost: '',
      notes: '',
      doc: undefined,
    });
  };

  // Delete maintenance record
  const handleDeleteMaintenance = (id: string) => {
    const updatedHistory = (data.maintenanceHistory || []).filter(m => m.id !== id);
    saveUpdated({ ...data, maintenanceHistory: updatedHistory });
  };

  // Notification center triggers
  const togglePref = (field: string, label: string, targetIsoDate: string) => {
    const current = localPrefs[field] || { enabled: false, offset: 7 };
    const nextEnabled = !current.enabled;

    setLocalPrefs(prev => ({
      ...prev,
      [field]: { ...current, enabled: nextEnabled }
    }));

    if (nextEnabled) {
      notificationService.upsert({
        id: `${data.id}_${field}`,
        moduleId: data.id,
        field,
        label,
        type: 'date',
        targetValue: targetIsoDate,
        reminderOffset: current.offset,
        enabled: true
      });
      const targetDate = new Date(targetIsoDate);
      const nd = new Date(targetDate.getTime() - current.offset * 24 * 3600 * 1000);
      nd.setHours(9, 0, 0, 0);
      if (nd.getTime() > Date.now()) {
        notificationService.scheduleNotification(
          `Scadenza ${label}`,
          `Promemoria per ${data.brand || 'Veicolo'} ${data.model || ''}: la scadenza ${label} è tra ${current.offset} giorni (${targetDate.toLocaleDateString('it-IT')})!`,
          nd
        );
      }
    } else {
      notificationService.remove(data.id, field);
    }
  };

  const changeOffset = (field: string, label: string, targetIsoDate: string, offset: number) => {
    setLocalPrefs(prev => ({
      ...prev,
      [field]: { ...prev[field], offset }
    }));

    if (localPrefs[field]?.enabled) {
      notificationService.upsert({
        id: `${data.id}_${field}`,
        moduleId: data.id,
        field,
        label,
        type: 'date',
        targetValue: targetIsoDate,
        reminderOffset: offset,
        enabled: true
      });
    }
  };

  // Fuel color badge
  const fuelBadge = (() => {
    switch ((data.fuelType || '').toLowerCase()) {
      case 'ibrida': return { label: 'Ibrida', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: Zap };
      case 'elettrica': return { label: 'Elettrica EV', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', icon: Zap };
      case 'gpl': return { label: 'GPL', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: Flame };
      case 'metano': return { label: 'Metano', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20', icon: Flame };
      case 'diesel': return { label: 'Diesel', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Droplets };
      default: return { label: 'Benzina', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Droplets };
    }
  })();

  const FuelIcon = fuelBadge.icon;

  // Documents calculation
  const documentList = useMemo(() => {
    const list: Array<{ key: keyof AutoModule; title: string; subtitle: string; icon: any }> = [
      { key: 'librettoDoc', title: 'Libretto di Circolazione', subtitle: 'Documento Unico di Circolazione (DUC)', icon: FileText },
      { key: 'cdpDoc', title: 'Certificato di Proprietà', subtitle: 'CDP Digitale o atto di vendita', icon: ShieldCheck },
      { key: 'insuranceDoc', title: 'Polizza Assicurativa RCA', subtitle: 'Contratto e tagliando carta verde', icon: FileText },
      { key: 'taxDoc', title: 'Ricevuta Pagamento Bollo', subtitle: 'Quietanza tributo automobilistico', icon: FileText },
      { key: 'revisionDoc', title: 'Certificato Ultima Revisione', subtitle: 'Attestato superamento controllo ministeriale', icon: CheckCircle2 },
      { key: 'serviceDoc', title: 'Ricevuta Ultimo Tagliando', subtitle: 'Fattura o ricevuta officina', icon: Wrench },
      { key: 'tireDoc', title: 'Ricevuta Controllo Gomme', subtitle: 'Fattura gommista / acquisto pneumatici', icon: Gauge },
      { key: 'battery12vDoc', title: 'Garanzia Batteria 12V', subtitle: 'Scontrino / garanzia commerciale', icon: Zap },
    ];

    if (data.fuelType === 'ibrida' || data.fuelType === 'elettrica') {
      list.push({
        key: 'hybridBatteryDoc' as const,
        title: 'Garanzia Batteria Ibrida / EV',
        subtitle: 'Attestato o certificato garanzia costruttore',
        icon: Zap,
      });
    }

    return list;
  }, [data.fuelType]);

  const docCount = documentList.filter(d => Boolean(data[d.key])).length;

  // Render Full Edit Screen if user triggered "Modifica"
  if (isEditing) {
    return (
      <div className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col overflow-hidden">
        <AutoEditScreen
          module={data}
          onSave={(updated) => {
            saveUpdated(updated);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  const carDisplayName = `${data.brand || data.title || 'Veicolo'} ${data.model || ''}`.trim();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col overflow-hidden"
    >
      {/* Hidden File Input for Direct Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        accept="application/pdf,image/*"
        className="hidden"
        onChange={handleDirectFileUpload}
      />

      {/* ── Top Bar ── */}
      <div className="bg-[var(--card-bg)] border-b border-[var(--border)] px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 z-20 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onCancel}
            className="p-2.5 hover:bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer shrink-0"
            title="Torna indietro"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[var(--text-main)] uppercase tracking-tight leading-none truncate">
                {carDisplayName}
              </h2>
              {data.registrationYear && (
                <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--surface-variant)] px-2 py-0.5 rounded-md shrink-0">
                  {data.registrationYear}
                </span>
              )}
            </div>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">
              Cockpit & Gestione Mobilità
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onShare && (
            <button
              onClick={() => onShare(data)}
              className="p-2.5 hover:bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              title="Condividi Scheda"
            >
              <QrCode className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setShowNotifMenu(true)}
            className="p-2.5 hover:bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl text-amber-500 hover:text-amber-600 transition-colors relative cursor-pointer"
            title="Notifiche e Promemoria"
          >
            <Bell className="w-4 h-4" />
            {Object.values(localPrefs).some(p => p.enabled) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent)]/20 rounded-xl font-black text-[11px] uppercase tracking-wider hover:bg-[var(--accent)] hover:text-white transition-all cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Modifica</span>
          </button>

          {onDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2.5 text-red-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-colors cursor-pointer"
              title="Elimina Veicolo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Scrollable Area ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 pb-36">

          {/* ── Hero Cockpit Card (High-Tech Instrument Cluster Aesthetic) ── */}
          <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 rounded-[2.5rem] p-5 sm:p-8 text-white relative overflow-hidden shadow-2xl border border-zinc-800">
            {/* Ambient Instrument Glows */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-[9.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${fuelBadge.color}`}>
                    <FuelIcon className="w-3 h-3" />
                    {fuelBadge.label}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {data.registrationYear ? `Anno ${data.registrationYear}` : ''}
                  </span>
                </div>

                {/* Italian License Plate */}
                <div className="inline-flex items-center border border-zinc-500/40 rounded-xl bg-white shadow-2xl h-11 px-0.5 overflow-hidden max-w-full">
                  <div className="bg-blue-700 h-full px-2.5 flex flex-col items-center justify-center shrink-0">
                    <div className="w-2.5 h-2.5 border border-yellow-300 rounded-full opacity-90 scale-90" />
                    <span className="text-[8px] text-white font-black leading-none mt-0.5">I</span>
                  </div>
                  <span className="px-3 sm:px-4 text-zinc-950 font-black font-mono text-xl sm:text-2xl md:text-3xl tracking-[0.16em] uppercase select-none truncate">
                    {data.plate || 'AA 000 AA'}
                  </span>
                  <div className="bg-blue-700 h-full w-4 flex flex-col items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full border border-yellow-300/60" />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 text-zinc-300">
                  <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span className="text-xs font-bold truncate">{data.driverName || 'Intestatario non impostato'}</span>
                </div>
              </div>

              {/* Brand Logo & Digital Odometer Cluster */}
              <div className="flex items-center md:flex-col md:items-end justify-between gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800 shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/10 shrink-0 shadow-lg car-logo-bg">
                  {hasLogo ? (
                    <img src={`/logo_auto/${brandLogo}.png`} alt={data.brand} className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
                  ) : (
                    <Car className="w-8 h-8 text-zinc-400" />
                  )}
                </div>

                {/* Digital Odometer Display */}
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">
                    Chilometraggio
                  </p>
                  <button
                    onClick={() => {
                      setQuickKmInput(data.currentKm || '');
                      setQuickKmNote('');
                      setIsQuickKmOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900/90 hover:bg-zinc-800/90 border border-teal-500/30 rounded-2xl transition-all group cursor-pointer shadow-inner shadow-teal-500/10"
                    title="Clicca per aggiornare i km al volo"
                  >
                    <Gauge className="w-4 h-4 text-teal-400 group-hover:rotate-12 transition-transform shrink-0" />
                    <span className="font-mono font-black text-xl sm:text-2xl text-teal-300 tracking-tight">
                      {data.currentKm ? Number(String(data.currentKm).replace(/\D/g, '')).toLocaleString('it-IT') : '0'}
                    </span>
                    <span className="text-xs font-bold text-teal-400">km</span>
                    <Edit2 className="w-3 h-3 text-zinc-500 group-hover:text-white transition-colors ml-0.5" />
                  </button>
                  {data.lastKmUpdatedAt && (
                    <p className="text-[9px] font-medium text-zinc-500 mt-1">
                      Aggiornato {new Date(data.lastKmUpdatedAt).toLocaleDateString('it-IT')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Overall Status Banner Ribbon */}
            <div className={`mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-3`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <statusSummary.icon className={`w-4 h-4 shrink-0 ${
                  statusSummary.level === 'expired' ? 'text-red-400' :
                  statusSummary.level === 'urgent' ? 'text-amber-400' :
                  statusSummary.level === 'valid' ? 'text-emerald-400' : 'text-zinc-400'
                }`} />
                <div className="min-w-0">
                  <span className="text-xs font-black uppercase tracking-wider text-white block truncate">
                    {statusSummary.title}
                  </span>
                  <p className="text-[10px] text-zinc-400 truncate">{statusSummary.description}</p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('overview')}
                className="text-[10px] font-bold uppercase tracking-wider text-teal-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <span>Dettagli</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* ── Navigation Tabs ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[var(--card-bg)] p-1.5 rounded-2xl border border-[var(--border)] shadow-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`relative flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-variant)]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Scadenze</span>
              {statusSummary.level === 'expired' && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
              {statusSummary.level === 'urgent' && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('mileage')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'mileage'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-variant)]'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>Chilometri</span>
            </button>

            <button
              onClick={() => setActiveTab('maintenance')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'maintenance'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-variant)]'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Interventi</span>
              {(data.maintenanceHistory?.length || 0) > 0 && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'maintenance' ? 'bg-white/20 text-white' : 'bg-[var(--surface-variant)] text-[var(--text-muted)]'
                }`}>
                  {data.maintenanceHistory?.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'documents'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-variant)]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Documenti</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'documents' ? 'bg-white/20 text-white' : 'bg-[var(--surface-variant)] text-[var(--text-muted)]'
              }`}>
                {docCount}/{documentList.length}
              </span>
            </button>
          </div>

          {/* ════ TAB 1: PANORAMICA & SCADENZE ════ */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">
                    Pillole Scadenze & Controlli
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Scadenze amministrative, collaudi ministeriali e manutenzioni
                  </p>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Modifica Tutte
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {deadlines.map(d => {
                  const isExpired = d.status === 'expired';
                  const isUrgent = d.status === 'urgent';
                  const isValid = d.status === 'valid';
                  const isUnconfigured = d.status === 'unconfigured';

                  const statusColor = isExpired
                    ? 'text-red-500 bg-red-500/10 border-red-500/20'
                    : isUrgent
                    ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                    : isValid
                    ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                    : 'text-[var(--text-muted)] bg-[var(--surface-variant)] border-[var(--border)]';

                  return (
                    <div
                      key={d.id}
                      className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[var(--accent)]/50 transition-all shadow-xs"
                    >
                      <div 
                        className="flex items-start sm:items-center gap-3.5 cursor-pointer flex-1"
                        onClick={() => handleOpenQuickEdit(d)}
                        title="Clicca per aggiornare questa scadenza"
                      >
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${statusColor}`}>
                          {d.isKmBased ? <Gauge className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-[var(--text-main)] leading-snug">
                              {d.label}
                            </h4>
                            {d.hasDoc && (
                              <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                                <Check className="w-2.5 h-2.5" /> Doc
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] font-medium truncate">
                            {d.subtitle}
                          </p>
                          <p className="text-xs font-mono font-bold text-[var(--text-main)] mt-0.5">
                            {d.isConfigured ? (
                              d.date ? (
                                new Date(d.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
                              ) : (
                                `${d.km?.toLocaleString('it-IT')} km`
                              )
                            ) : (
                              <span className="text-[var(--text-muted)] italic font-normal">Non ancora configurato</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Status Chip & Quick Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]/50 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenQuickEdit(d)}
                          className={`text-[10px] font-black px-2.5 py-1 rounded-xl border uppercase tracking-wider transition-all cursor-pointer ${statusColor} hover:opacity-85`}
                          title="Clicca per rinnovare o modificare"
                        >
                          {d.statusText}
                        </button>

                        <div className="flex items-center gap-1.5">
                          {/* Quick Edit / Renew Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenQuickEdit(d)}
                            className="p-2 hover:bg-[var(--surface-variant)] rounded-xl text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                            title="Aggiorna / Rinnova"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Document Preview / Scan */}
                          {d.docKey && (
                            d.hasDoc ? (
                              <button
                                type="button"
                                onClick={() => setViewingDoc({ title: d.label, data: data[d.docKey!] as string })}
                                className="p-2 hover:bg-[var(--surface-variant)] rounded-xl text-emerald-500 transition-colors cursor-pointer"
                                title="Visualizza Documento Allegato"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => triggerFileUpload(d.docKey!)}
                                className="p-2 hover:bg-[var(--surface-variant)] rounded-xl text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                                title="Allega File Documento"
                              >
                                <Paperclip className="w-4 h-4" />
                              </button>
                            )
                          )}

                          {/* Notification Reminder Toggle */}
                          {!d.isKmBased && d.date && (
                            <button
                              type="button"
                              onClick={() => togglePref(d.field, d.label, d.date!)}
                              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                                localPrefs[d.field]?.enabled
                                  ? 'bg-amber-500/10 text-amber-500'
                                  : 'hover:bg-[var(--surface-variant)] text-[var(--text-muted)]'
                              }`}
                              title={localPrefs[d.field]?.enabled ? 'Notifica attiva' : 'Imposta promemoria'}
                            >
                              <Bell className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ════ TAB 2: CHILOMETRAGGIO & STORICO ════ */}
          {activeTab === 'mileage' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Odometer Cluster Card */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-base font-black text-[var(--text-main)] uppercase tracking-tight">
                      Contachilometri Digitale
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      Registrazione letture e calcolo intervalli di manutenzione
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setQuickKmInput(data.currentKm || '');
                      setQuickKmNote('');
                      setIsQuickKmOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-teal-500/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Aggiorna Lettura</span>
                  </button>
                </div>

                {/* Big Odometer Readout (Instrument Cluster Style) */}
                <div className="p-6 sm:p-8 bg-zinc-950 text-white border border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-center relative overflow-hidden shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 to-transparent pointer-events-none" />
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 mb-2">
                    Chilometraggio Rilevato
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono font-black text-4xl sm:text-6xl text-white tracking-tight">
                      {data.currentKm ? Number(String(data.currentKm).replace(/\D/g, '')).toLocaleString('it-IT') : '0'}
                    </span>
                    <span className="text-lg font-black text-teal-400">km</span>
                  </div>
                  {data.lastKmUpdatedAt && (
                    <p className="text-[11px] text-zinc-400 mt-2">
                      Ultimo aggiornamento: {new Date(data.lastKmUpdatedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>

                {/* Progress bars for maintenance intervals */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  {/* Tagliando interval bar */}
                  <div className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[var(--text-main)]">Prossimo Tagliando</span>
                      <span className="text-xs font-mono font-bold text-[var(--accent)]">
                        {data.lastServiceKm ? `${Number(data.lastServiceKm) + 15000} km` : 'Non impostato'}
                      </span>
                    </div>
                    {data.currentKm && data.lastServiceKm ? (() => {
                      const cur = Number(String(data.currentKm).replace(/\D/g, ''));
                      const last = Number(String(data.lastServiceKm).replace(/\D/g, ''));
                      const target = last + 15000;
                      const progress = Math.min(100, Math.max(0, ((cur - last) / 15000) * 100));
                      const kmLeft = target - cur;
                      return (
                        <>
                          <div className="w-full bg-[var(--card-bg)] border border-[var(--border)] h-2.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                kmLeft <= 0 ? 'bg-red-500' : kmLeft <= 1500 ? 'bg-amber-500' : 'bg-teal-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] mt-1.5 flex justify-between">
                            <span>Percorsi {Math.max(0, cur - last).toLocaleString('it-IT')} km</span>
                            <span className={kmLeft <= 0 ? 'text-red-500 font-bold' : ''}>
                              {kmLeft <= 0 ? `Superato di ${Math.abs(kmLeft).toLocaleString('it-IT')} km` : `${kmLeft.toLocaleString('it-IT')} km rimasti`}
                            </span>
                          </p>
                        </>
                      );
                    })() : (
                      <button
                        onClick={() => {
                          const item = deadlines.find(d => d.field === 'lastServiceKm');
                          if (item) handleOpenQuickEdit(item);
                        }}
                        className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Imposta km ultimo tagliando
                      </button>
                    )}
                  </div>

                  {/* Gomme interval bar */}
                  <div className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[var(--text-main)]">Controllo Gomme</span>
                      <span className="text-xs font-mono font-bold text-[var(--accent)]">
                        {data.tiresKm ? `${Number(data.tiresKm) + 10000 + (data.tiresSuggestedOffsetKm || 0)} km` : 'Non impostato'}
                      </span>
                    </div>
                    {data.currentKm && data.tiresKm ? (() => {
                      const cur = Number(String(data.currentKm).replace(/\D/g, ''));
                      const last = Number(String(data.tiresKm).replace(/\D/g, ''));
                      const interval = 10000 + (data.tiresSuggestedOffsetKm || 0);
                      const target = last + interval;
                      const progress = Math.min(100, Math.max(0, ((cur - last) / interval) * 100));
                      const kmLeft = target - cur;
                      return (
                        <>
                          <div className="w-full bg-[var(--card-bg)] border border-[var(--border)] h-2.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                kmLeft <= 0 ? 'bg-red-500' : kmLeft <= 1500 ? 'bg-amber-500' : 'bg-indigo-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] mt-1.5 flex justify-between">
                            <span>Percorsi {Math.max(0, cur - last).toLocaleString('it-IT')} km</span>
                            <span className={kmLeft <= 0 ? 'text-red-500 font-bold' : ''}>
                              {kmLeft <= 0 ? `Superato di ${Math.abs(kmLeft).toLocaleString('it-IT')} km` : `${kmLeft.toLocaleString('it-IT')} km rimasti`}
                            </span>
                          </p>
                        </>
                      );
                    })() : (
                      <button
                        onClick={() => {
                          const item = deadlines.find(d => d.field === 'tiresKm');
                          if (item) handleOpenQuickEdit(item);
                        }}
                        className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Imposta km controllo gomme
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Storico Rilevazioni Km */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[var(--accent)]" />
                    <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">
                      Storico Letture Chilometriche
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-[var(--text-muted)]">
                    {data.kmHistory?.length || 0} registrazioni
                  </span>
                </div>

                {!data.kmHistory || data.kmHistory.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] text-center py-6">
                    Nessuna registrazione precedente. Le letture aggiornate compariranno qui con il relativo delta chilometrico.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {[...data.kmHistory].reverse().map((kh, idx, arr) => {
                      const prevKh = arr[idx + 1];
                      const delta = prevKh ? kh.km - prevKh.km : 0;

                      return (
                        <div key={kh.id || idx} className="py-3 flex items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black font-mono text-[var(--text-main)]">
                                {kh.km.toLocaleString('it-IT')} km
                              </span>
                              {delta > 0 && (
                                <span className="text-[9px] font-bold text-teal-600 bg-teal-500/10 px-1.5 py-0.5 rounded">
                                  +{delta.toLocaleString('it-IT')} km
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)]">
                              {new Date(kh.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              {kh.note && ` • ${kh.note}`}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const updatedKmHistory = (data.kmHistory || []).filter(k => k.id !== kh.id);
                              saveUpdated({ ...data, kmHistory: updatedKmHistory });
                            }}
                            className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                            title="Elimina lettura"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ════ TAB 3: MANUTENZIONI & INTERVENTI ════ */}
          {activeTab === 'maintenance' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Header stats & action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 shadow-xs">
                <div>
                  <h3 className="text-base font-black text-[var(--text-main)] uppercase tracking-tight">
                    Registro Manutenzioni & Officina
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Archivio storico di tagliandi, cambi gomme, revisioni e riparazioni
                  </p>
                  {data.maintenanceHistory && data.maintenanceHistory.length > 0 && (
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-xs font-bold text-[var(--text-muted)]">
                        Totale Spesa: <strong className="text-[var(--text-main)] text-sm font-black">€ {data.maintenanceHistory.reduce((s, m) => s + (m.cost || 0), 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</strong>
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        Interventi: <strong className="text-[var(--text-main)]">{data.maintenanceHistory.length}</strong>
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddMaintenanceOpen(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-[var(--accent)]/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registra Intervento</span>
                </button>
              </div>

              {/* Interventions List */}
              {!data.maintenanceHistory || data.maintenanceHistory.length === 0 ? (
                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-8 text-center space-y-3">
                  <Wrench className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
                  <p className="text-sm font-bold text-[var(--text-main)]">Nessun intervento registrato</p>
                  <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                    Tieni traccia di tutte le spese dell'auto: tagliandi, gomme, pastiglie freni e riparazioni con relative fatture allegate.
                  </p>
                  <button
                    onClick={() => setIsAddMaintenanceOpen(true)}
                    className="px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Aggiungi Primo Intervento
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.maintenanceHistory.map(item => {
                    const badgeStyles: Record<string, string> = {
                      tagliando: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                      gomme: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
                      freni: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
                      revisione: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                      batteria: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
                      riparazione: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
                      altro: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
                    };

                    return (
                      <div
                        key={item.id}
                        className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeStyles[item.type] || badgeStyles.altro}`}>
                              {item.type}
                            </span>
                            <h4 className="text-sm font-black text-[var(--text-main)]">
                              {item.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                            <span>{new Date(item.date).toLocaleDateString('it-IT')}</span>
                            {item.km && <span>• {Number(item.km).toLocaleString('it-IT')} km</span>}
                            {item.cost !== undefined && (
                              <span className="font-bold text-[var(--text-main)]">
                                • € {item.cost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>

                          {item.notes && (
                            <p className="text-xs text-[var(--text-muted)] italic pt-1">{item.notes}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]">
                          {item.doc && (
                            <button
                              type="button"
                              onClick={() => setViewingDoc({ title: `Fattura ${item.title}`, data: item.doc! })}
                              className="px-3 py-1.5 bg-[var(--surface-variant)] text-[var(--text-main)] hover:bg-[var(--border)] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-500" /> Fattura
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteMaintenance(item.id)}
                            className="p-2 text-zinc-400 hover:text-red-500 rounded-xl transition-colors cursor-pointer"
                            title="Elimina intervento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ════ TAB 4: CASSETTO DOCUMENTI DEL VEICOLO ════ */}
          {activeTab === 'documents' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">
                    Cassetto Documentale Digitale
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {docCount} di {documentList.length} documenti conservati al sicuro
                  </p>
                </div>
                <div className="w-24 bg-[var(--surface-variant)] border border-[var(--border)] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 transition-all duration-300 rounded-full"
                    style={{ width: `${(docCount / documentList.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {documentList.map(docItem => {
                  const docData = data[docItem.key] as string | undefined;
                  const Icon = docItem.icon;

                  return (
                    <div
                      key={docItem.key}
                      className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                            docData ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-[var(--surface-variant)] border-[var(--border)] text-[var(--text-muted)]'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                              {docItem.title}
                            </h4>
                            <p className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">
                              {docItem.subtitle}
                            </p>
                          </div>
                        </div>

                        {docData ? (
                          <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                            Presente
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded-md bg-[var(--surface-variant)] text-[var(--text-muted)] shrink-0">
                            Mancante
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                        {docData ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setViewingDoc({ title: docItem.title, data: docData })}
                              className="flex-1 py-2 px-3 bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-500" /> Visualizza
                            </button>
                            <button
                              type="button"
                              onClick={() => triggerFileUpload(docItem.key)}
                              className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] rounded-xl transition-colors cursor-pointer"
                              title="Carica da file"
                            >
                              <Paperclip className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCapturingField({ key: docItem.key, title: docItem.title })}
                              className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] rounded-xl transition-colors cursor-pointer"
                              title="Riscansiona con fotocamera"
                            >
                              <Scan className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = { ...data, [docItem.key]: undefined };
                                saveUpdated(updated);
                              }}
                              className="p-2 text-zinc-400 hover:text-red-500 rounded-xl transition-colors cursor-pointer"
                              title="Elimina documento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 w-full">
                            <button
                              type="button"
                              onClick={() => triggerFileUpload(docItem.key)}
                              className="flex-1 py-2 px-3 bg-[var(--accent-bg)] hover:bg-[var(--accent)] hover:text-white text-[var(--accent)] border border-[var(--accent)]/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Paperclip className="w-3.5 h-3.5" /> Scegli File
                            </button>
                            <button
                              type="button"
                              onClick={() => setCapturingField({ key: docItem.key, title: docItem.title })}
                              className="p-2 bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] rounded-xl transition-colors cursor-pointer"
                              title="Scansiona con fotocamera"
                            >
                              <Scan className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* ── MODAL: Aggiornamento Rapido KM ── */}
      <AnimatePresence>
        {isQuickKmOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setIsQuickKmOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              className="relative bg-[var(--card-bg)] rounded-[2.5rem] p-6 w-full max-w-sm border border-[var(--border)] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[var(--accent-bg)] text-[var(--accent)] rounded-xl">
                    <Gauge className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[var(--text-main)] uppercase tracking-tight">
                      Aggiorna Km
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)]">Nuova lettura contachilometri</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsQuickKmOpen(false)}
                  className="p-2 hover:bg-[var(--surface-variant)] rounded-xl text-[var(--text-muted)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={quickKmInput}
                    onChange={e => setQuickKmInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Es. 45000"
                    className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] font-mono font-black text-2xl text-[var(--text-main)] pr-12 text-center"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)]">
                    km
                  </span>
                </div>

                {/* Quick Add Chips (+100, +500, +1000) */}
                <div className="flex gap-2">
                  {[100, 500, 1000, 2500].map(add => (
                    <button
                      key={add}
                      type="button"
                      onClick={() => {
                        const cur = Number(quickKmInput || data.currentKm || 0);
                        setQuickKmInput(String(cur + add));
                      }}
                      className="flex-1 py-1.5 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-xl text-[10px] font-black uppercase text-[var(--text-main)] transition-colors cursor-pointer"
                    >
                      +{add}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={quickKmNote}
                  onChange={e => setQuickKmNote(e.target.value)}
                  placeholder="Nota facoltativa (es. Rientro viaggio)"
                  className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--accent)] text-xs text-[var(--text-main)]"
                />

                <button
                  type="button"
                  onClick={handleSaveQuickKm}
                  className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  Registra Lettura
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Modifica Rapida / Rinnovo Scadenza ── */}
      <AnimatePresence>
        {quickEditDeadline && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setQuickEditDeadline(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              className="relative bg-[var(--card-bg)] rounded-[2.5rem] p-6 w-full max-w-sm border border-[var(--border)] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[var(--accent-bg)] text-[var(--accent)] rounded-xl">
                    {quickEditDeadline.isKmBased ? <Gauge className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[var(--text-main)] uppercase tracking-tight">
                      {quickEditDeadline.label}
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)]">Rinnova o modifica impostazione</p>
                  </div>
                </div>
                <button
                  onClick={() => setQuickEditDeadline(null)}
                  className="p-2 hover:bg-[var(--surface-variant)] rounded-xl text-[var(--text-muted)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3.5">
                {quickEditDeadline.isKmBased ? (
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                      Km Ultimo Intervento ({quickEditDeadline.label})
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoFocus
                        value={quickEditKm}
                        onChange={e => setQuickEditKm(e.target.value.replace(/\D/g, ''))}
                        placeholder="Es. 45000"
                        className="w-full p-3.5 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] font-mono font-bold text-lg text-[var(--text-main)] pr-12 text-center"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">
                        km
                      </span>
                    </div>

                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setQuickEditKm(data.currentKm || '0')}
                        className="flex-1 py-1 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-lg text-[9px] font-bold text-[var(--text-main)]"
                      >
                        Usa Km Attuali
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                      {quickEditDeadline.field === 'lastRevision'
                        ? 'Data Effettuazione Ultima Revisione'
                        : quickEditDeadline.field === 'lastGplCylinder'
                        ? 'Data Sostituzione Bombola'
                        : quickEditDeadline.field === 'lastMethaneCylinder'
                        ? 'Data Ultima Revisione Bombola'
                        : 'Data di Scadenza'}
                    </label>
                    <input
                      type="date"
                      autoFocus
                      value={quickEditDate}
                      onChange={e => setQuickEditDate(e.target.value)}
                      className="w-full p-3.5 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] text-sm font-bold text-[var(--text-main)]"
                    />

                    {/* Presets */}
                    <div className="flex gap-1.5 mt-2">
                      {quickEditDeadline.field === 'lastRevision' || quickEditDeadline.field === 'lastGplCylinder' || quickEditDeadline.field === 'lastMethaneCylinder' ? (
                        <button
                          type="button"
                          onClick={() => setQuickEditDate(new Date().toISOString().split('T')[0])}
                          className="flex-1 py-1 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-lg text-[9px] font-bold text-[var(--text-main)]"
                        >
                          Eseguita Oggi
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const nextYear = new Date();
                              nextYear.setFullYear(nextYear.getFullYear() + 1);
                              setQuickEditDate(nextYear.toISOString().split('T')[0]);
                            }}
                            className="flex-1 py-1 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-lg text-[9px] font-bold text-[var(--text-main)]"
                          >
                            +1 Anno
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next6m = new Date();
                              next6m.setMonth(next6m.getMonth() + 6);
                              setQuickEditDate(next6m.toISOString().split('T')[0]);
                            }}
                            className="flex-1 py-1 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-lg text-[9px] font-bold text-[var(--text-main)]"
                          >
                            +6 Mesi
                          </button>
                        </>
                      )}
                    </div>

                    {/* Explanatory helper for revision / gpl */}
                    {quickEditDeadline.field === 'lastRevision' && quickEditDate && (
                      <p className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold mt-2">
                        💡 Prossima scadenza calcolata: +2 anni ({getAutoDeadlineTargetDate('lastRevision', quickEditDate, data)?.toLocaleDateString('it-IT')})
                      </p>
                    )}
                  </div>
                )}

                {/* Allegato Documento */}
                <div className="pt-2 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Documento / Ricevuta
                    </span>
                    {quickEditDoc && (
                      <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Allegato
                      </span>
                    )}
                  </div>

                  {quickEditDoc ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewingDoc({ title: quickEditDeadline.label, data: quickEditDoc })}
                        className="flex-1 py-2 px-3 bg-[var(--surface-variant)] text-xs font-bold text-[var(--text-main)] rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-500" /> Anteprima
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickEditDoc(undefined)}
                        className="p-2 text-red-400 hover:text-red-500 rounded-xl"
                        title="Rimuovi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => triggerFileUpload('quickEditDoc')}
                        className="flex-1 py-2 px-3 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 text-[var(--text-main)] cursor-pointer"
                      >
                        <Paperclip className="w-3.5 h-3.5" /> Scegli File
                      </button>
                      <button
                        type="button"
                        onClick={() => setCapturingField({ key: 'quickEditDoc', title: quickEditDeadline.label })}
                        className="p-2 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-xl text-[var(--text-main)] cursor-pointer"
                        title="Scansiona con fotocamera"
                      >
                        <Scan className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveQuickDeadline}
                  className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  Salva Aggiornamento
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Registrazione Intervento ── */}
      <AnimatePresence>
        {isAddMaintenanceOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setIsAddMaintenanceOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              className="relative bg-[var(--card-bg)] rounded-[2.5rem] p-6 w-full max-w-md border border-[var(--border)] shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[var(--accent-bg)] text-[var(--accent)] rounded-xl">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[var(--text-main)] uppercase tracking-tight">
                      Nuovo Intervento
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)]">Registra un lavoro svolto sul veicolo</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddMaintenanceOpen(false)}
                  className="p-2 hover:bg-[var(--surface-variant)] rounded-xl text-[var(--text-muted)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                    Tipo Intervento
                  </label>
                  <select
                    value={newMaintenance.type}
                    onChange={e => setNewMaintenance(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--accent)] text-xs font-bold text-[var(--text-main)]"
                  >
                    <option value="tagliando">Tagliando Ordinario</option>
                    <option value="gomme">Cambio / Inversione Gomme</option>
                    <option value="freni">Pastiglie / Freni</option>
                    <option value="revisione">Revisione Ministeriale</option>
                    <option value="batteria">Sostituzione Batteria</option>
                    <option value="riparazione">Riparazione Straordinaria</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                    Descrizione / Officina
                  </label>
                  <input
                    type="text"
                    value={newMaintenance.title}
                    onChange={e => setNewMaintenance(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Es. Tagliando 45.000 km c/o Concessionaria"
                    className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--accent)] text-xs text-[var(--text-main)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                      Data Intervento
                    </label>
                    <input
                      type="date"
                      value={newMaintenance.date}
                      onChange={e => setNewMaintenance(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--accent)] text-xs text-[var(--text-main)]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                      Chilometri (Km)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newMaintenance.km}
                      onChange={e => setNewMaintenance(prev => ({ ...prev, km: e.target.value.replace(/\D/g, '') }))}
                      placeholder="Es. 45200"
                      className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--accent)] text-xs font-mono text-[var(--text-main)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                    Costo (€)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newMaintenance.cost}
                    onChange={e => setNewMaintenance(prev => ({ ...prev, cost: e.target.value }))}
                    placeholder="Es. 280,00"
                    className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--accent)] text-xs font-mono text-[var(--text-main)]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                    Note Aggiuntive
                  </label>
                  <textarea
                    rows={2}
                    value={newMaintenance.notes}
                    onChange={e => setNewMaintenance(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Dettagli sui ricambi sostituiti..."
                    className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--accent)] text-xs text-[var(--text-main)] resize-none"
                  />
                </div>

                {/* Allegato Ricevuta */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Fattura o Ricevuta
                    </label>
                    {newMaintenance.doc ? (
                      <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Allegato
                      </span>
                    ) : null}
                  </div>
                  {newMaintenance.doc ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewingDoc({ title: 'Fattura Intervento', data: newMaintenance.doc! })}
                        className="flex-1 py-2 px-3 bg-[var(--surface-variant)] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-500" /> Anteprima
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewMaintenance(prev => ({ ...prev, doc: undefined }))}
                        className="p-2 text-red-400 hover:text-red-500 rounded-xl cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => triggerFileUpload('maintenanceDoc')}
                        className="flex-1 py-2.5 px-3 bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Paperclip className="w-3.5 h-3.5" /> Scegli File
                      </button>
                      <button
                        type="button"
                        onClick={() => setCapturingField({ key: 'maintenanceDoc', title: 'Fattura Intervento' })}
                        className="p-2.5 bg-[var(--accent-bg)] border border-[var(--accent)]/20 text-[var(--accent)] rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-[var(--accent)] hover:text-white transition-all cursor-pointer"
                        title="Scansiona fotocamera"
                      >
                        <Scan className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveMaintenance}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer pt-2"
                >
                  Salva nel Registro
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Centro Notifiche ── */}
      <AnimatePresence>
        {showNotifMenu && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setShowNotifMenu(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-[var(--card-bg)] rounded-[2.5rem] p-6 w-full max-w-md border border-[var(--border)] shadow-2xl overflow-y-auto max-h-[85vh] custom-scrollbar space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                    <Bell className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[var(--text-main)] uppercase tracking-tight">
                      Centro Notifiche
                    </h3>
                    <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5">
                      Promemoria Scadenze Veicolo
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotifMenu(false)}
                  className="p-2 hover:bg-[var(--surface-variant)] rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              </div>

              {/* Promemoria KM Card */}
              <div className="bg-[var(--surface-variant)]/60 border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Gauge className="w-5 h-5 text-[var(--accent)]" />
                  <div>
                    <p className="text-xs font-bold text-[var(--text-main)]">Promemoria KM Periodico</p>
                    <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Ti ricorda di registrare la lettura del contachilometri</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                  Attivo
                </span>
              </div>

              {/* Lista scadenze attive */}
              <div className="space-y-2.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                  Pianifica per Scadenza
                </p>
                {(() => {
                  const dateDeadlines = deadlines.filter(d => !d.isKmBased && d.isConfigured && d.date);

                  if (dateDeadlines.length === 0) {
                    return (
                      <p className="text-[11px] text-[var(--text-muted)] italic p-4 text-center">
                        Nessuna data di scadenza configurata. Inseriscile per attivare i promemoria.
                      </p>
                    );
                  }

                  return dateDeadlines.map((ad) => {
                    const pref = localPrefs[ad.field] || { enabled: false, offset: 7 };
                    return (
                      <div key={ad.id} className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Calendar className={`w-4 h-4 ${pref.enabled ? 'text-amber-500' : 'text-[var(--text-muted)]'}`} />
                            <div>
                              <span className="text-xs font-bold text-[var(--text-main)] block">{ad.label}</span>
                              <span className="text-[10px] text-[var(--text-muted)] font-mono">{new Date(ad.date!).toLocaleDateString('it-IT')}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => togglePref(ad.field, ad.label, ad.date!)}
                            className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer ${
                              pref.enabled ? 'bg-amber-500' : 'bg-[var(--card-bg)] border border-[var(--border)]'
                            }`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full shadow-xs transition-all ${
                              pref.enabled ? 'left-5 bg-white' : 'left-0.5 bg-[var(--text-muted)]'
                            }`} />
                          </button>
                        </div>

                        {pref.enabled && (
                          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]/40">
                            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                              Preavviso:
                            </span>
                            <div className="flex gap-1.5 flex-1 justify-end">
                              {[1, 7, 15, 30].map(days => (
                                <button
                                  key={days}
                                  type="button"
                                  onClick={() => changeOffset(ad.field, ad.label, ad.date!, days)}
                                  className={`px-2 py-1 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${
                                    pref.offset === days
                                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                                      : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                  }`}
                                >
                                  {days === 1 ? '1gg' : `${days}gg`}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Document Scanner Modal ── */}
      <AnimatePresence>
        {capturingField && (
          <DocumentScanner
            onCapture={(pdf) => {
              if (capturingField.key === 'maintenanceDoc') {
                setNewMaintenance(prev => ({ ...prev, doc: pdf }));
              } else if (capturingField.key === 'quickEditDoc') {
                setQuickEditDoc(pdf);
              } else {
                const updated = { ...data, [capturingField.key]: pdf };
                saveUpdated(updated);
              }
              setCapturingField(null);
            }}
            onClose={() => setCapturingField(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Document Viewer Modal ── */}
      <AnimatePresence>
        {viewingDoc && (
          <DocumentViewer
            isOpen={!!viewingDoc}
            title={viewingDoc.title}
            data={viewingDoc.data}
            onClose={() => setViewingDoc(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Confirm Delete Dialog ── */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Elimina Veicolo"
        message={`Sei sicuro di voler eliminare definitivamente ${data.brand || 'questo veicolo'} ${data.model || ''} e tutti i suoi documenti archiviati?`}
        onConfirm={() => {
          onDelete?.(module?.id || '');
          onCancel();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </motion.div>
  );
};
