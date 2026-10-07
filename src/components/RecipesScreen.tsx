import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Search, X, BookOpen, Star, ChefHat, Sparkles, 
  ShoppingCart, Check, Utensils, CheckCircle2, Eye,
  BookmarkCheck, Trash2, Plus, Link2, Edit3, ExternalLink, Users,
  Timer, Play, Pause, RotateCcw, ChevronLeft, Clock, Flame, ListOrdered,
  Globe, Loader2, SlidersHorizontal, Filter
} from 'lucide-react';

export const FALLBACK_RECIPE_IMAGE = 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800';
import { 
  parseIngredient, loadSavedMenus,
  deleteSavedMenu,
  type RecipeItem,
  type SavedMenu
} from '../services/menuPlannerService';
import { RecipeImportModal } from './RecipeImportModal';
import { RecipeWebSearchModal } from './RecipeWebSearchModal';
import { 
  loadUserRecipes, 
  deleteUserRecipe, 
  searchWebRecipes,
  enrichRecipeDetail,
  saveUserRecipe,
  formatSourceBadge,
  type UserRecipeItem 
} from '../services/userRecipesService';

interface RecipeScreenProps {
  onClose: () => void;
  initialSearchQuery?: string;
  initialRecipe?: any;
  initialCategory?: string;
  onAddToShoppingList?: (items: { name: string; quantity?: string; category?: string }[]) => void;
}

const FIXED_CATEGORIES = [
  'Cucine dal Mondo',
  'Fitness & Dieta',
  'Antipasti',
  'Primi',
  'Secondi',
  'Dolci',
  'Colazione',
];

export function RecipesScreen({ 
  onClose, 
  initialSearchQuery, 
  initialRecipe, 
  initialCategory,
  onAddToShoppingList 
}: RecipeScreenProps) {
  const [allMeals, setAllMeals] = useState<RecipeItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory && initialCategory !== 'fridge' ? initialCategory : null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  
  const [selectedMeal, setSelectedMeal] = useState<any | null>(null);
  const [favorites, setFavorites] = useState<any[]>([]);

  // Ingredient multi-selection inside recipe view
  const [selectedMealIngredients, setSelectedMealIngredients] = useState<Set<string>>(new Set());
  const [mealAddedToCart, setMealAddedToCart] = useState(false);

  // Recipe Step UX state (Guided Mode, Completion Tracker, Integrated Cooking Timers)
  const [stepViewMode, setStepViewMode] = useState<'overview' | 'guided'>('overview');
  const [activeGuidedStep, setActiveGuidedStep] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepTimers, setStepTimers] = useState<Record<number, {
    totalSeconds: number;
    remainingSeconds: number;
    isRunning: boolean;
    isFinished: boolean;
  }>>({});

  // Saved Menus state
  const [savedMenus, setSavedMenus] = useState<SavedMenu[]>(loadSavedMenus);
  const [isSavedMenusOpen, setIsSavedMenusOpen] = useState(false);
  const [savedMenuSearch, setSavedMenuSearch] = useState('');
  const [showShoppingReviewModal, setShowShoppingReviewModal] = useState(false);
  const [shoppingReviewMenu, setShoppingReviewMenu] = useState<SavedMenu | null>(null);
  const [menuShoppingIngredients, setMenuShoppingIngredients] = useState<Set<string>>(new Set());

  // User Recipes state
  const [userRecipes, setUserRecipes] = useState<UserRecipeItem[]>(loadUserRecipes);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isWebSearchOpen, setIsWebSearchOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live online search states
  const [onlineResults, setOnlineResults] = useState<UserRecipeItem[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState(false);
  const [exploreTab, setExploreTab] = useState<'categories' | 'countries'>('categories');

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  // Live Web Search mentre l'utente scrive nella barra
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setOnlineResults([]);
      setIsSearchingOnline(false);
      return;
    }

    setIsSearchingOnline(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchWebRecipes(q, 1);
        setOnlineResults(res.recipes || []);
      } catch (e) {
        console.warn('Live search error:', e);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 380);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectOnlineRecipe = async (meal: UserRecipeItem) => {
    if (meal.ingredients && meal.ingredients.length > 0 && meal.steps && meal.steps.length > 0) {
      setSelectedMeal(meal);
      return;
    }
    try {
      showToast('Caricamento dettagli ricetta...');
      const enriched = await enrichRecipeDetail(meal, 7000);
      setSelectedMeal(enriched);
    } catch {
      setSelectedMeal(meal);
    }
  };

  // Ascolta aggiornamenti delle ricette create dall'utente
  useEffect(() => {
    const handleUserRecipesUpdated = () => {
      const updated = loadUserRecipes();
      setUserRecipes(updated);
      setAllMeals(prev => {
        const mondos = prev.filter(p => !p.isCustom);
        return [...updated, ...mondos];
      });
    };
    window.addEventListener('chelona_user_recipes_updated', handleUserRecipesUpdated);
    return () => window.removeEventListener('chelona_user_recipes_updated', handleUserRecipesUpdated);
  }, []);

  // Ascolta aggiornamenti dei menu salvati
  useEffect(() => {
    const handleMenusUpdated = () => {
      setSavedMenus(loadSavedMenus());
    };
    window.addEventListener('chelona_saved_menus_updated', handleMenusUpdated);
    return () => window.removeEventListener('chelona_saved_menus_updated', handleMenusUpdated);
  }, []);

  useEffect(() => {
    const savedFavs = localStorage.getItem('chelona_gz_favorites');
    if (savedFavs) {
      try { setFavorites(JSON.parse(savedFavs)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (initialRecipe) {
      setSearchQuery('');
      if (initialRecipe.titolo) {
        setSelectedMeal({
          id: `initial_${Date.now()}`,
          title: initialRecipe.titolo,
          image: initialRecipe.immagine || '',
          category: 'Ricerca',
          ingredients: initialRecipe.ingredienti ? initialRecipe.ingredienti.map((i: any) => `${i.quantita || ''} ${i.nome || ''}`.trim()) : [],
          steps: initialRecipe.preparazione ? initialRecipe.preparazione.split('\n').filter((s: string) => s.trim().length > 0) : []
        });
      } else {
        setSelectedMeal(initialRecipe);
      }
    } else {
      setSelectedMeal(null);
    }
  }, [initialRecipe]);

  // Quando si apre una ricetta, seleziona tutti gli ingredienti di default e azzera gli stati dei passaggi
  useEffect(() => {
    if (selectedMeal && Array.isArray(selectedMeal.ingredients)) {
      setSelectedMealIngredients(new Set(selectedMeal.ingredients));
      setMealAddedToCart(false);
    } else {
      setSelectedMealIngredients(new Set());
    }
    setCompletedSteps(new Set());
    setActiveGuidedStep(0);
    setStepTimers({});
  }, [selectedMeal]);

  const playTimerChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      // Audio fallback
    }
  }, []);

  // Tick active cooking timers
  useEffect(() => {
    const hasRunning = Object.values(stepTimers).some(t => t.isRunning);
    if (!hasRunning) return;

    const interval = setInterval(() => {
      setStepTimers(prev => {
        let changed = false;
        const next = { ...prev };
        for (const [stepKey, timer] of Object.entries(prev)) {
          const stepIdx = Number(stepKey);
          if (timer.isRunning) {
            changed = true;
            if (timer.remainingSeconds <= 1) {
              next[stepIdx] = {
                ...timer,
                remainingSeconds: 0,
                isRunning: false,
                isFinished: true,
              };
              playTimerChime();
            } else {
              next[stepIdx] = {
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

  const handleStartTimer = useCallback((stepIdx: number, durationSeconds: number) => {
    setStepTimers(prev => {
      const existing = prev[stepIdx];
      return {
        ...prev,
        [stepIdx]: {
          totalSeconds: durationSeconds,
          remainingSeconds: existing && existing.remainingSeconds > 0 ? existing.remainingSeconds : durationSeconds,
          isRunning: true,
          isFinished: false,
        }
      };
    });
  }, []);

  const handlePauseTimer = useCallback((stepIdx: number) => {
    setStepTimers(prev => {
      const existing = prev[stepIdx];
      if (!existing) return prev;
      return {
        ...prev,
        [stepIdx]: {
          ...existing,
          isRunning: false,
        }
      };
    });
  }, []);

  const handleResetTimer = useCallback((stepIdx: number, durationSeconds: number) => {
    setStepTimers(prev => ({
      ...prev,
      [stepIdx]: {
        totalSeconds: durationSeconds,
        remainingSeconds: durationSeconds,
        isRunning: false,
        isFinished: false,
      }
    }));
  }, []);

  const handleAddMinute = useCallback((stepIdx: number) => {
    setStepTimers(prev => {
      const existing = prev[stepIdx];
      if (!existing) return prev;
      return {
        ...prev,
        [stepIdx]: {
          ...existing,
          remainingSeconds: existing.remainingSeconds + 60,
          totalSeconds: Math.max(existing.totalSeconds, existing.remainingSeconds + 60),
          isFinished: false,
        }
      };
    });
  }, []);

  const formatTimerClock = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  const extractStepTimerDuration = useCallback((stepText: string): number | null => {
    const clean = stepText.replace(/<[^>]+>/g, ' ');
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
  }, []);

  const getStepIngredients = useCallback((stepText: string, ingredients: string[]): string[] => {
    if (!ingredients || ingredients.length === 0) return [];
    const stepLower = stepText.toLowerCase();
    const matched: string[] = [];
    const stopWords = new Set(['del', 'della', 'delle', 'dei', 'degli', 'con', 'per', 'senza', 'tipo', 'fresco', 'fresca', 'fresche', 'freschi', 'qb', 'q.b.', 'g', 'ml', 'kg', 'cucchiaio', 'cucchiai', 'pizzico', 'fette']);
    
    for (const raw of ingredients) {
      const parsed = parseIngredient(raw);
      const name = parsed.name.toLowerCase();
      const tokens = name
        .split(/[\s,()]+/)
        .filter(t => t.length >= 3 && !stopWords.has(t));
      if (tokens.some(token => stepLower.includes(token))) {
        matched.push(parsed.name);
      }
    }
    return Array.from(new Set(matched));
  }, []);

  useEffect(() => {
    if (initialRecipe) {
      setSearchQuery('');
    } else if (initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialRecipe, initialSearchQuery]);

  useEffect(() => {
    if (initialCategory) {
      if (initialCategory === 'fridge') {
        setSelectedCategory(null);
      } else {
        setSelectedCategory(initialCategory);
      }
    }
  }, [initialCategory]);

  const handleBack = useCallback(() => {
    if (isWebSearchOpen) {
      setIsWebSearchOpen(false);
      return;
    }

    if (isImportModalOpen) {
      setIsImportModalOpen(false);
      return;
    }
    if (showShoppingReviewModal) {
      setShowShoppingReviewModal(false);
      return;
    }
    if (selectedMeal) {
      if (initialRecipe) {
        onClose();
      } else {
        setSelectedMeal(null);
      }
      return;
    }
    if (isSavedMenusOpen) {
      setIsSavedMenusOpen(false);
      return;
    }
    if (selectedCountry) {
      setSelectedCountry(null);
      return;
    }
    if (selectedCategory || searchQuery) {
      if (initialSearchQuery || initialCategory) {
        onClose();
      } else {
        setSelectedCategory(null);
        setSelectedCountry(null);
        setSearchQuery('');
      }
    } else {
      onClose();
    }
  }, [
    isWebSearchOpen,
    isImportModalOpen,
    showShoppingReviewModal,
    selectedMeal, 
    isSavedMenusOpen,
    selectedCountry,
    selectedCategory, 
    searchQuery, 
    onClose, 
    initialRecipe, 
    initialSearchQuery, 
    initialCategory
  ]);

  useEffect(() => {
    window.addEventListener('recipes-back', handleBack);
    return () => window.removeEventListener('recipes-back', handleBack);
  }, [handleBack]);

  const loadRecipes = useCallback(() => {
    try {
      const userList = loadUserRecipes();
      setUserRecipes(userList);
      setAllMeals(userList as any[]);
    } catch (e) {
      console.error('Failed to load recipes', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteUserRecipe = (id: string) => {
    deleteUserRecipe(id);
    setFavorites(prev => {
      const next = prev.filter(f => f.id !== id);
      try { localStorage.setItem('chelona_gz_favorites', JSON.stringify(next)); } catch (e) {}
      return next;
    });
    setSelectedMeal(null);
    showToast('Ricetta eliminata.');
  };



  const handleSaveUserRecipeSuccess = (saved: UserRecipeItem) => {
    showToast(`Ricetta salvata in ${saved.category || 'Ricettario'}!`);
    const destCat = saved.category && FIXED_CATEGORIES.includes(saved.category) ? saved.category : null;
    if (destCat) setSelectedCategory(destCat);
    setSelectedMeal(saved);
  };

  const handleImportRecipeSuccess = (saved: UserRecipeItem, allRecipes?: UserRecipeItem[]) => {
    // Point 6: navigate to the correct gastronomic category, not generic 'user_recipes'
    const destCat = saved.category && FIXED_CATEGORIES.includes(saved.category) ? saved.category : null;
    if (allRecipes && allRecipes.length > 1) {
      // batch import: go to first recipe's category or stay on home
      const firstCat = allRecipes[0]?.category;
      setSelectedCategory(FIXED_CATEGORIES.includes(firstCat || '') ? firstCat || null : null);
      showToast(`${allRecipes.length} ricette importate con successo!`);
    } else {
      setSelectedCategory(destCat);
      showToast(`Ricetta "${saved.title}" importata in ${destCat || 'Ricettario'}!`);
      setSelectedMeal(saved);
    }
  };

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  // Aggiungi tutti gli ingredienti di un menu salvato alla lista della spesa
  const handleAddSavedMenuToCart = (menu: SavedMenu) => {
    const allIngs: string[] = [];
    if (menu.antipasto?.ingredients) allIngs.push(...menu.antipasto.ingredients);
    if (menu.primo?.ingredients) allIngs.push(...menu.primo.ingredients);
    if (menu.secondo?.ingredients) allIngs.push(...menu.secondo.ingredients);
    
    if (allIngs.length > 0) {
      setShoppingReviewMenu(menu);
      setMenuShoppingIngredients(new Set(allIngs));
      setShowShoppingReviewModal(true);
    }
  };

  // Elimina un menu salvato
  const handleDeleteSavedMenu = (id: string) => {
    const updated = deleteSavedMenu(id);
    setSavedMenus(updated);
  };

  // Conferma aggiunta ingredienti del menu alla lista della spesa
  const handleConfirmMenuShopping = () => {
    const itemsToAdd = Array.from(menuShoppingIngredients).map(ing => parseIngredient(ing));
    if (onAddToShoppingList) {
      onAddToShoppingList(itemsToAdd);
    }
    setShowShoppingReviewModal(false);
  };

  // Aggiungi ingredienti selezionati di una singola ricetta alla spesa
  const handleAddSelectedToShoppingList = () => {
    if (selectedMealIngredients.size === 0) return;
    const itemsToAdd = Array.from(selectedMealIngredients).map(ing => parseIngredient(ing));
    if (onAddToShoppingList) {
      onAddToShoppingList(itemsToAdd);
      setMealAddedToCart(true);
      setTimeout(() => setMealAddedToCart(false), 2500);
    }
  };

  const COUNTRIES_LIST = useMemo(() => [
    { name: 'Tutti', code: 'ALL', flag: '🌐' },
    { name: 'Giappone', code: 'JP', flag: '🇯🇵' },
    { name: 'Messico', code: 'MX', flag: '🇲🇽' },
    { name: 'Grecia', code: 'GR', flag: '🇬🇷' },
    { name: 'Spagna', code: 'ES', flag: '🇪🇸' },
    { name: 'India', code: 'IN', flag: '🇮🇳' },
    { name: 'Francia', code: 'FR', flag: '🇫🇷' },
    { name: 'Stati Uniti', code: 'US', flag: '🇺🇸' },
    { name: 'Marocco', code: 'MA', flag: '🇲🇦' },
    { name: 'Libano', code: 'LB', flag: '🇱🇧' },
    { name: 'Corea del Sud', code: 'KR', flag: '🇰🇷' },
    { name: 'Cina', code: 'CN', flag: '🇨🇳' },
    { name: 'Thailandia', code: 'TH', flag: '🇹🇭' },
    { name: 'Turchia', code: 'TR', flag: '🇹🇷' },
    { name: 'Vietnam', code: 'VN', flag: '🇻🇳' },
    { name: 'Brasile', code: 'BR', flag: '🇧🇷' },
    { name: 'Argentina', code: 'AR', flag: '🇦🇷' },
    { name: 'Perù', code: 'PE', flag: '🇵🇪' },
    { name: 'Germania', code: 'DE', flag: '🇩🇪' },
  ], []);

  const categories = useMemo(() => {
    return FIXED_CATEGORIES;
  }, []);

  const filteredMeals = useMemo(() => {
    let list = allMeals;
    if (selectedCategory === 'favorites') {
      list = favorites;
    } else if (selectedCategory === 'user_recipes') {
      list = allMeals.filter(m => m.isCustom);
    }

    const q = searchQuery.toLowerCase().trim();
    return list.filter(meal => {
      let matchCat = true;
      if (selectedCategory === 'favorites') {
        matchCat = true;
      } else if (selectedCategory === 'user_recipes') {
        matchCat = Boolean(meal.isCustom);
      } else if (selectedCategory === 'Cucine dal Mondo') {
        matchCat = selectedCountry ? true : Boolean((meal.country && meal.country !== 'Italia') || meal.category === 'Cucine dal Mondo');
      } else if (selectedCategory) {
        matchCat = meal.category === selectedCategory;
      }

      const matchCountry = selectedCountry ? meal.country === selectedCountry : true;
      
      let matchSearch = true;
      if (q) {
        const titleMatch = (meal.title || '').toLowerCase().includes(q);
        const ingMatch = Array.isArray(meal.ingredients) && meal.ingredients.some((ing: any) => {
          const str = typeof ing === 'string' ? ing : (ing?.name || '');
          return str.toLowerCase().includes(q);
        });
        matchSearch = titleMatch || ingMatch;
      }

      return matchCat && matchCountry && matchSearch;
    });
  }, [allMeals, selectedCategory, selectedCountry, searchQuery, favorites]);

  const toggleFavorite = (meal: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const isFav = prev.some(f => f.id === meal.id);
      let updated;
      if (isFav) {
        updated = prev.filter(f => f.id !== meal.id);
      } else {
        updated = [meal, ...prev];
      }
      localStorage.setItem('chelona_gz_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const isFavorite = (id: string) => favorites.some(f => f.id === id);

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] font-sans relative">
      <header className="h-16 lg:h-20 bg-[var(--bg)] px-4 sm:px-6 flex items-center justify-between shrink-0 z-10 border-b border-[var(--border)] gap-2">
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] transition-all flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-[var(--text-main)]">Ricettario</h1>
          </div>
        </div>

        {/* Header pulito */}
        <div className="flex items-center gap-2"></div>
      </header>

      {(() => {
        const hasActiveFilters = Boolean((selectedCategory && selectedCategory !== 'favorites') || selectedCountry);
        const isFavoritesActive = selectedCategory === 'favorites';
        const isOnlineSearchActive = searchQuery.trim().length >= 2;
        const hasActiveResultsView = isOnlineSearchActive || isFavoritesActive || hasActiveFilters;
        const activeFiltersCount = (selectedCategory && selectedCategory !== 'favorites' ? 1 : 0) + (selectedCountry ? 1 : 0);

        return (
          <main className={`flex-1 flex flex-col overflow-x-hidden max-w-full ${
            !hasActiveResultsView 
              ? 'h-full justify-center items-center overflow-hidden p-3.5 sm:p-6 pb-10 sm:pb-16' 
              : 'overflow-y-auto p-3.5 sm:p-4 md:p-8 custom-scrollbar'
          }`}>
            {/* HERO BARRA & TITOLO (Perfettamente centrato) */}
            <div className={`w-full transition-all duration-200 ${
              !hasActiveResultsView 
                ? 'max-w-xl mx-auto space-y-6 text-center my-auto flex flex-col items-center' 
                : 'max-w-3xl mx-auto space-y-3 mb-6 shrink-0'
            }`}>
              {/* TITOLO AL CENTRO */}
              <div className="text-center space-y-1.5">
                <h2 className={`font-black text-[var(--text-main)] tracking-tight transition-all ${
                  !hasActiveResultsView ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'
                }`}>
                  Cerca la tua ricetta
                </h2>
                {!hasActiveResultsView && (
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] font-medium max-w-sm mx-auto">
                    Trova qualsiasi piatto dal web con ingredienti e procedimenti
                  </p>
                )}
              </div>

              {/* BARRA DI RICERCA CON TASTO FILTRI E STELLA PREFERITI */}
              <div className="w-full flex items-center gap-1.5 sm:gap-2.5 max-w-full">
                <div className="relative flex-1 min-w-0 group">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-emerald-500/20 rounded-2xl sm:rounded-3xl blur-xl opacity-70 group-focus-within:opacity-100 transition-opacity duration-300" />
                  <div className="relative flex items-center gap-2 sm:gap-3 bg-[var(--card-bg)] border-2 border-[var(--border)] focus-within:border-orange-500 rounded-2xl sm:rounded-3xl px-3 sm:px-5 py-2.5 sm:py-3.5 shadow-lg transition-all min-w-0">
                    {isSearchingOnline ? (
                      <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 shrink-0 animate-spin" />
                    ) : (
                      <Search className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 shrink-0" />
                    )}
                    <input
                      type="text"
                      placeholder="Cerca qualsiasi ricetta (es. Carbonara, Torta di Mele)..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                      }}
                      className="flex-1 min-w-0 bg-transparent text-[var(--text-main)] placeholder-[var(--text-muted)] outline-none text-sm sm:text-base font-medium"
                    />
                    {searchQuery && (
                      <button 
                        type="button" 
                        onClick={() => setSearchQuery('')} 
                        className="p-1 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)] cursor-pointer shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 sm:py-1 rounded-lg bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 shrink-0 hidden sm:inline-block">
                      Live Web
                    </span>
                  </div>
                </div>

                {/* TASTO FILTRI ELEGANTE (CON BADGE SE ATTIVO) */}
                <button
                  type="button"
                  onClick={() => setIsFiltersSheetOpen(true)}
                  className={`relative w-11 h-11 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl border-2 transition-all cursor-pointer shadow-md flex items-center justify-center shrink-0 active:scale-95 ${
                    hasActiveFilters
                      ? 'bg-orange-500/15 border-orange-500 text-orange-500 shadow-orange-500/20'
                      : 'bg-[var(--card-bg)] border-[var(--border)] hover:border-orange-400 text-[var(--text-muted)] hover:text-orange-500'
                  }`}
                  title="Filtri per portata e cucina"
                >
                  <SlidersHorizontal className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center shadow-sm">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {/* SOLO LA STELLA COME PREFERITI ACCANTO ALLA BARRA */}
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCategory === 'favorites') {
                      setSelectedCategory(null);
                    } else {
                      setSelectedCategory('favorites');
                      setSelectedCountry(null);
                      setSearchQuery('');
                    }
                  }}
                  className={`relative w-11 h-11 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl border-2 transition-all cursor-pointer shadow-md flex items-center justify-center shrink-0 active:scale-95 ${
                    isFavoritesActive
                      ? 'bg-yellow-400/20 border-yellow-400 text-yellow-500 shadow-yellow-500/20'
                      : 'bg-[var(--card-bg)] border-[var(--border)] hover:border-yellow-400 text-[var(--text-muted)] hover:text-yellow-500'
                  }`}
                  title={isFavoritesActive ? 'Chiudi Preferiti' : 'I miei Preferiti'}
                >
                  <Star className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 ${isFavoritesActive ? 'fill-yellow-400 text-yellow-500' : 'text-[var(--text-muted)] hover:text-yellow-500'}`} />
                </button>
              </div>

              {/* CHIP ATTIVI MINIMALI (COMPAIONO SOLO SE UN FILTRO È STATO APPLICATO) */}
              {hasActiveFilters && (
                <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                  {selectedCategory && selectedCategory !== 'favorites' && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500 text-white shadow-xs cursor-pointer active:scale-95"
                    >
                      <span>{selectedCategory}</span>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {selectedCountry && (
                    <button
                      type="button"
                      onClick={() => setSelectedCountry(null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500 text-white shadow-xs cursor-pointer active:scale-95"
                    >
                      <span>{selectedCountry}</span>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(null);
                      setSelectedCountry(null);
                    }}
                    className="text-[11px] font-bold text-[var(--text-muted)] hover:text-orange-500 underline ml-1 cursor-pointer"
                  >
                    Azzera filtri
                  </button>
                </div>
              )}

              {/* STATO VUOTO ELEGANTE (STILE LISTA DELLA SPESA) */}
              {!hasActiveResultsView && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="pt-8 sm:pt-12 flex flex-col items-center justify-center text-center px-4"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-500/10 rounded-full flex items-center justify-center mb-4 sm:mb-5 border border-orange-500/20 shadow-xs">
                    <ChefHat className="w-8 h-8 sm:w-10 sm:h-10 text-orange-500" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--text-main)] mb-1.5 sm:mb-2">
                    Ricettario vuoto
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-xs leading-relaxed">
                    Cerca un piatto nella barra per trovare ricette dal web, usa i filtri per portata o tocca la <b className="text-yellow-500 font-semibold">stella</b> per vedere i preferiti.
                  </p>
                </motion.div>
              )}
            </div>

        {/* RISULTATI: COMPAIONO SOLO SE SI CERCA ONLINE O SE SI PREME LA STELLA PREFERITI O UN FILTRO */}
        {isOnlineSearchActive ? (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-500" />
                <h3 className="font-extrabold text-base text-[var(--text-main)]">
                  Risultati online per "{searchQuery}"
                </h3>
              </div>
              {isSearchingOnline && (
                <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                  Ricerca in corso...
                </span>
              )}
            </div>

            {/* SKELETON LOADER */}
            {isSearchingOnline && onlineResults.length === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden animate-pulse">
                    <div className="aspect-[4/3] bg-[var(--surface-variant)]" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-[var(--surface-variant)] rounded-md w-3/4" />
                      <div className="h-3 bg-[var(--surface-variant)] rounded-md w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* RISULTATI ONLINE TROVATI */}
            {!isSearchingOnline && onlineResults.length === 0 ? (
              <div className="text-center py-16 max-w-md mx-auto space-y-3">
                <div className="w-16 h-16 rounded-full bg-[var(--surface-variant)] text-[var(--text-muted)] mx-auto flex items-center justify-center">
                  <Search className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-[var(--text-main)]">
                  Nessuna ricetta trovata per "{searchQuery}"
                </h4>
                <p className="text-xs text-[var(--text-muted)]">
                  Prova a cercare con un ingrediente o un piatto diverso (es. "risotto", "torta", "salmone").
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {onlineResults.map((meal, idx) => (
                  <motion.div
                    key={`${meal.sourceUrl || meal.id}_${idx}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                    onClick={() => handleSelectOnlineRecipe(meal)}
                    className="group rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] hover:border-orange-500 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface-variant)]">
                      <img
                        src={meal.image || FALLBACK_RECIPE_IMAGE}
                        alt={meal.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_RECIPE_IMAGE; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                      {/* Badge Sorgente */}
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1 border border-white/15">
                        {formatSourceBadge(meal.sourceName, meal.sourceUrl)}
                      </span>

                      {/* Categoria & Paese */}
                      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                        {meal.category && (
                          <span className="px-2 py-0.5 rounded-md bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-white text-[10px] font-black uppercase">
                            {meal.category}
                          </span>
                        )}
                        {meal.country && (
                          <span className="px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold flex items-center gap-1">
                            <span>{meal.flag || '🌍'}</span>
                            <span>{meal.country}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                      <h4 className="font-bold text-sm text-[var(--text-main)] line-clamp-2 leading-snug group-hover:text-orange-500 transition-colors">
                        {meal.title}
                      </h4>
                      <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] font-bold pt-1">
                        {meal.prepTimeMinutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            {meal.prepTimeMinutes} min
                          </span>
                        )}
                        {meal.difficulty && (
                          <span className="flex items-center gap-1">
                            <ChefHat className="w-3.5 h-3.5 text-emerald-500" />
                            {meal.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (isFavoritesActive || hasActiveFilters) ? (
          <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                {selectedCategory === 'favorites' ? (
                  <>⭐ Preferiti ({filteredMeals.length})</>
                ) : selectedCategory ? (
                  <><span className="text-orange-500 capitalize">{selectedCategory}</span> {selectedCountry ? `· ${selectedCountry}` : ''} ({filteredMeals.length})</>
                ) : selectedCountry ? (
                  <><span className="text-orange-500">{selectedCountry}</span> ({filteredMeals.length})</>
                ) : (
                  <>⭐ Preferiti ({filteredMeals.length})</>
                )}
              </h3>

              {(selectedCategory || selectedCountry) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedCountry(null);
                  }}
                  className="text-xs font-bold text-orange-500 hover:underline cursor-pointer"
                >
                  Azzera filtri
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : filteredMeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <Globe className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[var(--text-main)]">
                    {selectedCategory === 'favorites' ? 'Nessuna ricetta tra i Preferiti' : (searchQuery ? `Nessun risultato per "${searchQuery}"` : 'Nessuna ricetta in questa sezione')}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Cerca qualsiasi piatto nella barra per visualizzarlo dal Web e aggiungerlo ai Preferiti.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWebSearchOpen(true)}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer flex items-center gap-2 mx-auto active:scale-95"
                >
                  <Search className="w-4 h-4" />
                  <span>Cerca {searchQuery ? `"${searchQuery}"` : 'Ricette'} Online</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredMeals.map((meal, idx) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.02 > 0.5 ? 0 : idx * 0.02 }}
                    key={meal.id}
                    onClick={() => setSelectedMeal(meal)}
                    className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 transition-all group flex flex-col relative"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden shrink-0 bg-[var(--surface-variant)]">
                      <img 
                        src={meal.image} 
                        alt={meal.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.onerror = null;
                          target.src = FALLBACK_RECIPE_IMAGE;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <button 
                        onClick={(e) => toggleFavorite(meal, e)}
                        className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/60 transition-colors z-10 cursor-pointer"
                      >
                        <Star className={`w-5 h-5 ${isFavorite(meal.id) ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`} />
                      </button>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-center">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-bold text-orange-500 uppercase tracking-wider truncate">{meal.category}</span>
                          {meal.isCustom && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0">
                              {meal.sourceUrl ? '🔗 Link Web' : '✨ Personalizzata'}
                            </span>
                          )}
                        </div>
                        {meal.country && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCountry(meal.country);
                            }}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--surface-variant)] hover:bg-[var(--border)] border border-[var(--border)] font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                            title={`Filtra ricette: ${meal.country}`}
                          >
                            <span>{meal.flag || '🌍'}</span>
                            <span>{meal.country}</span>
                          </button>
                        )}
                      </div>
                      <h3 className="font-bold text-[var(--text-main)] text-lg line-clamp-2 leading-tight group-hover:text-orange-500 transition-colors">{meal.title}</h3>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : null}
          </main>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL DETTAGLIO RICETTA (CON SELEZIONE INGREDIENTI & AGGIUNTA SPESA)
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedMeal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 overflow-y-auto"
            onClick={() => setSelectedMeal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row my-auto relative max-h-[90vh]"
            >
              <div className="w-full md:w-2/5 h-64 md:h-auto relative shrink-0 bg-[var(--surface-variant)]">
                <img 
                  src={selectedMeal.image} 
                  alt={selectedMeal.title} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.onerror = null;
                    target.src = FALLBACK_RECIPE_IMAGE;
                  }}
                />
                <button 
                  onClick={handleBack}
                  className="absolute top-4 left-4 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:bg-black/70 md:hidden cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => toggleFavorite(selectedMeal)}
                  className="absolute top-4 right-4 w-12 h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/70 transition-colors z-10 shadow-lg cursor-pointer"
                >
                  <Star className={`w-6 h-6 ${isFavorite(selectedMeal.id) ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`} />
                </button>
              </div>

              <div className="w-full md:w-3/5 p-6 md:p-8 flex flex-col overflow-y-auto custom-scrollbar">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-block px-3 py-1 bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 rounded-full text-xs font-bold uppercase tracking-wider">
                        {selectedMeal.category}
                      </span>
                      {selectedMeal.isCustom && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-full text-xs font-bold uppercase tracking-wider">
                          <Sparkles className="w-3 h-3" />
                          <span>{selectedMeal.sourceUrl ? 'Importata da Link' : 'La mia ricetta'}</span>
                        </span>
                      )}
                      {selectedMeal.sourceUrl && (
                        <a
                          href={selectedMeal.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-orange-500 rounded-full text-xs font-bold border border-[var(--border)] transition-colors"
                        >
                          <span>Fonte: {selectedMeal.sourceName || 'Web'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {selectedMeal.country && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCountry(selectedMeal.country);
                            setSelectedMeal(null);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-950/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                          title={`Vedi tutte le ricette: ${selectedMeal.country}`}
                        >
                          <span>{selectedMeal.flag || '🌍'}</span>
                          <span>{selectedMeal.country}</span>
                        </button>
                      )}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--text-main)] leading-tight">
                      {selectedMeal.title}
                    </h2>

                    {/* Metriche tempi, porzioni, calorie */}
                    {(selectedMeal.servings || selectedMeal.prepTimeMinutes || selectedMeal.cookTimeMinutes || selectedMeal.calories || selectedMeal.difficulty) && (
                      <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-bold text-[var(--text-muted)]">
                        {selectedMeal.servings && (
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-orange-500" />
                            <span>{selectedMeal.servings} porzioni</span>
                          </span>
                        )}
                        {selectedMeal.difficulty && (
                          <span className="flex items-center gap-1">
                            <ChefHat className="w-4 h-4 text-emerald-500" />
                            <span>{selectedMeal.difficulty}</span>
                          </span>
                        )}
                        {selectedMeal.prepTimeMinutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-blue-500" />
                            <span>Prep: {selectedMeal.prepTimeMinutes}m</span>
                          </span>
                        )}
                        {selectedMeal.cookTimeMinutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <span>Cottura: {selectedMeal.cookTimeMinutes}m</span>
                          </span>
                        )}
                        {selectedMeal.calories && (
                          <span className="flex items-center gap-1">
                            <Flame className="w-4 h-4 text-rose-500" />
                            <span>{selectedMeal.calories} kcal</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Aggiungi ai Preferiti con la stella */}
                    {!isFavorite(selectedMeal.id) && (
                      <button
                        type="button"
                        onClick={() => {
                          const saved = saveUserRecipe({
                            ...selectedMeal,
                            isCustom: true,
                          });
                          toggleFavorite(saved);
                          showToast(`✓ "${saved.title}" aggiunta ai Preferiti!`);
                          setSelectedMeal(saved);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
                        title="Aggiungi ai Preferiti"
                      >
                        <Star className="w-3.5 h-3.5 fill-white text-white" />
                        <span>Preferiti</span>
                      </button>
                    )}
                    {selectedMeal.isCustom && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Eliminare la ricetta "${selectedMeal.title}"?`)) {
                              handleDeleteUserRecipe(selectedMeal.id);
                            }
                          }}
                          className="p-2.5 bg-[var(--surface-variant)] hover:bg-rose-500/10 hover:text-rose-500 rounded-full text-[var(--text-muted)] transition-colors cursor-pointer"
                          title="Elimina ricetta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={handleBack}
                      className="w-10 h-10 bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] flex items-center justify-center hover:bg-[var(--border)] hidden md:flex shrink-0 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Sezione Ingredienti con Selezione Multipla e Aggiunta alla Spesa */}
                  {selectedMeal.ingredients && selectedMeal.ingredients.length > 0 && (
                    <section>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2 mb-3">
                        <h3 className="text-lg font-bold text-orange-500 flex items-center gap-2">
                          <span>Ingredienti</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                            {selectedMealIngredients.size} / {selectedMeal.ingredients.length} selezionati
                          </span>
                        </h3>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedMealIngredients.size === selectedMeal.ingredients.length) {
                                setSelectedMealIngredients(new Set());
                              } else {
                                setSelectedMealIngredients(new Set(selectedMeal.ingredients));
                              }
                            }}
                            className="text-xs font-bold text-[var(--text-muted)] hover:text-orange-500 transition-colors cursor-pointer"
                          >
                            {selectedMealIngredients.size === selectedMeal.ingredients.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                          </button>
                        </div>
                      </div>

                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedMeal.ingredients.map((ing: string, i: number) => {
                          const isChecked = selectedMealIngredients.has(ing);
                          const parsed = parseIngredient(ing);

                          return (
                            <li
                              key={i}
                              onClick={() => {
                                setSelectedMealIngredients(prev => {
                                  const next = new Set(prev);
                                  if (next.has(ing)) next.delete(ing);
                                  else next.add(ing);
                                  return next;
                                });
                              }}
                              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer text-sm ${
                                isChecked
                                  ? 'bg-[var(--card-bg)] border-orange-500/40 text-[var(--text-main)] shadow-xs'
                                  : 'bg-[var(--surface-variant)]/40 border-[var(--border)] text-[var(--text-muted)] opacity-60 line-through'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                isChecked ? 'bg-orange-500 text-white' : 'border border-[var(--border)] bg-transparent'
                              }`}>
                                {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                              <span className="flex-1 font-medium truncate">{parsed.name}</span>
                              {parsed.quantity && (
                                <span className="font-black text-xs text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md shrink-0">
                                  {parsed.quantity}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>

                      {/* Bottone Aggiungi alla Spesa */}
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={handleAddSelectedToShoppingList}
                          disabled={selectedMealIngredients.size === 0}
                          className={`w-full py-3 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            mealAddedToCart
                              ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                              : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/25'
                          }`}
                        >
                          {mealAddedToCart ? (
                            <>
                              <CheckCircle2 className="w-5 h-5" />
                              <span>Aggiunti alla Lista della Spesa!</span>
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-5 h-5" />
                              <span>Aggiungi {selectedMealIngredients.size} ingredienti alla spesa</span>
                            </>
                          )}
                        </button>
                      </div>
                    </section>
                  )}

                  {/* Informazioni Nutrizionali */}
                  {(selectedMeal.calories || selectedMeal.protein || selectedMeal.carbs || selectedMeal.fat) && (
                    <section>
                      <h3 className="text-lg font-bold text-orange-500 mb-3 flex items-center gap-2">
                        <Flame className="w-5 h-5" />
                        <span>Valori Nutrizionali</span>
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {selectedMeal.calories !== undefined && (
                          <div className="p-3 rounded-2xl bg-[var(--surface-variant)]/60 border border-[var(--border)] text-center">
                            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Calorie</span>
                            <span className="text-xl font-black text-orange-600 dark:text-orange-400">{selectedMeal.calories}</span>
                            <span className="text-[10px] text-[var(--text-muted)] font-semibold block">kcal</span>
                          </div>
                        )}
                        {selectedMeal.protein !== undefined && (
                          <div className="p-3 rounded-2xl bg-[var(--surface-variant)]/60 border border-[var(--border)] text-center">
                            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Proteine</span>
                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{selectedMeal.protein}g</span>
                            <span className="text-[10px] text-[var(--text-muted)] font-semibold block">proteine</span>
                          </div>
                        )}
                        {selectedMeal.carbs !== undefined && (
                          <div className="p-3 rounded-2xl bg-[var(--surface-variant)]/60 border border-[var(--border)] text-center">
                            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Carboidrati</span>
                            <span className="text-xl font-black text-sky-600 dark:text-sky-400">{selectedMeal.carbs}g</span>
                            <span className="text-[10px] text-[var(--text-muted)] font-semibold block">carboidrati</span>
                          </div>
                        )}
                        {selectedMeal.fat !== undefined && (
                          <div className="p-3 rounded-2xl bg-[var(--surface-variant)]/60 border border-[var(--border)] text-center">
                            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Grassi</span>
                            <span className="text-xl font-black text-amber-600 dark:text-amber-400">{selectedMeal.fat}g</span>
                            <span className="text-[10px] text-[var(--text-muted)] font-semibold block">grassi</span>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Sezione Preparazione con Modalità Panoramica / Modalità Guidata */}
                  {selectedMeal.steps && selectedMeal.steps.length > 0 && (() => {
                    const totalSteps = selectedMeal.steps.length;
                    const doneCount = completedSteps.size;
                    const progressPercent = Math.round((doneCount / totalSteps) * 100);

                    return (
                      <section className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                          <div>
                            <h3 className="text-lg font-bold text-orange-500 flex items-center gap-2">
                              <span>Preparazione</span>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                {doneCount} / {totalSteps} completati
                              </span>
                            </h3>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setStepViewMode(m => m === 'overview' ? 'guided' : 'overview')}
                              className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                                stepViewMode === 'guided'
                                  ? 'bg-orange-500 text-white shadow-xs'
                                  : 'bg-[var(--surface-variant)] text-[var(--text-main)] hover:bg-[var(--border)]'
                              }`}
                            >
                              {stepViewMode === 'guided' ? (
                                <>
                                  <ListOrdered className="w-3.5 h-3.5" />
                                  <span>Vista Elenco</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>Modalità Cucina Guidata</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Barra di Avanzamento Preparazione */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)]">
                            <span>Avanzamento ricetta</span>
                            <span className="font-mono text-orange-600 dark:text-orange-400">{progressPercent}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[var(--surface-variant)] overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {stepViewMode === 'guided' ? (
                          /* Modalità Guidata Passo per Passo */
                          <div className="space-y-4">
                            {(() => {
                              const currIdx = activeGuidedStep;
                              const stepText = selectedMeal.steps[currIdx];
                              const isStepDone = completedSteps.has(currIdx);
                              const stepIngs = getStepIngredients(stepText, selectedMeal.ingredients || []);
                              const detectedDuration = extractStepTimerDuration(stepText);
                              const timer = stepTimers[currIdx];

                              return (
                                <motion.div
                                  key={currIdx}
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="p-6 rounded-3xl bg-[var(--surface-variant)]/60 border border-[var(--border)] space-y-5"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                      <span className="w-8 h-8 rounded-full bg-orange-500 text-white font-black text-sm flex items-center justify-center">
                                        {currIdx + 1}
                                      </span>
                                      <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                        Passo {currIdx + 1} di {totalSteps}
                                      </span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCompletedSteps(prev => {
                                          const next = new Set(prev);
                                          if (next.has(currIdx)) next.delete(currIdx);
                                          else next.add(currIdx);
                                          return next;
                                        });
                                      }}
                                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                                        isStepDone
                                          ? 'bg-emerald-500 text-white shadow-xs'
                                          : 'bg-[var(--card-bg)] text-[var(--text-main)] border border-[var(--border)] hover:border-emerald-500'
                                      }`}
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span>{isStepDone ? 'Completato ✓' : 'Segna fatto'}</span>
                                    </button>
                                  </div>

                                  <p 
                                    className="text-base md:text-lg leading-relaxed text-[var(--text-main)] font-medium"
                                    dangerouslySetInnerHTML={{ __html: stepText }} 
                                  />

                                  {stepIngs.length > 0 && (
                                    <div className="p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] space-y-1.5">
                                      <span className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1.5">
                                        <Utensils className="w-3.5 h-3.5 text-orange-500" />
                                        Ingredienti necessari per questo passo:
                                      </span>
                                      <div className="flex flex-wrap gap-1.5">
                                        {stepIngs.map((name, i) => (
                                          <span 
                                            key={i} 
                                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                                          >
                                            {name}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Timer Integrato nel Passo */}
                                  {detectedDuration && (
                                    <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-orange-500/30 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                                      <div className="flex items-center gap-2.5">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${timer?.isRunning ? 'bg-amber-500 text-white animate-pulse' : 'bg-orange-500/15 text-orange-600'}`}>
                                          <Timer className="w-5 h-5" />
                                        </div>
                                        <div>
                                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Timer suggerito</span>
                                          <span className="text-xl font-black font-mono text-[var(--text-main)]">
                                            {formatTimerClock(timer ? timer.remainingSeconds : detectedDuration)}
                                          </span>
                                        </div>
                                        {timer?.isFinished && (
                                          <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-black animate-bounce">
                                            Tempo Scaduto! 🔔
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2">
                                        {(!timer || !timer.isRunning) ? (
                                          <button
                                            type="button"
                                            onClick={() => handleStartTimer(currIdx, detectedDuration)}
                                            className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                                          >
                                            <Play className="w-3.5 h-3.5 fill-current" />
                                            <span>Avvia Timer</span>
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => handlePauseTimer(currIdx)}
                                            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                                          >
                                            <Pause className="w-3.5 h-3.5 fill-current" />
                                            <span>Pausa</span>
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => handleAddMinute(currIdx)}
                                          className="px-2.5 py-1.5 rounded-xl bg-[var(--surface-variant)] text-[var(--text-main)] hover:bg-[var(--border)] font-bold text-xs cursor-pointer"
                                          title="+1 minuto"
                                        >
                                          +1m
                                        </button>

                                        {timer && (
                                          <button
                                            type="button"
                                            onClick={() => handleResetTimer(currIdx, detectedDuration)}
                                            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
                                            title="Resetta timer"
                                          >
                                            <RotateCcw className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Navigazione Passi */}
                                  <div className="flex items-center justify-between pt-2">
                                    <button
                                      type="button"
                                      disabled={currIdx === 0}
                                      onClick={() => setActiveGuidedStep(s => Math.max(0, s - 1))}
                                      className="px-4 py-2 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] font-bold text-xs text-[var(--text-main)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                                    >
                                      <ChevronLeft className="w-4 h-4" />
                                      <span>Precedente</span>
                                    </button>

                                    {currIdx < totalSteps - 1 ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCompletedSteps(prev => new Set(prev).add(currIdx));
                                          setActiveGuidedStep(s => Math.min(totalSteps - 1, s + 1));
                                        }}
                                        className="px-5 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-orange-500/25 active:scale-98 cursor-pointer"
                                      >
                                        <span>Successivo</span>
                                        <ChevronLeft className="w-4 h-4 rotate-180" />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCompletedSteps(new Set(selectedMeal.steps.map((_: any, i: number) => i)));
                                        }}
                                        className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/25 active:scale-98 cursor-pointer"
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Completa Ricetta!</span>
                                      </button>
                                    )}
                                  </div>
                                </motion.div>
                              );
                            })()}
                          </div>
                        ) : (
                          /* Modalità Panoramica (Elenco con Timers) */
                          <div className="space-y-4">
                            {selectedMeal.steps.map((step: string, i: number) => {
                              const isStepDone = completedSteps.has(i);
                              const stepIngs = getStepIngredients(step, selectedMeal.ingredients || []);
                              const detectedDuration = extractStepTimerDuration(step);
                              const timer = stepTimers[i];

                              return (
                                <motion.div
                                  key={i}
                                  initial={false}
                                  className={`p-4 rounded-2xl border transition-all ${
                                    isStepDone
                                      ? 'bg-emerald-500/[0.04] border-emerald-500/30'
                                      : 'bg-[var(--surface-variant)]/30 border-[var(--border)] hover:border-orange-500/30'
                                  }`}
                                >
                                  <div className="flex gap-3.5 items-start">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCompletedSteps(prev => {
                                          const next = new Set(prev);
                                          if (next.has(i)) next.delete(i);
                                          else next.add(i);
                                          return next;
                                        });
                                      }}
                                      title={isStepDone ? 'Segna come non completato' : 'Segna come completato'}
                                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 transition-all cursor-pointer ${
                                        isStepDone
                                          ? 'bg-emerald-500 text-white shadow-xs'
                                          : 'bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400 hover:bg-orange-200'
                                      }`}
                                    >
                                      {isStepDone ? (
                                        <Check className="w-4 h-4 stroke-[3]" />
                                      ) : (
                                        <span>{i + 1}</span>
                                      )}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                      <p 
                                        className={`text-[14px] md:text-[15px] leading-relaxed transition-opacity ${
                                          isStepDone ? 'text-[var(--text-muted)] line-through decoration-emerald-500/50' : 'text-[var(--text-main)]'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: step }} 
                                      />

                                      {stepIngs.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                          <span className="text-[10px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                                            <Utensils className="w-3.5 h-3.5 text-orange-500" />
                                            Ingredienti:
                                          </span>
                                          {stepIngs.map((name, idx) => (
                                            <span
                                              key={idx}
                                              className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                                            >
                                              {name}
                                            </span>
                                          ))}
                                        </div>
                                      )}

                                      {detectedDuration && (
                                        <div className="mt-3 p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <Timer className={`w-4 h-4 ${timer?.isRunning ? 'text-amber-500 animate-pulse' : 'text-orange-500'}`} />
                                            <span className="text-xs font-bold text-[var(--text-main)] font-mono">
                                              {formatTimerClock(timer ? timer.remainingSeconds : detectedDuration)}
                                            </span>
                                            {timer?.isFinished && (
                                              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                                                Finito! 🔔
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-1.5">
                                            {(!timer || !timer.isRunning) ? (
                                              <button
                                                type="button"
                                                onClick={() => handleStartTimer(i, detectedDuration)}
                                                className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                              >
                                                <Play className="w-3 h-3 fill-current" />
                                                <span>Avvia</span>
                                              </button>
                                            ) : (
                                              <button
                                                type="button"
                                                onClick={() => handlePauseTimer(i)}
                                                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                              >
                                                <Pause className="w-3 h-3 fill-current" />
                                                <span>Pausa</span>
                                              </button>
                                            )}

                                            <button
                                              type="button"
                                              onClick={() => handleAddMinute(i)}
                                              className="px-1.5 py-1 rounded-lg bg-[var(--surface-variant)] text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                                              title="+1 minuto"
                                            >
                                              +1m
                                            </button>

                                            {timer && (
                                              <button
                                                type="button"
                                                onClick={() => handleResetTimer(i, detectedDuration)}
                                                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-red-500 cursor-pointer"
                                                title="Resetta"
                                              >
                                                <RotateCcw className="w-3 h-3" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: REVISIONE INGREDIENTI DEL MENU SALVATO PRIMA DI AGGIUNGERE ALLA SPESA
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showShoppingReviewModal && shoppingReviewMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowShoppingReviewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-orange-500" />
                    <span>Ingredienti del Menu ({menuShoppingIngredients.size})</span>
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] font-medium">
                    Deseleziona gli ingredienti che hai già in cucina prima di aggiungerli alla spesa
                  </p>
                </div>
                <button
                  onClick={() => setShowShoppingReviewModal(false)}
                  className="p-2 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1">
                {[
                  { course: 'Antipasto', dish: shoppingReviewMenu.antipasto },
                  { course: 'Primo', dish: shoppingReviewMenu.primo },
                  { course: 'Secondo', dish: shoppingReviewMenu.secondo }
                ].filter(c => c.dish && c.dish.ingredients && c.dish.ingredients.length > 0).map(({ course, dish }) => (
                  <div key={course} className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">
                      {course}: {dish!.title}
                    </p>
                    <div className="space-y-1.5">
                      {dish!.ingredients.map((ing, i) => {
                        const isChecked = menuShoppingIngredients.has(ing);
                        const parsed = parseIngredient(ing);
                        return (
                          <div
                            key={i}
                            onClick={() => {
                              setMenuShoppingIngredients(prev => {
                                const next = new Set(prev);
                                if (next.has(ing)) next.delete(ing);
                                else next.add(ing);
                                return next;
                              });
                            }}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-orange-500/10 border-orange-500/30 text-[var(--text-main)]'
                                : 'bg-[var(--surface-variant)]/40 border-[var(--border)] text-[var(--text-muted)] line-through'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded flex items-center justify-center ${
                              isChecked ? 'bg-orange-500 text-white' : 'border border-[var(--border)]'
                            }`}>
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <span className="flex-1 truncate">{parsed.name}</span>
                            {parsed.quantity && (
                              <span className="font-bold text-orange-600 shrink-0">
                                {parsed.quantity}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-variant)]/20 flex gap-2">
                <button
                  onClick={() => setShowShoppingReviewModal(false)}
                  className="w-1/3 py-3 rounded-2xl border border-[var(--border)] font-bold text-xs text-[var(--text-muted)] hover:bg-[var(--surface-variant)] transition-colors cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  onClick={handleConfirmMenuShopping}
                  disabled={menuShoppingIngredients.size === 0}
                  className="w-2/3 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/25 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  Conferma e Aggiungi ({menuShoppingIngredients.size})
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════
          SCHERMATA A SCHERMO INTERO: BACHECA I MIEI MENU SALVATI
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isSavedMenusOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-[130] bg-[var(--bg)] flex flex-col h-[100dvh] w-full overflow-hidden"
          >
            {/* Header Bacheca Menu */}
            <header className="flex items-center justify-between pt-[max(env(safe-area-inset-top),16px)] px-4 pb-3 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0 z-30">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSavedMenusOpen(false)}
                  className="p-2.5 -ml-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-500/15 text-orange-600 flex items-center justify-center font-bold">
                    📋
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[var(--text-main)]">
                      I Miei Menu
                    </h2>
                    <p className="text-[11px] text-[var(--text-muted)] font-semibold">
                      {savedMenus.length} {savedMenus.length === 1 ? 'menu salvato' : 'menu salvati'}
                    </p>
                  </div>
                </div>
              </div>
            </header>

            {/* Contenuto Bacheca Menu */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar max-w-4xl mx-auto w-full space-y-4 pb-20">
              {/* Input Ricerca Menu */}
              <div className="relative w-full max-w-md mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={savedMenuSearch}
                  onChange={(e) => setSavedMenuSearch(e.target.value)}
                  placeholder="Cerca tra i tuoi menu per titolo o portata..."
                  className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl py-2 pl-9 pr-3 text-xs text-[var(--text-main)] outline-none"
                />
              </div>

              {/* Lista Menu */}
              {(() => {
                const filtered = savedMenus.filter(m => {
                  if (!savedMenuSearch) return true;
                  const q = savedMenuSearch.toLowerCase();
                  return (
                    m.title.toLowerCase().includes(q) ||
                    m.antipasto?.title.toLowerCase().includes(q) ||
                    m.primo?.title.toLowerCase().includes(q) ||
                    m.secondo?.title.toLowerCase().includes(q)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-3 px-4">
                      <div className="w-16 h-16 rounded-3xl bg-orange-500/10 text-3xl flex items-center justify-center mb-1">
                        📋
                      </div>
                      <h3 className="text-lg font-black text-[var(--text-main)]">
                        Nessun menu presente
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">
                        Non hai ancora menu salvati.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map(menu => (
                      <motion.div
                        key={menu.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                      >
                        {/* Header della Scheda Menu */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                menu.theme === 'pesce'
                                  ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                                  : menu.theme === 'carne'
                                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              }`}>
                                {menu.theme === 'pesce' ? '🐟 Pesce' : menu.theme === 'carne' ? '🥩 Carne' : '🥦 Vegetariano'}
                              </span>

                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[var(--surface-variant)] text-[var(--text-muted)]">
                                {menu.mealType === 'pranzo' ? '☀️ Pranzo' : '🌙 Cena'}
                              </span>
                            </div>

                            <span className="text-[10px] text-[var(--text-muted)] font-medium">
                              {new Date(menu.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <h3 className="text-base font-black text-[var(--text-main)] line-clamp-1">
                            {menu.title}
                          </h3>
                        </div>

                        {/* Anteprima Portate */}
                        <div className="space-y-2 py-1 border-y border-[var(--border)]/70">
                          {menu.antipasto && (
                            <div 
                              onClick={() => setSelectedMeal(menu.antipasto)}
                              className="flex items-center gap-2.5 text-xs cursor-pointer hover:bg-[var(--surface-variant)]/50 p-1.5 rounded-xl transition-colors"
                            >
                              {menu.antipasto.image ? (
                                <img 
                                  src={menu.antipasto.image} 
                                  alt="" 
                                  className="w-9 h-9 rounded-xl object-cover shrink-0" 
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    target.onerror = null;
                                    target.src = FALLBACK_RECIPE_IMAGE;
                                  }}
                                />
                              ) : (
                                <span className="w-9 h-9 rounded-xl bg-[var(--surface-variant)] flex items-center justify-center text-sm shrink-0">🥗</span>
                              )}
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-bold text-orange-600 block">Antipasto</span>
                                <p className="font-bold text-[var(--text-main)] truncate">{menu.antipasto.title}</p>
                              </div>
                            </div>
                          )}

                          {menu.primo && (
                            <div 
                              onClick={() => setSelectedMeal(menu.primo)}
                              className="flex items-center gap-2.5 text-xs cursor-pointer hover:bg-[var(--surface-variant)]/50 p-1.5 rounded-xl transition-colors"
                            >
                              {menu.primo.image ? (
                                <img 
                                  src={menu.primo.image} 
                                  alt="" 
                                  className="w-9 h-9 rounded-xl object-cover shrink-0" 
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    target.onerror = null;
                                    target.src = FALLBACK_RECIPE_IMAGE;
                                  }}
                                />
                              ) : (
                                <span className="w-9 h-9 rounded-xl bg-[var(--surface-variant)] flex items-center justify-center text-sm shrink-0">🍝</span>
                              )}
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-bold text-orange-600 block">Primo</span>
                                <p className="font-bold text-[var(--text-main)] truncate">{menu.primo.title}</p>
                              </div>
                            </div>
                          )}

                          {menu.secondo && (
                            <div 
                              onClick={() => setSelectedMeal(menu.secondo)}
                              className="flex items-center gap-2.5 text-xs cursor-pointer hover:bg-[var(--surface-variant)]/50 p-1.5 rounded-xl transition-colors"
                            >
                              {menu.secondo.image ? (
                                <img 
                                  src={menu.secondo.image} 
                                  alt="" 
                                  className="w-9 h-9 rounded-xl object-cover shrink-0" 
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    target.onerror = null;
                                    target.src = FALLBACK_RECIPE_IMAGE;
                                  }}
                                />
                              ) : (
                                <span className="w-9 h-9 rounded-xl bg-[var(--surface-variant)] flex items-center justify-center text-sm shrink-0">🥩</span>
                              )}
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-bold text-orange-600 block">Secondo</span>
                                <p className="font-bold text-[var(--text-main)] truncate">{menu.secondo.title}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Bottoni Azioni per ciascun Menu */}
                        <div className="pt-1 flex items-center justify-between gap-1.5">
                          <button
                            onClick={() => handleAddSavedMenuToCart(menu)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-xs flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
                            title="Aggiungi tutti gli ingredienti di questo menu alla spesa"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Aggiungi alla Spesa</span>
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Eliminare il menu "${menu.title}"?`)) {
                                handleDeleteSavedMenu(menu.id);
                              }
                            }}
                            className="p-1.5 rounded-xl hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                            title="Elimina menu"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* ═══════════════════════════════════════════════════════════════════
          MODAL FILTRI (PORTATE & CUCINE DAL MONDO) - UX DESIGNER PREMIUM
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isFiltersSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setIsFiltersSheetOpen(false)}
          >
            <motion.div
              initial={{ y: 80, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 80, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-lg bg-[var(--card-bg)] border border-[var(--border)] rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl p-6 sm:p-7 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar"
            >
              {/* Header Modal Filtri */}
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-[var(--text-main)]">Filtri Ricette</h3>
                    <p className="text-xs text-[var(--text-muted)]">Seleziona portata o nazione di origine</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFiltersSheetOpen(false)}
                  className="p-2 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sezione 1: Portate */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                  Portate
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {[
                    { id: null, label: 'Tutte', emoji: '🍽️' },
                    { id: 'Antipasti', label: 'Antipasti', emoji: '🥗' },
                    { id: 'Primi', label: 'Primi', emoji: '🍝' },
                    { id: 'Secondi', label: 'Secondi', emoji: '🥩' },
                    { id: 'Dolci', label: 'Dolci', emoji: '🍰' },
                    { id: 'Colazione', label: 'Colazione', emoji: '☕' },
                    { id: 'Fitness & Dieta', label: 'Fitness', emoji: '💪' },
                  ].map(cat => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id || 'all'}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(isSelected ? null : cat.id);
                        }}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 active:scale-95 ${
                          isSelected
                            ? 'bg-orange-500 text-white border-orange-500 shadow-sm font-black'
                            : 'bg-[var(--surface-variant)]/60 hover:bg-orange-500/10 border-[var(--border)] text-[var(--text-main)] font-semibold'
                        }`}
                      >
                        <span className="text-2xl leading-none">{cat.emoji}</span>
                        <span className="text-[11px] truncate w-full">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sezione 2: Cucine dal Mondo per Paese */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                  Origine & Nazione
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-0.5">
                  {COUNTRIES_LIST.map(c => {
                    const isSelected = (c.code === 'ALL' && !selectedCountry) || selectedCountry === c.name;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(c.code === 'ALL' ? null : (selectedCountry === c.name ? null : c.name));
                        }}
                        className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95 ${
                          isSelected && (selectedCountry || c.code === 'ALL')
                            ? 'bg-orange-500 text-white border-orange-500 shadow-sm font-black'
                            : 'bg-[var(--surface-variant)]/60 hover:bg-orange-500/10 border-[var(--border)] text-[var(--text-main)] font-semibold'
                        }`}
                      >
                        <span className="text-xl leading-none">{c.flag}</span>
                        <span className="text-[10px] truncate w-full">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer con azioni */}
              <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedCountry(null);
                  }}
                  className="flex-1 py-3 rounded-2xl border border-[var(--border)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-variant)] transition-all cursor-pointer"
                >
                  Azzera
                </button>
                <button
                  type="button"
                  onClick={() => setIsFiltersSheetOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black shadow-md hover:from-orange-600 hover:to-amber-600 transition-all cursor-pointer active:scale-95"
                >
                  Applica
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Importazione Ricetta da Link Web */}
      <RecipeImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportRecipeSuccess}
      />

      {/* Modal Ricerca Web Integrata Multi-Sito */}
      <RecipeWebSearchModal
        isOpen={isWebSearchOpen}
        onClose={() => setIsWebSearchOpen(false)}
        initialQuery={searchQuery}
        onRecipeSaved={handleSaveUserRecipeSuccess}
        onAddToShoppingList={onAddToShoppingList}
      />



      {/* Toast Notifiche */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 font-bold text-xs sm:text-sm border border-emerald-400/40"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
