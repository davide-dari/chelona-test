import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Car, Wrench, Calendar, Fuel, User, Gauge, FileText, Scan, Check,
  QrCode, Bell, ChevronRight, X, ShieldCheck, Edit2, Trash2, Plus, Info, Clock,
  AlertTriangle, AlertCircle, Eye, Zap, Flame, Droplets, DollarSign, History,
  Layers, CheckCircle2, Navigation
} from 'lucide-react';
import { AutoModule, FuelType, AutoMaintenanceRecord, AutoKmRecord } from '../types';
import { DocumentScanner } from './DocumentScanner';
import { DocumentViewer } from './DocumentViewer';
import { CAR_BRANDS } from '../utils/carBrands';
import { BrandModelPicker } from './BrandModelPicker';
import { AutoEditScreen } from './AutoEditScreen';
import { ConfirmDialog } from './ConfirmDialog';
import { notificationService } from '../services/notificationService';
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
    key: keyof AutoModule | 'maintenanceDoc';
    title: string;
  } | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ title: string; data: string } | null>(null);

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

  // Load notification prefs
  useEffect(() => {
    if (showNotifMenu) {
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
    }
  }, [showNotifMenu, data.id]);

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

  const isValidDate = (dateStr: any) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
  };

  // Calculate upcoming deadlines and statuses
  const deadlines = useMemo(() => {
    const list: Array<{
      id: string;
      field: string;
      label: string;
      subtitle: string;
      date?: string;
      km?: number;
      isKmBased: boolean;
      daysLeft?: number;
      kmLeft?: number;
      docKey?: keyof AutoModule;
      hasDoc: boolean;
      status: 'valid' | 'urgent' | 'expired';
      statusText: string;
    }> = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const curKm = data.currentKm ? Number(data.currentKm) : undefined;

    // Helper for date-based deadline
    const addDateDeadline = (id: string, field: string, label: string, subtitle: string, dateStr?: string, docKey?: keyof AutoModule) => {
      if (!dateStr || !isValidDate(dateStr)) return;
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let status: 'valid' | 'urgent' | 'expired' = 'valid';
      let statusText = `${daysLeft} giorni`;
      if (daysLeft < 0) {
        status = 'expired';
        statusText = `Scaduto da ${Math.abs(daysLeft)} gg`;
      } else if (daysLeft <= 30) {
        status = 'urgent';
        statusText = `Scade tra ${daysLeft} gg`;
      } else {
        statusText = `Valido (${daysLeft} gg)`;
      }

      list.push({
        id,
        field,
        label,
        subtitle,
        date: dateStr,
        isKmBased: false,
        daysLeft,
        docKey,
        hasDoc: docKey ? Boolean(data[docKey]) : false,
        status,
        statusText,
      });
    };

    // 1. Assicurazione
    addDateDeadline('ins', 'lastInsurance', 'Assicurazione RCA', 'Polizza auto e carta verde', data.lastInsurance, 'insuranceDoc');

    // 2. Bollo
    addDateDeadline('tax', 'lastTax', 'Bollo Auto', 'Tassa di circolazione regionale', data.lastTax, 'taxDoc');

    // 3. Revisione
    if (data.lastRevision && isValidDate(data.lastRevision)) {
      addDateDeadline('rev', 'lastRevision', 'Revisione Ministeriale', 'Controllo periodico biennale', data.lastRevision, 'revisionDoc');
    } else if (data.registrationYear && !isNaN(Number(data.registrationYear))) {
      const firstRevYear = Number(data.registrationYear) + 4;
      const firstRevDate = `${firstRevYear}-12-31`;
      addDateDeadline('first_rev', 'registrationYear', 'Prima Revisione', `4 anni da immatricolazione (${data.registrationYear})`, firstRevDate, 'revisionDoc');
    }

    // 4. Tagliando (Km-based)
    if (data.lastServiceKm && curKm !== undefined) {
      const lastSvc = Number(data.lastServiceKm);
      const nextSvc = lastSvc + 15000;
      const kmLeft = nextSvc - curKm;
      let status: 'valid' | 'urgent' | 'expired' = 'valid';
      let statusText = `${kmLeft.toLocaleString('it-IT')} km rimanenti`;
      if (kmLeft <= 0) {
        status = 'expired';
        statusText = `Superato di ${Math.abs(kmLeft).toLocaleString('it-IT')} km`;
      } else if (kmLeft <= 1500) {
        status = 'urgent';
        statusText = `Tagliando tra ${kmLeft.toLocaleString('it-IT')} km`;
      } else {
        statusText = `Regolare (${kmLeft.toLocaleString('it-IT')} km)`;
      }

      list.push({
        id: 'svc',
        field: 'lastServiceKm',
        label: 'Prossimo Tagliando',
        subtitle: `Scadenza a ${nextSvc.toLocaleString('it-IT')} km (ogni 15.000 km)`,
        km: nextSvc,
        kmLeft,
        isKmBased: true,
        docKey: 'serviceDoc',
        hasDoc: Boolean(data.serviceDoc),
        status,
        statusText,
      });
    }

    // 5. Controllo Gomme (Km-based)
    if (data.tiresKm && curKm !== undefined) {
      const lastTire = Number(data.tiresKm);
      const offset = data.tiresSuggestedOffsetKm ? Number(data.tiresSuggestedOffsetKm) : 0;
      const nextTire = lastTire + 10000 + offset;
      const kmLeft = nextTire - curKm;
      let status: 'valid' | 'urgent' | 'expired' = 'valid';
      let statusText = `${kmLeft.toLocaleString('it-IT')} km rimanenti`;
      if (kmLeft <= 0) {
        status = 'expired';
        statusText = `Superato di ${Math.abs(kmLeft).toLocaleString('it-IT')} km`;
      } else if (kmLeft <= 1500) {
        status = 'urgent';
        statusText = `Inversione tra ${kmLeft.toLocaleString('it-IT')} km`;
      } else {
        statusText = `Regolare (${kmLeft.toLocaleString('it-IT')} km)`;
      }

      list.push({
        id: 'tires',
        field: 'tiresKm',
        label: 'Controllo / Inversione Gomme',
        subtitle: `Scadenza a ${nextTire.toLocaleString('it-IT')} km`,
        km: nextTire,
        kmLeft,
        isKmBased: true,
        docKey: 'tireDoc',
        hasDoc: Boolean(data.tireDoc),
        status,
        statusText,
      });
    }

    // 6. Batteria 12V
    addDateDeadline('bat12', 'battery12vExpiryDate', 'Batteria 12V', 'Scadenza garanzia batteria servizi', data.battery12vExpiryDate, 'battery12vDoc');

    // 7. Garanzia Ibrida / EV
    if (data.fuelType === 'ibrida' || data.fuelType === 'elettrica') {
      addDateDeadline('hybrid', 'hybridBatteryExpiryDate', 'Garanzia Batteria Ibrida / EV', 'Controllo o garanzia costruttore', data.hybridBatteryExpiryDate, 'hybridBatteryDoc');
    }

    // 8. GPL
    if (data.fuelType === 'gpl') {
      addDateDeadline('gpl', 'lastGplCylinder', 'Sostituzione Bombola GPL', 'Validità decennale (10 anni)', data.lastGplCylinder);
    }

    // 9. Metano
    if (data.fuelType === 'metano') {
      addDateDeadline('metano', 'lastMethaneCylinder', 'Revisione Bombola Metano', data.methaneType === 'r110' ? 'Omologazione R110 (5 anni)' : 'Omologazione Standard (4 anni)', data.lastMethaneCylinder);
    }

    // Sort: expired first, then urgent, then by daysLeft or kmLeft
    return list.sort((a, b) => {
      const order = { expired: 0, urgent: 1, valid: 2 };
      if (order[a.status] !== order[b.status]) {
        return order[a.status] - order[b.status];
      }
      const valA = a.daysLeft ?? (a.kmLeft ? a.kmLeft / 40 : 9999);
      const valB = b.daysLeft ?? (b.kmLeft ? b.kmLeft / 40 : 9999);
      return valA - valB;
    });
  }, [data]);

  // Overall status summary
  const statusSummary = useMemo(() => {
    const expiredCount = deadlines.filter(d => d.status === 'expired').length;
    const urgentCount = deadlines.filter(d => d.status === 'urgent').length;

    if (expiredCount > 0) {
      return {
        level: 'expired' as const,
        title: `${expiredCount} Scadenz${expiredCount > 1 ? 'e Superate' : 'a Superata'}`,
        description: 'Attenzione richiesta immediata per mantenere il veicolo in regola.',
        badgeClass: 'bg-red-500/10 text-red-500 border-red-500/20',
        icon: AlertCircle,
      };
    }
    if (urgentCount > 0) {
      return {
        level: 'urgent' as const,
        title: `${urgentCount} Scadenz${urgentCount > 1 ? 'e in Arrivo' : 'a in Arrivo'}`,
        description: 'Verifica le scadenze pianificate entro i prossimi 30 giorni.',
        badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        icon: Clock,
      };
    }
    return {
      level: 'valid' as const,
      title: 'Tutto in Regola',
      description: 'Nessuna scadenza critica o intervento arretrato.',
      badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      icon: ShieldCheck,
    };
  }, [deadlines]);

  // Quick KM save handler
  const handleSaveQuickKm = () => {
    const kmNum = Number(quickKmInput.replace(/\D/g, ''));
    if (isNaN(kmNum) || kmNum <= 0) return;

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

  // Add Maintenance record handler
  const handleSaveMaintenance = () => {
    if (!newMaintenance.title.trim()) return;

    const newRecord: AutoMaintenanceRecord = {
      id: `maint_${Date.now()}`,
      date: newMaintenance.date,
      type: newMaintenance.type,
      title: newMaintenance.title.trim(),
      km: newMaintenance.km ? newMaintenance.km.replace(/\D/g, '') : undefined,
      cost: newMaintenance.cost ? Number(newMaintenance.cost) : undefined,
      notes: newMaintenance.notes.trim() || undefined,
      doc: newMaintenance.doc,
    };

    const updatedHistory = [newRecord, ...(data.maintenanceHistory || [])];

    // If it's a tagliando or gomme, automatically update vehicle lastServiceKm or tiresKm!
    let updatedServiceKm = data.lastServiceKm;
    let updatedTiresKm = data.tiresKm;
    let updatedCurrentKm = data.currentKm;

    if (newRecord.km) {
      if (newRecord.type === 'tagliando') updatedServiceKm = newRecord.km;
      if (newRecord.type === 'gomme') updatedTiresKm = newRecord.km;
      if (!data.currentKm || Number(newRecord.km) > Number(data.currentKm)) {
        updatedCurrentKm = newRecord.km;
      }
    }

    const updated: AutoModule = {
      ...data,
      lastServiceKm: updatedServiceKm,
      tiresKm: updatedTiresKm,
      currentKm: updatedCurrentKm,
      serviceDoc: newRecord.type === 'tagliando' && newRecord.doc ? newRecord.doc : data.serviceDoc,
      tireDoc: newRecord.type === 'gomme' && newRecord.doc ? newRecord.doc : data.tireDoc,
      maintenanceHistory: updatedHistory,
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
  const togglePref = (field: string, label: string, targetValue: string) => {
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
        targetValue,
        reminderOffset: current.offset,
        enabled: true
      });
      const targetDate = new Date(targetValue);
      const nd = new Date(targetDate.getTime() - current.offset * 24 * 3600 * 1000);
      nd.setHours(9, 0, 0, 0);
      if (nd.getTime() > Date.now()) {
        notificationService.scheduleNotification(
          `Scadenza ${label}`,
          `Promemoria per ${data.brand} ${data.model}: la scadenza ${label} è tra ${current.offset} giorni (${new Date(targetValue).toLocaleDateString('it-IT')})!`,
          nd
        );
      }
    } else {
      notificationService.remove(data.id, field);
    }
  };

  const changeOffset = (field: string, label: string, targetValue: string, offset: number) => {
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
        targetValue,
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

  // Render Full Edit Screen if user triggered "Modifica"
  if (isEditing) {
    return (
      <div className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col p-4 sm:p-6 overflow-y-auto">
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

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col overflow-hidden"
    >
      {/* ── Top Bar ── */}
      <div className="bg-[var(--card-bg)] border-b border-[var(--border)] px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2.5 hover:bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer"
            title="Torna indietro"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[var(--text-main)] uppercase tracking-tight leading-none">
                {data.brand} {data.model}
              </h2>
              {data.registrationYear && (
                <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--surface-variant)] px-2 py-0.5 rounded-md">
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
        <div className="flex items-center gap-1.5 sm:gap-2">
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

          {/* ── Hero Cockpit Card ── */}
          <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 rounded-[2.5rem] p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl border border-zinc-800">
            {/* Ambient Glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${fuelBadge.color}`}>
                    <FuelIcon className="w-3 h-3" />
                    {fuelBadge.label}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {data.registrationYear ? `Anno ${data.registrationYear}` : ''}
                  </span>
                </div>

                {/* Italian License Plate */}
                <div className="inline-flex items-center border border-zinc-500/40 rounded-xl bg-white shadow-2xl h-11 px-0.5 overflow-hidden">
                  <div className="bg-blue-700 h-full px-2.5 flex flex-col items-center justify-center shrink-0">
                    <div className="w-2.5 h-2.5 border border-yellow-300 rounded-full opacity-90 scale-90" />
                    <span className="text-[8px] text-white font-black leading-none mt-0.5">I</span>
                  </div>
                  <span className="px-4 text-zinc-950 font-black font-mono text-2xl sm:text-3xl tracking-[0.18em] uppercase select-none">
                    {data.plate || 'AA 000 AA'}
                  </span>
                  <div className="bg-blue-700 h-full w-4 flex flex-col items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full border border-yellow-300/60" />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 text-zinc-300">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-xs font-bold">{data.driverName || 'Intestatario non impostato'}</span>
                </div>
              </div>

              {/* Brand Logo & Digital Odometer */}
              <div className="flex items-center md:flex-col md:items-end justify-between gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/10 shrink-0 shadow-lg car-logo-bg">
                  {hasLogo ? (
                    <img src={`/logo_auto/${brandLogo}.png`} alt={data.brand} className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
                  ) : (
                    <Car className="w-8 h-8 text-zinc-400" />
                  )}
                </div>

                {/* Quick Odometer display */}
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
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl transition-all group cursor-pointer"
                    title="Clicca per aggiornare i km al volo"
                  >
                    <Gauge className="w-4 h-4 text-teal-400 group-hover:rotate-12 transition-transform" />
                    <span className="font-mono font-black text-xl sm:text-2xl text-white">
                      {data.currentKm ? Number(data.currentKm).toLocaleString('it-IT') : '0'}
                    </span>
                    <span className="text-xs font-bold text-teal-300">km</span>
                    <Edit2 className="w-3 h-3 text-zinc-400 group-hover:text-white transition-colors" />
                  </button>
                  {data.lastKmUpdatedAt && (
                    <p className="text-[9px] font-medium text-zinc-500 mt-1">
                      Aggiornato {new Date(data.lastKmUpdatedAt).toLocaleDateString('it-IT')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Overall Status Banner */}
            <div className={`mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-3`}>
              <div className="flex items-center gap-2.5">
                <statusSummary.icon className={`w-4 h-4 shrink-0 ${statusSummary.level === 'expired' ? 'text-red-400' : statusSummary.level === 'urgent' ? 'text-amber-400' : 'text-emerald-400'}`} />
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-white block">
                    {statusSummary.title}
                  </span>
                  <p className="text-[10px] text-zinc-400">{statusSummary.description}</p>
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
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-variant)]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Scadenze</span>
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
                    Scadenze e Controlli del Veicolo
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Scadenze legali, amministrative e intervalli chilometrici
                  </p>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Modifica Date
                </button>
              </div>

              {deadlines.length === 0 ? (
                <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-8 text-center space-y-3">
                  <Calendar className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
                  <p className="text-sm font-bold text-[var(--text-main)]">Nessuna scadenza memorizzata</p>
                  <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                    Aggiungi le date di assicurazione, bollo e revisione per monitorare automaticamente gli avvisi.
                  </p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                  >
                    Configura Scadenze
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {deadlines.map(d => {
                    const isExpired = d.status === 'expired';
                    const isUrgent = d.status === 'urgent';
                    const statusColor = isExpired
                      ? 'text-red-500 bg-red-500/10 border-red-500/20'
                      : isUrgent
                      ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                      : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';

                    return (
                      <div
                        key={d.id}
                        className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[var(--accent)]/50 transition-all shadow-xs"
                      >
                        <div className="flex items-start sm:items-center gap-3.5">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${statusColor}`}>
                            {d.isKmBased ? <Gauge className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-[var(--text-main)] leading-snug">
                                {d.label}
                              </h4>
                              {d.hasDoc && (
                                <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                  <Check className="w-2.5 h-2.5" /> Doc
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[var(--text-muted)] font-medium">
                              {d.subtitle}
                            </p>
                            <p className="text-xs font-mono font-bold text-[var(--text-main)] mt-0.5">
                              {d.date ? new Date(d.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }) : `${d.km?.toLocaleString('it-IT')} km`}
                            </p>
                          </div>
                        </div>

                        {/* Status Chip & Actions */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]/50">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl border uppercase tracking-wider ${statusColor}`}>
                            {d.statusText}
                          </span>

                          <div className="flex items-center gap-1.5">
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
                                  onClick={() => setCapturingField({ key: d.docKey!, title: d.label })}
                                  className="p-2 hover:bg-[var(--surface-variant)] rounded-xl text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                                  title="Allega Documento"
                                >
                                  <Scan className="w-4 h-4" />
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
              )}
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
                      Registrazione letture e calcolo percorrenze
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

                {/* Big Odometer Readout */}
                <div className="p-6 bg-[var(--bg)] border border-[var(--border)] rounded-2xl flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-2">
                    Chilometraggio Rilevato
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono font-black text-4xl sm:text-5xl text-[var(--text-main)] tracking-tight">
                      {data.currentKm ? Number(data.currentKm).toLocaleString('it-IT') : '0'}
                    </span>
                    <span className="text-lg font-bold text-[var(--accent)]">km</span>
                  </div>
                  {data.lastKmUpdatedAt && (
                    <p className="text-[11px] text-[var(--text-muted)] mt-2">
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
                        {data.lastServiceKm ? `${Number(data.lastServiceKm) + 15000} km` : '---'}
                      </span>
                    </div>
                    {data.currentKm && data.lastServiceKm ? (() => {
                      const cur = Number(data.currentKm);
                      const last = Number(data.lastServiceKm);
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
                              {kmLeft <= 0 ? `Superato di ${Math.abs(kmLeft)} km` : `${kmLeft.toLocaleString('it-IT')} km rimasti`}
                            </span>
                          </p>
                        </>
                      );
                    })() : (
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">Imposta km ultimo tagliando nell'editor</p>
                    )}
                  </div>

                  {/* Gomme interval bar */}
                  <div className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[var(--text-main)]">Controllo Gomme</span>
                      <span className="text-xs font-mono font-bold text-[var(--accent)]">
                        {data.tiresKm ? `${Number(data.tiresKm) + 10000 + (data.tiresSuggestedOffsetKm || 0)} km` : '---'}
                      </span>
                    </div>
                    {data.currentKm && data.tiresKm ? (() => {
                      const cur = Number(data.currentKm);
                      const last = Number(data.tiresKm);
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
                              {kmLeft <= 0 ? `Superato di ${Math.abs(kmLeft)} km` : `${kmLeft.toLocaleString('it-IT')} km rimasti`}
                            </span>
                          </p>
                        </>
                      );
                    })() : (
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">Imposta km controllo gomme nell'editor</p>
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
                    className="px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-xs font-bold uppercase tracking-wider"
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

          {/* ════ TAB 4: DOCUMENTI DEL VEICOLO ════ */}
          {activeTab === 'documents' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div>
                <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">
                  Cassetto Documentale Digitale
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Conserva in formato sicuro libretto, proprietà, certificati e ricevute
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'librettoDoc' as const, title: 'Libretto di Circolazione', subtitle: 'Documento Unico di Circolazione', icon: FileText },
                  { key: 'cdpDoc' as const, title: 'Certificato di Proprietà', subtitle: 'CDP Digitale o foglio complementare', icon: ShieldCheck },
                  { key: 'insuranceDoc' as const, title: 'Polizza Assicurativa RCA', subtitle: 'Contratto e carta verde assicurativa', icon: FileText },
                  { key: 'taxDoc' as const, title: 'Ricevuta Pagamento Bollo', subtitle: 'Quietanza tributo regionale', icon: FileText },
                  { key: 'revisionDoc' as const, title: 'Certificato Ultima Revisione', subtitle: 'Attestato superamento revisione ministeriale', icon: CheckCircle2 },
                  { key: 'serviceDoc' as const, title: 'Ricevuta Ultimo Tagliando', subtitle: 'Fattura o ricevuta officina', icon: Wrench },
                  { key: 'tireDoc' as const, title: 'Ricevuta Controllo Gomme', subtitle: 'Fattura gommista / acquisto pneumatici', icon: Gauge },
                  { key: 'battery12vDoc' as const, title: 'Certificato Batteria 12V', subtitle: 'Garanzia e scontrino acquisto', icon: Zap },
                ].map(docItem => {
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
                              onClick={() => setCapturingField({ key: docItem.key, title: docItem.title })}
                              className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] rounded-xl transition-colors cursor-pointer"
                              title="Sostituisci documento"
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
                          <button
                            type="button"
                            onClick={() => setCapturingField({ key: docItem.key, title: docItem.title })}
                            className="w-full py-2 px-3 bg-[var(--accent-bg)] hover:bg-[var(--accent)] hover:text-white text-[var(--accent)] border border-[var(--accent)]/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Scan className="w-3.5 h-3.5" /> Allega / Scansiona
                          </button>
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
                  placeholder="Nota facoltativa (es. Rientro vacanze)"
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
                    type="number"
                    step="0.01"
                    value={newMaintenance.cost}
                    onChange={e => setNewMaintenance(prev => ({ ...prev, cost: e.target.value }))}
                    placeholder="Es. 280.00"
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
                        className="flex-1 py-2 px-3 bg-[var(--surface-variant)] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-500" /> Anteprima
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewMaintenance(prev => ({ ...prev, doc: undefined }))}
                        className="p-2 text-red-400 hover:text-red-500 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCapturingField({ key: 'maintenanceDoc', title: 'Fattura Intervento' })}
                      className="w-full py-2.5 px-3 bg-[var(--accent-bg)] border border-[var(--accent)]/20 text-[var(--accent)] rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-[var(--accent)] hover:text-white transition-all cursor-pointer"
                    >
                      <Scan className="w-3.5 h-3.5" /> Scansiona / Allega Documento
                    </button>
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
                    <p className="text-xs font-bold text-[var(--text-main)]">Promemoria KM Settimanale</p>
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
                  const activeDeadlines = [
                    { label: 'Assicurazione', date: data.lastInsurance, field: 'lastInsurance' },
                    { label: 'Bollo', date: data.lastTax, field: 'lastTax' },
                    { label: 'Revisione', date: data.lastRevision, field: 'lastRevision' },
                    { label: 'Batteria 12V', date: data.battery12vExpiryDate, field: 'battery12vExpiryDate' },
                    { label: 'Garanzia Batteria Ibrida', date: data.hybridBatteryExpiryDate, field: 'hybridBatteryExpiryDate' },
                    { label: 'Bombola GPL', date: data.lastGplCylinder, field: 'lastGplCylinder' },
                    { label: 'Bombola Metano', date: data.lastMethaneCylinder, field: 'lastMethaneCylinder' },
                  ].filter(d => d.date && isValidDate(d.date));

                  if (activeDeadlines.length === 0) {
                    return (
                      <p className="text-[11px] text-[var(--text-muted)] italic p-4 text-center">
                        Nessuna data di scadenza configurata. Inseriscile nell'editor per attivare i promemoria.
                      </p>
                    );
                  }

                  return activeDeadlines.map((ad, idx) => {
                    const pref = localPrefs[ad.field] || { enabled: false, offset: 7 };
                    return (
                      <div key={idx} className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-3.5 space-y-3">
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
        message={`Sei sicuro di voler eliminare definitivamente ${data.brand} ${data.model} e tutti i suoi documenti archiviati?`}
        onConfirm={() => {
          onDelete?.(module?.id || '');
          onCancel();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </motion.div>
  );
};
