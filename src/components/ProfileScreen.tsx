import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, User, Lock, Fingerprint, LogOut, Camera, Check, AlertCircle, 
  Share2, Download, Copy, ShieldCheck, QrCode, SunDim, RefreshCw, 
  Sun, Moon, FileArchive, Bell, Mic, Eye, EyeOff, Shield, Database, 
  Sliders, Layers, Folder as FolderIcon, Trash2, CheckCircle2, 
  AlertTriangle, Sparkles, Key, FileText, CheckCheck,
  Car, Users, Receipt, Globe, BookOpen, Activity, Home,
  Percent, Scan, Shirt, ImageIcon, HardDrive, Edit2
} from 'lucide-react';
import { storage } from '../services/storage';
import { encryption } from '../services/encryption';
import { updateService } from '../services/updateService';
import { notificationService } from '../services/notificationService';
import { wakeWordService } from '../services/wakeWordService';
import { Module, Folder } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { APP_VERSION } from '../constants/version';
import JSZip from 'jszip';
import { lzw } from '../utils/lzw';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import CryptoJS from 'crypto-js';

export interface ProfileScreenProps {
  onClose: () => void;
  username: string;
  avatar?: string;
  onUpdateProfile: (name: string, avatar?: string) => void;
  isBioSupported: boolean;
  isBioEnabled: boolean;
  onEnableBiometrics: () => Promise<void>;
  onDisableBiometrics: () => Promise<void>;
  bioError: string | null;
  onLogout: () => void;
  encryptionKey: CryptoKey;
  modules: Module[];
  folders: Folder[];
  onEncryptionKeyChanged: (newKey: CryptoKey) => void;
  currentProfileId: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  pinnedCategoryIds: string[];
  pinnedToolIds: string[];
  onUpdateWidgets: (catIds: string[], toolIds: string[]) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

type TabType = 'profile' | 'security' | 'backup' | 'system';

interface AvatarGradient {
  id: string;
  label: string;
  from: string;
  to: string;
  class: string;
}

const AVATAR_GRADIENTS: AvatarGradient[] = [
  { id: 'teal', label: 'Oasis Teal', from: '#0d9488', to: '#34d399', class: 'bg-gradient-to-tr from-teal-600 to-emerald-400' },
  { id: 'indigo', label: 'Indigo Night', from: '#4f46e5', to: '#8b5cf6', class: 'bg-gradient-to-tr from-indigo-600 to-violet-500' },
  { id: 'rose', label: 'Coral Rose', from: '#f43f5e', to: '#fbbf24', class: 'bg-gradient-to-tr from-rose-500 to-amber-400' },
  { id: 'amber', label: 'Golden Amber', from: '#f59e0b', to: '#f97316', class: 'bg-gradient-to-tr from-amber-500 to-orange-500' },
  { id: 'cyan', label: 'Ocean Cyan', from: '#0891b2', to: '#3b82f6', class: 'bg-gradient-to-tr from-cyan-600 to-blue-500' },
  { id: 'purple', label: 'Royal Purple', from: '#7e22ce', to: '#ec4899', class: 'bg-gradient-to-tr from-purple-700 to-pink-500' },
];

function generateGradientAvatarSvg(letter: string, fromColor: string, toColor: string): string {
  const safeLetter = (letter || 'U').trim().charAt(0).toUpperCase() || 'U';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="g" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${fromColor}"/>
      <stop offset="100%" stop-color="${toColor}"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="128" fill="url(#g)"/>
  <text x="128" y="165" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="110" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="alphabetic">${safeLetter}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Categorie sincronizzate al 100% con TEMPLATES in src/App.tsx
const AVAILABLE_PINNED_CATEGORIES = [
  { id: 'auto', label: 'Veicoli & Auto', icon: Car, color: 'text-rose-500' },
  { id: 'document', label: 'Documenti', icon: FileText, color: 'text-blue-500' },
  { id: 'split', label: 'Spese & Conti', icon: Users, color: 'text-purple-500' },
  { id: 'single-expense', label: 'Spesa Singola', icon: Receipt, color: 'text-amber-500' },
  { id: 'travel', label: 'Viaggi', icon: Globe, color: 'text-indigo-400' },
  { id: 'recipes', label: 'Ricette', icon: BookOpen, color: 'text-orange-500' },
  { id: 'fitness', label: 'Fitness & Dieta', icon: Activity, color: 'text-emerald-500' },
  { id: 'home', label: 'Casa & Arredo', icon: Home, color: 'text-teal-500' },
];

// Strumenti sincronizzati al 100% con TOOLS_UTILITY in src/constants/tools.ts
const AVAILABLE_PINNED_TOOLS = [
  { id: 'chelona-ai', label: 'Chelona AI', icon: Sparkles, color: 'text-amber-500' },
  { id: 'vinted', label: 'Aiuto Vinted', icon: Shirt, color: 'text-teal-500' },
  { id: 'scanner', label: 'Scanner Documenti', icon: Scan, color: 'text-emerald-500' },
  { id: 'percent', label: 'Calcolo Percentuale', icon: Percent, color: 'text-indigo-500' },
  { id: 'image-filter', label: 'Filtri Immagine', icon: ImageIcon, color: 'text-pink-500' },
];

export function ProfileScreen({
  onClose,
  username,
  avatar,
  currentProfileId,
  onUpdateProfile,
  isBioSupported,
  isBioEnabled,
  onEnableBiometrics,
  onDisableBiometrics,
  bioError,
  onLogout,
  encryptionKey,
  modules,
  folders,
  onEncryptionKeyChanged,
  showToast,
  pinnedCategoryIds = [],
  pinnedToolIds = [],
  onUpdateWidgets,
  theme,
  onToggleTheme
}: ProfileScreenProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // Username edit
  const [editName, setEditName] = useState(username);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isNameSaving, setIsNameSaving] = useState(false);
  const [selectedGradientIndex, setSelectedGradientIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  
  // Modals
  const [showRemovePwdModal, setShowRemovePwdModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);

  // QR Backup
  const [showBackupQR, setShowBackupQR] = useState(false);
  const [backupJSON, setBackupJSON] = useState<string | null>(null);
  const [isAntiGlare, setIsAntiGlare] = useState(false);
  const [isCopiedPayload, setIsCopiedPayload] = useState(false);

  // Wake word
  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState(() => wakeWordService.getEnabled());

  // Updates
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // Restore input ref
  const restoreZipInputRef = useRef<HTMLInputElement>(null);

  // Sync wake word subscription
  useEffect(() => {
    return wakeWordService.subscribe(st => setIsWakeWordEnabled(st.isEnabled));
  }, []);

  // Update internal name when prop changes
  useEffect(() => {
    setEditName(username);
  }, [username]);

  // Profile data from storage
  const currentProfileObj = useMemo(() => {
    return storage.loadProfiles().find(p => p.id === currentProfileId);
  }, [currentProfileId]);

  const hasCustomPassword = currentProfileObj ? currentProfileObj.hasPassword !== false : true;

  // Determine if current avatar is custom uploaded photo (not SVG gradient)
  const isCustomPhoto = useMemo(() => {
    return Boolean(avatar && !avatar.startsWith('data:image/svg+xml'));
  }, [avatar]);

  // Vault Statistics
  const stats = useMemo(() => {
    const totalModules = modules.length;
    const sensitiveCount = modules.filter(m => m.isSensitive).length;
    const totalFolders = folders.length;
    return {
      totalModules,
      sensitiveCount,
      totalFolders,
      encryptionLevel: 'AES-256 GCM'
    };
  }, [modules, folders]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: '', percent: 0, color: 'bg-transparent', text: '' };
    let s = 0;
    if (newPassword.length >= 6) s += 1;
    if (newPassword.length >= 10) s += 1;
    if (/[0-9]/.test(newPassword) && /[a-zA-Z]/.test(newPassword)) s += 1;
    if (/[^a-zA-Z0-9]/.test(newPassword)) s += 1;

    if (s <= 1) return { score: 1, label: 'Debole (min. 6 caratteri)', percent: 30, color: 'bg-rose-500', text: 'text-rose-500' };
    if (s === 2) return { score: 2, label: 'Media', percent: 65, color: 'bg-amber-500', text: 'text-amber-500' };
    return { score: 3, label: 'Forte & Sicura', percent: 100, color: 'bg-emerald-500', text: 'text-emerald-500' };
  }, [newPassword]);

  // Voice toggle
  const handleToggleWakeWord = async () => {
    const next = !isWakeWordEnabled;
    const ok = await wakeWordService.setEnabled(next);
    if (ok) {
      setIsWakeWordEnabled(next);
      showToast(
        next
          ? "Comando vocale attivo! Di' 'Ciao Chelona' per parlare."
          : "Comando vocale disattivato.",
        next ? 'success' : 'info'
      );
    } else {
      showToast('Permesso microfono necessario per attivare il comando vocale.', 'error');
    }
  };

  // ZIP Backup creation (includes profiles, state files, address book, and notifications)
  const buildBackupZip = async (): Promise<Blob> => {
    const zip = new JSZip();
    const profilesEnc = storage.getRawProfiles();
    if (!profilesEnc) throw new Error('Nessun profilo da esportare');
    zip.file('profiles.enc', profilesEnc);
    
    const profiles = storage.loadProfiles();
    for (const p of profiles) {
      const stateEnc = storage.getRawState(p.id);
      if (stateEnc) zip.file(`state_${p.id}.enc`, stateEnc);
    }

    // Include address book and notification preferences for complete offline restore
    const addrEnc = localStorage.getItem('chelona_address_book_enc');
    if (addrEnc) zip.file('address_book.enc', addrEnc);
    
    const notifEnc = localStorage.getItem('chelona_notification_prefs_enc');
    if (notifEnc) zip.file('notification_prefs.enc', notifEnc);

    return await zip.generateAsync({ type: 'blob' });
  };

  const dateStr = () => new Date().toISOString().substring(0, 10);

  const handleGenerateBackup = () => {
    const profiles = storage.loadProfiles();
    const profile = profiles.find(p => p.id === currentProfileId);
    if (!profile) return;

    const encryptedData = storage.getRawState(currentProfileId);
    
    const backup = {
      t: 'chelona_profile_backup',
      v: '1.0',
      p: profile,
      d: encryptedData
    };

    const json = JSON.stringify(backup);
    const compressed = lzw.compress(json);
    const finalPayload = compressed.length < json.length ? compressed : json;
    
    if (finalPayload.length > 2800) {
      showToast("Attenzione: I dati del profilo sono ampi. Consigliato esportare il backup ZIP.", 'info');
    }
    
    setBackupJSON(finalPayload);
    setIsCopiedPayload(false);
    setShowBackupQR(true);
  };

  const handleExportZip = async () => {
    try {
      const zipBlob = await buildBackupZip();
      const filename = `chelona_backup_${dateStr()}.zip`;
      
      if (Capacitor.isNativePlatform()) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          try {
            const fileUri = await Filesystem.writeFile({
              path: filename,
              data: base64Data,
              directory: Directory.Documents
            });
            
            const { Share } = await import('@capacitor/share');
            (window as any).__chelona_bypass_lock = true;
            await Share.share({
              title: 'Esporta Backup Chelona',
              url: fileUri.uri,
              dialogTitle: 'Salva o Condividi il Backup ZIP'
            });
            showToast('Backup ZIP pronto e condiviso!', 'success');
          } catch (e) {
            showToast('Errore durante la condivisione del backup', 'error');
          }
        };
        reader.readAsDataURL(zipBlob);
      } else {
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Backup ZIP scaricato con successo!', 'success');
      }
    } catch (err) {
      console.error('ZIP creation error', err);
      showToast('Errore durante la creazione del file ZIP', 'error');
    }
  };

  const restoreFromZipBlob = async (blob: Blob) => {
    try {
      const zip = await JSZip.loadAsync(blob);
      const profilesEnc = zip.file('profiles.enc');
      if (!profilesEnc) throw new Error('File backup non valido (manca profiles.enc)');
      const profilesEncStr = await profilesEnc.async('string');
      await storage.saveRawProfiles(profilesEncStr);

      const stateFiles = Object.keys(zip.files).filter(n => /^state_.+\.enc$/.test(n));
      for (const name of stateFiles) {
        const content = await zip.file(name)!.async('string');
        const profileId = name.replace(/^state_/, '').replace(/\.enc$/, '');
        await storage.saveRawState(profileId, content);
      }

      // Restore address book if present
      const addrFile = zip.file('address_book.enc');
      if (addrFile) {
        const addrEncStr = await addrFile.async('string');
        try {
          const bytes = CryptoJS.AES.decrypt(addrEncStr, 'chelona_secure_vault_salt_2026');
          const decrypted = bytes.toString(CryptoJS.enc.Utf8);
          if (decrypted) storage.saveAddressBook(JSON.parse(decrypted));
        } catch {}
      }

      // Restore notification prefs if present
      const notifFile = zip.file('notification_prefs.enc');
      if (notifFile) {
        const notifEncStr = await notifFile.async('string');
        try {
          const bytes = CryptoJS.AES.decrypt(notifEncStr, 'chelona_secure_vault_salt_2026');
          const decrypted = bytes.toString(CryptoJS.enc.Utf8);
          if (decrypted) storage.saveNotificationPrefs(JSON.parse(decrypted));
        } catch {}
      }

      showToast('Backup ripristinato! Riavvio dell\'app in corso…', 'success');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      console.error('Restore error', err);
      showToast(`Errore ripristino: ${err?.message || 'file non valido'}`, 'error');
    }
  };

  const handleRestoreFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPendingRestoreFile(file);
    setShowRestoreModal(true);
  };

  const confirmRestore = async () => {
    if (!pendingRestoreFile) return;
    const file = pendingRestoreFile;
    setShowRestoreModal(false);
    setPendingRestoreFile(null);
    await restoreFromZipBlob(file);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 256;
        
        // Calculate square center crop
        const size = Math.min(img.width, img.height);
        const xOffset = (img.width - size) / 2;
        const yOffset = (img.height - size) / 2;
        
        canvas.width = maxDim;
        canvas.height = maxDim;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, xOffset, yOffset, size, size, 0, 0, maxDim, maxDim);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.88);
          onUpdateProfile(editName, compressedBase64);
        } else {
          onUpdateProfile(editName, event.target?.result as string);
        }
        showToast('Foto profilo aggiornata con successo!', 'success');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSelectGradient = (grad: AvatarGradient, idx: number) => {
    setSelectedGradientIndex(idx);
    const svgUrl = generateGradientAvatarSvg(editName || username, grad.from, grad.to);
    onUpdateProfile(editName || username, svgUrl);
    showToast(`Gradiente "${grad.label}" applicato al profilo!`, 'info');
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    const grad = AVATAR_GRADIENTS[selectedGradientIndex] || AVATAR_GRADIENTS[0];
    const svgUrl = generateGradientAvatarSvg(editName || username, grad.from, grad.to);
    onUpdateProfile(editName, svgUrl);
    showToast('Foto rimossa: impostato avatar gradiente vettoriale.', 'info');
  };

  const handleSaveName = () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      showToast('Il nome utente non può essere vuoto.', 'error');
      return;
    }
    setIsNameSaving(true);
    // If using gradient SVG avatar, refresh the initial in the SVG
    let nextAvatar = avatar;
    if (avatar && avatar.startsWith('data:image/svg+xml')) {
      const grad = AVATAR_GRADIENTS[selectedGradientIndex] || AVATAR_GRADIENTS[0];
      nextAvatar = generateGradientAvatarSvg(trimmed, grad.from, grad.to);
    }
    onUpdateProfile(trimmed, nextAvatar);
    setIsEditingName(false);
    setTimeout(() => {
      setIsNameSaving(false);
      showToast('Nome profilo salvato!', 'success');
    }, 400);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (newPassword !== confirmPassword) {
      setPwdError('Le nuove password non coincidono.');
      return;
    }

    if (newPassword.length < 6) {
      setPwdError('La password deve essere di almeno 6 caratteri.');
      return;
    }

    try {
      setIsChangingPwd(true);
      const profiles = storage.loadProfiles();
      const profile = profiles.find(p => p.id === currentProfileId);
      if (!profile) throw new Error('Profilo non trovato');

      // Se il profilo ha già una password attiva, verifichiamo la vecchia password
      if (hasCustomPassword) {
        const oldHashAttempt = await encryption.hashPassword(oldPassword, profile.salt);
        if (oldHashAttempt !== profile.passwordHash) {
          setPwdError('La password attuale inserita non è corretta.');
          setIsChangingPwd(false);
          return;
        }
      }

      // Generato nuovo salt e hash
      const newSalt = encryption.generateSalt();
      const newHash = await encryption.hashPassword(newPassword, newSalt);
      
      // Derivo la nuova chiave crittografica AES-256
      const newKey = await encryption.deriveKey(newPassword, newSalt);

      // Salvo config (disabilitando biometria per sicurezza finché non viene riconfigurata con la nuova chiave)
      const updatedProfile = {
        ...profile,
        passwordHash: newHash,
        salt: newSalt,
        hasPassword: true,
        isBiometricEnabled: false,
        credentialId: undefined,
        encryptedMasterKey: undefined,
        bioSalt: undefined
      };
      
      storage.saveProfiles(profiles.map(p => p.id === currentProfileId ? updatedProfile : p));

      // Risalva lo stato con la nuova chiave
      await storage.saveState({ modules, folders }, newKey, currentProfileId);

      // Aggiorna chiave in App
      onEncryptionKeyChanged(newKey);
      
      setPwdSuccess(hasCustomPassword 
        ? 'Password aggiornata con successo! Riconfigura la biometria se desideri usarla con la nuova password.' 
        : 'Password impostata con successo! I tuoi dati sensibili sono ora protetti da chiave crittografica personalizzata.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password del vault aggiornata!', 'success');
    } catch (e: any) {
      setPwdError(e.message || 'Errore durante l\'aggiornamento della password.');
    } finally {
      setIsChangingPwd(false);
    }
  };

  const handleConfirmRemovePassword = async () => {
    setShowRemovePwdModal(false);
    try {
      setIsChangingPwd(true);
      setPwdError('');
      setPwdSuccess('');

      const profiles = storage.loadProfiles();
      const profile = profiles.find(p => p.id === currentProfileId);
      if (!profile) throw new Error('Profilo non trovato');

      const publicPass = 'chelona_public_vault_key_2026';
      const newSalt = 'public_salt_123';
      const newHash = await encryption.hashPassword(publicPass, newSalt);
      const newKey = await storage.getPublicKey();

      const updatedProfile = {
        ...profile,
        passwordHash: newHash,
        salt: newSalt,
        hasPassword: false,
        isBiometricEnabled: false,
        credentialId: undefined,
        encryptedMasterKey: undefined,
        bioSalt: undefined
      };

      storage.saveProfiles(profiles.map(p => p.id === currentProfileId ? updatedProfile : p));
      await storage.saveState({ modules, folders }, newKey, currentProfileId);
      onEncryptionKeyChanged(newKey);

      setPwdSuccess('Password rimossa con successo! L\'app è ora in modalità Avvio Libero senza codice.');
      showToast('Password rimossa! Accesso libero ai moduli protetti.', 'success');
    } catch (e: any) {
      setPwdError(e.message || 'Errore durante la rimozione della password');
    } finally {
      setIsChangingPwd(false);
    }
  };

  const handleCopyProfileId = () => {
    navigator.clipboard.writeText(currentProfileId);
    showToast('ID Profilo copiato negli appunti!', 'info');
  };

  const handleCheckUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      const info = await updateService.checkForUpdates(true);
      if (info && info.available) {
        window.dispatchEvent(new CustomEvent('chelona_update_available', { detail: info }));
      } else {
        showToast(`Chelona è aggiornata all'ultima versione (v${APP_VERSION})!`, 'info');
      }
    } catch (e) {
      showToast('Impossibile controllare gli aggiornamenti in modalità offline.', 'error');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Toggle Pinned Categories (TEMPLATES in App.tsx)
  const handleTogglePinnedCategory = (catId: string) => {
    const isPinned = pinnedCategoryIds.includes(catId);
    const newCatIds = isPinned
      ? pinnedCategoryIds.filter(id => id !== catId)
      : [...pinnedCategoryIds, catId];
    onUpdateWidgets(newCatIds, pinnedToolIds);
  };

  // Toggle Pinned Utility Tools (TOOLS_UTILITY in tools.ts)
  const handleTogglePinnedTool = (toolId: string) => {
    const isPinned = pinnedToolIds.includes(toolId);
    const newToolIds = isPinned
      ? pinnedToolIds.filter(id => id !== toolId)
      : [...pinnedToolIds, toolId];
    onUpdateWidgets(pinnedCategoryIds, newToolIds);
  };

  const currentGradient = AVATAR_GRADIENTS[selectedGradientIndex] || AVATAR_GRADIENTS[0];

  return (
    <div className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text-main)] transition-colors duration-300">
      {/* ── Outer Responsive Container ── */}
      <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-4 sm:py-6">

        {/* ── Hero Profile Card (Material 3 Surface Elevation) ── */}
        <div className="relative overflow-hidden rounded-[var(--radius-lg)] p-6 lg:p-8 bg-gradient-to-br from-[var(--surface-variant)]/80 via-[var(--card-bg)] to-[var(--surface-variant)]/40 border border-[var(--border)] shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            
            {/* Avatar with Camera badge */}
            <div className="relative shrink-0 group">
              <div 
                onClick={handleAvatarClick}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-[var(--card-bg)] shadow-xl cursor-pointer transition-transform duration-300 group-hover:scale-105 relative bg-[var(--surface-variant)] ring-2 ring-[var(--accent)]/30"
                title="Tocca per caricare una foto"
              >
                {avatar ? (
                  <img src={avatar} alt="Avatar Profilo" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${currentGradient.class} text-white text-4xl sm:text-5xl font-black shadow-inner`}>
                    {username ? username.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                
                {/* Hover overlay on desktop */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-8 h-8 text-white drop-shadow-md" />
                </div>
              </div>

              {/* Action badge (Camera upload) */}
              <button
                type="button"
                onClick={handleAvatarClick}
                className="absolute bottom-0 right-0 w-9 h-9 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-full border-2 border-[var(--card-bg)] flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer"
                title="Carica nuova foto"
              >
                <Camera className="w-4 h-4" />
              </button>

              {/* Remove photo button if custom uploaded photo is present */}
              {isCustomPhoto && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute -top-1 -right-1 w-7 h-7 bg-rose-500 hover:bg-rose-600 text-white rounded-full border-2 border-[var(--card-bg)] flex items-center justify-center shadow-md transition-transform active:scale-90 cursor-pointer"
                  title="Rimuovi foto personalizzata"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/png, image/jpeg, image/webp" 
              />
            </div>

            {/* Profile Info Details */}
            <div className="flex-1 text-center sm:text-left space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  {isEditingName ? (
                    <form 
                      onSubmit={(e) => { 
                        e.preventDefault(); 
                        handleSaveName(); 
                      }} 
                      className="flex items-center gap-2 justify-center sm:justify-start flex-wrap my-1"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editName}
                        maxLength={30}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setEditName(username);
                            setIsEditingName(false);
                          }
                        }}
                        placeholder="Inserisci nome..."
                        className="px-3 py-1.5 bg-[var(--bg)] border-2 border-[var(--accent)] rounded-xl outline-none text-xl sm:text-2xl font-black text-[var(--text-main)] shadow-inner w-48 sm:w-60"
                      />
                      <button
                        type="submit"
                        disabled={isNameSaving || !editName.trim()}
                        className="p-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm active:scale-95 flex items-center gap-1 text-xs"
                        title="Salva nome"
                      >
                        {isNameSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        <span className="hidden sm:inline">Salva</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditName(username);
                          setIsEditingName(false);
                        }}
                        className="p-2 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] font-bold transition-all cursor-pointer active:scale-95 text-xs flex items-center gap-1"
                        title="Annulla"
                      >
                        <X className="w-4 h-4" />
                        <span className="hidden sm:inline">Annulla</span>
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2.5 justify-center sm:justify-start">
                      <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] tracking-tight">
                        {username}
                      </h1>
                      <button
                        type="button"
                        onClick={() => {
                          setEditName(username);
                          setIsEditingName(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] text-xs font-bold transition-all active:scale-95 cursor-pointer border border-[var(--border)]"
                        title="Modifica nome utente"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>Modifica</span>
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
                    Account Principale Chelona • Crittografia Hardware Locale
                  </p>
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 sm:pt-0">
                  <button
                    onClick={handleCopyProfileId}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg)] border border-[var(--border)] text-[11px] font-mono font-bold text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-colors shadow-2xs cursor-pointer active:scale-95"
                    title="Copia ID Profilo univoco"
                  >
                    <Key className="w-3 h-3 text-[var(--accent)]" />
                    <span>ID: {currentProfileId.slice(0, 8)}…</span>
                    <Copy className="w-2.5 h-2.5 opacity-60" />
                  </button>
                </div>
              </div>

              {/* Badges strip */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wide uppercase border ${
                  hasCustomPassword
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {hasCustomPassword ? 'Dati Cifrati AES-256' : 'Avvio Libero'}
                </span>

                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wide uppercase border ${
                  isBioEnabled
                    ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                    : isBioSupported
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
                    : 'bg-gray-500/10 border-gray-500/20 text-gray-500'
                }`}>
                  <Fingerprint className="w-3.5 h-3.5" />
                  {isBioEnabled ? 'Biometria Attiva' : isBioSupported ? 'Biometria Pronta' : 'No Biometria'}
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-bg)] border border-[var(--accent)]/20 text-[var(--accent)] text-[11px] font-black tracking-wide uppercase">
                  <Database className="w-3.5 h-3.5" />
                  100% Offline
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Vault & Activity Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-[var(--card-bg)] p-4 rounded-2xl border border-[var(--border)] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Moduli Totali</span>
              <Layers className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div>
              <span className="text-2xl font-black text-[var(--text-main)]">{stats.totalModules}</span>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">elementi archiviati</p>
            </div>
          </div>

          <div className="bg-[var(--card-bg)] p-4 rounded-2xl border border-[var(--border)] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Gruppi & Cartelle</span>
              <FolderIcon className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <span className="text-2xl font-black text-[var(--text-main)]">{stats.totalFolders}</span>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">cartelle attive</p>
            </div>
          </div>

          <div className="bg-[var(--card-bg)] p-4 rounded-2xl border border-[var(--border)] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Dati Riservati</span>
              <Shield className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <span className="text-2xl font-black text-[var(--text-main)]">{stats.sensitiveCount}</span>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">con blocco riservato</p>
            </div>
          </div>

          <div className="bg-[var(--card-bg)] p-4 rounded-2xl border border-[var(--border)] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Protezione</span>
              <Lock className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black text-[var(--text-main)] block truncate">AES-GCM 256</span>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">Hardware zero-leak</p>
            </div>
          </div>
        </div>

        {/* ── Material 3 Segmented Navigation Tabs ── */}
        <div className="flex items-center justify-between p-1.5 bg-[var(--surface-variant)] rounded-2xl border border-[var(--border)] mb-6 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'profile', label: 'Profilo & Aspetto', icon: User },
              { id: 'security', label: 'Sicurezza & PIN', icon: ShieldCheck },
              { id: 'backup', label: 'Dati & Backup', icon: Database },
              { id: 'system', label: 'App & Sistema', icon: Sliders },
            ] as const
          ).map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all relative select-none cursor-pointer ${
                  isActive 
                    ? 'text-[var(--accent-on-container)] bg-[var(--card-bg)] shadow-sm' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-bg)]/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--accent)]' : 'opacity-70'}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Tab Content Views with Smooth Motion Transition ── */}
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <motion.div
              key="tab-profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Theme Customization Card - Singolo Tasto Sole / Luna */}
              <div className="bg-[var(--card-bg)] rounded-[var(--radius-lg)] p-5 sm:p-6 border border-[var(--border)] shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors shadow-inner ${
                      theme === 'dark' ? 'bg-indigo-500/15 text-indigo-400' : 'bg-amber-500/15 text-amber-500'
                    }`}>
                      {theme === 'dark' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-main)]">
                        {theme === 'dark' ? 'Modalità Scura Attiva' : 'Modalità Chiara Attiva'}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        Tocca il tasto per alternare istantaneamente Sole e Luna
                      </p>
                    </div>
                  </div>

                  {/* Singolo tasto Sole / Luna con animazione fluida */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={onToggleTheme}
                    className={`px-4 py-2.5 rounded-2xl border transition-all flex items-center gap-2.5 font-bold text-xs shadow-sm cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                        : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/25'
                    }`}
                    title={theme === 'dark' ? 'Passa alla modalità Chiara (Sole)' : 'Passa alla modalità Scura (Luna)'}
                  >
                    <div className="relative w-5 h-5 flex items-center justify-center">
                      <AnimatePresence mode="wait">
                        {theme === 'dark' ? (
                          <motion.div
                            key="sun-icon"
                            initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                            animate={{ rotate: 0, scale: 1, opacity: 1 }}
                            exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Sun className="w-5 h-5 text-amber-400" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="moon-icon"
                            initial={{ rotate: 90, scale: 0.5, opacity: 0 }}
                            animate={{ rotate: 0, scale: 1, opacity: 1 }}
                            exit={{ rotate: -90, scale: 0.5, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Moon className="w-5 h-5 text-indigo-500" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <span className="font-black tracking-wide">
                      {theme === 'dark' ? 'Attiva Sole' : 'Attiva Luna'}
                    </span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div
              key="tab-security"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Protezione Dati & Avvio Libero Info */}
              <div className="bg-[var(--card-bg)] rounded-[var(--radius-lg)] p-5 sm:p-6 border border-[var(--border)] shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-[var(--border)]">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-main)]">Politica di Sicurezza & Crittografia</h3>
                    <p className="text-xs text-[var(--text-muted)]">Crittografia AES-GCM zero-knowledge su hardware locale</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--surface-variant)]/60 border border-[var(--border)] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                        {hasCustomPassword ? 'Vault Protetto con Password' : 'Homepage ad Avvio Libero'}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black">
                      ATTIVO
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    L'app si apre sempre all'istante per consultare la panoramica. La password o l'impronta digitale vengono richieste <strong>esclusivamente quando accedi a sezioni e moduli sensibili</strong> (Documenti d'identità, Conti & Spese, Note riservate, Dati veicoli).
                  </p>
                </div>
              </div>

              {/* Sblocco Biometrico Card */}
              <div className="bg-[var(--card-bg)] rounded-[var(--radius-lg)] p-5 sm:p-6 border border-[var(--border)] shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-4 pb-3 border-b border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                      <Fingerprint className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-main)]">Sblocco Biometrico Hardware</h3>
                      <p className="text-xs text-[var(--text-muted)]">Impronta digitale o riconoscimento facciale biometrico</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border ${
                    isBioEnabled
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : isBioSupported
                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                  }`}>
                    {isBioEnabled ? 'Abilitato' : isBioSupported ? 'Supportato' : 'Non supportato'}
                  </span>
                </div>

                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Consente di sbloccare i moduli protetti in un istante utilizzando il sensore biometrico del dispositivo senza dover digitare la password ogni volta.
                </p>

                {bioError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{bioError}</span>
                  </div>
                )}

                <div className="pt-2">
                  {isBioSupported ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      {isBioEnabled ? (
                        <>
                          <button
                            type="button"
                            onClick={onEnableBiometrics}
                            className="flex-1 py-3 bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] rounded-xl font-bold text-xs uppercase tracking-wider transition-all border border-[var(--border)] flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-[var(--accent)]" />
                            <span>Aggiorna Configurazione</span>
                          </button>
                          <button
                            type="button"
                            onClick={onDisableBiometrics}
                            className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border border-rose-500/20 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Disattiva Biometria</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={onEnableBiometrics}
                          className="w-full py-3.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[var(--accent)]/20 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                        >
                          <Fingerprint className="w-4 h-4" />
                          <span>Attiva Sblocco con Impronta</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] italic">
                      Il sensore biometrico non è disponibile su questo dispositivo o browser.
                    </p>
                  )}
                </div>
              </div>

              {/* Password Dati Sensibili Card (Supporta sia aggiornamento che creazione da zero) */}
              <div className="bg-[var(--card-bg)] rounded-[var(--radius-lg)] p-5 sm:p-6 border border-[var(--border)] shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-[var(--border)]">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-main)]">
                      {hasCustomPassword ? 'Password Dati Sensibili' : 'Crea Password di Protezione'}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      {hasCustomPassword 
                        ? 'Modifica la password attuale con cui sono cifrati i tuoi moduli riservati' 
                        : 'Imposta una password personale per proteggere i tuoi dati sensibili con crittografia AES-256'}
                    </p>
                  </div>
                </div>

                {pwdError && (
                  <div className="p-4 rounded-xl flex items-center gap-3 text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{pwdError}</span>
                  </div>
                )}

                {pwdSuccess && (
                  <div className="p-4 rounded-xl flex items-center gap-3 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{pwdSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3.5">
                  {/* Password Attuale (Richiesta SOLO se il profilo ha già una password attiva) */}
                  {hasCustomPassword && (
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                        Password Attuale
                      </label>
                      <div className="relative">
                        <input
                          type={showOldPassword ? "text" : "password"}
                          placeholder="Inserisci la password attuale..."
                          required
                          value={oldPassword}
                          onChange={e => setOldPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--accent)] text-sm font-semibold text-[var(--text-main)] pr-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Nuova Password + Conferma Nuova Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                        {hasCustomPassword ? 'Nuova Password' : 'Crea Nuova Password'}
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Minimo 6 caratteri..."
                          required
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--accent)] text-sm font-semibold text-[var(--text-main)] pr-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                        Conferma Nuova Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Ripeti nuova password..."
                          required
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-[var(--accent)] text-sm font-semibold text-[var(--text-main)] pr-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Password strength meter */}
                  {newPassword && (
                    <div className="p-3 rounded-xl bg-[var(--surface-variant)]/60 border border-[var(--border)] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--text-muted)]">Sicurezza password:</span>
                        <span className={`font-bold ${passwordStrength.text}`}>{passwordStrength.label}</span>
                      </div>
                      <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${passwordStrength.color} transition-all duration-300`} 
                          style={{ width: `${passwordStrength.percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isChangingPwd || !newPassword || (hasCustomPassword && !oldPassword)}
                    className="w-full py-3.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[var(--accent)]/20 text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                  >
                    {isChangingPwd ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>
                      {isChangingPwd 
                        ? 'Salvataggio...' 
                        : hasCustomPassword 
                        ? 'Aggiorna Password Sensibili' 
                        : 'Imposta Password di Protezione'}
                    </span>
                  </button>
                </form>

                {/* Option to remove password (for 100% free startup) */}
                {hasCustomPassword && (
                  <div className="pt-3 border-t border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => setShowRemovePwdModal(true)}
                      disabled={isChangingPwd}
                      className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl font-bold transition-all border border-rose-500/20 flex items-center justify-center gap-2 text-xs active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Rimuovi Password dal Profilo (Avvio Libero Totale)</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'backup' && (
            <motion.div
              key="tab-backup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Esporta Backup ZIP Card */}
              <div className="bg-[var(--card-bg)] rounded-[var(--radius-lg)] p-5 sm:p-6 border border-[var(--border)] shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-[var(--border)]">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <FileArchive className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-main)]">Backup Completo Database (.ZIP)</h3>
                    <p className="text-xs text-[var(--text-muted)]">Salva l'intero archivio cifrato, inclusi rubrica contatti, scadenze e documenti</p>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Il file ZIP generato include <code className="px-1.5 py-0.5 rounded bg-[var(--surface-variant)] font-mono text-[11px]">profiles.enc</code>, tutti gli stati cifrati <code className="px-1.5 py-0.5 rounded bg-[var(--surface-variant)] font-mono text-[11px]">state_*.enc</code>, e i dati della rubrica/notifiche. Può essere custodito come copia di sicurezza o importato su qualsiasi dispositivo con Chelona.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <button
                    onClick={handleExportZip}
                    className="flex-1 py-3.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold transition-all shadow-md shadow-[var(--accent)]/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Esporta Backup ZIP</span>
                  </button>

                  <button
                    onClick={handleGenerateBackup}
                    className="flex-1 py-3.5 bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] rounded-xl font-bold transition-all border border-[var(--border)] flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-95 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-amber-500" />
                    <span>Trasferisci con QR</span>
                  </button>
                </div>
              </div>

              {/* Ripristina da File ZIP Card */}
              <div className="bg-[var(--card-bg)] rounded-[var(--radius-lg)] p-5 sm:p-6 border border-[var(--border)] shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-[var(--border)]">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-main)]">Ripristino da File ZIP</h3>
                    <p className="text-xs text-[var(--text-muted)]">Importa un backup precedente per ripristinare o migrare tutti i tuoi dati</p>
                  </div>
                </div>

                <div 
                  onClick={() => restoreZipInputRef.current?.click()}
                  className="p-6 rounded-2xl border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] bg-[var(--surface-variant)]/40 hover:bg-[var(--surface-variant)]/80 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-2 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform shadow-xs">
                    <FileArchive className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[var(--text-main)] block">Tocca per selezionare il file ZIP</span>
                    <span className="text-xs text-[var(--text-muted)] block mt-0.5">chelona_backup_YYYY-MM-DD.zip</span>
                  </div>
                </div>

                <input
                  ref={restoreZipInputRef}
                  type="file"
                  accept=".zip,application/zip"
                  className="hidden"
                  onChange={handleRestoreFileSelected}
                />
              </div>

              {/* Storage details & local stats */}
              <div className="bg-[var(--card-bg)] rounded-[var(--radius-lg)] p-5 sm:p-6 border border-[var(--border)] shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-main)]">Archiviazione Locale Dispositivo</h4>
                    <p className="text-xs text-[var(--text-muted)]">Tutti i dati risiedono esclusivamente nella sandbox crittografata del tuo telefono</p>
                  </div>
                </div>
                <div className="p-3 bg-[var(--surface-variant)]/60 rounded-xl border border-[var(--border)] flex items-center justify-between text-xs font-semibold">
                  <span className="text-[var(--text-muted)]">Stato sincronizzazione remota:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Zero cloud / 100% Locale</span>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'system' && (
            <motion.div
              key="tab-system"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Assistente Vocale "Ciao Chelona!" */}
              <div className="bg-[var(--card-bg)] rounded-[var(--radius-lg)] p-5 sm:p-6 border border-[var(--border)] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-[var(--text-main)] leading-tight">Comando Vocale "Ciao Chelona!"</h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">Attivazione a mani libere (100% on-device offline)</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleWakeWord}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shrink-0 active:scale-95 cursor-pointer ${
                    isWakeWordEnabled
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                      : 'bg-[var(--surface-variant)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {isWakeWordEnabled ? 'Disattiva' : 'Attiva'}
                </button>
              </div>

              {/* Notifiche & Promemoria Scadenze */}
              <div className="bg-[var(--card-bg)] rounded-[var(--radius-lg)] p-5 sm:p-6 border border-[var(--border)] shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-[var(--border)]">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-main)]">Notifiche & Promemoria Scadenze</h3>
                    <p className="text-xs text-[var(--text-muted)]">Avvisi automatici per bolli, tagliandi, rate e documenti</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <button
                    onClick={async () => {
                      const ok = await notificationService.requestPermission();
                      if (ok) {
                        showToast('Notifiche abilitate con successo! 🔔', 'success');
                      } else {
                        showToast('Permesso notifiche non concesso nelle impostazioni di sistema.', 'error');
                      }
                    }}
                    className="flex-1 py-3 bg-[var(--surface-variant)] text-[var(--text-main)] border border-[var(--border)] rounded-xl font-bold hover:bg-[var(--border)] transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-95 cursor-pointer"
                  >
                    <Bell className="w-4 h-4 text-indigo-500" />
                    <span>Verifica Permessi</span>
                  </button>

                  <button
                    onClick={async () => {
                      await notificationService.fire('Test Notifiche Chelona 🔔', 'Le notifiche funzionano perfettamente sul tuo dispositivo!');
                      showToast('Notifica di prova inviata!', 'success');
                    }}
                    className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-95 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Invia Notifica Test</span>
                  </button>
                </div>
              </div>

              {/* Informazioni App & Aggiornamenti */}
              <div className="bg-[var(--card-bg)] rounded-[var(--radius-lg)] p-5 sm:p-6 border border-[var(--border)] shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-4 pb-3 border-b border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[var(--accent-bg)] flex items-center justify-center text-[var(--accent)]">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-main)]">Versione & Aggiornamenti</h3>
                      <p className="text-xs text-[var(--text-muted)]">Rilascio ufficiale e controllo nuova build</p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-main)]">
                    v{APP_VERSION}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <button
                    onClick={handleCheckUpdates}
                    disabled={isCheckingUpdate}
                    className="w-full py-3.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold transition-all shadow-md shadow-[var(--accent)]/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wider active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isCheckingUpdate ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>{isCheckingUpdate ? 'Controllo in corso...' : 'Controlla Aggiornamenti'}</span>
                  </button>
                </div>
              </div>

              {/* Offline & Privacy Manifesto Card */}
              <div className="bg-[var(--surface-variant)]/50 rounded-[var(--radius-lg)] p-5 border border-[var(--border)] space-y-2">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Garanzia di Riservatezza Chelona</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Chelona è un'applicazione concepita per funzionare al 100% offline. I tuoi documenti, tessere, spese e note non vengono mai inviati a server esterni o terze parti. Sei tu l'unico proprietario delle tue chiavi di crittografia.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Logout / Cambia Profilo Button (con spaziatura pb-32 anti-sovrapposizione barra) ── */}
        <div className="pt-8 pb-32 flex justify-center">
          <button
            onClick={onLogout}
            className="w-full max-w-md py-4 px-6 bg-[var(--card-bg)] hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-xs active:scale-95 text-sm cursor-pointer group"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Esci / Cambia Profilo</span>
          </button>
        </div>
      </div>

      {/* ── MODAL: QR Code Backup (z-[200] per coprire la barra di navigazione inferiore z-[130]) ── */}
      <AnimatePresence>
        {showBackupQR && backupJSON && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBackupQR(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-sm sm:max-w-md bg-[var(--card-bg)] rounded-[32px] p-6 sm:p-8 shadow-2xl border border-[var(--border)] text-center overflow-hidden"
            >
              <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-4">
                <QrCode className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-1">Backup Rapido QR</h3>
              <p className="text-xs text-[var(--text-muted)] mb-5 px-2">
                Inquadra questo codice da un altro dispositivo per importare il profilo.
              </p>
              
              {backupJSON.length <= 2950 ? (
                <div className={`p-4 rounded-2xl border mx-auto w-fit mb-4 transition-all duration-300 shadow-xs ${
                  isAntiGlare ? 'bg-gray-200 border-gray-400' : 'bg-white border-[var(--border)]'
                }`}>
                  <QRCodeSVG 
                    value={backupJSON} 
                    size={240} 
                    level="L"
                    includeMargin={true}
                    bgColor={isAntiGlare ? "#e5e7eb" : "#FFFFFF"}
                    fgColor="#000000"
                    className="rounded-lg"
                  />
                </div>
              ) : (
                <div className="p-5 mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs space-y-2">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Dati estesi ({Math.round(backupJSON.length / 1024)} KB)</span>
                  </div>
                  <p>
                    Il volume dei dati archiviati supera la capacità ottica di un singolo QR code. Si consiglia di utilizzare il pulsante Copia Testo o il Backup ZIP.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 mb-6">
                {backupJSON.length <= 2950 && (
                  <button
                    type="button"
                    onClick={() => setIsAntiGlare(!isAntiGlare)}
                    className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                      isAntiGlare 
                        ? 'bg-amber-500 text-white shadow-sm' 
                        : 'bg-[var(--surface-variant)] text-[var(--text-muted)] border border-[var(--border)]'
                    }`}
                  >
                    <SunDim className={`w-3.5 h-3.5 ${isAntiGlare ? 'animate-pulse' : ''}`} />
                    <span>{isAntiGlare ? 'Anti-Abbaglio Attivo' : 'Riduci Abbaglio'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(backupJSON);
                    setIsCopiedPayload(true);
                    showToast('Codice backup copiato negli appunti!', 'success');
                    setTimeout(() => setIsCopiedPayload(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] border border-[var(--border)] flex items-center gap-1.5 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
                >
                  {isCopiedPayload ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopiedPayload ? 'Copiato!' : 'Copia Testo'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowBackupQR(false)}
                className="w-full py-3.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[var(--accent)]/20 active:scale-95 cursor-pointer"
              >
                Chiudi
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Conferma Rimuovi Password (z-[200] per coprire nav bar z-[130]) ── */}
      <AnimatePresence>
        {showRemovePwdModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRemovePwdModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-md bg-[var(--card-bg)] rounded-[32px] p-6 sm:p-8 shadow-2xl border border-[var(--border)] text-center space-y-4"
            >
              <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-main)]">Rimuovere la Password?</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Rimuovendo la password, tutti i moduli sensibili saranno accessibili direttamente in modalità "Avvio Libero" senza richiedere alcun codice o biometria. Potrai comunque reimpostare una password in qualsiasi momento.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRemovePwdModal(false)}
                  className="flex-1 py-3 bg-[var(--surface-variant)] text-[var(--text-main)] rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[var(--border)] transition-all cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemovePassword}
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-rose-500/20 active:scale-95 cursor-pointer"
                >
                  Sì, Rimuovi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Conferma Ripristino Backup ZIP (z-[200] per coprire nav bar z-[130]) ── */}
      <AnimatePresence>
        {showRestoreModal && pendingRestoreFile && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowRestoreModal(false); setPendingRestoreFile(null); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-md bg-[var(--card-bg)] rounded-[32px] p-6 sm:p-8 shadow-2xl border border-[var(--border)] text-center space-y-4"
            >
              <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mx-auto">
                <FileArchive className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-main)]">Ripristinare questo Backup?</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Stai per ripristinare il file <strong className="text-[var(--text-main)]">{pendingRestoreFile.name}</strong>. Questa operazione sovrascriverà i profili e gli stati correnti e riavvierà automaticamente Chelona.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowRestoreModal(false); setPendingRestoreFile(null); }}
                  className="flex-1 py-3 bg-[var(--surface-variant)] text-[var(--text-main)] rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[var(--border)] transition-all cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={confirmRestore}
                  className="flex-1 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[var(--accent)]/20 active:scale-95 cursor-pointer"
                >
                  Ripristina & Riavvia
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
