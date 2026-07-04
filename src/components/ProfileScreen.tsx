import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Lock, Fingerprint, LogOut, Camera, Check, AlertCircle, Share2, Download, Copy, ShieldCheck, QrCode, SunDim, RefreshCw, LayoutDashboard, Plus, Sun, Moon, FileArchive } from 'lucide-react';
import { storage } from '../services/storage';
import { encryption } from '../services/encryption';
import { updateService } from '../services/updateService';
import { Module, Folder } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import packageJson from '../../package.json';
import JSZip from 'jszip';
import { lzw } from '../utils/lzw';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

interface ProfileScreenProps {
  onClose: () => void;
  username: string;
  avatar?: string;
  onUpdateProfile: (name: string, avatar?: string) => void;
  isBioSupported: boolean;
  isBioEnabled: boolean;
  onEnableBiometrics: () => Promise<void>;
  onDisableBiometrics: () => Promise<void>;
  bioError: string | null;
  biometricLevel?: 'app' | 'sensitive' | 'both';
  onChangeBiometricLevel: (level: 'app' | 'sensitive' | 'both') => void;
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
  biometricLevel = 'app',
  onChangeBiometricLevel,
  onLogout,
  encryptionKey,
  modules,
  folders,
  onEncryptionKeyChanged,
  showToast,
  pinnedCategoryIds,
  pinnedToolIds,
  onUpdateWidgets,
  theme,
  onToggleTheme
}: ProfileScreenProps) {
  const [editName, setEditName] = useState(username);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  
  const [showBackupQR, setShowBackupQR] = useState(false);
  const [backupJSON, setBackupJSON] = useState<string | null>(null);
  const [isAntiGlare, setIsAntiGlare] = useState(false);

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
    if (compressed.length > 2900) {
      alert("Attenzione: I dati nel profilo sono molto grandi. Se il QR Code è troppo denso per la scansione, si raccomanda di utilizzare l'opzione Esporta ZIP.");
    }
    setBackupJSON(compressed);
    setShowBackupQR(true);
  };

  const handleExportZip = async () => {
    try {
      const zip = new JSZip();
      
      const profilesEnc = storage.getRawProfiles();
      if (!profilesEnc) {
        showToast('Nessun profilo da esportare', 'error');
        return;
      }
      
      zip.file('profiles.enc', profilesEnc);
      
      const profiles = storage.loadProfiles();
      for (const p of profiles) {
        const stateEnc = storage.getRawState(p.id);
        if (stateEnc) {
          zip.file(`state_${p.id}.enc`, stateEnc);
        }
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const dateStr = new Date().toISOString().substring(0, 10);
      const filename = `chelona_backup_${dateStr}.zip`;
      
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
        const maxDim = 200;
        
        // Calculate square center crop
        const size = Math.min(img.width, img.height);
        const xOffset = (img.width - size) / 2;
        const yOffset = (img.height - size) / 2;
        
        canvas.width = maxDim;
        canvas.height = maxDim;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, xOffset, yOffset, size, size, 0, 0, maxDim, maxDim);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          onUpdateProfile(editName, compressedBase64);
        } else {
          onUpdateProfile(editName, event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    onUpdateProfile(editName, avatar);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (newPassword !== confirmPassword) {
      setPwdError('Le nuove password non coincidono');
      return;
    }

    if (newPassword.length < 6) {
      setPwdError('La password deve essere di almeno 6 caratteri');
      return;
    }

    try {
      setIsChangingPwd(true);
      const profiles = storage.loadProfiles();
      const profile = profiles.find(p => p.id === currentProfileId);
      if (!profile) throw new Error('Profilo non trovato');

      // Verifica vecchia password
      const oldHashAttempt = await encryption.hashPassword(oldPassword, profile.salt);
      if (oldHashAttempt !== profile.passwordHash) {
        setPwdError('Password attuale non corretta');
        setIsChangingPwd(false);
        return;
      }

      // Generato nuovo salt e hash
      const newSalt = encryption.generateSalt();
      const newHash = await encryption.hashPassword(newPassword, newSalt);
      
      // Derivo la nuova chiave crittografica
      const newKey = await encryption.deriveKey(newPassword, newSalt);

      // Salvo config (disabilitando biometry perché è legato alla vecchia password/chiave, dovrà riattivarla)
      const updatedProfile = {
        ...profile,
        passwordHash: newHash,
        salt: newSalt,
        isBiometricEnabled: false,
        credentialId: undefined,
        encryptedMasterKey: undefined,
        bioSalt: undefined
      };
      
      const updatedProfiles = profiles.map(p => p.id === currentProfileId ? updatedProfile : p);
      storage.saveProfiles(updatedProfiles);
      
      // Se c'era una chiave di auto-login per la modalità sensitive, va rimossa perché la chiave è cambiata
      localStorage.removeItem('chelona_auto_key_' + currentProfileId);

      // Re-cifra lo stato con la nuova chiave
      await storage.saveState({ modules, folders }, newKey, currentProfileId);

      // Aggiorna chiave in App
      onEncryptionKeyChanged(newKey);
      
      setPwdSuccess('Password aggiornata con successo! (La biometria è stata disattivata per sicurezza)');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setPwdError(e.message || 'Errore durante il cambio password');
    } finally {
      setIsChangingPwd(false);
    }
  };

  const profileAvatar = avatar || `https://ui-avatars.com/api/?name=${username}&background=FFFBEB&color=B45309&size=200`;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--bg)]">
      <div 
        className="w-full max-w-2xl mx-auto flex-1 flex flex-col overflow-hidden"
      >
        <header className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card-bg)] shrink-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-[var(--text-main)]">Il Tuo Profilo</h2>
            <button 
              onClick={onToggleTheme}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] bg-[var(--bg)] rounded-xl transition-all border border-[var(--border)]"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-[var(--accent)]" />}
            </button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg)] rounded-xl transition-colors text-[var(--text-muted)]">
            <X className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Profilo */}
            <div className="bg-[var(--surface-variant)]/50 rounded-[var(--radius-lg)] p-5 lg:p-6 border border-[var(--border)] shadow-sm space-y-5 h-fit">
              <div className="flex flex-col items-center">
                <div 
                  onClick={handleAvatarClick}
                  className="relative group cursor-pointer"
                >
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[var(--bg)] shadow-lg bg-[var(--accent-bg)]">
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[var(--accent)] text-white text-4xl font-bold">
                        {username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[var(--accent)] rounded-full border-4 border-[var(--card-bg)] flex items-center justify-center text-white shadow-sm">
                    <Camera className="w-4 h-4" />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/png, image/jpeg" 
                />
                <p className="mt-4 text-sm text-[var(--text-muted)] font-medium">Tocca per cambiare foto</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[var(--text-muted)] mb-2">Username</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-amber-500 transition-all text-[var(--text-main)]"
                  />
                </div>

                <button
                  onClick={saveProfile}
                  className="w-full py-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-2xl font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Salva Modifiche
                </button>
              </div>
            </div>

            {/* Sicurezza e Backup */}
            <div className="space-y-6">
              <div className="bg-[var(--card-bg)] rounded-[var(--radius-lg)] p-5 lg:p-6 border border-[var(--border)] shadow-sm space-y-4">
                <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4 mb-2">
                  <div className="w-10 h-10 bg-[var(--accent-hover)]/10 rounded-2xl flex items-center justify-center text-[var(--accent)] shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-main)] leading-tight">Cambia Password</h3>
                    <p className="text-xs text-[var(--text-muted)]">Aggiorna la chiave crittografica</p>
                  </div>
                </div>

                {pwdError && (
                  <div className="p-4 rounded-2xl flex items-center gap-3 text-sm font-medium" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{pwdError}</p>
                  </div>
                )}
                {pwdSuccess && (
                  <div className="p-4 rounded-2xl flex items-center gap-3 text-sm font-medium" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                    <Check className="w-5 h-5 shrink-0" />
                    <p>{pwdSuccess}</p>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3">
                  <input
                    type="password"
                    placeholder="Password Attuale"
                    required
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-amber-500 transition-all text-[var(--text-main)] text-sm"
                  />
                  <div className="flex gap-3">
                    <input
                      type="password"
                      placeholder="Nuova"
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-amber-500 transition-all text-[var(--text-main)] text-sm"
                    />
                    <input
                      type="password"
                      placeholder="Conferma"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:border-amber-500 transition-all text-[var(--text-main)] text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isChangingPwd}
                    className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-md shadow-amber-600/20 text-sm"
                  >
                    {isChangingPwd ? 'Aggiornamento...' : 'Aggiorna Password'}
                  </button>
                </form>
              </div>

              <div className="bg-[var(--card-bg)] rounded-[var(--radius-lg)] p-5 border border-[var(--border)] shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner shrink-0">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-main)] leading-tight">Sblocco Biometrico</h3>
                    <p className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5">Accesso rapido</p>
                  </div>
                </div>
                {isBioSupported && (
                  <div className="flex items-center gap-2">
                    {isBioEnabled ? (
                      <>
                        <button
                          onClick={onEnableBiometrics}
                          className="px-3 py-2 bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-[var(--border)] active:scale-95"
                          title="Aggiorna impronta o dispositivo biometrico"
                        >
                          Aggiorna
                        </button>
                        <button
                          onClick={onDisableBiometrics}
                          className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-red-500/20 active:scale-95"
                          title="Disattiva sblocco biometrico"
                        >
                          Disattiva
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={onEnableBiometrics}
                        className="px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20 active:scale-95"
                      >
                        Attiva
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isBioSupported && isBioEnabled && (
                <div className="bg-[var(--card-bg)] rounded-[var(--radius-lg)] p-5 border border-[var(--border)] shadow-sm">
                  <label className="block text-sm font-bold text-[var(--text-main)] mb-1">
                    Livello di Protezione
                  </label>
                  <p className="text-[10px] text-[var(--text-muted)] mb-3">Scegli dove richiedere l'autenticazione biometrica.</p>
                  <select
                    value={biometricLevel}
                    onChange={(e) => onChangeBiometricLevel(e.target.value as 'app' | 'sensitive' | 'both')}
                    className="w-full bg-[var(--surface-variant)] border border-[var(--border)] text-[var(--text-main)] rounded-xl px-4 py-3 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  >
                    <option value="app">Sblocca solo l'App all'avvio (Predefinito)</option>
                    <option value="both">Sblocca App + Moduli Sensibili</option>
                    <option value="sensitive">Sblocca SOLO i Moduli Sensibili</option>
                  </select>
                  {biometricLevel === 'sensitive' && (
                    <p className="mt-3 text-[11px] text-amber-500 font-medium leading-relaxed bg-amber-500/10 p-3 rounded-xl">
                      ⚠️ Attenzione: con questa opzione l'app si avvierà <strong>automaticamente senza chiedere password o impronta</strong>. L'impronta sarà richiesta <strong>SOLO</strong> per aprire i moduli sensibili (Auto, Documenti, ecc).
                    </p>
                  )}
                </div>
              )}

              <div className="bg-[var(--card-bg)] rounded-[var(--radius-lg)] p-5 border border-[var(--border)] shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[var(--accent-hover)]/10 rounded-2xl flex items-center justify-center text-[var(--accent)] shrink-0">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-main)] leading-tight">Backup e Aggiornamenti</h3>
                    <p className="text-[10px] text-[var(--text-muted)]">Trasferimenti e nuove versioni ({packageJson.version})</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <button
                    onClick={handleGenerateBackup}
                    className="flex-1 py-3 bg-[var(--bg)] text-[var(--text-main)] border border-[var(--border)] rounded-xl font-bold hover:bg-[var(--border)] transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <QrCode className="w-4 h-4" />
                    Backup QR
                  </button>
                  <button
                    onClick={handleExportZip}
                    className="flex-1 py-3 bg-[var(--bg)] text-[var(--text-main)] border border-[var(--border)] rounded-xl font-bold hover:bg-[var(--border)] transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <FileArchive className="w-4 h-4 text-amber-500" />
                    Backup ZIP
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        import('../services/updateService').then(async (m) => {
                          const info = await m.updateService.checkForUpdates();
                          if (info && info.available) {
                            window.dispatchEvent(new CustomEvent('chelona_update_available', { detail: info }));
                          } else {
                            showToast('L\'app è già aggiornata!', 'info');
                          }
                        });
                      } catch (e) {
                        showToast('Errore durante il controllo', 'error');
                      }
                    }}
                    className="flex-1 py-3 bg-[var(--accent)] text-white rounded-xl font-bold hover:bg-[var(--accent-hover)] transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Aggiorna
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showBackupQR && backupJSON && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 lg:p-8">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowBackupQR(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md bg-[var(--card-bg)] rounded-[32px] p-8 lg:p-10 shadow-2xl overflow-hidden text-center border border-[var(--border)]"
              >
                <div className="w-16 h-16 bg-[var(--accent-hover)]/10 rounded-2xl flex items-center justify-center text-[var(--accent)] mx-auto mb-6">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-[var(--text-main)] mb-2">Il tuo Backup</h3>
                <p className="text-[var(--text-muted)] mb-8 px-4">Scansiona questo codice con Chelona su un altro dispositivo per importare il profilo.</p>
                
                <div className={`p-6 rounded-3xl border mx-auto w-fit mb-4 shadow-inner transition-all duration-500 ${isAntiGlare ? 'bg-gray-300 border-gray-400' : 'bg-[var(--card-bg)] border-[var(--border)]'}`}>
                  <QRCodeSVG 
                    value={backupJSON} 
                    size={280} 
                    level="L" // Low error correction to maximize capacity
                    includeMargin={true}
                    bgColor={isAntiGlare ? "#d1d5db" : "#FFFFFF"}
                    fgColor="#000000"
                    className="rounded-xl transition-all duration-500"
                  />
                </div>

                <div className="flex justify-center mb-8">
                  <button
                    onClick={() => setIsAntiGlare(!isAntiGlare)}
                    className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                      isAntiGlare 
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                      : 'bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)]'
                    }`}
                  >
                    <SunDim className={`w-3.5 h-3.5 ${isAntiGlare ? 'animate-pulse' : ''}`} />
                    {isAntiGlare ? 'Anti-Abbaglio Attivo' : 'Riduci Abbaglio'}
                  </button>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setShowBackupQR(false)}
                    className="w-full py-4 bg-[var(--accent)] text-white rounded-2xl font-bold hover:bg-[var(--accent-hover)] transition-all shadow-lg shadow-amber-500/20"
                  >
                    Fatto
                  </button>
                  <div className="flex items-center gap-3 justify-center text-xs font-bold text-[var(--text-muted)] p-4 bg-[var(--bg)] rounded-xl uppercase tracking-widest leading-loose">
                     <AlertCircle className="w-4 h-4 text-amber-500" />
                     I dati sono protetti dalla tua password
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="p-6 pb-32 border-t border-[var(--border)] mt-auto bg-[var(--card-bg)] shrink-0">
          <button
            onClick={onLogout}
            className="w-full py-5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-xl"
          >
            <Lock className="w-5 h-5" />
            Blocca App e Disconnetti
          </button>  
        </div>
      </div>
    </div>
  );
}
