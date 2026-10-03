/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Sun, Moon, Wrench, Plus, LayoutDashboard, Settings, User, LogOut, Search, Mic, MicOff, Loader2, Bell, CreditCard, Fingerprint, ShieldCheck, Lock, Menu, X, StickyNote, FileText, Grid2X2, Car, QrCode, Folder as FolderIcon, Check, Edit2, Trash2, BookOpen, ArrowLeft, ArrowRight, Camera, FileDown, Hourglass, Users, Download, Receipt, MapPin, SquareParking, Image as ImageIcon, Lightbulb, Globe, ChevronLeft, Bus, Home, Armchair, Activity, ShoppingBasket, BadgePercent, Sparkles, CalendarClock, Calendar, AlertCircle, CheckCircle2, Battery, Wallet, Flame, ArrowUpRight, Smartphone, Stethoscope, FileSignature, FlaskConical } from 'lucide-react';

import { Module, ModuleType, Folder, DocumentModule } from './types';
import { isModuleSensitive } from './utils/security';
import { storage, AppState } from './services/storage';
import { encryption } from './services/encryption';
import { GenericCard, AutoCard, DocumentCard, SplitCard, SingleExpenseCard, GalleryCard, TravelCard, StudyCard, FitnessCard } from './components/Modules';
import { InstallmentsCard } from './components/InstallmentsCard';
import { LockScreen } from './components/LockScreen';
import { TOOLS, TOOLS_UTILITY } from './constants/tools';
import { ConfirmDialog } from './components/ConfirmDialog';
import { notificationService } from './services/notificationService';
import { biometricService } from './services/biometricService';
import { chelonaMemory } from './services/chelonaMemory';
import { wakeWordService } from './services/wakeWordService';
import { APP_VERSION } from './constants/version';
import { queryChelonaAi, type AiAction } from './services/chelonaEngine';
import { getSavedParking, getNavigationUrl } from './services/parkingService';
import { getAutoDeadlineTargetDate } from './utils/autoDeadlines';
import { indexModulesIntoRAG } from './services/ragEngine';

import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { lzw } from './utils/lzw';
import { updateService, UpdateInfo } from './services/updateService';
import { App as CapApp } from '@capacitor/app';
import { generateUUID } from './utils/uuid';
import { voiceRecognitionService } from './services/voiceService';
import { Share } from '@capacitor/share';
import { Device } from '@capacitor/device';

import { QrScanner } from './components/QrScanner';
import { decodeMenuPayload, saveSavedMenu } from './services/menuPlannerService';

// Lazy loaded components for code-splitting & download size optimization
const DocumentScanner = React.lazy(() => import('./components/DocumentScanner').then(m => ({ default: m.DocumentScanner })));
const ProfileScreen = React.lazy(() => import('./components/ProfileScreen').then(m => ({ default: m.ProfileScreen })));
const ToolsScreen = React.lazy(() => import('./components/ToolsScreen').then(m => ({ default: m.ToolsScreen })));
const AutoManagementScreen = React.lazy(() => import('./components/AutoManagementScreen').then(m => ({ default: m.AutoManagementScreen })));
const DocumentManagementScreen = React.lazy(() => import('./components/DocumentManagementScreen').then(m => ({ default: m.DocumentManagementScreen })));
const NoteManagementScreen = React.lazy(() => import('./components/NoteManagementScreen').then(m => ({ default: m.NoteManagementScreen })));
const SplitScreen = React.lazy(() => import('./components/SplitScreen').then(m => ({ default: m.SplitScreen })));
const DocumentArchive = React.lazy(() => import('./components/DocumentArchive').then(m => ({ default: m.DocumentArchive })));
const SingleExpenseScreen = React.lazy(() => import('./components/SingleExpenseScreen').then(m => ({ default: m.SingleExpenseScreen })));
const AddressBookScreen = React.lazy(() => import('./components/AddressBookScreen').then(m => ({ default: m.AddressBookScreen })));
const RecipesScreen = React.lazy(() => import('./components/RecipesScreen').then(m => ({ default: m.RecipesScreen })));
const TravelScreen = React.lazy(() => import('./components/TravelScreen').then(m => ({ default: m.TravelScreen })));
const StudyScreen = React.lazy(() => import('./components/StudyScreen').then(m => ({ default: m.StudyScreen })));
const FurnitureScreen = React.lazy(() => import('./components/FurnitureScreen').then(m => ({ default: m.FurnitureScreen })));
const InstallmentsScreen = React.lazy(() => import('./components/InstallmentsScreen').then(m => ({ default: m.InstallmentsScreen })));
const FitnessScreen = React.lazy(() => import('./components/FitnessScreen').then(m => ({ default: m.FitnessScreen })));
const SupermarketScreen = React.lazy(() => import('./components/SupermarketScreen').then(m => ({ default: m.SupermarketScreen })));
const VolantinoScreen = React.lazy(() => import('./components/VolantinoScreen').then(m => ({ default: m.default })));
const ShareScreen = React.lazy(() => import('./components/ShareScreen').then(m => ({ default: m.ShareScreen })));
const ChelonaAiScreen = React.lazy(() => import('./components/ChelonaAiScreen').then(m => ({ default: m.ChelonaAiScreen })));
const Gemma2SetupScreen = React.lazy(() => import('./components/Gemma2SetupScreen').then(m => ({ default: m.Gemma2SetupScreen })));
const ParkingScreen = React.lazy(() => import('./components/ParkingScreen').then(m => ({ default: m.ParkingScreen })));
const AddressAndParkingScreen = React.lazy(() => import('./components/AddressAndParkingScreen').then(m => ({ default: m.AddressAndParkingScreen })));
const DoctorScreen = React.lazy(() => import('./components/DoctorScreen').then(m => ({ default: m.DoctorScreen })));
const RecessoScreen = React.lazy(() => import('./components/RecessoScreen').then(m => ({ default: m.RecessoScreen })));
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

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
  errorInfo: React.ErrorInfo | null;
  copied: boolean;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, copied: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  formatErrorDetails = () => {
    const err = this.state.error;
    let errMessage = 'Errore sconosciuto';
    let stackTrace = 'Nessuno stack trace disponibile';

    if (err) {
      if (typeof err === 'string') {
        errMessage = err;
      } else if (err instanceof Error) {
        errMessage = `${err.name}: ${err.message}`;
        stackTrace = err.stack || stackTrace;
      } else if (typeof err === 'object') {
        try {
          errMessage = JSON.stringify(err);
        } catch {
          errMessage = String(err);
        }
        if (err.stack) stackTrace = String(err.stack);
      } else {
        errMessage = String(err);
      }
    }

    return [
      `🛑 CHELONA CRASH REPORT (v${APP_VERSION})`,
      `📅 Data/Ora: ${new Date().toLocaleString()}`,
      `📱 Dispositivo: ${navigator.userAgent}`,
      `⚠️ Errore: ${errMessage}`,
      `\n--- STACK TRACE ---`,
      stackTrace,
      this.state.errorInfo?.componentStack ? `\n--- COMPONENT STACK ---\n${this.state.errorInfo.componentStack}` : ''
    ].join('\n');
  };

  handleShareError = async () => {
    const errorDetails = this.formatErrorDetails();
    try {
      (window as any).__chelona_bypass_lock = true;
      await Share.share({
        title: `Chelona Error Report v${APP_VERSION}`,
        text: errorDetails,
        dialogTitle: 'Condividi Errore con WhatsApp/Messaggi'
      });
    } catch {
      await navigator.clipboard.writeText(errorDetails);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 3000);
    }
  };

  handleCopyError = async () => {
    const errorDetails = this.formatErrorDetails();
    try {
      await navigator.clipboard.writeText(errorDetails);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg,#0b0f19)] text-[var(--text-main,#ffffff)] flex flex-col items-center justify-center p-6 text-center select-text">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-center justify-center text-red-500 mb-6 shadow-xl shadow-red-500/10">
            <X className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black mb-2">Errore di Rendering</h1>
          <p className="text-sm text-gray-400 mb-6 max-w-md">
            Si è verificato un errore imprevisto. Puoi condividere subito i dettagli dell'errore per farlo risolvere in un attimo!
          </p>

          <pre className="bg-black/40 border border-red-500/20 p-4 rounded-2xl shadow-inner text-left text-xs text-red-400 overflow-auto max-w-full w-full max-w-lg max-h-56 font-mono select-all mb-6">
            {this.state.error instanceof Error
              ? `${this.state.error.name}: ${this.state.error.message}\n\n${this.state.error.stack}`
              : typeof this.state.error === 'object'
                ? JSON.stringify(this.state.error, null, 2)
                : String(this.state.error || 'Errore imprevisto')}
          </pre>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
            <button
              onClick={this.handleShareError}
              className="w-full py-4 px-6 bg-gradient-to-r from-red-500 to-orange-500 hover:opacity-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-red-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <span>Condividi Errore (WhatsApp/App) 📲</span>
            </button>

            <button
              onClick={this.handleCopyError}
              className="w-full py-4 px-6 bg-white/10 hover:bg-white/15 text-white font-bold text-sm rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <span>{this.state.copied ? 'Copiato! ✓' : 'Copia Dettagli 📋'}</span>
            </button>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="mt-6 text-xs text-gray-400 hover:text-white underline font-semibold transition-colors"
          >
            Ricarica applicazione
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
    title: 'Finanze & Spese',
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
  recipes: {
    title: 'Ricette',
    content: '',
    icon: BookOpen,
    color: 'text-orange-500'
  },
  fitness: {
    title: 'Fitness & Dieta',
    content: '',
    icon: Activity,
    color: 'text-emerald-500'
  },
  home: {
    title: 'Casa',
    content: '',
    icon: Home,
    color: 'text-teal-500'
  },
  testing: {
    title: 'Testing',
    content: '',
    icon: FlaskConical,
    color: 'text-indigo-500'
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
  const [isAdding, setIsAdding] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('chelona_form_draft');
      if (raw) {
        const d = JSON.parse(raw);
        if (d && (d.formData?.template || d.formData?.type || d.editingModuleId)) return true;
      }
    } catch {}
    return false;
  });
  const [formData, setFormData] = useState<any>(() => {
    try {
      const raw = localStorage.getItem('chelona_form_draft');
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.formData) return d.formData;
      }
    } catch {}
    return {};
  });
  const [editingModuleId, setEditingModuleId] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem('chelona_form_draft');
      if (raw) {
        const d = JSON.parse(raw);
        if (d?.editingModuleId) return d.editingModuleId;
      }
    } catch {}
    return null;
  });
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
  const [selectedType, setSelectedType] = useState<ModuleType | 'home' | 'testing' | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSplashScreenActive, setIsSplashScreenActive] = useState(true);
  const [homeSubMenu, setHomeSubMenu] = useState(false);
  const [editingFurnitureModule, setEditingFurnitureModule] = useState<import('./types').FurnitureModule | null>(null);
  const [editingInstallmentsModule, setEditingInstallmentsModule] = useState<import('./types').InstallmentsModule | null>(null);
  const [editingFitnessModule, setEditingFitnessModule] = useState<import('./types').FitnessModule | null>(null);
  const [editingSupermarketModule, setEditingSupermarketModule] = useState<import('./types').SupermarketModule | null>(null);
  const [editingVolantinoModule, setEditingVolantinoModule] = useState<import('./types').VolantinoModule | null>(null);
  const [flyerInitialOffer, setFlyerInitialOffer] = useState<{ fid: string; pg: number } | null>(null);
  const [volantinoInitialChain, setVolantinoInitialChain] = useState<string | null>(null);
  const [activeNavTab, setActiveNavTab] = useState<'home' | 'deadlines' | 'ai' | 'tools' | 'profile'>('home');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [returnToAiOnClose, setReturnToAiOnClose] = useState(false);
  const [aiInitialVoiceMode, setAiInitialVoiceMode] = useState(false);
  const [showGemma2Setup, setShowGemma2Setup] = useState(false);
  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState(() => wakeWordService.getEnabled());
  const [deadlinesFilter, setDeadlinesFilter] = useState<'all' | 'auto' | 'document' | 'installment'>('all');

  const closeAllEditingModals = useCallback(() => {
    setEditingVolantinoModule(null);
    setFlyerInitialOffer(null);
    setVolantinoInitialChain(null);
    setEditingSupermarketModule(null);
    setEditingFurnitureModule(null);
    setEditingInstallmentsModule(null);
    setEditingFitnessModule(null);
    setEditingTravelModule(null);
    setEditingStudyModule(null);
    setEditingSplitModule(null);
    setEditingSingleExpenseModule(null);
    setEditingAutoModule(null);
    setEditingDocumentModule(null);
    setEditingGenericModule(null);
    setEditingModuleId(null);
    setIsAdding(false);
  }, []);

  // Homepage Voice Assistant Direct State (Ascolto vocale rapido direttamente dalla home)
  const [isHomeVoiceListening, setIsHomeVoiceListening] = useState(false);
  const [homeVoiceTranscript, setHomeVoiceTranscript] = useState('');
  const [homeVoiceVolume, setHomeVoiceVolume] = useState(0.2);
  const [isHomeVoiceProcessing, setIsHomeVoiceProcessing] = useState(false);

  useEffect(() => {
    // Show splash screen briefly, then go to lock screen immediately
    const timer = setTimeout(() => {
      setIsSplashScreenActive(false);
    }, 400);
    const loadInitialProfile = async () => {
      const profiles = storage.loadProfiles();
      if (profiles.length > 0) {
        const activeProfile = profiles.find(p => p.id === currentProfileId) || profiles[0];
        if (!currentProfileId) {
          setCurrentProfileId(activeProfile.id);
        }
        if (!encryptionKey) {
          const pubKey = await storage.getPublicKey();
          setEncryptionKey(pubKey);
        }
      }
    };

    storage.initStorage().then(() => {
      loadInitialProfile();
      try {
        const loadedAddresses = storage.loadAddressBook();
        if ((window as any).ChelonaNative && (window as any).ChelonaNative.saveAddresses) {
          (window as any).ChelonaNative.saveAddresses(JSON.stringify(loadedAddresses));
        }
      } catch (err) {
        console.error('Failed to sync addresses for Android Auto at startup', err);
      }
    }).catch(console.error);

    // Precarica i volantini live (fallback sul bundle) in background
    

    window.addEventListener('chelona_profiles_updated', loadInitialProfile);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('chelona_profiles_updated', loadInitialProfile);
    };
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

      setAddressParkingTab('addresses');
      setIsAddressAndParkingOpen(true);
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
  const [isSensitiveUnlocked, setIsSensitiveUnlocked] = useState(false);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(() => {
    const profiles = storage.loadProfiles();
    return profiles.length > 0 ? profiles[0].id : null;
  });
  const [showVaultLock, setShowVaultLock] = useState(false);
  const [showProfileSelectorModal, setShowProfileSelectorModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [username, setUsername] = useState('Utente');
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBioSupported, setIsBioSupported] = useState(false);
  const [isBioEnabled, setIsBioEnabled] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
  const [isParkingOpen, setIsParkingOpen] = useState(false);
  const [isAddressAndParkingOpen, setIsAddressAndParkingOpen] = useState(false);
  const [isDoctorOpen, setIsDoctorOpen] = useState(false);
  const [isRecessoOpen, setIsRecessoOpen] = useState(false);
  const [addressParkingTab, setAddressParkingTab] = useState<'addresses' | 'parking'>('parking');
  const [addressParkingAutoSave, setAddressParkingAutoSave] = useState(false);
  const [hasActiveParking, setHasActiveParking] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('chelona_saved_parking');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleParkingUpdated = (e: any) => {
      setHasActiveParking(!!e.detail);
    };
    window.addEventListener('chelona-parking-updated', handleParkingUpdated);
    return () => window.removeEventListener('chelona-parking-updated', handleParkingUpdated);
  }, []);
  const [isRecipesOpen, setIsRecipesOpen] = useState(false);
  const [initialRecipesSearch, setInitialRecipesSearch] = useState('');
  const [initialRecipeToOpen, setInitialRecipeToOpen] = useState<any>(null);
  const [initialRecipesCategory, setInitialRecipesCategory] = useState<string | null>(null);

  // Listen for open-recipes event from other modules (like Fitness/Diet)
  useEffect(() => {
    const handleOpenRecipes = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.recipe) {
        setInitialRecipeToOpen(customEvent.detail.recipe);
        setInitialRecipesSearch('');
      } else if (customEvent.detail && customEvent.detail.search) {
        setInitialRecipesSearch(customEvent.detail.search);
        setInitialRecipeToOpen(null);
      } else if (customEvent.detail && customEvent.detail.category) {
        setInitialRecipesCategory(customEvent.detail.category);
        setInitialRecipesSearch('');
        setInitialRecipeToOpen(null);
      } else {
        setInitialRecipesSearch('');
        setInitialRecipeToOpen(null);
      }
      setIsRecipesOpen(true);
    };
    window.addEventListener('open-recipes', handleOpenRecipes);
    return () => window.removeEventListener('open-recipes', handleOpenRecipes);
  }, []);

  // Listen for open-flyer-offer event from other modules (like Supermercato/Lista della Spesa)
  useEffect(() => {
    const handleOpenFlyerOffer = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d) return;
      const fid = d.fid || d.flyerId || '';
      const pg = typeof d.pg === 'number' ? d.pg : (typeof d.page === 'number' ? Math.max(0, d.page - 1) : 0);
      const store = d.store || d.chain || null;
      if (isAiOpen || activeNavTab === 'ai') {
        setReturnToAiOnClose(true);
        setIsAiOpen(false);
      }
      setVolantinoInitialChain(store);
      setFlyerInitialOffer({ fid: String(fid), pg });
      const existingVolantino = modules.find(m => m.type === 'volantino') as import('./types').VolantinoModule | undefined;
      if (existingVolantino) {
        setEditingVolantinoModule(existingVolantino);
      } else {
        const newVolantino: import('./types').VolantinoModule = {
          id: generateUUID(),
          type: 'volantino',
          title: 'Volantino',
          offers: [],
          flyers: [],
          x: (modules.length * 2) % 12,
          y: Infinity,
          w: 3,
          h: 3,
          folderId: selectedFolderId || undefined
        };
        setModules(prev => {
          const updated = [newVolantino, ...prev];
          saveAppState(updated, folders).catch(console.error);
          return updated;
        });
        setEditingVolantinoModule(newVolantino);
      }
    };
    window.addEventListener('open-flyer-offer', handleOpenFlyerOffer);
    return () => window.removeEventListener('open-flyer-offer', handleOpenFlyerOffer);
  }, [modules, folders, selectedFolderId]);

  // Listen for open-volantino event from AI or other modules
  useEffect(() => {
    const handleOpenVolantino = (e: Event) => {
      const d = (e as CustomEvent).detail;
      const chain = d?.chain || d?.store || d?.slug || null;
      if (isAiOpen || activeNavTab === 'ai') {
        setReturnToAiOnClose(true);
      }
      setVolantinoInitialChain(chain);
      if (d?.fid || d?.flyerId || typeof d?.page === 'number' || typeof d?.pg === 'number') {
        const fid = String(d.fid || d.flyerId || '');
        const pg = typeof d.pg === 'number' ? d.pg : (typeof d.page === 'number' ? Math.max(0, d.page - 1) : 0);
        setFlyerInitialOffer({ fid, pg });
      }
      setIsAiOpen(false);
      setAiInitialVoiceMode(false);
      setIsToolsOpen(false);
      setIsProfileOpen(false);
      setActiveNavTab('home');

      const existingVolantino = modules.find(m => m.type === 'volantino') as import('./types').VolantinoModule | undefined;
      if (existingVolantino) {
        setEditingVolantinoModule(existingVolantino);
      } else {
        const newVolantino: import('./types').VolantinoModule = {
          id: generateUUID(),
          type: 'volantino',
          title: 'Volantini',
          offers: [],
          flyers: [],
          x: (modules.length * 2) % 12,
          y: Infinity,
          w: 3,
          h: 3,
          folderId: selectedFolderId || undefined
        };
        setModules(prev => {
          const updated = [newVolantino, ...prev];
          saveAppState(updated, folders).catch(console.error);
          return updated;
        });
        setEditingVolantinoModule(newVolantino);
      }
    };
    window.addEventListener('open-volantino', handleOpenVolantino);
    return () => window.removeEventListener('open-volantino', handleOpenVolantino);
  }, [modules, folders, selectedFolderId]);
  const [autoFormStep, setAutoFormStep] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('chelona_form_draft');
      if (raw) {
        const d = JSON.parse(raw);
        if (typeof d?.autoFormStep === 'number') return d.autoFormStep;
      }
    } catch {}
    return 0;
  });

  // Auto-salvataggio persistente della bozza del form
  useEffect(() => {
    if (isAdding && (formData.template || formData.type || editingModuleId)) {
      try {
        const draft = {
          isAdding: true,
          formData,
          autoFormStep,
          editingModuleId,
          updatedAt: Date.now()
        };
        localStorage.setItem('chelona_form_draft', JSON.stringify(draft));
      } catch (e) {
        console.warn('Failed to save form draft', e);
      }
    }
  }, [isAdding, formData, autoFormStep, editingModuleId]);

  // Notifica all'avvio se una bozza è stata ripristinata
  useEffect(() => {
    try {
      const raw = localStorage.getItem('chelona_form_draft');
      if (raw) {
        const d = JSON.parse(raw);
        if (d && (d.formData?.template === 'auto' || d.formData?.type === 'auto') && typeof d.autoFormStep === 'number' && d.autoFormStep > 0) {
          showToast(`Bozza ripristinata: riprendi dal passo ${d.autoFormStep + 1}`, 'info');
        }
      }
    } catch {}
  }, []);
  const [picker, setPicker] = useState<'brand' | 'model' | null>(null);
  const [pendingImportModule, setPendingImportModule] = useState<Module | null>(null);
  const [showGalleryViewer, setShowGalleryViewer] = useState(false);
  const [gallerySelectedImage, setGallerySelectedImage] = useState<import('./types').GalleryImage | null>(null);
  const [galleryDeletingId, setGalleryDeletingId] = useState<string | null>(null);
  const [capturingField, setCapturingField] = useState<{ key: string; title: string } | null>(null);

  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(null);
  const [updateProgress, setUpdateProgress] = useState<number | null>(null);
  const [spesaSubMenu, setSpesaSubMenu] = useState(false);
  const [financeActiveTab, setFinanceActiveTab] = useState<'all' | 'single' | 'split' | 'installments'>('all');
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
          console.log('[App] Backgrounding: Resetting sensitive unlocked state.');
          setIsSensitiveUnlocked(false);
          setIsProfileOpen(false);
          setIsSettingsOpen(false);
          const hasDraft = !!localStorage.getItem('chelona_form_draft');
          if (!hasDraft) {
            setIsAdding(false);
          }
          setIsToolsOpen(false);
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
      if (editingSupermarketModule) { window.dispatchEvent(new CustomEvent('supermarket-back')); return; }
      if (editingVolantinoModule) { window.dispatchEvent(new CustomEvent('volantino-back')); return; }
      if (editingInstallmentsModule) { setEditingInstallmentsModule(null); return; }
      if (editingFitnessModule) { window.dispatchEvent(new CustomEvent('fitness-back')); return; }
      if (editingModuleId) { setEditingModuleId(null); setFormData({}); return; }
      if (isAdding) {
        if ((formData.template === 'auto' || formData.type === 'auto') && autoFormStep > 0) {
          setAutoFormStep(prev => prev - 1);
          return;
        }
        setIsAdding(false);
        setFormData({});
        setAutoFormStep(0);
        setSpesaSubMenu(false);
        localStorage.removeItem('chelona_form_draft');
        return;
      }
      if (showGemma2Setup) { setShowGemma2Setup(false); return; }
      if (isProfileOpen) { setIsProfileOpen(false); return; }
      if (isSettingsOpen) { setIsSettingsOpen(false); return; }
      if (isAiOpen) { setIsAiOpen(false); if (activeNavTab === 'ai') setActiveNavTab('home'); return; }

      if (activeToolId) { setActiveToolId(null); return; }
      if (isToolsOpen) { setIsToolsOpen(false); return; }
      if (isArchiveOpen) { setIsArchiveOpen(false); return; }
      if (isRecipesOpen) { window.dispatchEvent(new CustomEvent('recipes-back')); return; }
      if (isDoctorOpen) { setIsDoctorOpen(false); return; }
      if (isRecessoOpen) { setIsRecessoOpen(false); return; }
      if (isAddressAndParkingOpen) { setIsAddressAndParkingOpen(false); return; }
      if (isParkingOpen) { setIsParkingOpen(false); return; }
      if (isAddressBookOpen) { setIsAddressBookOpen(false); return; }
      if (isSidebarOpen) { setIsSidebarOpen(false); return; }
      if (selectedFolderId) { setSelectedFolderId(null); return; }
      if (selectedType) { 
        setSelectedType(null); 
        setIsSensitiveUnlocked(false);
        return; 
      }
      // Niente di aperto: esci dall'app
      CapApp.exitApp();
    });

    return () => {
      backListener.then(l => l.remove());
    };
  }, [
    moduleToDelete, showGalleryViewer, gallerySelectedImage,
    editingAutoModule, editingSplitModule, editingSingleExpenseModule,
    editingTravelModule, editingStudyModule, editingFitnessModule, editingDocumentModule,
    editingGenericModule, editingFurnitureModule, editingInstallmentsModule, editingSupermarketModule, editingVolantinoModule, editingModuleId, isAdding, isProfileOpen, isSettingsOpen,
    activeToolId, isToolsOpen, isArchiveOpen, isAddressAndParkingOpen, isAddressBookOpen, isParkingOpen, isRecipesOpen, isDoctorOpen, isRecessoOpen,
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
                const fullState = await storage.loadState(encryptionKey, currentProfileId);
                if (fullState && fullState.modules && fullState.modules.length > 0) {
                    loadedModules = fullState.modules;
                } else {
                    const privateModules = await storage.loadPrivateState(encryptionKey, currentProfileId);
                    loadedModules = loadedModules.map(pubMod => {
                        const priv = privateModules.find(p => p.id === pubMod.id);
                        return priv ? { ...pubMod, ...priv } : pubMod;
                    });
                }
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

        // Inizializza canale e richiedi i permessi del sistema Android/Web per schedulare notifiche in background
        notificationService.requestPermission().then(() => {
          notificationService.checkAndFire(loadedModules);
        }).catch(console.error);

        // Trigger automatic update check upon successful unlock
        handleCheckUpdate(true);
      }
    };
    init();
  }, [encryptionKey, currentProfileId]);

  // Sincronizza costantemente il Database Personale (RAG) quando i moduli cambiano
  useEffect(() => {
    if (modules.length > 0) {
      const timer = setTimeout(() => {
        indexModulesIntoRAG(modules, username || '');
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [modules, username]);

  const handleCheckUpdate = React.useCallback(async (silent = true) => {
    try {
      const info = await updateService.checkForUpdates(!silent);
      if (info && info.available) {
        setAvailableUpdate(info);
        return true;
      } else if (!silent) {
        showToast(`L'applicazione è aggiornata (v${APP_VERSION}).`, 'success');
      }
    } catch (e) {
      if (!silent) showToast('Errore durante il controllo aggiornamenti.', 'error');
    }
    return false;
  }, []);

  useEffect(() => {
    import('./services/biometricService').then(m => {
      m.biometricService.isSupported().then(setIsBioSupported);
    });

    // Controllo automatico aggiornamenti all'avvio dell'app
    handleCheckUpdate(true);

    // Ascolta eventi manuali di aggiornamento
    const handleManualUpdate = (e: any) => {
      if (e.detail) setAvailableUpdate(e.detail);
    };
    window.addEventListener('chelona_update_available', handleManualUpdate);
    
    return () => window.removeEventListener('chelona_update_available', handleManualUpdate);
  }, [handleCheckUpdate]);

  const handleNotificationRoute = React.useCallback((routeData: { route?: string; moduleId?: string; field?: string; action?: string; extra?: any; fromShortcut?: boolean }) => {
    if (!routeData || !routeData.route) return;
    console.log('[App] handleNotificationRoute received:', routeData);
    const { route, moduleId, action, fromShortcut } = routeData;

    // Se aperto direttamente da collegamento Android ("come se fosse un'altra app")
    if (fromShortcut) {
      setIsAiOpen(false);
      setIsToolsOpen(false);
      setIsProfileOpen(false);
      setIsSettingsOpen(false);
      setIsAddressAndParkingOpen(false);
      setIsRecipesOpen(false);
      setIsDoctorOpen(false);
      setIsRecessoOpen(false);
      setSelectedType(null);
    }

    if (route === 'update') {
      handleCheckUpdate(false);
      return;
    }

    if (route === 'auto') {
      const autoMod = moduleId ? modules.find(m => m.id === moduleId) : modules.find(m => m.type === 'auto');
      const doAction = () => {
        setActiveNavTab('home');
        if (autoMod) {
          setEditingAutoModule(autoMod as any);
          if (action === 'open-km') {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-auto-km-update'));
            }, 400);
          }
        } else {
          setSelectedType('auto');
        }
      };
      if (!isSensitiveUnlocked) unlockAndProceed(doAction);
      else doAction();
      return;
    }

    if (route === 'document') {
      const doAction = () => {
        setActiveNavTab('home');
        setSelectedType('document');
        if (moduleId) {
          const docMod = modules.find(m => m.id === moduleId);
          if (docMod) setEditingDocumentModule(docMod as any);
        }
      };
      if (!isSensitiveUnlocked) unlockAndProceed(doAction);
      else doAction();
      return;
    }

    if (route === 'parking') {
      setActiveNavTab('home');
      setAddressParkingTab('parking');
      setAddressParkingAutoSave(action === 'save');
      setIsAddressAndParkingOpen(true);
      return;
    }

    if (route === 'volantino') {
      setActiveNavTab('home');
      let existingVol = modules.find(m => m.type === 'volantino') as import('./types').VolantinoModule | undefined;
      if (!existingVol) {
        existingVol = {
          id: generateUUID(),
          type: 'volantino',
          title: 'Volantini',
          offers: [],
          flyers: [],
          x: 0,
          y: Infinity,
          w: 3,
          h: 3,
          folderId: selectedFolderId || undefined
        };
        setModules(prev => {
          const updated = [existingVol!, ...prev];
          saveAppState(updated, folders).catch(console.error);
          return updated;
        });
      }
      setVolantinoInitialChain(null);
      setEditingVolantinoModule(existingVol);
      return;
    }

    if (route === 'supermarket') {
      setActiveNavTab('home');
      let sm = modules.find(m => m.type === 'supermarket') as import('./types').SupermarketModule | undefined;
      if (!sm) {
        sm = {
          id: generateUUID(),
          type: 'supermarket',
          title: 'Lista della Spesa',
          items: [],
          x: 0,
          y: Infinity,
          w: 3,
          h: 3,
          folderId: selectedFolderId || undefined
        };
        setModules(prev => {
          const updated = [sm!, ...prev];
          saveAppState(updated, folders).catch(console.error);
          return updated;
        });
      }
      setEditingSupermarketModule(sm);
      return;
    }

    if (route === 'recipes') {
      setActiveNavTab('home');
      setInitialRecipesSearch('');
      setInitialRecipesCategory(null);
      setIsRecipesOpen(true);
      return;
    }

    if (route === 'installments') {
      const doAction = () => {
        setActiveNavTab('home');
        const instMod = moduleId ? modules.find(m => m.id === moduleId) : modules.find(m => m.type === 'installments');
        if (instMod) {
          setEditingInstallmentsModule(instMod as any);
        } else {
          setSelectedType('split');
        }
      };
      if (!isSensitiveUnlocked) unlockAndProceed(doAction);
      else doAction();
      return;
    }

    if (route === 'single-expense' || route === 'split') {
      const doAction = () => {
        setActiveNavTab('home');
        if (moduleId) {
          const expMod = modules.find(m => m.id === moduleId);
          if (expMod?.type === 'split') setEditingSplitModule(expMod as any);
          else if (expMod?.type === 'single-expense') setEditingSingleExpenseModule(expMod as any);
          else setSelectedType(route as any);
        } else {
          setSelectedType(route as any);
        }
      };
      if (!isSensitiveUnlocked) unlockAndProceed(doAction);
      else doAction();
      return;
    }

    if (route === 'fitness') {
      setActiveNavTab('home');
      const fitMod = moduleId ? modules.find(m => m.id === moduleId) : modules.find(m => m.type === 'fitness');
      if (fitMod) {
        setEditingFitnessModule(fitMod as any);
      } else {
        const newFitness: import('./types').FitnessModule = {
          id: generateUUID(),
          type: 'fitness',
          title: 'Fitness & Dieta',
          x: 0, y: 0, w: 3, h: 2,
          folderId: selectedFolderId || undefined
        };
        setModules(prev => {
          const updated = [newFitness, ...prev];
          saveAppState(updated, folders).catch(console.error);
          return updated;
        });
        setEditingFitnessModule(newFitness);
      }
      return;
    }

    if (route === 'travel') {
      setActiveNavTab('home');
      const trMod = modules.find(m => m.type === 'travel') as import('./types').TravelModule | undefined;
      if (trMod) {
        setEditingTravelModule(trMod);
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
      return;
    }

    if (route === 'furniture') {
      setActiveNavTab('home');
      const fMod = modules.find(m => m.type === 'furniture') as import('./types').FurnitureModule | undefined;
      if (fMod) {
        setEditingFurnitureModule(fMod);
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
          x: 0, y: 0, w: 3, h: 3,
          folderId: selectedFolderId || undefined
        };
        setModules(prev => {
          const updated = [newFurniture, ...prev];
          saveAppState(updated, folders).catch(console.error);
          return updated;
        });
        setEditingFurnitureModule(newFurniture);
      }
      return;
    }

    if (route === 'notes' || route === 'generic') {
      setActiveNavTab('home');
      setSelectedType('generic');
      return;
    }

    if (route === 'addresses' || route === 'address' || route === 'address-book') {
      setActiveNavTab('home');
      setAddressParkingTab('addresses');
      setIsAddressAndParkingOpen(true);
      return;
    }

    if (route === 'deadlines') {
      setActiveNavTab('deadlines');
      return;
    }

    if (route === 'home') {
      setActiveNavTab('home');
      setIsToolsOpen(false);
      setIsAiOpen(false);
      setIsProfileOpen(false);
      setSelectedType(null);
      return;
    }

    if (route === 'tools' || route === 'scanner' || route === 'shortcuts') {
      setActiveNavTab('tools');
      setIsToolsOpen(true);
      if (route === 'scanner' || action === 'scanner') {
        setActiveToolId('scanner');
      } else if (route === 'shortcuts' || action === 'shortcuts') {
        setActiveToolId('shortcuts');
      }
      return;
    }

    if (route === 'ai' || route === 'chelona-ai') {
      setIsAiOpen(true);
      if (action === 'voice') setAiInitialVoiceMode(true);
      return;
    }

    if (route === 'doctor' || route === 'medico' || route === 'ricette' || route === 'prescriptions') {
      setIsDoctorOpen(true);
      return;
    }

    if (route === 'recesso' || route === 'disdette' || route === 'disdetta' || route === 'recessi') {
      setIsRecessoOpen(true);
      return;
    }

    if (route === 'testing' || route === 'test') {
      setActiveNavTab('home');
      setSelectedType('testing');
      return;
    }
  }, [modules, folders, selectedFolderId, isSensitiveUnlocked, handleCheckUpdate]);

  useEffect(() => {
    const handleRouteEvent = (e: any) => {
      if (e.detail) {
        handleNotificationRoute(e.detail);
      }
    };
    const handleTriggerWeeklyKm = () => {
      handleNotificationRoute({ route: 'auto', action: 'open-km' });
    };

    window.addEventListener('notificationRouteReceived', handleRouteEvent);
    window.addEventListener('trigger-auto-km-page', handleTriggerWeeklyKm);

    // Controlla se c'è un intent pendente al cold start
    if ((window as any).pendingNotificationRoute) {
      const pending = (window as any).pendingNotificationRoute;
      (window as any).pendingNotificationRoute = null;
      setTimeout(() => handleNotificationRoute(pending), 500);
    }

    return () => {
      window.removeEventListener('notificationRouteReceived', handleRouteEvent);
      window.removeEventListener('trigger-auto-km-page', handleTriggerWeeklyKm);
    };
  }, [handleNotificationRoute]);

  // Gestione creazione scorciatoia/app singola tramite pressione prolungata (Long-press)
  interface SectionShortcutPrompt {
    id: string;
    title: string;
    icon: any;
    color: string;
  }

  const [shortcutPromptSection, setShortcutPromptSection] = useState<SectionShortcutPrompt | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleSectionPressStart = (section: SectionShortcutPrompt, e: React.TouchEvent | React.MouseEvent) => {
    isLongPressRef.current = false;
    if ('touches' in e && e.touches.length > 0) {
      touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if ('clientX' in e) {
      touchStartPosRef.current = { x: e.clientX, y: e.clientY };
    }

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (navigator.vibrate) {
        try { navigator.vibrate(60); } catch (_) {}
      }
      setShortcutPromptSection(section);
    }, 550);
  };

  const handleSectionPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleSectionTouchMove = (e: React.TouchEvent) => {
    if (longPressTimerRef.current && e.touches.length > 0) {
      const deltaX = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
      const deltaY = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleCardClick = (action: () => void) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    action();
  };

  // Calcolo centralizzato di tutte le scadenze (Auto, Documenti, Rate, Spese)
  const allUpcomingDeadlines = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      subtitle: string;
      dueDate: Date;
      daysLeft: number;
      category: 'auto' | 'document' | 'installment' | 'expense';
      icon: any;
      color: string;
      openAction: () => void;
    }> = [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    modules.forEach(m => {
      // 1. Scadenze Auto
      if (m.type === 'auto') {
        const carName = `${m.brand || ''} ${m.model || ''}`.trim() || 'Auto';
        const fields = [
          { key: 'lastInsurance', label: 'Assicurazione Auto', icon: Car, color: 'text-rose-500' },
          { key: 'lastTax', label: 'Bollo Auto', icon: Receipt, color: 'text-amber-500' },
          { key: 'lastRevision', label: 'Revisione Auto', icon: Wrench, color: 'text-blue-500' },
          { key: 'battery12vExpiryDate', label: 'Batteria 12V', icon: Battery, color: 'text-yellow-500' },
          { key: 'hybridBatteryExpiryDate', label: 'Batteria Ibrida', icon: Battery, color: 'text-emerald-500' },
          { key: 'lastGplCylinder', label: 'Bombola GPL', icon: Flame, color: 'text-orange-500' },
          { key: 'lastMethaneCylinder', label: 'Bombola Metano', icon: Flame, color: 'text-cyan-500' },
        ];
        fields.forEach(f => {
          const val = (m as any)[f.key];
          const target = getAutoDeadlineTargetDate(f.key, val, m as any);
          if (target) {
            const targetDateOnly = new Date(target.getFullYear(), target.getMonth(), target.getDate());
            const diffDays = Math.ceil((targetDateOnly.getTime() - today.getTime()) / 86400000);
            if (diffDays >= -30 && diffDays <= 60) {
              list.push({
                id: `auto_${m.id}_${f.key}`,
                title: f.label,
                subtitle: carName,
                dueDate: targetDateOnly,
                daysLeft: diffDays,
                category: 'auto',
                icon: f.icon,
                color: f.color,
                openAction: () => openEditModalWithSecurity(m as any)
              });
            }
          }
        });
      }

      // 2. Scadenze Documenti
      if (m.type === 'document' && m.expiryDate) {
        const d = new Date(m.expiryDate);
        if (!isNaN(d.getTime())) {
          const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86400000);
          if (diffDays >= -30 && diffDays <= 60) {
            list.push({
              id: `doc_${m.id}`,
              title: m.title || 'Documento',
              subtitle: 'Scadenza documento',
              dueDate: target,
              daysLeft: diffDays,
              category: 'document',
              icon: FileText,
              color: 'text-blue-500',
              openAction: () => openEditModalWithSecurity(m as any)
            });
          }
        }
      }

      // 3. Scadenze Rate
      if (m.type === 'installments' && m.payments && Array.isArray(m.payments)) {
        m.payments.forEach((p: any, idx: number) => {
          if (!p.isPaid && p.dueDate) {
            const d = new Date(p.dueDate);
            if (!isNaN(d.getTime())) {
              const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
              const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86400000);
              if (diffDays >= -30 && diffDays <= 60) {
                list.push({
                  id: `inst_${m.id}_${idx}`,
                  title: `${m.title || 'Rata'} (Rata ${idx + 1})`,
                  subtitle: `€${Number(p.amount || 0).toFixed(2)}`,
                  dueDate: target,
                  daysLeft: diffDays,
                  category: 'installment',
                  icon: CreditCard,
                  color: 'text-purple-500',
                  openAction: () => openEditModalWithSecurity(m as any)
                });
              }
            }
          }
        });
      }

      // 4. Scadenze Spese Singole
      if (m.type === 'single-expense' && m.expiryDate) {
        const d = new Date(m.expiryDate);
        if (!isNaN(d.getTime())) {
          const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86400000);
          if (diffDays >= -30 && diffDays <= 60) {
            list.push({
              id: `exp_${m.id}`,
              title: m.description || 'Spesa',
              subtitle: 'Scadenza pagamento',
              dueDate: target,
              daysLeft: diffDays,
              category: 'expense',
              icon: Receipt,
              color: 'text-amber-500',
              openAction: () => openEditModalWithSecurity(m as any)
            });
          }
        }
      }
    });

    return list.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [modules]);

  const urgentDeadlines = useMemo(() => {
    return allUpcomingDeadlines.filter(d => d.daysLeft <= 7);
  }, [allUpcomingDeadlines]);

  const filteredDeadlines = useMemo(() => {
    if (deadlinesFilter === 'all') return allUpcomingDeadlines;
    if (deadlinesFilter === 'auto') return allUpcomingDeadlines.filter(d => d.category === 'auto');
    if (deadlinesFilter === 'document') return allUpcomingDeadlines.filter(d => d.category === 'document');
    if (deadlinesFilter === 'installment') return allUpcomingDeadlines.filter(d => d.category === 'installment' || d.category === 'expense');
    return allUpcomingDeadlines;
  }, [allUpcomingDeadlines, deadlinesFilter]);


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

    // Sincronizza le notifiche nativa di tutti i moduli in background
    notificationService.syncAllModuleNotifications(newModules).catch(console.error);

    // Memoria continua per l'AI: impara dai dati aggiornati
    try {
      for (const m of newModules.slice(0, 15)) {
        const title = (m as any).title || m.type;
        if (m.type === 'supermarket') {
          const items = ((m as any).data?.items || []) as any[];
          if (items.length) {
            chelonaMemory.learn('spesa', `Lista "${title}": ${items.slice(0, 8).map((i: any) => i.name).join(', ')}`);
          }
        } else if (m.type === 'generic' && (m as any).content) {
          chelonaMemory.learn('nota', `"${title}": ${String((m as any).content).slice(0, 100)}`);
        } else if (m.type === 'auto') {
          chelonaMemory.learn('veicolo', `Auto ${(m as any).brand || ''} ${(m as any).model || ''} (${(m as any).plate || ''})`);
        } else if (m.type === 'fitness') {
          chelonaMemory.learn('fitness', `Scheda "${title}" attiva`);
        }
      }
    } catch {}
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
    setAutoFormStep(0);
    localStorage.removeItem('chelona_form_draft');
  };

  const handleScan = async (data: string) => {
    // Chiudi subito lo scanner per evitare la schermata nera durante l'elaborazione dei dati
    setIsScanning(false);

    try {
      let rawData = data;
      if (rawData.startsWith('LZW:')) {
        rawData = lzw.decompress(rawData);
      }

      // Gestione Menu Ricettario Condiviso (Supporta stringa Base64 CHELONA_MENU o JSON)
      if (typeof rawData === 'string' && rawData.startsWith('CHELONA_MENU:v1:')) {
        const decodedMenu = decodeMenuPayload(rawData);
        if (decodedMenu) {
          saveSavedMenu(decodedMenu);
          showToast(`Menu "${decodedMenu.title}" importato con successo!`);
          setIsRecipesOpen(true);
          return;
        }
      }

      let parsedData: any = {};
      try {
        parsedData = JSON.parse(rawData);
      } catch (e) {
        const decodedMenu = decodeMenuPayload(rawData);
        if (decodedMenu) {
          saveSavedMenu(decodedMenu);
          showToast(`Menu "${decodedMenu.title}" importato con successo!`);
          setIsRecipesOpen(true);
          return;
        }
        throw e;
      }

      if (parsedData.type === 'chelona_menu' || parsedData.type === 'chelona_shared_menu') {
        const decodedMenu = decodeMenuPayload(JSON.stringify(parsedData));
        if (decodedMenu) {
          saveSavedMenu(decodedMenu);
          showToast(`Menu "${decodedMenu.title}" importato con successo!`);
          setIsRecipesOpen(true);
          return;
        }
      }
      
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

      // 3. Filtro Sicurezza: Se non siamo loggati, accettiamo SOLO i profili (gestiti sopra)
      if (!encryptionKey) {
        showToast('Non stai scansionando un profilo', 'error');
        return;
      }

      // 4. Gestione QR Fitness & Dieta Partner (fit_v2 o fitness_plan)
      if (parsedData.type === 'fit_v2' || parsedData.t === 'fit_v2' || parsedData.type === 'fitness_plan') {
        const fitnessModule = modules.find(m => m.type === 'fitness');
        if (fitnessModule) {
          setEditingFitnessModule(fitnessModule as any);
          showToast('Codice rilevato! Apri "Ricevi da Partner" in Fitness & Dieta per applicarlo.', 'info');
        } else {
          showToast('Crea o apri una scheda Fitness & Dieta per importare questo piano.', 'info');
        }
        return;
      }

      // 5. Gestione Moduli Condivisi (Solo se loggati)
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


  const unlockAndProceed = async (callback: () => void) => {
    if (isSensitiveUnlocked) {
      callback();
      return;
    }

    const targetProfile = currentProfileId || (storage.loadProfiles()[0]?.id ?? null);
    if (!targetProfile) {
      setPendingAction(() => callback);
      setShowVaultLock(true);
      return;
    }

    const profiles = storage.loadProfiles();
    const profile = profiles.find(p => p.id === targetProfile);

    // 1. Check if native biometrics (fingerprint / Face ID) is enabled on the profile
    if (profile && profile.isBiometricEnabled) {
      try {
        // verifyIdentity mostra SEMPRE il prompt nativo (impronta / Face ID / PIN dispositivo).
        // getMasterKey da solo NON apre il prompt su Android (la chiave Keystore non richiede auth).
        const verified = await biometricService.verifyIdentity(`Sblocca la sezione sensibile di ${profile.username}`);
        if (verified) {
          let key = encryptionKey;
          const masterKeyStr = await biometricService.getMasterKey(profile.id, profile.biometricServerKey);
          if (masterKeyStr) {
            try {
              key = await encryption.importKey(masterKeyStr);
              setEncryptionKey(key);
            } catch (e) {
              console.warn('[BiometricAuth] Failed to import master key:', e);
            }
          }
          if (!key) {
            key = await storage.getPublicKey();
            setEncryptionKey(key);
          }
          setIsSensitiveUnlocked(true);

          // Load private state & full state into memory
          if (key) {
            try {
              const fullState = await storage.loadState(key, profile.id);
              if (fullState && fullState.modules && fullState.modules.length > 0) {
                setModules(fullState.modules);
              } else {
                const privateModules = await storage.loadPrivateState(key, profile.id);
                setModules(prev => prev.map(pubMod => {
                  const priv = privateModules.find(p => p.id === pubMod.id);
                  return priv ? { ...pubMod, ...priv } : pubMod;
                }));
              }
            } catch (e) {
              console.warn('[BiometricAuth] Failed to load private state:', e);
            }
          }

          callback();
          return;
        } else {
          console.warn('[BiometricAuth] Biometric authentication cancelled or failed.');
        }
      } catch (err) {
        console.warn('[BiometricAuth] Biometric authentication failed or cancelled:', err);
      }

      // Biometria attiva ma verifica fallita o annullata:
      // - con password -> fallback al modal password (LockScreen)
      // - senza password -> la sezione resta bloccata
      if (profile?.hasPassword === false) {
        showToast('Accesso biometrico annullato o non riconosciuto.', 'error');
        return;
      }
      setPendingAction(() => callback);
      setShowVaultLock(true);
      return;
    }

    // 2. If biometrics is not enabled and profile has no password, auto-unlock
    if (profile?.hasPassword === false) {
      setIsSensitiveUnlocked(true);
      const pubKey = await storage.getPublicKey();
      setEncryptionKey(pubKey);
      callback();
      return;
    }

    // Fallback to vault unlock screen modal if biometrics not enabled or cancelled
    setPendingAction(() => callback);
    setShowVaultLock(true);
  };

  const openEditModalWithSecurity = (module: Module) => {
    const sensitive = isModuleSensitive(module);
    if (sensitive && !isSensitiveUnlocked) {
      unlockAndProceed(() => {
        openEditModal(module);
      });
      return;
    }
    openEditModal(module);
  };

  const handleSelectCategoryWithSecurity = (type: ModuleType | 'home' | null, actionCallback?: () => void) => {
    const doAction = () => {
      if (actionCallback) actionCallback();
      else if (type) setSelectedType(type);
    };

    if (!type || type === 'home') {
      doAction();
      return;
    }

    const sensitive = isModuleSensitive(type);
    if (sensitive && !isSensitiveUnlocked) {
      unlockAndProceed(doAction);
      return;
    }

    doAction();
  };

  const handleToggleModuleSensitivity = async (module: Module) => {
    const nextState = !isModuleSensitive(module);
    const updated = { ...module, isSensitive: nextState };

    setModules(prev => prev.map(m => m.id === module.id ? updated : m));
    await saveAppState(modules.map(m => m.id === module.id ? updated : m), folders);
    showToast(nextState ? 'Modulo protetto da impronta 🔒' : 'Protezione impronta rimossa 🔓');
  };

  const openEditModal = (module: Module) => {
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
    if (module.type === 'supermarket') {
      setEditingSupermarketModule(module as import('./types').SupermarketModule);
      return;
    }
    if (module.type === 'volantino') {
      setEditingVolantinoModule(module as import('./types').VolantinoModule);
      return;
    }
    if (module.type === 'fitness') {
      setEditingFitnessModule(module as import('./types').FitnessModule);
      return;
    }
    setEditingModuleId(module.id);
    setFormData({ ...module });
    setAutoFormStep(0);
    setIsAdding(true);
  };

  const handleAddItemsToShoppingList = useCallback((newItems: { name: string; quantity?: string; category?: string }[]) => {
    if (!newItems || newItems.length === 0) return;
    const existingSupermarket = modules.find(m => m.type === 'supermarket') as import('./types').SupermarketModule;
    let updatedModules = [...modules];

    const itemsToAdd: import('./types').SupermarketItem[] = newItems.map(item => ({
      id: generateUUID(),
      name: item.name,
      quantity: item.quantity,
      category: (item.category as any) || 'dispensa',
      checked: false
    }));

    if (existingSupermarket) {
      const updatedSupermarket: import('./types').SupermarketModule = {
        ...existingSupermarket,
        items: [...existingSupermarket.items, ...itemsToAdd]
      };
      updatedModules = updatedModules.map(m => m.id === updatedSupermarket.id ? updatedSupermarket : m);
    } else {
      const newSupermarket: import('./types').SupermarketModule = {
        id: generateUUID(),
        type: 'supermarket',
        title: 'Lista della Spesa',
        items: itemsToAdd,
        x: (modules.length * 2) % 12,
        y: Infinity,
        w: 3,
        h: 3,
        folderId: selectedFolderId || undefined
      };
      updatedModules = [newSupermarket, ...updatedModules];
    }

    setModules(updatedModules);
    saveAppState(updatedModules, folders).catch(console.error);
    showToast(`Aggiunti ${newItems.length} ingredienti alla Lista della Spesa!`, 'success');
  }, [modules, folders, selectedFolderId, saveAppState, showToast]);

  const handleAiNavigate = useCallback((act: AiAction) => {
    // Se l'azione è solo l'aggiunta di ingredienti alla spesa, esegui e rimani in chat
    if (act.type === 'add_shopping_items' && act.items && act.items.length > 0) {
      handleAddItemsToShoppingList(act.items);
      return;
    }

    if (isAiOpen || activeNavTab === 'ai') {
      setReturnToAiOnClose(true);
    }

    // Chiudi sempre Chelona AI e azzera i flag vocali
    setIsAiOpen(false);
    setAiInitialVoiceMode(false);

    // Chiudi eventuali altri tab/overlay per evitare conflitti visivi
    setIsToolsOpen(false);
    setIsProfileOpen(false);
    setIsSettingsOpen(false);
    setIsAddressAndParkingOpen(false);

    if (act.type === 'doctor' || act.category === 'doctor' || (act.type === 'navigate' && act.route === 'doctor')) {
      setIsDoctorOpen(true);
      return;
    }

    if (act.type === 'recesso' || act.category === 'recesso' || (act.type === 'navigate' && act.route === 'recesso')) {
      setIsRecessoOpen(true);
      return;
    }

    if ((act as any).type === 'shortcut' || (act as any).shortcutId) {
      const targetId = (act as any).shortcutId || 'auto';
      import('./services/shortcutService').then(({ createSectionShortcut }) => {
        createSectionShortcut(targetId).then(res => {
          showToast(res.message, res.success ? 'success' : 'info');
        });
      });
      return;
    }

    if ((act as any).type === 'shortcuts_hub') {
      setActiveNavTab('tools');
      setIsToolsOpen(true);
      setActiveToolId('shortcuts');
      return;
    }

    if (act.type === 'navigate_parking') {
      if (act.url) {
        window.open(act.url, '_blank');
      } else {
        const p = getSavedParking();
        if (p) window.open(getNavigationUrl(p.latitude, p.longitude), '_blank');
      }
      return;
    }

    if (act.type === 'parking' || act.type === 'save_parking') {
      setActiveNavTab('home');
      setAddressParkingTab('parking');
      setAddressParkingAutoSave(Boolean(act.autoSave || act.type === 'save_parking'));
      setIsAddressAndParkingOpen(true);
      return;
    }

    if (act.type === 'address' || act.category === 'address' || act.category === 'address-book') {
      setActiveNavTab('home');
      setAddressParkingTab('addresses');
      setIsAddressAndParkingOpen(true);
      return;
    }

    if (act.type === 'recipes' || act.category === 'recipes') {
      // La barra di ricerca delle ricette non deve MAI essere sporcata dall'AI
      setInitialRecipesSearch('');
      if (act.recipeCategory) setInitialRecipesCategory(act.recipeCategory);
      else setInitialRecipesCategory(null);
      if ((act as any).recipe) setInitialRecipeToOpen((act as any).recipe);
      else setInitialRecipeToOpen(null);
      setIsRecipesOpen(true);
      return;
    }

    if (act.type === 'gallery' || act.category === 'gallery') {
      setShowGalleryViewer(true);
      return;
    }

    if (act.type === 'tool' || act.toolId) {
      setActiveNavTab('tools');
      setIsToolsOpen(true);
      if (act.toolId) {
        setActiveToolId(act.toolId);
      }
      return;
    }

    if (act.type === 'deadlines') {
      setActiveNavTab('deadlines');
      return;
    }

    if (act.type === 'volantino') {
      setActiveNavTab('home');
      const chain = act.chainSlug || act.storeName || null;
      let existingVol = modules.find(m => m.type === 'volantino') as import('./types').VolantinoModule | undefined;
      if (!existingVol) {
        existingVol = {
          id: generateUUID(),
          type: 'volantino',
          title: 'Volantini',
          offers: [],
          flyers: [],
          x: 0,
          y: Infinity,
          w: 3,
          h: 3,
          folderId: selectedFolderId || undefined
        };
        setModules(prev => {
          const updated = [existingVol!, ...prev];
          saveAppState(updated, folders).catch(console.error);
          return updated;
        });
      }
      if (act.flyerId || (typeof act.page === 'number' && act.page >= 1)) {
        const pgNum = typeof act.page === 'number' ? Math.max(0, act.page - 1) : 0;
        setFlyerInitialOffer({ fid: String(act.flyerId || ''), pg: pgNum });
        setVolantinoInitialChain(null);
      } else {
        setFlyerInitialOffer(null);
        setVolantinoInitialChain(chain);
      }
      setEditingVolantinoModule(existingVol);
      return;
    }

    if (act.type === 'module' && act.module) {
      setActiveNavTab('home');
      openEditModalWithSecurity(act.module);
      return;
    }

    if (act.type === 'category') {
      const cat = act.category;

      if (cat === 'volantino' || (act.label && act.label.toLowerCase().includes('volantin'))) {
        setActiveNavTab('home');
        let existingVol = modules.find(m => m.type === 'volantino') as import('./types').VolantinoModule | undefined;
        if (!existingVol) {
          existingVol = {
            id: generateUUID(),
            type: 'volantino',
            title: 'Volantini',
            offers: [],
            flyers: [],
            x: 0,
            y: Infinity,
            w: 3,
            h: 3,
            folderId: selectedFolderId || undefined
          };
          setModules(prev => {
            const updated = [existingVol!, ...prev];
            saveAppState(updated, folders).catch(console.error);
            return updated;
          });
        }
        setVolantinoInitialChain(null);
        setEditingVolantinoModule(existingVol);
        return;
      }

      if (cat === 'supermarket' || (act.label && act.label.toLowerCase().includes('spesa') && !act.label.toLowerCase().includes('condivis') && !act.label.toLowerCase().includes('singol'))) {
        setActiveNavTab('home');
        let sm = (act.module as import('./types').SupermarketModule) || (modules.find(m => m.type === 'supermarket') as import('./types').SupermarketModule | undefined);
        if (!sm) {
          sm = {
            id: generateUUID(),
            type: 'supermarket',
            title: 'Lista della Spesa',
            items: [],
            x: 0,
            y: Infinity,
            w: 3,
            h: 3,
            folderId: selectedFolderId || undefined
          };
          setModules(prev => {
            const updated = [sm!, ...prev];
            saveAppState(updated, folders).catch(console.error);
            return updated;
          });
        }
        setEditingSupermarketModule(sm);
        return;
      }

      if (cat === 'tools') {
        setActiveNavTab('tools');
        setIsToolsOpen(true);
        if (act.toolId) setActiveToolId(act.toolId);
        return;
      }

      if (cat === 'profile') {
        setActiveNavTab('profile');
        setIsProfileOpen(true);
        return;
      }

      if (cat === 'settings') {
        setIsSettingsOpen(true);
        return;
      }

      if (cat === 'deadlines') {
        setActiveNavTab('deadlines');
        return;
      }

      if (cat === 'parking') {
        setActiveNavTab('home');
        setAddressParkingTab('parking');
        setAddressParkingAutoSave(Boolean(act.autoSave));
        setIsAddressAndParkingOpen(true);
        return;
      }

      if (cat === 'address' || cat === 'address-book') {
        setActiveNavTab('home');
        setAddressParkingTab('addresses');
        setIsAddressAndParkingOpen(true);
        return;
      }

      if (cat === 'recipes') {
        setInitialRecipesSearch('');
        if (act.recipeCategory) setInitialRecipesCategory(act.recipeCategory);
        else setInitialRecipesCategory(null);
        if ((act as any).recipe) setInitialRecipeToOpen((act as any).recipe);
        else setInitialRecipeToOpen(null);
        setIsRecipesOpen(true);
        return;
      }

      if (cat === 'gallery') {
        setShowGalleryViewer(true);
        return;
      }

      const isAddAction = Boolean(act.label && (act.label.toLowerCase().includes('aggiungi') || act.label.toLowerCase().includes('nuov') || act.label.toLowerCase().includes('crea') || act.label.toLowerCase().includes('configura')));

      if (cat === 'travel') {
        setActiveNavTab('home');
        const trMod = modules.find(m => m.type === 'travel') as import('./types').TravelModule | undefined;
        if (trMod) {
          openEditModalWithSecurity(trMod);
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
        return;
      }

      if (cat === 'furniture' || cat === 'home') {
        setActiveNavTab('home');
        const fMod = modules.find(m => m.type === 'furniture') as import('./types').FurnitureModule | undefined;
        if (fMod) {
          openEditModalWithSecurity(fMod);
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
        return;
      }

      if (cat === 'fitness') {
        setActiveNavTab('home');
        const fitMod = modules.find(m => m.type === 'fitness') as import('./types').FitnessModule | undefined;
        if (fitMod) {
          openEditModalWithSecurity(fitMod);
        } else {
          const newFitness: import('./types').FitnessModule = {
            id: generateUUID(),
            type: 'fitness',
            title: 'Fitness & Dieta',
            x: 0, y: 0, w: 3, h: 2,
            folderId: selectedFolderId || undefined
          };
          setModules(prev => {
            const updated = [newFitness, ...prev];
            saveAppState(updated, folders).catch(console.error);
            return updated;
          });
          setEditingFitnessModule(newFitness);
        }
        return;
      }

      if (cat === 'auto') {
        setActiveNavTab('home');
        if (isAddAction || !modules.some(m => m.type === 'auto')) {
          setFormData({ template: 'auto' });
          setAutoFormStep(0);
          setIsAdding(true);
        } else {
          const autoMod = modules.find(m => m.type === 'auto') as import('./types').AutoModule | undefined;
          if (autoMod) openEditModalWithSecurity(autoMod);
        }
        return;
      }

      if (cat === 'document') {
        setActiveNavTab('home');
        if (isAddAction || !modules.some(m => m.type === 'document')) {
          setFormData({ template: 'document' });
          setIsAdding(true);
        } else {
          handleSelectCategoryWithSecurity('document');
        }
        return;
      }

      if (cat === 'single-expense') {
        setActiveNavTab('home');
        if (isAddAction) {
          setSpesaSubMenu(false);
          setFormData({ template: 'single-expense' });
          setIsAdding(true);
        } else {
          handleSelectCategoryWithSecurity('single-expense');
        }
        return;
      }

      if (cat === 'split') {
        setActiveNavTab('home');
        if (isAddAction || !modules.some(m => m.type === 'split')) {
          setSpesaSubMenu(false);
          setFormData({ template: 'split' });
          setIsAdding(true);
        } else {
          const spMod = modules.find(m => m.type === 'split') as import('./types').SplitModule | undefined;
          if (spMod) openEditModalWithSecurity(spMod);
          else handleSelectCategoryWithSecurity('split');
        }
        return;
      }

      if (cat === 'installments') {
        setActiveNavTab('home');
        if (isAddAction || !modules.some(m => m.type === 'installments')) {
          setFormData({ template: 'installments' });
          setIsAdding(true);
        } else {
          const instMod = modules.find(m => m.type === 'installments') as import('./types').InstallmentsModule | undefined;
          if (instMod) openEditModalWithSecurity(instMod);
          else handleSelectCategoryWithSecurity('installments');
        }
        return;
      }

      if (cat === 'generic' || cat === 'notes') {
        setActiveNavTab('home');
        if (isAddAction) {
          setFormData({ template: 'generic' });
          setIsAdding(true);
        } else {
          handleSelectCategoryWithSecurity('generic');
        }
        return;
      }

      setActiveNavTab('home');
      handleSelectCategoryWithSecurity(cat as any);
    }
  }, [modules, folders, selectedFolderId, openEditModalWithSecurity, handleSelectCategoryWithSecurity]);

  const speakHomeAiResponse = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const clean = text
        .replace(/[*_#`~]/g, '')
        .replace(/\n+/g, '. ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!clean) return;

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'it-IT';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const itVoice = voices.find(v => v.lang && v.lang.startsWith('it'));
      if (itVoice) utterance.voice = itVoice;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[HomeVoice] Speech synthesis error:', e);
    }
  }, []);

  const executeHomeVoiceCommand = useCallback(async (command: string) => {
    setIsHomeVoiceProcessing(true);
    try {
      const response = await queryChelonaAi(command, modules, username);

      // 1. Se ha creato o aggiornato un modulo (es. Lista Spesa, Note)
      if (response.createdModule) {
        const targetMod = response.createdModule;
        setModules(prev => {
          const exists = prev.some(m => m.id === targetMod.id);
          const updated = exists ? prev.map(m => m.id === targetMod.id ? targetMod : m) : [targetMod, ...prev];
          saveAppState(updated, folders).catch(console.error);
          return updated;
        });

        // Se è la lista della spesa, mostrala immediatamente aggiornata!
        if (targetMod.type === 'supermarket') {
          setEditingSupermarketModule(targetMod as import('./types').SupermarketModule);
          setActiveNavTab('home');
        }
      }

      // 2. Se c'è una navigazione automatica o azione associata
      if (response.autoAction) {
        handleAiNavigate(response.autoAction);
      }

      // 3. Feedback vocale
      speakHomeAiResponse(response.text);

      // 4. Feedback visivo con Toast
      const firstLine = response.text.split('\n')[0].replace(/[*_#`~]/g, '').trim();
      showToast(firstLine || 'Comando completato!', 'success');
    } catch (e) {
      console.error('[HomeVoice] Command execution error:', e);
      showToast('Non ho potuto completare la richiesta. Riprova.', 'error');
    } finally {
      setIsHomeVoiceProcessing(false);
      setHomeVoiceTranscript('');
    }
  }, [modules, username, folders, saveAppState, handleAiNavigate, speakHomeAiResponse, showToast]);

  const handleToggleHomeVoice = useCallback(async () => {
    if (isHomeVoiceListening) {
      voiceRecognitionService.stop();
      setIsHomeVoiceListening(false);
      setHomeVoiceTranscript('');
      return;
    }

    setIsHomeVoiceListening(true);
    setHomeVoiceTranscript('');
    setHomeVoiceVolume(0.2);

    const started = await voiceRecognitionService.start({
      lang: 'it-IT',
      onStart: () => {
        setIsHomeVoiceListening(true);
      },
      onRms: (normVolume) => {
        setHomeVoiceVolume(normVolume);
      },
      onPartial: (partial) => {
        setHomeVoiceTranscript(partial);
      },
      onResult: async (finalText) => {
        setIsHomeVoiceListening(false);
        setHomeVoiceTranscript(finalText);
        if (finalText && finalText.trim().length > 0) {
          await executeHomeVoiceCommand(finalText.trim());
        }
      },
      onError: (err) => {
        setIsHomeVoiceListening(false);
        showToast(err || 'Errore microfono', 'error');
      },
      onEnd: () => {
        setIsHomeVoiceListening(false);
      },
      autoStopSilenceMs: 1600,
    });

    if (!started) {
      setIsHomeVoiceListening(false);
    }
  }, [isHomeVoiceListening, executeHomeVoiceCommand, showToast]);

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
      
      // Generate a brand new completely unique server key for this profile
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
    setIsSensitiveUnlocked(false);
    setIsProfileOpen(false);
    setIsSidebarOpen(false);
    setIsSettingsOpen(false);
    setIsAdding(false);
    setSearchQuery('');
    setShowProfileSelectorModal(true);
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
          if (financeActiveTab === 'single') {
            if (m.type !== 'single-expense') return false;
          } else if (financeActiveTab === 'split') {
            if (m.type !== 'split') return false;
          } else if (financeActiveTab === 'installments') {
            if (m.type !== 'installments') return false;
          } else {
            if (m.type !== 'split' && m.type !== 'single-expense' && m.type !== 'installments') return false;
          }
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
  }, [modules, selectedFolderId, selectedType, searchQuery, financeActiveTab]);



  const filteredTools = useMemo(() => {
    if (!searchQuery.trim() || isToolsOpen) return [];
    const query = searchQuery.toLowerCase();
    return TOOLS.filter((t: any) => t.title.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query));
  }, [searchQuery, isToolsOpen]);

  const handleSaveToSandbox = async (title: string, base64: string, targetFolderName?: string): Promise<void> => {
    if (!encryptionKey || !currentProfileId) {
      showToast('Cassaforte protetta: sblocca prima la cassaforte con PIN', 'error');
      return;
    }

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

    const isCookingRelated = text.includes('ricett') || text.includes('cucin') || text.includes('ingred') || text.includes('ingrand') || text.includes('igred') || text.includes('pranz') || text.includes('cena') || text.includes('piatt');

    if (isCookingRelated || (!isAutoRelated && text.split(/\s+/).length > 2)) {
      // Invia alla chat AI evitando rigorosamente di sporcare qualsiasi barra di ricerca
      setIsAiOpen(true);
      setActiveNavTab('ai');
      return;
    }

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
    setIsListening(true);
    if (navigator.vibrate) navigator.vibrate(50);

    const success = await voiceRecognitionService.start({
      lang: 'it-IT',
      onStart: () => {
        setIsListening(true);
      },
      onResult: (text) => {
        setIsListening(false);
        if (text && text.trim().length > 0) {
          processVoiceQuery(text.trim());
          if (navigator.vibrate) navigator.vibrate([30, 30]);
        }
      },
      onError: (err) => {
        console.warn('Voice search error:', err);
        setIsListening(false);
        showToast(err || 'Errore durante la ricerca vocale.', 'error');
      },
      onEnd: () => {
        setIsListening(false);
      }
    });

    if (!success) {
      setIsListening(false);
    }
  };

  const handleWakeWordTrigger = useCallback(() => {
    if (isAiOpen) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([60, 40, 80]); } catch {}
    }
    showToast("🎤 'Ciao Chelona!' rilevato", 'info');
    setAiInitialVoiceMode(true);
    setIsAiOpen(true);
    setActiveNavTab('ai');
    setIsToolsOpen(false);
    setIsProfileOpen(false);
    setSelectedType(null);
  }, [isAiOpen, showToast]);

  const handleToggleWakeWord = async () => {
    const next = !isWakeWordEnabled;
    if (next) {
      wakeWordService.start(handleWakeWordTrigger);
    } else {
      wakeWordService.stop();
    }
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

  useEffect(() => {
    const unsubscribe = wakeWordService.subscribe((state) => {
      setIsWakeWordEnabled(state.isEnabled);
    });
    return () => {
      unsubscribe();
      wakeWordService.stop();
    };
  }, []);

  useEffect(() => {
    if (!isWakeWordEnabled) return;
    if (isAiOpen || isListening) {
      wakeWordService.pause();
    } else {
      wakeWordService.resume();
    }
  }, [isAiOpen, isListening, isWakeWordEnabled]);

  useEffect(() => {
    if (!isWakeWordEnabled) return;
    const onVisibilityChange = () => {
      if (document.hidden) {
        wakeWordService.pause();
      } else if (!isAiOpen && !isListening) {
        wakeWordService.resume();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isWakeWordEnabled, isAiOpen, isListening]);

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
          onOpenAddressBook={() => {
            setAddressParkingTab('addresses');
            setIsAddressAndParkingOpen(true);
          }}
          onImportFile={handleImportFile}
          onCheckUpdate={() => handleCheckUpdate(false)}
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
              setIsSensitiveUnlocked(true);
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

      {showProfileSelectorModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 lg:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowProfileSelectorModal(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-[var(--card-bg)] rounded-[2.5rem] p-6 lg:p-8 shadow-2xl overflow-hidden border border-[var(--border)] z-10"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-main)]">Seleziona Profilo</h3>
                  <p className="text-xs text-[var(--text-muted)] font-medium">Cambia o crea un nuovo profilo per la tua dashboard</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileSelectorModal(false)}
                className="p-2 hover:bg-[var(--bg)] rounded-xl text-[var(--text-muted)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {storage.loadProfiles().map(p => {
                const isSelected = p.id === currentProfileId;
                return (
                  <button
                    key={`profile-sel-${p.id}`}
                    onClick={async () => {
                      setCurrentProfileId(p.id);
                      setUsername(p.username);
                      setAvatar(p.avatar);
                      setIsBioEnabled(p.isBiometricEnabled || false);
                      setIsSensitiveUnlocked(false);
                      setShowProfileSelectorModal(false);
                      setIsProfileOpen(false);
                      const pubKey = await storage.getPublicKey();
                      setEncryptionKey(pubKey);
                      try {
                        const pubState = await storage.loadPublicState(p.id);
                        setModules(pubState.modules || []);
                        setFolders(pubState.folders || []);
                      } catch (err) {}
                      showToast(`Sei passato al profilo di ${p.username} 👤`, 'success');
                    }}
                    className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 group cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--accent-bg)] border-[var(--accent)] text-[var(--accent)] shadow-sm'
                        : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-main)] hover:border-[var(--accent)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={p.avatar || `https://ui-avatars.com/api/?name=${p.username}&background=E3E3E3&color=5E5E5E`}
                        alt={p.username}
                        className="w-11 h-11 rounded-xl object-cover border border-[var(--border)]"
                      />
                      <div className="text-left">
                        <p className="font-bold text-base text-[var(--text-main)]">{p.username}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {isSelected ? 'Profilo Attivo' : 'Tocca per attivare'}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-7 h-7 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--border)] flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowProfileSelectorModal(false);
                  setIsProfileOpen(false);
                  setCurrentProfileId(null);
                }}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 text-sm cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>Crea Nuovo Profilo</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

    <ErrorBoundary>
      <React.Suspense fallback={<div className="min-h-screen bg-[var(--bg,#0b0f19)]" />}>
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
              <header className="h-16 lg:h-20 bg-[var(--bg)] px-3 sm:px-5 lg:px-12 flex items-center justify-between shrink-0 z-10 safe-area-header transition-all">
                {/* Left side: Contextual Title or Logo */}
                <div className="flex items-center gap-3 sm:gap-4">
                  {(activeNavTab !== 'home' || isToolsOpen || isProfileOpen || isSettingsOpen || isAiOpen || selectedType || selectedFolderId) && (
                    <button 
                      onClick={() => { 
                        closeAllEditingModals();
                        setActiveNavTab('home'); 
                        setIsToolsOpen(false); 
                        setIsProfileOpen(false); 
                        setIsSettingsOpen(false);
                        setIsAiOpen(false);
                        setSelectedType(null); 
                        setSelectedFolderId(null); 
                        setActiveToolId(null); 
                        setIsSensitiveUnlocked(false);
                      }}
                      className="px-3.5 py-1.5 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-2xl text-[var(--text-main)] font-black text-xs transition-all flex items-center gap-1.5 border border-[var(--border)] shadow-sm active:scale-95 cursor-pointer"
                      title="Torna alla Home"
                    >
                      <ArrowLeft className="w-4 h-4 text-[var(--accent)]" />
                      <span>Home</span>
                    </button>
                  )}

                  {!selectedType && !isToolsOpen && !isProfileOpen && !isSettingsOpen && !isAiOpen && !selectedFolderId && activeNavTab === 'home' ? (
                    <div 
                      className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none group"
                      onClick={() => {
                        setActiveNavTab('home');
                        setSelectedType(null);
                        setSelectedFolderId(null);
                      }}
                      title="Chelona Home"
                    >
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-rose-500/15 to-indigo-500/20 p-1 flex items-center justify-center border border-amber-500/30 shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                        <img src="/chelona_logo.png" alt="Chelona Logo" className="w-full h-full object-contain filter drop-shadow-sm" />
                      </div>
                      <div className="flex flex-col">
                        <h1 className="text-xl sm:text-2xl font-black text-[var(--text-main)] tracking-tight leading-none">
                          Chelona
                        </h1>
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest leading-none mt-1">
                          Personal Hub
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <h1 className="text-xl lg:text-2xl font-bold text-[var(--text-main)] tracking-tight">
                        {isAiOpen ? 'Chelona AI' :
                         activeNavTab === 'deadlines' ? 'Scadenze & Promemoria' :
                         isToolsOpen ? 'Strumenti' : 
                         isProfileOpen ? 'Profilo' :
                         isSettingsOpen ? 'Impostazioni' :
                         selectedFolderId ? (folders.find(f => f.id === selectedFolderId)?.name || 'Cartella') : 
                         selectedType === 'home' ? 'Casa, Offerte & Spesa' :
                         selectedType === 'testing' ? 'Testing & Nuove Funzioni' :
                         selectedType === 'split' ? 'Finanze & Spese' :
                         selectedType ? (TEMPLATES[selectedType as keyof typeof TEMPLATES]?.title || 'Sandbox') : 'Chelona'}
                      </h1>
                    </div>
                  )}
                </div>

                {/* Right side: Action buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button 
                    onClick={() => { setIsToolsOpen(true); setIsProfileOpen(false); setIsSettingsOpen(false); setIsAiOpen(false); setSelectedType(null); }} 
                    className="p-2 sm:p-2.5 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-full text-[var(--accent)] transition-all hidden md:flex items-center justify-center shadow-sm cursor-pointer"
                    title="Strumenti"
                  >
                    <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  {/* Tasto QR Code discreto nella Header (meno invasivo) */}
                  <button 
                    onClick={() => setIsScanning(true)} 
                    className="p-2 sm:p-2.5 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-full text-[var(--text-muted)] hover:text-emerald-500 transition-all hidden sm:flex items-center justify-center shadow-sm cursor-pointer"
                    title="Scansiona QR Code"
                  >
                    <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  <button 
                    onClick={() => {
                      if (isSettingsOpen) {
                        setIsSettingsOpen(false);
                      } else {
                        setIsSettingsOpen(true);
                        setIsProfileOpen(false);
                        setIsAiOpen(false);
                      }
                    }} 
                    className={`p-2 sm:p-2.5 rounded-full transition-all flex items-center justify-center shadow-sm cursor-pointer ml-1 ${
                      isSettingsOpen 
                        ? 'bg-[var(--accent)] text-white shadow-md' 
                        : 'bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] hover:text-[var(--accent)]'
                    }`}
                    title="Impostazioni"
                  >
                    <Settings className="w-5 h-5" />
                  </button>

                  <button 
                    onClick={() => {
                      if (isProfileOpen) {
                        setIsProfileOpen(false);
                      } else {
                        setIsProfileOpen(true);
                        setIsSettingsOpen(false);
                        setIsAiOpen(false);
                      }
                    }} 
                    className={`w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full overflow-hidden border-2 transition-all bg-[var(--surface-variant)] shadow-md cursor-pointer ml-1 ${
                      isProfileOpen
                        ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/40 shadow-lg'
                        : 'border-[var(--accent)]/40 hover:opacity-85 hover:border-[var(--accent)]'
                    }`}
                    title="Profilo utente"
                  >
                    <img src={avatar || `https://ui-avatars.com/api/?name=${username}&background=E3E3E3&color=5E5E5E`} alt="Profile" className="w-full h-full object-cover" />
                  </button>
                </div>
              </header>



              <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
                {isProfileOpen || isSettingsOpen ? (
              <React.Suspense fallback={<div className="flex items-center justify-center p-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <ProfileScreen
                  mode={isSettingsOpen ? 'settings' : 'profile'}
                  onClose={() => {
                    setIsProfileOpen(false);
                    setIsSettingsOpen(false);
                  }}
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
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onOpenGemma2Setup={() => {
                    setIsProfileOpen(false);
                    setIsSettingsOpen(false);
                    setShowGemma2Setup(true);
                  }}
                />
              </React.Suspense>
            ) : isToolsOpen ? (
              <ToolsScreen 
                showToast={showToast} 
                initialToolId={activeToolId} 
                onSaveToSandbox={handleSaveToSandbox} 
                onReset={() => setActiveToolId(null)} 
                onOpenAi={() => {
                  setIsToolsOpen(false);
                  setIsAiOpen(true);
                  setActiveNavTab('ai');
                }}
              />
            ) : isAiOpen ? (
              <React.Suspense fallback={<div className="flex items-center justify-center p-20"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <ChelonaAiScreen
                  modules={modules}
                  username={username}
                  initialVoiceMode={aiInitialVoiceMode}
                   activeSection={
                     selectedType === 'home' ? 'home' :
                     selectedType === 'split' ? 'split' :
                     selectedType === 'supermarket' ? 'supermarket' :
                     selectedType === 'volantino' ? 'volantino' :
                     selectedType === 'travel' ? 'travel' :
                     selectedType === 'furniture' ? 'furniture' :
                     selectedType === 'generic' ? 'notes' :
                     selectedType === 'auto' ? 'auto' :
                     selectedType === 'document' ? 'document' :
                     selectedType ? String(selectedType) :
                     undefined
                   }
                  onClose={() => {
                    setIsAiOpen(false);
                    setAiInitialVoiceMode(false);
                    if (activeNavTab === 'ai') setActiveNavTab('home');
                  }}
                  onOpenModule={(m) => {
                    handleAiNavigate({ label: m.title || 'Modulo', type: 'module', module: m, moduleId: m.id });
                  }}
                  onOpenCategory={(cat) => {
                    handleAiNavigate({ label: cat, type: 'category', category: cat });
                  }}
                  showToast={showToast}
                  onOpenParking={() => {
                    handleAiNavigate({ label: 'Parcheggio', type: 'parking' });
                  }}
                  onNavigate={handleAiNavigate}
                  onAddModule={(newMod) => {
                    setModules(prev => {
                      const exists = prev.some(m => m.id === newMod.id);
                      const updated = exists ? prev.map(m => m.id === newMod.id ? newMod : m) : [newMod, ...prev];
                      saveAppState(updated, folders).catch(console.error);
                      return updated;
                    });
                    showToast(`Aggiunto a Chelona: ${newMod.title}`, 'success');
                  }}
                />
              </React.Suspense>
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

                  <div className="bg-[var(--card-bg)] rounded-3xl p-6 border border-[var(--border)] shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                          <Mic className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[var(--text-main)]">Comando Vocale "Ciao Chelona!"</h3>
                          <p className="text-sm text-[var(--text-muted)]">Attiva il dialogo pronunciando "Ciao Chelona!" o "Ehi Chelona". 100% on-device.</p>
                        </div>
                      </div>
                      <button
                        onClick={handleToggleWakeWord}
                        className={`px-6 py-2.5 rounded-xl font-bold transition-all shrink-0 ${
                          isWakeWordEnabled
                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                            : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border)]'
                        }`}
                      >
                        {isWakeWordEnabled ? 'Abilitato' : 'Abilita'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
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
            ) : editingVolantinoModule ? (
              <VolantinoScreen
                module={editingVolantinoModule}
                initialOffer={flyerInitialOffer ?? undefined}
                initialChain={volantinoInitialChain ?? undefined}
                onClose={() => { 
                  setEditingVolantinoModule(null); 
                  setFlyerInitialOffer(null); 
                  setVolantinoInitialChain(null);
                  if (returnToAiOnClose) {
                    setIsAiOpen(true);
                    setActiveNavTab('ai');
                    setReturnToAiOnClose(false);
                  }
                }}
              />
            ) : editingSupermarketModule ? (
              <SupermarketScreen
                module={editingSupermarketModule}
                onSave={(mod) => { updateModuleDirect(mod); setEditingSupermarketModule(mod); }}
                onClose={() => setEditingSupermarketModule(null)}
                onShare={(mod) => setSharingModule(mod as Module)}
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
                  <button onClick={() => { setIsAdding(false); setEditingModuleId(null); setFormData({}); setAutoFormStep(0); setSpesaSubMenu(false); setHomeSubMenu(false); localStorage.removeItem('chelona_form_draft'); }} className="p-2 hover:bg-[var(--card-bg)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                  <h2 className="text-2xl lg:text-3xl font-bold text-[var(--text-main)]">
                    {editingModuleId ? 'Modifica' : 'Nuovo'} {(formData.template === 'document' || formData.type === 'document') ? 'Documento' : (formData.template === 'auto' || formData.type === 'auto') ? 'Veicolo' : 'Appunto'}
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
                              if (key === 'auto' || key === 'document') {
                                if (!isSensitiveUnlocked) {
                                  unlockAndProceed(() => {
                                    setFormData({ ...formData, template: key, title: t.title, content: t.content });
                                    setAutoFormStep(0);
                                  });
                                  return;
                                }
                              }
                              if (key === 'split') {
                                setSpesaSubMenu(true);
                              } else if (key === 'home') {
                                setHomeSubMenu(true);
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
                             const doOpen = () => {
                               setSelectedType('split');
                               setSplitModalTitle('Gruppo Spese');
                               setSplitModalCurrency('EUR');
                               setSplitModalBudget('');
                               setSplitModalParticipants(['', '']);
                               setShowSplitModal(true);
                             };
                             if (!isSensitiveUnlocked) {
                               unlockAndProceed(doOpen);
                             } else {
                               doOpen();
                             }
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
                             const doOpen = () => {
                               setSelectedType('split');
                               setSpesaSubMenu(false);
                               setFormData({ ...formData, template: 'single-expense', title: 'Spesa Singola', content: '' });
                               setAutoFormStep(0);
                             };
                             if (!isSensitiveUnlocked) {
                               unlockAndProceed(doOpen);
                             } else {
                               doOpen();
                             }
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
                             const doOpen = () => {
                               setSelectedType('split');
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
                               setModules(prev => {
                                 const updated = [newInstallments, ...prev];
                                 saveAppState(updated, folders).catch(console.error);
                                 return updated;
                               });
                               setEditingInstallmentsModule(newInstallments);
                             };
                             if (!isSensitiveUnlocked) {
                               unlockAndProceed(doOpen);
                             } else {
                               doOpen();
                             }
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
                       <button
                         onClick={() => {
                           setHomeSubMenu(false);
                           setIsAdding(false);
                           const existingSupermarket = modules.find(m => m.type === 'supermarket') as import('./types').SupermarketModule;
                           if (existingSupermarket) {
                             setEditingSupermarketModule(existingSupermarket);
                           } else {
                             const newSupermarket: import('./types').SupermarketModule = {
                               id: generateUUID(),
                               type: 'supermarket',
                               title: 'Lista della Spesa',
                               items: [],
                               x: (modules.length * 2) % 12,
                               y: Infinity,
                               w: 3,
                               h: 3,
                               folderId: selectedFolderId || undefined
                             };
                             setModules(prev => {
                               const updated = [newSupermarket, ...prev];
                               saveAppState(updated, folders).catch(console.error);
                               return updated;
                             });
                             setEditingSupermarketModule(newSupermarket);
                           }
                         }}
                         className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-[var(--border)] hover:border-emerald-500/60 hover:bg-emerald-500/10 transition-all group text-center h-full text-[var(--text-main)]"
                       >
<ShoppingBasket className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
                           <div className="text-center">
                             <span className="font-bold text-xs uppercase tracking-wider block">Lista della Spesa</span>
                             <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Prodotti da acquistare e carrello</span>
                           </div>
                         </button>
                        <button
                          onClick={() => {
                            setHomeSubMenu(false);
                            setIsAdding(false);
                            const existingVolantino = modules.find(m => m.type === 'volantino') as import('./types').VolantinoModule;
                            if (existingVolantino) {
                              setEditingVolantinoModule(existingVolantino);
                            } else {
                              const newVolantino: import('./types').VolantinoModule = {
                                id: generateUUID(),
                                type: 'volantino',
                                title: 'Volantino',
                                offers: [],
                                flyers: [],
                                x: (modules.length * 2) % 12,
                                y: Infinity,
                                w: 3,
                                h: 3,
                                folderId: selectedFolderId || undefined
                              };
                              setModules(prev => {
                                const updated = [newVolantino, ...prev];
                                saveAppState(updated, folders).catch(console.error);
                                return updated;
                              });
                              setEditingVolantinoModule(newVolantino);
                            }
                          }}
                          className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border border-[var(--border)] hover:border-amber-500/60 hover:bg-amber-500/10 transition-all group text-center h-full text-[var(--text-main)]"
                        >
                          <BadgePercent className="w-8 h-8 text-amber-500 group-hover:scale-110 transition-transform" />
                          <div className="text-center">
                            <span className="font-bold text-xs uppercase tracking-wider block">Volantino</span>
                            <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Confronta le offerte</span>
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
                                  <div className="flex items-center justify-center gap-3">
                                    <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest bg-[var(--accent-bg)] px-3 py-1 rounded-full border border-[var(--accent)]/20 shadow-sm">
                                      Passo {Math.min(autoFormStep + 1, steps.length)} di {steps.length}
                                    </span>
                                    {autoFormStep > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAutoFormStep(0);
                                          showToast('Ricomincia dal passo 1');
                                        }}
                                        className="text-[11px] font-bold text-[var(--text-muted)] hover:text-amber-500 underline transition-colors cursor-pointer"
                                        title="Torna al primo passo"
                                      >
                                        Ricomincia dal passo 1
                                      </button>
                                    )}
                                  </div>
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
              <div className="h-full pt-2">

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

                    {activeNavTab === 'deadlines' ? (
                      /* Dedicated Scadenze & Promemoria View */
                      <div className="px-4 lg:px-8 pb-40 pt-2 max-w-4xl mx-auto animate-fade-in">
                        {/* Filter Chips */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-4 custom-scrollbar">
                          {[
                            { id: 'all', label: `Tutte (${allUpcomingDeadlines.length})` },
                            { id: 'auto', label: `Auto (${allUpcomingDeadlines.filter(d => d.category === 'auto').length})` },
                            { id: 'document', label: `Documenti (${allUpcomingDeadlines.filter(d => d.category === 'document').length})` },
                            { id: 'installment', label: `Rate & Spese (${allUpcomingDeadlines.filter(d => d.category === 'installment' || d.category === 'expense').length})` }
                          ].map(chip => (
                            <button
                              key={chip.id}
                              onClick={() => setDeadlinesFilter(chip.id as any)}
                              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all shrink-0 border ${
                                deadlinesFilter === chip.id
                                  ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md shadow-[var(--accent)]/20'
                                  : 'bg-[var(--surface-variant)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--card-bg)]'
                              }`}
                            >
                              {chip.label}
                            </button>
                          ))}
                        </div>

                        {/* Deadlines List */}
                        {filteredDeadlines.length === 0 ? (
                          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-8 text-center my-6 shadow-sm">
                            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
                              <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-black text-[var(--text-main)] mb-1">Nessuna scadenza trovata</h3>
                            <p className="text-sm text-[var(--text-muted)]">Non ci sono scadenze imminenti in questa categoria.</p>
                          </div>
                        ) : (
                          <div className="space-y-3 mt-2">
                            {filteredDeadlines.map(item => {
                              const isExpired = item.daysLeft < 0;
                              const isToday = item.daysLeft === 0;
                              const isUrgent = item.daysLeft > 0 && item.daysLeft <= 7;

                              return (
                                <div
                                  key={item.id}
                                  onClick={item.openAction}
                                  className="bg-[var(--card-bg)] border border-[var(--border)] hover:border-[var(--accent)] p-5 rounded-3xl shadow-sm transition-all flex items-center justify-between gap-4 cursor-pointer group active:scale-[0.99]"
                                >
                                  <div className="flex items-center gap-4 min-w-0">
                                    <div className={`w-12 h-12 rounded-2xl bg-[var(--surface-variant)] flex items-center justify-center shrink-0 ${item.color} shadow-inner`}>
                                      <item.icon className="w-6 h-6" />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="font-black text-sm lg:text-base text-[var(--text-main)] truncate">{item.title}</h4>
                                      <p className="text-xs text-[var(--text-muted)] font-medium truncate mt-0.5">{item.subtitle}</p>
                                      <p className="text-[11px] text-[var(--text-muted)] font-semibold mt-1">
                                        Scadenza: {item.dueDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end shrink-0 gap-1.5">
                                    <span className={`px-3 py-1 rounded-xl text-xs font-black tracking-wider uppercase border ${
                                      isExpired
                                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                                        : isToday
                                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm animate-pulse'
                                        : isUrgent
                                        ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                                        : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                    }`}>
                                      {isExpired ? `Scaduta (${Math.abs(item.daysLeft)}gg)` : isToday ? 'Oggi!' : `Tra ${item.daysLeft} gg`}
                                    </span>
                                    <span className="text-[11px] font-bold text-[var(--accent)] group-hover:underline flex items-center gap-0.5">
                                      Apri <ArrowRight className="w-3.5 h-3.5" />
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : !selectedType && !selectedFolderId && !searchQuery.trim() ? (
                      <div className="px-4 lg:px-8 pb-40 pt-2">
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
                                    onClick={() => handleSelectCategoryWithSecurity(catId as ModuleType)}
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

                        {/* 5 MACRO-HUBS UNIFICATI */}
                        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <h3 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                            <span>Aree Principali</span>
                          </h3>
                          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 font-medium">
                            <Smartphone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>Tieni premuta una sezione per salvarla come app</span>
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
                          {/* 1. Auto & Mobilità */}
                          <button
                            onClick={() => handleCardClick(() => {
                              const existingAuto = modules.find(m => m.type === 'auto') as import('./types').AutoModule;
                              if (existingAuto) {
                                openEditModalWithSecurity(existingAuto);
                              } else {
                                handleSelectCategoryWithSecurity('auto');
                              }
                            })}
                            onTouchStart={(e) => handleSectionPressStart({ id: 'auto', title: 'Auto & Mobilità', icon: Car, color: 'rose' }, e)}
                            onTouchEnd={handleSectionPressEnd}
                            onTouchMove={handleSectionTouchMove}
                            onMouseDown={(e) => handleSectionPressStart({ id: 'auto', title: 'Auto & Mobilità', icon: Car, color: 'rose' }, e)}
                            onMouseUp={handleSectionPressEnd}
                            onMouseLeave={handleSectionPressEnd}
                            onContextMenu={(e) => e.preventDefault()}
                            className="bg-[var(--card-bg)] p-6 lg:p-7 rounded-[2.5rem] border border-[var(--border)] hover:border-rose-500/50 shadow-sm hover:shadow-lg transition-all text-left flex items-start gap-4 group active:scale-[0.99] relative overflow-hidden select-none cursor-pointer"
                          >
                            <div className="w-14 h-14 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                              <Car className="w-7 h-7" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <h4 className="font-black text-base lg:text-lg text-[var(--text-main)]">Auto & Mobilità</h4>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                    {modules.filter(m => m.type === 'auto').length > 0 ? `${modules.filter(m => m.type === 'auto').length} Veicol${modules.filter(m => m.type === 'auto').length > 1 ? 'i' : 'o'}` : 'Configura'}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                                Assicurazione, bollo, revisione, chilometri e manutenzioni
                              </p>
                            </div>
                          </button>

                          {/* 2. Documenti & Scadenze */}
                          <button
                            onClick={() => handleCardClick(() => handleSelectCategoryWithSecurity('document'))}
                            onTouchStart={(e) => handleSectionPressStart({ id: 'document', title: 'Documenti', icon: FileText, color: 'blue' }, e)}
                            onTouchEnd={handleSectionPressEnd}
                            onTouchMove={handleSectionTouchMove}
                            onMouseDown={(e) => handleSectionPressStart({ id: 'document', title: 'Documenti', icon: FileText, color: 'blue' }, e)}
                            onMouseUp={handleSectionPressEnd}
                            onMouseLeave={handleSectionPressEnd}
                            onContextMenu={(e) => e.preventDefault()}
                            className="bg-[var(--card-bg)] p-6 lg:p-7 rounded-[2.5rem] border border-[var(--border)] hover:border-blue-500/50 shadow-sm hover:shadow-lg transition-all text-left flex items-start gap-4 group active:scale-[0.99] relative overflow-hidden select-none cursor-pointer"
                          >
                            <div className="w-14 h-14 rounded-3xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                              <FileText className="w-7 h-7" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <h4 className="font-black text-base lg:text-lg text-[var(--text-main)]">Documenti</h4>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                    {modules.filter(m => m.type === 'document').length} Salvati
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                                Carte d'identità, patenti, ricevute fiscali, contratti e scadenze
                              </p>
                            </div>
                          </button>

                          {/* 3. Finanze & Spese */}
                          <button
                            onClick={() => handleCardClick(() => handleSelectCategoryWithSecurity('split'))}
                            onTouchStart={(e) => handleSectionPressStart({ id: 'split', title: 'Finanze & Spese', icon: Wallet, color: 'purple' }, e)}
                            onTouchEnd={handleSectionPressEnd}
                            onTouchMove={handleSectionTouchMove}
                            onMouseDown={(e) => handleSectionPressStart({ id: 'split', title: 'Finanze & Spese', icon: Wallet, color: 'purple' }, e)}
                            onMouseUp={handleSectionPressEnd}
                            onMouseLeave={handleSectionPressEnd}
                            onContextMenu={(e) => e.preventDefault()}
                            className="bg-[var(--card-bg)] p-6 lg:p-7 rounded-[2.5rem] border border-[var(--border)] hover:border-purple-500/50 shadow-sm hover:shadow-lg transition-all text-left flex items-start gap-4 group active:scale-[0.99] relative overflow-hidden select-none cursor-pointer"
                          >
                            <div className="w-14 h-14 rounded-3xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                              <Wallet className="w-7 h-7" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <h4 className="font-black text-base lg:text-lg text-[var(--text-main)]">Finanze & Spese</h4>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-500 border border-purple-500/20">
                                    Finanze
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                                Spese quotidiane, conti condivisi in gruppo, rate e mutui
                              </p>
                            </div>
                          </button>

                          {/* 4. Casa, Spesa & Offerte */}
                          <button
                            onClick={() => handleCardClick(() => setSelectedType('home'))}
                            onTouchStart={(e) => handleSectionPressStart({ id: 'home', title: 'Casa, Offerte & Spesa', icon: Home, color: 'teal' }, e)}
                            onTouchEnd={handleSectionPressEnd}
                            onTouchMove={handleSectionTouchMove}
                            onMouseDown={(e) => handleSectionPressStart({ id: 'home', title: 'Casa, Offerte & Spesa', icon: Home, color: 'teal' }, e)}
                            onMouseUp={handleSectionPressEnd}
                            onMouseLeave={handleSectionPressEnd}
                            onContextMenu={(e) => e.preventDefault()}
                            className="bg-[var(--card-bg)] p-6 lg:p-7 rounded-[2.5rem] border border-[var(--border)] hover:border-teal-500/50 shadow-sm hover:shadow-lg transition-all text-left flex items-start gap-4 group active:scale-[0.99] relative overflow-hidden select-none cursor-pointer"
                          >
                            <div className="w-14 h-14 rounded-3xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                              <Home className="w-7 h-7" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <h4 className="font-black text-base lg:text-lg text-[var(--text-main)]">Casa, Offerte & Spesa</h4>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-500 border border-teal-500/20">
                                    Offerte & Casa
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                                Volantini sconti supermercati, lista della spesa e ricettario
                              </p>
                            </div>
                          </button>

                          {/* 5. Salute, Fitness & Dieta */}
                          <button
                            onClick={() => handleCardClick(() => {
                              const existingFitness = modules.find(m => m.type === 'fitness');
                              if (existingFitness) {
                                setEditingFitnessModule(existingFitness as import('./types').FitnessModule);
                              } else {
                                const newFitness: import('./types').FitnessModule = {
                                  id: generateUUID(),
                                  type: 'fitness',
                                  title: 'Fitness & Dieta',
                                  x: 0, y: 0, w: 3, h: 2,
                                  folderId: selectedFolderId || undefined
                                };
                                setModules(prev => {
                                  const updated = [newFitness, ...prev];
                                  saveAppState(updated, folders).catch(console.error);
                                  return updated;
                                });
                                setEditingFitnessModule(newFitness);
                              }
                            })}
                            onTouchStart={(e) => handleSectionPressStart({ id: 'fitness', title: 'Salute, Fitness & Dieta', icon: Activity, color: 'emerald' }, e)}
                            onTouchEnd={handleSectionPressEnd}
                            onTouchMove={handleSectionTouchMove}
                            onMouseDown={(e) => handleSectionPressStart({ id: 'fitness', title: 'Salute, Fitness & Dieta', icon: Activity, color: 'emerald' }, e)}
                            onMouseUp={handleSectionPressEnd}
                            onMouseLeave={handleSectionPressEnd}
                            onContextMenu={(e) => e.preventDefault()}
                            className="bg-[var(--card-bg)] p-6 lg:p-7 rounded-[2.5rem] border border-[var(--border)] hover:border-emerald-500/50 shadow-sm hover:shadow-lg transition-all text-left flex items-start gap-4 group active:scale-[0.99] relative overflow-hidden select-none cursor-pointer"
                          >
                            <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                              <Activity className="w-7 h-7" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <h4 className="font-black text-base lg:text-lg text-[var(--text-main)]">Salute, Fitness & Dieta</h4>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                    Trainer
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                                Schede allenamento, timer recupero e pasti con grammature esatte
                              </p>
                            </div>
                          </button>

                          {/* 6. Viaggi & Mete */}
                          <button
                            onClick={() => handleCardClick(() => {
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
                            })}
                            onTouchStart={(e) => handleSectionPressStart({ id: 'travel', title: 'Viaggi & Mete', icon: Globe, color: 'indigo' }, e)}
                            onTouchEnd={handleSectionPressEnd}
                            onTouchMove={handleSectionTouchMove}
                            onMouseDown={(e) => handleSectionPressStart({ id: 'travel', title: 'Viaggi & Mete', icon: Globe, color: 'indigo' }, e)}
                            onMouseUp={handleSectionPressEnd}
                            onMouseLeave={handleSectionPressEnd}
                            onContextMenu={(e) => e.preventDefault()}
                            className="bg-[var(--card-bg)] p-6 lg:p-7 rounded-[2.5rem] border border-[var(--border)] hover:border-indigo-500/50 shadow-sm hover:shadow-lg transition-all text-left flex items-start gap-4 group active:scale-[0.99] relative overflow-hidden select-none cursor-pointer"
                          >
                            <div className="w-14 h-14 rounded-3xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                              <Globe className="w-7 h-7" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <h4 className="font-black text-base lg:text-lg text-[var(--text-main)]">Viaggi & Mete</h4>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                                    Itinerari
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                                Pianifica mete, tappe del viaggio e scadenze valigie
                              </p>
                            </div>
                          </button>

                          {/* 7. Mobilità & Posizioni */}
                          <button
                            onClick={() => handleCardClick(() => {
                              setAddressParkingTab('parking');
                              setIsAddressAndParkingOpen(true);
                            })}
                            onTouchStart={(e) => handleSectionPressStart({ id: 'parking', title: 'Mobilità & Posizioni', icon: MapPin, color: 'amber' }, e)}
                            onTouchEnd={handleSectionPressEnd}
                            onTouchMove={handleSectionTouchMove}
                            onMouseDown={(e) => handleSectionPressStart({ id: 'parking', title: 'Mobilità & Posizioni', icon: MapPin, color: 'amber' }, e)}
                            onMouseUp={handleSectionPressEnd}
                            onMouseLeave={handleSectionPressEnd}
                            onContextMenu={(e) => e.preventDefault()}
                            className="bg-[var(--card-bg)] p-6 lg:p-7 rounded-[2.5rem] border border-[var(--border)] hover:border-amber-500/50 shadow-sm hover:shadow-lg transition-all text-left flex items-start gap-4 group active:scale-[0.99] relative overflow-hidden select-none cursor-pointer"
                          >
                            <div className="w-14 h-14 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                              <MapPin className="w-7 h-7" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <h4 className="font-black text-base lg:text-lg text-[var(--text-main)]">Mobilità & Posizioni</h4>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    {hasActiveParking ? 'P Attivo' : 'Posizione'}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                                GPS parcheggio auto, i miei luoghi e navigazione posizioni
                              </p>
                            </div>
                          </button>

                          {/* 8. Medico & Ricette */}
                          <button
                            onClick={() => handleCardClick(() => setIsDoctorOpen(true))}
                            onTouchStart={(e) => handleSectionPressStart({ id: 'doctor', title: 'Medico & Ricette', icon: Stethoscope, color: 'teal' }, e)}
                            onTouchEnd={handleSectionPressEnd}
                            onTouchMove={handleSectionTouchMove}
                            onMouseDown={(e) => handleSectionPressStart({ id: 'doctor', title: 'Medico & Ricette', icon: Stethoscope, color: 'teal' }, e)}
                            onMouseUp={handleSectionPressEnd}
                            onMouseLeave={handleSectionPressEnd}
                            onContextMenu={(e) => e.preventDefault()}
                            className="bg-[var(--card-bg)] p-6 lg:p-7 rounded-[2.5rem] border border-[var(--border)] hover:border-teal-500/50 shadow-sm hover:shadow-lg transition-all text-left flex items-start gap-4 group active:scale-[0.99] relative overflow-hidden select-none cursor-pointer"
                          >
                            <div className="w-14 h-14 rounded-3xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                              <Stethoscope className="w-7 h-7" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <h4 className="font-black text-base lg:text-lg text-[var(--text-main)]">Medico & Ricette</h4>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                                    Live Studio
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                                Orari studio medico in tempo reale, prescrizione farmaci ed esami
                              </p>
                            </div>
                          </button>

                          {/* 9. Testing & Sperimentale */}
                          <button
                            onClick={() => handleCardClick(() => setSelectedType('testing'))}
                            onTouchStart={(e) => handleSectionPressStart({ id: 'testing', title: 'Testing & Nuove Funzioni', icon: FlaskConical, color: 'indigo' }, e)}
                            onTouchEnd={handleSectionPressEnd}
                            onTouchMove={handleSectionTouchMove}
                            onMouseDown={(e) => handleSectionPressStart({ id: 'testing', title: 'Testing & Nuove Funzioni', icon: FlaskConical, color: 'indigo' }, e)}
                            onMouseUp={handleSectionPressEnd}
                            onMouseLeave={handleSectionPressEnd}
                            onContextMenu={(e) => e.preventDefault()}
                            className="bg-[var(--card-bg)] p-6 lg:p-7 rounded-[2.5rem] border border-[var(--border)] hover:border-indigo-500/50 shadow-sm hover:shadow-lg transition-all text-left flex items-start gap-4 group active:scale-[0.99] relative overflow-hidden select-none cursor-pointer"
                          >
                            <div className="w-14 h-14 rounded-3xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                              <FlaskConical className="w-7 h-7" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <h4 className="font-black text-base lg:text-lg text-[var(--text-main)]">Testing</h4>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                                    LAB
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                                Arredamento stanze, disdette & recessi contrattuali e funzioni in test
                              </p>
                            </div>
                          </button>
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
                            onClick={() => { setInitialRecipesCategory(null); setIsRecipesOpen(true); }}
                            className="bg-[var(--card-bg)] p-6 lg:p-8 rounded-[2.5rem] border border-[var(--border)] shadow-sm hover:border-orange-500/50 hover:bg-orange-500/5 transition-all group flex flex-col items-center text-center gap-4 cursor-pointer"
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
                              const existingSupermarket = modules.find(m => m.type === 'supermarket') as import('./types').SupermarketModule;
                              if (existingSupermarket) {
                                setEditingSupermarketModule(existingSupermarket);
                              } else {
                                const newSupermarket: import('./types').SupermarketModule = {
                                  id: generateUUID(),
                                  type: 'supermarket',
                                  title: 'Lista della Spesa',
                                  items: [],
                                  x: (modules.length * 2) % 12,
                                  y: Infinity,
                                  w: 3,
                                  h: 3,
                                  folderId: selectedFolderId || undefined
                                };
                                setModules(prev => {
                                  const updated = [newSupermarket, ...prev];
                                  saveAppState(updated, folders).catch(console.error);
                                  return updated;
                                });
                                setEditingSupermarketModule(newSupermarket);
                              }
                            }}
                            className="bg-[var(--card-bg)] p-6 lg:p-8 rounded-[2.5rem] border border-[var(--border)] shadow-sm hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group flex flex-col items-center text-center gap-4 cursor-pointer"
                          >
                            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                              <ShoppingBasket className="w-8 h-8" />
                            </div>
                            <div>
                              <p className="font-black text-[var(--text-main)] text-lg">Lista della Spesa</p>
                              <p className="text-sm text-[var(--text-muted)] mt-1">Prodotti da acquistare e carrello</p>
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              const existingVolantino = modules.find(m => m.type === 'volantino') as import('./types').VolantinoModule;
                              if (existingVolantino) {
                                setEditingVolantinoModule(existingVolantino);
                              } else {
                                const newVolantino: import('./types').VolantinoModule = {
                                  id: generateUUID(),
                                  type: 'volantino',
                                  title: 'Volantino',
                                  offers: [],
                                  flyers: [],
                                  x: (modules.length * 2) % 12,
                                  y: Infinity,
                                  w: 3,
                                  h: 3,
                                  folderId: selectedFolderId || undefined
                                };
                                setModules(prev => {
                                  const updated = [newVolantino, ...prev];
                                  saveAppState(updated, folders).catch(console.error);
                                  return updated;
                                });
                                setEditingVolantinoModule(newVolantino);
                              }
                            }}
                            className="bg-[var(--card-bg)] p-6 lg:p-8 rounded-[2.5rem] border border-[var(--border)] shadow-sm hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group flex flex-col items-center text-center gap-4 cursor-pointer"
                          >
                            <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                              <BadgePercent className="w-8 h-8" />
                            </div>
                            <div>
                              <p className="font-black text-[var(--text-main)] text-lg">Volantino</p>
                              <p className="text-sm text-[var(--text-muted)] mt-1">Confronta le offerte</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    ) : selectedType === 'testing' ? (
                      <div className="px-4 lg:px-8 pb-32">
                        <h3 className="text-xl font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
                          <FlaskConical className="w-6 h-6 text-indigo-500" />
                          Testing & Funzioni Sperimentali
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            className="bg-[var(--card-bg)] p-6 lg:p-8 rounded-[2.5rem] border border-[var(--border)] shadow-sm hover:border-teal-500/50 hover:bg-teal-500/5 transition-all group flex flex-col items-center text-center gap-4 cursor-pointer"
                          >
                            <div className="w-16 h-16 bg-teal-500/10 text-teal-500 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                              <Armchair className="w-8 h-8" />
                            </div>
                            <div>
                              <p className="font-black text-[var(--text-main)] text-lg">Arredamento</p>
                              <p className="text-sm text-[var(--text-muted)] mt-1">Idee e acquisti per stanze</p>
                            </div>
                          </button>

                          <button
                            onClick={() => setIsRecessoOpen(true)}
                            className="bg-[var(--card-bg)] p-6 lg:p-8 rounded-[2.5rem] border border-[var(--border)] shadow-sm hover:border-rose-500/50 hover:bg-rose-500/5 transition-all group flex flex-col items-center text-center gap-4 cursor-pointer"
                          >
                            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                              <FileSignature className="w-8 h-8" />
                            </div>
                            <div>
                              <p className="font-black text-[var(--text-main)] text-lg">Disdette & Recessi</p>
                              <p className="text-sm text-[var(--text-muted)] mt-1">Generatore disdette PEC legali</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {selectedType === 'split' && (
                          <div className="px-4 lg:px-8 mb-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--card-bg)]/80 backdrop-blur-xl border border-[var(--border)] p-3.5 sm:p-4 rounded-3xl shadow-xs">
                              {/* 3 visible category sub-tabs (+ Tutte) */}
                              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                                <button
                                  onClick={() => setFinanceActiveTab('all')}
                                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border cursor-pointer ${
                                    financeActiveTab === 'all'
                                      ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/20'
                                      : 'bg-[var(--surface-variant)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                  }`}
                                >
                                  <span>📊 Tutte</span>
                                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                    financeActiveTab === 'all' ? 'bg-white/20 text-white' : 'bg-[var(--border)] text-[var(--text-muted)]'
                                  }`}>
                                    {modules.filter(m => (m.type === 'split' || m.type === 'single-expense' || m.type === 'installments') && (!selectedFolderId || m.folderId === selectedFolderId)).length}
                                  </span>
                                </button>

                                <button
                                  onClick={() => setFinanceActiveTab('single')}
                                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border cursor-pointer ${
                                    financeActiveTab === 'single'
                                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20'
                                      : 'bg-[var(--surface-variant)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                  }`}
                                >
                                  <span>💳 Spesa Singola</span>
                                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                    financeActiveTab === 'single' ? 'bg-white/20 text-white' : 'bg-[var(--border)] text-[var(--text-muted)]'
                                  }`}>
                                    {modules.filter(m => m.type === 'single-expense' && (!selectedFolderId || m.folderId === selectedFolderId)).length}
                                  </span>
                                </button>

                                <button
                                  onClick={() => setFinanceActiveTab('split')}
                                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border cursor-pointer ${
                                    financeActiveTab === 'split'
                                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                      : 'bg-[var(--surface-variant)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                  }`}
                                >
                                  <span>👥 Gruppo Spese</span>
                                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                    financeActiveTab === 'split' ? 'bg-white/20 text-white' : 'bg-[var(--border)] text-[var(--text-muted)]'
                                  }`}>
                                    {modules.filter(m => m.type === 'split' && (!selectedFolderId || m.folderId === selectedFolderId)).length}
                                  </span>
                                </button>

                                <button
                                  onClick={() => setFinanceActiveTab('installments')}
                                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border cursor-pointer ${
                                    financeActiveTab === 'installments'
                                      ? 'bg-amber-600 border-amber-600 text-white shadow-md shadow-amber-500/20'
                                      : 'bg-[var(--surface-variant)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                  }`}
                                >
                                  <span>⏳ Rate</span>
                                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                    financeActiveTab === 'installments' ? 'bg-white/20 text-white' : 'bg-[var(--border)] text-[var(--text-muted)]'
                                  }`}>
                                    {modules.filter(m => m.type === 'installments' && (!selectedFolderId || m.folderId === selectedFolderId)).length}
                                  </span>
                                </button>
                              </div>

                              {/* Quick-Action Creation Buttons */}
                              <div className="flex items-center gap-2 shrink-0">
                                {(financeActiveTab === 'all' || financeActiveTab === 'single') && (
                                  <button
                                    onClick={() => {
                                      const doOpen = () => {
                                        setSelectedType('split');
                                        setFormData({ template: 'single-expense', title: 'Spesa Singola', content: '' });
                                        setAutoFormStep(0);
                                        setIsAdding(true);
                                      };
                                      if (!isSensitiveUnlocked) unlockAndProceed(doOpen); else doOpen();
                                    }}
                                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Spesa Singola</span>
                                  </button>
                                )}

                                {(financeActiveTab === 'all' || financeActiveTab === 'split') && (
                                  <button
                                    onClick={() => {
                                      const doOpen = () => {
                                        setSelectedType('split');
                                        setSplitModalTitle('Gruppo Spese');
                                        setSplitModalCurrency('EUR');
                                        setSplitModalBudget('');
                                        setSplitModalParticipants(['', '']);
                                        setShowSplitModal(true);
                                      };
                                      if (!isSensitiveUnlocked) unlockAndProceed(doOpen); else doOpen();
                                    }}
                                    className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Gruppo Spese</span>
                                  </button>
                                )}

                                {(financeActiveTab === 'all' || financeActiveTab === 'installments') && (
                                  <button
                                    onClick={() => {
                                      const doOpen = () => {
                                        setSelectedType('split');
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
                                        setModules(prev => {
                                          const updated = [newInstallments, ...prev];
                                          saveAppState(updated, folders).catch(console.error);
                                          return updated;
                                        });
                                        setEditingInstallmentsModule(newInstallments);
                                      };
                                      if (!isSensitiveUnlocked) unlockAndProceed(doOpen); else doOpen();
                                    }}
                                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Nuova Rata</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {filteredModules.length === 0 ? (
                          selectedType === 'gallery' ? (
                            <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                              <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
                                <ImageIcon className="w-10 h-10 text-indigo-500 opacity-70" />
                              </div>
                              <h3 className="text-2xl font-bold text-[var(--text-main)] mb-2">Nessuna foto in galleria</h3>
                              <p className="text-[var(--text-muted)] mb-8 max-w-sm mx-auto">Usa lo strumento Filtri Immagine per salvare le tue foto qui.</p>
                              <button
                                onClick={() => { setSelectedType(null); setIsToolsOpen(true); setActiveToolId('image-filter'); }}
                                className="flex items-center justify-center gap-3 bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 cursor-pointer"
                              >
                                <ImageIcon className="w-6 h-6" />
                                <span>Apri Filtri Immagine</span>
                              </button>
                            </div>
                          ) : selectedType === 'split' ? (
                            <div className="py-16 flex flex-col items-center justify-center text-center px-4">
                              <div className="w-16 h-16 bg-purple-500/10 text-purple-500 rounded-3xl flex items-center justify-center mb-4">
                                <Wallet className="w-8 h-8" />
                              </div>
                              <h3 className="text-xl font-bold text-[var(--text-main)] mb-1">
                                {financeActiveTab === 'single' ? 'Nessuna spesa singola registrata' :
                                 financeActiveTab === 'split' ? 'Nessun gruppo spese condivise' :
                                 financeActiveTab === 'installments' ? 'Nessun piano rate attivo' :
                                 'Nessuna spesa o conto'}
                              </h3>
                              <p className="text-xs text-[var(--text-muted)] max-w-sm mb-6">
                                {financeActiveTab === 'single' ? 'Traccia subito un acquisto o ricevuta con importo e categoria.' :
                                 financeActiveTab === 'split' ? 'Crea un gruppo con amici o coinquilini per dividere automaticamente le spese.' :
                                 financeActiveTab === 'installments' ? 'Pianifica rate e mutui con date di scadenza e importi.' :
                                 'Inizia a gestire le tue finanze registrando una spesa singola, un gruppo o un piano rate.'}
                              </p>
                              <button
                                onClick={() => {
                                  const doOpen = () => {
                                    if (financeActiveTab === 'split') {
                                      setSplitModalTitle('Gruppo Spese');
                                      setSplitModalCurrency('EUR');
                                      setSplitModalBudget('');
                                      setSplitModalParticipants(['', '']);
                                      setShowSplitModal(true);
                                    } else if (financeActiveTab === 'installments') {
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
                                      setModules(prev => {
                                        const updated = [newInstallments, ...prev];
                                        saveAppState(updated, folders).catch(console.error);
                                        return updated;
                                      });
                                      setEditingInstallmentsModule(newInstallments);
                                    } else {
                                      setFormData({ template: 'single-expense', title: 'Spesa Singola', content: '' });
                                      setAutoFormStep(0);
                                      setIsAdding(true);
                                    }
                                  };
                                  if (!isSensitiveUnlocked) unlockAndProceed(doOpen); else doOpen();
                                }}
                                className="px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-purple-500/20 active:scale-95 cursor-pointer"
                              >
                                <Plus className="w-4 h-4" />
                                <span>
                                  {financeActiveTab === 'split' ? 'Crea Gruppo Spese' :
                                   financeActiveTab === 'installments' ? 'Nuovo Piano Rate' :
                                   'Nuova Spesa Singola'}
                                </span>
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
                                <AutoCard module={module} onDelete={requestDelete} onEdit={openEditModalWithSecurity} onToggleSensitivity={handleToggleModuleSensitivity} />
                              ) : module.type === 'document' ? (
                                <DocumentCard module={module} onDelete={requestDelete} onEdit={openEditModalWithSecurity} onShare={setSharingModule} onToggleSensitivity={handleToggleModuleSensitivity} />
                              ) : module.type === 'split' ? (
                                <SplitCard module={module as import('./types').SplitModule} onDelete={requestDelete} onEdit={openEditModalWithSecurity} onShare={setSharingModule as any} onToggleSensitivity={handleToggleModuleSensitivity} />
                              ) : module.type === 'single-expense' ? (
                                <SingleExpenseCard module={module as import('./types').SingleExpenseModule} onDelete={requestDelete} onEdit={openEditModalWithSecurity} onToggleSensitivity={handleToggleModuleSensitivity} />
                              ) : module.type === 'installments' ? (
                                <InstallmentsCard module={module as import('./types').InstallmentsModule} onDelete={requestDelete} onEdit={openEditModalWithSecurity} onToggleSensitivity={handleToggleModuleSensitivity} />
                              ) : module.type === 'gallery' ? (
                                <GalleryCard module={module as import('./types').GalleryModule} onEdit={openEditModalWithSecurity} onToggleSensitivity={handleToggleModuleSensitivity} />
                              ) : module.type === 'study' ? (
                                <StudyCard module={module} onDelete={requestDelete} onEdit={openEditModalWithSecurity} onToggleSensitivity={handleToggleModuleSensitivity} />
                              ) : module.type === 'fitness' ? (
                                <FitnessCard module={module as import('./types').FitnessModule} onDelete={requestDelete} onEdit={openEditModalWithSecurity} onToggleSensitivity={handleToggleModuleSensitivity} />
                              ) : module.type === 'travel' ? (
                                <TravelCard module={module as import('./types').TravelModule} onDelete={requestDelete} onEdit={openEditModalWithSecurity} onToggleSensitivity={handleToggleModuleSensitivity} />
                              ) : (
                                <GenericCard module={module as import('./types').GenericModule} onDelete={requestDelete} onEdit={openEditModalWithSecurity} onToggleSensitivity={handleToggleModuleSensitivity} />
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            </div>
          )}
        </div>
          
          {/* Global FAB (Only on main dashboard and specific categories except gallery/travel) */}
          {(selectedType !== 'gallery') && !editingTravelModule && !editingStudyModule && !editingFitnessModule && !isAdding && !editingModuleId && !isArchiveOpen && !isToolsOpen && !editingAutoModule && !editingSplitModule && !editingSingleExpenseModule && !editingDocumentModule && !editingGenericModule && !editingFurnitureModule && !editingInstallmentsModule && !editingSupermarketModule && !editingVolantinoModule && (
            <>
              {/* Scan QR Button: solo nelle categorie come tasto discreto e non invasivo */}
              {selectedType && selectedType !== 'home' && selectedType !== 'testing' && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsScanning(true)}
                  className="fixed bottom-24 right-20 md:right-28 md:bottom-10 z-[60] w-10 h-10 md:w-11 md:h-11 bg-[var(--surface-variant)]/90 backdrop-blur-md text-[var(--text-muted)] hover:text-emerald-500 rounded-full shadow-md border border-[var(--border)] flex items-center justify-center transition-all cursor-pointer"
                  title="Scansiona QR"
                >
                  <QrCode className="w-4 h-4 md:w-5 md:h-5" />
                </motion.button>
              )}

              {/* Tasto + solo nelle categorie (NON nella homepage) */}
              {selectedType && selectedType !== 'home' && selectedType !== 'testing' && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (selectedType === 'travel') {
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
                    } else if (selectedType === 'fitness') {
                      const newFitness: import('./types').FitnessModule = {
                        id: generateUUID(),
                        type: 'fitness',
                        title: 'Fitness & Dieta',
                        x: 0, y: 0, w: 3, h: 3,
                        folderId: selectedFolderId || undefined
                      };
                      setModules(prev => {
                        const updated = [newFitness, ...prev];
                        saveAppState(updated, folders).catch(console.error);
                        return updated;
                      });
                      setEditingFitnessModule(newFitness);
                    } else if (selectedType === 'study') {
                      const newStudy: import('./types').StudyModule = {
                        id: generateUUID(),
                        type: 'study',
                        title: 'Percorso di Studio',
                        status: 'wizard',
                        topics: [],
                        x: 0, y: 0, w: 3, h: 3,
                        folderId: selectedFolderId || undefined
                      };
                      setModules(prev => {
                        const updated = [newStudy, ...prev];
                        saveAppState(updated, folders).catch(console.error);
                        return updated;
                      });
                      setEditingStudyModule(newStudy);
                    } else if (selectedType === 'volantino') {
                      const newVolantino: import('./types').VolantinoModule = {
                        id: generateUUID(),
                        type: 'volantino',
                        title: 'Volantini',
                        offers: [],
                        flyers: [],
                        x: 0, y: 0, w: 3, h: 3,
                        folderId: selectedFolderId || undefined
                      };
                      setModules(prev => {
                        const updated = [newVolantino, ...prev];
                        saveAppState(updated, folders).catch(console.error);
                        return updated;
                      });
                      setEditingVolantinoModule(newVolantino);
                    } else if (selectedType === 'split' || selectedType === 'single-expense') {
                      if (financeActiveTab === 'single') {
                        const doOpen = () => {
                          setFormData({ template: 'single-expense', title: 'Spesa Singola', content: '' });
                          setAutoFormStep(0);
                          setIsAdding(true);
                        };
                        if (!isSensitiveUnlocked) unlockAndProceed(doOpen); else doOpen();
                      } else if (financeActiveTab === 'split') {
                        const doOpen = () => {
                          setSplitModalTitle('Gruppo Spese');
                          setSplitModalCurrency('EUR');
                          setSplitModalBudget('');
                          setSplitModalParticipants(['', '']);
                          setShowSplitModal(true);
                        };
                        if (!isSensitiveUnlocked) unlockAndProceed(doOpen); else doOpen();
                      } else if (financeActiveTab === 'installments') {
                        const doOpen = () => {
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
                          setModules(prev => {
                            const updated = [newInstallments, ...prev];
                            saveAppState(updated, folders).catch(console.error);
                            return updated;
                          });
                          setEditingInstallmentsModule(newInstallments);
                        };
                        if (!isSensitiveUnlocked) unlockAndProceed(doOpen); else doOpen();
                      } else {
                        setSpesaSubMenu(true);
                        setIsAdding(true);
                      }
                    } else {
                      setFormData(selectedType ? { template: selectedType } : {});
                      setAutoFormStep(0);
                      setIsAdding(true);
                    }
                  }}
                  className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[60] w-13 h-13 md:w-14 md:h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center border border-white/20 animate-fade-in hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Aggiungi scheda"
                >
                  <Plus className="w-6 h-6" />
                </motion.button>
              )}
            </>
          )}

          {/* Mobile Bottom Navigation Bar - Visible across sections including Chelona AI */}
          {/* Mobile Bottom Navigation (M3 Style - 5 tasti con Chelona AI) */}
          {!isAdding && !isScanning && !editingModuleId && !isArchiveOpen && (
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-[var(--bg)] border-t border-[var(--border)] z-[130] px-2 flex items-center justify-around safe-area-inset-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
              {[
                { 
                  id: 'home', 
                  icon: Home, 
                  label: 'Home', 
                  action: () => { 
                    closeAllEditingModals();
                    setActiveNavTab('home'); 
                    setIsToolsOpen(false); 
                    setIsAiOpen(false);
                    setAiInitialVoiceMode(false);
                    setSelectedType(null); 
                    setIsProfileOpen(false); 
                    setIsSensitiveUnlocked(false);
                  } 
                },
                { 
                  id: 'deadlines', 
                  icon: CalendarClock, 
                  label: 'Scadenze', 
                  badge: urgentDeadlines.length,
                  action: () => { 
                    closeAllEditingModals();
                    setActiveNavTab('deadlines'); 
                    setIsToolsOpen(false); 
                    setIsAiOpen(false);
                    setAiInitialVoiceMode(false);
                    setSelectedType(null); 
                    setIsProfileOpen(false); 
                  } 
                },
                { 
                  id: 'ai', 
                  icon: Sparkles, 
                  label: 'Chelona AI', 
                  action: () => { 
                    closeAllEditingModals();
                    setActiveNavTab('ai'); 
                    setIsAiOpen(true);
                    setAiInitialVoiceMode(false);
                    setIsToolsOpen(false); 
                    setIsProfileOpen(false); 
                    setSelectedType(null); 
                  } 
                },
                { 
                  id: 'tools', 
                  icon: Wrench, 
                  label: 'Strumenti', 
                  action: () => { 
                    closeAllEditingModals();
                    setActiveNavTab('tools'); 
                    setIsToolsOpen(true); 
                    setIsAiOpen(false);
                    setAiInitialVoiceMode(false);
                    setIsProfileOpen(false); 
                    setSelectedType(null); 
                  } 
                },
                { 
                  id: 'profile', 
                  icon: User, 
                  label: 'Profilo', 
                  action: () => { 
                    closeAllEditingModals();
                    setActiveNavTab('profile'); 
                    setIsProfileOpen(true); 
                    setIsSettingsOpen(false);
                    setIsAiOpen(false);
                    setAiInitialVoiceMode(false);
                    setIsToolsOpen(false); 
                    setSelectedType(null); 
                  } 
                }
              ].map(item => {
                const isAiItem = item.id === 'ai';
                const isActive = item.id === 'home' 
                  ? (activeNavTab === 'home' && !isToolsOpen && !isProfileOpen && !isSettingsOpen && !isAiOpen && !selectedType) 
                  : item.id === 'deadlines'
                  ? (activeNavTab === 'deadlines' && !isToolsOpen && !isProfileOpen && !isSettingsOpen && !isAiOpen)
                  : isAiItem
                  ? (isAiOpen || activeNavTab === 'ai')
                  : item.id === 'tools' 
                  ? (isToolsOpen && !isAiOpen)
                  : ((isProfileOpen || isSettingsOpen) && !isAiOpen);

                const pillClasses = isActive
                  ? isAiItem
                    ? 'bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-indigo-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 shadow-sm'
                    : 'bg-[var(--accent-container)] text-[var(--accent-on-container)]'
                  : isAiItem
                  ? 'text-amber-500/80 group-hover:text-amber-500 group-hover:bg-amber-500/10'
                  : 'text-[var(--text-muted)] group-hover:bg-[var(--surface-variant)]';

                const textClasses = isActive
                  ? isAiItem
                    ? 'text-amber-600 dark:text-amber-400 font-black'
                    : 'text-[var(--text-main)] font-black'
                  : 'text-[var(--text-muted)] font-bold';

                return (
                  <button 
                    key={item.id}
                    onClick={item.action}
                    className="flex flex-col items-center gap-1 group flex-1 pb-1 relative"
                  >
                    <div className={`px-3 sm:px-4 py-1.5 rounded-full transition-all duration-300 relative ${pillClasses}`}>
                      <item.icon size={21} strokeWidth={isActive ? 2.5 : 2} />
                      {Boolean(item.badge && item.badge > 0) && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-sm">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] tracking-tight transition-colors whitespace-nowrap ${textClasses}`}>
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
            className={`fixed top-6 left-1/2 z-[10000] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border backdrop-blur-md ${
              toast.type === 'success' ? 'bg-[var(--success-bg)] border-[var(--success)]/30 text-[var(--success)]' :
              toast.type === 'error' ? 'bg-[var(--danger-bg)] border-[var(--danger)]/30 text-[var(--danger)]' :
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
           <motion.div
             initial={{ opacity: 0, y: '100%' }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: '100%' }}
             transition={{ type: 'spring', damping: 25, stiffness: 200 }}
             className="fixed inset-0 z-[200]"
           >
             <RecipesScreen
               onClose={() => {
                 setIsRecipesOpen(false);
                 setInitialRecipesSearch('');
                 setInitialRecipeToOpen(null);
                 setInitialRecipesCategory(null);
               }}
               initialSearchQuery={initialRecipesSearch}
               initialRecipe={initialRecipeToOpen}
               initialCategory={initialRecipesCategory}
               onAddToShoppingList={handleAddItemsToShoppingList}
             />
           </motion.div>
         )}
          {isAddressAndParkingOpen && (
            <React.Suspense fallback={<div className="flex items-center justify-center p-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
              <AddressAndParkingScreen 
                initialTab={addressParkingTab} 
                initialAutoSave={addressParkingAutoSave}
                onClose={() => {
                  setIsAddressAndParkingOpen(false);
                  setAddressParkingAutoSave(false);
                }} 
                showToast={showToast} 
              />
            </React.Suspense>
          )}
          {isAddressBookOpen && (
            <React.Suspense fallback={<div className="flex items-center justify-center p-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
              <AddressAndParkingScreen initialTab="addresses" onClose={() => setIsAddressBookOpen(false)} showToast={showToast} />
            </React.Suspense>
          )}
          {isParkingOpen && (
            <React.Suspense fallback={<div className="flex items-center justify-center p-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
              <AddressAndParkingScreen initialTab="parking" onClose={() => setIsParkingOpen(false)} showToast={showToast} />
            </React.Suspense>
          )}
          {isDoctorOpen && (
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[200]"
            >
              <React.Suspense fallback={<div className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--bg)]"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <DoctorScreen
                  onClose={() => setIsDoctorOpen(false)}
                  showToast={showToast}
                  defaultPatientName={username}
                  defaultPatientFiscalCode={(modules.find(m => m.type === 'document' && (m as DocumentModule).documentType === 'tax_code') as DocumentModule | undefined)?.number || ''}
                />
              </React.Suspense>
            </motion.div>
          )}
          {isRecessoOpen && (
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[200]"
            >
              <React.Suspense fallback={<div className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--bg)]"><div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <RecessoScreen
                  onClose={() => setIsRecessoOpen(false)}
                  showToast={showToast}
                  defaultUserName={username}
                  defaultUserFiscalCode={(modules.find(m => m.type === 'document' && (m as DocumentModule).documentType === 'tax_code') as DocumentModule | undefined)?.number || ''}
                  onSaveToSandbox={handleSaveToSandbox}
                />
              </React.Suspense>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Indicatore globale download AI in background */}


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
                      onClick={() => {
                        updateService.snoozeUpdate(availableUpdate.latestVersion, 24);
                        setAvailableUpdate(null);
                      }}
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
      <React.Suspense fallback={null}>
      <AnimatePresence>
        {editingAutoModule && (
          <AutoManagementScreen 
            module={editingAutoModule} 
            onSave={handleSaveAutoEdit} 
            onAutoSave={(updated) => {
              updateModuleDirect(updated);
              setEditingAutoModule(updated);
            }}
            onCancel={() => {
              setEditingAutoModule(null);
              if (!selectedType || selectedType === 'home') setIsSensitiveUnlocked(false);
            }} 
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
            onClose={() => {
              setEditingSplitModule(null);
              if (!selectedType || selectedType === 'home') setIsSensitiveUnlocked(false);
            }}
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
        {editingFitnessModule && (
          <FitnessScreen
            module={editingFitnessModule}
            onSave={(updated) => {
              updateModuleDirect(updated);
              setEditingFitnessModule(updated);
            }}
            onClose={() => setEditingFitnessModule(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingSingleExpenseModule && (
          <SingleExpenseScreen
            module={editingSingleExpenseModule}
            onSave={(updated) => {
              setModules(prev => {
                const updatedModules = prev.map(m => m.id === updated.id ? updated : m);
                saveAppState(updatedModules, folders).catch(console.error);
                return updatedModules;
              });
              setEditingSingleExpenseModule(null);
            }}
            onClose={() => {
              setEditingSingleExpenseModule(null);
              if (!selectedType || selectedType === 'home') setIsSensitiveUnlocked(false);
            }}
            onDelete={deleteModule}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingInstallmentsModule && (
          <InstallmentsScreen
            module={editingInstallmentsModule}
            onSave={(updated) => {
              setModules(prev => {
                const updatedModules = prev.map(m => m.id === updated.id ? updated : m);
                saveAppState(updatedModules, folders).catch(console.error);
                return updatedModules;
              });
              setEditingInstallmentsModule(null);
            }}
            onClose={() => {
              const currentModule = modules.find(m => m.id === editingInstallmentsModule.id) as import('./types').InstallmentsModule;
              if (currentModule && currentModule.targetAmount === 0 && (!currentModule.payments || currentModule.payments.length === 0)) {
                 deleteModule(editingInstallmentsModule.id);
              }
              setEditingInstallmentsModule(null);
              if (!selectedType || selectedType === 'home') setIsSensitiveUnlocked(false);
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
            onCancel={() => {
              setEditingDocumentModule(null);
              if (!selectedType || selectedType === 'home') setIsSensitiveUnlocked(false);
            }}
            onDelete={deleteModule}
            onShare={setSharingModule as any}
            showToast={showToast}
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

        {/* Modale Conferma Creazione App da Sezione (Long Press) */}
        {shortcutPromptSection && (
          <div 
            className="fixed inset-0 z-[1000] flex items-center justify-center p-6"
            onClick={() => setShortcutPromptSection(null)}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm bg-[var(--card-bg)] rounded-[2.5rem] p-7 sm:p-8 shadow-2xl border border-[var(--border)] text-center flex flex-col items-center"
            >
              <div className="w-18 h-18 rounded-3xl bg-[var(--surface-variant)] border border-[var(--border)] flex items-center justify-center text-indigo-500 mb-4 shadow-inner relative group">
                {React.createElement(shortcutPromptSection.icon, { className: "w-9 h-9" })}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
              </div>

              <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 mb-2">
                Applicazione Indipendente
              </span>

              <h3 className="text-xl font-black text-[var(--text-main)] mb-1">
                Salva come App
              </h3>

              <p className="text-sm font-bold text-indigo-500 dark:text-indigo-400 mb-2">
                {shortcutPromptSection.title}
              </p>

              <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-6 px-1">
                Vuoi creare una vera app autonoma sulla schermata principale del tuo telefono per accedere direttamente a <strong>{shortcutPromptSection.title}</strong>?
              </p>

              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setShortcutPromptSection(null)}
                  className="flex-1 py-3.5 bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-2xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const target = shortcutPromptSection;
                    setShortcutPromptSection(null);
                    try {
                      const { createSectionShortcut } = await import('./services/shortcutService');
                      const res = await createSectionShortcut(target.id);
                      showToast(res.message, res.success ? 'success' : 'info');
                    } catch (err) {
                      showToast('Errore durante la creazione dell\'app', 'error');
                    }
                  }}
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-2xl font-bold text-xs transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Salva come App</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </React.Suspense>

      {/* Gemma 2 AI Setup Overlay */}
      {showGemma2Setup && (
        <React.Suspense fallback={null}>
          <Gemma2SetupScreen
            onClose={() => setShowGemma2Setup(false)}
            showToast={showToast}
            modules={modules}
            username={username}
          />
        </React.Suspense>
      )}

      </div>
      </React.Suspense>
    </ErrorBoundary>
    </div>
  );
}
