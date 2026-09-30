import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, MapPin, Plus, Navigation, Trash2, Edit2, X, Share2, 
  Car, Clock, AlertCircle, RefreshCw, Check, ExternalLink, Timer, 
  Edit3, Bell, Coins, Search, QrCode, Bookmark, ChevronRight,
  ShieldCheck, AlertTriangle, Play, CheckCircle2, RotateCcw
} from 'lucide-react';
import { generateUUID } from '../utils/uuid';
import { Share } from '@capacitor/share';
import { storage } from '../services/storage';
import { QrScanner } from './QrScanner';
import { QRCodeSVG } from 'qrcode.react';
import { ConfirmDialog } from './ConfirmDialog';
import { 
  SavedParking, getSavedParking, saveParking, clearSavedParking, 
  autoSaveParking, manualSaveParking, getCurrentGpsPosition, reverseGeocodeCoordinates,
  calculateDistanceMeters, formatDistance, formatElapsedParkingTime, 
  getNavigationUrl, extendParkingMeter, setParkingMeterEndTime, PARKING_EVENT 
} from '../services/parkingService';

export interface Address {
  id: string;
  title: string;
  query: string;
}

export interface AddressAndParkingScreenProps {
  onClose: () => void;
  initialTab?: 'addresses' | 'parking';
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  initialAutoSave?: boolean;
}

export const AddressAndParkingScreen: React.FC<AddressAndParkingScreenProps> = ({ 
  onClose, 
  initialTab = 'addresses',
  showToast,
  initialAutoSave = false
}) => {
  const [activeTab, setActiveTab] = useState<'addresses' | 'parking'>(initialTab);

  // ----------------------------------------------------
  // STATO RUBRICA INDIRIZZI
  // ----------------------------------------------------
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [searchAddrQuery, setSearchAddrQuery] = useState('');
  const [isAddingAddr, setIsAddingAddr] = useState(false);
  const [editingAddr, setEditingAddr] = useState<Address | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newQuery, setNewQuery] = useState('');
  const [isGettingAddrGps, setIsGettingAddrGps] = useState(false);
  const [isScanningQr, setIsScanningQr] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [sharingAddr, setSharingAddr] = useState<Address | null>(null);

  // ----------------------------------------------------
  // STATO PARCHEGGIO & PARCHIMETRO
  // ----------------------------------------------------
  const [parking, setParking] = useState<SavedParking | null>(() => getSavedParking());
  const [isLoadingGps, setIsLoadingGps] = useState(false);
  const [distanceToCar, setDistanceToCar] = useState<number | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [now, setNow] = useState<number>(Date.now());

  // Configurazione Nuovo Parcheggio (Setup)
  const [locationMode, setLocationMode] = useState<'gps' | 'manual'>('gps');
  const [manualAddressInput, setManualAddressInput] = useState('');
  const [selectedAddressFromBook, setSelectedAddressFromBook] = useState<Address | null>(null);
  const [vehicleNameInput, setVehicleNameInput] = useState('');
  
  // Parchimetro Setup (Stile EasyPark / parchimetro vero) - disattivato di default
  const [isMeterEnabled, setIsMeterEnabled] = useState(false);
  const [meterDurationMinutes, setMeterDurationMinutes] = useState<number>(60); // 1 ora di default
  const [hourlyRate, setHourlyRate] = useState<number>(1.50); // 1.50 €/h tipico
  const [customRateInput, setCustomRateInput] = useState('1.50');
  const [manualEndTimeInput, setManualEndTimeInput] = useState<string>(''); // formato HH:mm

  // Assicura che il parchimetro sia disattivato di default quando si entra nella sezione parcheggio senza un parcheggio attivo
  useEffect(() => {
    if (activeTab === 'parking' && !parking) {
      setIsMeterEnabled(false);
    }
  }, [activeTab, parking]);

  // Modal / Selettore per scegliere indirizzo da rubrica come parcheggio
  const [isAddressPickerOpen, setIsAddressPickerOpen] = useState(false);
  // Modal modifica manuale orario parcheggio attivo
  const [isExtendingManualModalOpen, setIsExtendingManualModalOpen] = useState(false);
  const [extendTimeInput, setExtendTimeInput] = useState('');

  // ----------------------------------------------------
  // RILEVAMENTO GPS AUTOMATICO CON ANIMAZIONE RADAR
  // ----------------------------------------------------
  const [isAcquiringGpsParking, setIsAcquiringGpsParking] = useState(false);
  const [gpsAcquisitionStep, setGpsAcquisitionStep] = useState<'locating' | 'geocoding' | 'saving' | 'success' | 'error'>('locating');
  const [acquiredAddress, setAcquiredAddress] = useState<string>('');
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);

  const triggerGpsAutoSave = async () => {
    setIsAcquiringGpsParking(true);
    setGpsAcquisitionStep('locating');
    setGpsErrorMsg(null);
    setAcquiredAddress('');

    try {
      // Step 1: Coordinate GPS
      setGpsAcquisitionStep('locating');
      const pos = await getCurrentGpsPosition();

      // Step 2: Risoluzione Indirizzo
      setGpsAcquisitionStep('geocoding');
      const geo = await reverseGeocodeCoordinates(pos.latitude, pos.longitude);

      // Step 3: Salvataggio Parcheggio
      setGpsAcquisitionStep('saving');
      let expiresAt: number | undefined = undefined;
      let duration: number | undefined = undefined;
      let cost: number | undefined = undefined;

      if (isMeterEnabled && meterDurationMinutes > 0) {
        duration = meterDurationMinutes;
        expiresAt = Date.now() + meterDurationMinutes * 60 * 1000;
        if (hourlyRate > 0) {
          cost = estimatedMeterCost;
        }
      }

      const saved = await autoSaveParking(
        notesText,
        vehicleNameInput,
        expiresAt,
        duration,
        isMeterEnabled ? hourlyRate : 0,
        cost
      );

      setAcquiredAddress(saved.address);
      setGpsAcquisitionStep('success');

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([40, 60, 100]); } catch {}
      }

      if (showToast) {
        showToast(`Auto parcheggiata in ${saved.address}! 🚗`, 'success');
      }

      setTimeout(() => {
        setParking(saved);
        setIsAcquiringGpsParking(false);
      }, 1200);

    } catch (err: any) {
      console.error('Error auto-saving parking GPS', err);
      setGpsAcquisitionStep('error');
      setGpsErrorMsg(err?.message || 'Impossibile rilevare la posizione GPS. Assicurati che i permessi di geolocalizzazione siano concessi.');
    }
  };

  // Se aperto con initialAutoSave (es. da comando Chelona AI), attiva subito il rilevamento
  useEffect(() => {
    if (initialAutoSave) {
      setActiveTab('parking');
      triggerGpsAutoSave();
    }
  }, [initialAutoSave]);

  // Aggiornamento tempo ogni secondo per il parchimetro live
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Ascolta aggiornamenti del parcheggio da altri componenti o da Chelona AI
  useEffect(() => {
    const handleUpdate = (e: any) => {
      setParking(e.detail || getSavedParking());
    };
    window.addEventListener(PARKING_EVENT, handleUpdate);
    return () => window.removeEventListener(PARKING_EVENT, handleUpdate);
  }, []);

  // Caricamento iniziale Rubrica Indirizzi
  useEffect(() => {
    const loaded = storage.loadAddressBook();
    setAddresses(loaded);
    if ((window as any).ChelonaNative && (window as any).ChelonaNative.saveAddresses) {
      (window as any).ChelonaNative.saveAddresses(JSON.stringify(loaded));
    }
  }, []);

  // Ascolta intent esterno per aggiungere indirizzo
  useEffect(() => {
    const handleOpenAdd = (e: any) => {
      if (e.detail) {
        setNewTitle(e.detail.title || '');
        setNewQuery(e.detail.query || '');
        setEditingAddr(null);
        setIsAddingAddr(true);
        setActiveTab('addresses');
      }
    };
    window.addEventListener('open-address-book-add', handleOpenAdd);
    return () => window.removeEventListener('open-address-book-add', handleOpenAdd);
  }, []);

  // Calcola distanza live dall'auto se parcheggiata
  useEffect(() => {
    if (!parking || (parking.latitude === 0 && parking.longitude === 0)) {
      setDistanceToCar(null);
      return;
    }

    getCurrentGpsPosition()
      .then(pos => {
        const dist = calculateDistanceMeters(
          pos.latitude,
          pos.longitude,
          parking.latitude,
          parking.longitude
        );
        setDistanceToCar(dist);
      })
      .catch(err => {
        console.warn('Impossibile calcolare distanza in tempo reale', err);
      });
  }, [parking, now]);

  // Aggiorna campo orario HH:mm quando cambia la durata del parchimetro in setup
  useEffect(() => {
    const targetDate = new Date(Date.now() + meterDurationMinutes * 60 * 1000);
    const hh = String(targetDate.getHours()).padStart(2, '0');
    const mm = String(targetDate.getMinutes()).padStart(2, '0');
    setManualEndTimeInput(`${hh}:${mm}`);
  }, [meterDurationMinutes]);

  // ----------------------------------------------------
  // GESTIONE RUBRICA INDIRIZZI
  // ----------------------------------------------------
  const saveAddresses = (updated: Address[]) => {
    setAddresses(updated);
    storage.saveAddressBook(updated);
    if ((window as any).ChelonaNative && (window as any).ChelonaNative.saveAddresses) {
      (window as any).ChelonaNative.saveAddresses(JSON.stringify(updated));
    }
  };

  const handleAddOrEditAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newQuery.trim()) return;

    if (editingAddr) {
      const updated = addresses.map(a => a.id === editingAddr.id ? { ...a, title: newTitle.trim(), query: newQuery.trim() } : a);
      saveAddresses(updated);
      setEditingAddr(null);
      if (showToast) showToast('Indirizzo aggiornato con successo!', 'success');
    } else {
      const updated = [
        { id: generateUUID(), title: newTitle.trim(), query: newQuery.trim() },
        ...addresses
      ];
      saveAddresses(updated);
      if (showToast) showToast('Nuovo indirizzo salvato!', 'success');
    }
    
    setIsAddingAddr(false);
    setNewTitle('');
    setNewQuery('');
  };

  const handleGetGpsForNewAddress = async () => {
    setIsGettingAddrGps(true);
    try {
      const pos = await getCurrentGpsPosition();
      const geo = await reverseGeocodeCoordinates(pos.latitude, pos.longitude);
      setNewQuery(geo.address || `${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}`);
      if (!newTitle) {
        setNewTitle(geo.city ? `Posizione a ${geo.city}` : 'Mia Posizione');
      }
      if (showToast) showToast('Posizione attuale rilevata!', 'success');
    } catch (e: any) {
      if (showToast) showToast(e.message || 'Errore geolocalizzazione', 'error');
    } finally {
      setIsGettingAddrGps(false);
    }
  };

  const handleScanAddressQr = (data: string) => {
    setIsScanningQr(false);
    try {
      let parsed = JSON.parse(data);
      if (parsed.t === 'shared_address' || parsed.type === 'shared_address') {
        const addressData = parsed.d || parsed.data;
        if (addressData && addressData.title && addressData.query) {
          const updated = [
            { id: generateUUID(), title: addressData.title.trim(), query: addressData.query.trim() },
            ...addresses
          ];
          saveAddresses(updated);
          if (showToast) showToast(`Indirizzo "${addressData.title}" importato!`, 'success');
        } else {
          alert('Dati indirizzo non validi nel QR code.');
        }
      } else {
        alert('Questo QR code non contiene un indirizzo Chelona valido.');
      }
    } catch {
      alert('Errore nella lettura del QR code.');
    }
  };

  const handleDeleteAddress = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteAddress = () => {
    if (deleteConfirmId) {
      saveAddresses(addresses.filter(a => a.id !== deleteConfirmId));
      setDeleteConfirmId(null);
      if (showToast) showToast('Indirizzo eliminato', 'info');
    }
  };

  const handleNavigateAddress = (query: string) => {
    const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(query)}`;
    window.open(mapUrl, '_blank', 'noopener,noreferrer');
  };

  const handleParkAtAddress = (addr: Address) => {
    setSelectedAddressFromBook(addr);
    setManualAddressInput(`${addr.title}: ${addr.query}`);
    setLocationMode('manual');
    setActiveTab('parking');
    if (showToast) showToast(`Impostato come parcheggio: ${addr.title}`, 'info');
  };

  // Indirizzi filtrati da ricerca
  const filteredAddresses = useMemo(() => {
    if (!searchAddrQuery.trim()) return addresses;
    const q = searchAddrQuery.toLowerCase();
    return addresses.filter(a => a.title.toLowerCase().includes(q) || a.query.toLowerCase().includes(q));
  }, [addresses, searchAddrQuery]);

  // ----------------------------------------------------
  // GESTIONE PARCHEGGIO & PARCHIMETRO
  // ----------------------------------------------------

  // Calcolo costo stimato in setup
  const estimatedMeterCost = useMemo(() => {
    if (!isMeterEnabled || hourlyRate <= 0) return 0;
    return Math.round((meterDurationMinutes / 60) * hourlyRate * 100) / 100;
  }, [isMeterEnabled, meterDurationMinutes, hourlyRate]);

  // Inserimento manuale ora fine sosta (da timepicker input)
  const handleManualTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setManualEndTimeInput(val);
    if (!val) return;

    const [hhStr, mmStr] = val.split(':');
    const hh = parseInt(hhStr, 10);
    const mm = parseInt(mmStr, 10);
    if (isNaN(hh) || isNaN(mm)) return;

    const targetDate = new Date();
    targetDate.setHours(hh, mm, 0, 0);

    // Se l'orario scelto è già passato oggi, intendiamo domani
    if (targetDate.getTime() <= Date.now()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    const diffMinutes = Math.max(5, Math.round((targetDate.getTime() - Date.now()) / (60 * 1000)));
    setMeterDurationMinutes(diffMinutes);
  };

  // Regolazione rapida minuti parchimetro (-15, +15, +30, +60, ecc.)
  const adjustMeterMinutes = (delta: number) => {
    setMeterDurationMinutes(prev => {
      const next = Math.max(5, prev + delta);
      return next;
    });
  };

  // Salva il nuovo parcheggio
  const handleConfirmAndSaveParking = async () => {
    if (locationMode === 'gps') {
      triggerGpsAutoSave();
      return;
    }

    setIsLoadingGps(true);
    try {
      let expiresAt: number | undefined = undefined;
      let duration: number | undefined = undefined;
      let cost: number | undefined = undefined;

      if (isMeterEnabled && meterDurationMinutes > 0) {
        duration = meterDurationMinutes;
        expiresAt = Date.now() + meterDurationMinutes * 60 * 1000;
        if (hourlyRate > 0) {
          cost = estimatedMeterCost;
        }
      }

      const addrToUse = manualAddressInput.trim() || 'Parcheggio Manuale';
      const saved = await manualSaveParking({
        address: addrToUse,
        notes: notesText,
        vehicleName: vehicleNameInput,
        expiresAt,
        meterDurationMinutes: duration,
        hourlyRate: isMeterEnabled ? hourlyRate : 0,
        estimatedCost: cost,
      });

      const wasMeterEnabled = isMeterEnabled;
      setParking(saved);
      setIsEditingNotes(false);
      setIsMeterEnabled(false);
      if (showToast) {
        showToast(
          wasMeterEnabled 
            ? `🅿️ Parcheggio attivato! Parchimetro impostato per ${formatMinutesHuman(meterDurationMinutes)}.`
            : '📍 Posizione auto salvata con successo!', 
          'success'
        );
      }
    } catch (e: any) {
      console.error('Errore salvataggio parcheggio', e);
      if (showToast) {
        showToast(e.message || 'Errore durante il salvataggio del parcheggio.', 'error');
      }
    } finally {
      setIsLoadingGps(false);
    }
  };

  // Prolunga sosta dal vivo (+15m, +30m, +1h) come nelle app di sosta
  const handleExtendParkingLive = (additionalMinutes: number) => {
    const updated = extendParkingMeter(additionalMinutes);
    if (updated) {
      setParking(updated);
      if (showToast) {
        showToast(`⏱️ Parchimetro prolungato di +${additionalMinutes} min!`, 'success');
      }
    }
  };

  // Imposta orario di fine manuale sul parcheggio attivo
  const handleApplyManualEndTimeLive = () => {
    if (!extendTimeInput || !parking) return;
    const [hhStr, mmStr] = extendTimeInput.split(':');
    const hh = parseInt(hhStr, 10);
    const mm = parseInt(mmStr, 10);
    if (isNaN(hh) || isNaN(mm)) return;

    const targetDate = new Date();
    targetDate.setHours(hh, mm, 0, 0);
    if (targetDate.getTime() <= Date.now()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    const updated = setParkingMeterEndTime(targetDate.getTime(), parking.hourlyRate);
    if (updated) {
      setParking(updated);
      setIsExtendingManualModalOpen(false);
      if (showToast) {
        showToast(`⏱️ Orario di fine sosta aggiornato alle ${extendTimeInput}!`, 'success');
      }
    }
  };

  // Salva solo le note aggiornate
  const handleSaveNotes = () => {
    if (!parking) return;
    const updated: SavedParking = {
      ...parking,
      notes: notesText,
    };
    saveParking(updated);
    setParking(updated);
    setIsEditingNotes(false);
    if (showToast) showToast('Note parcheggio aggiornate', 'success');
  };

  // Termina sosta / Ho ripreso l'auto
  const handleClearParking = () => {
    if (confirm("Hai ripreso l'auto? Vuoi terminare la sosta e azzerare il parchimetro?")) {
      clearSavedParking();
      setParking(null);
      setDistanceToCar(null);
      setNotesText('');
      setManualAddressInput('');
      setSelectedAddressFromBook(null);
      setIsMeterEnabled(false);
      if (showToast) showToast("Sosta terminata. Posizione rimossa.", 'info');
    }
  };

  // Condivisione posizione auto
  const handleShareParking = async () => {
    if (!parking) return;
    const mapLink = (parking.latitude !== 0 && parking.longitude !== 0)
      ? `https://maps.google.com/?q=${parking.latitude},${parking.longitude}`
      : `https://maps.google.com/?q=${encodeURIComponent(parking.address || '')}`;
    const text = `La mia auto è parcheggiata qui:\n${parking.address || 'Posizione GPS'}\n${parking.notes ? `Note: ${parking.notes}\n` : ''}${mapLink}`;
    
    try {
      await Share.share({
        title: 'Posizione Parcheggio Auto',
        text,
        url: mapLink,
        dialogTitle: 'Condividi Parcheggio',
      });
    } catch {
      navigator.clipboard.writeText(text);
      if (showToast) showToast('Link parcheggio copiato negli appunti!', 'success');
    }
  };

  // Navigazione all'auto a piedi
  const handleNavigateToCar = () => {
    if (!parking) return;
    const url = getNavigationUrl(parking.latitude, parking.longitude, parking.address);
    window.open(url, '_blank');
  };

  // Calcolo tempo e stato del parchimetro attivo in tempo reale
  const meterLiveStatus = useMemo(() => {
    if (!parking?.expiresAt) return null;
    const diffMs = parking.expiresAt - now;
    const isExpired = diffMs <= 0;
    const absDiffMs = Math.abs(diffMs);

    const totalSeconds = Math.floor(absDiffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const endDate = new Date(parking.expiresAt);
    const endFormatted = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

    // Percentuale progresso se disponibile durata totale
    let percentRemaining = 0;
    if (parking.meterStartedAt && parking.expiresAt > parking.meterStartedAt) {
      const totalSpan = parking.expiresAt - parking.meterStartedAt;
      const left = Math.max(0, parking.expiresAt - now);
      percentRemaining = Math.min(100, Math.max(0, Math.round((left / totalSpan) * 100)));
    } else {
      percentRemaining = isExpired ? 0 : 50;
    }

    const isUrgent = !isExpired && diffMs < 15 * 60 * 1000; // meno di 15 min

    return {
      isExpired,
      isUrgent,
      formattedTime,
      endFormatted,
      percentRemaining,
      diffMinutes: Math.round(diffMs / 60000),
    };
  }, [parking, now]);

  function formatMinutesHuman(totalMin: number): string {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  return (
    <div className="fixed inset-0 z-[130] bg-[var(--bg)] flex flex-col h-[100dvh] overflow-hidden font-sans transition-colors duration-300">
      {/* HEADER PRINCIPALE */}
      <header className="h-16 lg:h-20 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-2xl px-4 lg:px-8 flex items-center justify-between shrink-0 z-20 safe-area-header shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--surface-variant)] rounded-2xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors active:scale-95"
            title="Torna indietro"
          >
            <ArrowLeft className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>

          <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-2xl bg-gradient-to-tr from-indigo-500/15 via-rose-500/10 to-amber-500/15 border border-indigo-500/20 p-2 flex items-center justify-center shrink-0 shadow-sm text-indigo-500">
            {activeTab === 'addresses' ? (
              <MapPin className="w-6 h-6" />
            ) : (
              <Car className="w-6 h-6" />
            )}
          </div>

          <div>
            <h2 className="text-base lg:text-lg font-black text-[var(--text-main)] tracking-tight">
              Indirizzi & Parcheggio
            </h2>
            <p className="text-xs text-[var(--text-muted)] font-medium">
              {activeTab === 'addresses' ? 'Rubrica rapida delle tue posizioni' : 'Salva auto & parchimetro digitale'}
            </p>
          </div>
        </div>

        {/* Azioni rapide Header */}
        <div className="flex items-center gap-2">
          {activeTab === 'addresses' ? (
            <>
              <button
                onClick={() => setIsScanningQr(true)}
                className="p-2.5 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border border-[var(--border)] active:scale-95"
                title="Scansiona QR Code indirizzo"
              >
                <QrCode className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setEditingAddr(null);
                  setNewTitle('');
                  setNewQuery('');
                  setIsAddingAddr(true);
                }}
                className="p-2.5 rounded-2xl bg-indigo-500 text-white hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-500/20 active:scale-95 flex items-center gap-1.5"
                title="Nuovo Indirizzo"
              >
                <Plus className="w-5 h-5" />
                <span className="text-xs font-bold hidden sm:inline">Nuovo</span>
              </button>
            </>
          ) : (
            parking && (
              <>
                <button
                  onClick={handleShareParking}
                  className="p-2.5 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-indigo-500 transition-colors border border-[var(--border)] active:scale-95"
                  title="Condividi posizione auto"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleClearParking}
                  className="p-2.5 rounded-2xl bg-[var(--surface-variant)] hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 transition-colors border border-[var(--border)] active:scale-95"
                  title="Termina sosta / Cancella"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )
          )}
        </div>
      </header>

      {/* CONTROLLO A SCHEDE (SEGMENTED CONTROL M3) */}
      <div className="px-4 pt-3 pb-1 shrink-0 bg-[var(--bg)] border-b border-[var(--border)]/60">
        <div className="flex bg-[var(--surface-variant)] p-1 rounded-2xl border border-[var(--border)] max-w-lg mx-auto w-full relative">
          <button
            onClick={() => setActiveTab('addresses')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all relative z-10 ${
              activeTab === 'addresses'
                ? 'bg-[var(--surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <MapPin className="w-4 h-4 text-indigo-500" />
            <span>Rubrica Indirizzi</span>
            {addresses.length > 0 && (
              <span className="px-1.5 py-0.5 bg-[var(--surface-variant)] text-[10px] font-black rounded-full border border-[var(--border)]">
                {addresses.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('parking');
              if (!parking) setIsMeterEnabled(false);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all relative z-10 ${
              activeTab === 'parking'
                ? 'bg-[var(--surface)] text-indigo-500 shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Salva Parcheggio</span>
            {parking && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {meterLiveStatus ? meterLiveStatus.endFormatted : 'Attivo'}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* CONTENUTO SCORREVOLE */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8 max-w-3xl mx-auto w-full pb-24">
        {activeTab === 'addresses' ? (
          /* ============================================================ */
          /* SCHERMATA: RUBRICA INDIRIZZI                                */
          /* ============================================================ */
          <div className="space-y-4">
            {/* Barra di Ricerca */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchAddrQuery}
                onChange={(e) => setSearchAddrQuery(e.target.value)}
                placeholder="Cerca per titolo, via o città..."
                className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500"
              />
              {searchAddrQuery && (
                <button 
                  onClick={() => setSearchAddrQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Lista Indirizzi */}
            {filteredAddresses.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {filteredAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] hover:border-indigo-500/30 transition-all shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shrink-0 mt-0.5">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-base font-bold text-[var(--text-main)] truncate">
                            {addr.title}
                          </h4>
                          <p className="text-xs text-[var(--text-muted)] break-words line-clamp-2">
                            {addr.query}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingAddr(addr);
                            setNewTitle(addr.title);
                            setNewQuery(addr.query);
                            setIsAddingAddr(true);
                          }}
                          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-indigo-500 hover:bg-[var(--surface-variant)] transition-colors"
                          title="Modifica"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Azioni Rapide su ciascun indirizzo */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]/60">
                      <button
                        onClick={() => handleNavigateAddress(addr.query)}
                        className="flex-1 min-w-[120px] py-2 px-3 rounded-xl bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Naviga (Maps)</span>
                      </button>

                      <button
                        onClick={() => handleParkAtAddress(addr)}
                        className="py-2 px-3 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-indigo-500 font-bold text-xs flex items-center gap-1.5 border border-[var(--border)] active:scale-95 transition-all"
                        title="Imposta questo luogo come parcheggio auto"
                      >
                        <Car className="w-3.5 h-3.5" />
                        <span>Parcheggia qui</span>
                      </button>

                      <button
                        onClick={() => setSharingAddr(addr)}
                        className="p-2 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border)] active:scale-95 transition-all"
                        title="Condividi via QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty state Rubrica */
              <div className="py-14 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto border border-indigo-500/20">
                  <MapPin className="w-10 h-10" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="text-lg font-bold text-[var(--text-main)]">Nessun Indirizzo Salvato</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Salva i tuoi luoghi preferiti (casa, lavoro, clienti, palestre) per aprirli in Google Maps o selezionarli al volo come parcheggio.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingAddr(null);
                    setNewTitle('');
                    setNewQuery('');
                    setIsAddingAddr(true);
                  }}
                  className="py-3 px-6 rounded-2xl bg-indigo-500 text-white font-bold text-sm inline-flex items-center gap-2 shadow-md shadow-indigo-500/20 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Aggiungi il Primo Indirizzo</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ============================================================ */
          /* SCHERMATA: PARCHEGGIO & PARCHIMETRO                          */
          /* ============================================================ */
          <div className="space-y-6">
            {isAcquiringGpsParking ? (
              /* ANIMAZIONE CARICAMENTO GPS RILEVAMENTO POSIZIONE */
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-[var(--surface)] to-[var(--surface-variant)] border border-indigo-500/30 shadow-2xl relative overflow-hidden text-center space-y-6 my-2"
              >
                {/* Glow di sfondo radiale */}
                <div className="absolute inset-0 bg-radial from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

                {/* Radar rings container */}
                <div className="relative w-44 h-44 mx-auto flex items-center justify-center my-3">
                  {/* Pulsing ripple ring 1 */}
                  <motion.div
                    animate={{
                      scale: [1, 2.3],
                      opacity: [0.55, 0],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2.4,
                      ease: 'easeOut',
                    }}
                    className="absolute w-28 h-28 rounded-full border-2 border-indigo-500/60 bg-indigo-500/10"
                  />

                  {/* Pulsing ripple ring 2 */}
                  <motion.div
                    animate={{
                      scale: [1, 2.3],
                      opacity: [0.55, 0],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2.4,
                      delay: 0.8,
                      ease: 'easeOut',
                    }}
                    className="absolute w-28 h-28 rounded-full border-2 border-indigo-400/50 bg-indigo-500/10"
                  />

                  {/* Pulsing ripple ring 3 */}
                  <motion.div
                    animate={{
                      scale: [1, 2.3],
                      opacity: [0.55, 0],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2.4,
                      delay: 1.6,
                      ease: 'easeOut',
                    }}
                    className="absolute w-28 h-28 rounded-full border-2 border-cyan-400/40 bg-cyan-500/5"
                  />

                  {/* Rotating radar sweep ray */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                    className="absolute w-36 h-36 rounded-full pointer-events-none"
                    style={{
                      background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(99, 102, 241, 0.35) 360deg)',
                    }}
                  />

                  {/* Central glowing car & GPS marker */}
                  <div className="relative z-10 w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-xl shadow-indigo-500/40 border-2 border-white/20">
                    {gpsAcquisitionStep === 'success' ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      >
                        <CheckCircle2 className="w-12 h-12 text-emerald-300" />
                      </motion.div>
                    ) : gpsAcquisitionStep === 'error' ? (
                      <AlertCircle className="w-12 h-12 text-rose-300" />
                    ) : (
                      <motion.div
                        animate={{ y: [-2, 2, -2] }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                        className="flex flex-col items-center"
                      >
                        <Car className="w-10 h-10 drop-shadow" />
                        <MapPin className="w-5 h-5 -mt-1 text-amber-300 animate-bounce" />
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Dynamic Titles and Status */}
                <div className="space-y-2 max-w-md mx-auto">
                  <h3 className="text-xl font-black text-[var(--text-main)] tracking-tight">
                    {gpsAcquisitionStep === 'success' ? (
                      <span className="text-emerald-500">Parcheggio Registrato! 🎉</span>
                    ) : gpsAcquisitionStep === 'error' ? (
                      <span className="text-rose-500">Geolocalizzazione non riuscita</span>
                    ) : (
                      <span>Rilevamento Posizione GPS...</span>
                    )}
                  </h3>

                  <p className="text-sm text-[var(--text-muted)] font-medium leading-relaxed">
                    {gpsAcquisitionStep === 'locating' && 'Connessione ai satelliti GPS e acquisizione coordinate in corso...'}
                    {gpsAcquisitionStep === 'geocoding' && 'Rilevamento indirizzo, via e città...'}
                    {gpsAcquisitionStep === 'saving' && 'Salvataggio della posizione nella memoria di Chelona...'}
                    {gpsAcquisitionStep === 'success' && `Posizione registrata: ${acquiredAddress || 'Coordinate salvate'}`}
                    {gpsAcquisitionStep === 'error' && (gpsErrorMsg || 'Assicurati che i permessi di localizzazione siano attivi.')}
                  </p>
                </div>

                {/* Progress step indicators */}
                {gpsAcquisitionStep !== 'error' && gpsAcquisitionStep !== 'success' && (
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-bold border border-indigo-500/20">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Fase: {gpsAcquisitionStep === 'locating' ? 'Coordinate GPS' : 'Indirizzo Civico'}</span>
                    </span>
                  </div>
                )}

                {/* Error Action Buttons */}
                {gpsAcquisitionStep === 'error' && (
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={triggerGpsAutoSave}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 active:scale-95"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Riprova GPS</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsAcquiringGpsParking(false);
                        setLocationMode('manual');
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[var(--surface-variant)] text-[var(--text-main)] border border-[var(--border)] font-bold text-sm flex items-center justify-center gap-2 active:scale-95"
                    >
                      <span>Inserisci a Mano</span>
                    </button>
                  </div>
                )}

                {/* Cancel button if taking too long */}
                {gpsAcquisitionStep !== 'error' && gpsAcquisitionStep !== 'success' && (
                  <div className="pt-2">
                    <button
                      onClick={() => setIsAcquiringGpsParking(false)}
                      className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] underline underline-offset-2 transition-colors"
                    >
                      Annulla rilevamento automatico
                    </button>
                  </div>
                )}
              </motion.div>
            ) : parking ? (
              /* PARCHEGGIO ATTIVO */
              <div className="space-y-5 animate-fade-in">
                {/* 1. SEZIONE PARCHIMETRO DIGITALE LIVE (Se impostato) */}
                {meterLiveStatus ? (
                  <div className={`p-6 rounded-3xl border shadow-sm relative overflow-hidden transition-all ${
                    meterLiveStatus.isExpired 
                      ? 'bg-rose-500/10 border-rose-500/40' 
                      : meterLiveStatus.isUrgent
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-indigo-500/10 border-indigo-500/30'
                  }`}>
                    {/* Badge Stato */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`p-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-sm ${
                          meterLiveStatus.isExpired ? 'bg-rose-500' : meterLiveStatus.isUrgent ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                        }`}>
                          <Timer className="w-4 h-4" />
                          <span>
                            {meterLiveStatus.isExpired ? 'Sosta Scaduta' : meterLiveStatus.isUrgent ? 'In Scadenza a Breve' : 'Sosta Regolare'}
                          </span>
                        </span>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Fine Sosta</p>
                        <p className="text-sm font-black text-[var(--text-main)]">
                          Ore {meterLiveStatus.endFormatted}
                        </p>
                      </div>
                    </div>

                    {/* GRANDE QUADRANTE COUNTDOWN LIVE */}
                    <div className="flex flex-col items-center justify-center my-4 py-2">
                      <div className="relative flex items-center justify-center">
                        {/* Cerchio di sfondo */}
                        <svg className="w-48 h-48 -rotate-90">
                          <circle
                            cx="96"
                            cy="96"
                            r="82"
                            stroke="currentColor"
                            strokeWidth="10"
                            className="text-[var(--border)] opacity-40 fill-transparent"
                          />
                          <circle
                            cx="96"
                            cy="96"
                            r="82"
                            stroke="currentColor"
                            strokeWidth="10"
                            strokeDasharray={2 * Math.PI * 82}
                            strokeDashoffset={(2 * Math.PI * 82) * (1 - meterLiveStatus.percentRemaining / 100)}
                            strokeLinecap="round"
                            className={`fill-transparent transition-all duration-1000 ${
                              meterLiveStatus.isExpired 
                                ? 'text-rose-500' 
                                : meterLiveStatus.isUrgent 
                                ? 'text-amber-500' 
                                : 'text-indigo-500'
                            }`}
                          />
                        </svg>

                        {/* Testo Centrale Countdown */}
                        <div className="absolute flex flex-col items-center justify-center text-center">
                          <Clock className={`w-5 h-5 mb-1 ${
                            meterLiveStatus.isExpired ? 'text-rose-500 animate-bounce' : 'text-indigo-500'
                          }`} />
                          <span className="font-mono text-3xl font-black text-[var(--text-main)] tracking-wider">
                            {meterLiveStatus.formattedTime}
                          </span>
                          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
                            {meterLiveStatus.isExpired ? 'Tempo di ritardo' : 'Tempo residuo'}
                          </span>
                        </div>
                      </div>

                      {/* Costo Stimato se calcolato */}
                      {parking.estimatedCost !== undefined && parking.estimatedCost > 0 && (
                        <div className="mt-3 flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-main)]">
                          <Coins className="w-3.5 h-3.5 text-amber-500" />
                          <span>Costo sosta stimato: <strong>€ {parking.estimatedCost.toFixed(2)}</strong></span>
                          {parking.hourlyRate ? (
                            <span className="text-[var(--text-muted)]">({parking.hourlyRate.toFixed(2)} €/h)</span>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* PULSANTI RAPIDI "PROLUNGA SOSTA" (COME NELLE VERE APP DI PARCHEGGIO) */}
                    <div className="pt-2 border-t border-[var(--border)]/60">
                      <p className="text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider text-center mb-2.5">
                        Prolunga Parchimetro
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {[15, 30, 60, 120].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => handleExtendParkingLive(mins)}
                            className="py-2.5 px-2 bg-[var(--surface)] hover:bg-[var(--border)] active:scale-95 border border-[var(--border)] rounded-2xl text-xs font-black text-indigo-500 flex items-center justify-center gap-1 shadow-sm transition-all"
                          >
                            <span>+{mins < 60 ? `${mins}m` : `${mins / 60}h`}</span>
                          </button>
                        ))}
                      </div>

                      <div className="mt-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setExtendTimeInput(meterLiveStatus.endFormatted);
                            setIsExtendingManualModalOpen(true);
                          }}
                          className="text-xs font-bold text-indigo-500 hover:underline inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Inserisci orario fine personalizzato</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Parchimetro non attivo per questo parcheggio */
                  <div className="p-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--text-main)]">Parchimetro Non Impostato</p>
                        <p className="text-[11px] text-[var(--text-muted)]">Nessuna scadenza o disco orario attivo</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const target = new Date(Date.now() + 60 * 60 * 1000);
                        const hh = String(target.getHours()).padStart(2, '0');
                        const mm = String(target.getMinutes()).padStart(2, '0');
                        setExtendTimeInput(`${hh}:${mm}`);
                        setIsExtendingManualModalOpen(true);
                      }}
                      className="py-2 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 text-xs font-bold transition-all"
                    >
                      + Attiva Parchimetro
                    </button>
                  </div>
                )}

                {/* 2. MAPPA ANTEPRIMA & POSIZIONE AUTO */}
                <div className="w-full h-64 sm:h-72 rounded-3xl overflow-hidden border border-[var(--border)] shadow-md bg-[var(--surface-variant)] relative group">
                  {parking.latitude !== 0 && parking.longitude !== 0 ? (
                    <iframe
                      title="Mappa Parcheggio"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      src={`https://maps.google.com/maps?q=${parking.latitude},${parking.longitude}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                      className="w-full h-full border-0 pointer-events-none sm:pointer-events-auto"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-2">
                      <MapPin className="w-10 h-10 text-indigo-500" />
                      <p className="text-sm font-bold text-[var(--text-main)]">{parking.address}</p>
                      <p className="text-xs text-[var(--text-muted)]">Posizione inserita manualmente</p>
                    </div>
                  )}

                  <div className="absolute top-3 left-3 bg-[var(--bg)]/90 backdrop-blur-md border border-[var(--border)] px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold text-indigo-500 shadow-sm pointer-events-none">
                    <Car className="w-3.5 h-3.5" />
                    <span>Auto Parcheggiata</span>
                    {parking.accuracy && (
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        ±{Math.round(parking.accuracy)}m
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. SCHEDA DETTAGLI INDIRIZZO E DISTANZA */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-5 lg:p-6 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[11px] font-bold">
                          Parcheggiata
                        </span>
                        <span className="text-xs text-[var(--text-muted)] font-medium">
                          {formatElapsedParkingTime(parking.timestamp)}
                        </span>
                      </div>
                      <h3 className="text-lg lg:text-xl font-black text-[var(--text-main)] break-words">
                        {parking.address || 'Posizione registrata'}
                      </h3>
                      {parking.vehicleName && (
                        <p className="text-xs text-indigo-500 font-bold">
                          🚗 Veicolo: {parking.vehicleName}
                        </p>
                      )}
                    </div>

                    {/* Badge distanza live */}
                    {distanceToCar !== null && (
                      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-3 text-center shrink-0">
                        <p className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">A Piedi</p>
                        <p className="text-base lg:text-lg font-black text-indigo-500">
                          {formatDistance(distanceToCar)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Note e dettagli (piano, pilastro) */}
                  <div className="pt-2 border-t border-[var(--border)]">
                    {isEditingNotes ? (
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                          Note Parcheggio (Piano, Pilastro, Posto)
                        </label>
                        <textarea
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          placeholder="Es. Piano -2, Pilastro D14, vicino all'ascensore..."
                          className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl p-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500"
                          rows={2}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setIsEditingNotes(false)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--surface-variant)]"
                          >
                            Annulla
                          </button>
                          <button
                            onClick={handleSaveNotes}
                            className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 transition-colors shadow-sm"
                          >
                            Salva Note
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
                            Dettagli & Note
                          </p>
                          <p className="text-sm text-[var(--text-main)] font-medium">
                            {parking.notes || <span className="text-[var(--text-muted)] italic">Nessuna nota aggiuntiva (es. piano o pilastro)</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setNotesText(parking.notes || '');
                            setIsEditingNotes(true);
                          }}
                          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-indigo-500 hover:bg-[var(--surface-variant)] transition-colors"
                          title="Modifica note"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Pulsanti di Azione */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={handleNavigateToCar}
                      className="py-4 px-6 rounded-2xl bg-indigo-500 hover:bg-indigo-600 active:scale-98 text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-indigo-500/25"
                    >
                      <Navigation className="w-5 h-5" />
                      <span>Naviga all'Auto a Piedi</span>
                    </button>

                    <button
                      onClick={handleClearParking}
                      className="py-4 px-6 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 active:scale-98 font-bold text-sm flex items-center justify-center gap-2.5 transition-all"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Termina Sosta (Ho Ripreso l'Auto)</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* NESSUN PARCHEGGIO SALVATO: SCHERMATA DI SETUP COMPLETA CON PARCHIMETRO REALE */
              <div className="space-y-6">
                <div className="p-5 lg:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-6">
                  {/* Intestazione Sezione */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
                      <Car className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-[var(--text-main)]">Nuova Sosta Auto</h3>
                      <p className="text-xs text-[var(--text-muted)] font-medium">
                        Memorizza dove hai parcheggiato e imposta il parchimetro
                      </p>
                    </div>
                  </div>

                  {/* 1. SELETTORE MODALITÀ POSIZIONE: GPS VS MANUALE */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                      1. Posizione del Parcheggio
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--surface-variant)] rounded-2xl border border-[var(--border)]">
                      <button
                        type="button"
                        onClick={() => setLocationMode('gps')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          locationMode === 'gps'
                            ? 'bg-[var(--surface)] text-indigo-500 shadow-sm'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        <MapPin className="w-4 h-4" />
                        <span>GPS Attuale</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocationMode('manual')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          locationMode === 'manual'
                            ? 'bg-[var(--surface)] text-indigo-500 shadow-sm'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Inserisci Manuale</span>
                      </button>
                    </div>

                    {locationMode === 'manual' ? (
                      <div className="space-y-2 pt-1 animate-fade-in">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={manualAddressInput}
                            onChange={(e) => setManualAddressInput(e.target.value)}
                            placeholder="Es. Via Roma 42, o Garage Centrale"
                            className="flex-1 bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl px-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => setIsAddressPickerOpen(true)}
                            className="px-4 py-3 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 font-bold text-xs shrink-0 flex items-center gap-1.5 border border-indigo-500/20 transition-all active:scale-95"
                            title="Seleziona dalla rubrica indirizzi"
                          >
                            <Bookmark className="w-4 h-4" />
                            <span className="hidden sm:inline">Dalla Rubrica</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] bg-[var(--surface-variant)] p-3 rounded-2xl border border-[var(--border)]">
                        📡 Verranno rilevate automaticamente le coordinate GPS precise e l'indirizzo via OpenStreetMap.
                      </p>
                    )}
                  </div>

                  {/* 2. IL PARCHIMETRO REALE (STILE EASYPARK CON INSERIMENTO MANUALE) */}
                  <div className="space-y-4 pt-2 border-t border-[var(--border)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Timer className="w-5 h-5 text-indigo-500" />
                        <div>
                          <label className="text-xs font-black text-[var(--text-main)] uppercase tracking-wider block">
                            Parchimetro / Disco Orario
                          </label>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            Regola la durata o imposta l'orario di fine esatto
                          </p>
                        </div>
                      </div>

                      {/* Switch Attiva/Disattiva */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isMeterEnabled}
                        aria-label="Parchimetro o disco orario"
                        onClick={() => setIsMeterEnabled(!isMeterEnabled)}
                        className={`w-12 h-6 rounded-full transition-colors relative p-0.5 border cursor-pointer ${
                          isMeterEnabled ? 'bg-indigo-500 border-indigo-600' : 'bg-[var(--border)] border-[var(--border)]'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          isMeterEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {isMeterEnabled && (
                      <div className="p-4 sm:p-5 rounded-3xl bg-[var(--surface-variant)] border border-[var(--border)] space-y-5 animate-fade-in">
                        {/* QUADRANTE PARCHIMETRO DIGITALE */}
                        <div className="flex flex-col items-center justify-center text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            Fine Sosta Prevista
                          </p>

                          <div className="my-2 flex items-center justify-center gap-3">
                            <span className="font-mono text-4xl sm:text-5xl font-black text-indigo-500">
                              {manualEndTimeInput}
                            </span>
                          </div>

                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs font-bold text-[var(--text-main)]">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Durata sosta: <strong>{formatMinutesHuman(meterDurationMinutes)}</strong></span>
                          </div>
                        </div>

                        {/* MANOPOLA E STEPPERS PARCHIMETRO (-30m, -15m, +15m, +30m, +1h) */}
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block text-center">
                            Regolazione Rapida Minuti
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            <button
                              type="button"
                              onClick={() => adjustMeterMinutes(-30)}
                              className="py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] border border-[var(--border)] font-black text-xs text-[var(--text-main)] active:scale-95"
                            >
                              -30m
                            </button>
                            <button
                              type="button"
                              onClick={() => adjustMeterMinutes(-15)}
                              className="py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] border border-[var(--border)] font-black text-xs text-[var(--text-main)] active:scale-95"
                            >
                              -15m
                            </button>
                            <button
                              type="button"
                              onClick={() => adjustMeterMinutes(15)}
                              className="py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 border border-indigo-500/20 font-black text-xs active:scale-95"
                            >
                              +15m
                            </button>
                            <button
                              type="button"
                              onClick={() => adjustMeterMinutes(30)}
                              className="py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 border border-indigo-500/20 font-black text-xs active:scale-95"
                            >
                              +30m
                            </button>
                          </div>
                        </div>

                        {/* INSERIMENTO MANUALE ESATTO DELL'ORARIO DI FINE (IL VERO PARCHIMETRO) */}
                        <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-[var(--text-main)]">Inserimento Orario Esatto</p>
                            <p className="text-[11px] text-[var(--text-muted)]">Paga o sosta fino alle ore:</p>
                          </div>
                          <input
                            type="time"
                            value={manualEndTimeInput}
                            onChange={handleManualTimeChange}
                            className="bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl px-3 py-2 font-mono font-bold text-sm text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        {/* PRESETS DI DURATA */}
                        <div className="flex flex-wrap gap-1.5">
                          {[30, 60, 90, 120, 180, 240].map(mins => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => setMeterDurationMinutes(mins)}
                              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                                meterDurationMinutes === mins
                                  ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                                  : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] border-[var(--border)]'
                              }`}
                            >
                              {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                            </button>
                          ))}
                        </div>

                        {/* TARIFFA ORARIA E CALCOLO COSTO (OPZIONALE) */}
                        <div className="space-y-2 pt-2 border-t border-[var(--border)]/60">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                            Tariffa Oraria (Strisce Blu / Parcheggio a Pagamento)
                          </label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[
                              { label: 'Gratis', rate: 0 },
                              { label: '1,00 €', rate: 1.0 },
                              { label: '1,50 €', rate: 1.5 },
                              { label: '2,00 €', rate: 2.0 },
                            ].map(t => (
                              <button
                                key={t.label}
                                type="button"
                                onClick={() => {
                                  setHourlyRate(t.rate);
                                  setCustomRateInput(String(t.rate));
                                }}
                                className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                                  hourlyRate === t.rate
                                    ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                                    : 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]'
                                }`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>

                          {/* Riepilogo Costo e Notifica Promemoria */}
                          <div className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2">
                              <Bell className="w-4 h-4 text-indigo-500 shrink-0" />
                              <span className="text-[var(--text-muted)]">
                                Notifica allarme a <strong>-10 min</strong>
                              </span>
                            </div>

                            {hourlyRate > 0 && (
                              <div className="font-bold text-[var(--text-main)]">
                                Totale: <span className="text-indigo-500 text-sm font-black">€ {estimatedMeterCost.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. NOTE E DETTAGLI VEICOLO (PIANO, POSTO, TARGA) */}
                  <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                      3. Dettagli Opzionali
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        placeholder="Note posto (es. Piano -1, Pilastro B)"
                        className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl p-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        type="text"
                        value={vehicleNameInput}
                        onChange={(e) => setVehicleNameInput(e.target.value)}
                        placeholder="Nome veicolo o Targa (opzionale)"
                        className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl p-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* PULSANTE CONFERMA E ATTIVAZIONE PARCHEGGIO */}
                  <button
                    onClick={handleConfirmAndSaveParking}
                    disabled={isLoadingGps}
                    className="w-full py-4 px-6 rounded-2xl bg-indigo-500 hover:bg-indigo-600 active:scale-98 text-white font-bold text-base flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-500/30 disabled:opacity-50"
                  >
                    {isLoadingGps ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Rilevamento coordinate in corso...</span>
                      </>
                    ) : (
                      <>
                        <Car className="w-5 h-5" />
                        <span>Conferma e Attiva Parcheggio</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL: AGGIUNGI / MODIFICA INDIRIZZO                         */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isAddingAddr && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-[var(--text-main)]">
                  {editingAddr ? 'Modifica Indirizzo' : 'Nuovo Indirizzo'}
                </h3>
                <button
                  onClick={() => setIsAddingAddr(false)}
                  className="p-2 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddOrEditAddress} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1.5">
                    Nome / Titolo
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Es. Casa, Ufficio, Dentista..."
                    required
                    className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl px-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Indirizzo o Coordinate
                    </label>
                    <button
                      type="button"
                      onClick={handleGetGpsForNewAddress}
                      disabled={isGettingAddrGps}
                      className="text-xs font-bold text-indigo-500 hover:underline flex items-center gap-1"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{isGettingAddrGps ? 'Rilevamento...' : 'Usa Posizione GPS'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newQuery}
                    onChange={(e) => setNewQuery(e.target.value)}
                    placeholder="Es. Via Garibaldi 12, Milano"
                    required
                    className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl px-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingAddr(false)}
                    className="px-5 py-3 rounded-2xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--surface-variant)]"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-2xl bg-indigo-500 text-white font-bold text-xs hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-500/20"
                  >
                    {editingAddr ? 'Aggiorna' : 'Salva Indirizzo'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL: SELETTORE INDIRIZZO DALLA RUBRICA PER PARCHEGGIO     */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isAddressPickerOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-[var(--text-main)]">Scegli da Rubrica</h3>
                  <p className="text-xs text-[var(--text-muted)]">Seleziona un indirizzo salvato come posto auto</p>
                </div>
                <button
                  onClick={() => setIsAddressPickerOpen(false)}
                  className="p-2 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                {addresses.length > 0 ? (
                  addresses.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setSelectedAddressFromBook(a);
                        setManualAddressInput(`${a.title}: ${a.query}`);
                        setIsAddressPickerOpen(false);
                      }}
                      className="w-full p-3.5 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] border border-[var(--border)] text-left flex items-start gap-3 transition-colors"
                    >
                      <MapPin className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text-main)] truncate">{a.title}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{a.query}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-[var(--text-muted)] text-center py-6">
                    Nessun indirizzo in rubrica. Aggiungine uno nella scheda "Rubrica Indirizzi".
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL: MODIFICA MANUALE ORARIO FINE SOSTA SUL PARCHEGGIO LIVE */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isExtendingManualModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-base font-black text-[var(--text-main)]">Modifica Fine Sosta</h3>
                </div>
                <button
                  onClick={() => setIsExtendingManualModalOpen(false)}
                  className="p-2 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  Imposta nuova ora di fine:
                </label>
                <input
                  type="time"
                  value={extendTimeInput}
                  onChange={(e) => setExtendTimeInput(e.target.value)}
                  className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl p-4 font-mono font-bold text-2xl text-center text-[var(--text-main)] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExtendingManualModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--surface-variant)]"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleApplyManualEndTimeLive}
                  className="px-5 py-2.5 rounded-xl bg-indigo-500 text-white font-bold text-xs hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-500/20"
                >
                  Salva Orario
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* MODAL: CONDIVISIONE QR CODE INDIRIZZO                       */}
      {/* ============================================================ */}
      <AnimatePresence>
        {sharingAddr && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-[var(--text-main)]">Condividi Indirizzo</h3>
                <button
                  onClick={() => setSharingAddr(null)}
                  className="p-2 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                Fai scansionare questo QR Code per importare l'indirizzo direttamente in Chelona.
              </p>

              <div className="bg-white p-4 rounded-2xl inline-block mx-auto shadow-sm border border-[var(--border)]">
                <QRCodeSVG
                  value={JSON.stringify({
                    t: 'shared_address',
                    d: { title: sharingAddr.title, query: sharingAddr.query }
                  })}
                  size={200}
                />
              </div>

              <div className="space-y-1">
                <p className="text-sm font-bold text-[var(--text-main)]">{sharingAddr.title}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{sharingAddr.query}</p>
              </div>

              <button
                type="button"
                onClick={() => setSharingAddr(null)}
                className="w-full py-3 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] font-bold text-xs text-[var(--text-main)]"
              >
                Chiudi
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* SCANNER QR CODE                                              */}
      {/* ============================================================ */}
      {isScanningQr && (
        <QrScanner
          onScan={handleScanAddressQr}
          onClose={() => setIsScanningQr(false)}
        />
      )}

      {/* ============================================================ */}
      {/* DIALOG CONFERMA ELIMINAZIONE INDIRIZZO                       */}
      {/* ============================================================ */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        title="Elimina Indirizzo"
        message="Vuoi davvero eliminare questo indirizzo dalla tua rubrica?"
        onConfirm={confirmDeleteAddress}
        onCancel={() => setDeleteConfirmId(null)}
        confirmText="Elimina"
        cancelText="Annulla"
      />
    </div>
  );
};
