/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sun, Moon, Wrench, Plus, LayoutDashboard, Settings, User, LogOut, Search, Mic, Bell, CreditCard, Fingerprint, ShieldCheck, Lock, Menu, X, StickyNote, FileText, Grid2X2, Car, QrCode, Folder as FolderIcon, Check, Edit2, Trash2, BookOpen, ArrowLeft, ArrowRight, Camera, FileDown, Hourglass, Users, Download, Receipt, MapPin, Image as ImageIcon, Lightbulb, Globe, ChevronLeft, Bus, Home, Armchair, Bot } from 'lucide-react';
import { AntigravityAssistant } from './components/antigravity/AntigravityAssistant';
import { Module, ModuleType, Folder, DocumentModule } from './types';
import { storage, AppState } from './services/storage';
import { encryption } from './services/encryption';
import { GenericCard, AutoCard, DocumentCard, SplitCard, SingleExpenseCard, GalleryCard, TravelCard, StudyCard } from './components/Modules';
import { LockScreen } from './components/LockScreen';
import { QrScanner } from './components/QrScanner';
import { DocumentScanner } from './components/DocumentScanner';
import { ProfileScreen } from './components/ProfileScreen';
import { ToolsScreen, TOOLS, TOOLS_UTILITY } from './components/ToolsScreen';
import { AutoManagementScreen } from './components/AutoManagementScreen';
import { DocumentManagementScreen } from './components/DocumentManagementScreen';
import { NoteManagementScreen } from './components/NoteManagementScreen';
import { SplitScreen } from './components/SplitScreen';
import { DocumentArchive } from './components/DocumentArchive';
import { SingleExpenseScreen } from './components/SingleExpenseScreen';
import { AddressBookScreen } from './components/AddressBookScreen';
import { RecipesScreen } from './components/RecipesScreen';
import { TravelScreen } from './components/TravelScreen';
import { ConfirmDialog } from './components/ConfirmDialog';
import { StudyScreen } from './components/StudyScreen';
import { FurnitureScreen } from "./components/FurnitureScreen";
import { InstallmentsCard } from './components/InstallmentsCard';
import { InstallmentsScreen } from './components/InstallmentsScreen';
import { notificationService } from './services/notificationService';
import { APP_VERSION } from './constants/version';

import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { lzw } from './utils/lzw';
import { updateService, UpdateInfo } from './services/updateService';
import { App as CapApp } from '@capacitor/app';
import { generateUUID } from './utils/uuid';
import { ShareScreen } from './components/ShareScreen';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Device } from '@capacitor/device';
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
  auto: {
    title: 'Auto',
    content: '',
    icon: Car,
    color: 'text-rose-500'
  },
  split: {
    title: 'Spese',
    content: '',
    icon: Users,
    color: 'text-purple-500'
  },
  'single-expense': {
    title: 'Spesa Singola',
    content: '',
    icon: Receipt,
    color: 'text-amber-500'
  },
  document: {
    title: 'Documenti',
    content: '',
    icon: FileText,
    color: 'text-blue-500'
  },
  travel: {
    title: 'Viaggi',
    content: '',
    icon: Globe,
    color: 'text-indigo-400'
  },
  study: {
    title: 'Studio',
    content: '',
    icon: BookOpen,
    color: 'text-indigo-500'
  },
  recipes: {
    title: 'Ricette',
    content: '',
    icon: BookOpen,
    color: 'text-orange-500'
  },
  home: {
    title: 'Casa',
    content: '',
    icon: Home,
    color: 'text-teal-500'
  }
};

import { CAR_BRANDS } from './utils/carBrands';
import { CAR_MODELS } from './constants/carModels';
import { BrandModelPicker } from './components/BrandModelPicker';

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
  const [editingSingleExpenseModule, setEditingSingleExpenseModule] = useState<import('./types').SingleExpenseModule | null>(null);
  const [editingDocumentModule, setEditingDocumentModule] = useState<import('./types').DocumentModule | null>(null);
  const [editingGenericModule, setEditingGenericModule] = useState<import('./types').GenericModule | null>(null);
  const [editingTravelModule, setEditingTravelModule] = useState<import('./types').TravelModule | null>(null);
  const [editingStudyModule, setEditingStudyModule] = useState<any | null>(null);
  const [sharingModule, setSharingModule] = useState<Module | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [voiceResponse, setVoiceResponse] = useState<{ query: string; answer: string } | null>(null);
  const [selectedType, setSelectedType] = useState<ModuleType | 'home' | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSplashScreenActive, setIsSplashScreenActive] = useState(true);
  const [homeSubMenu, setHomeSubMenu] = useState(false);
  const [editingFurnitureModule, setEditingFurnitureModule] = useState<import('./types').FurnitureModule | null>(null);
  const [editingInstallmentsModule, setEditingInstallmentsModule] = useState<import('./types').InstallmentsModule | null>(null);

  useEffect(() => {
    // Show splash screen briefly, then go to lock screen immediately
    const timer = setTimeout(() => {
      setIsSplashScreenActive(false);
    }, 400);
    storage.initStorage().then(() => {
      try {
        const loadedAddresses = storage.loadAddressBook();
        if ((window as any).ChelonaNative && (window as any).ChelonaNative.saveAddresses) {
          (window as any).ChelonaNative.saveAddresses(JSON.stringify(loadedAddresses));
        }
      } catch (err) {
        console.error('Failed to sync addresses for Android Auto at startup', err);
      }
    }).catch(console.error);
    return () => clearTimeout(timer);
  }, []);

  // Ricezione intenzioni di condivisione di luoghi da mappe esterne
  useEffect(() => {
    const handleSharedText = (text: string) => {
      const nonLinkLines = text
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.includes('http://') && !l.includes('https://'));

      let title = 'Luogo Condiviso';
      let query = '';

      if (nonLinkLines.length === 0) {
        const linkMatch = text.match(/https?:\/\/\S+/);
        query = linkMatch ? linkMatch[0] : text;
        title = 'Luogo da Link';
      } else if (nonLinkLines.length === 1) {
        const line = nonLinkLines[0];
        const commaIdx = line.indexOf(',');
        if (commaIdx > 0) {
          title = line.substring(0, commaIdx).trim();
          query = line.trim();
        } else {
          title = line;
          query = line;
        }
      } else {
        title = nonLinkLines[0];
        query = nonLinkLines.slice(1).join(', ');
      }

      setIsAddressBookOpen(true);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-address-book-add', {
          detail: { title, query }
        }));
      }, 500);
    };

    const checkPendingIntent = () => {
      const pending = (window as any).pendingSharedIntent;
      if (pending && pending.text) {
        handleSharedText(pending.text);
        (window as any).pendingSharedIntent = null;
      }
    };

    // Ritarda leggermente il check iniziale per evitare collisioni con l'avvio della schermata di sblocco
    const startupTimer = setTimeout(checkPendingIntent, 2000);

    const handleEvent = (e: any) => {
      if (e.detail && e.detail.text) {
        handleSharedText(e.detail.text);
      }
    };
    
    window.addEventListener('sharedIntentReceived', handleEvent);
    return () => {
      clearTimeout(startupTimer);
      window.removeEventListener('sharedIntentReceived', handleEvent);
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [showVaultLock, setShowVaultLock] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [username, setUsername] = useState('Utente');
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBioSupported, setIsBioSupported] = useState(false);
  const [isBioEnabled, setIsBioEnabled] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  // isSandboxMode removed as per user request

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
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [isAddressBookOpen, setIsAddressBookOpen] = useState(false);
  const [isRecipesOpen, setIsRecipesOpen] = useState(false);
  const [autoFormStep, setAutoFormStep] = useState(0);
  const [picker, setPicker] = useState<'brand' | 'model' | null>(null);
  const [pendingImportModule, setPendingImportModule] = useState<Module | null>(null);
  const [showGalleryViewer, setShowGalleryViewer] = useState(false);
  const [gallerySelectedImage, setGallerySelectedImage] = useState<import('./types').GalleryImage | null>(null);
  const [galleryDeletingId, setGalleryDeletingId] = useState<string | null>(null);
  const [capturingField, setCapturingField] = useState<{ key: string; title: string } | null>(null);

  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(null);
  const [updateProgress, setUpdateProgress] = useState<number | null>(null);
  const [spesaSubMenu, setSpesaSubMenu] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  // Modal creazione gruppo spese
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitModalTitle, setSplitModalTitle] = useState('Gruppo Spese');
  const [splitModalCurrency, setSplitModalCurrency] = useState('EUR');
  const [splitModalBudget, setSplitModalBudget] = useState('');
  const [splitModalParticipants, setSplitModalParticipants] = useState<string[]>(['', '']);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('lifemod_theme');
    return (saved as 'light' | 'dark') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  // Banking-Style Auto-Lock: listen for app background/minimize events
  useEffect(() => {
    console.log('[App] Initializing Lifecycle Listener');

    // Esponiamo un flag globale che altri componenti possono
    // usare per sapere quando non bloccare l'app (es. file picker, link esterni, maps)
    (window as any).__chelona_bypass_lock = false;

    // Intercept all window.open calls globally to prevent lock screen when opening links
    const originalOpen = window.open;
    window.open = function(...args) {
      (window as any).__chelona_bypass_lock = true;
      return originalOpen.apply(this, args);
    };

    // Intercept clicks on anchor tags and file inputs globally
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      
      const anchor = target.closest('a');
      if (anchor && (anchor.target === '_blank' || anchor.href.startsWith('http'))) {
        (window as any).__chelona_bypass_lock = true;
      }
      
      const input = target.closest('input');
      if (input && input.type === 'file') {
        (window as any).__chelona_bypass_lock = true;
      }
    };
    document.addEventListener('click', handleGlobalClick, true);
    
    if (CapApp && typeof CapApp.addListener === 'function') {
      const stateListener = CapApp.addListener('appStateChange', ({ isActive }) => {
        console.log('[App] State changed, isActive:', isActive);
        if (!isActive) {
          // Se un bypass è attivo (file picker, link esterno, maps) non bloccare l'app
          if ((window as any).__chelona_bypass_lock || (window as any).__chelona_file_picker_open) {
            console.log('[App] Backgrounding skipped: bypass lock is active.');
            return;
          }
          console.log('[App] Backgrounding: Locking application for security.');
          setEncryptionKey(null);
          setShowVaultLock(true);
          setIsProfileOpen(false);
          setIsSettingsOpen(false);
          setIsAdding(false);
          setIsToolsOpen(false);
          setSelectedType(null);
        } else {
          // Quando torniamo in foreground resettiamo sempre i flag
          (window as any).__chelona_bypass_lock = false;
          (window as any).__chelona_file_picker_open = false;
        }
      });
      
      return () => {
        stateListener.then(l => l.remove());
        window.open = originalOpen;
        document.removeEventListener('click', handleGlobalClick, true);
      };
    } else {
      console.warn('[App] Capacitor App plugin not available or addListener missing.');
    }
  }, []);

  // Android back button: chiude il pannello/modal aperto più recente con logica a priorità.
  // NON usa window.history.back() per evitare swipe avanti/indietro indesiderati.
  useEffect(() => {
    if (!CapApp || typeof CapApp.addListener !== 'function') return;

    const backListener = CapApp.addListener('backButton', () => {
      // Priorità: chiude l'elemento più "in primo piano" prima
      if (moduleToDelete) { setModuleToDelete(null); return; }
      if (showGalleryViewer || gallerySelectedImage) { setShowGalleryViewer(false); setGallerySelectedImage(null); return; }
      if (editingAutoModule) { setEditingAutoModule(null); return; }
      if (editingSplitModule) { setEditingSplitModule(null); return; }
      if (editingSingleExpenseModule) { setEditingSingleExpenseModule(null); return; }
      if (editingTravelModule) { setEditingTravelModule(null); return; }
      if (editingStudyModule) { setEditingStudyModule(null); return; }
      if (editingDocumentModule) { setEditingDocumentModule(null); return; }
      if (editingGenericModule) { setEditingGenericModule(null); return; }
      if (editingFurnitureModule) { setEditingFurnitureModule(null); return; }
      if (editingInstallmentsModule) { setEditingInstallmentsModule(null); return; }
      if (editingModuleId) { setEditingModuleId(null); setFormData({}); return; }
      if (isAdding) { setIsAdding(false); setFormData({}); setSpesaSubMenu(false); return; }
      if (isProfileOpen) { setIsProfileOpen(false); return; }
      if (isAssistantOpen) { setIsAssistantOpen(false); return; }
      if (activeToolId) { setActiveToolId(null); return; }
      if (isToolsOpen) { setIsToolsOpen(false); return; }
      if (isArchiveOpen) { setIsArchiveOpen(false); return; }
      if (isRecipesOpen) { window.dispatchEvent(new CustomEvent('recipes-back')); return; }
      if (isAddressBookOpen) { setIsAddressBookOpen(false); return; }
      if (isSidebarOpen) { setIsSidebarOpen(false); return; }
      if (selectedFolderId) { setSelectedFolderId(null); return; }
      if (selectedType) { setSelectedType(null); return; }
      // Niente di aperto: esci dall'app
      CapApp.exitApp();
    });

    return () => {
      backListener.then(l => l.remove());
    };
  }, [
    moduleToDelete, showGalleryViewer, gallerySelectedImage,
    editingAutoModule, editingSplitModule, editingSingleExpenseModule,
    editingTravelModule, editingStudyModule, editingDocumentModule,
    editingGenericModule, editingFurnitureModule, editingInstallmentsModule, editingModuleId, isAdding, isProfileOpen, isAssistantOpen,
    activeToolId, isToolsOpen, isArchiveOpen, isAddressBookOpen, isRecipesOpen,
    isSidebarOpen, selectedFolderId, selectedType, spesaSubMenu
  ]);



  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lifemod_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  useEffect(() => {
    const init = async () => {
      if (currentProfileId) {
        const profiles = storage.loadProfiles();
        const profile = profiles.find(p => p.id === currentProfileId);
        if (profile) {
          setUsername(profile.username);
          setAvatar(profile.avatar);
          setIsBioEnabled(profile.isBiometricEnabled);
          setPinnedCategoryIds(profile.pinnedCategoryIds || []);
          setPinnedToolIds(profile.pinnedToolIds || []);
        }

        let saved = await storage.loadPublicState(currentProfileId);
        
        // MIGRATION: fallback to old state if public state is totally empty
        if (saved.modules.length === 0 && saved.folders.length === 0 && encryptionKey) {
            try {
                const oldSaved = await storage.loadState(encryptionKey, currentProfileId);
                if (oldSaved && (oldSaved.modules?.length > 0 || oldSaved.folders?.length > 0)) {
                    saved = oldSaved;
                }
            } catch (e) {
                console.warn("Migration failed or no old state", e);
            }
        }

        let loadedModules = saved.modules || [];
        
        if (encryptionKey) {
            try {
                const privateModules = await storage.loadPrivateState(encryptionKey, currentProfileId);
                loadedModules = loadedModules.map(pubMod => {
                    if (pubMod.type === 'auto' || pubMod.type === 'document') {
                        const priv = privateModules.find(p => p.id === pubMod.id);
                        return priv ? { ...pubMod, ...priv } : pubMod;
                    }
                    return pubMod;
                });
            } catch (e) {
                console.error("Failed to load private modules", e);
            }
        }
        
        setPendingImportModule(prev => {
          if (prev) {
            loadedModules = [prev, ...loadedModules];
            // save immediately with new modules
            saveAppState(loadedModules, saved.folders || []).then(() => showToast('Appunto importato al login con successo!'));
          }
          return null;
        });

        // Auto-pay installments when due date is reached
        const todayStr = new Date().toISOString().substring(0, 10);
        let hasChanges = false;
        loadedModules = loadedModules.map(m => {
          if (m.type === 'installments') {
            const inst = m as import('./types').InstallmentsModule;
            let paymentsChanged = false;
            const updatedPayments = (inst.payments || []).map(p => {
              if (!p.isPaid && p.dueDate <= todayStr) {
                paymentsChanged = true;
                return { ...p, isPaid: true, paidDate: new Date().toISOString() };
              }
              return p;
            });
            if (paymentsChanged) {
              hasChanges = true;
              return { ...inst, payments: updatedPayments };
            }
          }
          return m;
        });

        if (hasChanges) {
          saveAppState(loadedModules, saved.folders || []);
        }

        setModules(loadedModules);
        setFolders(saved.folders || []);

        // Controlla notifiche all'apertura dell'app
        const autoMods = loadedModules
          .filter(m => m.type === 'auto')
          .map(m => ({ id: m.id, brand: (m as any).brand, model: (m as any).model, currentKm: (m as any).currentKm }));
        notificationService.checkAndFire(autoMods);
        
        // Richiedi i permessi delle notifiche all'avvio
        notificationService.requestPermission().catch(console.error);

        // Trigger automatic update check upon successful unlock
        handleCheckUpdate(true);
      }
    };
    init();
  }, [encryptionKey, currentProfileId]);

  const handleCheckUpdate = React.useCallback(async (silent = true) => {
    // Controllo aggiornamenti
    if ((window as any).Capacitor || (window.location.search.includes('debug_update=1'))) {
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

    // Controllo aggiornamenti all'avvio - Rimosso su richiesta utente
    // handleCheckUpdate(true);
    // Ascolta eventi manuali di aggiornamento
    const handleManualUpdate = (e: any) => {
      if (e.detail) setAvailableUpdate(e.detail);
    };
    window.addEventListener('chelona_update_available', handleManualUpdate);
    
    return () => window.removeEventListener('chelona_update_available', handleManualUpdate);
  }, [handleCheckUpdate]);

  useEffect(() => {
    const handleTriggerWeeklyKm = () => {
      const autoMod = modules.find(m => m.type === 'auto');
      if (autoMod) {
        setEditingAutoModule(autoMod as any);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('open-auto-km-update'));
        }, 500);
      }
    };
    window.addEventListener('trigger-auto-km-page', handleTriggerWeeklyKm);
    return () => window.removeEventListener('trigger-auto-km-page', handleTriggerWeeklyKm);
  }, [modules]);


  const saveAppState = async (newModules: Module[], newFolders: Folder[]) => {
    if (!currentProfileId) return;
    
    // Create public modules by stripping sensitive info from 'auto' and 'document'
    const publicModules = newModules.map(m => {
        if (m.type === 'auto' || m.type === 'document') {
            return {
                id: m.id, type: m.type, title: m.title, x: m.x, y: m.y, w: m.w, h: m.h, folderId: m.folderId
            } as Module;
        }
        return m;
    });
    
    await storage.savePublicState({ modules: publicModules, folders: newFolders }, currentProfileId);
    
    // Save full data to private state if unlocked
    if (encryptionKey) {
        const privateModules = newModules.filter(m => m.type === 'auto' || m.type === 'document');
        await storage.savePrivateState(privateModules, encryptionKey, currentProfileId);
    }
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
      const type = processedData.template === 'auto' ? 'auto' : processedData.template === 'document' ? 'document' : processedData.template === 'split' ? 'split' : processedData.template === 'study' ? 'study' : 'generic';
      const newModule: Module = {
        id,
        type,
        x: (modules.length * 2) % 12,
        y: Infinity, // puts it at the bottom
        w: type === 'auto' ? 4 : type === 'document' ? 3 : 3,
        h: type === 'auto' ? 4 : type === 'document' ? 3 : 2,
        ...processedData,
        ...(type === 'auto' ? { lastKmUpdatedAt: new Date().toISOString() } : {}),
        ...(type === 'document' && !processedData.documentType ? { documentType: 'generic' } : {}),
        ...(type === 'split' ? { participants: [], expenses: [], currency: 'EUR' } : {}),
        ...({}),
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
      let rawData = data;
      if (rawData.startsWith('LZW:')) {
        rawData = lzw.decompress(rawData);
      }
      let parsedData = JSON.parse(rawData);
      
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
            await storage.saveRawState(profile.id, encData);
          }
          showToast(`Profilo "${profile.username}" importato!`);
          window.dispatchEvent(new Event('chelona_profiles_updated'));
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
        
        const newId = generateUUID();
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

        const currentVersion = APP_VERSION;
        const updatedSelection = [...modules, newModule];
        setModules(updatedSelection);
        await saveAppState(updatedSelection, folders);
        
        // Torna alla Homepage dopo la scansione riuscita
        setIsToolsOpen(false);
        setIsPublicToolsOpen(false);
        setSelectedType(null);
        setSelectedFolderId(null);
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


  const openEditModal = (module: Module) => {
    if ((module.type === 'auto' || module.type === 'document') && !encryptionKey) {
      setPendingAction(() => () => openEditModal(module));
      setShowVaultLock(true);
      return;
    }
    if (module.type === 'auto') {
      setEditingAutoModule(module as import('./types').AutoModule);
      return;
    }
    if (module.type === 'split') {
      setEditingSplitModule(module as import('./types').SplitModule);
      return;
    }
    if (module.type === 'single-expense') {
      setEditingSingleExpenseModule(module as import('./types').SingleExpenseModule);
      return;
    }
    if (module.type === 'document') {
      setEditingDocumentModule(module as import('./types').DocumentModule);
      return;
    }
    if (module.type === 'generic') {
      setEditingGenericModule(module as import('./types').GenericModule);
      return;
    }
    if (module.type === 'gallery') {
      setGallerySelectedImage(null);
      setShowGalleryViewer(true);
      return;
    }
    if (module.type === 'travel') {
      setEditingTravelModule(module as import('./types').TravelModule);
      return;
    }
    if (module.type === 'study') {
      setEditingStudyModule(module);
      return;
    }
    if (module.type === 'installments') {
      setEditingInstallmentsModule(module as import('./types').InstallmentsModule);
      return;
    }
    if (module.type === 'furniture') {
      setEditingFurnitureModule(module as import('./types').FurnitureModule);
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
    setModules(prev => {
      const exists = prev.some(m => m.id === updatedModule.id);
      const updated = exists
        ? prev.map(m => m.id === updatedModule.id ? updatedModule : m)
        : [updatedModule, ...prev];
      saveAppState(updated, folders).catch(console.error);
      return updated;
    });
  };

  const deleteModule = async (id: string) => {
    if (!encryptionKey) return;
    const updated = modules.filter(m => m.id !== id);
    setModules(updated);
    await saveAppState(updated, folders);
    setModuleToDelete(null);
    showToast('Elemento eliminato correttamente', 'info');
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
    setFolderToDelete(id);
  };

  const confirmDeleteFolder = async () => {
    if (folderToDelete) {
      const updatedFolders = folders.filter(f => f.id !== folderToDelete);
      const updatedModules = modules.map(m => m.folderId === folderToDelete ? { ...m, folderId: undefined } : m);

      setFolders(updatedFolders);
      setModules(updatedModules);
      await saveAppState(updatedModules, updatedFolders);
      if (selectedFolderId === folderToDelete) {
        setSelectedFolderId(null);
      }
      setFolderToDelete(null);
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
      
      if (!supported) {
        setBioError('Il tuo dispositivo non supporta o non ha configurato l\'accesso biometrico.');
        return;
      }

      console.log('[App] Exporting master key for secure storage...');
      const masterKeyStr = await encryption.exportKey(encryptionKey);
      
      const profiles = storage.loadProfiles();
      const profile = profiles.find(p => p.id === currentProfileId);
      
      // Delete old credentials if they exist to prevent leakage/accumulation
      if (profile && profile.biometricServerKey) {
        try {
          await m.biometricService.deleteCredentials(currentProfileId, profile.biometricServerKey);
        } catch (delErr) {
          console.warn('[App] Failed to delete old credentials, continuing:', delErr);
        }
      }

      // Generate a brand new completely unique server key for this profile to prevent conflict with others
      const uniqueSuffix = Math.random().toString(36).substring(2, 7) + '.' + Date.now();
      const serverKey = 'chelona.app.' + currentProfileId + '.' + uniqueSuffix;

      // Save it natively
      await m.biometricService.saveMasterKey(currentProfileId, masterKeyStr, serverKey);
      
      if (profile) {
        const updatedProfile = {
          ...profile,
          isBiometricEnabled: true,
          biometricServerKey: serverKey,
          credentialId: 'native-v2' 
        };
        
        storage.saveProfiles(profiles.map(p => p.id === currentProfileId ? updatedProfile : p));
        setIsBioEnabled(true);
        showToast('Accesso biometrico configurato con successo!', 'success');
      }
    } catch (e: any) {
      console.error('[App] Biometric activation error', e);
      setBioError(e.message || 'Errore durante la registrazione biometrica.');
    }
  };

  const handleDisableBiometrics = async () => {
    if (!currentProfileId) return;
    try {
      const m = await import('./services/biometricService');
      const profiles = storage.loadProfiles();
      const profile = profiles.find(p => p.id === currentProfileId);
      if (profile) {
        const oldServerKey = profile.biometricServerKey;
        if (oldServerKey) {
          try {
            await m.biometricService.deleteCredentials(currentProfileId, oldServerKey);
          } catch (bioErr) {
            console.error('[App] Failed to delete biometric credentials:', bioErr);
          }
        }
        
        const updatedProfile = {
          ...profile,
          isBiometricEnabled: false,
          biometricServerKey: undefined,
          credentialId: undefined
        };
        
        storage.saveProfiles(profiles.map(p => p.id === currentProfileId ? updatedProfile : p));
        setIsBioEnabled(false);
        showToast('Accesso biometrico disattivato con successo!', 'success');
      }
    } catch (e: any) {
      console.error('[App] Biometric deactivation error', e);
      showToast('Errore durante la disattivazione biometrica.', 'error');
    }
  };

  const handleUpdateWidgets = (catIds: string[], toolIds: string[]) => {
    setPinnedCategoryIds(catIds);
    setPinnedToolIds(toolIds);
    
    // Save to profile
    const profiles = storage.loadProfiles();
    const updated = profiles.map(p => p.id === currentProfileId ? { ...p, pinnedCategoryIds: catIds, pinnedToolIds: toolIds } : p);
    storage.saveProfiles(updated);
    showToast('Widget aggiornati!');
  };

  const handleLogout = () => {
    setEncryptionKey(null);
    setCurrentProfileId(null);
    // CRITICAL: We NO LONGER call setModules([]) here. 
    // This avoids a race condition with the auto-save useEffect 
    // that could overwrite encrypted data with an empty array.
    setIsProfileOpen(false);
    setIsSidebarOpen(false);
    setIsSettingsOpen(false);
    setIsAdding(false);
    setSearchQuery('');
  };

  // useContainerWidth removed (DnD disabled)
  const mounted = true;
  const width = 1200; // not used anymore

  const filteredModules = useMemo(() => {
    return modules.filter(m => {
      // Folder filter - Gallery is global, ignore folder if selectedType is gallery
      const folderMatch = (selectedType === 'gallery') || (!selectedFolderId ? !m.folderId : m.folderId === selectedFolderId);
      if (!folderMatch) return false;

      // Type (Category) filter - Disabled when a folder/group is selected
      if (!selectedFolderId && selectedType) {
        if (selectedType === 'split') {
          if (m.type !== 'split' && m.type !== 'single-expense' && m.type !== 'installments') return false;
        } else if (m.type !== selectedType) {
          return false;
        }
      }

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



  const filteredTools = useMemo(() => {
    if (!searchQuery.trim() || isToolsOpen) return [];
    const query = searchQuery.toLowerCase();
    return TOOLS.filter((t: any) => t.title.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query));
  }, [searchQuery, isToolsOpen]);

  const handleSaveToSandbox = async (title: string, base64: string, targetFolderName?: string) => {
    if (!encryptionKey || !currentProfileId) return;

    let folderId = undefined;
    let newFolders = folders;

    if (targetFolderName) {
      const existingFolder = folders.find(f => f.name.toLowerCase() === targetFolderName.toLowerCase());
      if (existingFolder) {
        folderId = existingFolder.id;
      } else {
        folderId = Math.random().toString(36).substr(2, 9);
        newFolders = [...folders, { id: folderId, name: targetFolderName }];
        setFolders(newFolders);
      }
    }

    if (targetFolderName === 'Galleria') {
      const existingGallery = modules.find(m => m.type === 'gallery') as import('./types').GalleryModule;
      
      const newImage = {
        id: generateUUID(),
        image: base64,
        filterName: title.replace('Immagine: ', ''),
        createdAt: new Date().toISOString()
      };

      if (existingGallery) {
        // Upgrade legacy module if necessary
        const existingImages = existingGallery.images || [];
        if (existingGallery.image && existingImages.length === 0) {
          existingImages.push({
            id: generateUUID(),
            image: existingGallery.image,
            filterName: existingGallery.filterName,
            createdAt: new Date().toISOString()
          });
        }
        
        const updatedModule: import('./types').GalleryModule = {
          ...existingGallery,
          images: [newImage, ...existingImages],
          image: undefined, // Clear legacy
          filterName: undefined
        };
        const newModules = modules.map(m => m.id === existingGallery.id ? updatedModule : m);
        setModules(newModules);
        await saveAppState(newModules, newFolders);
      } else {
        const newModule: import('./types').GalleryModule = {
          id: generateUUID(),
          type: 'gallery',
          title: 'Galleria',
          images: [newImage],
          folderId: folderId,
          x: 0,
          y: 0,
          w: 4,
          h: 4
        };
        const newModules = [newModule, ...modules];
        setModules(newModules);
        await saveAppState(newModules, newFolders);
      }
    } else {
      const newModule: DocumentModule = {
        id: generateUUID(),
        type: 'document',
        title,
        documentType: targetFolderName ? 'Immagine' : 'Risultato Strumento',
        folderId: folderId,
        x: 0,
        y: 0,
        w: 2,
        h: 2,
        pdfAttachment: base64
      };
      const newModules = [newModule, ...modules];
      setModules(newModules);
      await saveAppState(newModules, newFolders);
    }
    
    if (targetFolderName === 'Galleria') {
      // Don't close the tool - the toast in ImageFilterTool handles UX feedback
      return;
    }
    
    setIsToolsOpen(false);
    setActiveToolId(null);
    showToast('Salvato dentro Chelona', 'success');
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
          
          const profilesEncFile = zip.file("profiles.enc");
          if (profilesEncFile) {
            if (confirm("Vuoi ripristinare il backup completo (profili e dati)? Questo sovrascriverà i profili e i dati esistenti su questo dispositivo.")) {
              const profilesEnc = await profilesEncFile.async("string");
              await storage.saveRawProfiles(profilesEnc);
              
              // Read and write all state files in the zip
              const files = Object.keys(zip.files);
              for (const name of files) {
                if (name.startsWith('state_') && name.endsWith('.enc')) {
                  const profileId = name.substring(6, name.length - 4);
                  const stateEncFile = zip.file(name);
                  if (stateEncFile) {
                    const stateEnc = await stateEncFile.async("string");
                    await storage.saveRawState(profileId, stateEnc);
                  }
                }
              }
              
              showToast("Backup ripristinato con successo!", "success");
              window.dispatchEvent(new Event('chelona_profiles_updated'));
            }
            return;
          }
          
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
              const newModule = { ...decryptedModule, id: generateUUID() };
              
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
             const newModule = { ...parsed.data, id: generateUUID() };
             
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


  const recognitionRef = useRef<any>(null);

  const triggerVoiceResponse = (query: string, answer: string) => {
    setVoiceResponse({ query, answer });
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(answer);
        utterance.lang = 'it-IT';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const itVoice = voices.find(v => v.lang.startsWith('it'));
        if (itVoice) utterance.voice = itVoice;
        window.speechSynthesis.speak(utterance);
      }
    } catch(e) {
      console.warn("SpeechSynthesis error", e);
    }
  };

  const processVoiceQuery = (queryText: string) => {
    const text = queryText.toLowerCase().trim();
    if (!text) return;

    const isAutoRelated = text.includes('auto') || text.includes('macchina') || text.includes('veicolo') || text.includes('vettura') || 
                          text.includes('revisione') || text.includes('tagliando') || text.includes('bollo') || 
                          text.includes('assicurazione') || text.includes('gomme') || text.includes('targa') || text.includes('km') || text.includes('chilometri');

    if (!isAutoRelated) {
      setSearchQuery(queryText);
      return;
    }

    const autoModule = modules.find(m => m.type === 'auto') as import('./types').AutoModule | undefined;
    if (!autoModule) {
      triggerVoiceResponse(
        queryText, 
        "Non ho trovato nessuna automobile configurata nella tua Dashboard. Aggiungine una per poter tracciare chilometri e scadenze."
      );
      return;
    }

    const currentKm = autoModule.currentKm ? parseInt(autoModule.currentKm.replace(/\D/g, '')) : 0;
    const brandModel = `${autoModule.brand || ''} ${autoModule.model || ''}`.trim() || 'tua vettura';

    if (text.includes('revisione')) {
      let expiryDateStr = autoModule.lastRevision;
      let isCalculated = false;

      if (!expiryDateStr && autoModule.registrationYear) {
        const regYear = parseInt(autoModule.registrationYear);
        if (!isNaN(regYear)) {
          expiryDateStr = `${regYear + 4}-12-31`;
          isCalculated = true;
        }
      }

      if (!expiryDateStr) {
        triggerVoiceResponse(
          queryText,
          `Non ho registrato nessuna data di revisione per la tua ${brandModel}. Puoi inserirla modificando la scheda dell'auto.`
        );
        return;
      }

      const expiryDate = new Date(expiryDateStr);
      const today = new Date();
      today.setHours(0,0,0,0);
      const daysLeft = Math.round((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

      let answer = "";
      if (text.includes('km') || text.includes('chilometri') || text.includes('mancano') || text.includes('manca')) {
        answer = `La revisione della tua ${brandModel} ha una scadenza temporale e non chilometrica. `;
        if (daysLeft < 0) {
          answer += `Risulta scaduta da ${Math.abs(daysLeft)} giorni (il ${expiryDate.toLocaleDateString('it-IT')}). Ti consiglio di effettuarla al più presto!`;
        } else {
          answer += `Scadrà il ${expiryDate.toLocaleDateString('it-IT')} (tra ${daysLeft} giorni).`;
        }
      } else {
        if (daysLeft < 0) {
          answer = `La revisione della tua ${brandModel} è scaduta il ${expiryDate.toLocaleDateString('it-IT')} (da ${Math.abs(daysLeft)} giorni). Dovresti prenotarla subito per evitare sanzioni.`;
        } else {
          answer = `La revisione della tua ${brandModel} scade il ${expiryDate.toLocaleDateString('it-IT')} (tra ${daysLeft} giorni).${isCalculated ? ' Questa data è calcolata a 4 anni dall\'immatricolazione.' : ''}`;
        }
      }
      triggerVoiceResponse(queryText, answer);
      return;
    }

    if (text.includes('tagliando') || text.includes('servizio') || text.includes('manutenzione')) {
      const lastServiceKm = autoModule.lastServiceKm ? parseInt(autoModule.lastServiceKm.replace(/\D/g, '')) : 0;
      if (!lastServiceKm) {
        triggerVoiceResponse(
          queryText,
          `Non ho dati sull'ultimo tagliando effettuato per la tua ${brandModel}. Inserisci i chilometri dell'ultimo tagliando per calcolare la scadenza.`
        );
        return;
      }

      const targetKm = lastServiceKm + 15000;
      const kmDiff = targetKm - currentKm;

      let answer = "";
      if (kmDiff < 0) {
        answer = `Hai superato la soglia consigliata per il tagliando della tua ${brandModel} di ${Math.abs(kmDiff).toLocaleString('it-IT')} chilometri! L'ultimo tagliando è stato fatto a ${lastServiceKm.toLocaleString('it-IT')} km ed era consigliato effettuarlo entro i ${targetKm.toLocaleString('it-IT')} km.`;
      } else {
        answer = `Per il prossimo tagliando della tua ${brandModel} mancano circa ${kmDiff.toLocaleString('it-IT')} chilometri. L'ultimo è stato eseguito a ${lastServiceKm.toLocaleString('it-IT')} km ed è consigliato farlo a ${targetKm.toLocaleString('it-IT')} km.`;
      }
      triggerVoiceResponse(queryText, answer);
      return;
    }

    if (text.includes('assicurazione') || text.includes('polizza')) {
      const lastInsurance = autoModule.lastInsurance;
      if (!lastInsurance) {
        triggerVoiceResponse(queryText, `Non ho registrato la scadenza dell'assicurazione per la tua ${brandModel}.`);
        return;
      }

      const expiryDate = new Date(lastInsurance);
      const today = new Date();
      today.setHours(0,0,0,0);
      const daysLeft = Math.round((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

      let answer = "";
      if (daysLeft < 0) {
        answer = `L'assicurazione della tua ${brandModel} è scaduta il ${expiryDate.toLocaleDateString('it-IT')} (da ${Math.abs(daysLeft)} giorni).`;
      } else {
        answer = `L'assicurazione della tua ${brandModel} scade il ${expiryDate.toLocaleDateString('it-IT')} (tra ${daysLeft} giorni).`;
      }
      triggerVoiceResponse(queryText, answer);
      return;
    }

    if (text.includes('bollo') || text.includes('tassa')) {
      const lastTax = autoModule.lastTax;
      if (!lastTax) {
        triggerVoiceResponse(queryText, `Non ho inserito la scadenza del bollo per la tua ${brandModel}.`);
        return;
      }

      const expiryDate = new Date(lastTax);
      const today = new Date();
      today.setHours(0,0,0,0);
      const daysLeft = Math.round((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

      let answer = "";
      if (daysLeft < 0) {
        answer = `Il bollo della tua ${brandModel} risulta scaduto il ${expiryDate.toLocaleDateString('it-IT')} (da ${Math.abs(daysLeft)} giorni).`;
      } else {
        answer = `Il bollo della tua ${brandModel} scade il ${expiryDate.toLocaleDateString('it-IT')} (tra ${daysLeft} giorni).`;
      }
      triggerVoiceResponse(queryText, answer);
      return;
    }

    if (text.includes('gomme') || text.includes('pneumatici') || text.includes('tires')) {
      const tiresKm = autoModule.tiresKm ? parseInt(autoModule.tiresKm.replace(/\D/g, '')) : 0;
      if (!tiresKm) {
        triggerVoiceResponse(queryText, `Non ho registrato i chilometri dell'ultimo cambio gomme per la tua ${brandModel}.`);
        return;
      }

      const offset = autoModule.tiresSuggestedOffsetKm ? Number(autoModule.tiresSuggestedOffsetKm) : 0;
      const targetKm = tiresKm + 10000 + offset;
      const kmDiff = targetKm - currentKm;

      let answer = "";
      if (kmDiff < 0) {
        answer = `Dovresti controllare le gomme della tua ${brandModel}! Hai superato il chilometraggio consigliato di ${Math.abs(kmDiff).toLocaleString('it-IT')} km.`;
      } else {
        answer = `Per il prossimo controllo delle gomme della tua ${brandModel} mancano circa ${kmDiff.toLocaleString('it-IT')} chilometri.`;
      }
      triggerVoiceResponse(queryText, answer);
      return;
    }

    if (text.includes('km') || text.includes('chilometri') || text.includes('stato') || text.includes('info')) {
      let answer = `La tua ${brandModel} (targa: ${autoModule.plate || 'Non specificata'}) ha attualmente registrati ${currentKm.toLocaleString('it-IT')} chilometri. `;
      if (autoModule.lastKmUpdatedAt) {
        const updateDate = new Date(autoModule.lastKmUpdatedAt);
        answer += `L'ultimo aggiornamento risale al ${updateDate.toLocaleDateString('it-IT')} alle ore ${updateDate.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}.`;
      }
      triggerVoiceResponse(queryText, answer);
      return;
    }

    triggerVoiceResponse(
      queryText,
      `Ho trovato l'auto ${brandModel} con targa ${autoModule.plate || 'Non specificata'}. Puoi chiedermi "quando scade la revisione" o "quanti chilometri mancano al tagliando".`
    );
  };

  const handleVoiceSearch = async () => {
    // Check if running on Capacitor (Android/iOS)
    const { platform } = await Device.getInfo();
    
    if (platform === 'android' || platform === 'ios') {
      try {
        const { available } = await SpeechRecognition.available();
        if (!available) {
          showToast('La ricerca vocale non è disponibile su questo dispositivo.', 'error');
          return;
        }

        let hasPermission = false;
        try {
          const perms = await SpeechRecognition.checkPermissions() as any;
          if (perms.speech === 'granted' || perms.speechRecognition === 'granted') {
            hasPermission = true;
          }
        } catch (e) { console.log('checkPermissions err:', e); }

        if (!hasPermission) {
          try {
            const newPerms = await SpeechRecognition.requestPermissions() as any;
            if (newPerms.speech === 'granted' || newPerms.speechRecognition === 'granted') {
              hasPermission = true;
            }
          } catch (e) { console.log('requestPermissions err:', e); }
        }

        if (!hasPermission) {
          showToast('Permesso microfono negato o non supportato.', 'error');
          return;
        }

        setIsListening(true);
        if (navigator.vibrate) navigator.vibrate(50);

        SpeechRecognition.start({
          language: 'it-IT',
          maxResults: 1,
          prompt: 'Parla ora...',
          partialResults: false,
          popup: true,
        }).then((result) => {
          if (result.matches && result.matches.length > 0) {
            processVoiceQuery(result.matches[0]);
            if (navigator.vibrate) navigator.vibrate([30, 30]);
          }
        }).catch((err) => {
          console.error('Speech recognition error:', err);
          showToast('Errore durante la ricerca vocale.', 'error');
        }).finally(() => {
          setIsListening(false);
        });

      } catch (e) {
        console.error('Capacitor Speech Recognition error:', e);
        showToast('Errore durante l\'inizializzazione della ricerca vocale.', 'error');
        setIsListening(false);
      }
      return;
    }

    // Web Fallback
    const SpeechRecognitionWeb = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionWeb) {
      showToast('La ricerca vocale non è supportata su questo browser.', 'error');
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }

    if (!SpeechRecognitionWeb) {
      showToast('La ricerca vocale non è supportata su questo browser.', 'error');
      return;
    }

    const recognition = new SpeechRecognitionWeb();
    recognitionRef.current = recognition;
    recognition.lang = 'it-IT';
    recognition.continuous = false;
    recognition.interimResults = false;

    let timeoutId: any;

    recognition.onstart = () => {
      setIsListening(true);
      if (navigator.vibrate) navigator.vibrate(50);
      timeoutId = setTimeout(() => {
         recognition.stop();
         setIsListening(false);
      }, 5000); // 5s timeout if no speech detected
    };

    recognition.onresult = (event: any) => {
      clearTimeout(timeoutId);
      const transcript = event.results[0][0].transcript;
      processVoiceQuery(transcript);
      if (navigator.vibrate) navigator.vibrate([30, 30]);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      clearTimeout(timeoutId);
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        showToast('Permesso microfono negato.', 'error');
      } else {
        showToast('Errore durante la ricerca vocale.', 'error');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      clearTimeout(timeoutId);
      setIsListening(false);
      recognitionRef.current = null;
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
      <div className="p-6 flex items-center justify-between safe-area-header transition-all duration-500">
        <div className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-[var(--accent)] to-[var(--success)] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[var(--accent)]/20 rotate-3 group-hover:rotate-0 transition-all turtle-float">
            <Grid2X2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-[var(--text-main)]">Chelona</h1>
            <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest">v{APP_VERSION}</p>
          </div>
        </div>
        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-[var(--text-muted)] hover:bg-[var(--bg)] rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {/* Sandbox Mode removed from sidebar - Moved to Profile */}
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

        {folders.length > 0 && (
          <>
            <div className="pt-6 pb-2 px-4">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">I Tuoi Gruppi</p>
            </div>
            {folders.map(folder => (
              <button
                key={`side-folder-${folder.id}`}
                onClick={() => { setSelectedFolderId(folder.id); setSelectedType(null); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${selectedFolderId === folder.id ? 'bg-amber-500/10 text-amber-600' : 'text-[var(--text-muted)] hover:bg-[var(--bg)]'}`}
              >
                <FolderIcon className="w-5 h-5 text-amber-500" />
                <span className="truncate">{folder.name}</span>
              </button>
            ))}
          </>
        )}

      </nav>

      <div className="pb-4 mt-auto"></div>
    </>
  );

  return (
    <div className="shell-container">
      {/* Password Managers on Mobile (Safari/Chrome AutoFill) inject extra DOM nodes into the password <input>. 
          If React tries to unmount the LockScreen, it violently crashes with a DOMException (removeChild). 
          To completely bypass this, we NEVER unmount the LockScreen, we just hide it visually. */}
      <div 
        style={{ 
          display: !currentProfileId && !isProfileOpen && !isPublicToolsOpen ? 'block' : 'none', 
          position: 'absolute', inset: 0, zIndex: 99999 
        }}
      >
        <LockScreen 
          mode="app-start"
          isVisible={!currentProfileId && !isProfileOpen && !isPublicToolsOpen}
          onAuthenticated={(key, profileId) => {
            setEncryptionKey(key);
            setCurrentProfileId(profileId);
          }} 
          onStartScan={() => setIsScanning(true)}
          onOpenTools={() => setIsPublicToolsOpen(true)}
          onOpenAddressBook={() => setIsAddressBookOpen(true)}
          onImportFile={handleImportFile}
          onCheckUpdate={() => handleCheckUpdate(true)}
        />
      </div>

      {showVaultLock && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 99999 }}>
          <LockScreen 
            mode="vault-unlock"
            isVisible={showVaultLock}
            targetProfileId={currentProfileId || undefined}
            onAuthenticated={(key, _profileId) => {
              setEncryptionKey(key);
              setShowVaultLock(false);
              if (pendingAction) {
                pendingAction();
                setPendingAction(null);
              }
            }} 
            onStartScan={() => {}}
            onOpenTools={() => { setShowVaultLock(false); }}
          />
        </div>
      )}

    <ErrorBoundary>
      <AnimatePresence>
        {isSplashScreenActive && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] bg-[var(--bg)] flex flex-col items-center justify-center overflow-hidden"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8, ease: "backOut" }}
              className="relative"
            >
              <div className="w-full max-w-[280px] h-40 flex items-center justify-center overflow-hidden">
                <img src="/chelona_logo.png" alt="Chelona Logo" className="max-w-full max-h-full object-contain" />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-8 text-center"
            >
              <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tighter uppercase mb-1">Chelona</h1>
              <p className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.3em] ml-1">Secure Vault</p>
            </motion.div>

            <div className="absolute bottom-12 flex flex-col items-center gap-4">
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ 
                      scale: [1, 1.5, 1],
                      backgroundColor: ['var(--border)', 'var(--accent)', 'var(--border)']
                    }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                    className="w-1.5 h-1.5 rounded-full"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-[100dvh] bg-[var(--bg)] text-[var(--text-main)] font-sans selection:bg-[var(--accent)] selection:text-white transition-colors duration-300">


        {isPublicToolsOpen && !encryptionKey && (
          <div className="h-[100dvh] bg-[var(--bg)] flex flex-col relative w-full overflow-hidden" style={{ position: 'absolute', inset: 0, zIndex: 99999 }}>
             <header className="h-20 lg:h-24 bg-[var(--header-bg)] backdrop-blur-2xl border-b border-[var(--border)] px-4 lg:px-8 flex items-center justify-between shrink-0 z-10 shadow-sm safe-area-header">
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
               <ToolsScreen showToast={showToast} onSaveToSandbox={undefined} modules={modules} />
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
          <div className="flex h-full w-full bg-[var(--bg)] overflow-hidden relative font-sans transition-colors duration-300">

            <main className="flex-1 flex flex-col overflow-hidden w-full relative">
              <header className="h-16 lg:h-20 bg-[var(--bg)] px-6 lg:px-12 flex items-center justify-between shrink-0 z-10 safe-area-header transition-all">
                {/* Left side: Contextual Title */}
                <div className="flex items-center gap-4">
                  {(isToolsOpen || selectedType || selectedFolderId) && (
                    <button 
                      onClick={() => { setIsToolsOpen(false); setSelectedType(null); setSelectedFolderId(null); setActiveToolId(null); }}
                      className="p-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] transition-all flex items-center justify-center"
                      title="Torna alla Dashboard"
                    >
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                  )}
                  <h1 className="text-xl lg:text-2xl font-bold text-[var(--text-main)] tracking-tight">
                    {isToolsOpen ? 'Strumenti' : selectedFolderId ? (folders.find(f => f.id === selectedFolderId)?.name || 'Cartella') : selectedType ? (TEMPLATES[selectedType as keyof typeof TEMPLATES]?.title || 'Sandbox') : 'Dashboard'}
                  </h1>
                </div>

                {/* Right side: Avatar (Lock and Theme moved to Profile) */}
                <div className="flex items-center gap-2 sm:gap-4">
                  <button 
                    onClick={() => { setIsAssistantOpen(true); setIsProfileOpen(false); setSelectedType(null); setIsToolsOpen(false); }}
                    className="p-2 sm:p-2.5 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-full text-[var(--accent)] transition-all flex items-center justify-center shadow-sm"
                    title="Antigravity AI"
                  >
                    <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  <button 
                    onClick={() => { setIsToolsOpen(true); setIsProfileOpen(false); setSelectedType(null); }}
                    className="p-2 sm:p-2.5 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-full text-[var(--accent)] transition-all flex items-center justify-center shadow-sm hidden md:flex"
                    title="Strumenti"
                  >
                    <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  <button 
                    onClick={() => setIsAddressBookOpen(true)}
                    className="p-2 sm:p-2.5 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-full text-[var(--accent)] transition-all flex items-center justify-center shadow-sm"
                    title="Rubrica GPS"
                  >
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  <button 
                    onClick={() => setIsProfileOpen(true)} 
                    className="w-10 h-10 lg:w-11 lg:h-11 rounded-full overflow-hidden border border-[var(--border)] focus:outline-none hover:opacity-80 transition-all bg-[var(--surface-variant)] shadow-sm"
                  >
                    <img src={avatar || `https://ui-avatars.com/api/?name=${username}&background=E3E3E3&color=5E5E5E`} alt="Profile" className="w-full h-full object-cover" />
                  </button>
                </div>
              </header>



              <div className="flex-1 overflow-y-auto w-full custom-scrollbar">

                  {isAssistantOpen ? (
              <AntigravityAssistant currentProfileId={currentProfileId} onClose={() => setIsAssistantOpen(false)} />
            ) : isProfileOpen ? (
              <ProfileScreen
                onClose={() => setIsProfileOpen(false)}
                username={username}
                avatar={avatar}
                currentProfileId={currentProfileId!}
                onUpdateProfile={handleUpdateProfile}
                isBioSupported={isBioSupported}
                isBioEnabled={isBioEnabled}
                onEnableBiometrics={handleEnableBiometrics}
                onDisableBiometrics={handleDisableBiometrics}
                bioError={bioError}
                onLogout={handleLogout}
                encryptionKey={encryptionKey!}
                modules={modules}
                folders={folders}
                onEncryptionKeyChanged={setEncryptionKey}
                showToast={showToast}
                pinnedCategoryIds={pinnedCategoryIds}
                pinnedToolIds={pinnedToolIds}
                onUpdateWidgets={handleUpdateWidgets}
                // isSandboxMode removed

                theme={theme}
                onToggleTheme={toggleTheme}
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
            ) : editingAutoModule ? (
              <AutoManagementScreen
                module={editingAutoModule}
                onSave={handleSaveAutoEdit}
                onCancel={() => setEditingAutoModule(null)}
                onDelete={deleteModule}
                onShare={setSharingModule as any}
              />
            ) : editingTravelModule ? (
              <TravelScreen
                module={editingTravelModule}
                onSave={(mod) => { updateModuleDirect(mod); setEditingTravelModule(mod); }}
                onClose={() => setEditingTravelModule(null)}
              />
            ) : editingFurnitureModule ? (
              <FurnitureScreen
                module={editingFurnitureModule}
                onSave={(mod) => { updateModuleDirect(mod); setEditingFurnitureModule(mod); }}
                onClose={() => setEditingFurnitureModule(null)}
              />
            ) : editingStudyModule ? (
              <StudyScreen
                module={editingStudyModule}
                onSave={(mod) => { updateModuleDirect(mod); setEditingStudyModule(mod); }}
                onClose={() => setEditingStudyModule(null)}
                currentProfileId={currentProfileId || ''}
              />
            ) : editingSplitModule ? (
              <SplitScreen
                module={editingSplitModule}
                onSave={(mod) => { updateModuleDirect(mod); setEditingSplitModule(null); }}
                onAutoSave={(mod) => { updateModuleDirect(mod); setEditingSplitModule(mod); }}
                onClose={() => setEditingSplitModule(null)}
                onSaveToSandbox={handleSaveToSandbox}
              />
            ) : editingSingleExpenseModule || formData.template === 'single-expense' ? (
              <SingleExpenseScreen
                module={editingSingleExpenseModule || {
                  id: generateUUID(),
                  type: 'single-expense',
                  title: 'Spesa Singola',
                  description: '',
                  amount: 0,
                  date: new Date().toISOString().substring(0, 10),
                  category: 'other',
                  currency: 'EUR',
                  x: 0, y: 0, w: 2, h: 2
                }}
                onClose={() => {
                  setEditingSingleExpenseModule(null);
                  setFormData({});
                  setIsAdding(false);
                }}
                onSave={async (updated) => {
                  if (editingSingleExpenseModule) {
                    const updatedModules = modules.map(m => m.id === updated.id ? updated : m);
                    setModules(updatedModules);
                    await saveAppState(updatedModules, folders);
                  } else {
                    const updatedModules = [...modules, updated];
                    setModules(updatedModules);
                    await saveAppState(updatedModules, folders);
                  }
                  setEditingSingleExpenseModule(null);
                  setFormData({});
                  setIsAdding(false);
                  showToast(editingSingleExpenseModule ? 'Spesa aggiornata!' : 'Spesa creata!', 'success');
                }}
                onSaveToSandbox={handleSaveToSandbox}
              />
            ) : isAdding ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto h-full flex flex-col w-full">
                <div className="flex items-center gap-4 mb-8">
                  <button onClick={() => { setIsAdding(false); setEditingModuleId(null); setFormData({}); setAutoFormStep(0); setSpesaSubMenu(false); setHomeSubMenu(false); }} className="p-2 hover:bg-[var(--card-bg)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                  <h2 className="text-2xl lg:text-3xl font-bold text-[var(--text-main)]">
                    {editingModuleId ? 'Modifica' : 'Nuovo'} {(formData.template === 'document' || formData.type === 'document') ? 'Documento' : 'Appunto'}
                  </h2>
                </div>

                <div className="flex-1 overflow-y-auto pb-32">
                  {!editingModuleId && !formData.template && !spesaSubMenu && !homeSubMenu && (
                    <div className="bg-[var(--card-bg)]/80 backdrop-blur-3xl rounded-[2.5rem] border border-[var(--border)] p-6 lg:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.06)]">
                      <h3 className="text-lg font-bold text-[var(--text-main)] mb-8 uppercase tracking-widest text-center">Scegli un Template</h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.entries(TEMPLATES)
                          .filter(([key]) => key !== 'single-expense' && key !== 'travel' && key !== 'study' && key !== 'recipes' && key !== 'furniture')
                          .map(([key, t]) => (
                      <button
                            key={key}
                            onClick={() => {
                              if ((key === 'auto' || key === 'document') && !encryptionKey) {
                                setPendingAction(() => () => setFormData({ ...formData, template: key, title: t.title, content: t.content }));
                                setShowVaultLock(true);
                                return;
                              }
                              if (key === 'split') {
                                setSpesaSubMenu(true);
                              } else if (key === 'home') {
                                setHomeSubMenu(true);
                              } else if (key === 'study') {
                                setIsAdding(false);
                                const newStudy: any = {
                                  id: generateUUID(),
                                  type: 'study',
                                  title: 'Studio',
                                  status: 'wizard',
                                  topics: [],
                                  x: (modules.length * 2) % 12,
                                  y: Infinity,
                                  w: 3,
                                  h: 2,
                                  folderId: selectedFolderId || undefined
                                };
                                setModules(prev => {
                                  const updated = [newStudy, ...prev];
                                  saveAppState(updated, folders).catch(console.error);
                                  return updated;
                                });
                                setEditingStudyModule(newStudy);
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

                  {/* Single Expense Screen (Edit/Create) - Spostato sopra isAdding per accessibilità globale */}


                  {/* Sub-menu Spese */}
                  {!editingModuleId && !formData.template && spesaSubMenu && (
                    <div className="bg-[var(--card-bg)]/80 backdrop-blur-3xl rounded-[2.5rem] border border-[var(--border)] p-6 lg:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center gap-3 mb-8">
                        <h3 className="text-lg font-bold text-[var(--text-main)] uppercase tracking-widest">Spese</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                         <button
                           onClick={() => {
                             setSplitModalTitle('Gruppo Spese');
                             setSplitModalCurrency('EUR');
                             setSplitModalBudget('');
                             setSplitModalParticipants(['', '']);
                             setShowSplitModal(true);
                           }}
                           className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-[var(--border)] hover:border-indigo-500/60 hover:bg-indigo-500/10 transition-all group text-center h-full text-[var(--text-main)]"
                         >
                           <Users className="w-8 h-8 text-indigo-500 group-hover:scale-110 transition-transform" />
                           <div className="text-center">
                             <span className="font-bold text-xs uppercase tracking-wider block">Gruppo Spese</span>
                             <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Dividi le spese con altri</span>
                           </div>
                         </button>
                         <button
                           onClick={() => {
                             setSpesaSubMenu(false);
                             setFormData({ ...formData, template: 'single-expense', title: 'Spesa Singola', content: '' });
                             setAutoFormStep(0);
                           }}
                           className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-[var(--border)] hover:border-emerald-500/60 hover:bg-emerald-500/10 transition-all group text-center h-full text-[var(--text-main)]"
                         >
                           <CreditCard className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
                           <div className="text-center">
                             <span className="font-bold text-xs uppercase tracking-wider block">Spesa Singola</span>
                             <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Traccia una spesa</span>
                           </div>
                         </button>
                         <button
                           onClick={() => {
                             setSpesaSubMenu(false);
                             setIsAdding(false);
                             const newInstallments: import('./types').InstallmentsModule = {
                               id: generateUUID(),
                               type: 'installments',
                               title: 'Rate',
                               targetAmount: 0,
                               finalDueDate: new Date().toISOString().substring(0, 10),
                               payments: [],
                               x: (modules.length * 2) % 12,
                               y: Infinity,
                               w: 3,
                               h: 3,
                               folderId: selectedFolderId || undefined
                             };
                             setModules(prev => [newInstallments, ...prev]);
                             setEditingInstallmentsModule(newInstallments);
                           }}
                           className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-[var(--border)] hover:border-amber-500/60 hover:bg-amber-500/10 transition-all group text-center h-full text-[var(--text-main)]"
                         >
                           <Hourglass className="w-8 h-8 text-amber-500 group-hover:scale-110 transition-transform" />
                           <div className="text-center">
                             <span className="font-bold text-xs uppercase tracking-wider block">Rate</span>
                             <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Pianifica pagamenti</span>
                           </div>
                         </button>
                      </div>
                    </div>
                  )}

                  {/* Sub-menu Casa */}
                  {!editingModuleId && !formData.template && homeSubMenu && (
                    <div className="bg-[var(--card-bg)]/80 backdrop-blur-3xl rounded-[2.5rem] border border-[var(--border)] p-6 lg:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center gap-3 mb-8">
                        <h3 className="text-lg font-bold text-[var(--text-main)] uppercase tracking-widest">Casa</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <button
                           onClick={() => {
                             setHomeSubMenu(false);
                             setFormData({ ...formData, template: 'recipes', title: 'Ricette', content: '' });
                             setAutoFormStep(0);
                           }}
                           className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-[var(--border)] hover:border-orange-500/60 hover:bg-orange-500/10 transition-all group text-center h-full text-[var(--text-main)]"
                         >
                           <BookOpen className="w-8 h-8 text-orange-500 group-hover:scale-110 transition-transform" />
                           <div className="text-center">
                             <span className="font-bold text-xs uppercase tracking-wider block">Ricette</span>
                             <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Gestisci le tue ricette</span>
                           </div>
                         </button>
                         <button
                           onClick={() => {
                             setHomeSubMenu(false);
                             setIsAdding(false);
                             const newFurniture: import('./types').FurnitureModule = {
                               id: generateUUID(),
                               type: 'furniture',
                               title: 'Arredamento',
                               rooms: [
                                 { id: generateUUID(), name: 'Cucina', items: [] },
                                 { id: generateUUID(), name: 'Salone', items: [] },
                                 { id: generateUUID(), name: 'Camera da letto', items: [] },
                                 { id: generateUUID(), name: 'Bagno', items: [] }
                               ],
                               x: (modules.length * 2) % 12,
                               y: Infinity,
                               w: 3,
                               h: 3,
                               folderId: selectedFolderId || undefined
                             };
                             setModules(prev => {
                               const updated = [newFurniture, ...prev];
                               saveAppState(updated, folders).catch(console.error);
                               return updated;
                             });
                             setEditingFurnitureModule(newFurniture);
                           }}
                           className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-[var(--border)] hover:border-teal-500/60 hover:bg-teal-500/10 transition-all group text-center h-full text-[var(--text-main)]"
                         >
                           <Armchair className="w-8 h-8 text-teal-500 group-hover:scale-110 transition-transform" />
                           <div className="text-center">
                             <span className="font-bold text-xs uppercase tracking-wider block">Arredamento</span>
                             <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Idee e acquisti per stanze</span>
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
                              { id: 'plate', title: "Inserisci la Targa", type: 'text', required: true, format: 'uppercase' },
                              { id: 'registrationYear', title: "Anno di Immatricolazione / Produzione", type: 'number', required: true, placeholder: 'Es. 2021' },
                              { id: 'currentKm', title: "Quanti Km ha l'auto attualmente?", type: 'number', required: true, placeholder: 'Es. 45000', format: 'km' },
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
                              { id: 'lastServiceKm', title: "Km Ultimo Tagliando", type: 'number', placeholder: 'Es. 30000', format: 'km' },
                              { id: 'tiresKm', title: "Km Ultimo Controllo Gomme", type: 'number', placeholder: 'Es. 40000', format: 'km' },
                              { id: 'battery12vWarranty', title: "Scadenza Garanzia Batteria 12v", type: 'date' }
                            ];
                            
                            if (formData.fuelType === 'ibrida' || formData.fuelType === 'elettrica') {
                              steps.push({ id: 'hybridBatteryWarranty', title: "Garanzia Batteria I/E", type: 'date' });
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
                                        type={currentStep.format === 'km' ? 'text' : 'number'}
                                        inputMode="numeric"
                                        placeholder={currentStep.placeholder}
                                        required={currentStep.required}
                                        value={
                                          currentStep.format === 'km' && formData[currentStep.id]
                                            ? Number(String(formData[currentStep.id]).replace(/\D/g, '')).toLocaleString('it-IT')
                                            : (formData[currentStep.id] || '')
                                        }
                                        onChange={e => {
                                          let val = e.target.value;
                                          if (currentStep.format === 'km') {
                                            val = val.replace(/\D/g, '');
                                          }
                                          setFormData({ ...formData, [currentStep.id]: val });
                                        }}
                                        onKeyDown={handleKeyDown}
                                        className="w-full max-w-sm p-4 text-center bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] hover:border-[var(--accent)]/50 transition-all font-bold text-xl text-[var(--text-main)] shadow-inner placeholder:text-[var(--text-muted)]"
                                      />
                                    ) : (
                                      <div className="w-full max-w-sm relative">
                                        {(currentStep.list === 'car-brands' || currentStep.list === 'car-models') ? (
                                          <button
                                            type="button"
                                            onClick={() => setPicker(currentStep.list === 'car-brands' ? 'brand' : 'model')}
                                            className="w-full p-4 text-center bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] hover:border-[var(--accent)]/50 transition-all font-bold text-xl text-[var(--text-main)] shadow-inner"
                                          >
                                            {formData[currentStep.id] || currentStep.placeholder || "Seleziona..."}
                                          </button>
                                        ) : (
                                          <>
                                            <input
                                              type={currentStep.type}
                                              list={currentStep.list}
                                              placeholder={currentStep.placeholder}
                                              required={currentStep.required}
                                              value={formData[currentStep.id] || ''}
                                              onChange={e => {
                                                let val = e.target.value;
                                                if (currentStep.format === 'uppercase') val = val.toUpperCase();
                                                setFormData({ ...formData, [currentStep.id]: val });
                                              }}
                                              onKeyDown={handleKeyDown}
                                              className="w-full p-4 text-center bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] hover:border-[var(--accent)]/50 transition-all font-bold text-xl text-[var(--text-main)] shadow-inner placeholder:text-[var(--text-muted)]"
                                              autoFocus
                                            />
                                            {currentStep.list && (
                                              <datalist id={currentStep.list}>
                                                {/* Fallback for other lists if any */}
                                              </datalist>
                                            )}
                                          </>
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
                            {/* Live High-fidelity Document Preview Card! */}
                            <div className="mb-8 flex justify-center">
                              {formData.documentType === 'tax_code' ? (
                                /* green tax code card preview */
                                <div className="w-full max-w-sm aspect-[1.6/1] rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col justify-between p-4 animate-fade-in"
                                  style={{ background: 'linear-gradient(135deg, #0f766e 0%, #115e59 40%, #042f2e 100%)' }}
                                >
                                  {/* Sfondo trama ministeriale e stellone italiano sfumato */}
                                  <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '8px 8px' }} />
                                  
                                  {/* Stellone d'Italia / Emblem Watermark in background */}
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-32 h-32 opacity-10 pointer-events-none text-white">
                                    <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full">
                                      <path d="M50 15 L58 38 L83 38 L63 53 L70 76 L50 61 L30 76 L37 53 L17 38 L42 38 Z" />
                                      <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="4" />
                                    </svg>
                                  </div>

                                  {/* Upper Section */}
                                  <div className="flex items-start justify-between z-10">
                                    <div className="flex items-center gap-3">
                                      {/* EU Band / Italian flag */}
                                      <div className="w-7 h-5 bg-[#003399] rounded flex flex-col items-center justify-center relative overflow-hidden border border-white/10 shrink-0">
                                        <span className="text-[7px] text-white font-black z-10 leading-none">IT</span>
                                      </div>
                                      <div>
                                        <p className="text-[6.5px] font-black text-teal-200 uppercase tracking-[0.2em] leading-tight m-0">REPUBBLICA ITALIANA</p>
                                        <p className="text-[8px] font-black text-white uppercase tracking-widest leading-tight m-0">TESSERA SANITARIA</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[6px] font-bold text-white/45 uppercase tracking-widest leading-none m-0">MINISTERO DELL'ECONOMIA</p>
                                      <p className="text-[6px] font-bold text-white/45 uppercase tracking-widest leading-none m-0">E DELLE FINANZE</p>
                                    </div>
                                  </div>

                                  {/* Middle Section: Smart-Card Chip & Codice Fiscale */}
                                  <div className="flex items-center justify-center gap-4 z-10 my-auto w-full">
                                    {/* Tactile strip containing the text-code - Enlarged with larger font */}
                                    <div className="w-full bg-emerald-50/95 rounded-2xl border border-emerald-600/30 shadow-[inset_0_2px_6px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center justify-center min-w-0">
                                      <span className="text-emerald-950 font-mono font-black text-base sm:text-lg md:text-xl tracking-[0.15em] uppercase select-all truncate text-center">
                                        {formData.number || 'RSSMRA80A01F205X'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Lower Section (Barra Bassa) */}
                                  <div className="flex justify-between items-end border-t border-white/10 pt-2 text-[8px] text-emerald-100 z-10">
                                    <div className="flex gap-4">
                                      <div>
                                        <p className="text-[6px] text-white/50 font-bold uppercase tracking-widest m-0">SCADENZA</p>
                                        <p className="text-[8px] text-white font-black m-0">
                                          {formData.expiryDate ? new Date(formData.expiryDate).toLocaleDateString('it-IT') : '31/12/2030'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="block text-[6px] text-emerald-300 uppercase font-black">Cognome Nome</span>
                                      <span className="font-bold text-white uppercase truncate max-w-[150px] block leading-normal">
                                        {formData.title || 'ROSSI MARIO'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : formData.documentType === 'identity' ? (
                                /* blue CIE card preview */
                                <div className="w-full max-w-sm aspect-[1.586/1] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 rounded-[1.5rem] p-6 text-white shadow-2xl relative overflow-hidden border border-indigo-500/20 flex flex-col justify-between">
                                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="text-[7px] tracking-widest text-indigo-300 font-bold block uppercase">Repubblica Italiana</span>
                                      <span className="text-[9px] font-black text-white uppercase tracking-wider">Carta d'Identità</span>
                                    </div>
                                    <div className="w-6 h-4 bg-blue-600 rounded-sm flex items-center justify-center text-[7px] font-black text-white px-0.5 border border-white/20 select-none">
                                      CIE
                                    </div>
                                  </div>
                                  <div className="my-3 flex gap-4 items-center">
                                    {/* Simulated Photo Placeholder */}
                                    <div className="w-12 h-16 bg-white/5 border border-white/15 rounded-lg flex flex-col items-center justify-center text-[8px] text-white/30 font-bold select-none shrink-0">
                                      👤
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                      <div>
                                        <span className="block text-[6px] text-indigo-300 uppercase leading-none font-black">Cognome Nome / Full Name</span>
                                        <span className="font-bold text-sm text-white uppercase truncate block">
                                          {formData.title || 'ROSSI MARIO'}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="block text-[6px] text-indigo-300 uppercase leading-none font-black">Numero / Number</span>
                                        <span className="font-mono text-xs font-bold text-white tracking-wider block">
                                          {formData.number || 'CA00000AA'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-end border-t border-white/10 pt-2 text-[8px] text-indigo-200">
                                    <div>
                                      <span className="block text-[6px] text-indigo-400 uppercase">Rilascio</span>
                                      <span className="font-bold text-white">
                                        {formData.issueDate ? new Date(formData.issueDate).toLocaleDateString('it-IT') : '--/--/----'}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="block text-[6px] text-indigo-400 uppercase">Scadenza</span>
                                      <span className="font-bold text-white">
                                        {formData.expiryDate ? new Date(formData.expiryDate).toLocaleDateString('it-IT') : '--/--/----'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : formData.documentType === 'driving_license' ? (
                                /* pinkish/purple driving license card preview */
                                <div className="w-full max-w-sm aspect-[1.586/1] bg-gradient-to-br from-pink-900 via-rose-950 to-slate-900 rounded-[1.5rem] p-6 text-white shadow-2xl relative overflow-hidden border border-pink-500/20 flex flex-col justify-between">
                                  <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl pointer-events-none" />
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="text-[7px] tracking-widest text-pink-300 font-bold block uppercase">Repubblica Italiana</span>
                                      <span className="text-[9px] font-black text-white uppercase tracking-wider">Patente di Guida</span>
                                    </div>
                                    <div className="w-6 h-4 bg-pink-600 rounded-sm flex items-center justify-center text-[7px] font-black text-white px-0.5 border border-white/20 select-none">
                                      B
                                    </div>
                                  </div>
                                  <div className="my-2 flex gap-4 items-center">
                                    <div className="w-12 h-16 bg-white/5 border border-white/15 rounded-lg flex flex-col items-center justify-center text-[8px] text-white/30 font-bold select-none shrink-0">
                                      👤
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                      <div>
                                        <span className="block text-[6px] text-pink-300 uppercase leading-none font-black">Cognome Nome</span>
                                        <span className="font-bold text-sm text-white uppercase truncate block">
                                          {formData.title || 'ROSSI MARIO'}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="block text-[6px] text-pink-300 uppercase leading-none font-black">Numero Patente</span>
                                        <span className="font-mono text-xs font-bold text-white tracking-wider block">
                                          {formData.number || 'U1B000000X'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-end border-t border-white/10 pt-2 text-[8px] text-pink-200">
                                    <div>
                                      <span className="block text-[6px] text-pink-400 uppercase">Ente</span>
                                      <span className="font-bold text-white truncate max-w-[80px] block">
                                        {formData.issuedBy || 'MIT-UCO'}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="block text-[6px] text-pink-400 uppercase font-black">Scadenza</span>
                                      <span className="font-bold text-white block">
                                        {formData.expiryDate ? new Date(formData.expiryDate).toLocaleDateString('it-IT') : '--/--/----'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* Premium Generic Document Preview Card */
                                <div className="w-full max-w-sm aspect-[1.586/1] bg-gradient-to-br from-blue-900/40 via-indigo-950/40 to-slate-950/40 backdrop-blur-md rounded-[1.5rem] p-6 text-[var(--text-main)] shadow-2xl relative overflow-hidden border border-[var(--border)] flex flex-col justify-between">
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 rounded-full blur-2xl pointer-events-none" />
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="text-[7px] tracking-widest text-[var(--text-muted)] font-bold block uppercase">Archivio Documenti</span>
                                      <span className="text-[9px] font-black text-[var(--text-main)] uppercase tracking-wider">Documento Generico</span>
                                    </div>
                                    <div className="w-6 h-6 bg-[var(--surface-variant)] rounded-lg flex items-center justify-center text-xs text-[var(--text-muted)] border border-[var(--border)] select-none">
                                      🗂️
                                    </div>
                                  </div>
                                  <div className="my-3 space-y-1">
                                    <span className="block text-[6px] text-[var(--text-muted)] uppercase leading-none mt-2 font-black">Titolo Documento / Title</span>
                                    <span className="font-bold text-sm text-[var(--text-main)] uppercase truncate block">
                                      {formData.title || 'NOME DOCUMENTO'}
                                    </span>
                                    <span className="block text-[6px] text-[var(--text-muted)] uppercase leading-none mt-2 font-black">Numero / Identifier</span>
                                    <span className="font-mono text-xs font-bold text-[var(--text-main)] block">
                                      {formData.number || 'NON DISPONIBILE'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-end border-t border-[var(--border)] pt-2 text-[8px] text-[var(--text-muted)]">
                                    <div>
                                      <span className="block text-[6px] uppercase">Rilascio</span>
                                      <span className="font-bold text-[var(--text-main)]">
                                        {formData.issueDate ? new Date(formData.issueDate).toLocaleDateString('it-IT') : '--/--/----'}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="block text-[6px] uppercase">Scadenza</span>
                                      <span className="font-bold text-[var(--text-main)]">
                                        {formData.expiryDate ? new Date(formData.expiryDate).toLocaleDateString('it-IT') : '--/--/----'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Tipo Documento</label>
                              <select
                                required
                                value={formData.documentType || 'generic'}
                                onChange={e => setFormData({ ...formData, documentType: e.target.value })}
                                className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-medium text-[var(--text-main)]"
                              >
                                <option value="generic">Altro / Documento Generico</option>
                                <option value="identity">Carta d'Identità (CIE)</option>
                                <option value="driving_license">Patente di Guida</option>
                                <option value="tax_code">Codice Fiscale (Tessera Sanitaria)</option>
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1 block">Intestatario / Titolo Documento</label>
                                <input type="text" placeholder="Es. ROSSI MARIO o Carta Spese" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--accent)] transition-all font-medium text-[var(--text-main)]" />
                              </div>
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
                            {(formData.template === 'document' || formData.type === 'document')
                              ? (editingModuleId ? 'Salva Documento' : 'Crea Documento')
                              : (editingModuleId ? 'Aggiorna Sandbox' : 'Crea Sandbox')}
                          </button>
                        )}
                        {!editingModuleId && (formData.template !== 'document' && formData.type !== 'document') && (
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
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
                    <input 
                      type="text" 
                      placeholder={`Cerca ${selectedType ? (TEMPLATES[selectedType as keyof typeof TEMPLATES]?.title || 'nelle tue Sandbox') : 'nelle tue Sandbox'}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-14 pr-14 py-4.5 bg-[var(--surface-variant)] border-transparent rounded-[var(--radius-lg)] shadow-none outline-none focus:bg-[var(--bg)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all text-base lg:text-lg font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="p-2 hover:bg-[var(--bg)] rounded-full text-[var(--text-muted)] transition-all"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                      <button 
                        onClick={handleVoiceSearch}
                        title="Ricerca Vocale"
                        className={`relative p-3 rounded-full transition-all ${isListening ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg)]'}`}
                      >
                        {isListening && (
                          <motion.div
                            layoutId="voice-ripple"
                            initial={{ scale: 0.8, opacity: 0.5 }}
                            animate={{ scale: 1.5, opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="absolute inset-0 bg-[var(--accent)] rounded-full"
                          />
                        )}
                        <Mic className={`w-5 h-5 lg:w-6 lg:h-6 relative z-10 ${isListening ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>
                  </div>

                </div>

                {isListening ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center px-4 animate-fade-in">
                    <div className="relative w-28 h-28 flex items-center justify-center mb-6">
                      <motion.div
                        animate={{
                          scale: [1, 1.4, 1],
                          opacity: [0.3, 0, 0.3]
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 2,
                          ease: "easeInOut"
                        }}
                        className="absolute inset-0 bg-[var(--accent)]/20 rounded-full"
                      />
                      <motion.div
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.5, 0.1, 0.5]
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.5,
                          ease: "easeInOut",
                          delay: 0.3
                        }}
                        className="absolute w-20 h-20 bg-[var(--accent)]/30 rounded-full"
                      />
                      <div className="w-16 h-16 bg-[var(--accent)] text-white rounded-full flex items-center justify-center shadow-lg shadow-[var(--accent)]/30 z-10">
                        <Mic className="w-8 h-8 animate-bounce text-white" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-black text-[var(--text-main)] mb-2 uppercase tracking-wide animate-pulse">Ascolto in corso...</h3>
                    <p className="text-sm text-[var(--text-muted)] max-w-xs font-semibold">Parla ora per effettuare la ricerca vocale</p>
                  </div>
                ) : (
                  <>
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

                    {!selectedType && !selectedFolderId && !searchQuery.trim() ? (
                      <div className="px-4 lg:px-8 pb-40">
                        {/* Widgets Section (Shortcuts) */}
                        {(pinnedToolIds.length > 0 || pinnedCategoryIds.length > 0) && (
                          <div className="mb-10">
                            <h3 className="text-lg font-bold text-[var(--text-main)] mb-5 flex items-center gap-2">
                              <LayoutDashboard className="w-5 h-5 text-indigo-500" />
                              Accesso Rapido
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
                          {Object.entries(TEMPLATES)
                            .filter(([key]) => key !== 'single-expense' && key !== 'recipes' && key !== 'furniture')
                            .map(([key, t]) => {
                            return (
                              <button
                                key={key}
                                onClick={() => {
                                  if (key === 'recipes') {
                                    setIsRecipesOpen(true);
                                  } else if (key === 'travel') {
                                    const existingTravel = modules.find(m => m.type === 'travel') as import('./types').TravelModule;
                                    if (existingTravel) {
                                      setEditingTravelModule(existingTravel);
                                    } else {
                                      const newTravel: import('./types').TravelModule = {
                                        id: generateUUID(),
                                        type: 'travel',
                                        title: 'Viaggi',
                                        destinations: [],
                                        x: 0, y: 0, w: 3, h: 3,
                                        folderId: selectedFolderId || undefined
                                      };
                                      setModules(prev => {
                                        const updated = [newTravel, ...prev];
                                        saveAppState(updated, folders).catch(console.error);
                                        return updated;
                                      });
                                      setEditingTravelModule(newTravel);
                                    }
                                  } else if (key === 'study') {
                                    const existingStudy = modules.find(m => m.type === 'study');
                                    if (existingStudy) {
                                      setEditingStudyModule(existingStudy);
                                    } else {
                                      const newStudy: any = {
                                        id: generateUUID(),
                                        type: 'study',
                                        title: 'Studio',
                                        status: 'wizard',
                                        topics: [],
                                        x: (modules.length * 2) % 12,
                                        y: Infinity,
                                        w: 3,
                                        h: 2,
                                        folderId: selectedFolderId || undefined
                                      };
                                      setModules(prev => {
                                        const updated = [newStudy, ...prev];
                                        saveAppState(updated, folders).catch(console.error);
                                        return updated;
                                      });
                                      setEditingStudyModule(newStudy);
                                    }
                                  } else {
                                    setSelectedType(key as ModuleType);
                                  }
                                }}
                                className="bg-[var(--card-bg)] p-6 lg:p-8 rounded-[2.5rem] border border-[var(--border)] shadow-sm hover:border-[var(--accent)] hover:shadow-lg hover:-translate-y-1 transition-all group flex flex-col items-center text-center gap-4"
                              >
                                <div className={`w-14 h-14 lg:w-16 lg:h-16 bg-[var(--bg)] rounded-3xl flex items-center justify-center ${t.color} group-hover:bg-[var(--accent-bg)] transition-colors shadow-inner`}>
                                  <t.icon className="w-7 h-7 lg:w-8 lg:h-8" />
                                </div>
                                <div>
                                  <p className="font-black text-[var(--text-main)] text-sm">{t.title}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : selectedType === 'home' ? (
                      <div className="px-4 lg:px-8 pb-32">
                        <h3 className="text-xl font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
                          <Home className="w-6 h-6 text-teal-500" />
                          Sezione Casa
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button
                            onClick={() => setIsRecipesOpen(true)}
                            className="bg-[var(--card-bg)] p-6 lg:p-8 rounded-[2.5rem] border border-[var(--border)] shadow-sm hover:border-orange-500/50 hover:bg-orange-500/5 transition-all group flex flex-col items-center text-center gap-4"
                          >
                            <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                              <BookOpen className="w-8 h-8" />
                            </div>
                            <div>
                              <p className="font-black text-[var(--text-main)] text-lg">Ricette</p>
                              <p className="text-sm text-[var(--text-muted)] mt-1">Il tuo ricettario personale</p>
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              const existingFurniture = modules.find(m => m.type === 'furniture') as import('./types').FurnitureModule;
                              if (existingFurniture) {
                                setEditingFurnitureModule(existingFurniture);
                              } else {
                                const newFurniture: import('./types').FurnitureModule = {
                                  id: generateUUID(),
                                  type: 'furniture',
                                  title: 'Arredamento',
                                  rooms: [
                                    { id: generateUUID(), name: 'Cucina', items: [] },
                                    { id: generateUUID(), name: 'Salone', items: [] },
                                    { id: generateUUID(), name: 'Camera da letto', items: [] },
                                    { id: generateUUID(), name: 'Bagno', items: [] }
                                  ],
                                  x: (modules.length * 2) % 12,
                                  y: Infinity,
                                  w: 3,
                                  h: 3,
                                  folderId: selectedFolderId || undefined
                                };
                                setModules(prev => {
                                  const updated = [newFurniture, ...prev];
                                  saveAppState(updated, folders).catch(console.error);
                                  return updated;
                                });
                                setEditingFurnitureModule(newFurniture);
                              }
                            }}
                            className="bg-[var(--card-bg)] p-6 lg:p-8 rounded-[2.5rem] border border-[var(--border)] shadow-sm hover:border-teal-500/50 hover:bg-teal-500/5 transition-all group flex flex-col items-center text-center gap-4"
                          >
                            <div className="w-16 h-16 bg-teal-500/10 text-teal-500 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                              <Armchair className="w-8 h-8" />
                            </div>
                            <div>
                              <p className="font-black text-[var(--text-main)] text-lg">Arredamento</p>
                              <p className="text-sm text-[var(--text-muted)] mt-1">Idee e acquisti per stanze</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    ) : filteredModules.length === 0 ? (
                      selectedType === 'gallery' ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                          <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
                            <ImageIcon className="w-10 h-10 text-indigo-500 opacity-70" />
                          </div>
                          <h3 className="text-2xl font-bold text-[var(--text-main)] mb-2">Nessuna foto in galleria</h3>
                          <p className="text-[var(--text-muted)] mb-8 max-w-sm mx-auto">Usa lo strumento Filtri Immagine per salvare le tue foto qui.</p>
                          <button
                            onClick={() => { setSelectedType(null); setIsToolsOpen(true); setActiveToolId('image-filter'); }}
                            className="flex items-center justify-center gap-3 bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                          >
                            <ImageIcon className="w-6 h-6" />
                            <span>Apri Filtri Immagine</span>
                          </button>
                        </div>
                      ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                          <div className="w-20 h-20 bg-[var(--bg)] border border-[var(--border)] rounded-full flex items-center justify-center mb-6">
                            <LayoutDashboard className="w-10 h-10 text-[var(--text-muted)] opacity-50" />
                          </div>
                          <h3 className="text-2xl font-bold text-[var(--text-main)] mb-2">
                            {modules.length === 0 ? 'Nessun contenuto' : 'Nessun risultato trovato'}
                          </h3>
                          <p className="text-[var(--text-muted)] mb-8 max-w-sm mx-auto">
                          {modules.length === 0 ? 'Inizia ad organizzare i tuoi dati aggiungendo la prima voce.' : 'Prova a cercare un termine diverso o cambiare filtro di categoria.'}
                          </p>
                        </div>
                      )
                    ) : (
                      <>


                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 3xl:grid-cols-8 gap-6 stagger-fade-in px-4 lg:px-8 pb-32 md:pb-8">
                          {filteredModules.map((module) => (
                            <div key={module.id} className="w-full">
                              {module.type === 'auto' ? (
                                <AutoCard module={module} onDelete={requestDelete} onEdit={openEditModal} />
                              ) : module.type === 'document' ? (
                                <DocumentCard module={module} onDelete={requestDelete} onEdit={openEditModal} onShare={setSharingModule} />
                              ) : module.type === 'split' ? (
                                <SplitCard module={module as import('./types').SplitModule} onDelete={requestDelete} onEdit={openEditModal} onShare={setSharingModule as any} />
                              ) : module.type === 'single-expense' ? (
                                <SingleExpenseCard module={module as import('./types').SingleExpenseModule} onDelete={requestDelete} onEdit={openEditModal} />
                              ) : module.type === 'installments' ? (
                                <InstallmentsCard module={module as import('./types').InstallmentsModule} onDelete={requestDelete} onEdit={openEditModal} />
                              ) : module.type === 'gallery' ? (
                                <GalleryCard module={module as import('./types').GalleryModule} onEdit={openEditModal} />
                              ) : module.type === 'study' ? (
                                <StudyCard module={module} onDelete={requestDelete} onEdit={openEditModal} />
                              ) : module.type === 'travel' ? (
                                <TravelCard module={module as import('./types').TravelModule} onDelete={requestDelete} onEdit={openEditModal} />
                              ) : (
                                <GenericCard module={module as import('./types').GenericModule} onDelete={requestDelete} onEdit={openEditModal} />
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Global FAB (Only on main dashboard and specific categories except gallery/travel) */}
          {(selectedType !== 'gallery') && !editingTravelModule && !editingStudyModule && !isAdding && !editingModuleId && !isArchiveOpen && !isToolsOpen && !editingAutoModule && !editingSplitModule && !editingSingleExpenseModule && !editingDocumentModule && !editingGenericModule && !editingFurnitureModule && !editingInstallmentsModule && (
            <>
              {/* Scan QR Button next to Plus button */}
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsScanning(true)}
                className="fixed bottom-24 right-24 md:bottom-10 md:right-28 z-[60] w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-600 text-white rounded-[1.5rem] shadow-2xl shadow-emerald-500/40 flex items-center justify-center border border-white/20 animate-fade-in"
                title="Scansiona scheda"
              >
                <QrCode className="w-8 h-8" />
              </motion.button>

              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (selectedType === 'travel') {
                    // Create new travel module directly
                    const newTravel: import('./types').TravelModule = {
                      id: generateUUID(),
                      type: 'travel',
                      title: 'Viaggi',
                      destinations: [],
                      x: 0, y: 0, w: 3, h: 3,
                      folderId: selectedFolderId || undefined
                    };
                    setModules(prev => {
                      const updated = [newTravel, ...prev];
                      saveAppState(updated, folders).catch(console.error);
                      return updated;
                    });
                    setEditingTravelModule(newTravel);
                  } else if (selectedType === 'study') {
                    // Create new study module directly
                    const newStudy: any = {
                      id: generateUUID(),
                      type: 'study',
                      title: 'Studio',
                      status: 'wizard',
                      topics: [],
                      x: (modules.length * 2) % 12,
                      y: Infinity,
                      w: 3,
                      h: 2,
                      folderId: selectedFolderId || undefined
                    };
                    setModules(prev => {
                      const updated = [newStudy, ...prev];
                      saveAppState(updated, folders).catch(console.error);
                      return updated;
                    });
                    setEditingStudyModule(newStudy);
                  } else if (selectedType === 'split' || selectedType === 'single-expense') {
                    setSpesaSubMenu(true);
                    setIsAdding(true);
                  } else {
                    setFormData(selectedType ? { template: selectedType } : {});
                    setAutoFormStep(0);
                    setIsAdding(true);
                  }
                }}
                className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[60] w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-[1.5rem] shadow-2xl shadow-blue-500/40 flex items-center justify-center border border-white/20"
              >
                <Plus className="w-8 h-8" />
              </motion.button>
            </>
          )}

          {/* Mobile Bottom Navigation Bar - Hidden during full-screen edit/modals */}
          {/* Mobile Bottom Navigation (M3 Style) */}
          {!isAdding && !isScanning && !editingModuleId && !isArchiveOpen && (
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-[var(--bg)] border-t border-[var(--border)] z-50 px-4 flex items-center justify-around safe-area-inset-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              {[
                { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', action: () => { setIsToolsOpen(false); setSelectedType(null); setIsProfileOpen(false); } },
                { id: 'tools', icon: Wrench, label: 'Strumenti', action: () => { setIsToolsOpen(true); setIsProfileOpen(false); } }
              ].map(item => {
                const isActive = item.id === 'dashboard' ? (!isToolsOpen && !selectedType && !isProfileOpen) : 
                                 item.id === 'tools' ? isToolsOpen : 
                                 item.id === 'profile' ? isProfileOpen : false;
                return (
                  <button 
                    key={item.id}
                    onClick={item.action}
                    className="flex flex-col items-center gap-1 group flex-1 pb-1"
                  >
                    <div className={`px-5 py-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-[var(--accent-container)] text-[var(--accent-on-container)]' : 'text-[var(--text-muted)] group-hover:bg-[var(--surface-variant)]'}`}>
                      <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <span className={`text-[10px] font-bold tracking-tight transition-colors ${isActive ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          )}



          <AnimatePresence>
            {capturingField && (
              <DocumentScanner
                onCapture={(pdf) => {
                  if (selectedType === 'document') {
                    // Create a new document module with this PDF
                    const newDoc: DocumentModule = {
                      id: generateUUID(),
                      type: 'document',
                      title: `Documento ${new Date().toLocaleDateString('it-IT')}`,
                      documentType: 'generic',
                      pdfAttachment: pdf,
                      x: 0, y: 0, w: 2, h: 2,
                      folderId: selectedFolderId || undefined
                    };
                    setModules(prev => [...prev, newDoc]);
                    showToast('Documento salvato con successo', 'success');
                  }
                  setCapturingField(null);
                }}
                onClose={() => setCapturingField(null)}
              />
            )}
          </AnimatePresence>
          </main>
        </div>
      )}





      {/* Modal Creazione Gruppo Spese */}
      <AnimatePresence>
        {showSplitModal && (
          <div className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center p-0 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSplitModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-w-md bg-[var(--card-bg)] rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl border border-[var(--border)] overflow-y-auto max-h-[92vh]"
            >
              {/* Handle bar */}
              <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-6 sm:hidden" />

              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[var(--text-main)] uppercase tracking-wider">Nuovo Gruppo Spese</h2>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Dividi le spese con il tuo gruppo</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Nome gruppo */}
                <div>
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 block">Nome Gruppo</label>
                  <input
                    type="text"
                    value={splitModalTitle}
                    onChange={e => setSplitModalTitle(e.target.value)}
                    placeholder="Es. Vacanza estate, Cena amici..."
                    className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-2xl text-[var(--text-main)] text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-[var(--text-muted)]/50"
                  />
                </div>

                {/* Valuta e Budget */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 block">Valuta</label>
                    <select
                      value={splitModalCurrency}
                      onChange={e => setSplitModalCurrency(e.target.value)}
                      className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-2xl text-[var(--text-main)] text-sm focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
                    >
                      {['EUR','USD','GBP','JPY','CHF','AUD','CAD','SEK','NOK','DKK','PLN','CZK','HUF'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 block">Budget <span className="normal-case text-[9px] opacity-60">(opz.)</span></label>
                    <input
                      type="number"
                      value={splitModalBudget}
                      onChange={e => setSplitModalBudget(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-2xl text-[var(--text-main)] text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-[var(--text-muted)]/50"
                    />
                  </div>
                </div>

                {/* Partecipanti */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Partecipanti</label>
                    <button
                      type="button"
                      onClick={() => setSplitModalParticipants(p => [...p, ''])}
                      className="flex items-center gap-1 text-indigo-500 text-[10px] font-bold uppercase tracking-wider hover:text-indigo-400 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Aggiungi
                    </button>
                  </div>
                  <div className="space-y-2">
                    {splitModalParticipants.map((name, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-black text-indigo-500">{i + 1}</span>
                        </div>
                        <input
                          type="text"
                          value={name}
                          onChange={e => {
                            const updated = [...splitModalParticipants];
                            updated[i] = e.target.value;
                            setSplitModalParticipants(updated);
                          }}
                          placeholder={`Persona ${i + 1}`}
                          className="flex-1 px-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[var(--text-main)] text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-[var(--text-muted)]/50"
                        />
                        {splitModalParticipants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSplitModalParticipants(p => p.filter((_, j) => j !== i))}
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 mt-7">
                <button
                  onClick={() => {
                    const validParticipants = splitModalParticipants.filter(n => n.trim().length > 0);
                    const groupParticipants = (validParticipants.length > 0 ? validParticipants : splitModalParticipants).map((n, i) => ({
                      id: generateUUID(),
                      name: n.trim() || `Partecipante ${i + 1}`
                    }));
                    const newSplit = {
                      id: generateUUID(),
                      type: 'split' as const,
                      title: splitModalTitle.trim() || 'Gruppo Spese',
                      currency: splitModalCurrency,
                      budget: splitModalBudget ? parseFloat(splitModalBudget) : undefined,
                      participants: groupParticipants,
                      expenses: [],
                      x: (modules.length * 2) % 12,
                      y: Infinity,
                      w: 3,
                      h: 2,
                      folderId: selectedFolderId || undefined
                    };
                    setShowSplitModal(false);
                    setSpesaSubMenu(false);
                    setIsAdding(false);
                    setEditingSplitModule(newSplit);
                  }}
                  className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
                >
                  Crea Gruppo
                </button>
                <button
                  onClick={() => setShowSplitModal(false)}
                  className="w-full py-3.5 bg-[var(--bg)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-2xl font-bold text-sm transition-all"
                >
                  Annulla
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <ConfirmDialog
        isOpen={!!moduleToDelete}
        title="Elimina Elemento"
        message={
          <>
            Sei sicuro di voler eliminare <span className="text-[var(--text-main)] font-bold">"{moduleToDelete?.title || 'questo elemento'}"</span>? 
            Questa azione è irreversibile e i dati verranno rimossi permanentemente.
          </>
        }
        onConfirm={() => { if(moduleToDelete) deleteModule(moduleToDelete.id); }}
        onCancel={() => setModuleToDelete(null)}
      />

      <ConfirmDialog
        isOpen={!!folderToDelete}
        title="Elimina Cartella"
        message="Sei sicuro di voler eliminare questa cartella? I documenti al suo interno verranno spostati nella dashboard principale."
        onConfirm={confirmDeleteFolder}
        onCancel={() => setFolderToDelete(null)}
      />


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

      <AnimatePresence>
         {isRecipesOpen && (
           <div className="absolute inset-0 z-[100] bg-[var(--bg)] flex flex-col h-[100dvh] safe-area-inset-bottom safe-area-header overflow-hidden">
             <RecipesScreen onClose={() => setIsRecipesOpen(false)} />
           </div>
         )}
         {isAddressBookOpen && (
            <AddressBookScreen onClose={() => setIsAddressBookOpen(false)} />
         )}
      </AnimatePresence>

      {/* Update Modal */}
      <AnimatePresence>
        {availableUpdate && encryptionKey && (
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
              className="relative w-full max-w-md bg-[var(--card-bg)] rounded-[2.5rem] shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="bg-[var(--surface-variant)] p-8 text-center border-b border-[var(--border)] shrink-0">
                <div className="w-16 h-16 bg-[var(--accent-container)] rounded-3xl flex items-center justify-center text-[var(--accent)] shadow-inner mx-auto mb-4">
                  <Download className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Novità in Chelona</h3>
                <p className="text-sm font-medium text-[var(--text-muted)] mt-1">
                  Versione <span className="text-[var(--accent)] font-black uppercase tracking-wider bg-[var(--accent)]/10 px-2 py-0.5 rounded-lg">v{availableUpdate.latestVersion}</span>
                </p>
              </div>
              
              {/* Scrollable Changelog */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[var(--bg)]">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">Note di Rilascio</p>
                <div className="space-y-3">
                  {(availableUpdate.releaseNotes || 'Aggiornamenti di sicurezza e stabilità.').split('\n').map((line, i) => {
                    const cleanLine = line.replace(/^- /, '').trim();
                    if (!cleanLine) return null;
                    return (
                      <div key={i} className="flex items-start gap-3 bg-[var(--card-bg)] p-3 rounded-2xl border border-[var(--border)] shadow-sm">
                        <div className="w-6 h-6 rounded-full bg-[var(--accent-container)] flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5 text-[var(--accent)]" />
                        </div>
                        <p className="text-sm font-medium text-[var(--text-main)] leading-relaxed">{cleanLine}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer / Actions */}
              <div className="p-6 bg-[var(--card-bg)] border-t border-[var(--border)] shrink-0 flex flex-col gap-4">
                {updateProgress !== null ? (
                  <div className="space-y-3 bg-[var(--surface-variant)] p-4 rounded-2xl">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-[var(--text-muted)]">Versione {APP_VERSION}</span>
                      <span className="text-[10px] font-black text-[var(--accent)]">{updateProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-[var(--bg)] rounded-full overflow-hidden border border-[var(--border)]">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${updateProgress}%` }}
                        className="h-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]"
                      />
                    </div>
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
                      className="flex-[2] py-4 bg-[var(--accent)] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-[var(--accent)]/30 active:scale-95 text-center"
                    >
                      Installa Ora
                    </button>
                    <button
                      onClick={() => setAvailableUpdate(null)}
                      className="flex-1 px-4 py-4 bg-[var(--surface-variant)] text-[var(--text-muted)] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[var(--border)] transition-all"
                    >
                      Dopo
                    </button>
                  </div>
                )}
                
                <button 
                  onClick={() => window.open(availableUpdate.downloadUrl, '_system')}
                  className="w-full text-[10px] font-bold text-[var(--accent)] hover:underline uppercase tracking-widest text-center py-2"
                >
                  Problemi col download? Scarica dal browser
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Document Archive View */}
      <AnimatePresence>
        {editingAutoModule && (
          <AutoManagementScreen 
            module={editingAutoModule} 
            onSave={handleSaveAutoEdit} 
            onCancel={() => setEditingAutoModule(null)} 
            onDelete={deleteModule}
            onShare={(m) => setSharingModule(m)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingSplitModule && (
          <SplitScreen
            module={editingSplitModule}
            onSave={(updated) => {
              updateModuleDirect(updated);
              setEditingSplitModule(null);
            }}
            onAutoSave={(updated) => {
              updateModuleDirect(updated);
              setEditingSplitModule(updated);
            }}
            onClose={() => setEditingSplitModule(null)}
            onDelete={deleteModule}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingStudyModule && (
          <StudyScreen
            module={editingStudyModule}
            onSave={(updated) => {
              updateModuleDirect(updated);
              setEditingStudyModule(updated);
            }}
            onClose={() => setEditingStudyModule(null)}
            currentProfileId={currentProfileId || ''}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingSingleExpenseModule && (
          <SingleExpenseScreen
            module={editingSingleExpenseModule}
            onSave={(updated) => {
              const updatedModules = modules.map(m => m.id === updated.id ? updated : m);
              setModules(updatedModules);
              saveAppState(updatedModules, folders);
              setEditingSingleExpenseModule(null);
            }}
            onClose={() => setEditingSingleExpenseModule(null)}
            onDelete={deleteModule}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingInstallmentsModule && (
          <InstallmentsScreen
            module={editingInstallmentsModule}
            onSave={(updated) => {
              const updatedModules = modules.map(m => m.id === updated.id ? updated : m);
              setModules(updatedModules);
              saveAppState(updatedModules, folders);
              setEditingInstallmentsModule(null);
            }}
            onClose={() => {
              if (editingInstallmentsModule.targetAmount === 0 && editingInstallmentsModule.payments.length === 0) {
                 deleteModule(editingInstallmentsModule.id);
              }
              setEditingInstallmentsModule(null);
            }}
            onDelete={deleteModule}
          />
        )}
      </AnimatePresence>


      <AnimatePresence>
        {editingDocumentModule && (
          <DocumentManagementScreen
            module={editingDocumentModule}
            onSave={(updated) => {
              const updatedModules = modules.map(m => m.id === updated.id ? updated : m);
              setModules(updatedModules);
              saveAppState(updatedModules, folders);
              setEditingDocumentModule(null);
            }}
            onCancel={() => setEditingDocumentModule(null)}
            onDelete={deleteModule}
            onShare={setSharingModule as any}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingGenericModule && (
          <NoteManagementScreen
            module={editingGenericModule}
            onSave={(updated) => {
              const updatedModules = modules.map(m => m.id === updated.id ? updated : m);
              setModules(updatedModules);
              saveAppState(updatedModules, folders);
              setEditingGenericModule(null);
            }}
            onCancel={() => setEditingGenericModule(null)}
            onDelete={deleteModule}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isArchiveOpen && (
          <DocumentArchive 
            modules={modules} 
            onClose={() => setIsArchiveOpen(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {voiceResponse && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200000] flex items-center justify-center p-6"
          >
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-md" 
              onClick={() => {
                setVoiceResponse(null);
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
              }} 
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-[var(--card-bg)] rounded-[2.5rem] p-6 lg:p-8 w-full max-w-md border border-[var(--border)] shadow-2xl flex flex-col items-center text-center overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full -mr-12 -mt-12 blur-2xl pointer-events-none" />
              
              <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center text-cyan-500 mb-4 border border-cyan-500/20 turtle-float shadow-lg shadow-cyan-500/5">
                <Mic className="w-8 h-8 animate-pulse" />
              </div>

              <h3 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-1">Assistente Vocale</h3>
              <p className="text-xs italic font-medium text-[var(--text-muted)] max-w-xs mb-6 px-4">
                "{voiceResponse.query}"
              </p>

              <div className="w-full bg-[var(--bg)] border border-[var(--border)] p-5 rounded-2xl mb-6 shadow-inner text-sm font-semibold text-[var(--text-main)] text-left leading-relaxed">
                {voiceResponse.answer}
              </div>

              <button
                onClick={() => {
                  setVoiceResponse(null);
                  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                }}
                className="w-full py-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-cyan-500/20"
              >
                Ho Capito
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {picker && (
          <BrandModelPicker
            type={picker}
            brand={formData.brand}
            onSelect={(v) => {
               setFormData(prev => ({ ...prev, [picker]: v }));
               if (picker === 'brand') {
                 setPicker('model');
                 setAutoFormStep(2); // Advance wizard to model step
               } else {
                 setPicker(null);
                 setAutoFormStep(3); // Advance wizard to next step after model
               }
            }}
            onClose={() => setPicker(null)}
          />
        )}
      </AnimatePresence>
      {/* Standalone Gallery Viewer */}
      <AnimatePresence>
        {showGalleryViewer && (() => {
          const gMod = modules.find(m => m.type === 'gallery') as import('./types').GalleryModule | undefined;
          const gImages: import('./types').GalleryImage[] = [];
          if (gMod?.images && gMod.images.length > 0) {
            gImages.push(...gMod.images);
          } else if (gMod?.image) {
            gImages.push({ id: gMod.id, image: gMod.image, filterName: gMod.filterName, createdAt: new Date().toISOString() });
          }
          return (
            <motion.div
              key="gallery-viewer"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="fixed inset-0 z-[150] flex flex-col bg-[var(--bg)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border)] shrink-0 bg-[var(--card-bg)] shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[var(--text-main)] leading-tight">Galleria</h2>
                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">{gImages.length} foto</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowGalleryViewer(false); setGallerySelectedImage(null); }}
                  className="p-3 bg-[var(--surface-variant)] hover:bg-red-500/10 rounded-xl text-[var(--text-main)] hover:text-red-500 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Grid content */}
              {(() => {
                const handleDeleteImage = (imgId: string) => {
                  const gMod = modules.find(m => m.type === 'gallery') as import('./types').GalleryModule | undefined;
                  if (!gMod) return;
                  
                  const updatedImages = gMod.images.filter(img => img.id !== imgId);
                  const updatedModule = { ...gMod, images: updatedImages };
                  
                  // Update modules state
                  setModules(prev => prev.map(m => m.id === gMod.id ? updatedModule : m));
                };

                return (
                  <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                    {gImages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
                        <ImageIcon className="w-16 h-16 mb-4 opacity-30" />
                        <p className="font-bold text-lg mb-2">Nessuna foto</p>
                        <p className="text-sm opacity-70 mb-6">Usa Filtri Immagine per salvare foto qui</p>
                        <button
                          onClick={() => { setShowGalleryViewer(false); setIsToolsOpen(true); setActiveToolId('image-filter'); }}
                          className="px-6 py-3 bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                        >
                          Apri Filtri Immagine
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 auto-rows-max">
                        {gImages.map((img) => (
                          <div
                            key={img.id}
                            className="aspect-square rounded-xl overflow-hidden cursor-pointer relative group bg-[var(--surface-variant)]"
                            onClick={() => !galleryDeletingId && setGallerySelectedImage(img)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setGalleryDeletingId(galleryDeletingId === img.id ? null : img.id);
                            }}
                          >
                            <img
                              src={img.image}
                              alt={img.filterName || 'Foto'}
                              className={`w-full h-full object-cover transition-all duration-300 ${galleryDeletingId === img.id ? 'scale-90 blur-sm brightness-50' : 'group-hover:scale-110'}`}
                            />
                            
                            <AnimatePresence>
                              {galleryDeletingId === img.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.5 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.5 }}
                                  className="absolute inset-0 flex items-center justify-center bg-black/40 z-10"
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteImage(img.id);
                                      setGalleryDeletingId(null);
                                    }}
                                    className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                                  >
                                    <Trash2 className="w-6 h-6" />
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            
                            {!galleryDeletingId && img.filterName && (
                              <div className="absolute bottom-1 left-1 right-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[8px] font-black text-white bg-black/60 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                  {img.filterName}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Gallery Single Image Viewer */}
      <AnimatePresence>
        {gallerySelectedImage && (
          <motion.div
            key="gallery-image-viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col"
            style={{ backgroundColor: 'black' }}
          >
            {/* Draggable container */}
            <motion.div
              className="flex-1 flex flex-col h-full"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.7}
              onDragEnd={(_e, info) => {
                // If dragged down more than 100px or velocity is high, dismiss
                if (info.offset.y > 100 || info.velocity.y > 500) {
                  setGallerySelectedImage(null);
                }
              }}
              style={{ touchAction: 'none' }}
            >
            <div className="flex items-center justify-between p-4 shrink-0">
              <button
                onClick={() => setGallerySelectedImage(null)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-2">
                {gallerySelectedImage.filterName && (
                  <span className="text-[10px] font-black text-white/60 bg-white/10 px-3 py-1 rounded-full uppercase tracking-wider">
                    {gallerySelectedImage.filterName}
                  </span>
                )}
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = gallerySelectedImage.image;
                    link.download = `chelona_${gallerySelectedImage.filterName || 'foto'}_${gallerySelectedImage.id.substring(0, 6)}.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                  title="Scarica"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={gallerySelectedImage.image}
                alt="Foto selezionata"
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl pointer-events-none select-none"
                draggable={false}
              />
            </div>
            <div className="p-4 text-center shrink-0">
              <p className="text-[11px] text-white/40 font-medium">
                {new Date(gallerySelectedImage.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-[10px] text-white/20 mt-1 uppercase tracking-widest font-bold">Scorri in basso per tornare</p>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Folder Management Modal */}
      <AnimatePresence>
        {sharingModule && (
          <ShareScreen 
            module={sharingModule}
            onClose={() => setSharingModule(null)}
          />
        )}
        {isAddingFolder && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsAddingFolder(false); setEditingFolderId(null); setNewFolderName(''); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[var(--card-bg)] rounded-[2.5rem] p-8 shadow-2xl border border-[var(--border)]"
            >
              <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-6">
                <FolderIcon className="w-8 h-8" />
              </div>
              
              <h3 className="text-2xl font-bold text-[var(--text-main)] text-center mb-2">
                {editingFolderId ? 'Modifica Gruppo' : 'Nuovo Gruppo'}
              </h3>
              <p className="text-center text-[var(--text-muted)] text-sm mb-8">
                Crea un contenitore per organizzare i tuoi elementi.
              </p>

              <form onSubmit={handleAddFolder} className="space-y-4">
                <input
                  autoFocus
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nome del gruppo (es: Casa, Lavoro...)"
                  className="w-full px-5 py-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 transition-all text-lg font-bold"
                />
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setIsAddingFolder(false); setEditingFolderId(null); setNewFolderName(''); }}
                    className="flex-1 py-4 bg-[var(--surface-variant)] text-[var(--text-main)] rounded-2xl font-bold hover:bg-[var(--border)] transition-all"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                  >
                    {editingFolderId ? 'Salva' : 'Crea'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>
    </ErrorBoundary>
    </div>
  );
}
