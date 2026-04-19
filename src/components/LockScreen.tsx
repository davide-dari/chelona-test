import React, { useState, useEffect, useRef } from 'react';
import { Lock, Fingerprint, ArrowRight, KeyRound, AlertCircle, User, Loader2, Plus, ArrowLeft, QrCode, Wrench, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from '../services/storage';
import { encryption } from '../services/encryption';
import { biometricService } from '../services/biometricService';
import { ProfileConfig } from '../types';
import packageJson from '../../package.json';

interface LockScreenProps {
  isVisible?: boolean;
  onAuthenticated: (key: CryptoKey, profileId: string) => void;
  onStartScan: () => void;
  onOpenTools: () => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCheckUpdate?: () => void;
}

export const LockScreen = ({ isVisible, onAuthenticated, onStartScan, onOpenTools, onImportFile, onCheckUpdate }: LockScreenProps) => {
  const [profiles, setProfiles] = useState<ProfileConfig[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ProfileConfig | null>(null);
  const [view, setView] = useState<'selector' | 'login' | 'setup'>('selector');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isBioRequested, setIsBioRequested] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isBioSupported, setIsBioSupported] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0); // 0: Welcome, 1: Privacy, 2: Setup
  const autoBioTriggered = useRef<string | null>(null);

  const refreshProfiles = (currentView?: string) => {
    const loadedProfiles = storage.loadProfiles();
    setProfiles(loadedProfiles);
    
    // SAFETY: If profiles exist, skip onboarding sequences
    if (loadedProfiles.length > 0) {
      const activeView = currentView || view;
      if (activeView === 'setup') {
        setView('selector');
      } else if (activeView === 'selector' && loadedProfiles.length === 1) {
        // If only 1 profile exists, go straight to login for it
        setSelectedProfile(loadedProfiles[0]);
        setView('login');
      }
    }
  };

  useEffect(() => {
    if (isVisible) {
      setPassword('');
      setError('');
      refreshProfiles();
    }
  }, [isVisible]);

  useEffect(() => {
    if (!window.crypto || !window.crypto.subtle || !window.isSecureContext) {
      setError('Errore di Sicurezza: Questa app richiede una connessione sicura (HTTPS o localhost) per far funzionare la crittografia e la fotocamera.');
    }
    
    refreshProfiles();
    window.addEventListener('chelona_profiles_updated', () => refreshProfiles());
    biometricService.isSupported().then(setIsBioSupported);
    
    // Controllo aggiornamenti all'arrivo nel login - Rimosso su richiesta utente
    // if (onCheckUpdate) onCheckUpdate();

    return () => window.removeEventListener('chelona_profiles_updated', () => refreshProfiles());
  }, []);

  // Automatic biometric trigger when entering login view
  useEffect(() => {
    if (view === 'login' && selectedProfile?.isBiometricEnabled && autoBioTriggered.current !== selectedProfile.id) {
      console.log('[LockScreen] Auto-triggering biometrics for:', selectedProfile.username);
      autoBioTriggered.current = selectedProfile.id;
      handleBiometricLogin();
    } else if (view !== 'login') {
      // Reset trigger tracker when leaving login view
      autoBioTriggered.current = null;
    }
  }, [view, selectedProfile]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length < 2) {
      setError('Inserisci un nome valido.');
      return;
    }
    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Le password non coincidono.');
      return;
    }

    setIsLoading(true);
    try {
      const salt = encryption.generateSalt();
      const passwordHash = await encryption.hashPassword(password, salt);
      const newConfig: ProfileConfig = {
        id: Math.random().toString(36).substr(2, 9),
        username: username.trim(),
        passwordHash,
        salt,
        isBiometricEnabled: false
      };

      const updatedProfiles = [...profiles, newConfig];
      storage.saveProfiles(updatedProfiles);
      
      const key = await encryption.deriveKey(password, salt);
      
      // REGISTER BIOMETRICS IF REQUESTED
      if (isBioRequested && isBioSupported) {
        try {
          const m = await import('../services/biometricService');
          if (true) { // Proceed directly to setCredentials
            const masterKeyStr = await encryption.exportKey(key);
            await m.biometricService.saveMasterKey(newConfig.id, masterKeyStr);
            // Update the profile to indicate biometrics are enabled
            newConfig.isBiometricEnabled = true;
            storage.saveProfiles(updatedProfiles);
          }
        } catch (bioErr) {
          console.error('[LockScreen] Biometric registration failed during setup:', bioErr);
          // Non-blocking error, profile is still created
        }
      }

      setPassword('');
      setConfirmPassword('');
      setUsername('');
      onAuthenticated(key, newConfig.id);
    } catch (err: any) {
      console.error(err);
      setError('Errore durante la configurazione: ' + (err?.message || String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;

    setIsLoading(true);
    try {
      const hash = await encryption.hashPassword(password, selectedProfile.salt);
      if (hash === selectedProfile.passwordHash) {
        const key = await encryption.deriveKey(password, selectedProfile.salt);
        setPassword('');
        onAuthenticated(key, selectedProfile.id);
      } else {
        setError('Password errata.');
        setPassword('');
      }
    } catch (err: any) {
      console.error(err);
      setError("Errore durante l'accesso: " + (err?.message || String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!selectedProfile?.isBiometricEnabled) {
      setError('Biometria non abilitata per questo profilo.');
      return;
    }
    
    setIsLoading(true);
    try {
      const m = await import('../services/biometricService');
      
      // STEP 1: Explicit Physical Hardware Verification
      // This forces the OS to show the native prompt and wait for a real scan
      const verified = await m.biometricService.verifyIdentity('Accedi al tuo profilo sicuro.');
      if (!verified) {
        setError('Verifica hardware fallita. Usa l\'impronta fisica sul sensore.');
        setIsLoading(false);
        return;
      }

      // STEP 2: Retrieve the master key from the secure store
      const masterKeyStr = await m.biometricService.getMasterKey(selectedProfile.id);
      
      if (masterKeyStr) {
        const masterKey = await encryption.importKey(masterKeyStr);
        onAuthenticated(masterKey, selectedProfile.id);
      } else {
        setError('Impossibile recuperare la chiave di sicurezza.');
      }
    } catch (err: any) {
      console.error('[LockScreen] Biometric login error:', err);
      setError(err.message || "Errore durante l'accesso biometrico.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    storage.clearAll();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-[var(--bg)] flex items-center justify-center p-4 z-[100] overflow-y-auto transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`bg-[var(--card-bg)] rounded-[var(--radius-lg)] shadow-2xl p-6 sm:p-10 w-full ${view === 'selector' ? 'max-w-2xl' : 'max-w-md'} border border-[var(--border)] my-auto transition-all`}
      >
        <AnimatePresence mode="wait">
          {showResetConfirm ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-[var(--danger-bg)] rounded-2xl flex items-center justify-center text-[var(--danger)] mx-auto mb-6">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-main)] mb-2">Sei sicuro?</h2>
              <p className="text-[var(--text-muted)] text-sm mb-8">
                Questa azione cancellerà permanentemente TUTTI i profili e i dati salvati. Non potrai più recuperarli.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleReset}
                  className="w-full py-4 bg-[var(--danger)] hover:bg-red-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/20"
                >
                  Sì, cancella tutto
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="w-full py-4 bg-[var(--bg)] hover:bg-[var(--border)] text-[var(--text-muted)] rounded-2xl font-bold transition-all border border-[var(--border)]"
                >
                  Annulla
                </button>
              </div>
            </motion.div>
          ) : view === 'selector' ? (
            <motion.div
              key="selector"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-main)]">
                  {profiles.length > 0 ? 'Chi sta guardando?' : 'Benvenuto su Chelona'}
                </h1>
                <p className="text-[var(--text-muted)] mt-2">
                  {profiles.length > 0 
                    ? 'Seleziona il tuo profilo per accedere ai tuoi dati protetti.' 
                    : 'Crea un profilo o usa gli strumenti rapidi per iniziare.'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 justify-center">
                {profiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProfile(p); setError(''); setPassword(''); setView('login'); }}
                    className="flex flex-col items-center p-6 bg-[var(--surface-variant)] rounded-[var(--radius-lg)] border border-[var(--border)] transition-all group hover:scale-[1.02] shadow-sm"
                  >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[var(--bg)] overflow-hidden mb-4 group-hover:shadow-md transition-all border-2 border-[var(--border)] flex items-center justify-center">
                      {p.avatar ? (
                        <img src={p.avatar} alt={p.username} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 text-[var(--accent)]" />
                      )}
                    </div>
                    <span className="font-bold text-[var(--text-main)] transition-colors text-base sm:text-lg truncate w-full text-center">{p.username}</span>
                  </button>
                ))}

                <button
                  onClick={() => { setError(''); setUsername(''); setPassword(''); setConfirmPassword(''); setView('setup'); }}
                  className="flex flex-col items-center p-6 bg-transparent rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border)] hover:bg-[var(--surface-variant)] transition-all group"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[var(--surface-variant)] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-sm">
                    <Plus className="w-10 h-10 text-[var(--text-muted)]" />
                  </div>
                  <span className="font-bold text-[var(--text-muted)] text-base sm:text-lg">Nuovo Profilo</span>
                </button>

                <button
                  onClick={onStartScan}
                  className="flex flex-col items-center p-6 rounded-3xl border transition-all group lg:col-span-1 col-span-2 sm:col-span-1"
                  style={{ backgroundColor: 'var(--info-bg)', borderColor: 'rgba(96, 165, 250, 0.2)' }}
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[var(--card-bg)] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-sm border border-[var(--border)]">
                    <QrCode className="w-10 h-10" style={{ color: 'var(--info)' }} />
                  </div>
                  <span className="font-bold text-base sm:text-lg" style={{ color: 'var(--info)' }}>Importa QR</span>
                </button>

                <label 
                  className="flex flex-col items-center p-6 rounded-3xl border transition-all group lg:col-span-1 col-span-2 sm:col-span-1 cursor-pointer"
                  style={{ backgroundColor: 'var(--warning-bg)', borderColor: 'rgba(251, 113, 133, 0.2)' }}
                >
                  <input type="file" accept=".zip,.sandme,.lifemod" className="hidden" onChange={onImportFile} />
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[var(--card-bg)] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-sm border border-[var(--border)]">
                    <FileDown className="w-10 h-10" style={{ color: 'var(--warning)' }} />
                  </div>
                  <span className="font-bold text-base sm:text-lg" style={{ color: 'var(--warning)' }}>Importa File</span>
                </label>

                <button
                  onClick={onOpenTools}
                  className="flex flex-col items-center p-6 rounded-3xl border transition-all group lg:col-span-1 col-span-2 sm:col-span-3 shadow-md"
                  style={{ backgroundColor: 'var(--success-bg)', borderColor: 'rgba(52, 211, 153, 0.2)' }}
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[var(--card-bg)] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-sm border border-[var(--border)]">
                    <Wrench className="w-10 h-10" style={{ color: 'var(--success)' }} />
                  </div>
                  <span className="font-bold text-base sm:text-lg" style={{ color: 'var(--success)' }}>Strumenti Rapidi</span>
                </button>
              </div>

              <div className="mt-12 pt-8 border-t border-[var(--border)] flex flex-col items-center gap-4">
                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="text-[10px] uppercase tracking-widest text-red-400/50 hover:text-red-500 transition-colors font-black"
                >
                  Resetta Applicazione
                </button>
                
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg)] rounded-full border border-[var(--border)] shadow-sm">
                   <span className="text-[10px] font-bold text-[var(--text-muted)]">Versione {packageJson.version}</span>
                   <div className="w-1 h-1 rounded-full bg-[var(--border)]" />
                   <button 
                    onClick={() => onCheckUpdate?.()}
                    className="text-[10px] font-bold text-amber-500 hover:text-amber-600 transition-colors uppercase flex items-center gap-1"
                   >
                     Cerca aggiornamenti
                   </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="auth"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {profiles.length === 0 && onboardingStep < 2 ? (
                <div className="flex flex-col items-center py-4">
                  <AnimatePresence mode="wait">
                    {onboardingStep === 0 && (
                      <motion.div 
                        key="step0"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="flex flex-col items-center text-center"
                      >
                        <div className="w-24 h-24 bg-[var(--accent)] rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-[var(--accent)]/30 mb-8 relative">
                            <Lock className="w-12 h-12 relative z-10" />
                        </div>
                        <h1 className="text-3xl font-black text-[var(--text-main)] mb-4 tracking-tight">Chelona</h1>
                        <p className="text-[var(--text-muted)] text-base font-medium px-4 leading-relaxed mb-12">
                          La tua cassaforte digitale <span className="text-amber-500 font-bold">100% offline</span> e sicura.
                        </p>
                        <button 
                          onClick={() => setOnboardingStep(1)}
                          className="group flex items-center gap-3 px-8 py-4 bg-[var(--text-main)] text-[var(--bg)] rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-xl"
                        >
                          Inizia ora
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </motion.div>
                    )}

                    {onboardingStep === 1 && (
                      <motion.div 
                        key="step1"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="flex flex-col items-center text-center"
                      >
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-500 border border-emerald-500/20 mb-8">
                             <Fingerprint className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-black text-[var(--text-main)] mb-4 tracking-tight">Privacy Totale</h2>
                        <p className="text-[var(--text-muted)] text-sm font-medium px-6 leading-relaxed mb-10">
                          Tutti i dati sono criptati con <span className="text-emerald-500 font-bold">AES-256</span> direttamente sul tuo dispositivo. Nessun server, nessun cloud.
                        </p>
                        <div className="flex flex-col gap-3 w-full px-4">
                            <button 
                              onClick={() => setOnboardingStep(2)}
                              className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-amber-500 text-white rounded-2xl font-black hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-amber-500/20"
                            >
                              Configura Profilo
                            </button>
                            <button 
                              onClick={() => setOnboardingStep(0)}
                              className="text-[var(--text-muted)] text-xs font-bold py-2"
                            >
                              Indietro
                            </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <>
                  {profiles.length > 0 && (
                    <button onClick={() => setView('selector')} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors mb-6 text-sm font-bold">
                      <ArrowLeft className="w-4 h-4" />
                      Torna ai profili
                    </button>
                  )}

                  <div className="flex flex-col items-center mb-6 sm:mb-8">
                    {view === 'login' && selectedProfile ? (
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[var(--bg)] shadow-lg bg-[var(--accent-bg)]">
                    {selectedProfile.avatar ? (
                      <img src={selectedProfile.avatar} alt={selectedProfile.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[var(--accent)] text-white text-4xl font-bold">
                        {selectedProfile.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/30 mb-4">
                    <Lock className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                )}
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">
                  {view === 'login' ? `Bentornato, ${selectedProfile?.username}` : 'Nuovo Profilo'}
                </h1>
                <p className="text-[var(--text-muted)] text-xs sm:text-sm text-center mt-2 px-2">
                  {view === 'setup' ? 'Configura la tua chiave di accesso per il nuovo profilo' : 'Inserisci la password per accedere'}
                </p>
              </div>

              <form onSubmit={view === 'setup' ? handleSetup : handleLogin} className="space-y-3 sm:space-y-4">
                {view === 'setup' && (
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Il tuo nome"
                      value={username}
                      onChange={(e) => { setUsername(e.target.value); setError(''); }}
                      className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all text-sm sm:text-base text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                      disabled={isLoading}
                    />
                  </div>
                )}
                <div>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all text-sm sm:text-base text-[var(--text-main)]"
                      autoFocus
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {view === 'setup' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="relative"
                  >
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      placeholder="Conferma Password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                      className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all text-sm sm:text-base text-[var(--text-main)]"
                      disabled={isLoading}
                    />
                  </motion.div>


                )}

                {view === 'setup' && isBioSupported && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 bg-[var(--accent-bg)] rounded-2xl border border-[var(--accent)]/20 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                          <Fingerprint className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-[var(--accent)] leading-tight uppercase tracking-tight">Accesso Biometrico</h4>
                          <p className="text-[10px] font-medium text-[var(--text-muted)]">Usa l'impronta fisica</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsBioRequested(!isBioRequested)}
                        className={`w-12 h-6 rounded-full transition-all relative ${isBioRequested ? 'bg-amber-500 shadow-lg shadow-amber-500/30' : 'bg-gray-300'}`}
                      >
                        <motion.div 
                          animate={{ x: isBioRequested ? 26 : 2 }}
                          className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all" 
                        />
                      </button>
                    </div>
                  </motion.div>
                )}

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-[var(--danger)] text-xs sm:text-sm bg-[var(--danger-bg)] p-3 rounded-xl border border-[var(--danger)]/20"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 sm:py-4 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {view === 'setup' ? 'Crea Profilo' : 'Sblocca Dashboard'}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              {view === 'login' && (
                <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-[var(--border)] flex flex-col items-center gap-4">
                  {isBioSupported && selectedProfile?.isBiometricEnabled && (
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-1 h-[1px] bg-[var(--border)]" />
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Metodo Consigliato</span>
                        <div className="flex-1 h-[1px] bg-[var(--border)]" />
                      </div>
                      <button
                        onClick={handleBiometricLogin}
                        disabled={isLoading}
                        className="flex flex-col items-center gap-2 group transition-all active:scale-95 disabled:opacity-50"
                      >
                        <div className="w-16 h-16 rounded-full bg-[var(--accent-bg)] flex items-center justify-center text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white transition-all shadow-md">
                          <Fingerprint className="w-8 h-8" />
                        </div>
                        <span className="text-sm font-bold text-[var(--accent)]">Riprova Impronta</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
</div>
);
};
