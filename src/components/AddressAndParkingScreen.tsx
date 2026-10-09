import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, MapPin, Plus, Navigation, Trash2, Edit2, X, Share2, 
  Car, Clock, RefreshCw, Check, ExternalLink, Timer, 
  Edit3, Bell, Coins, Search, QrCode, Bookmark,
  AlertTriangle, CheckCircle2, LocateFixed, Satellite, Crosshair,
  Camera, Home, Briefcase, Star, Copy, Image as ImageIcon
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
  notes?: string;
  category?: 'home' | 'work' | 'favorite' | 'other';
}

export interface AddressAndParkingScreenProps {
  onClose: () => void;
  initialTab?: 'addresses' | 'parking';
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  initialAutoSave?: boolean;
}

export const AddressAndParkingScreen: React.FC<AddressAndParkingScreenProps> = ({ 
  onClose, 
  initialTab = 'parking',
  showToast,
  initialAutoSave = false
}) => {
  const [activeTab, setActiveTab] = useState<'addresses' | 'parking'>(initialTab);

  // ----------------------------------------------------
  // STATO RUBRICA INDIRIZZI
  // ----------------------------------------------------
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [searchAddrQuery, setSearchAddrQuery] = useState('');
  const [addrCategoryFilter, setAddrCategoryFilter] = useState<'all' | 'home' | 'work' | 'favorite' | 'other'>('all');
  const [isAddingAddr, setIsAddingAddr] = useState(false);
  const [editingAddr, setEditingAddr] = useState<Address | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newQuery, setNewQuery] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newCategory, setNewCategory] = useState<'home' | 'work' | 'favorite' | 'other'>('other');
  const [isGettingAddrGps, setIsGettingAddrGps] = useState(false);
  const [isScanningQr, setIsScanningQr] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [sharingAddr, setSharingAddr] = useState<Address | null>(null);
  const [navModalTarget, setNavModalTarget] = useState<{ query: string; lat?: number; lon?: number; title: string } | null>(null);

  // ----------------------------------------------------
  // STATO PARCHEGGIO & PARCHIMETRO
  // ----------------------------------------------------
  const [parking, setParking] = useState<SavedParking | null>(() => getSavedParking());
  const [isLoadingGps, setIsLoadingGps] = useState(false);
  const [distanceToCar, setDistanceToCar] = useState<number | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [now, setNow] = useState<number>(Date.now());
  const [viewFullPhoto, setViewFullPhoto] = useState(false);

  // Setup Nuovo Parcheggio
  const [locationMode, setLocationMode] = useState<'gps' | 'manual'>('gps');
  const [manualAddressInput, setManualAddressInput] = useState('');
  const [vehicleNameInput, setVehicleNameInput] = useState('');
  const [isMeterEnabled, setIsMeterEnabled] = useState(false);
  const [meterDurationMinutes, setMeterDurationMinutes] = useState<number>(60);
  const [hourlyRate, setHourlyRate] = useState<number>(1.50);
  const [manualEndTimeInput, setManualEndTimeInput] = useState<string>('');
  const [parkingPhotoUrl, setParkingPhotoUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal helpers
  const [isAddressPickerOpen, setIsAddressPickerOpen] = useState(false);
  const [isExtendingManualModalOpen, setIsExtendingManualModalOpen] = useState(false);
  const [extendTimeInput, setExtendTimeInput] = useState('');
  const [showClearParkingConfirm, setShowClearParkingConfirm] = useState(false);

  // ----------------------------------------------------
  // RILEVAMENTO GPS AUTOMATICO CON ANIMAZIONE RADAR
  // ----------------------------------------------------
  const [isAcquiringGpsParking, setIsAcquiringGpsParking] = useState(false);
  const [gpsAcquisitionStep, setGpsAcquisitionStep] = useState<'locating' | 'geocoding' | 'saving' | 'success' | 'error'>('locating');
  const [acquiredAddress, setAcquiredAddress] = useState<string>('');
  const [acquiredCoords, setAcquiredCoords] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);

  // Costo stimato parchimetro in setup
  const estimatedMeterCost = useMemo(() => {
    if (!isMeterEnabled || hourlyRate <= 0) return 0;
    return Math.round((meterDurationMinutes / 60) * hourlyRate * 100) / 100;
  }, [isMeterEnabled, meterDurationMinutes, hourlyRate]);

  const triggerGpsAutoSave = async () => {
    setIsAcquiringGpsParking(true);
    setGpsAcquisitionStep('locating');
    setGpsErrorMsg(null);
    setAcquiredAddress('');
    setAcquiredCoords(null);

    try {
      setGpsAcquisitionStep('locating');
      const pos = await getCurrentGpsPosition();
      setAcquiredCoords(pos);

      setGpsAcquisitionStep('geocoding');
      const geo = await reverseGeocodeCoordinates(pos.latitude, pos.longitude);

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

      // Allega foto se scattata in fase di setup
      if (parkingPhotoUrl) {
        saved.photoUrl = parkingPhotoUrl;
        saveParking(saved);
      }

      setAcquiredAddress(saved.address || 'Posizione GPS');
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
      }, 1000);

    } catch (err: any) {
      console.error('Error auto-saving parking GPS', err);
      setGpsAcquisitionStep('error');
      setGpsErrorMsg(err?.message || 'Impossibile rilevare la posizione GPS. Verifica i permessi di localizzazione.');
    }
  };

  useEffect(() => {
    if (initialAutoSave) {
      setActiveTab('parking');
      triggerGpsAutoSave();
    }
  }, [initialAutoSave]);

  // Aggiornamento tempo ogni secondo per il countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Ascolta aggiornamenti del parcheggio esterni o da Chelona AI
  useEffect(() => {
    const handleUpdate = (e: any) => {
      setParking(e.detail || getSavedParking());
    };
    window.addEventListener(PARKING_EVENT, handleUpdate);
    return () => window.removeEventListener(PARKING_EVENT, handleUpdate);
  }, []);

  // Caricamento rubrica
  useEffect(() => {
    const loaded = storage.loadAddressBook();
    setAddresses(loaded);
    if ((window as any).ChelonaNative && (window as any).ChelonaNative.saveAddresses) {
      (window as any).ChelonaNative.saveAddresses(JSON.stringify(loaded));
    }
  }, []);

  // Intent esterno per aggiungere indirizzo
  useEffect(() => {
    const handleOpenAdd = (e: any) => {
      if (e.detail) {
        setNewTitle(e.detail.title || '');
        setNewQuery(e.detail.query || '');
        setNewNotes(e.detail.notes || '');
        setNewCategory(e.detail.category || 'other');
        setEditingAddr(null);
        setIsAddingAddr(true);
        setActiveTab('addresses');
      }
    };
    window.addEventListener('open-address-book-add', handleOpenAdd);
    return () => window.removeEventListener('open-address-book-add', handleOpenAdd);
  }, []);

  // Calcola distanza dall'auto live
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

  // Aggiorna orario HH:mm fine sosta setup
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
      const updated = addresses.map(a => 
        a.id === editingAddr.id 
          ? { 
              ...a, 
              title: newTitle.trim(), 
              query: newQuery.trim(),
              notes: newNotes.trim() || undefined,
              category: newCategory
            } 
          : a
      );
      saveAddresses(updated);
      setEditingAddr(null);
      if (showToast) showToast('Luogo aggiornato!', 'success');
    } else {
      const updated: Address[] = [
        { 
          id: generateUUID(), 
          title: newTitle.trim(), 
          query: newQuery.trim(),
          notes: newNotes.trim() || undefined,
          category: newCategory
        },
        ...addresses
      ];
      saveAddresses(updated);
      if (showToast) showToast('Nuovo luogo salvato!', 'success');
    }
    
    setIsAddingAddr(false);
    setNewTitle('');
    setNewQuery('');
    setNewNotes('');
    setNewCategory('other');
  };

  const handleGetGpsForNewAddress = async () => {
    setIsGettingAddrGps(true);
    try {
      const pos = await getCurrentGpsPosition();
      const geo = await reverseGeocodeCoordinates(pos.latitude, pos.longitude);
      setNewQuery(geo.address || `${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}`);
      if (!newTitle) {
        setNewTitle(geo.city ? `Luogo a ${geo.city}` : 'Mia Posizione');
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
      const parsed = JSON.parse(data);
      if (parsed.t === 'shared_address' || parsed.type === 'shared_address') {
        const addressData = parsed.d || parsed.data;
        if (addressData && addressData.title && addressData.query) {
          const updated: Address[] = [
            { 
              id: generateUUID(), 
              title: addressData.title.trim(), 
              query: addressData.query.trim(),
              notes: addressData.notes || undefined,
              category: addressData.category || 'other'
            },
            ...addresses
          ];
          saveAddresses(updated);
          if (showToast) showToast(`Luogo "${addressData.title}" importato!`, 'success');
        } else {
          if (showToast) showToast('Dati non validi nel QR code', 'error');
        }
      } else {
        if (showToast) showToast('QR code non riconosciuto come indirizzo Chelona', 'error');
      }
    } catch {
      if (showToast) showToast('Errore lettura QR code', 'error');
    }
  };

  const handleDeleteAddress = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteAddress = () => {
    if (deleteConfirmId) {
      saveAddresses(addresses.filter(a => a.id !== deleteConfirmId));
      setDeleteConfirmId(null);
      if (showToast) showToast('Luogo rimosso', 'info');
    }
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    if (showToast) showToast(`${label} copiato negli appunti!`, 'success');
  };

  const handleParkAtAddress = (addr: Address) => {
    setManualAddressInput(addr.query ? `${addr.title}: ${addr.query}` : addr.title);
    setLocationMode('manual');
    setActiveTab('parking');
    if (showToast) showToast(`Impostato come parcheggio: ${addr.title}`, 'info');
  };

  // Indirizzi filtrati per ricerca e categoria
  const filteredAddresses = useMemo(() => {
    let list = addresses;
    if (addrCategoryFilter !== 'all') {
      list = list.filter(a => (a.category || 'other') === addrCategoryFilter);
    }
    if (!searchAddrQuery.trim()) return list;
    const q = searchAddrQuery.toLowerCase();
    return list.filter(a => 
      a.title.toLowerCase().includes(q) || 
      a.query.toLowerCase().includes(q) ||
      (a.notes && a.notes.toLowerCase().includes(q))
    );
  }, [addresses, searchAddrQuery, addrCategoryFilter]);

  // ----------------------------------------------------
  // GESTIONE FOTO POSTO AUTO
  // ----------------------------------------------------
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 900;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          if (parking) {
            const updated = { ...parking, photoUrl: dataUrl };
            saveParking(updated);
            setParking(updated);
            if (showToast) showToast('Foto posto auto salvata! 📸', 'success');
          } else {
            setParkingPhotoUrl(dataUrl);
            if (showToast) showToast('Foto allegata alla nuova sosta! 📸', 'success');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    if (parking) {
      const updated = { ...parking, photoUrl: undefined };
      saveParking(updated);
      setParking(updated);
      if (showToast) showToast('Foto rimossa', 'info');
    } else {
      setParkingPhotoUrl(null);
    }
  };

  // ----------------------------------------------------
  // GESTIONE PARCHEGGIO & PARCHIMETRO
  // ----------------------------------------------------
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
    if (targetDate.getTime() <= Date.now()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    const diffMinutes = Math.max(5, Math.round((targetDate.getTime() - Date.now()) / (60 * 1000)));
    setMeterDurationMinutes(diffMinutes);
  };

  const adjustMeterMinutes = (delta: number) => {
    setMeterDurationMinutes(prev => Math.max(5, prev + delta));
  };

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

      if (parkingPhotoUrl) {
        saved.photoUrl = parkingPhotoUrl;
        saveParking(saved);
      }

      setParking(saved);
      setIsEditingNotes(false);
      setIsMeterEnabled(false);
      setParkingPhotoUrl(null);

      if (showToast) {
        showToast('📍 Posizione auto memorizzata!', 'success');
      }
    } catch (e: any) {
      if (showToast) showToast(e.message || 'Errore salvataggio parcheggio', 'error');
    } finally {
      setIsLoadingGps(false);
    }
  };

  const handleExtendParkingLive = (additionalMinutes: number) => {
    const updated = extendParkingMeter(additionalMinutes);
    if (updated) {
      setParking(updated);
      if (showToast) {
        showToast(`⏱️ Parchimetro prolungato di +${additionalMinutes} min!`, 'success');
      }
    }
  };

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
        showToast(`⏱️ Fine sosta aggiornata alle ${extendTimeInput}!`, 'success');
      }
    }
  };

  const handleSaveNotes = () => {
    if (!parking) return;
    const updated: SavedParking = { ...parking, notes: notesText };
    saveParking(updated);
    setParking(updated);
    setIsEditingNotes(false);
    if (showToast) showToast('Note aggiornate!', 'success');
  };

  const confirmClearParking = () => {
    clearSavedParking();
    setParking(null);
    setDistanceToCar(null);
    setNotesText('');
    setManualAddressInput('');
    setIsMeterEnabled(false);
    setParkingPhotoUrl(null);
    setShowClearParkingConfirm(false);
    if (showToast) showToast("Sosta terminata. Auto ripresa! 🚗✨", 'info');
  };

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

  const openNavigation = (app: 'google' | 'apple' | 'waze', target: { query?: string; lat?: number; lon?: number }) => {
    const lat = target.lat;
    const lon = target.lon;
    const q = target.query || '';

    let url = '';
    if (app === 'google') {
      if (lat && lon && lat !== 0 && lon !== 0) {
        url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;
      } else {
        url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}&travelmode=walking`;
      }
    } else if (app === 'apple') {
      if (lat && lon && lat !== 0 && lon !== 0) {
        url = `maps://maps.apple.com/?daddr=${lat},${lon}&dirflg=w`;
      } else {
        url = `maps://maps.apple.com/?daddr=${encodeURIComponent(q)}&dirflg=w`;
      }
    } else if (app === 'waze') {
      if (lat && lon && lat !== 0 && lon !== 0) {
        url = `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
      } else {
        url = `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes`;
      }
    }

    if (url) {
      window.open(url, '_blank');
      setNavModalTarget(null);
    }
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

    let percentRemaining = 0;
    if (parking.meterStartedAt && parking.expiresAt > parking.meterStartedAt) {
      const totalSpan = parking.expiresAt - parking.meterStartedAt;
      const left = Math.max(0, parking.expiresAt - now);
      percentRemaining = Math.min(100, Math.max(0, Math.round((left / totalSpan) * 100)));
    } else {
      percentRemaining = isExpired ? 0 : 50;
    }

    const isUrgent = !isExpired && diffMs < 15 * 60 * 1000;

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

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'home':
        return { label: 'Casa', icon: Home, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
      case 'work':
        return { label: 'Lavoro', icon: Briefcase, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
      case 'favorite':
        return { label: 'Preferito', icon: Star, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
      default:
        return { label: 'Luogo', icon: MapPin, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' };
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="fixed inset-0 z-[150] flex flex-col h-[100dvh] w-full bg-[var(--bg)] overflow-hidden"
    >
      {/* Hidden file input for camera/photo */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handlePhotoUpload} 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
      />

      {/* ═══════ HEADER (Identico a Lista della Spesa, Ricettario, Volantini) ═══════ */}
      <header className="flex items-center justify-between pt-[max(env(safe-area-inset-top),16px)] px-4 pb-3 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2.5 -ml-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0 cursor-pointer"
            title="Torna indietro"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              {activeTab === 'parking' ? (
                <Car className="w-5 h-5" />
              ) : (
                <MapPin className="w-5 h-5" />
              )}
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-[var(--text-main)] truncate">Mobilità & Posizioni</h1>
          </div>
        </div>

        {/* Pulsanti Azione Header */}
        <div className="flex items-center gap-2 shrink-0">
          {activeTab === 'parking' ? (
            parking ? (
              <>
                <button
                  type="button"
                  onClick={handleShareParking}
                  className="p-2.5 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-blue-500 transition-colors border border-[var(--border)] cursor-pointer"
                  title="Condividi posizione auto"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearParkingConfirm(true)}
                  className="p-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-colors cursor-pointer"
                  title="Termina sosta / Ho ripreso l'auto"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={triggerGpsAutoSave}
                disabled={isAcquiringGpsParking}
                className="px-3.5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <LocateFixed className="w-4 h-4" />
                <span>Salva Qui</span>
              </button>
            )
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsScanningQr(true)}
                className="p-2.5 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border border-[var(--border)] cursor-pointer"
                title="Scansiona QR Code luogo"
              >
                <QrCode className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingAddr(null);
                  setNewTitle('');
                  setNewQuery('');
                  setNewNotes('');
                  setNewCategory('other');
                  setIsAddingAddr(true);
                }}
                className="px-3.5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                title="Nuovo Luogo"
              >
                <Plus className="w-4 h-4" />
                <span>Nuovo</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ═══════ CLEAN SEGMENTED TAB CONTROL ═══════ */}
      <div className="px-4 py-2 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0 z-20">
        <div className="flex bg-[var(--surface-variant)] p-1 rounded-2xl max-w-lg mx-auto w-full">
          <button
            type="button"
            onClick={() => setActiveTab('parking')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'parking'
                ? 'bg-[var(--card-bg)] text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>🚗 Auto & Parcheggio</span>
            {parking && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {meterLiveStatus ? meterLiveStatus.endFormatted : 'Attivo'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('addresses')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'addresses'
                ? 'bg-[var(--card-bg)] text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>📍 I Miei Luoghi</span>
            {addresses.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--surface-variant)] text-[var(--text-muted)] border border-[var(--border)] font-bold">
                {addresses.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ═══════ CONTENUTO SCORREVOLE ═══════ */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 max-w-3xl mx-auto w-full pb-[max(env(safe-area-inset-bottom),24px)]">
        {activeTab === 'parking' ? (
          /* ============================================================ */
          /* SCHERMATA: PARCHEGGIO & AUTO                                */
          /* ============================================================ */
          <div className="space-y-4">
            {/* STATO 1: RILEVAMENTO GPS IN CORSO CON RADAR PULITO */}
            {isAcquiringGpsParking ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="p-6 sm:p-8 rounded-3xl bg-[var(--card-bg)] border border-blue-500/20 shadow-xl text-center space-y-5 my-2"
              >
                {/* Visual reticle */}
                <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                  <div className="absolute w-36 h-36 rounded-full border border-blue-500/20 animate-ping opacity-25" />
                  <div className="absolute w-28 h-28 rounded-full border border-blue-500/30" />
                  <div className="absolute w-20 h-20 rounded-full border border-dashed border-blue-500/40" />

                  <div className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${
                    gpsAcquisitionStep === 'success'
                      ? 'bg-emerald-500 text-white'
                      : gpsAcquisitionStep === 'error'
                      ? 'bg-rose-500 text-white'
                      : 'bg-blue-600 text-white'
                  }`}>
                    {gpsAcquisitionStep === 'success' ? (
                      <Check className="w-8 h-8" />
                    ) : gpsAcquisitionStep === 'error' ? (
                      <AlertTriangle className="w-8 h-8" />
                    ) : (
                      <LocateFixed className="w-8 h-8 animate-pulse" />
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-[var(--text-main)]">
                    {gpsAcquisitionStep === 'success' && 'Posizione Salvata! 🎉'}
                    {gpsAcquisitionStep === 'error' && 'Errore Rilevamento GPS'}
                    {gpsAcquisitionStep === 'locating' && 'Sincronizzazione Satelliti GPS...'}
                    {gpsAcquisitionStep === 'geocoding' && 'Riconoscimento Indirizzo Civico...'}
                    {gpsAcquisitionStep === 'saving' && 'Memorizzazione Parcheggio...'}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                    {gpsAcquisitionStep === 'success' && (acquiredAddress || 'Coordinate registrate con successo')}
                    {gpsAcquisitionStep === 'error' && (gpsErrorMsg || 'Assicurati che i permessi di geolocalizzazione siano concessi.')}
                    {gpsAcquisitionStep === 'locating' && 'Calcolo coordinate ad alta precisione senza latenza'}
                    {gpsAcquisitionStep === 'geocoding' && 'Rilevamento via e numero civico'}
                    {gpsAcquisitionStep === 'saving' && 'Salvataggio on-device protetto'}
                  </p>

                  {acquiredCoords && (
                    <p className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold pt-1">
                      {acquiredCoords.latitude.toFixed(5)}°, {acquiredCoords.longitude.toFixed(5)}°
                      {acquiredCoords.accuracy && ` (±${Math.round(acquiredCoords.accuracy)}m)`}
                    </p>
                  )}
                </div>

                {gpsAcquisitionStep === 'error' ? (
                  <div className="flex gap-2 justify-center pt-2">
                    <button
                      type="button"
                      onClick={triggerGpsAutoSave}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Riprova GPS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAcquiringGpsParking(false);
                        setLocationMode('manual');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[var(--surface-variant)] text-[var(--text-main)] font-bold text-xs border border-[var(--border)]"
                    >
                      Inserisci Manuale
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAcquiringGpsParking(false)}
                    className="text-xs text-[var(--text-muted)] hover:underline pt-1"
                  >
                    Annulla
                  </button>
                )}
              </motion.div>
            ) : parking ? (
              /* STATO 2: PARCHEGGIO ATTIVO */
              <div className="space-y-4 animate-fade-in">
                {/* 1. HERO CARD PARCHEGGIO */}
                <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] shadow-sm space-y-4">
                  {/* Badge riga superiore */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                        <Car className="w-3.5 h-3.5" />
                        <span>Auto Parcheggiata</span>
                      </span>
                      <span className="text-xs text-[var(--text-muted)] font-medium">
                        {formatElapsedParkingTime(parking.timestamp)}
                      </span>
                    </div>

                    {distanceToCar !== null && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-bold">
                        <span>🚶 {formatDistance(distanceToCar)}</span>
                      </span>
                    )}
                  </div>

                  {/* Indirizzo grande */}
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-[var(--text-main)] leading-snug">
                      {parking.address || 'Posizione registrata'}
                    </h2>
                    {parking.vehicleName && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                        🚗 Veicolo: {parking.vehicleName}
                      </p>
                    )}
                  </div>

                  {/* Note posto / piano */}
                  <div className="pt-2 border-t border-[var(--border)]/70">
                    {isEditingNotes ? (
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase text-[var(--text-muted)]">
                          Note posto auto (Piano, Settore, Pilastro)
                        </label>
                        <input
                          type="text"
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          placeholder="Es. Piano -2, Pilastro D14..."
                          className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingNotes(false)}
                            className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-variant)] rounded-lg"
                          >
                            Annulla
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveNotes}
                            className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg shadow-sm"
                          >
                            Salva
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Piano & Note</p>
                          <p className="text-xs text-[var(--text-main)] font-medium truncate">
                            {parking.notes || <span className="text-[var(--text-muted)] italic">Nessuna nota aggiuntiva</span>}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNotesText(parking.notes || '');
                            setIsEditingNotes(true);
                          }}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-blue-500 hover:bg-[var(--surface-variant)] transition-colors"
                          title="Modifica note"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Foto posto auto */}
                  {parking.photoUrl ? (
                    <div className="pt-2 border-t border-[var(--border)]/70">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase text-[var(--text-muted)]">Foto Posto Auto</span>
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="text-[11px] text-rose-500 font-bold hover:underline"
                        >
                          Rimuovi Foto
                        </button>
                      </div>
                      <div 
                        onClick={() => setViewFullPhoto(true)}
                        className="relative w-full h-36 rounded-2xl overflow-hidden border border-[var(--border)] cursor-pointer group"
                      >
                        <img 
                          src={parking.photoUrl} 
                          alt="Foto posto auto" 
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200" 
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold">
                          Tocca per ingrandire
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-[var(--border)]/70 flex justify-between items-center">
                      <span className="text-xs text-[var(--text-muted)]">Hai una foto del posto?</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-xs font-bold text-blue-600 dark:text-blue-400 border border-[var(--border)] transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Aggiungi Foto</span>
                      </button>
                    </div>
                  )}

                  {/* Pulsante Naviga all'auto */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[var(--border)]/70">
                    <button
                      type="button"
                      onClick={() => setNavModalTarget({ 
                        query: parking.address || '', 
                        lat: parking.latitude, 
                        lon: parking.longitude,
                        title: 'La tua Auto' 
                      })}
                      className="py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Guidami all'Auto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowClearParkingConfirm(true)}
                      className="py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-98 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Ho Ripreso l'Auto</span>
                    </button>
                  </div>
                </div>

                {/* 2. PARCHIMETRO & DISCO ORARIO LIVE */}
                {meterLiveStatus ? (
                  <div className={`p-5 rounded-3xl border shadow-xs space-y-4 ${
                    meterLiveStatus.isExpired 
                      ? 'bg-rose-500/10 border-rose-500/40' 
                      : meterLiveStatus.isUrgent 
                      ? 'bg-amber-500/10 border-amber-500/40' 
                      : 'bg-blue-500/5 border-blue-500/20'
                  }`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Timer className={`w-5 h-5 ${
                          meterLiveStatus.isExpired ? 'text-rose-500' : meterLiveStatus.isUrgent ? 'text-amber-500' : 'text-blue-600'
                        }`} />
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                            {meterLiveStatus.isExpired ? '🚨 Sosta Scaduta' : meterLiveStatus.isUrgent ? '⚠️ In Scadenza' : '⏱️ Parchimetro Attivo'}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            Scadenza prevista: ore <strong>{meterLiveStatus.endFormatted}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-xl sm:text-2xl font-black text-[var(--text-main)]">
                          {meterLiveStatus.formattedTime}
                        </span>
                      </div>
                    </div>

                    {/* Barra di progresso sosta */}
                    <div className="w-full bg-[var(--border)] h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          meterLiveStatus.isExpired 
                            ? 'bg-rose-500 w-full' 
                            : meterLiveStatus.isUrgent 
                            ? 'bg-amber-500' 
                            : 'bg-blue-600'
                        }`}
                        style={{ width: meterLiveStatus.isExpired ? '100%' : `${meterLiveStatus.percentRemaining}%` }}
                      />
                    </div>

                    {/* Prolunga rapida */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase text-[var(--text-muted)]">Prolunga Sosta</span>
                        <button
                          type="button"
                          onClick={() => {
                            setExtendTimeInput(meterLiveStatus.endFormatted);
                            setIsExtendingManualModalOpen(true);
                          }}
                          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Orario personalizzato
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {[15, 30, 60, 120].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => handleExtendParkingLive(mins)}
                            className="py-2 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--border)] border border-[var(--border)] text-xs font-bold text-blue-600 dark:text-blue-400 active:scale-95 transition-all shadow-2xs cursor-pointer"
                          >
                            +{mins < 60 ? `${mins}m` : `${mins / 60}h`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {parking.estimatedCost !== undefined && parking.estimatedCost > 0 && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--border)]/60 text-[var(--text-muted)]">
                        <span>Tariffa: {parking.hourlyRate ? `${parking.hourlyRate.toFixed(2)} €/h` : 'Variabile'}</span>
                        <span className="font-bold text-[var(--text-main)]">Totale: € {parking.estimatedCost.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Parchimetro disattivato */
                  <div className="p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--text-main)]">Parchimetro / Disco Orario</p>
                        <p className="text-[11px] text-[var(--text-muted)]">Nessuna scadenza impostata</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const target = new Date(Date.now() + 60 * 60 * 1000);
                        const hh = String(target.getHours()).padStart(2, '0');
                        const mm = String(target.getMinutes()).padStart(2, '0');
                        setExtendTimeInput(`${hh}:${mm}`);
                        setIsExtendingManualModalOpen(true);
                      }}
                      className="py-2 px-3.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all cursor-pointer"
                    >
                      + Attiva Timer
                    </button>
                  </div>
                )}

                {/* 3. ANTEPRIMA MAPPA */}
                {parking.latitude !== 0 && parking.longitude !== 0 && (
                  <div className="rounded-3xl overflow-hidden border border-[var(--border)] shadow-xs bg-[var(--surface-variant)] h-56 relative group">
                    <iframe
                      title="Mappa Parcheggio"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      src={`https://maps.google.com/maps?q=${parking.latitude},${parking.longitude}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                      className="w-full h-full border-0 pointer-events-none sm:pointer-events-auto"
                    />
                    <div className="absolute top-3 left-3 bg-[var(--card-bg)]/90 backdrop-blur-md border border-[var(--border)] px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 shadow-sm pointer-events-none">
                      <Car className="w-3.5 h-3.5" />
                      <span>Posizione GPS Auto</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNavModalTarget({ 
                        query: parking.address || '', 
                        lat: parking.latitude, 
                        lon: parking.longitude,
                        title: 'La tua Auto' 
                      })}
                      className="absolute bottom-3 right-3 bg-[var(--card-bg)]/95 hover:bg-[var(--card-bg)] border border-[var(--border)] px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-main)] shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Apri Mappe</span>
                    </button>
                  </div>
                )}

                {/* Aggiorna posizione GPS */}
                <button
                  type="button"
                  onClick={triggerGpsAutoSave}
                  className="w-full py-3 px-4 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] border border-[var(--border)] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Crosshair className="w-4 h-4 text-blue-600" />
                  <span>Aggiorna Posizione GPS Auto</span>
                </button>
              </div>
            ) : (
              /* STATO 3: NESSUN PARCHEGGIO SALVATO - HERO PULITO CON 1-TAP */
              <div className="space-y-4 animate-fade-in">
                {/* Hero Centrato */}
                <div className="text-center space-y-2 py-4 sm:py-6">
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
                    <Car className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] tracking-tight">
                    Dove hai parcheggiato?
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-sm mx-auto font-medium">
                    Memorizza la posizione della tua auto con 1 tocco per ritrovarla senza stress.
                  </p>
                </div>

                {/* 1-TAP SALVA POSIZIONE GPS ORA */}
                <button
                  type="button"
                  onClick={triggerGpsAutoSave}
                  disabled={isLoadingGps}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
                >
                  <Crosshair className="w-5 h-5 animate-pulse" />
                  <span>Salva Posizione GPS Qui (1-Tap)</span>
                </button>

                {/* MODALITÀ OPZIONALI & PARCHIMETRO */}
                <div className="p-5 rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-5">
                  {/* Switch GPS vs Manuale */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">
                        Modalità Inserimento
                      </span>
                      <div className="flex bg-[var(--surface-variant)] p-0.5 rounded-xl border border-[var(--border)]">
                        <button
                          type="button"
                          onClick={() => setLocationMode('gps')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            locationMode === 'gps'
                              ? 'bg-[var(--card-bg)] text-blue-600 dark:text-blue-400 shadow-2xs'
                              : 'text-[var(--text-muted)]'
                          }`}
                        >
                          GPS
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocationMode('manual')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            locationMode === 'manual'
                              ? 'bg-[var(--card-bg)] text-blue-600 dark:text-blue-400 shadow-2xs'
                              : 'text-[var(--text-muted)]'
                          }`}
                        >
                          Manuale
                        </button>
                      </div>
                    </div>

                    {locationMode === 'manual' && (
                      <div className="flex gap-2 pt-1 animate-fade-in">
                        <input
                          type="text"
                          value={manualAddressInput}
                          onChange={(e) => setManualAddressInput(e.target.value)}
                          placeholder="Es. Via Roma 42, Garage Centrale..."
                          className="flex-1 bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl px-3.5 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setIsAddressPickerOpen(true)}
                          className="px-3 py-2.5 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-blue-600 dark:text-blue-400 font-bold text-xs border border-[var(--border)] shrink-0 flex items-center gap-1 cursor-pointer"
                          title="Scegli dalla rubrica"
                        >
                          <Bookmark className="w-4 h-4" />
                          <span className="hidden sm:inline">Rubrica</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* PARCHIMETRO & DISCO ORARIO (Opzionale) */}
                  <div className="pt-3 border-t border-[var(--border)]/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Timer className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-xs font-bold text-[var(--text-main)]">Parchimetro / Disco Orario</p>
                          <p className="text-[11px] text-[var(--text-muted)]">Promemoria e notifica prima della scadenza</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={isMeterEnabled}
                        onClick={() => setIsMeterEnabled(!isMeterEnabled)}
                        className={`w-11 h-6 rounded-full transition-colors relative p-0.5 border cursor-pointer ${
                          isMeterEnabled ? 'bg-blue-600 border-blue-700' : 'bg-[var(--border)] border-[var(--border)]'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          isMeterEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {isMeterEnabled && (
                      <div className="p-4 rounded-2xl bg-[var(--surface-variant)] border border-[var(--border)] space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Fine sosta</span>
                            <p className="font-mono text-2xl font-black text-blue-600 dark:text-blue-400">
                              {manualEndTimeInput}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Durata</span>
                            <p className="text-sm font-bold text-[var(--text-main)]">
                              {formatMinutesHuman(meterDurationMinutes)}
                            </p>
                          </div>
                        </div>

                        {/* Presets rapidi durata */}
                        <div className="flex flex-wrap gap-1.5">
                          {[30, 60, 90, 120, 180].map(mins => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => setMeterDurationMinutes(mins)}
                              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                meterDurationMinutes === mins
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                  : 'bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] border-[var(--border)]'
                              }`}
                            >
                              {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                            </button>
                          ))}
                        </div>

                        {/* Orario esatto */}
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)]">
                          <span className="text-xs font-medium text-[var(--text-muted)]">O imposta orario fine esatto:</span>
                          <input
                            type="time"
                            value={manualEndTimeInput}
                            onChange={handleManualTimeChange}
                            className="bg-[var(--surface-variant)] border border-[var(--border)] rounded-lg px-2.5 py-1 font-mono font-bold text-xs text-[var(--text-main)]"
                          />
                        </div>

                        {/* Tariffa oraria */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--border)]/60">
                          <span className="text-[var(--text-muted)]">Tariffa: 1.50 €/h</span>
                          <span className="font-bold text-[var(--text-main)]">
                            Stima: € {estimatedMeterCost.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* NOTE POSTO, VEICOLO & FOTO (Opzionale) */}
                  <div className="pt-3 border-t border-[var(--border)]/70 space-y-3">
                    <span className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider block">
                      Dettagli Aggiuntivi (Opzionale)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        placeholder="Note posto (es. Piano -1, Pilastro B)"
                        className="bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="text"
                        value={vehicleNameInput}
                        onChange={(e) => setVehicleNameInput(e.target.value)}
                        placeholder="Nome veicolo o targa"
                        className="bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Foto posto */}
                    <div className="flex items-center justify-between pt-1">
                      {parkingPhotoUrl ? (
                        <div className="flex items-center gap-2">
                          <img src={parkingPhotoUrl} alt="Foto posto" className="w-10 h-10 rounded-xl object-cover border border-[var(--border)]" />
                          <span className="text-xs text-emerald-600 font-bold">Foto allegata</span>
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="text-xs text-rose-500 font-bold hover:underline"
                          >
                            Rimuovi
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-xs font-bold text-blue-600 dark:text-blue-400 border border-[var(--border)] transition-colors cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Scatta o Allega Foto Posto</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pulsante conferma per inserimento manuale */}
                  {locationMode === 'manual' && (
                    <button
                      type="button"
                      onClick={handleConfirmAndSaveParking}
                      disabled={isLoadingGps || !manualAddressInput.trim()}
                      className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      Conferma Parcheggio Manuale
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ============================================================ */
          /* SCHERMATA: I MIEI LUOGHI & INDIRIZZI                        */
          /* ============================================================ */
          <div className="space-y-4">
            {/* BARRA DI RICERCA */}
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchAddrQuery}
                onChange={(e) => setSearchAddrQuery(e.target.value)}
                placeholder="Cerca per titolo, via o note..."
                className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl pl-10 pr-9 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 shadow-2xs transition-all"
              />
              {searchAddrQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchAddrQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* FILTRI CATEGORIA RAPIDI */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'all', label: 'Tutti' },
                { id: 'home', label: '🏠 Casa' },
                { id: 'work', label: '💼 Lavoro' },
                { id: 'favorite', label: '⭐ Preferiti' },
                { id: 'other', label: '📍 Altro' },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAddrCategoryFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                    addrCategoryFilter === f.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] border-[var(--border)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* LISTA LUOGHI */}
            {filteredAddresses.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {filteredAddresses.map((addr) => {
                  const badge = getCategoryBadge(addr.category);
                  const BadgeIcon = badge.icon;

                  return (
                    <div
                      key={addr.id}
                      className="p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] hover:border-blue-500/30 transition-all shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`p-2.5 rounded-2xl ${badge.color} border shrink-0 mt-0.5`}>
                            <BadgeIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold text-[var(--text-main)] truncate">
                                {addr.title}
                              </h4>
                              {addr.category && (
                                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] px-1.5 py-0.2 rounded-md bg-[var(--surface-variant)]">
                                  {badge.label}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--text-muted)] break-words line-clamp-2 mt-0.5">
                              {addr.query}
                            </p>
                            {addr.notes && (
                              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 italic">
                                Note: {addr.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAddr(addr);
                              setNewTitle(addr.title);
                              setNewQuery(addr.query);
                              setNewNotes(addr.notes || '');
                              setNewCategory(addr.category || 'other');
                              setIsAddingAddr(true);
                            }}
                            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-blue-500 hover:bg-[var(--surface-variant)] transition-colors cursor-pointer"
                            title="Modifica"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Elimina"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Azioni rapide luogo */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]/70">
                        <button
                          type="button"
                          onClick={() => setNavModalTarget({ query: addr.query, title: addr.title })}
                          className="flex-1 min-w-[110px] py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Naviga</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleParkAtAddress(addr)}
                          className="py-2 px-3 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1.5 border border-[var(--border)] active:scale-95 transition-all cursor-pointer"
                          title="Imposta questo luogo come parcheggio auto"
                        >
                          <Car className="w-3.5 h-3.5" />
                          <span>Parcheggia qui</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyText(addr.query, 'Indirizzo')}
                          className="p-2 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border)] active:scale-95 transition-all cursor-pointer"
                          title="Copia indirizzo"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSharingAddr(addr)}
                          className="p-2 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border)] active:scale-95 transition-all cursor-pointer"
                          title="Condividi via QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty state Luoghi */
              <div className="py-12 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                  <MapPin className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="text-base font-bold text-[var(--text-main)]">
                    {searchAddrQuery ? 'Nessun luogo trovato' : 'Nessun Luogo Salvato'}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {searchAddrQuery 
                      ? 'Nessun indirizzo corrisponde alla ricerca inserita.' 
                      : 'Salva i tuoi luoghi del cuore (Casa, Lavoro, Palestra, Famiglia) per aprirli al volo con il navigatore o impostarli come posto auto.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAddr(null);
                    setNewTitle('');
                    setNewQuery('');
                    setNewNotes('');
                    setNewCategory('other');
                    setIsAddingAddr(true);
                  }}
                  className="py-2.5 px-5 rounded-2xl bg-blue-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Aggiungi Luogo</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ═══════ MODAL: AGGIUNGI / MODIFICA LUOGO ═══════ */}
      <AnimatePresence>
        {isAddingAddr && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[var(--text-main)]">
                  {editingAddr ? 'Modifica Luogo' : 'Nuovo Luogo'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingAddr(false)}
                  className="p-2 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selettore categoria rapida */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-[var(--text-muted)]">Categoria</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'home', label: 'Casa', icon: Home },
                    { id: 'work', label: 'Lavoro', icon: Briefcase },
                    { id: 'favorite', label: 'Preferito', icon: Star },
                    { id: 'other', label: 'Altro', icon: MapPin },
                  ].map(c => {
                    const CIcon = c.icon;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setNewCategory(c.id as any)}
                        className={`py-2 px-1.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                          newCategory === c.id
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-[var(--surface-variant)] text-[var(--text-muted)] border-[var(--border)]'
                        }`}
                      >
                        <CIcon className="w-4 h-4" />
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleAddOrEditAddress} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-bold uppercase text-[var(--text-muted)] block mb-1">
                    Titolo / Nome Luogo
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Es. Casa, Ufficio, Palestra..."
                    required
                    className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl px-4 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold uppercase text-[var(--text-muted)]">
                      Indirizzo
                    </label>
                    <button
                      type="button"
                      onClick={handleGetGpsForNewAddress}
                      disabled={isGettingAddrGps}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isGettingAddrGps ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <LocateFixed className="w-3.5 h-3.5" />
                      )}
                      <span>{isGettingAddrGps ? 'GPS...' : 'Usa GPS'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newQuery}
                    onChange={(e) => setNewQuery(e.target.value)}
                    placeholder="Es. Via Garibaldi 12, Milano"
                    required
                    className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl px-4 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-[var(--text-muted)] block mb-1">
                    Note Aggiuntive (Citofono, Scala, Codice)
                  </label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Es. Citofono 14, Scala B, Piano 3..."
                    className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl px-4 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]/70">
                  <button
                    type="button"
                    onClick={() => setIsAddingAddr(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--surface-variant)] cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                  >
                    {editingAddr ? 'Aggiorna' : 'Salva'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════ MODAL: SCEGLI NAVIGATORE (Google / Apple / Waze) ═══════ */}
      <AnimatePresence>
        {navModalTarget && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-center"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[var(--text-main)]">Scegli Navigatore</h3>
                <button
                  type="button"
                  onClick={() => setNavModalTarget(null)}
                  className="p-2 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[var(--text-muted)] truncate">
                Destinazione: <strong>{navModalTarget.title}</strong>
              </p>

              <div className="grid grid-cols-1 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => openNavigation('google', navModalTarget)}
                  className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Google Maps (A piedi / Auto)</span>
                </button>
                <button
                  type="button"
                  onClick={() => openNavigation('apple', navModalTarget)}
                  className="w-full py-3 px-4 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] font-bold text-xs border border-[var(--border)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Apple Maps</span>
                </button>
                <button
                  type="button"
                  onClick={() => openNavigation('waze', navModalTarget)}
                  className="w-full py-3 px-4 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] font-bold text-xs border border-[var(--border)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Waze</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════ MODAL: SELETTORE INDIRIZZO DA RUBRICA PER PARCHEGGIO ═══════ */}
      <AnimatePresence>
        {isAddressPickerOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-main)]">Scegli da Rubrica</h3>
                  <p className="text-xs text-[var(--text-muted)]">Imposta un luogo salvato come parcheggio</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddressPickerOpen(false)}
                  className="p-2 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)] cursor-pointer"
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
                        setManualAddressInput(a.query ? `${a.title}: ${a.query}` : a.title);
                        setIsAddressPickerOpen(false);
                      }}
                      className="w-full p-3 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] border border-[var(--border)] text-left flex items-start gap-3 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text-main)] truncate">{a.title}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{a.query}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-[var(--text-muted)] text-center py-6">
                    Nessun luogo in rubrica. Aggiungine uno nella scheda "I miei Luoghi".
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════ MODAL: MODIFICA ORARIO FINE SOSTA ═══════ */}
      <AnimatePresence>
        {isExtendingManualModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-[var(--text-main)]">Modifica Fine Sosta</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExtendingManualModalOpen(false)}
                  className="p-2 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase text-[var(--text-muted)] block">
                  Imposta nuova ora di fine:
                </label>
                <input
                  type="time"
                  value={extendTimeInput}
                  onChange={(e) => setExtendTimeInput(e.target.value)}
                  className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl p-3 font-mono font-bold text-2xl text-center text-[var(--text-main)] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExtendingManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--surface-variant)] cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleApplyManualEndTimeLive}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                >
                  Salva Orario
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════ MODAL: INGRANDIMENTO FOTO POSTO AUTO ═══════ */}
      <AnimatePresence>
        {viewFullPhoto && parking?.photoUrl && (
          <div 
            onClick={() => setViewFullPhoto(false)}
            className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-lg w-full rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={parking.photoUrl} alt="Foto posto auto" className="w-full h-auto max-h-[80vh] object-contain rounded-3xl" />
              <button
                type="button"
                onClick={() => setViewFullPhoto(false)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════ MODAL: CONDIVISIONE QR CODE LUOGO ═══════ */}
      <AnimatePresence>
        {sharingAddr && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[var(--text-main)]">Condividi Luogo</h3>
                <button
                  type="button"
                  onClick={() => setSharingAddr(null)}
                  className="p-2 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                Scansiona questo QR Code per importare il luogo in Chelona.
              </p>

              <div className="bg-white p-4 rounded-2xl inline-block mx-auto shadow-sm border border-[var(--border)]">
                <QRCodeSVG
                  value={JSON.stringify({
                    t: 'shared_address',
                    d: { 
                      title: sharingAddr.title, 
                      query: sharingAddr.query,
                      notes: sharingAddr.notes,
                      category: sharingAddr.category
                    }
                  })}
                  size={190}
                />
              </div>

              <div className="space-y-0.5">
                <p className="text-sm font-bold text-[var(--text-main)]">{sharingAddr.title}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{sharingAddr.query}</p>
              </div>

              <button
                type="button"
                onClick={() => setSharingAddr(null)}
                className="w-full py-2.5 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] font-bold text-xs text-[var(--text-main)] cursor-pointer"
              >
                Chiudi
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════ SCANNER QR CODE ═══════ */}
      {isScanningQr && (
        <QrScanner
          onScan={handleScanAddressQr}
          onClose={() => setIsScanningQr(false)}
        />
      )}

      {/* ═══════ CONFIRM DIALOG ELIMINAZIONE INDIRIZZO ═══════ */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        title="Elimina Luogo"
        message="Vuoi davvero eliminare questo luogo dalla tua rubrica?"
        onConfirm={confirmDeleteAddress}
        onCancel={() => setDeleteConfirmId(null)}
        confirmText="Elimina"
        cancelText="Annulla"
      />

      {/* ═══════ CONFIRM DIALOG TERMINA SOSTA ═══════ */}
      <ConfirmDialog
        isOpen={showClearParkingConfirm}
        title="Hai ripreso l'auto?"
        message="La posizione del parcheggio e l'eventuale parchimetro attivo verranno azzerati."
        onConfirm={confirmClearParking}
        onCancel={() => setShowClearParkingConfirm(false)}
        confirmText="Sì, ho ripreso l'auto"
        cancelText="Annulla"
      />
    </motion.div>
  );
};
