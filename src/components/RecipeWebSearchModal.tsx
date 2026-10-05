import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, Globe, Sparkles, Clock, Flame, ChefHat, Plus, Check, 
  CheckCircle2, ExternalLink, BookmarkCheck, Loader2, ChevronDown, 
  Play, Pause, RotateCcw, ShoppingCart, ArrowLeft, AlertCircle, 
  CheckSquare, Square, Timer, RefreshCw
} from 'lucide-react';
import { 
  searchWebRecipes,
  enrichRecipeDetail,
  enrichRecipesWithProgress,
  saveUserRecipe,
  saveUserRecipes,
  loadUserRecipes,
  formatSourceBadge,
  type UserRecipeItem 
} from '../services/userRecipesService';

const FALLBACK_RECIPE_IMAGE = 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800';


const COURSE_FILTERS = [
  { id: 'ALL', label: 'Tutte le Portate', emoji: '🍽️' },
  { id: 'Antipasti', label: 'Antipasti', emoji: '🥗' },
  { id: 'Primi', label: 'Primi', emoji: '🍝' },
  { id: 'Secondi', label: 'Secondi', emoji: '🥩' },
  { id: 'Contorni', label: 'Contorni', emoji: '🥦' },
  { id: 'Dolci', label: 'Dolci', emoji: '🍰' },
];

const COUNTRY_FILTERS = [
  { code: 'ALL', name: 'Tutti i Paesi', flag: '🌐' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹' },
  { code: 'JP', name: 'Giappone', flag: '🇯🇵' },
  { code: 'MX', name: 'Messico', flag: '🇲🇽' },
  { code: 'ES', name: 'Spagna', flag: '🇪🇸' },
  { code: 'US', name: 'USA', flag: '🇺🇸' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'GR', name: 'Grecia', flag: '🇬🇷' },
  { code: 'CN', name: 'Cina', flag: '🇨🇳' },
];

const POPULAR_SUGGESTIONS = [
  { label: 'Primi Piatti', query: 'primi piatti', emoji: '🍝' },
  { label: 'Dolci Veloci', query: 'dolci veloci', emoji: '🍰' },
  { label: 'Secondi', query: 'secondi', emoji: '🥩' },
  { label: 'Pasta al Forno', query: 'pasta al forno', emoji: '🥘' },
  { label: 'Zucchine', query: 'zucchine', emoji: '🥒' },
  { label: 'Pollo', query: 'pollo', emoji: '🍗' },
  { label: 'Senza Glutine', query: 'senza glutine', emoji: '🌾' },
  { label: 'Vegetariano', query: 'vegetariano', emoji: '🥗' },
  { label: 'Pizza', query: 'pizza', emoji: '🍕' },
  { label: 'Tiramisù', query: 'tiramisu', emoji: '☕' },
];

interface RecipeWebSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onRecipeSaved?: (recipe: UserRecipeItem) => void;
  onAddToShoppingList?: (items: { name: string; quantity?: string; category?: string }[]) => void;
}

/**
 * Scala le dosi di un ingrediente mantenendo formattazione sia con quantità iniziale ("320 g pasta")
 * che con quantità finale ("Spaghetti 320 g", "Guanciale 150 g", "Uova (medie) 6").
 */
export function formatScaledIngredient(raw: string, ratio: number): string {
  if (ratio === 1 || !raw) return raw;

  const scaleNum = (n: number) => {
    const val = Math.round(n * ratio * 10) / 10;
    return val % 1 === 0 ? String(val) : val.toFixed(1).replace('.0', '');
  };

  // Formato 1: Numero all'inizio (es. "320 g di pasta", "2 cucchiai", "4 uova")
  const leadingMatch = raw.match(/^([\d.,]+)(\s*(?:g|kg|ml|cl|l|cucchiai[o]?|cucchiain[io]?|pizzic[ohi]|bustin[ae]|fogl?i[ae]|fett[ae]|spicchi[o]?|gocce)?\b.*)$/i);
  if (leadingMatch && !isNaN(parseFloat(leadingMatch[1].replace(',', '.')))) {
    const orig = parseFloat(leadingMatch[1].replace(',', '.'));
    return `${scaleNum(orig)}${leadingMatch[2]}`;
  }

  // Formato 2: Nome/testo prima, poi numero e unità opzionale alla fine (es. "Spaghetti 320 g", "Guanciale 150 g")
  const trailingMatch = raw.match(/^(.*?\b)\s*([\d.,]+)\s*([a-zA-Z%]+)?$/);
  if (trailingMatch && !isNaN(parseFloat(trailingMatch[2].replace(',', '.')))) {
    const prefix = trailingMatch[1].trim();
    const orig = parseFloat(trailingMatch[2].replace(',', '.'));
    const unit = trailingMatch[3] ? ` ${trailingMatch[3]}` : '';
    return `${prefix} ${scaleNum(orig)}${unit}`.trim();
  }

  return raw;
}

export function RecipeWebSearchModal({
  isOpen,
  onClose,
  initialQuery,
  onRecipeSaved,
  onAddToShoppingList,
}: RecipeWebSearchModalProps) {
  const [searchInput, setSearchInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [recipes, setRecipes] = useState<UserRecipeItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>('ALL');
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>('ALL');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtro ricette per Portata e Paese di Origine (Requisito 5)
  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      const matchCourse = selectedCourse === 'ALL' || r.category === selectedCourse;
      const matchCountry = selectedCountryFilter === 'ALL' || (r.country && r.country.toLowerCase() === selectedCountryFilter.toLowerCase());
      return matchCourse && matchCountry;
    });
  }, [recipes, selectedCourse, selectedCountryFilter]);

  // Multi-selezione per importazione massiva
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isBatchImporting, setIsBatchImporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; title: string } | null>(null);

  // Tracciamento ricette già salvate nel Ricettario (URL normalizzati e titoli)
  const [savedUrls, setSavedUrls] = useState<Set<string>>(() => {
    const list = loadUserRecipes();
    const set = new Set<string>();
    for (const r of list) {
      if (r.sourceUrl) {
        set.add(r.sourceUrl);
        set.add(r.sourceUrl.replace(/\/+$/, ''));
      }
      if (r.title) {
        set.add(r.title.toLowerCase().trim());
      }
    }
    return set;
  });

  // Modal anteprima interattiva
  const [previewRecipe, setPreviewRecipe] = useState<UserRecipeItem | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewServings, setPreviewServings] = useState<number>(4);
  const [selectedPreviewIngredients, setSelectedPreviewIngredients] = useState<Set<string>>(new Set());
  const [cartSuccessNotice, setCartSuccessNotice] = useState(false);

  // Timer per i passaggi di preparazione nell'anteprima
  const [stepTimers, setStepTimers] = useState<Record<number, {
    totalSeconds: number;
    remainingSeconds: number;
    isRunning: boolean;
    isFinished: boolean;
  }>>({});

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // Aggiorna stato ricette salvate all'apertura o su eventi globali
  const refreshSavedStatus = useCallback(() => {
    const list = loadUserRecipes();
    const set = new Set<string>();
    for (const r of list) {
      if (r.sourceUrl) {
        set.add(r.sourceUrl);
        set.add(r.sourceUrl.replace(/\/+$/, ''));
      }
      if (r.title) {
        set.add(r.title.toLowerCase().trim());
      }
    }
    setSavedUrls(set);
  }, []);

  useEffect(() => {
    if (isOpen) {
      refreshSavedStatus();
    }
  }, [isOpen, refreshSavedStatus]);

  useEffect(() => {
    const handleSync = () => refreshSavedStatus();
    window.addEventListener('chelona_user_recipes_updated', handleSync);
    return () => window.removeEventListener('chelona_user_recipes_updated', handleSync);
  }, [refreshSavedStatus]);

  // Gestione tasto ESC e Android hardware back button
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewRecipe) {
          setPreviewRecipe(null);
        } else {
          onClose();
        }
      }
    };

    const handleRecipesBack = (e: Event) => {
      if (previewRecipe) {
        // Intercetta e chiudi solo l'anteprima senza chiudere tutta la ricerca web
        e.stopImmediatePropagation();
        setPreviewRecipe(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('recipes-back', handleRecipesBack, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('recipes-back', handleRecipesBack, true);
    };
  }, [isOpen, previewRecipe, onClose]);

  // Audio Chime per fine timer
  const playTimerChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
      osc.start();
      osc.stop(ctx.currentTime + 0.9);
    } catch {
      // Ignora su ambienti senza audio
    }
  }, []);

  // Ticking dei timer
  useEffect(() => {
    const hasRunning = Object.values(stepTimers).some(t => t.isRunning);
    if (!hasRunning) return;

    const interval = setInterval(() => {
      setStepTimers(prev => {
        let changed = false;
        const next = { ...prev };
        for (const [key, timer] of Object.entries(prev)) {
          const idx = Number(key);
          if (timer.isRunning) {
            changed = true;
            if (timer.remainingSeconds <= 1) {
              next[idx] = {
                ...timer,
                remainingSeconds: 0,
                isRunning: false,
                isFinished: true,
              };
              playTimerChime();
            } else {
              next[idx] = {
                ...timer,
                remainingSeconds: timer.remainingSeconds - 1,
              };
            }
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [stepTimers, playTimerChime]);

  const extractTimerSeconds = (text: string): number | null => {
    const clean = text.replace(/<[^>]+>/g, ' ');
    const hourMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:ora|ore|h)\b/i);
    if (hourMatch) {
      const h = parseFloat(hourMatch[1].replace(',', '.'));
      if (!isNaN(h) && h > 0) return Math.round(h * 3600);
    }
    const minRangeMatch = clean.match(/(\d+)\s*(?:-|a|–)\s*(\d+)\s*(?:minuti|minuto|min)\b/i);
    if (minRangeMatch) {
      const m = parseInt(minRangeMatch[2], 10);
      if (!isNaN(m) && m > 0) return m * 60;
    }
    const minMatch = clean.match(/(\d+)\s*(?:minuti|minuto|min)\b/i);
    if (minMatch) {
      const m = parseInt(minMatch[1], 10);
      if (!isNaN(m) && m > 0) return m * 60;
    }
    const secMatch = clean.match(/(\d+)\s*(?:secondi|secondo|sec)\b/i);
    if (secMatch) {
      const s = parseInt(secMatch[1], 10);
      if (!isNaN(s) && s > 0) return s;
    }
    return null;
  };

  const handleStartTimer = (stepIdx: number, duration: number) => {
    setStepTimers(prev => {
      const curr = prev[stepIdx];
      return {
        ...prev,
        [stepIdx]: {
          totalSeconds: duration,
          remainingSeconds: curr && curr.remainingSeconds > 0 ? curr.remainingSeconds : duration,
          isRunning: true,
          isFinished: false,
        }
      };
    });
  };

  const handlePauseTimer = (stepIdx: number) => {
    setStepTimers(prev => {
      const curr = prev[stepIdx];
      if (!curr) return prev;
      return {
        ...prev,
        [stepIdx]: {
          ...curr,
          isRunning: false,
        }
      };
    });
  };

  const handleResetTimer = (stepIdx: number, duration: number) => {
    setStepTimers(prev => ({
      ...prev,
      [stepIdx]: {
        totalSeconds: duration,
        remainingSeconds: duration,
        isRunning: false,
        isFinished: false,
      }
    }));
  };

  const formatTimerDisplay = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Esecuzione Ricerca
  const executeSearch = async (term: string, page = 1) => {
    const cleanTerm = term.trim();
    if (!cleanTerm) return;

    try {
      if (page === 1) {
        setIsLoading(true);
        setRecipes([]);
        setSelectedIndices(new Set());
      } else {
        setIsLoadingMore(true);
      }
      setErrorMessage(null);

      const result = await searchWebRecipes(cleanTerm, page);

      if (page === 1) {
        setRecipes(result.recipes);
      } else {
        // Unisci rimuovendo eventuali duplicati di pagina
        setRecipes(prev => {
          const seen = new Set(prev.map(r => r.sourceUrl || r.title));
          const newOnes = result.recipes.filter(r => !seen.has(r.sourceUrl || r.title));
          return [...prev, ...newOnes];
        });
      }

      setCurrentPage(result.currentPage);
      setHasNextPage(result.hasNextPage);
      setActiveQuery(cleanTerm);
    } catch (err: any) {
      console.error('[RecipeWebSearchModal] Errore ricerca:', err);
      setErrorMessage(err.message || 'Impossibile completare la ricerca online. Riprova tra poco.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (isOpen && initialQuery && initialQuery.trim() && !activeQuery) {
      const q = initialQuery.trim();
      setSearchInput(q);
      executeSearch(q, 1);
    }
  }, [isOpen, initialQuery]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchInput.trim()) return;
    executeSearch(searchInput, 1);
  };

  const handleSuggestionClick = (query: string) => {
    setSearchInput(query);
    executeSearch(query, 1);
  };

  const handleLoadMore = () => {
    if (isLoadingMore || !hasNextPage) return;
    executeSearch(activeQuery, currentPage + 1);
  };

  const isAlreadySaved = useCallback((recipe: UserRecipeItem) => {
    if (recipe.sourceUrl && savedUrls.has(recipe.sourceUrl)) return true;
    if (savedUrls.has(recipe.title.toLowerCase().trim())) return true;
    return false;
  }, [savedUrls]);

  // Apertura anteprima ricetta completa
  const handleOpenPreview = async (recipe: UserRecipeItem) => {
    setPreviewRecipe(recipe);
    setPreviewServings(recipe.servings || 4);
    setSelectedPreviewIngredients(new Set(recipe.ingredients || []));
    setCartSuccessNotice(false);
    setStepTimers({});

    // Se mancano ancora ingredienti o passaggi, arricchisci subito in background
    if (recipe.sourceUrl && (!recipe.ingredients?.length || !recipe.steps?.length)) {
      setIsPreviewLoading(true);
      try {
        const enriched = await enrichRecipeDetail(recipe, 8000);
        setPreviewRecipe(enriched);
        setPreviewServings(enriched.servings || 4);
        setSelectedPreviewIngredients(new Set(enriched.ingredients || []));
        // Aggiorna anche la scheda nella griglia dei risultati per evitare ri-arricchimenti
        setRecipes(prev => prev.map(r => (r.sourceUrl === enriched.sourceUrl || r.id === enriched.id) ? enriched : r));
      } catch (e) {
        console.warn('Errore arricchimento preview:', e);
      } finally {
        setIsPreviewLoading(false);
      }
    }
  };

  // Salvataggio 1-tap singola ricetta
  const handleSaveRecipe = async (recipe: UserRecipeItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isAlreadySaved(recipe)) {
      showToast(`"${recipe.title}" è già presente nel tuo Ricettario.`);
      return;
    }

    try {
      // Arricchisci se necessario per assicurare ingredienti e passaggi completi
      let fullRecipe = recipe;
      if (recipe.sourceUrl && (!recipe.ingredients?.length || !recipe.steps?.length)) {
        fullRecipe = await enrichRecipeDetail(recipe, 7000);
      }

      const saved = saveUserRecipe({
        ...fullRecipe,
        isCustom: true,
      });

      refreshSavedStatus();
      setRecipes(prev => prev.map(r => (r.sourceUrl === saved.sourceUrl || r.id === recipe.id) ? saved : r));
      if (previewRecipe && (previewRecipe.id === recipe.id || previewRecipe.sourceUrl === recipe.sourceUrl)) {
        setPreviewRecipe(saved);
      }
      onRecipeSaved?.(saved);
      showToast(`✓ "${saved.title}" salvata nel tuo Ricettario!`);
    } catch (err: any) {
      console.error('Errore salvataggio ricetta:', err);
      showToast('Errore durante il salvataggio della ricetta.');
    }
  };

  // Selezione multipla
  const handleToggleSelectIndex = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIndices(new Set(recipes.map((_, i) => i)));
  };

  const handleDeselectAll = () => {
    setSelectedIndices(new Set());
  };

  // Importazione multipla
  const handleBatchImport = async () => {
    if (selectedIndices.size === 0) return;
    const selectedList = Array.from(selectedIndices).map(idx => recipes[idx]).filter(Boolean);
    
    setIsBatchImporting(true);
    setBatchProgress({ current: 0, total: selectedList.length, title: 'Avvio arricchimento...' });

    try {
      const enrichedList = await enrichRecipesWithProgress(
        selectedList,
        (current, total, title) => {
          setBatchProgress({ current, total, title });
        },
        7000
      );

      const savedBatch = saveUserRecipes(enrichedList.map(r => ({ ...r, isCustom: true })));
      refreshSavedStatus();
      setRecipes(prev => prev.map(r => savedBatch.find(s => s.sourceUrl === r.sourceUrl) || r));
      setSelectedIndices(new Set());
      showToast(`🎉 ${enrichedList.length} ricette salvate con successo nel tuo Ricettario!`);
    } catch (err: any) {
      console.error('Errore importazione batch:', err);
      showToast('Errore durante l\'importazione di alcune ricette.');
    } finally {
      setIsBatchImporting(false);
      setBatchProgress(null);
    }
  };

  // Aggiunta ingredienti alla lista spesa dall'anteprima
  const handleAddIngredientsToCart = () => {
    if (!previewRecipe || selectedPreviewIngredients.size === 0 || !onAddToShoppingList) return;

    const baseServings = previewRecipe.servings || 4;
    const ratio = previewServings / baseServings;

    const itemsToAdd = Array.from(selectedPreviewIngredients).map(raw => {
      const formatted = formatScaledIngredient(raw, ratio);
      return {
        name: formatted,
        category: 'Alimentari',
      };
    });

    onAddToShoppingList(itemsToAdd);
    setCartSuccessNotice(true);
    setTimeout(() => setCartSuccessNotice(false), 3000);
    showToast(`🛒 ${itemsToAdd.length} ingredienti aggiunti alla Lista della Spesa!`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)] overflow-hidden font-sans">
      {/* HEADER PRINCIPALE */}
      <header className="h-16 sm:h-20 bg-[var(--surface)] border-b border-[var(--border)] px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            title="Chiudi ricerca online"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[var(--text-main)] leading-tight flex items-center gap-2">
                <span>Cerca Ricette Online</span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Ricette Web
                </span>
              </h2>
              <p className="text-xs text-[var(--text-muted)] hidden sm:block">
                Catalogo web in tempo reale con ingredienti, passaggi e timer
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* ZONA DI RICERCA & SUGGERIMENTI RAPIDI */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)] px-4 sm:px-6 py-4 shrink-0 shadow-xs z-10 space-y-3">
        <form onSubmit={handleSearchSubmit} className="max-w-4xl mx-auto flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cerca qualsiasi ricetta (es. Carbonara, Torta di Mele, Tacos, Sushi, Ramen)..."
              className="w-full bg-[var(--surface-variant)] border border-[var(--border)] focus:border-emerald-500 rounded-2xl py-3 pl-11 pr-10 text-sm sm:text-base text-[var(--text-main)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!searchInput.trim() || isLoading}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-sm shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5 shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="hidden sm:inline">Cerca</span>
          </button>
        </form>

        {/* CHIP SUGGERIMENTI RAPIDI */}
        <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Popolari:
          </span>
          {POPULAR_SUGGESTIONS.map((sug) => {
            const isActive = activeQuery.toLowerCase() === sug.query.toLowerCase();
            return (
              <button
                key={sug.query}
                type="button"
                onClick={() => handleSuggestionClick(sug.query)}
                className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border active:scale-95 ${
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-[var(--surface-variant)] hover:bg-emerald-500/10 text-[var(--text-main)] hover:text-emerald-600 border-[var(--border)]'
                }`}
              >
                <span>{sug.emoji}</span>
                <span>{sug.label}</span>
              </button>
            );
          })}
        </div>

        {/* FILTRI PORTATA & PAESE DI ORIGINE (Punto 5) */}
        {recipes.length > 0 && (
          <div className="max-w-4xl mx-auto pt-1 space-y-2 border-t border-[var(--border)]/60">
            {/* Filtro Portata */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] shrink-0">Portata:</span>
              {COURSE_FILTERS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCourse(c.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                    selectedCourse === c.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <span>{c.emoji}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>

            {/* Filtro Paese */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
              <span className="text-[10px] font-black uppercase text-[var(--text-muted)] shrink-0">Origine:</span>
              {COUNTRY_FILTERS.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setSelectedCountryFilter(c.code === 'ALL' ? 'ALL' : c.name)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                    (c.code === 'ALL' && selectedCountryFilter === 'ALL') || selectedCountryFilter.toLowerCase() === c.name.toLowerCase()
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <span>{c.flag}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* BARRA AZIONI MULTI-SELEZIONE (quando ci sono ricette selezionate) */}
      <AnimatePresence>
        {recipes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-emerald-500/5 border-b border-emerald-500/20 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-[var(--text-main)]">
                {recipes.length} ricette trovate {activeQuery ? `per "${activeQuery}"` : ''}
              </span>
              <div className="h-3 w-px bg-[var(--border)]" />
              {selectedIndices.size > 0 ? (
                <span className="font-bold text-emerald-600 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                  {selectedIndices.size} selezionate
                </span>
              ) : (
                <span className="text-[var(--text-muted)]">
                  Seleziona per importare in blocco
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedIndices.size < recipes.length ? (
                <button
                  onClick={handleSelectAll}
                  className="font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  Seleziona tutte
                </button>
              ) : (
                <button
                  onClick={handleDeselectAll}
                  className="font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  Deseleziona
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTENUTO PRINCIPALE / GRIGLIA RISULTATI */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* STATO ERRORE */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 flex items-start gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">{errorMessage}</p>
                <button
                  onClick={() => executeSearch(activeQuery || searchInput, currentPage)}
                  className="mt-2 text-xs font-black underline hover:opacity-80 cursor-pointer"
                >
                  Riprova
                </button>
              </div>
            </div>
          )}

          {/* STATO INIZIALE (Nessuna ricerca ancora effettuata) */}
          {!isLoading && recipes.length === 0 && !activeQuery && (
            <div className="text-center py-16 sm:py-24 max-w-md mx-auto space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <Globe className="w-10 h-10 animate-pulse" />
              </div>
              <h3 className="text-xl font-black text-[var(--text-main)]">
                Esplora le migliori ricette dal Web
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Cerca piatti della tradizione italiana, dolci, secondi o piatti esotici dal catalogo di 
                <strong className="text-[var(--text-main)]"> Ricette Web</strong>.
                Tocca un piatto per visualizzare passaggi e ingredienti, o salvalo con un tap nel tuo Ricettario.
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-2">
                {POPULAR_SUGGESTIONS.slice(0, 4).map(s => (
                  <button
                    key={s.query}
                    onClick={() => handleSuggestionClick(s.query)}
                    className="px-3.5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-emerald-500 text-xs font-bold text-[var(--text-main)] transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <span>{s.emoji}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STATO NESSUN RISULTATO */}
          {!isLoading && recipes.length === 0 && activeQuery && (
            <div className="text-center py-16 max-w-md mx-auto space-y-3">
              <div className="w-16 h-16 rounded-full bg-[var(--surface-variant)] text-[var(--text-muted)] mx-auto flex items-center justify-center">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-[var(--text-main)]">
                Nessuna ricetta trovata per "{activeQuery}"
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Prova con un termine più generale (es. "pasta", "risotto", "torta") o seleziona uno dei suggerimenti rapidi in alto.
              </p>
            </div>
          )}

          {/* CARICAMENTO INIZIALE (SKELETON) */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div 
                  key={i} 
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs animate-pulse"
                >
                  <div className="aspect-4/3 bg-[var(--surface-variant)]" />
                  <div className="p-4 space-y-2.5">
                    <div className="h-4 bg-[var(--surface-variant)] rounded-md w-3/4" />
                    <div className="h-3 bg-[var(--surface-variant)] rounded-md w-1/2" />
                    <div className="pt-2 flex justify-between">
                      <div className="h-3 bg-[var(--surface-variant)] rounded-md w-1/4" />
                      <div className="h-3 bg-[var(--surface-variant)] rounded-md w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* GRIGLIA SCHEDE RICETTA */}
          {!isLoading && filteredRecipes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRecipes.map((recipe, index) => {
                const isSelected = selectedIndices.has(index);
                const isSaved = isAlreadySaved(recipe);

                return (
                  <motion.div
                    key={`${recipe.sourceUrl || recipe.id}_${index}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                    onClick={() => handleOpenPreview(recipe)}
                    className={`group relative rounded-2xl bg-[var(--surface)] border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md cursor-pointer flex flex-col ${
                      isSelected 
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20' 
                        : 'border-[var(--border)] hover:border-emerald-500/40'
                    }`}
                  >
                    {/* Immagine Ricetta con Overlay e Checkbox */}
                    <div className="relative aspect-4/3 overflow-hidden bg-[var(--surface-variant)]">
                      <img
                        src={recipe.image || FALLBACK_RECIPE_IMAGE}
                        alt={recipe.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_RECIPE_IMAGE;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                      {/* Checkbox multi-selezione */}
                      <button
                        onClick={(e) => handleToggleSelectIndex(index, e)}
                        className={`absolute top-2.5 left-2.5 p-1 rounded-lg backdrop-blur-md transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-black/40 text-white/80 hover:bg-black/60'
                        }`}
                        title={isSelected ? 'Deseleziona' : 'Seleziona'}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>

                      {/* Badge Sorgente e Sito (Punto 4) */}
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1 border border-white/15 shadow-xs">
                        {formatSourceBadge(recipe.sourceName, recipe.sourceUrl)}
                      </span>

                      {/* Categoria & Paese di Origine (Punto 5) */}
                      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                        {recipe.category && (
                          <span className="px-2 py-0.5 rounded-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wide shadow-xs">
                            {recipe.category}
                          </span>
                        )}
                        {recipe.country && (
                          <span className="px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1 shadow-xs border border-white/10">
                            <span>{recipe.flag || '🌍'}</span>
                            <span>{recipe.country}</span>
                          </span>
                        )}
                      </div>

                      {/* Già Salvato Badge */}
                      {isSaved && (
                        <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black flex items-center gap-1 shadow-sm">
                          <Check className="w-3 h-3" />
                          Nel Ricettario
                        </span>
                      )}
                    </div>

                    {/* Dettagli Ricetta */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h4 className="font-bold text-sm text-[var(--text-main)] line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors">
                          {recipe.title}
                        </h4>
                      </div>

                      {/* Metadati: Difficoltà, Tempo, Calorie */}
                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center flex-wrap gap-2 text-[11px] text-[var(--text-muted)] font-bold">
                          {recipe.prepTimeMinutes ? (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              {recipe.prepTimeMinutes} min
                            </span>
                          ) : null}

                          {recipe.difficulty ? (
                            <span className="flex items-center gap-1">
                              <ChefHat className="w-3.5 h-3.5 text-emerald-500" />
                              {recipe.difficulty}
                            </span>
                          ) : null}

                          {recipe.calories ? (
                            <span className="flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5 text-rose-500" />
                              {recipe.calories} kcal
                            </span>
                          ) : null}

                          {!recipe.prepTimeMinutes && !recipe.difficulty && !recipe.calories && (
                            <span className="flex items-center gap-1 text-[var(--text-muted)]">
                              <ChefHat className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Ricetta web</span>
                            </span>
                          )}
                        </div>

                        {/* Pulsante 1-tap Salva / Anteprima */}
                        <div className="flex items-center gap-2 pt-1 border-t border-[var(--border)]">
                          <button
                            onClick={(e) => handleSaveRecipe(recipe, e)}
                            className={`flex-1 py-1.5 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                              isSaved
                                ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25'
                                : 'bg-[var(--surface-variant)] hover:bg-emerald-600 hover:text-white text-[var(--text-main)] border border-[var(--border)]'
                            }`}
                          >
                            {isSaved ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Salvata</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Salva</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleOpenPreview(recipe)}
                            className="py-1.5 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 font-bold text-xs transition-colors cursor-pointer"
                            title="Apri scheda dettagliata ricetta"
                          >
                            Dettagli
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* PULSANTE CARICA ALTRE RICETTE (PAGINAZIONE) */}
          {hasNextPage && !isLoading && (
            <div className="pt-4 pb-12 text-center">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-variant)] border border-[var(--border)] hover:border-emerald-500 text-[var(--text-main)] font-extrabold text-sm shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-60"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Caricamento altre ricette...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 text-emerald-600" />
                    <span>Carica altre ricette (Pagina {currentPage + 1})</span>
                  </>
                )}
              </button>
            </div>
          )}

          {!hasNextPage && recipes.length > 0 && !isLoading && (
            <div className="py-8 text-center text-xs font-bold text-[var(--text-muted)]">
              ✓ Hai visualizzato tutte le ricette disponibili per questa ricerca
            </div>
          )}
        </div>
      </main>

      {/* BARRA FLUTTUANTE AZIONI SELEZIONE MULTIPLA */}
      <AnimatePresence>
        {selectedIndices.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 max-w-lg w-[90%] bg-slate-900/95 text-white backdrop-blur-xl p-3 sm:p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-3"
          >
            <div>
              <p className="font-extrabold text-sm">
                {selectedIndices.size} ricette selezionate
              </p>
              <p className="text-[11px] text-slate-300">
                Importa tutte con ingredienti e passaggi completi
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDeselectAll}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={handleBatchImport}
                disabled={isBatchImporting}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {isBatchImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importazione...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Importa selezionate ({selectedIndices.size})</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIALOG PROGRESSO IMPORTAZIONE MASSIVA */}
      <AnimatePresence>
        {isBatchImporting && batchProgress && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 max-w-md w-full shadow-2xl text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-[var(--text-main)]">
                  Importazione ricette in corso
                </h3>
                <p className="text-xs text-[var(--text-muted)] line-clamp-1">
                  {batchProgress.title}
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="h-2.5 w-full bg-[var(--surface-variant)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 rounded-full"
                    style={{ 
                      width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-bold text-[var(--text-muted)]">
                  <span>Ricetta {batchProgress.current} di {batchProgress.total}</span>
                  <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ANTEPRIMA RICETTA INTERATTIVA (MODAL COMPLETA) */}
      <AnimatePresence>
        {previewRecipe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="w-full h-full sm:h-[92vh] sm:max-w-3xl bg-[var(--surface)] sm:rounded-3xl border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header Immagine */}
              <div className="relative h-60 sm:h-72 w-full shrink-0 bg-[var(--surface-variant)] overflow-hidden">
                <img
                  src={previewRecipe.image || FALLBACK_RECIPE_IMAGE}
                  alt={previewRecipe.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_RECIPE_IMAGE;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

                {/* Pulsante Chiusura Preview */}
                <button
                  onClick={() => setPreviewRecipe(null)}
                  className="absolute top-4 left-4 p-2.5 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {previewRecipe.sourceUrl && (
                  <a
                    href={previewRecipe.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5 border border-white/10"
                  >
                    <span>{previewRecipe.sourceName || 'GZ'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                {/* Titolo e Metadati Sovrapposti */}
                <div className="absolute bottom-4 left-4 right-4 text-white space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider">
                      {previewRecipe.category || 'Ricetta'}
                    </span>
                    {previewRecipe.difficulty && (
                      <span className="px-2.5 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-white text-[11px] font-bold">
                        {previewRecipe.difficulty}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black leading-tight drop-shadow-md">
                    {previewRecipe.title}
                  </h3>
                </div>
              </div>

              {/* Corpo dell'Anteprima */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
                {/* Loader se sta arricchendo i dettagli */}
                {isPreviewLoading && (
                  <div className="py-4 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 flex items-center gap-3 text-xs font-bold animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Estrazione dosi, ingredienti e timer passo-passo da Ricette Web...</span>
                  </div>
                )}

                {/* Badge Numerici Riassuntivi */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-2xl bg-[var(--surface-variant)] border border-[var(--border)] text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                      Preparazione
                    </span>
                    <span className="text-sm font-black text-[var(--text-main)] flex items-center justify-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      {previewRecipe.prepTimeMinutes ? `${previewRecipe.prepTimeMinutes} min` : '15 min'}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[var(--surface-variant)] border border-[var(--border)] text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                      Cottura
                    </span>
                    <span className="text-sm font-black text-[var(--text-main)] flex items-center justify-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-orange-500" />
                      {previewRecipe.cookTimeMinutes ? `${previewRecipe.cookTimeMinutes} min` : '15 min'}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[var(--surface-variant)] border border-[var(--border)] text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                      Porzioni
                    </span>
                    <div className="flex items-center justify-center gap-2 mt-0.5">
                      <button
                        onClick={() => setPreviewServings(prev => Math.max(1, prev - 1))}
                        className="w-5 h-5 rounded-md bg-[var(--border)] text-[var(--text-main)] font-black text-xs flex items-center justify-center cursor-pointer hover:bg-emerald-600 hover:text-white"
                      >
                        -
                      </button>
                      <span className="text-sm font-black text-[var(--text-main)]">
                        {previewServings}
                      </span>
                      <button
                        onClick={() => setPreviewServings(prev => Math.min(20, prev + 1))}
                        className="w-5 h-5 rounded-md bg-[var(--border)] text-[var(--text-main)] font-black text-xs flex items-center justify-center cursor-pointer hover:bg-emerald-600 hover:text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[var(--surface-variant)] border border-[var(--border)] text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                      Calorie
                    </span>
                    <span className="text-sm font-black text-[var(--text-main)] flex items-center justify-center gap-1 mt-0.5">
                      <Flame className="w-3.5 h-3.5 text-rose-500" />
                      {previewRecipe.calories ? `${previewRecipe.calories} kcal` : '~450 kcal'}
                    </span>
                  </div>
                </div>

                {/* SEZIONE INGREDIENTI */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-black text-[var(--text-main)] flex items-center gap-2">
                      <span>🥗</span>
                      <span>Ingredienti ({previewRecipe.ingredients?.length || 0})</span>
                    </h4>

                    {onAddToShoppingList && previewRecipe.ingredients?.length ? (
                      <button
                        onClick={handleAddIngredientsToCart}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Aggiungi alla Spesa</span>
                      </button>
                    ) : null}
                  </div>

                  {cartSuccessNotice && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Ingredienti selezionati inviati alla lista della spesa!</span>
                    </div>
                  )}

                  {previewRecipe.ingredients && previewRecipe.ingredients.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {previewRecipe.ingredients.map((ing, i) => {
                        const isChecked = selectedPreviewIngredients.has(ing);
                        const baseServings = previewRecipe.servings || 4;
                        const ratio = previewServings / baseServings;
                        const displayIng = formatScaledIngredient(ing, ratio);

                        return (
                          <div
                            key={i}
                            onClick={() => {
                              setSelectedPreviewIngredients(prev => {
                                const next = new Set(prev);
                                if (next.has(ing)) next.delete(ing);
                                else next.add(ing);
                                return next;
                              });
                            }}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 text-xs sm:text-sm font-medium ${
                              isChecked
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-[var(--text-main)]'
                                : 'bg-[var(--surface-variant)] border-[var(--border)] text-[var(--text-muted)] opacity-60'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                              isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-[var(--border)]'
                            }`}>
                              {isChecked && <Check className="w-3 h-3" />}
                            </div>
                            <span className="line-clamp-2">{displayIng}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[var(--surface-variant)] text-xs text-[var(--text-muted)] text-center">
                      Ingredienti in fase di estrazione o consultabili sul portale originale.
                    </div>
                  )}
                </div>

                {/* SEZIONE PROCEDIMENTO / PASSAGGI CON TIMER */}
                <div className="space-y-3">
                  <h4 className="text-base font-black text-[var(--text-main)] flex items-center gap-2">
                    <span>👩‍🍳</span>
                    <span>Preparazione passo-passo ({previewRecipe.steps?.length || 0})</span>
                  </h4>

                  {previewRecipe.steps && previewRecipe.steps.length > 0 ? (
                    <div className="space-y-3">
                      {previewRecipe.steps.map((step, idx) => {
                        const durationSec = extractTimerSeconds(step);
                        const timer = stepTimers[idx];

                        return (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl bg-[var(--surface-variant)] border border-[var(--border)] space-y-3"
                          >
                            <div className="flex items-start gap-3">
                              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <p className="text-xs sm:text-sm text-[var(--text-main)] leading-relaxed">
                                {step}
                              </p>
                            </div>

                            {/* WIDGET TIMER INTELLIGENTE */}
                            {durationSec && (
                              <div className="ml-9 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded-lg ${
                                    timer?.isRunning
                                      ? 'bg-amber-500/20 text-amber-600 animate-pulse'
                                      : timer?.isFinished
                                      ? 'bg-emerald-500/20 text-emerald-600'
                                      : 'bg-[var(--surface-variant)] text-[var(--text-muted)]'
                                  }`}>
                                    <Timer className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <span className="font-extrabold text-[var(--text-main)] text-sm">
                                      {timer ? formatTimerDisplay(timer.remainingSeconds) : formatTimerDisplay(durationSec)}
                                    </span>
                                    <span className="text-[10px] text-[var(--text-muted)] block">
                                      {timer?.isFinished ? 'Tempo completato!' : timer?.isRunning ? 'In corso...' : 'Timer rilevato'}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {!timer?.isRunning ? (
                                    <button
                                      onClick={() => handleStartTimer(idx, durationSec)}
                                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                                    >
                                      <Play className="w-3 h-3 fill-current" />
                                      <span>Avvia</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handlePauseTimer(idx)}
                                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                                    >
                                      <Pause className="w-3 h-3 fill-current" />
                                      <span>Pausa</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleResetTimer(idx, durationSec)}
                                    className="p-1.5 rounded-lg bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] cursor-pointer"
                                    title="Azzera timer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[var(--surface-variant)] text-xs text-[var(--text-muted)] text-center">
                      Passaggi consultabili sul sito originale della ricetta.
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Azioni Preview */}
              <div className="p-4 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-between gap-3 shrink-0">
                <button
                  onClick={() => setPreviewRecipe(null)}
                  className="px-4 py-2.5 rounded-2xl bg-[var(--surface-variant)] text-[var(--text-main)] font-bold text-xs hover:bg-[var(--border)] transition-colors cursor-pointer"
                >
                  Chiudi Anteprima
                </button>

                <button
                  onClick={() => handleSaveRecipe(previewRecipe)}
                  className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95 ${
                    isAlreadySaved(previewRecipe)
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white'
                  }`}
                >
                  {isAlreadySaved(previewRecipe) ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>✓ Già nel mio Ricettario</span>
                    </>
                  ) : (
                    <>
                      <BookmarkCheck className="w-4 h-4" />
                      <span>Salva nel mio Ricettario</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST FEEDBACK */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 font-bold text-xs sm:text-sm border border-emerald-400/40"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
