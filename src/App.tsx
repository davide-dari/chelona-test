/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Sun, Moon, Wrench, Plus, LayoutDashboard, Settings, User, LogOut, Search, Mic, Bell, CreditCard, Fingerprint, ShieldCheck, Wallet, Lock, Menu, X, StickyNote, Grid2X2, Car, QrCode, Folder as FolderIcon, Check, Edit2, Trash2, BookOpen, ArrowLeft, FileDown, Hourglass, Users, Download } from 'lucide-react';
import { Module, ModuleType, Folder, DocumentModule } from './types';
import { storage, AppState } from './services/storage';
import { encryption } from './services/encryption';
import { GenericCard, AutoCard, DocumentCard, SplitCard } from './components/Modules';
import { LockScreen } from './components/LockScreen';
import { QrScanner } from './components/QrScanner';
import { ProfileScreen } from './components/ProfileScreen';
import { ToolsScreen, TOOLS } from './components/ToolsScreen';
import { AutoEditScreen } from './components/AutoEditScreen';
import { SplitScreen } from './components/SplitScreen';
import { DocumentArchive } from './components/DocumentArchive';
import { notificationService } from './services/notificationService';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { updateService, UpdateInfo } from './services/updateService';
// UI Libraries removed as per request (CSS Grid migration)

// ResponsiveGridLayout removed (DnD disabled)

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-6">
            <X className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Errore di Rendering</h1>
          <p className="text-gray-600 mb-6">L'applicazione si è bloccata. Ecco i dettagli tecnici:</p>
          <pre className="bg-white p-4 rounded-xl shadow-sm text-left text-xs sm:text-sm text-red-600 border border-red-100 overflow-auto max-w-full w-full max-h-96">
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-8 px-8 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800"
          >
            Ricarica App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const TEMPLATES = {
  document: {
    title: 'Documento',
    content: '',
    icon: Fingerprint,
    color: 'text-amber-500'
  },
  auto: {
    title: 'Auto',
    content: '',
    icon: Car,
    color: 'text-red-500'
  },
  split: {
    title: 'Spese',
    content: '',
    icon: Users,
    color: 'text-purple-500'
  },
  expense: {
    title: 'Portafoglio',
    content: 'Portafoglio: Risparmi\nSaldo: 0\nValuta: EUR\nNote: ',
    icon: Wallet,
    color: 'text-purple-500'
  },
  none: {
    title: 'Appunto Libero',
    content: '',
    icon: StickyNote,
    color: 'text-[var(--text-muted)]'
  }
};

import { CAR_BRANDS } from './utils/carBrands';
import { CAR_MODELS } from './constants/carModels';

export default function App() {
  console.log('App: Rendering component...');
  const [modules, setModules] = useState<Module[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingAutoModule, setEditingAutoModule] = useState<import('./types').AutoModule | null>(null);
  const [editingSplitModule, setEditingSplitModule] = useState<import('./types').SplitModule | null>(null);
  const [sharingModule, setSharingModule] = useState<Module | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ModuleType | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [username, setUsername] = useState('Utente');
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBioSupported, setIsBioSupported] = useState(false);
  const [isBioEnabled, setIsBioEnabled] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSandboxMode, setIsSandboxMode] = useState(true);
  const [bioError, setBioError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [pinnedCategoryIds, setPinnedCategoryIds] = useState<string[]>([]);
  const [pinnedToolIds, setPinnedToolIds] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isPublicToolsOpen, setIsPublicToolsOpen] = useState(false);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [autoFormStep, setAutoFormStep] = useState(0);
  const [pendingImportModule, setPendingImportModule] = useState<Module | null>(null);
  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(null);
  const [updateProgress, setUpdateProgress] = useState<number | null>(null);
  const [spesaSubMenu, setSpesaSubMenu] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('lifemod_theme');
    return (saved as 'light' | 'dark') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lifemod_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  useEffect(() => {
    const init = async () => {
      if (encryptionKey && currentProfileId) {
        const profiles = storage.loadProfiles();
        const profile = profiles.find(p => p.id === currentProfileId);
        if (profile) {
          setUsername(profile.username);
          setAvatar(profile.avatar);
          setIsBioEnabled(profile.isBiometricEnabled);
          setPinnedCategoryIds(profile.pinnedCategoryIds || []);
          setPinnedToolIds(profile.pinnedToolIds || []);
        }

        const saved = await storage.loadState(encryptionKey, currentProfileId);
        let loadedModules = saved.modules || [];
        
        setPendingImportModule(prev => {
          if (prev) {
            loadedModules = [prev, ...loadedModules];
            // save immediately with new modules
            storage.saveState({ modules: loadedModules, folders: saved.folders || [] }, encryptionKey, currentProfileId)
              .then(() => showToast('Appunto importato al login con successo!'));
          }
          return null;
        });

        setModules(loadedModules);
        setFolders(saved.folders || []);

        // Controlla notifiche all'apertura dell'app
        const autoMods = loadedModules
          .filter(m => m.type === 'auto')
          .map(m => ({ id: m.id, brand: (m as any).brand, model: (m as any).model, currentKm: (m as any).currentKm }));
        notificationService.checkAndFire(autoMods);
      }
    };
    init();
  }, [encryptionKey, currentProfileId]);

  const handleCheckUpdate = React.useCallback(async (silent = true) => {
    // Controllo aggiornamenti
    if (window.Capacitor || (window.location.search.includes('debug_update=1'))) {
      try {
        const info = await updateService.checkForUpdates();
        if (info && info.available) {
          setAvailableUpdate(info);
          return true;
        } else if (!silent) {
          showToast('L\'applicazione è aggiornata.', 'success');
        }
      } catch (e) {
        if (!silent) showToast('Errore durante il controllo aggiornamenti.', 'error');
      }
    }
    return false;
  }, []);

  useEffect(() => {
    import('./services/biometricService').then(m => {
      m.biometricService.isSupported().then(setIsBioSupported);
    });

    // Controllo aggiornamenti all'avvio
    handleCheckUpdate(true);
    // Ascolta eventi manuali di aggiornamento
    const handleManualUpdate = (e: any) => {
      if (e.detail) setAvailableUpdate(e.detail);
    };
    window.addEventListener('chelona_update_available', handleManualUpdate);
    
    return () => window.removeEventListener('chelona_update_available', handleManualUpdate);
  }, [handleCheckUpdate]);

  const saveAppState = async (newModules: Module[], newFolders: Folder[]) => {
    if (!encryptionKey || !currentProfileId) return;
    await storage.saveState({ modules: newModules, folders: newFolders }, encryptionKey, currentProfileId);
  };

  useEffect(() => {
    if (!encryptionKey || modules.length === 0) return;

    const checkExpirations = async () => {
      const now = Date.now();
      const validModules = modules.filter(m => {
        if (m.type === 'document' && (m as any).selfDestructAt) {
          return now <= (m as any).selfDestructAt;
        }
        return true;
      });

      if (validModules.length !== modules.length) {
        setModules(validModules);
        await saveAppState(validModules, folders);
      }
    };

    // Check immediately and then every minute
    checkExpirations();
    const interval = setInterval(checkExpirations, 60000);
    return () => clearInterval(interval);
  }, [modules, folders, encryptionKey]);

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encryptionKey) return;

    let processedData = { ...formData };
    if (processedData.template === 'auto' || processedData.type === 'auto') {
      processedData.title = `${processedData.brand || ''} ${processedData.model || ''}`.trim() || 'Auto';
    }

    let updated: Module[];
    if (editingModuleId) {
      updated = modules.map(m => m.id === editingModuleId ? { ...m, ...processedData, folderId: processedData.folderId || undefined } : m);
    } else {
      const id = Math.random().toString(36).substr(2, 9);
      const type = processedData.template === 'auto' ? 'auto' : processedData.template === 'document' ? 'document' : processedData.template === 'split' ? 'split' : 'generic';
      const newModule: Module = {
        id,
        type,
        x: (modules.length * 2) % 12,
        y: Infinity, // puts it at the bottom
        w: type === 'auto' ? 4 : type === 'document' ? 3 : 3,
        h: type === 'auto' ? 4 : type === 'document' ? 3 : 2,
        ...processedData,
        ...(type === 'document' && !processedData.documentType ? { documentType: 'generic' } : {}),
        ...(type === 'split' ? { participants: [], expenses: [], currency: 'EUR' } : {}),
        folderId: processedData.folderId !== undefined ? (processedData.folderId || undefined) : (selectedFolderId || undefined)
      };
      updated = [...modules, newModule];
    }

    setModules(updated);
    await saveAppState(updated, folders);
    setIsAdding(false);
    setEditingModuleId(null);
    setFormData({});
  };

  const handleScan = async (data: string) => {
    // Chiudi subito lo scanner per evitare la schermata nera durante l'elaborazione dei dati
    setIsScanning(false);

    try {
      let parsedData = JSON.parse(data);
      
      // Normalize Shorthand format to Full format
      // t -> type, d -> data, a -> isAutodestruct, e -> qrExpiresAt, p -> profile, v -> version
      if (parsedData.t) {
        parsedData = {
          type: parsedData.t,
          data: parsedData.d,
          isAutodestruct: parsedData.a,
          qrExpiresAt: parsedData.e,
          profile: parsedData.p,
          version: parsedData.v,
          ...parsedData
        };
      }

      // 1. Gestione Backup Profilo (Sempre permesso anche fuori dal login)
      if (parsedData.type === 'chelona_profile_backup') {
        const { profile, data: encData } = parsedData;
        if (!profile || !profile.id) throw new Error('Dati profilo non validi nel backup');

        const currentProfiles = storage.loadProfiles();
        if (currentProfiles.find(p => p.id === profile.id)) {
          showToast('Questo profilo esiste già sul dispositivo.', 'info');
          return;
        }

        if (confirm(`Vuoi importare il profilo "${profile.username}"?`)) {
          storage.saveProfiles([...currentProfiles, profile]);
          if (encData) {
            localStorage.setItem(`lifemod_dashboard_state_enc_${profile.id}`, encData);
          }
          showToast(`Profilo "${profile.username}" importato!`);
          window.dispatchEvent(new Event('lifemod_profiles_updated'));
        }
        return;
      }

      // 2. Filtro Sicurezza: Se non siamo loggati, accettiamo SOLO i profili (gestiti sopra)
      if (!encryptionKey) {
        showToast('Non stai scansionando un profilo', 'error');
        return;
      }

      // 3. Gestione Moduli Condivisi (Solo se loggati)
      if (typeof parsedData.type === 'string' && parsedData.type.startsWith('shared_')) {
        const moduleType = parsedData.type.replace('shared_', '');
        
        const qrExpiry = parsedData.qrExpiresAt || parsedData.expiresAt;
        if (qrExpiry && Date.now() > qrExpiry) {
          showToast('Questo QR code è scaduto.', 'error');
          return;
        }

        const moduleData = parsedData.data;
        const { id, folderId, createdAt, updatedAt, ...cleanData } = moduleData;
        
        const newId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);
        const selfDestructAt = parsedData.durationMs ? Date.now() + parsedData.durationMs : parsedData.expiresAt;

        const newModule: Module = {
          ...cleanData,
          id: newId,
          type: moduleType,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          selfDestructAt: selfDestructAt,
          folderId: selectedFolderId || undefined
        };

        const updatedSelection = [...modules, newModule];
        setModules(updatedSelection);
        await saveAppState(updatedSelection, folders);
        
        // Torna alla Homepage dopo la scansione riuscita
        setIsToolsOpen(false);
        setIsPublicToolsOpen(false);
        setSelectedType(null);
        setSelectedFolderId(null);
        setIsSandboxMode(true);
        setIsSidebarOpen(false);

        showToast('Modulo importato con successo!');
      } else {
        showToast("Formato QR non valido o modulo non supportato.", 'error');
      }
    } catch (e: any) {
      console.error('QR Scan error:', e, 'Data:', data);
      showToast('Errore nella lettura del QR code.', 'error');
    }
  };

  // onLayoutChange removed (DnD disabled)

  const openEditModal = (module: Module) => {
    if (module.type === 'auto') {
      setEditingAutoModule(module as import('./types').AutoModule);
      return;
    }
    if (module.type === 'split') {
      setEditingSplitModule(module as import('./types').SplitModule);
      return;
    }
    setEditingModuleId(module.id);
    setFormData({ ...module });
    setAutoFormStep(0);
    setIsAdding(true);
  };

  const handleSaveAutoEdit = async (updated: import('./types').AutoModule) => {
    if (!encryptionKey) return;
    const updatedModules = modules.map(m => m.id === updated.id ? updated : m);
    setModules(updatedModules);
    await saveAppState(updatedModules, folders);
    setEditingAutoModule(null);
    showToast('Auto aggiornata!', 'success');
  };

  const updateModuleDirect = async (updatedModule: Module) => {
    if (!encryptionKey) return;
    const updated = modules.map(m => m.id === updatedModule.id ? updatedModule : m);
    setModules(updated);
    await saveAppState(updated, folders);
  };

  const deleteModule = async (id: string) => {
    if (!encryptionKey) return;
    const updated = modules.filter(m => m.id !== id);
    setModules(updated);
    await saveAppState(updated, folders);
    setModuleToDelete(null);
    showToast('Modulo eliminato correttamente', 'info');
  };

  const requestDelete = (id: string) => {
    const mod = modules.find(m => m.id === id);
    if (mod) setModuleToDelete(mod);
  };

  const handleAddFolder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newFolderName.trim()) return;

    let updatedFolders: Folder[];
    if (editingFolderId) {
      updatedFolders = folders.map(f => f.id === editingFolderId ? { ...f, name: newFolderName.trim() } : f);
    } else {
      const newFolder: Folder = {
        id: Math.random().toString(36).substr(2, 9),
        name: newFolderName.trim()
      };
      updatedFolders = [...folders, newFolder];
    }

    setFolders(updatedFolders);
    await saveAppState(modules, updatedFolders);
    setIsAddingFolder(false);
    setNewFolderName('');
    setEditingFolderId(null);
  };

  const handleDeleteFolder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Sei sicuro di voler eliminare questa cartella? I documenti al suo interno verranno spostati nella dashboard principale.')) {
      const updatedFolders = folders.filter(f => f.id !== id);
      const updatedModules = modules.map(m => m.folderId === id ? { ...m, folderId: undefined } : m);

      setFolders(updatedFolders);
      setModules(updatedModules);
      await saveAppState(updatedModules, updatedFolders);
      if (selectedFolderId === id) {
        setSelectedFolderId(null);
      }
    }
  };

  const handleUpdateProfile = (name: string, avatarUrl?: string) => {
    const profiles = storage.loadProfiles();
    const updated = profiles.map(p => p.id === currentProfileId ? { ...p, username: name, avatar: avatarUrl } : p);
    storage.saveProfiles(updated);
    setUsername(name);
    setAvatar(avatarUrl);
    showToast('Profilo aggiornato!');
  };

  const handleEnableBiometrics = async () => {
    if (!encryptionKey || !currentProfileId) return;
    setBioError(null);

    try {
      const m = await import('./services/biometricService');
      const supported = await m.biometricService.isSupported();
      
      console.log('[App] Attempting biometric registration...');
      const result = await m.biometricService.register(username);
      
      if (!result) {
        setBioError('Il sensore biometrico non ha risposto o l\'operazione è stata annullata.');
        return;
      }

      const profiles = storage.loadProfiles();
      const profile = profiles.find(p => p.id === currentProfileId);
      if (profile) {
        const bioSalt = encryption.generateSalt();
        const masterKeyStr = await encryption.exportKey(encryptionKey);
        const signature = await m.biometricService.authenticate(result.credentialId);
        
        if (signature) {
          const signatureStr = btoa(String.fromCharCode(...signature));
          const bioKey = await encryption.deriveKey(signatureStr, bioSalt, 10000);
          const encryptedMasterKey = await encryption.encrypt(masterKeyStr, bioKey);

          const updatedProfile = {
            ...profile,
            isBiometricEnabled: true,
            credentialId: result.credentialId,
            encryptedMasterKey,
            bioSalt
          };
          
          storage.saveProfiles(profiles.map(p => p.id === currentProfileId ? updatedProfile : p));
          setIsBioEnabled(true);
          showToast('Biometria abilitata con successo!', 'success');
        } else {
          setBioError('Impossibile verificare l\'impronta appena registrata.');
        }
      }
    } catch (e: any) {
      console.error('[App] Biometric activation error', e);
      setBioError(e.message || 'Errore durante la registrazione biometrica. Assicurati di avere almeno un\'impronta registrata sul sistema.');
    }
  };

  const handleLogout = () => {
    setEncryptionKey(null);
    setCurrentProfileId(null);
    setModules([]);
    setIsSidebarOpen(false);
  };

  // useContainerWidth removed (DnD disabled)
  const mounted = true;
  const width = 1200; // not used anymore

  const filteredModules = useMemo(() => {
    return modules.filter(m => {
      // Folder filter
      const folderMatch = !selectedFolderId ? !m.folderId : m.folderId === selectedFolderId;
      if (!folderMatch) return false;

      // Type (Category) filter
      if (selectedType && m.type !== selectedType) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const mAny = m as any;
        const title = (mAny.title || '').toLowerCase();
        const content = (mAny.content || '').toLowerCase();
        // Specific fields for different types
        const extra = (mAny.brand || mAny.model || mAny.number || mAny.documentType || '').toLowerCase();
        
        return title.includes(query) || content.includes(query) || extra.includes(query);
      }

      return true;
    });
  }, [modules, selectedFolderId, selectedType, searchQuery]);

  const recentModules = useMemo(() => {
    return [...modules]
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 4);
  }, [modules]);

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim() || isToolsOpen) return [];
    const query = searchQuery.toLowerCase();
    return TOOLS.filter((t: any) => t.title.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query));
  }, [searchQuery, isToolsOpen]);

  const handleSaveToSandbox = async (title: string, base64: string) => {
    if (!encryptionKey || !currentProfileId) return;
    const newModule: DocumentModule = {
      id: crypto.randomUUID(),
      type: 'document',
      title,
      documentType: 'Risultato Strumento',
      x: 0,
      y: 0,
      w: 2,
      h: 2,
      pdfAttachment: base64
    };
    const newModules = [newModule, ...modules];
    setModules(newModules);
    await saveAppState(newModules, folders);
    setIsToolsOpen(false);
    setActiveToolId(null);
    showToast('Documento salvato in Bacheca!');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        if (file.name.toLowerCase().endsWith('.zip')) {
          const content = event.target?.result as ArrayBuffer;
          const zip = await JSZip.loadAsync(content);
          const dataFile = zip.file("data.json");
          
          if (!dataFile) {
            showToast('Il file ZIP non contiene dati validi', 'error');
            return;
          }
          
          const zipContent = await dataFile.async("string");
          const parsedZip = JSON.parse(zipContent);
          
          if (parsedZip.salt && parsedZip.encryptedPayload) {
            const password = window.prompt("Inserisci il codice di sblocco per questo file:");
            if (!password) return;
            
            const key = await encryption.deriveKey(password, parsedZip.salt);
            const decryptedModule = await encryption.decrypt(parsedZip.encryptedPayload, key);
            
            if (decryptedModule) {
              const newModule = { ...decryptedModule, id: crypto.randomUUID() };
              
              if (encryptionKey && currentProfileId) {
                const newModules = [newModule, ...modules];
                setModules(newModules);
                await saveAppState(newModules, folders);
                showToast('Appunto importato con successo!');
              } else {
                setPendingImportModule(newModule);
                showToast("File pronto! Accedi al profilo per salvarlo.", "info");
              }
            } else {
              showToast('Password errata o file corrotto', 'error');
            }
          } else {
            showToast('Formato ZIP non supportato', 'error');
          }
        } else {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);
          
          if (parsed.type?.startsWith('shared_') && parsed.data) {
             const newModule = { ...parsed.data, id: crypto.randomUUID() };
             
             if (encryptionKey && currentProfileId) {
               const newModules = [newModule, ...modules];
               setModules(newModules);
               await saveAppState(newModules, folders);
               showToast('Appunto importato con successo!');
             } else {
               setPendingImportModule(newModule);
               showToast("File pronto! Accedi al profilo per salvarlo.", "info");
             }
          } else {
             showToast('File non valido o corrotto', 'error');
          }
        }
      } catch (err) {
        console.error('Import error', err);
        showToast('Errore durante la lettura del file', 'error');
      }
    };
    
    if (file.name.toLowerCase().endsWith('.zip')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('La ricerca vocale non è supportata su questo browser.', 'error');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      if (navigator.vibrate) navigator.vibrate(50);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      if (navigator.vibrate) navigator.vibrate([30, 30]);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        showToast('Permesso microfono negato.', 'error');
      } else {
        showToast('Errore durante la ricerca vocale.', 'error');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start recognition', e);
      setIsListening(false);
    }
  };

  // Layout state removed (DnD disabled)

  const SidebarContent = () => (
    <>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-main)]">Chelona</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-[var(--text-muted)] hover:bg-[var(--bg)] rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <button
          onClick={() => { setIsSandboxMode(true); setIsSettingsOpen(false); setIsSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isSandboxMode && !isSettingsOpen ? 'bg-[var(--accent-bg)] text-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg)]'}`}
        >
          <Grid2X2 className="w-5 h-5" />
          Sandbox Mode
        </button>
        <button
          onClick={() => { setIsScanning(true); setIsSidebarOpen(false); }}
          className="w-full flex items-center gap-3 px-4 py-3 text-[var(--text-muted)] hover:bg-[var(--bg)] rounded-xl transition-all"
        >
          <QrCode className="w-5 h-5" />
          Scansiona QR
        </button>
        <label className="w-full flex items-center gap-3 px-4 py-3 text-[var(--text-muted)] hover:bg-[var(--bg)] rounded-xl transition-all cursor-pointer">
          <input type="file" accept=".zip,.chelona,.sandme" className="hidden" onChange={(e) => { handleImportFile(e); setIsSidebarOpen(false); }} />
          <FileDown className="w-5 h-5" />
          Importa File (.zip)
        </label>

        <div className="pt-6 pb-2 px-4">
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Utility</p>
        </div>
        <button
          onClick={() => { setIsToolsOpen(true); setIsProfileOpen(false); setIsSidebarOpen(false); setSelectedType(null); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isToolsOpen ? 'bg-[var(--accent-bg)] text-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg)]'}`}
        >
          <Wrench className="w-5 h-5" />
          Strumenti
        </button>

      </nav>

      <div className="pb-4 mt-auto"></div>
    </>
  );

  return (
    <>
      {/* Password Managers on Mobile (Safari/Chrome AutoFill) inject extra DOM nodes into the password <input>. 
          If React tries to unmount the LockScreen, it violently crashes with a DOMException (removeChild). 
          To completely bypass this, we NEVER unmount the LockScreen, we just hide it visually. */}
      <div 
        style={{ 
          display: (!encryptionKey || !currentProfileId) && !isProfileOpen && !isPublicToolsOpen ? 'block' : 'none', 
          position: 'absolute', inset: 0, zIndex: 99999 
        }}
      >
        <LockScreen 
          isVisible={(!encryptionKey || !currentProfileId) && !isProfileOpen && !isPublicToolsOpen}
          onAuthenticated={(key, profileId) => {
            setEncryptionKey(key);
            setCurrentProfileId(profileId);
          }} 
          onStartScan={() => setIsScanning(true)}
          onOpenTools={() => setIsPublicToolsOpen(true)}
          onImportFile={handleImportFile}
          onCheckUpdate={() => handleCheckUpdate(true)}
        />
      </div>

      {isPublicToolsOpen && !encryptionKey && (
        <div className="h-screen bg-[var(--bg)] flex flex-col relative w-full overflow-hidden" style={{ position: 'absolute', inset: 0, zIndex: 99999 }}>
           <header className="h-16 lg:h-20 bg-[var(--header-bg)] backdrop-blur-2xl border-b border-[var(--border)] px-4 lg:px-8 flex items-center justify-between sticky top-0 z-10 shadow-sm">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                   <Wrench className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl lg:text-2xl font-bold text-[var(--text-main)] tracking-tight">Strumenti Rapidi</h1>
             </div>
             <button onClick={() => setIsPublicToolsOpen(false)} className="flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors bg-[var(--card-bg)] px-4 py-2 border border-[var(--border)] rounded-full shadow-sm">
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Torna ai Profili</span>
             </button>
           </header>
           <main className="flex-1 overflow-y-auto w-full h-full max-w-[1200px] mx-auto">
             <ToolsScreen showToast={showToast} onSaveToSandbox={handleSaveToSandbox} modules={modules} />
           </main>
        </div>
      )}

      {isScanning && (
        <QrScanner
          onScan={handleScan}
          onClose={() => setIsScanning(false)}
        />
      )}



      {encryptionKey && currentProfileId && (
        <ErrorBoundary>
          <div className="flex h-screen bg-[var(--bg)] overflow-hidden relative font-sans transition-colors duration-300">
            
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-72 bg-[var(--sidebar-bg)] backdrop-blur-3xl border-r border-[var(--border)] z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
              <SidebarContent />
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden w-full relative">
              <header className="h-16 lg:h-20 bg-[var(--header-bg)] backdrop-blur-2xl border-b border-[var(--border)] px-4 lg:px-8 flex items-center justify-between sticky top-0 z-10 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                {/* Left side: Contextual Title */}
                <div className="flex items-center gap-3">
                  {(isToolsOpen || selectedType) && (
                    <button 
                      onClick={() => { setIsToolsOpen(false); setSelectedType(null); setActiveToolId(null); }}
                      className="p-2 -ml-2 hover:bg-[var(--accent-bg)] rounded-xl text-[var(--accent)] transition-all flex items-center gap-1 group"
                      title="Torna alla Dashboard"
                    >
                      <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                    </button>
                  )}
                  {!selectedType && !isToolsOpen ? (
                    <LayoutDashboard className="w-6 h-6 text-[var(--accent)]" />
                  ) : isToolsOpen ? (
                    <Wrench className="w-6 h-6 text-[var(--accent)]" />
                  ) : selectedType && TEMPLATES[selectedType] ? (
                    React.createElement(TEMPLATES[selectedType].icon, { className: "w-6 h-6 text-[var(--accent)]" })
                  ) : null}
                  <h1 className="text-xl lg:text-2xl font-extrabold text-[var(--text-main)] tracking-tight">
                    {isToolsOpen ? 'Strumenti' : selectedType ? TEMPLATES[selectedType].title : 'Dashboard'}
                  </h1>
                </div>

                {/* Right side: Lock, Theme and Avatar */}
                <div className="flex items-center gap-4">
                  <button 
                    onClick={toggleTheme} 
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] bg-[var(--card-bg)] shadow-sm hover:shadow-md rounded-full transition-all border border-[var(--border)]"
                    title={theme === 'light' ? 'Passa alla modalità notte' : 'Passa alla modalità giorno'}
                  >
                    {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-[var(--accent)]" />}
                  </button>
                  <button onClick={handleLogout} className="p-2 text-[var(--text-muted)] hover:text-red-500 bg-[var(--card-bg)] shadow-sm hover:shadow-md rounded-full transition-all border border-[var(--border)]">
                    <Lock className="w-5 h-5" />
                  </button>
                  <button onClick={() => setIsProfileOpen(true)} className="w-10 h-10 rounded-full shadow-md overflow-hidden border-[3px] border-[var(--card-bg)] focus:outline-none hidden md:block hover:scale-105 transition-transform">
                    <img src={avatar || `https://ui-avatars.com/api/?name=${username}&background=FFFBEB&color=B45309`} alt="Profile" className="w-full h-full object-cover" />
                  </button>
                </div>
              </header>



              <div className="w-full h-full">

                  {isProfileOpen ? (
              <ProfileScreen
                onClose={() => setIsProfileOpen(false)}
                username={username}
                avatar={avatar}
                currentProfileId={currentProfileId!}
                onUpdateProfile={handleUpdateProfile}
                isBioSupported={isBioSupported}
                isBioEnabled={isBioEnabled}
                onEnableBiometrics={handleEnableBiometrics}
                bioError={bioError}
                onLogout={handleLogout}
                encryptionKey={encryptionKey!}
                modules={modules}
                folders={folders}
                onEncryptionKeyChanged={setEncryptionKey}
                showToast={showToast}
              />
            ) : isToolsOpen ? (
              <ToolsScreen 
                showToast={showToast} 
                initialToolId={activeToolId} 
                onSaveToSandbox={handleSaveToSandbox} 
                onReset={() => setActiveToolId(null)} 
              />
            ) : isSettingsOpen ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
                <div className="flex items-center gap-4 mb-8">
                  <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-[var(--bg)] rounded-xl text-[var(--text-muted)] transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                  <h2 className="text-2xl lg:text-3xl font-bold text-[var(--text-main)]">Impostazioni Sicurezza</h2>
                </div>
                <div className="space-y-6">
                  <div className="bg-[var(--card-bg)] rounded-3xl p-6 border border-[var(--border)] shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[var(--accent-bg)] rounded-2xl flex items-center justify-center text-[var(--accent)]">
                          <Fingerprint className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[var(--text-main)]">Accesso Biometrico</h3>
                          <p className="text-sm text-[var(--text-muted)]">Usa l'impronta digitale per sbloccare la dashboard.</p>
                        </div>
                      </div>
                      {isBioSupported ? (
                        <button
                          onClick={isBioEnabled ? undefined : handleEnableBiometrics}
                          disabled={isBioEnabled}
                          className={`px-6 py-2.5 rounded-xl font-bold transition-all ${isBioEnabled ? 'bg-[var(--accent-bg)] text-[var(--accent)] cursor-default' : 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 shadow-lg shadow-[var(--accent)]/20'}`}
                        >
                          {isBioEnabled ? 'Abilitato' : 'Abilita'}
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)] font-medium italic">Non supportato</span>
                      )}
                    </div>
                    {bioError && (
                      <div className="mt-4 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                        {bioError}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : sharingModule ? (
              <ShareScreen 
                module={sharingModule} 
                onClose={() => setSharingModule(null)} 
              />
            ) : editingAutoModule ? (
              <AutoEditScreen
                module={editingAutoModule}
                onSave={handleSaveAutoEdit}
                onCancel={() => setEditingAutoModule(null)}
              />
            ) : editingSplitModule ? (
              <SplitScreen
                module={editingSplitModule}
                onSave={(mod) => { updateModuleDirect(mod); setEditingSplitModule(null); }}
                onClose={() => setEditingSplitModule(null)}
                onSaveToSandbox={handleSaveToSandbox}
              />
            ) : isAdding ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto h-full flex flex-col w-full">
                <div className="flex items-center gap-4 mb-8">
                  <button onClick={() => { setIsAdding(false); setEditingModuleId(null); setFormData({}); setAutoFormStep(0); setSpesaSubMenu(false); }} className="p-2 hover:bg-[var(--card-bg)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                  <h2 className="text-2xl lg:text-3xl font-bold text-[var(--text-main)]">{editingModuleId ? 'Modifica' : 'Nuovo'} Appunto</h2>
                </div>

                <div className="flex-1 overflow-y-auto pb-32">
                  {!editingModuleId && !formData.template && !spesaSubMenu && (
                    <div className="bg-[var(--card-bg)]/80 backdrop-blur-3xl rounded-[2.5rem] border border-[var(--border)] p-6 lg:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.06)]">
                      <h3 className="text-lg font-bold text-[var(--text-main)] mb-8 uppercase tracking-widest text-center">Scegli un Template</h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.entries(TEMPLATES).map(([key, t]) => (
                          <button
                            key={key}
                            onClick={() => {
                              if (key === 'split') {
                                setSpesaSubMenu(true);
                              } else {
                                setFormData({ ...formData, template: key, title: t.title, content: t.content });
                                setAutoFormStep(0);
                              }
                            }}
                            className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all group text-center h-full text-[var(--text-main)]"
                          >
                            <t.icon className={`w-8 h-8 ${t.color} group-hover:scale-110 transition-transform`} />
                            <span className="font-bold text-xs uppercase tracking-wider">{t.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sub-menu Spese */}
                  {!editingModuleId && !formData.template && spesaSubMenu && (
                    <div className="bg-[var(--card-bg)]/80 backdrop-blur-3xl rounded-[2.5rem] border border-[var(--border)] p-6 lg:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center gap-3 mb-8">
                        <button
                          onClick={() => setSpesaSubMenu(false)}
                          className="p-2 hover:bg-[var(--bg)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h3 className="text-lg font-bold text-[var(--text-main)] uppercase tracking-widest">Spese</h3>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <button
                          onClick={() => {
                            setSpesaSubMenu(false);
                            setFormData({ ...formData, template: 'split', title: 'Gruppo Spese', content: '' });
                            setAutoFormStep(0);
                          }}
                          className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-[var(--border)] hover:border-purple-500/60 hover:bg-purple-500/10 transition-all group text-center h-full text-[var(--text-main)]"
                        >
                          <Users className="w-8 h-8 text-purple-500 group-hover:scale-110 transition-transform" />
                          <div className="text-center">
                            <span className="font-bold text-xs uppercase tracking-wider block">Gruppo Spese</span>
                            <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Dividi le spese con altri</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {(editingModuleId || formData.template) && (
                    <div className="bg-[var(--card-bg)]/80 backdrop-blur-3xl rounded-[2.5rem] border border-[var(--border)] p-6 lg:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.06)]">
                      <form onSubmit={handleAddModule} className="space-y-6">
                        {(formData.template !== 'auto' && formData.type !== 'auto') && (
                          <div>
                            <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Titolo</label>
                            <input
                              type="text" required value={formData.title || ''}
                              onChange={e => setFormData({ ...formData, title: e.target.value })}
                              className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                            />
                          </div>
                        )}

                        {/* Folder selection removed as per request */}

                        {(formData.template === 'auto' || formData.type === 'auto') ? (
                          (() => {
                            const steps: any[] = [
                              { id: 'driverName', title: "Chi è il proprietario dell'auto?", type: 'text', required: true },
                              { id: 'brand', title: "Qual è la Marca?", type: 'text', list: 'car-brands', required: true },
                              { id: 'model', title: "Qual è il Modello?", type: 'text', list: 'car-models', required: true },
                              { id: 'plate', title: "Inserisci la Targa", type: 'text', required: true },
                              { id: 'registrationYear', title: "Anno di Immatricolazione / Produzione", type: 'number', required: true, placeholder: 'Es. 2021' },
                              { id: 'currentKm', title: "Quanti Km ha l'auto attualmente?", type: 'number', required: true, placeholder: 'Es. 45000' },
                              { id: 'fuelType', title: "Seleziona l'Alimentazione", type: 'select', required: true, options: [
                                { value: '', label: 'Seleziona...' },
                                { value: 'benzina', label: 'Benzina' },
                                { value: 'diesel', label: 'Diesel' },
                                { value: 'gpl', label: 'GPL' },
                                { value: 'metano', label: 'Metano' },
                                { value: 'ibrida', label: 'Ibrida' },
                                { value: 'elettrica', label: 'Elettrica' }
                              ]},
                              { id: 'lastInsurance', title: "Scadenza Assicurazione", type: 'date' },
                              { id: 'lastTax', title: "Scadenza Prossimo Bollo", type: 'date' },
                              { id: 'lastRevision', title: "Data Ultima Revisione", type: 'date' },
                              { id: 'lastServiceKm', title: "Km Ultimo Tagliando", type: 'number', placeholder: 'Es. 30000' },
                              { id: 'tiresKm', title: "Km Ultimo Controllo Gomme", type: 'number', placeholder: 'Es. 40000' },
                              { id: 'battery12vWarranty', title: "Scadenza Garanzia Batteria 12v", type: 'text', placeholder: 'Es. Garanzia fino al...' }
                            ];
                            
                            if (formData.fuelType === 'ibrida' || formData.fuelType === 'elettrica') {
                              steps.push({ id: 'hybridBatteryWarranty', title: "Garanzia Batteria I/E", type: 'text', placeholder: 'Es. Ogni 15000km o ogni anno' });
                            }
                            if (formData.fuelType === 'gpl') {
                              steps.push({ id: 'lastGplCylinder', title: "Data Installazione Bombola GPL", type: 'date' });
                            }
                            if (formData.fuelType === 'metano') {
                              steps.push({ id: 'lastMethaneCylinder', title: "Ultima Revisione Bombola", type: 'date' },
                              { id: 'methaneType', title: "Omologazione Bombola Metano", type: 'select', options: [
                                { value: 'standard', label: 'Standard (4 anni)' },
                                { value: 'r110', label: 'Europea R110 (5 anni)' }
                              ]});
                            }

                            const currentStep = steps[autoFormStep] || steps[steps.length - 1];
                            const isFirst = autoFormStep === 0;
                            const isLast = autoFormStep >= steps.length - 1;

                            const handleNext = () => {
                              if (currentStep.required && !formData[currentStep.id]) {
                                showToast('Compila questo campo per continuare', 'error');
                                return;
                              }
                              setAutoFormStep(prev => prev + 1);
                            };

                            const handleKeyDown = (e: React.KeyboardEvent) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (!isLast) handleNext();
                              }
                            };

                            return (
                              <div className="space-y-6">
                                <div className="text-center mb-8">
                                  <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest bg-[var(--accent-bg)] px-3 py-1 rounded-full border border-[var(--accent)]/20">
                                    Passo {Math.min(autoFormStep + 1, steps.length)} di {steps.length}
                                  </span>
                                  <h3 className="text-xl font-bold text-[var(--text-main)] mt-4 h-8">{currentStep.title}</h3>
                                </div>

                                <motion.div 
                                  key={currentStep.id}
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -20 }}
                                  className="min-h-[100px] flex items-center justify-center p-2"
                                >
                                  {currentStep.type === 'select' ? (
                                    <select
                                      required={currentStep.required}
                                      value={formData[currentStep.id] || ''}
                                      onChange={e => setFormData({ ...formData, [currentStep.id]: e.target.value })}
                                      onKeyDown={handleKeyDown}
                                      className="w-full max-w-sm p-4 text-center bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] hover:border-[var(--accent)]/50 transition-all font-bold text-lg text-[var(--text-main)] shadow-inner"
                                    >
                                      {currentStep.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                  ) : currentStep.type === 'number' ? (
                                    <input
                                      type="number"
                                      placeholder={currentStep.placeholder}
                                      required={currentStep.required}
                                      value={formData[currentStep.id] || ''}
                                      onChange={e => setFormData({ ...formData, [currentStep.id]: e.target.value })}
                                      onKeyDown={handleKeyDown}
                                      className="w-full max-w-sm p-4 text-center bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] hover:border-[var(--accent)]/50 transition-all font-bold text-xl text-[var(--text-main)] shadow-inner placeholder:text-[var(--text-muted)]"
                                    />
                                  ) : (
                                    <div className="w-full max-w-sm relative">
                                      <input
                                        type={currentStep.type}
                                        list={currentStep.list}
                                        placeholder={currentStep.placeholder}
                                        required={currentStep.required}
                                        value={formData[currentStep.id] || ''}
                                        onChange={e => setFormData({ ...formData, [currentStep.id]: e.target.value })}
                                        onKeyDown={handleKeyDown}
                                        className="w-full p-4 text-center bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] hover:border-[var(--accent)]/50 transition-all font-bold text-xl text-[var(--text-main)] shadow-inner placeholder:text-[var(--text-muted)]"
                                        autoFocus
                                      />
                                      {currentStep.list && (
                                        <datalist id={currentStep.list}>
                                          {currentStep.list === 'car-brands' && CAR_BRANDS.map(brand => <option key={brand} value={brand} />)}
                                          {currentStep.list === 'car-models' && formData.brand && (
                                            (CAR_MODELS[formData.brand] || 
                                             (Object.keys(CAR_MODELS).find(b => b.toLowerCase() === formData.brand?.toLowerCase()) && CAR_MODELS[Object.keys(CAR_MODELS).find(b => b.toLowerCase() === formData.brand?.toLowerCase())!]) || [])
                                            .map((model: string) => <option key={model} value={model} />)
                                          )}
                                        </datalist>
                                      )}
                                    </div>
                                  )}
                                </motion.div>

                                <div className="flex items-center gap-4 mt-8 pt-4">
                                  <button
                                    type="button"
                                    onClick={() => setAutoFormStep(prev => Math.max(0, prev - 1))}
                                    disabled={isFirst}
                                    className={`flex-1 py-4 rounded-2xl font-bold transition-all ${isFirst ? 'bg-[var(--bg)] text-[var(--text-muted)] cursor-not-allowed opacity-50' : 'bg-[var(--border)] text-[var(--text-main)] hover:bg-[var(--border)]/80'}`}
                                  >
                                    Indietro
                                  </button>
                                  {!isLast ? (
                                    <button
                                      type="button"
                                      onClick={handleNext}
                                      className="flex-1 py-4 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white rounded-2xl font-bold transition-all shadow-lg shadow-[var(--accent)]/20"
                                    >
                                      Avanti
                                    </button>
                                  ) : (
                                    <button
                                      type="submit"
                                      className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20"
                                    >
                                      {editingModuleId ? 'Aggiorna Sandbox' : 'Crea Sandbox'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })()
                        ) : (formData.template === 'document' || formData.type === 'document') ? (
                          <div className="space-y-6">
                            <div>
                              <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Tipo Documento</label>
                              <input
                                list="doc-types"
                                required
                                placeholder="es. Carta d'Identità, Passaporto..."
                                value={formData.documentType || ''}
                                onChange={e => setFormData({ ...formData, documentType: e.target.value })}
                                className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-medium text-[var(--text-main)]"
                              />
                              <datalist id="doc-types">
                                <option value="Carta d'Identità" />
                                <option value="Patente di Guida" />
                                <option value="Codice Fiscale / Tessera Sanitaria" />
                                <option value="Passaporto" />
                              </datalist>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Numero Documento</label>
                                <input type="text" value={formData.number || ''} onChange={e => setFormData({ ...formData, number: e.target.value })} className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-medium text-[var(--text-main)]" />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Data Rilascio</label>
                                <input type="date" value={formData.issueDate || ''} onChange={e => setFormData({ ...formData, issueDate: e.target.value })} className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-medium text-[var(--text-main)]" />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Data Scadenza</label>
                                <input type="date" value={formData.expiryDate || ''} onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-medium text-[var(--text-main)]" />
                              </div>
                              <div className="col-span-2">
                                <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Ente Rilascio</label>
                                <input type="text" value={formData.issuedBy || ''} onChange={e => setFormData({ ...formData, issuedBy: e.target.value })} className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-medium text-[var(--text-main)]" />
                              </div>
                              <div className="col-span-2">
                                <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Allegato PDF (Opzionale)</label>
                                <input type="file" accept="application/pdf" onChange={async e => {
                                  if (e.target.files && e.target.files[0]) {
                                    const base64 = await fileToBase64(e.target.files[0]);
                                    setFormData({ ...formData, pdfAttachment: base64 });
                                  }
                                }} className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all text-sm font-medium text-[var(--text-main)]" />
                                {formData.pdfAttachment && <p className="text-xs text-[var(--accent)] mt-2 font-medium">✓ PDF allegato ({(formData.pdfAttachment.length / 1024).toFixed(1)} KB)</p>}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Contenuto</label>
                              <textarea
                                required value={formData.content || ''}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all h-64 resize-none font-medium text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Scadenza (opzionale)</label>
                              <input
                                type="date" value={formData.date || ''}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-medium text-[var(--text-main)]"
                              />
                            </div>
                          </>
                        )}

                        {(formData.template !== 'auto' && formData.type !== 'auto') && (
                          <button type="submit" className="w-full py-5 bg-gradient-to-tr from-[var(--accent)] to-[var(--accent)]/80 hover:from-[var(--accent)] hover:to-[var(--accent)] text-white rounded-[1.5rem] font-bold transition-all shadow-xl shadow-[var(--accent)]/20 mt-6 text-lg hover:scale-[1.02] active:scale-[0.98]">
                            {editingModuleId ? 'Aggiorna' : 'Crea'} Sandbox
                          </button>
                        )}
                        {!editingModuleId && (
                          <button type="button" onClick={() => {setFormData({}); setAutoFormStep(0);}} className="w-full py-3 text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest hover:text-[var(--text-main)] transition-colors">
                            Cambia Template
                          </button>
                        )}
                      </form>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="h-full">
                <div className="mb-6 lg:mb-10 w-full px-4 lg:px-8">
                  <div className="relative group max-w-2xl mx-auto">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
                    <input 
                      type="text" 
                      placeholder={`Cerca ${selectedType ? TEMPLATES[selectedType].title : 'nelle tue Sandbox'}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-14 pr-14 py-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/5 transition-all text-base lg:text-lg font-medium text-[var(--text-main)]"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="p-2 hover:bg-[var(--bg)] rounded-xl text-[var(--text-muted)] transition-all"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                      <button 
                        onClick={handleVoiceSearch}
                        title="Ricerca Vocale"
                        className="p-2.5 hover:bg-[var(--accent-bg)] rounded-xl text-[var(--text-muted)] hover:text-[var(--accent)] transition-all"
                      >
                        <Mic className="w-5 h-5 lg:w-6 h-6" />
                      </button>
                    </div>
                  </div>
                  {selectedType && (
                    <div className="mt-3 flex items-center justify-center gap-2">
                       <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-2">Filtro attivo: {TEMPLATES[selectedType].title}</span>
                       <button onClick={() => setSelectedType(null)} className="text-[10px] font-bold text-[var(--accent)] hover:underline uppercase tracking-widest">Rimuovi</button>
                       {selectedType === 'document' && (
                         <>
                           <span className="w-1 h-1 bg-[var(--border)] rounded-full mx-1" />
                           <button 
                             onClick={() => setIsArchiveOpen(true)}
                             className="text-[10px] font-bold text-amber-500 hover:text-amber-600 uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                           >
                             <BookOpen className="w-3 h-3" />
                             Archivio Documenti
                           </button>
                         </>
                       )}
                    </div>
                  )}
                </div>

                {searchQuery.trim() && filteredTools.length > 0 && (
                  <div className="mb-10 animate-fade-in px-4 lg:px-8">
                    <h3 className="text-xl font-bold text-[var(--text-main)] mb-5 flex items-center gap-2">
                      <Wrench className="w-5 h-5 text-[var(--accent)]" />
                      Strumenti Rapidi
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4">
                      {filteredTools.map((t: any) => (
                        <button
                          key={t.id}
                          onClick={() => { setIsToolsOpen(true); setActiveToolId(t.id); setSearchQuery(''); }}
                          className="bg-[var(--card-bg)]/80 backdrop-blur-xl border border-[var(--border)] p-4 rounded-2xl hover:border-[var(--accent)] shadow-sm transition-all flex items-center gap-4 text-left group"
                        >
                          <div className={`w-12 h-12 bg-[var(--accent-bg)] ${t.color} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                            <t.icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-[var(--text-main)]">{t.title}</h4>
                            <p className="text-xs text-[var(--text-muted)] line-clamp-1">{t.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!selectedType && !searchQuery.trim() && !isListening ? (
                  <div className="px-4 lg:px-8 pb-40">
                    {/* Hero Dashboard Section - Minimalist */}
                    <div className="mb-8 pt-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                          <h2 className="text-3xl lg:text-4xl font-extrabold text-[var(--text-main)] tracking-tight">
                            Ciao, <span className="text-[var(--accent)]">{username}</span>
                          </h2>
                          <p className="text-[var(--text-muted)] font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Sandbox Dashboard</p>
                        </div>
                      </div>
                    </div>

                    {/* Widgets Section (Shortcuts) */}
                    {(pinnedToolIds.length > 0 || pinnedCategoryIds.length > 0) && (
                      <div className="mb-10">
                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-5 flex items-center gap-2">
                          <LayoutDashboard className="w-5 h-5 text-[var(--accent)]" />
                          I Tuoi Widget
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                          {/* Categories Pinned */}
                          {pinnedCategoryIds.map(catId => {
                            const t = TEMPLATES[catId as ModuleType];
                            if (!t) return null;
                            return (
                              <button
                                key={`pinned-cat-${catId}`}
                                onClick={() => setSelectedType(catId as ModuleType)}
                                className="bg-[var(--card-bg)] p-5 rounded-3xl border border-[var(--border)] shadow-sm hover:border-[var(--accent)] transition-all flex items-center gap-4 group"
                              >
                                <div className={`w-12 h-12 bg-[var(--bg)] rounded-2xl flex items-center justify-center ${t.color} group-hover:scale-110 transition-transform shadow-inner`}>
                                  <t.icon className="w-6 h-6" />
                                </div>
                                <span className="font-bold text-xs text-[var(--text-main)]">{t.title}</span>
                              </button>
                            );
                          })}
                          {/* Tools Pinned */}
                          {pinnedToolIds.map(toolId => {
                            const t = (Object.values(TOOLS_UTILITY).flat() as any[]).find(t => t.id === toolId);
                            if (!t) return null;
                            return (
                              <button
                                key={`pinned-tool-${toolId}`}
                                onClick={() => { setIsToolsOpen(true); setActiveToolId(toolId); }}
                                className="bg-[var(--card-bg)] p-5 rounded-3xl border border-[var(--border)] shadow-sm hover:border-[var(--accent)] transition-all flex items-center gap-4 group"
                              >
                                <div className={`w-12 h-12 bg-[var(--bg)] rounded-2xl flex items-center justify-center ${t.color} group-hover:scale-110 transition-transform shadow-inner text-[var(--accent)]`}>
                                  <t.icon className="w-6 h-6" />
                                </div>
                                <span className="font-bold text-xs text-[var(--text-main)]">{t.title}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* All Categories Grid (Main Entry Point) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-12">
                      {Object.entries(TEMPLATES).map(([key, t]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedType(key as ModuleType)}
                          className="bg-[var(--card-bg)] p-6 lg:p-8 rounded-[2.5rem] border border-[var(--border)] shadow-sm hover:border-[var(--accent)] hover:shadow-lg hover:-translate-y-1 transition-all group flex flex-col items-center text-center gap-4"
                        >
                          <div className={`w-14 h-14 lg:w-16 lg:h-16 bg-[var(--bg)] rounded-3xl flex items-center justify-center ${t.color} group-hover:bg-[var(--accent-bg)] transition-colors shadow-inner`}>
                            <t.icon className="w-7 h-7 lg:w-8 lg:h-8" />
                          </div>
                          <div>
                            <p className="font-black text-[var(--text-main)] text-sm">{t.title}</p>
                            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">
                              {modules.filter(m => m.type === key).length} Moduli
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Recent Activities */}
                    {recentModules.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <StickyNote className="w-5 h-5 text-[var(--accent)]" />
                            Recenti
                          </div>
                          <button onClick={() => setSearchQuery(' ')} className="text-[10px] font-bold text-[var(--accent)] hover:underline uppercase tracking-widest">Vedi Tutti</button>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                          {recentModules.map(module => (
                            <div key={module.id} className="w-full">
                              {module.type === 'auto' ? (
                                <AutoCard module={module} onDelete={requestDelete} onEdit={openEditModal} onDirectUpdate={updateModuleDirect} onShare={setSharingModule} />
                              ) : module.type === 'document' ? (
                                <DocumentCard module={module} onDelete={requestDelete} onEdit={openEditModal} onShare={setSharingModule} />
                              ) : module.type === 'split' ? (
                                <SplitCard module={module as any} onDelete={requestDelete} onEdit={openEditModal} onShare={setSharingModule} />
                              ) : (
                                <GenericCard module={module as any} onDelete={requestDelete} onEdit={openEditModal} onShare={setSharingModule} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : filteredModules.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                    <div className="w-200 h-20 bg-[var(--bg)] border border-[var(--border)] rounded-full flex items-center justify-center mb-6">
                      <LayoutDashboard className="w-10 h-10 text-[var(--text-muted)] opacity-50" />
                    </div>
                    <h3 className="text-2xl font-bold text-[var(--text-main)] mb-2">
                      {modules.length === 0 ? 'Nessun modulo' : 'Nessun risultato trovato'}
                    </h3>
                    <p className="text-[var(--text-muted)] mb-8 max-w-sm mx-auto">
                      {modules.length === 0 ? 'Inizia ad organizzare i tuoi dati aggiungendo il primo modulo.' : 'Prova a cercare un termine diverso o cambiare filtro di categoria.'}
                    </p>
                    <button
                      onClick={() => setIsAdding(true)}
                      className="flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-amber-500/20"
                    >
                      <Plus className="w-6 h-6" />
                      <span>Aggiungi Modulo</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6 stagger-fade-in px-4 lg:px-8 pb-32 md:pb-8">
                    {filteredModules.map((module) => (
                      <div key={module.id} className="w-full">
                        {module.type === 'auto' ? (
                          <AutoCard module={module} onDelete={requestDelete} onEdit={openEditModal} onDirectUpdate={updateModuleDirect} onShare={setSharingModule} />
                        ) : module.type === 'document' ? (
                          <DocumentCard module={module} onDelete={requestDelete} onEdit={openEditModal} onShare={setSharingModule} />
                        ) : module.type === 'split' ? (
                          <SplitCard module={module as import('./types').SplitModule} onDelete={requestDelete} onEdit={openEditModal} onShare={setSharingModule} />
                        ) : (
                          <GenericCard module={module as import('./types').GenericModule} onDelete={requestDelete} onEdit={openEditModal} onShare={setSharingModule} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Mobile Bottom Navigation Bar - Hidden during full-screen edit/modals */}
          {!isAdding && !isScanning && !editingModuleId && !isProfileOpen && !isToolsOpen && !isArchiveOpen && (
            <nav className="md:hidden fixed bottom-6 left-6 right-6 bg-[var(--sidebar-bg)] backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] border border-[var(--border)] flex items-center justify-around px-2 py-3 z-50">
              {/* 1. Dashboard / Home */}
              <button 
                onClick={() => { setSelectedType(null); setIsToolsOpen(false); setIsProfileOpen(false); setSearchQuery(''); }} 
                className={`relative p-3 flex flex-col items-center gap-1 transition-all ${!selectedType && !isToolsOpen && !isProfileOpen ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] font-medium'}`}
              >
                {!selectedType && !isToolsOpen && !isProfileOpen && <motion.div layoutId="nav-pill" className="absolute inset-0 bg-[var(--accent-bg)] rounded-2xl -z-10" />}
                <LayoutDashboard size={24} strokeWidth={!selectedType && !isToolsOpen && !isProfileOpen ? 2.5 : 2} />
              </button>
              
              {/* 2. Strumenti */}
              <button 
                onClick={() => { setIsToolsOpen(true); setIsProfileOpen(false); setSelectedType(null); }} 
                className={`relative p-3 flex flex-col items-center gap-1 transition-all ${isToolsOpen ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] font-medium'}`}
              >
                {isToolsOpen && <motion.div layoutId="nav-pill" className="absolute inset-0 bg-amber-500/10 rounded-2xl -z-10" />}
                <Wrench size={24} strokeWidth={isToolsOpen ? 2.5 : 2} />
              </button>
              
              {/* 3. Nuovo (+) */}
              <button onClick={() => setIsAdding(true)} className="flex items-center justify-center w-[58px] h-[58px] bg-gradient-to-tr from-amber-500 to-amber-400 rounded-[1.4rem] text-white shadow-xl shadow-amber-500/30 -mt-12 hover:scale-105 active:scale-95 transition-all border-4 border-[var(--bg)]">
                <Plus size={32} strokeWidth={3} />
              </button>
              
              {/* 4. Scanner */}
              <button onClick={() => { setIsScanning(true); setIsProfileOpen(false); setIsToolsOpen(false); }} className="relative p-3 flex flex-col items-center gap-1 text-[var(--text-muted)] hover:text-[var(--accent)] transition-all font-medium">
                <QrCode size={24} strokeWidth={2} />
              </button>
              
              {/* 5. Profilo */}
              <button 
                onClick={() => { setIsProfileOpen(true); setIsToolsOpen(false); setSelectedType(null); }} 
                className={`relative p-3 flex flex-col items-center gap-1 transition-all ${isProfileOpen ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] font-medium'}`}
              >
                {isProfileOpen && <motion.div layoutId="nav-pill" className="absolute inset-0 bg-amber-500/10 rounded-2xl -z-10" />}
                <User size={24} strokeWidth={isProfileOpen ? 2.5 : 2} />
              </button>
            </nav>
          )}






      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {moduleToDelete && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModuleToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[var(--card-bg)] rounded-[2.5rem] p-8 shadow-2xl border border-[var(--border)] text-center overflow-hidden"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Elimina Modulo</h3>
              <p className="text-[var(--text-muted)] text-sm mb-8">
                Sei sicuro di voler eliminare <span className="text-[var(--text-main)] font-bold">"{moduleToDelete.title || 'questo modulo'}"</span>? 
                Questa azione è irreversibile e i dati verranno rimossi permanentemente.
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => deleteModule(moduleToDelete.id)}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/20 active:scale-[0.98]"
                >
                  Sì, Elimina
                </button>
                <button
                  onClick={() => setModuleToDelete(null)}
                  className="w-full py-4 bg-[var(--bg)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-2xl font-bold transition-all"
                >
                  Annulla
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      {modules.length > 0 && (
        <button
          onClick={() => setIsAdding(true)}
          className="hidden md:flex fixed bottom-10 right-10 w-16 h-16 bg-amber-500 hover:bg-amber-600 text-white rounded-full items-center justify-center shadow-2xl shadow-amber-500/40 transition-transform hover:scale-110 z-30"
          aria-label="Aggiungi Modulo"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}
          </main>
        </div>
      </ErrorBoundary>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-6 left-1/2 z-[10000] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border ${
              toast.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' :
              toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' :
              'bg-[var(--accent-bg)] border-[var(--accent)]/20 text-[var(--accent)]'
            }`}
          >
            {toast.type === 'success' ? <ShieldCheck className="w-5 h-5" /> : toast.type === 'error' ? <Bell className="w-5 h-5" /> : <Hourglass className="w-5 h-5" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update Modal */}
      <AnimatePresence>
        {availableUpdate && (
          <div className="fixed inset-0 z-[200000] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[var(--card-bg)] rounded-[2.5rem] p-8 shadow-2xl border border-[var(--border)] text-center overflow-hidden"
            >
              <div className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--accent)]/10 rounded-2xl flex items-center justify-center text-[var(--accent)] shrink-0">
                  <Download className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[var(--text-main)]">Aggiornamento Disponibile</h3>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    È disponibile una nuova versione: <span className="text-[var(--accent)] font-bold">v{availableUpdate.latestVersion}</span>
                  </p>
                </div>
              </div>
              
              <div className="bg-[var(--bg)] p-4 rounded-2xl border border-[var(--border)]">
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Note di Rilascio</p>
                <p className="text-xs text-[var(--text-main)] whitespace-pre-wrap">{availableUpdate.releaseNotes || 'Nessuna nota di rilascio disponibile.'}</p>
              </div>

              {updateProgress !== null ? (
                <div className="space-y-2">
                  <div className="h-2 w-full bg-[var(--bg)] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${updateProgress}%` }}
                      className="h-full bg-[var(--accent)]"
                    />
                  </div>
                  <p className="text-[10px] font-bold text-center text-[var(--text-muted)] uppercase tracking-widest">Download in corso: {updateProgress}%</p>
                </div>
              ) : (
                <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        try {
                          setUpdateProgress(0);
                          await updateService.downloadAndInstall(availableUpdate, (p) => setUpdateProgress(p));
                        } catch (e: any) {
                          setUpdateProgress(null);
                          const errorMessage = e.message || JSON.stringify(e);
                          showToast(`Errore: ${errorMessage}`, 'error');
                          console.error('[App] Download update failed:', e);
                        }
                      }}
                    className="flex-1 py-4 bg-[var(--accent)] text-white rounded-2xl font-bold hover:bg-[var(--accent-hover)] transition-all shadow-lg shadow-amber-500/20"
                  >
                    Scarica e Installa APK
                  </button>
                  <button
                    onClick={() => setAvailableUpdate(null)}
                    className="px-6 py-4 bg-[var(--bg)] text-[var(--text-muted)] rounded-2xl font-bold hover:bg-[var(--border)] transition-all border border-[var(--border)]"
                  >
                    Dopo
                  </button>
                </div>
              )}
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Document Archive View */}
      <AnimatePresence>
        {isArchiveOpen && (
          <DocumentArchive 
            modules={modules} 
            onClose={() => setIsArchiveOpen(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}
