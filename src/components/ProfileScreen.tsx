import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Lock, Fingerprint, LogOut, Camera, Check, AlertCircle, Share2, Download, Copy, ShieldCheck, QrCode, SunDim, RefreshCw, LayoutDashboard, Plus, Sun, Moon } from 'lucide-react';
import { storage } from '../services/storage';
import { encryption } from '../services/encryption';
import { updateService } from '../services/updateService';
import { Module, Folder } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import packageJson from '../../package.json';

interface ProfileScreenProps {
  onClose: () => void;
  username: string;
  avatar?: string;
  onUpdateProfile: (name: string, avatar?: string) => void;
  isBioSupported: boolean;
  isBioEnabled: boolean;
  onEnableBiometrics: () => Promise<void>;
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
  isSandboxMode: boolean;
  onToggleSandbox: (val: boolean) => void;
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
  bioError,
  onLogout,
  encryptionKey,
  modules,
  folders,
  onEncryptionKeyChanged,
  showToast,
  pinnedCategoryIds,
  pinnedToolIds,
  onUpdateWidgets,
  isSandboxMode,
  onToggleSandbox,
  theme,
  onToggleTheme
}: ProfileScreenProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'widgets'>('profile');
  
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

    const encryptedData = localStorage.getItem(`chelona_dashboard_state_enc_${currentProfileId}`);
    
    const backup = {
      t: 'chelona_profile_backup',
      v: '1.0',
      p: profile,
      d: encryptedData
    };

    const json = JSON.stringify(backup);
    if (json.length > 2900) {
      alert("Attenzione: I dati nel profilo sono troppi per essere salvati in un singolo QR code. Il backup potrebbe essere parziale o illeggibile. Si consiglia di esportare i dati in formato file (Prossimamente).");
    }
    setBackupJSON(json);
    setShowBackupQR(true);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onUpdateProfile(editName, base64);
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
      
      storage.saveProfiles(profiles.map(p => p.id === currentProfileId ? updatedProfile : p));

      // Risalva lo stato con la nuova chiave
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

        <div className="flex bg-[var(--surface-variant)] p-1 rounded-full mb-6 mx-6 mt-6 border border-[var(--border)]/30">
          {[
            { id: 'profile', label: 'Informazioni' },
            { id: 'security', label: 'Sicurezza' },
            { id: 'widgets', label: 'Personalizza' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-full transition-all duration-300 ${activeTab === tab.id ? 'bg-[var(--accent-container)] text-[var(--accent-on-container)] shadow-sm' : 'text-[var(--text-muted)] hover:bg-[var(--bg)]/50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pb-40 space-y-6 px-6 custom-scrollbar">
          {activeTab === 'profile' ? (
            <div className="bg-[var(--surface-variant)]/50 rounded-[var(--radius-lg)] p-5 lg:p-6 border border-[var(--border)] shadow-sm space-y-5">
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

              <div className="flex-1 space-y-4">
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
          ) : activeTab === 'security' ? (
            <div className="space-y-4">
              <div className="bg-[var(--card-bg)] rounded-3xl p-5 lg:p-6 border border-[var(--border)] shadow-sm space-y-4">
                <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4 mb-2">
                  <div className="w-10 h-10 bg-[var(--accent-hover)]/10 rounded-2xl flex items-center justify-center text-[var(--accent)] shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-main)] leading-tight">Cambia Password</h3>
                    <p className="text-xs text-[var(--text-muted)]">Aggiorna la chiave (disabiliterà la biometria)</p>
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

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <input
                      type="password"
                      placeholder="Password Attuale"
                      required
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all text-[var(--text-main)]"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder="Nuova Password"
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all text-[var(--text-main)]"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder="Conferma Nuova Password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all text-[var(--text-main)]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isChangingPwd}
                    className="w-full py-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-2xl font-bold transition-all disabled:opacity-50 mt-2 shadow-lg shadow-amber-600/20"
                  >
                    {isChangingPwd ? 'Aggiornamento in corso...' : 'Aggiorna Password'}
                  </button>
                </form>
              </div>

              <div className="bg-[var(--card-bg)] rounded-3xl p-5 lg:p-6 border border-[var(--border)] shadow-sm space-y-4 relative overflow-hidden">
                <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4 mb-2">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner shrink-0">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-[var(--text-main)] leading-tight">Sblocco Biometrico</h3>
                    <p className="text-[10px] text-[var(--text-muted)] font-medium leading-relaxed mt-0.5">Configura l'impronta digitale per accesso rapido.</p>
                  </div>
                  {isBioSupported && (
                    <button
                      onClick={isBioEnabled ? undefined : onEnableBiometrics}
                      disabled={isBioEnabled}
                      className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isBioEnabled ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 cursor-default' : 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20 active:scale-95'}`}
                    >
                      {isBioEnabled ? 'Attivo' : 'Attiva'}
                    </button>
                  )}
                </div>

                {/* MODALITÀ SCUSA (SANDBOX) */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-[var(--text-main)] text-indigo-600 leading-tight">Modalità Scusa</h3>
                    <p className="text-[10px] text-[var(--text-muted)] font-medium leading-relaxed mt-0.5">Livello di dati finti per privacy in pubblico.</p>
                  </div>
                  <button
                    onClick={() => onToggleSandbox(!isSandboxMode)}
                    className={`w-14 h-8 rounded-full relative transition-all duration-300 ${isSandboxMode ? 'bg-indigo-600' : 'bg-[var(--border)]'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-all duration-300 ${isSandboxMode ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
                {isBioEnabled && (
                  <div className="mt-4 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-700">Autocompilazione Master Key attiva tramite impronta.</span>
                  </div>
                )}
                {bioError && (
                  <div className="p-4 bg-red-500/5 text-red-600 text-[11px] font-bold rounded-2xl border border-red-500/10 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {bioError}
                  </div>
                )}
              </div>

              <div className="bg-[var(--card-bg)] rounded-3xl p-5 lg:p-6 border border-[var(--border)] shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-[var(--accent-hover)]/10 rounded-2xl flex items-center justify-center text-[var(--accent)] shrink-0">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-main)] leading-tight">Backup e Aggiornamenti</h3>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Trasferimenti e nuove versioni</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleGenerateBackup}
                      className="px-6 py-3 bg-[var(--bg)] text-[var(--text-main)] border border-[var(--border)] rounded-xl font-bold hover:bg-[var(--border)] transition-all flex items-center gap-2 shadow-sm"
                    >
                      <QrCode className="w-5 h-5" />
                      Backup QR
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          import('../services/updateService').then(async (m) => {
                            const info = await m.updateService.checkForUpdates();
                            if (info && info.available) {
                              // We need to pass this back to App somehow or show it here.
                              // For simplicity, we'll trigger a reload or use a custom event.
                              window.dispatchEvent(new CustomEvent('chelona_update_available', { detail: info }));
                            } else {
                              showToast('L\'app è già aggiornata!', 'info');
                            }
                          });
                        } catch (e) {
                          showToast('Errore durante il controllo aggiornamenti', 'error');
                        }
                      }}
                      className="px-6 py-3 bg-[var(--accent)] text-white rounded-xl font-bold hover:bg-[var(--accent-hover)] transition-all flex items-center gap-2 shadow-lg shadow-amber-600/20"
                    >
                      <Download className="w-5 h-5" />
                      Aggiorna
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-6 border-t border-[var(--border)] text-center">
                   <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">Versione Chelona: {packageJson.version}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
               <div className="bg-[var(--card-bg)] rounded-3xl p-6 lg:p-8 border border-[var(--border)] shadow-sm space-y-6">
                 <div className="flex items-center gap-4 border-b border-[var(--border)] pb-6 mb-2">
                   <div className="w-12 h-12 bg-[var(--accent-hover)]/10 rounded-2xl flex items-center justify-center text-[var(--accent)]">
                     <LayoutDashboard className="w-6 h-6" />
                   </div>
                   <div>
                     <h3 className="text-lg font-bold text-[var(--text-main)]">Gestione Widget</h3>
                     <p className="text-sm text-[var(--text-muted)]">Scegli quali categorie o strumenti avere in Home</p>
                   </div>
                 </div>

                 <div className="space-y-8">
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">Categorie Appuntate</p>
                     <div className="grid grid-cols-2 gap-3">
                       {['generic', 'auto', 'document', 'split'].map(catId => {
                         const isPinned = pinnedCategoryIds.includes(catId);
                         return (
                           <button
                             key={catId}
                             onClick={() => {
                               const next = isPinned ? pinnedCategoryIds.filter(id => id !== catId) : [...pinnedCategoryIds, catId];
                               onUpdateWidgets(next, pinnedToolIds);
                             }}
                             className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${isPinned ? 'bg-[var(--accent-bg)] border-[var(--accent)]' : 'bg-[var(--bg)] border-[var(--border)] hover:border-[var(--text-muted)]'}`}
                           >
                             <span className={`text-sm font-bold ${isPinned ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>{catId.charAt(0).toUpperCase() + catId.slice(1)}</span>
                             {isPinned ? <Check className="w-4 h-4 text-[var(--accent)]" /> : <Plus className="w-4 h-4 text-[var(--text-muted)] opacity-50" />}
                           </button>
                         );
                       })}
                     </div>
                   </div>

                   <div>
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">Strumenti Appuntati</p>
                     <div className="grid grid-cols-2 gap-3">
                       {['scanner', 'archive', 'qr_gen', 'unit_conv', 'expense_stats'].map(toolId => {
                         const isPinned = pinnedToolIds.includes(toolId);
                         return (
                           <button
                             key={toolId}
                             onClick={() => {
                               const next = isPinned ? pinnedToolIds.filter(id => id !== toolId) : [...pinnedToolIds, toolId];
                               onUpdateWidgets(pinnedCategoryIds, next);
                             }}
                             className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${isPinned ? 'bg-[var(--accent-bg)] border-[var(--accent)]' : 'bg-[var(--bg)] border-[var(--border)] hover:border-[var(--text-muted)]'}`}
                           >
                             <span className={`text-sm font-bold ${isPinned ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>{toolId.replace('_', ' ').toUpperCase()}</span>
                             {isPinned ? <Check className="w-4 h-4 text-[var(--accent)]" /> : <Plus className="w-4 h-4 text-[var(--text-muted)] opacity-50" />}
                           </button>
                         );
                       })}
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          )}
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
