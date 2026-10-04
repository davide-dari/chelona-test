import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Search, X, BookOpen, Star, ChefHat, Sparkles, 
  ShoppingCart, Check, RefreshCw, Lock, Unlock, Utensils, 
  Wine, ArrowRight, CheckCircle2, ChevronRight, Eye, AlertCircle,
  Share2, QrCode, Copy, Plus, Trash2, Camera, BookmarkCheck,
  Bookmark, Sliders, CheckCheck, Lightbulb, Users,
  Timer, Play, Pause, RotateCcw, ChevronLeft, Clock, Circle, Flame, ListOrdered
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export const FALLBACK_RECIPE_IMAGE = 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800';
import { Share } from '@capacitor/share';
import { QrScanner } from './QrScanner';
import { 
  parseIngredient, classifyRecipeTheme, generateHarmoniousMenu, 
  getAlternativeDishes, getMenuContinuation, loadSavedMenus,
  saveSavedMenu, deleteSavedMenu, encodeMenuForSharing, decodeMenuPayload,
  type RecipeItem, type HarmoniousMenu, type DietTheme, type MealType,
  type SavedMenu, type MenuContinuationAdvice 
} from '../services/menuPlannerService';

interface RecipeScreenProps {
  onClose: () => void;
  initialSearchQuery?: string;
  initialRecipe?: any;
  initialCategory?: string;
  onAddToShoppingList?: (items: { name: string; quantity?: string; category?: string }[]) => void;
}

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

  // "Cosa mangiare oggi?" Menu Planner state
  const [isMenuPlannerOpen, setIsMenuPlannerOpen] = useState(false);
  const [plannerMealType, setPlannerMealType] = useState<MealType>(() => new Date().getHours() < 15 ? 'pranzo' : 'cena');
  const [plannerTheme, setPlannerTheme] = useState<DietTheme>('sorprendimi');
  const [currentMenu, setCurrentMenu] = useState<HarmoniousMenu | null>(null);
  const [lockedCourses, setLockedCourses] = useState<{ antipasto: boolean; primo: boolean; secondo: boolean }>({
    antipasto: false,
    primo: false,
    secondo: false
  });
  const [activeCourseSwapModal, setActiveCourseSwapModal] = useState<'Antipasti' | 'Primi' | 'Secondi' | null>(null);
  const [swapSearchQuery, setSwapSearchQuery] = useState('');
  const [harmonizeNotice, setHarmonizeNotice] = useState<{ message: string; targetTheme: 'carne' | 'pesce' | 'vegetariano' } | null>(null);
  const [showShoppingReviewModal, setShowShoppingReviewModal] = useState(false);
  const [menuShoppingIngredients, setMenuShoppingIngredients] = useState<Set<string>>(new Set());
  const [menuAddedToCart, setMenuAddedToCart] = useState(false);



  // Ricerca piatti per modalità Componi Tu
  const [isCustomDishSearchOpen, setIsCustomDishSearchOpen] = useState(false);
  const [customDishSearchQuery, setCustomDishSearchQuery] = useState('');
  const [customSearchCourseFilter, setCustomSearchCourseFilter] = useState<'all' | 'Antipasti' | 'Primi' | 'Secondi'>('all');
  const [customSearchThemeFilter, setCustomSearchThemeFilter] = useState<'all' | 'pesce' | 'carne' | 'vegetariano'>('all');
  const [swapThemeFilter, setSwapThemeFilter] = useState<'all' | 'pesce' | 'carne' | 'vegetariano'>('all');

  // Saved & Shared Menus state
  const [savedMenus, setSavedMenus] = useState<SavedMenu[]>(loadSavedMenus);
  const [isSavedMenusOpen, setIsSavedMenusOpen] = useState(false);
  const [savedMenuFilter, setSavedMenuFilter] = useState<'all' | 'mine' | 'shared'>('all');
  const [savedMenuSearch, setSavedMenuSearch] = useState('');
  const [showShareMenuModal, setShowShareMenuModal] = useState<SavedMenu | HarmoniousMenu | null>(null);
  const [shareMenuTitle, setShareMenuTitle] = useState('');
  const [copiedShareCode, setCopiedShareCode] = useState(false);
  const [isScanningMenuQr, setIsScanningMenuQr] = useState(false);
  const [showImportCodeModal, setShowImportCodeModal] = useState(false);
  const [importCodeInput, setImportCodeInput] = useState('');
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [menuSaveSuccess, setMenuSaveSuccess] = useState(false);

  // Ascolta aggiornamenti dei menu salvati e condivisi
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
    if (isScanningMenuQr) {
      setIsScanningMenuQr(false);
      return;
    }
    if (showImportCodeModal) {
      setShowImportCodeModal(false);
      return;
    }
    if (showShareMenuModal) {
      setShowShareMenuModal(null);
      return;
    }
    if (showShoppingReviewModal) {
      setShowShoppingReviewModal(false);
      return;
    }
    if (isCustomDishSearchOpen) {
      setIsCustomDishSearchOpen(false);
      return;
    }
    if (activeCourseSwapModal) {
      setActiveCourseSwapModal(null);
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
    if (isMenuPlannerOpen) {
      setIsMenuPlannerOpen(false);
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
    isScanningMenuQr,
    showImportCodeModal,
    showShareMenuModal,
    showShoppingReviewModal,
    isCustomDishSearchOpen,
    activeCourseSwapModal, 
    selectedMeal, 
    isMenuPlannerOpen, 
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
    fetch('ricette_mondo.json')
      .then(res => res.json().catch(() => []))
      .then((mondoData) => {
        let combined: any[] = [];
        if (Array.isArray(mondoData)) {
          const formatted = mondoData
            .filter((m: any) => m.image) // Only recipes with images
            .map((m: any, i: number) => {
              let cat = m.category || m.categoria || 'Primi';
              if (cat === 'Primi Piatti') cat = 'Primi';
              if (cat === 'Secondi Piatti') cat = 'Secondi';
              
              let parsedSteps: string[] = [];
              if (Array.isArray(m.steps)) parsedSteps = m.steps;
              else if (Array.isArray(m.procedimento)) parsedSteps = m.procedimento;
              else if (typeof m.procedimento === 'string') {
                parsedSteps = m.procedimento
                  .split(/\n+/)
                  .map((s: string) => s.trim())
                  .filter((s: string) => s.length > 0)
                  .reduce((acc: string[], curr: string) => {
                    if (curr.length > 200) {
                      const sentences = curr.replace(/([.!?])\s+([A-Z])/g, '$1|SPLIT|$2').split('|SPLIT|');
                      acc.push(...sentences);
                    } else {
                      acc.push(curr);
                    }
                    return acc;
                  }, []);
              }

              return {
                id: m.id || `rec_${i}`,
                title: m.title || m.nome,
                image: m.image,
                category: cat,
                ingredients: m.ingredients || m.ingredienti || [],
                steps: parsedSteps,
                calories: m.calories,
                protein: m.protein,
                carbs: m.carbs,
                fat: m.fat,
                tags: m.tags,
                country: m.country || 'Italia',
                flag: m.flag || '🇮🇹'
              };
            });
          combined = [...formatted];
        }

        try {
          const custom = localStorage.getItem('chelona_custom_recipes');
          if (custom) {
            const customRecipes = JSON.parse(custom);
            combined = [...customRecipes, ...combined];
          }
        } catch (e) {
          console.error('Failed to load custom recipes from localStorage', e);
        }

        setAllMeals(combined);
        setLoading(false);
      })
      .catch(e => {
        console.error("Failed to load recipes", e);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  useEffect(() => {
    window.addEventListener('recipes-updated', loadRecipes);
    return () => window.removeEventListener('recipes-updated', loadRecipes);
  }, [loadRecipes]);

  // Inizializza il menu armonioso appena le ricette sono disponibili
  useEffect(() => {
    if (!currentMenu && allMeals.length > 0) {
      const generated = generateHarmoniousMenu(allMeals, {
        mealType: plannerMealType,
        theme: plannerTheme,
        locked: lockedCourses
      });
      setCurrentMenu(generated);
    }
  }, [allMeals, currentMenu, plannerMealType, plannerTheme, lockedCourses]);

  // Gestione generazione menu con tema o pasto aggiornato
  const handleRegenerateMenu = (overrideTheme?: DietTheme, overrideMealType?: MealType) => {
    const themeToUse = overrideTheme !== undefined ? overrideTheme : plannerTheme;
    const mealTypeToUse = overrideMealType !== undefined ? overrideMealType : plannerMealType;
    
    if (overrideTheme !== undefined) setPlannerTheme(overrideTheme);
    if (overrideMealType !== undefined) setPlannerMealType(overrideMealType);

    const generated = generateHarmoniousMenu(allMeals, {
      mealType: mealTypeToUse,
      theme: themeToUse,
      currentMenu: currentMenu || undefined,
      locked: lockedCourses
    });
    setCurrentMenu(generated);
    setHarmonizeNotice(null);
    setMenuAddedToCart(false);
  };

  // Toggle blocco portata
  const toggleCourseLock = (course: 'antipasto' | 'primo' | 'secondo') => {
    setLockedCourses(prev => ({ ...prev, [course]: !prev[course] }));
  };

  // Consigli intelligenti continuazione menu di Chelona
  const continuationAdvice = useMemo<MenuContinuationAdvice | null>(() => {
    if (!currentMenu) return null;
    return getMenuContinuation(allMeals, {
      antipasto: currentMenu.antipasto,
      primo: currentMenu.primo,
      secondo: currentMenu.secondo
    }, plannerMealType);
  }, [currentMenu, allMeals, plannerMealType]);

  // Sostituzione / Inserimento di un piatto specifico con rilevamento armonizzazione
  const handleSelectAlternativeDish = (course: 'Antipasti' | 'Primi' | 'Secondi', dish: RecipeItem) => {
    const courseKey = course === 'Antipasti' ? 'antipasto' : course === 'Primi' ? 'primo' : 'secondo';
    const baseMenu: HarmoniousMenu = currentMenu || {
      id: `menu_${Date.now()}`,
      mealType: plannerMealType,
      theme: classifyRecipeTheme(dish),
      antipasto: null,
      primo: null,
      secondo: null,
      chefAdvice: '',
      wineAdvice: ''
    };

    const updatedMenu = { ...baseMenu, [courseKey]: dish };
    const newDishTheme = classifyRecipeTheme(dish);
    const currentTheme = baseMenu.theme;

    // Se il tema del piatto scelto è diverso da quello attuale (es. Primo a pesce in menu carne)
    if (newDishTheme !== currentTheme && newDishTheme !== 'vegetariano' && currentTheme !== 'vegetariano') {
      const courseLabel = course === 'Antipasti' ? 'Antipasto' : course === 'Primi' ? 'Primo' : 'Secondo';
      const themeLabel = newDishTheme === 'pesce' ? 'Pesce 🐟' : 'Carne 🥩';
      setHarmonizeNotice({
        message: `Hai selezionato un ${courseLabel} a tema ${themeLabel}! Vuoi armonizzare tutto il menu a tema ${newDishTheme}?`,
        targetTheme: newDishTheme
      });
    } else {
      setHarmonizeNotice(null);
    }

    if (baseMenu.theme === 'vegetariano' && newDishTheme !== 'vegetariano') {
      updatedMenu.theme = newDishTheme;
    }

    // Calcola i consigli aggiornati dello Chef
    const advice = getMenuContinuation(allMeals, {
      antipasto: updatedMenu.antipasto,
      primo: updatedMenu.primo,
      secondo: updatedMenu.secondo
    }, plannerMealType);

    updatedMenu.chefAdvice = advice.chefTip;
    updatedMenu.wineAdvice = advice.wineTip;

    setCurrentMenu(updatedMenu);
    setActiveCourseSwapModal(null);
    setIsCustomDishSearchOpen(false);
    setMenuAddedToCart(false);
  };

  // Seleziona un piatto dai suggerimenti di continuazione di Chelona
  const handleSelectSuggestedDish = (courseKey: 'antipasto' | 'primo' | 'secondo', dish: RecipeItem) => {
    const courseLabel = courseKey === 'antipasto' ? 'Antipasti' : courseKey === 'primo' ? 'Primi' : 'Secondi';
    handleSelectAlternativeDish(courseLabel, dish);
  };

  // Seleziona un piatto dalla ricerca globale Componi Tu
  const handleSelectDishFromCustomSearch = (dish: RecipeItem, targetCourse?: 'Antipasti' | 'Primi' | 'Secondi') => {
    let course: 'Antipasti' | 'Primi' | 'Secondi' = 'Primi';
    if (targetCourse) {
      course = targetCourse;
    } else if (customSearchCourseFilter !== 'all') {
      course = customSearchCourseFilter;
    } else if (dish.category === 'Antipasti' || dish.category === 'Secondi') {
      course = dish.category as 'Antipasti' | 'Secondi';
    } else {
      course = 'Primi';
    }
    handleSelectAlternativeDish(course, dish);
  };

  // Rimuovi piatto da una portata
  const handleRemoveCourse = (courseKey: 'antipasto' | 'primo' | 'secondo') => {
    if (!currentMenu) return;
    const updated = { ...currentMenu, [courseKey]: null };
    setCurrentMenu(updated);
  };

  // Completa automaticamente il resto del menu secondo i consigli di Chelona
  const handleAutoCompleteMenu = () => {
    if (!currentMenu || !continuationAdvice) return;
    const newAntipasto = currentMenu.antipasto || continuationAdvice.suggestedAntipasti[0] || null;
    const newPrimo = currentMenu.primo || continuationAdvice.suggestedPrimi[0] || null;
    const newSecondo = currentMenu.secondo || continuationAdvice.suggestedSecondi[0] || null;

    setCurrentMenu({
      ...currentMenu,
      antipasto: newAntipasto,
      primo: newPrimo,
      secondo: newSecondo,
      theme: continuationAdvice.detectedTheme,
      chefAdvice: continuationAdvice.chefTip,
      wineAdvice: continuationAdvice.wineTip
    });
  };

  // Salva menu corrente nella raccolta
  const handleSaveCurrentMenu = () => {
    if (!currentMenu) return;
    const title = `Menu ${currentMenu.theme === 'pesce' ? 'di Mare 🐟' : currentMenu.theme === 'carne' ? 'di Terra 🥩' : 'Green 🥦'} (${currentMenu.mealType === 'pranzo' ? 'Pranzo' : 'Cena'})`;
    const newSaved: SavedMenu = {
      id: currentMenu.id || `menu_${Date.now()}`,
      title,
      mealType: currentMenu.mealType,
      theme: currentMenu.theme,
      antipasto: currentMenu.antipasto,
      primo: currentMenu.primo,
      secondo: currentMenu.secondo,
      chefAdvice: currentMenu.chefAdvice,
      wineAdvice: currentMenu.wineAdvice,
      createdAt: new Date().toISOString(),
      authorName: 'Tu'
    };
    saveSavedMenu(newSaved);
    setSavedMenus(loadSavedMenus());
    setMenuSaveSuccess(true);
    setTimeout(() => setMenuSaveSuccess(false), 2500);
  };

  // Apertura modale di condivisione
  const handleOpenShareModal = (menu: SavedMenu | HarmoniousMenu) => {
    setShowShareMenuModal(menu);
    const defaultTitle = ('title' in menu && menu.title)
      ? menu.title
      : `Menu ${menu.theme === 'pesce' ? 'di Mare 🐟' : menu.theme === 'carne' ? 'di Terra 🥩' : 'Green 🥦'} (${menu.mealType === 'pranzo' ? 'Pranzo' : 'Cena'})`;
    setShareMenuTitle(defaultTitle);
    setCopiedShareCode(false);
  };

  // Copia codice condivisione negli appunti
  const handleCopyShareCode = async (menu: SavedMenu | HarmoniousMenu) => {
    const code = encodeMenuForSharing(menu, 'Tu');
    try {
      await navigator.clipboard.writeText(code);
      setCopiedShareCode(true);
      setTimeout(() => setCopiedShareCode(false), 2500);
    } catch {
      // ignore
    }
  };

  // Condivisione nativa (WhatsApp, Telegram, etc.)
  const handleNativeShare = async (menu: SavedMenu | HarmoniousMenu) => {
    const code = encodeMenuForSharing(menu, 'Tu');
    const title = shareMenuTitle || ('title' in menu ? menu.title : 'Menu Chelona');
    const summary = `🍽️ Menu Chelona: ${title}\n` +
      (menu.antipasto ? `• Antipasto: ${menu.antipasto.title}\n` : '') +
      (menu.primo ? `• Primo: ${menu.primo.title}\n` : '') +
      (menu.secondo ? `• Secondo: ${menu.secondo.title}\n` : '') +
      `\nApri o importa in Chelona col codice:\n${code}`;

    try {
      await Share.share({
        title,
        text: summary,
        dialogTitle: 'Condividi Menu Chelona'
      });
    } catch {
      handleCopyShareCode(menu);
    }
  };

  // Importa codice menu manuale
  const handleImportCode = () => {
    if (!importCodeInput.trim()) return;
    const decoded = decodeMenuPayload(importCodeInput.trim());
    if (decoded) {
      saveSavedMenu(decoded);
      setSavedMenus(loadSavedMenus());
      setShowImportCodeModal(false);
      setImportCodeInput('');
      setImportNotice(null);
    } else {
      setImportNotice('Codice menu non riconosciuto.');
    }
  };

  // Aggiungi tutti gli ingredienti di un menu salvato alla lista della spesa
  const handleAddSavedMenuToCart = (menu: SavedMenu) => {
    const allIngs: string[] = [];
    if (menu.antipasto?.ingredients) allIngs.push(...menu.antipasto.ingredients);
    if (menu.primo?.ingredients) allIngs.push(...menu.primo.ingredients);
    if (menu.secondo?.ingredients) allIngs.push(...menu.secondo.ingredients);
    
    if (allIngs.length > 0) {
      setMenuShoppingIngredients(new Set(allIngs));
      setShowShoppingReviewModal(true);
    }
  };

  // Carica un menu salvato dentro il planner per vederlo/modificarlo
  const handleLoadSavedMenuIntoPlanner = (menu: SavedMenu) => {
    setCurrentMenu({
      id: menu.id,
      mealType: menu.mealType,
      theme: menu.theme,
      antipasto: menu.antipasto,
      primo: menu.primo,
      secondo: menu.secondo,
      chefAdvice: menu.chefAdvice || '',
      wineAdvice: menu.wineAdvice || ''
    });
    setPlannerMealType(menu.mealType);
    setPlannerTheme(menu.theme);
    setIsSavedMenusOpen(false);
    setIsMenuPlannerOpen(true);
  };

  // Elimina un menu salvato
  const handleDeleteSavedMenu = (id: string) => {
    const updated = deleteSavedMenu(id);
    setSavedMenus(updated);
  };

  // Applicazione armonizzazione completa su richiesta
  const handleApplyHarmonization = (targetTheme: 'carne' | 'pesce' | 'vegetariano') => {
    setPlannerTheme(targetTheme);
    const newMenu = generateHarmoniousMenu(allMeals, {
      mealType: plannerMealType,
      theme: targetTheme,
      currentMenu: currentMenu || undefined,
      locked: lockedCourses
    });
    setCurrentMenu(newMenu);
    setHarmonizeNotice(null);
  };

  // Apertura review carrello per tutti gli ingredienti del menu
  const handleOpenShoppingReviewForMenu = () => {
    if (!currentMenu) return;
    const allIngs: string[] = [];
    if (currentMenu.antipasto?.ingredients) allIngs.push(...currentMenu.antipasto.ingredients);
    if (currentMenu.primo?.ingredients) allIngs.push(...currentMenu.primo.ingredients);
    if (currentMenu.secondo?.ingredients) allIngs.push(...currentMenu.secondo.ingredients);
    
    setMenuShoppingIngredients(new Set(allIngs));
    setShowShoppingReviewModal(true);
  };

  // Conferma aggiunta ingredienti del menu alla lista della spesa
  const handleConfirmMenuShopping = () => {
    const itemsToAdd = Array.from(menuShoppingIngredients).map(ing => parseIngredient(ing));
    if (onAddToShoppingList) {
      onAddToShoppingList(itemsToAdd);
    }
    setShowShoppingReviewModal(false);
    setMenuAddedToCart(true);
    setTimeout(() => setMenuAddedToCart(false), 3000);
  };

  // Aggiungi ingredienti selezionati di una singola ricetta alla spesa
  const handleAddSelectedToShoppingList = () => {
    if (selectedMealIngredients.size === 0) return;
    const itemsToAdd = Array.from(selectedMealIngredients).map(ing => parseIngredient(ing));
    if (onAddToShoppingList) {
      onAddToShoppingList(itemsToAdd);
    }
    setMealAddedToCart(true);
    setTimeout(() => setMealAddedToCart(false), 3000);
  };

  const FIXED_CATEGORIES = ['Cucine dal Mondo', 'Fitness & Dieta', 'Antipasti', 'Primi', 'Secondi', 'Dolci', 'Colazione'];

  const COUNTRIES_LIST = useMemo(() => [
    { name: 'Tutti i Paesi', code: 'ALL', flag: '🌍' },
    { name: 'Italia', code: 'IT', flag: '🇮🇹' },
    { name: 'Giappone', code: 'JP', flag: '🇯🇵' },
    { name: 'Messico', code: 'MX', flag: '🇲🇽' },
    { name: 'India', code: 'IN', flag: '🇮🇳' },
    { name: 'Grecia', code: 'GR', flag: '🇬🇷' },
    { name: 'Spagna', code: 'ES', flag: '🇪🇸' },
    { name: 'USA', code: 'US', flag: '🇺🇸' },
    { name: 'Francia', code: 'FR', flag: '🇫🇷' },
    { name: 'Thailandia', code: 'TH', flag: '🇹🇭' },
    { name: 'Marocco', code: 'MA', flag: '🇲🇦' },
    { name: 'Cina', code: 'CN', flag: '🇨🇳' },
    { name: 'Libano', code: 'LB', flag: '🇱🇧' },
    { name: 'Corea del Sud', code: 'KR', flag: '🇰🇷' },
    { name: 'Turchia', code: 'TR', flag: '🇹🇷' },
    { name: 'Vietnam', code: 'VN', flag: '🇻🇳' },
    { name: 'Regno Unito', code: 'GB', flag: '🇬🇧' },
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
    }

    return list.filter(meal => {
      let matchCat = true;
      if (selectedCategory === 'favorites') {
        matchCat = true;
      } else if (selectedCategory === 'Cucine dal Mondo') {
        // Se un paese specifico è selezionato, mostra le ricette di quel paese
        // Altrimenti mostra tutte le ricette dal mondo (non Italia o con categoria Cucine dal Mondo)
        matchCat = selectedCountry ? true : Boolean((meal.country && meal.country !== 'Italia') || meal.category === 'Cucine dal Mondo');
      } else if (selectedCategory) {
        matchCat = meal.category === selectedCategory;
      }

      const matchCountry = selectedCountry ? meal.country === selectedCountry : true;
      const matchSearch = searchQuery ? meal.title.toLowerCase().includes(searchQuery.toLowerCase()) : true;
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
      <header className="h-16 lg:h-20 bg-[var(--bg)] px-6 flex items-center justify-between shrink-0 z-10 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
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

        {/* Accesso rapido Bacheca Menu Salvati & Condivisi */}
        <button
          onClick={() => setIsSavedMenusOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--surface-variant)] hover:bg-orange-500/10 text-[var(--text-main)] hover:text-orange-500 font-bold text-xs border border-[var(--border)] transition-all cursor-pointer shadow-xs"
          title="Menu Condivisi e Salvati"
        >
          <BookmarkCheck className="w-4 h-4 text-orange-500" />
          <span>I miei Menu</span>
          {savedMenus.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-black flex items-center justify-center">
              {savedMenus.length}
            </span>
          )}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        {!selectedCategory && !searchQuery && !selectedCountry ? (
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
              <input
                type="text"
                placeholder="Cerca una ricetta o ingrediente (es. Carbonara, Sushi, Tacos, Paella)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl py-4 pl-12 pr-4 text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all shadow-sm"
              />
            </div>

            {/* ── SELETTORE RAPIDO CUCINE DAL MONDO PER PAESE ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[var(--text-main)] flex items-center gap-2">
                  <span>🌍</span>
                  <span>Esplora Cucine dal Mondo per Paese</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('Cucine dal Mondo')}
                  className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                >
                  Vedi tutte
                </button>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {COUNTRIES_LIST.filter(c => c.code !== 'ALL').map(c => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(c.name);
                    }}
                    className="px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--border)] hover:border-orange-500 hover:bg-orange-50/10 text-[var(--text-main)] transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                  >
                    <span className="text-base">{c.flag}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── BANNER HERO: COSA MANGIARE OGGI? ── */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              onClick={() => {
                if (!currentMenu && allMeals.length > 0) {
                  handleRegenerateMenu();
                }
                setIsMenuPlannerOpen(true);
              }}
              className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-6 md:p-8 text-white shadow-xl shadow-orange-500/25 cursor-pointer border border-white/20 group"
            >
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black uppercase tracking-wider text-white">
                    <Sparkles className="w-3.5 h-3.5" />
                    Novità · Assistente Menu Intelligente
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
                    Cosa mangiare oggi? 🍽️
                  </h3>
                  <p className="text-white/95 text-xs md:text-sm font-medium leading-relaxed">
                    Crea in un tocco un menu coordinato (Antipasto, Primo e Secondo) in perfetto abbinamento tra Carne, Pesce o Vegetariano. Se cambi un piatto, l'assistente adatta il resto del menu e puoi inviare tutti gli ingredienti direttamente alla tua Lista della Spesa!
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  <div className="px-5 py-3.5 rounded-2xl bg-white text-orange-600 font-black text-sm shadow-xl group-hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                    <span>Crea Menu Ora</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            </motion.div>

            <div>
              <h2 className="text-2xl font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
                <ChefHat className="w-6 h-6 text-orange-500" /> Categorie
              </h2>
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-24 bg-[var(--surface-variant)] animate-pulse rounded-2xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {/* Tile speciale "Cosa mangiare oggi?" in griglia */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (!currentMenu && allMeals.length > 0) {
                        handleRegenerateMenu();
                      }
                      setIsMenuPlannerOpen(true);
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-rose-500/15 border-2 border-orange-500/40 rounded-2xl transition-all shadow-sm group hover:shadow-md cursor-pointer"
                  >
                    <div className="text-3xl mb-1.5 group-hover:scale-110 transition-transform">✨🍽️</div>
                    <span className="font-extrabold text-orange-600 dark:text-orange-400 text-sm text-center">Cosa mangiare?</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold mt-0.5">Menu coordinato</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedCategory('favorites')}
                    className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-yellow-100 to-amber-200 border border-yellow-300 rounded-2xl transition-all shadow-sm group hover:shadow-md cursor-pointer"
                  >
                    <Star className="w-8 h-8 text-yellow-600 mb-2 fill-yellow-600" />
                    <span className="font-bold text-yellow-800 text-sm text-center">Le mie Preferite</span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsSavedMenusOpen(true)}
                    className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-pink-500/15 border border-indigo-500/30 rounded-2xl transition-all shadow-sm group hover:shadow-md cursor-pointer"
                  >
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 mb-1">
                      {savedMenus.length > 0 ? `${savedMenus.length} Salvati` : 'Bacheca'}
                    </span>
                    <div className="text-3xl mb-1.5 group-hover:scale-110 transition-transform">📋✨</div>
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm text-center">Menu Condivisi</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold mt-0.5">Bacheca & QR</span>
                  </motion.button>
                  
                  {categories.map((cat) => {
                    const emojiMap: Record<string, string> = {
                      'Cucine dal Mondo': '🌍',
                      'Fitness & Dieta': '💪',
                      'Antipasti': '🥗',
                      'Primi': '🍝',
                      'Secondi': '🥩',
                      'Dolci': '🍰',
                      'Colazione': '☕',
                    };
                    const emoji = emojiMap[cat] || '🍽️';
                    
                    return (
                      <motion.button
                        key={cat}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedCategory(cat)}
                        className="flex flex-col items-center justify-center p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl hover:border-orange-500 hover:bg-orange-50/10 transition-all shadow-sm group cursor-pointer"
                      >
                        <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">{emoji}</span>
                        <span className="font-bold text-[var(--text-main)] text-sm text-center capitalize">
                          {cat}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <h2 className="text-xl sm:text-2xl font-black text-[var(--text-main)] flex items-center gap-2">
                  {selectedCategory === 'favorites' ? (
                    <>⭐ Preferiti</>
                  ) : selectedCategory === 'Cucine dal Mondo' ? (
                    <>🌍 Cucine dal Mondo {selectedCountry ? `· ${selectedCountry}` : ''}</>
                  ) : selectedCountry && !selectedCategory ? (
                    <>🌍 Cucine dal Mondo · <span className="text-orange-500">{selectedCountry}</span></>
                  ) : searchQuery && !selectedCategory ? (
                    <>Ricerca: <span className="text-orange-500">{searchQuery}</span></>
                  ) : (
                    <>Categoria <span className="text-orange-500 capitalize">{selectedCategory}</span> {selectedCountry ? `· ${selectedCountry}` : ''}</>
                  )}
                </h2>
              </div>
              
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cerca tra queste..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl py-2 pl-9 pr-4 text-[var(--text-main)] outline-none text-sm"
                />
              </div>
            </div>

            {/* Selettore Paesi / Cucine dal Mondo (Pills a scorrimento orizzontale) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {COUNTRIES_LIST.map(c => {
                const isSelected = (c.code === 'ALL' && !selectedCountry) || selectedCountry === c.name;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setSelectedCountry(c.code === 'ALL' ? null : c.name)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20 scale-105'
                        : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border)]'
                    }`}
                  >
                    <span>{c.flag}</span>
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : filteredMeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <BookOpen className="w-16 h-16 text-[var(--text-muted)] mb-4" />
                <p className="text-[var(--text-main)] font-bold text-xl">Nessuna ricetta trovata.</p>
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
                        <span className="text-xs font-bold text-orange-500 uppercase tracking-wider truncate">{meal.category}</span>
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
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL SCHERMATA: "COSA MANGIARE OGGI?" (ASSISTENTE MENU)
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isMenuPlannerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-md flex flex-col h-[100dvh] w-full bg-[var(--bg)] overflow-hidden"
          >
            {/* Header del Menu Planner */}
            <header className="flex items-center justify-between pt-[max(env(safe-area-inset-top),16px)] px-4 pb-3 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0 z-30">
              <button
                onClick={() => setIsMenuPlannerOpen(false)}
                className="p-2.5 -ml-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex-1 min-w-0 text-center px-2">
                <h2 className="text-base font-black text-[var(--text-main)] flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  <span>Cosa mangiare oggi?</span>
                </h2>
                <p className="text-[11px] text-[var(--text-muted)] font-semibold truncate">
                  Compila il tuo menu con i consigli dello Chef Chelona
                </p>
              </div>
              <div className="flex items-center gap-1 -mr-2">
                {currentMenu && (
                  <>
                    <button
                      onClick={handleSaveCurrentMenu}
                      className={`p-2 rounded-full transition-all cursor-pointer ${
                        menuSaveSuccess
                          ? 'bg-emerald-500/20 text-emerald-600'
                          : 'hover:bg-orange-500/10 text-[var(--text-muted)] hover:text-orange-500'
                      }`}
                      title="Salva nei miei menu"
                    >
                      {menuSaveSuccess ? <Check className="w-5 h-5 text-emerald-500 stroke-[3]" /> : <Bookmark className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => handleOpenShareModal(currentMenu)}
                      className="p-2 hover:bg-orange-500/10 text-[var(--text-muted)] hover:text-orange-500 rounded-full transition-colors cursor-pointer"
                      title="Condividi Menu con Amici"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleRegenerateMenu()}
                  className="p-2 hover:bg-orange-500/10 text-orange-500 rounded-full transition-colors cursor-pointer"
                  title="Consigliami un nuovo menu coordinato"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </header>

            {!currentMenu ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-bold text-[var(--text-main)]">Composizione del menu coordinato...</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Abbinamento antipasto, primo e secondo</p>
              </div>
            ) : (
            /* Contenuto scrollabile del Menu Planner */
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar max-w-3xl mx-auto w-full space-y-4 pb-28">
              
              {/* ── SELETTORE RAPIDO PASTO E TEMA ── */}
              <div className="bg-[var(--card-bg)] p-3.5 sm:p-4 rounded-3xl border border-[var(--border)] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--surface-variant)]/60 border border-[var(--border)] w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setPlannerMealType('pranzo');
                      if (currentMenu) setCurrentMenu({ ...currentMenu, mealType: 'pranzo' });
                    }}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      plannerMealType === 'pranzo'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <span>☀️</span>
                    <span>Pranzo</span>
                  </button>
                  <button
                    onClick={() => {
                      setPlannerMealType('cena');
                      if (currentMenu) setCurrentMenu({ ...currentMenu, mealType: 'cena' });
                    }}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      plannerMealType === 'cena'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    <span>🌙</span>
                    <span>Cena</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto custom-scrollbar pb-1 sm:pb-0">
                  {[
                    { id: 'sorprendimi', label: 'Tutti', emoji: '🎲' },
                    { id: 'pesce', label: 'Pesce', emoji: '🐟' },
                    { id: 'carne', label: 'Carne', emoji: '🥩' },
                    { id: 'vegetariano', label: 'Veg', emoji: '🥦' }
                  ].map(themeItem => {
                    const isSelected = plannerTheme === themeItem.id;
                    return (
                      <button
                        key={themeItem.id}
                        onClick={() => handleRegenerateMenu(themeItem.id as DietTheme)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer border ${
                          isSelected
                            ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                            : 'bg-[var(--surface-variant)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        <span>{themeItem.emoji}</span>
                        <span>{themeItem.label}</span>
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handleRegenerateMenu()}
                    className="ml-auto sm:ml-2 px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
                    title="Consigliami un menu coordinato"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Consigliami</span>
                  </button>
                </div>
              </div>

              {/* Notifica armonizzazione se necessaria */}
              {harmonizeNotice && (
                <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-[var(--text-main)]">{harmonizeNotice.message}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApplyHarmonization(harmonizeNotice.targetTheme)}
                      className="px-2.5 py-1 rounded-lg bg-orange-500 text-white font-extrabold text-[11px] cursor-pointer"
                    >
                      Armonizza
                    </button>
                    <button onClick={() => setHarmonizeNotice(null)} className="text-[var(--text-muted)] p-1 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── LE 3 PORTATE PRINCIPALI (ANTIPASTO, PRIMO, SECONDO) ── */}
              <div className="space-y-3">
                {[
                  {
                    key: 'antipasto' as const,
                    courseLabel: 'Antipasti' as const,
                    title: 'Antipasto',
                    emoji: '🥗',
                    dish: currentMenu.antipasto
                  },
                  {
                    key: 'primo' as const,
                    courseLabel: 'Primi' as const,
                    title: 'Primo Piatto',
                    emoji: '🍝',
                    dish: currentMenu.primo
                  },
                  {
                    key: 'secondo' as const,
                    courseLabel: 'Secondi' as const,
                    title: 'Secondo Piatto',
                    emoji: currentMenu.theme === 'pesce' ? '🐟' : currentMenu.theme === 'carne' ? '🥩' : '🥦',
                    dish: currentMenu.secondo
                  }
                ].map(({ key, courseLabel, title, emoji, dish }, courseIndex) => {
                  const isLocked = lockedCourses[key];
                  const dishTheme = dish ? classifyRecipeTheme(dish) : currentMenu.theme;

                  if (!dish) {
                    return (
                      <div
                        key={key}
                        onClick={() => {
                          setActiveCourseSwapModal(courseLabel);
                          setSwapSearchQuery('');
                          setSwapThemeFilter('all');
                        }}
                        className="p-4 sm:p-5 rounded-2xl border-2 border-dashed border-orange-500/30 hover:border-orange-500 bg-[var(--card-bg)] hover:bg-orange-500/5 flex items-center justify-between gap-4 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-xl flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                            {emoji}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-wider text-orange-500 block">
                              Portata {courseIndex + 1} · {title}
                            </span>
                            <span className="text-sm font-bold text-[var(--text-main)] group-hover:text-orange-500 transition-colors truncate block">
                              + Scegli {title}
                            </span>
                          </div>
                        </div>
                        <span className="px-3 py-1.5 rounded-xl bg-orange-500 text-white font-bold text-xs shadow-xs shrink-0">
                          Seleziona
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={key}
                      className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-xs hover:border-orange-500/40 transition-all flex flex-col sm:flex-row items-stretch"
                    >
                      <div className="sm:w-36 h-28 sm:h-auto relative bg-[var(--surface-variant)] shrink-0 overflow-hidden">
                        {dish.image ? (
                          <img 
                            src={dish.image} 
                            alt={dish.title} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.onerror = null;
                              target.src = FALLBACK_RECIPE_IMAGE;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">
                            {emoji}
                          </div>
                        )}
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white font-black text-[10px] flex items-center gap-1">
                          <span>{emoji}</span>
                          <span>{title}</span>
                        </span>
                      </div>

                      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-2.5 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase mb-1 ${
                              dishTheme === 'pesce'
                                ? 'bg-cyan-500/15 text-cyan-600'
                                : dishTheme === 'carne'
                                  ? 'bg-rose-500/15 text-rose-600'
                                  : 'bg-emerald-500/15 text-emerald-600'
                            }`}>
                              {dishTheme === 'pesce' ? '🐟 Pesce' : dishTheme === 'carne' ? '🥩 Carne' : '🥦 Vegetariano'}
                            </span>
                            <h4 className="text-sm sm:text-base font-black text-[var(--text-main)] truncate">
                              {dish.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => toggleCourseLock(key)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isLocked ? 'text-amber-500 bg-amber-500/10' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                              }`}
                              title={isLocked ? 'Piatto bloccato' : 'Blocca per i consigli'}
                            >
                              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleRemoveCourse(key)}
                              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                              title="Rimuovi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border)]">
                          <span className="text-[11px] text-[var(--text-muted)] font-medium">
                            {dish.ingredients ? `${dish.ingredients.length} ingredienti` : ''}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setActiveCourseSwapModal(courseLabel);
                                setSwapSearchQuery('');
                                setSwapThemeFilter('all');
                              }}
                              className="px-3 py-1 rounded-xl bg-[var(--surface-variant)] hover:bg-orange-500/15 text-[var(--text-main)] hover:text-orange-500 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Cambia</span>
                            </button>
                            <button
                              onClick={() => setSelectedMeal(dish)}
                              className="px-3 py-1 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Ricetta</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── CONSIGLIO CHEF & VINO COMPATTO ── */}
              {continuationAdvice && (
                <div className="p-3.5 rounded-2xl bg-orange-500/5 border border-orange-500/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👨‍🍳</span>
                    <p className="text-xs font-bold text-[var(--text-main)] leading-relaxed">
                      {continuationAdvice.reasoning || continuationAdvice.chefTip}
                    </p>
                  </div>
                  {continuationAdvice.wineTip && (
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] pt-1 border-t border-orange-500/15">
                      <Wine className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="truncate font-medium">{continuationAdvice.wineTip}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Barra Azioni Inferiore */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  onClick={handleSaveCurrentMenu}
                  className="w-full sm:w-1/4 py-3.5 px-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--surface-variant)] text-[var(--text-main)] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {menuSaveSuccess ? <Check className="w-4 h-4 text-emerald-500 stroke-[3]" /> : <Bookmark className="w-4 h-4 text-orange-500" />}
                  <span>{menuSaveSuccess ? 'Salvato!' : 'Salva Menu'}</span>
                </button>

                <button
                  onClick={() => handleOpenShareModal(currentMenu)}
                  className="w-full sm:w-1/4 py-3.5 px-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--surface-variant)] text-[var(--text-main)] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-orange-500" />
                  <span>Condividi</span>
                </button>

                <button
                  onClick={handleOpenShoppingReviewForMenu}
                  className={`w-full sm:w-2/4 py-3.5 px-5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer ${
                    menuAddedToCart
                      ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                      : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25'
                  }`}
                >
                  {menuAddedToCart ? (
                    <>
                      <Check className="w-5 h-5 stroke-[3]" />
                      <span>Ingredienti Aggiunti alla Spesa!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      <span>Aggiungi alla Spesa</span>
                    </>
                  )}
                </button>
              </div>

            </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════
          DRAWER / MODAL: SCELTA PIATTO ALTERNATIVO PER UNA PORTATA
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {activeCourseSwapModal && currentMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setActiveCourseSwapModal(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-[var(--card-bg)] border border-[var(--border)] rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                    <span>Scegli {activeCourseSwapModal === 'Antipasti' ? "un Antipasto" : activeCourseSwapModal === 'Primi' ? "un Primo" : "un Secondo"}</span>
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] font-medium">
                    I piatti coordinati con il tema del menu sono evidenziati per primi
                  </p>
                </div>
                <button
                  onClick={() => setActiveCourseSwapModal(null)}
                  className="p-2 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Ricerca interna piatti alternativi */}
              <div className="px-5 pt-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                  <input
                    type="text"
                    placeholder={`Cerca ${activeCourseSwapModal === 'Antipasti' ? 'antipasto' : activeCourseSwapModal === 'Primi' ? 'primo piatto' : 'secondo piatto'} per nome o ingrediente...`}
                    value={swapSearchQuery}
                    onChange={(e) => setSwapSearchQuery(e.target.value)}
                    className="w-full bg-[var(--surface-variant)] border border-[var(--border)] focus:border-orange-500 rounded-xl py-2 pl-9 pr-8 text-xs text-[var(--text-main)] outline-none transition-colors"
                  />
                  {swapSearchQuery && (
                    <button
                      onClick={() => setSwapSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtro Tema rapido */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
                  <span className="text-[10px] font-black uppercase text-[var(--text-muted)] mr-1 shrink-0">Filtra tema:</span>
                  {[
                    { key: 'all' as const, label: 'Tutti' },
                    { key: 'pesce' as const, label: '🐟 Pesce' },
                    { key: 'carne' as const, label: '🥩 Carne' },
                    { key: 'vegetariano' as const, label: '🥦 Veg' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setSwapThemeFilter(tab.key)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 cursor-pointer ${
                        swapThemeFilter === tab.key
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista piatti alternativi */}
              <div className="p-5 overflow-y-auto custom-scrollbar space-y-2.5 flex-1">
                {(() => {
                  let dishes = allMeals.filter(r => r.category === activeCourseSwapModal);

                  if (swapThemeFilter !== 'all') {
                    dishes = dishes.filter(r => classifyRecipeTheme(r) === swapThemeFilter);
                  }

                  if (swapSearchQuery.trim()) {
                    const q = swapSearchQuery.toLowerCase().trim();
                    dishes = dishes.filter(dish => 
                      dish.title.toLowerCase().includes(q) ||
                      (dish.ingredients && dish.ingredients.some(ing => ing.toLowerCase().includes(q)))
                    );
                  }

                  // Ordina: metti piatti coordinati col menu corrente in cima
                  dishes.sort((a, b) => {
                    const aTheme = classifyRecipeTheme(a);
                    const bTheme = classifyRecipeTheme(b);
                    const aHarmonious = (aTheme === currentMenu.theme || aTheme === 'vegetariano') ? 1 : 0;
                    const bHarmonious = (bTheme === currentMenu.theme || bTheme === 'vegetariano') ? 1 : 0;
                    return bHarmonious - aHarmonious;
                  });

                  if (dishes.length === 0) {
                    return (
                      <div className="py-12 text-center text-[var(--text-muted)] text-sm space-y-2">
                        <p>Nessun piatto trovato con questi criteri.</p>
                        {(swapSearchQuery || swapThemeFilter !== 'all') && (
                          <button
                            onClick={() => {
                              setSwapSearchQuery('');
                              setSwapThemeFilter('all');
                            }}
                            className="text-xs text-orange-500 font-bold hover:underline cursor-pointer"
                          >
                            Azzera filtri
                          </button>
                        )}
                      </div>
                    );
                  }

                  return dishes.map(dish => {
                    const dishTheme = classifyRecipeTheme(dish);
                    const isHarmonious = dishTheme === currentMenu.theme || dishTheme === 'vegetariano';

                    return (
                      <div
                        key={dish.id}
                        onClick={() => handleSelectAlternativeDish(activeCourseSwapModal, dish)}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-[var(--border)] hover:border-orange-500 hover:bg-orange-500/5 transition-all cursor-pointer group"
                      >
                        <img
                          src={dish.image}
                          alt={dish.title}
                          className="w-16 h-16 rounded-xl object-cover shrink-0 bg-[var(--surface-variant)]"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.src = FALLBACK_RECIPE_IMAGE;
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                              dishTheme === 'pesce'
                                ? 'bg-cyan-500/15 text-cyan-600'
                                : dishTheme === 'carne'
                                  ? 'bg-rose-500/15 text-rose-600'
                                  : 'bg-emerald-500/15 text-emerald-600'
                            }`}>
                              {dishTheme}
                            </span>
                            {isHarmonious && (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Coordinato</span>
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-sm text-[var(--text-main)] group-hover:text-orange-500 transition-colors truncate">
                            {dish.title}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] truncate">
                            {dish.ingredients.length} ingredienti
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-orange-500 shrink-0" />
                      </div>
                    );
                  });
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════
          DRAWER / MODAL: CERCA PIATTI PER COMPONI TU (RICERCA GLOBALE)
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isCustomDishSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[135] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setIsCustomDishSearchOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-[var(--card-bg)] border border-[var(--border)] rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header Modale Ricerca */}
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                      <span>Cerca Piatti per il Menu</span>
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium">
                      Trova una ricetta e inseriscila nel tuo menu personalizzato
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCustomDishSearchOpen(false)}
                  className="p-2 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Barra di Ricerca con Input e Reset */}
              <div className="p-4 sm:p-5 pb-2 space-y-3 border-b border-[var(--border)]/60 bg-[var(--card-bg)]">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Cerca per nome ricetta o ingrediente (es. Carbonara, Salmone, Tagliata)..."
                    value={customDishSearchQuery}
                    onChange={(e) => setCustomDishSearchQuery(e.target.value)}
                    className="w-full bg-[var(--surface-variant)] border border-[var(--border)] focus:border-orange-500 rounded-2xl py-3 pl-10 pr-10 text-xs sm:text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none transition-all shadow-xs"
                  />
                  {customDishSearchQuery && (
                    <button
                      onClick={() => setCustomDishSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--card-bg)] text-[var(--text-muted)] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtri Portata */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
                  <span className="text-[10px] font-black uppercase text-[var(--text-muted)] mr-1 shrink-0">Portata:</span>
                  {[
                    { key: 'all' as const, label: 'Tutte' },
                    { key: 'Antipasti' as const, label: '🥗 Antipasti' },
                    { key: 'Primi' as const, label: '🍝 Primi' },
                    { key: 'Secondi' as const, label: '🥩 Secondi' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setCustomSearchCourseFilter(tab.key)}
                      className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all shrink-0 cursor-pointer ${
                        customSearchCourseFilter === tab.key
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Filtri Tema (Carne / Pesce / Veg) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
                  <span className="text-[10px] font-black uppercase text-[var(--text-muted)] mr-1 shrink-0">Tema:</span>
                  {[
                    { key: 'all' as const, label: 'Tutti i temi' },
                    { key: 'pesce' as const, label: '🐟 Pesce' },
                    { key: 'carne' as const, label: '🥩 Carne' },
                    { key: 'vegetariano' as const, label: '🥦 Veg' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setCustomSearchThemeFilter(tab.key)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all shrink-0 cursor-pointer ${
                        customSearchThemeFilter === tab.key
                          ? 'bg-[var(--text-main)] text-[var(--card-bg)] shadow-xs'
                          : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Risultati della Ricerca */}
              <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-3 flex-1">
                {(() => {
                  let results = allMeals.filter(m => ['Antipasti', 'Primi', 'Secondi'].includes(m.category));

                  if (customSearchCourseFilter !== 'all') {
                    results = results.filter(m => m.category === customSearchCourseFilter);
                  }

                  if (customSearchThemeFilter !== 'all') {
                    results = results.filter(m => classifyRecipeTheme(m) === customSearchThemeFilter);
                  }

                  if (customDishSearchQuery.trim()) {
                    const q = customDishSearchQuery.toLowerCase().trim();
                    results = results.filter(m => 
                      m.title.toLowerCase().includes(q) ||
                      (m.ingredients && m.ingredients.some(ing => ing.toLowerCase().includes(q)))
                    );
                  }

                  // Ordina: se combacia col tema attuale, metti prima
                  results.sort((a, b) => {
                    const aTheme = classifyRecipeTheme(a);
                    const bTheme = classifyRecipeTheme(b);
                    const aHarmonious = (currentMenu && (aTheme === currentMenu.theme || aTheme === 'vegetariano')) ? 1 : 0;
                    const bHarmonious = (currentMenu && (bTheme === currentMenu.theme || bTheme === 'vegetariano')) ? 1 : 0;
                    return bHarmonious - aHarmonious;
                  });

                  if (results.length === 0) {
                    return (
                      <div className="py-16 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-500 mx-auto flex items-center justify-center text-xl">
                          🍽️
                        </div>
                        <h4 className="text-sm font-bold text-[var(--text-main)]">Nessun piatto trovato</h4>
                        <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
                          Prova a cercare con altri termini o azzera i filtri di portata e tema.
                        </p>
                        {(customDishSearchQuery || customSearchCourseFilter !== 'all' || customSearchThemeFilter !== 'all') && (
                          <button
                            onClick={() => {
                              setCustomDishSearchQuery('');
                              setCustomSearchCourseFilter('all');
                              setCustomSearchThemeFilter('all');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-orange-500 text-white font-bold text-xs cursor-pointer shadow-xs hover:bg-orange-600 transition-colors"
                          >
                            Azzera tutti i filtri
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 gap-2.5">
                      {results.map(dish => {
                        const dishTheme = classifyRecipeTheme(dish);
                        const isHarmonious = currentMenu && (dishTheme === currentMenu.theme || dishTheme === 'vegetariano');
                        
                        // Determina se il piatto è già presente in una portata
                        const isInMenu = currentMenu && (
                          currentMenu.antipasto?.id === dish.id ||
                          currentMenu.primo?.id === dish.id ||
                          currentMenu.secondo?.id === dish.id
                        );

                        // Determina quale portata target è naturale per questo piatto
                        const defaultCourse: 'Antipasti' | 'Primi' | 'Secondi' = 
                          customSearchCourseFilter !== 'all' 
                            ? customSearchCourseFilter 
                            : dish.category === 'Antipasti' ? 'Antipasti' 
                            : dish.category === 'Secondi' ? 'Secondi' 
                            : 'Primi';

                        const currentSlotDish = currentMenu ? (
                          defaultCourse === 'Antipasti' ? currentMenu.antipasto :
                          defaultCourse === 'Primi' ? currentMenu.primo : currentMenu.secondo
                        ) : null;

                        const isReplacing = !!currentSlotDish && currentSlotDish.id !== dish.id;

                        return (
                          <div
                            key={dish.id}
                            className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isInMenu 
                                ? 'border-emerald-500/40 bg-emerald-500/5' 
                                : 'border-[var(--border)] hover:border-orange-500/60 bg-[var(--card-bg)] shadow-xs'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={dish.image}
                                alt={dish.title}
                                className="w-14 h-14 rounded-xl object-cover shrink-0 bg-[var(--surface-variant)]"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  target.onerror = null;
                                  target.src = FALLBACK_RECIPE_IMAGE;
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[var(--surface-variant)] text-[var(--text-main)]">
                                    {dish.category === 'Antipasti' ? '🥗 Antipasto' : dish.category === 'Primi' ? '🍝 Primo' : '🥩 Secondo'}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                    dishTheme === 'pesce'
                                      ? 'bg-cyan-500/15 text-cyan-600'
                                      : dishTheme === 'carne'
                                        ? 'bg-rose-500/15 text-rose-600'
                                        : 'bg-emerald-500/15 text-emerald-600'
                                  }`}>
                                    {dishTheme === 'pesce' ? '🐟 Pesce' : dishTheme === 'carne' ? '🥩 Carne' : '🥦 Veg'}
                                  </span>
                                  {isHarmonious && (
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                      <Sparkles className="w-3 h-3" />
                                      <span>Coordinato</span>
                                    </span>
                                  )}
                                  {isInMenu && (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Nel Menu</span>
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-black text-sm text-[var(--text-main)] truncate">
                                  {dish.title}
                                </h4>
                                <p className="text-[11px] text-[var(--text-muted)] truncate">
                                  {dish.ingredients ? `${dish.ingredients.length} ingredienti` : ''}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              <button
                                onClick={() => setSelectedMeal(dish)}
                                className="p-2 rounded-xl bg-[var(--surface-variant)] hover:bg-orange-500/15 text-[var(--text-muted)] hover:text-orange-500 transition-colors cursor-pointer"
                                title="Visualizza Ricetta"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleSelectDishFromCustomSearch(dish, defaultCourse)}
                                className={`px-3 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 ${
                                  isInMenu
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                                }`}
                              >
                                {isInMenu ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    <span>Selezionato</span>
                                  </>
                                ) : isReplacing ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>Sostituisci in {defaultCourse === 'Antipasti' ? 'Antipasto' : defaultCourse === 'Primi' ? 'Primo' : 'Secondo'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                    <span>Aggiungi a {defaultCourse === 'Antipasti' ? 'Antipasto' : defaultCourse === 'Primi' ? 'Primo' : 'Secondo'}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: REVISIONE INGREDIENTI DEL MENU PRIMA DI AGGIUNGERE ALLA SPESA
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showShoppingReviewModal && currentMenu && (
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
                  { course: 'Antipasto', dish: currentMenu.antipasto },
                  { course: 'Primo', dish: currentMenu.primo },
                  { course: 'Secondo', dish: currentMenu.secondo }
                ].filter(c => c.dish && c.dish.ingredients.length > 0).map(({ course, dish }) => (
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
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
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
                  </div>
                  <button 
                    onClick={handleBack}
                    className="w-10 h-10 bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] flex items-center justify-center hover:bg-[var(--border)] hidden md:flex shrink-0 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-8">
                  {/* SEZIONE INGREDIENTI CON SELEZIONE MULTIPLA E AGGIUNTA ALLA SPESA */}
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
                              className={`flex items-center gap-2.5 text-sm py-2 px-3 rounded-2xl border transition-all cursor-pointer select-none ${
                                isChecked
                                  ? 'bg-orange-500/10 border-orange-500/30 text-[var(--text-main)] shadow-xs'
                                  : 'bg-[var(--surface-variant)]/40 border-[var(--border)] text-[var(--text-muted)] hover:border-orange-500/20'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                                isChecked ? 'bg-orange-500 text-white' : 'border border-[var(--border)] bg-[var(--card-bg)] text-transparent'
                              }`}>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>

                              <span className={`flex-1 font-medium text-xs sm:text-sm truncate ${isChecked ? 'text-[var(--text-main)] font-semibold' : 'text-[var(--text-muted)]'}`}>
                                {parsed.name}
                              </span>

                              {parsed.quantity && (
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                                  isChecked
                                    ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30'
                                    : 'bg-[var(--surface-variant)] text-[var(--text-muted)] border-transparent'
                                }`}>
                                  {parsed.quantity}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>

                      {/* Bottone Aggiungi alla Spesa */}
                      <div className="mt-4 pt-2">
                        <button
                          type="button"
                          disabled={selectedMealIngredients.size === 0}
                          onClick={handleAddSelectedToShoppingList}
                          className={`w-full py-3.5 px-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer ${
                            mealAddedToCart
                              ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                              : selectedMealIngredients.size > 0
                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25'
                                : 'bg-[var(--surface-variant)] text-[var(--text-muted)] cursor-not-allowed opacity-60'
                          }`}
                        >
                          {mealAddedToCart ? (
                            <>
                              <Check className="w-5 h-5 stroke-[3]" />
                              <span>Aggiunti alla Lista della Spesa!</span>
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-5 h-5" />
                              <span>
                                Aggiungi {selectedMealIngredients.size} {selectedMealIngredients.size === 1 ? 'ingrediente' : 'ingredienti'} alla Spesa
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </section>
                  )}

                  {/* Preparazione Steps (Redesigned with Guided Mode, Completion Tracker, Cooking Timers & Per-Step Ingredients) */}
                  {selectedMeal.steps && selectedMeal.steps.length > 0 && (() => {
                    const totalSteps = selectedMeal.steps.length;
                    const completedCount = completedSteps.size;
                    const progressPercent = Math.round((completedCount / totalSteps) * 100);
                    const isAllDone = completedCount === totalSteps;

                    return (
                      <section className="space-y-4">
                        {/* Header con Titolo, Progress Badge & Toggle Modalità */}
                        <div className="border-b border-[var(--border)] pb-3 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <ChefHat className="w-5 h-5 text-orange-500" />
                              <h3 className="text-lg font-bold text-[var(--text-main)]">
                                Preparazione
                              </h3>
                              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                                {completedCount} / {totalSteps} completati ({progressPercent}%)
                              </span>
                            </div>

                            {/* Switch Modalità: Panoramica vs Guidata */}
                            <div className="flex items-center p-1 bg-[var(--surface-variant)] rounded-xl border border-[var(--border)] text-xs font-semibold">
                              <button
                                type="button"
                                onClick={() => setStepViewMode('overview')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                  stepViewMode === 'overview'
                                    ? 'bg-[var(--card-bg)] text-orange-600 dark:text-orange-400 shadow-xs font-bold'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                }`}
                              >
                                <ListOrdered className="w-3.5 h-3.5" />
                                <span>Panoramica</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setStepViewMode('guided')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                  stepViewMode === 'guided'
                                    ? 'bg-[var(--card-bg)] text-orange-600 dark:text-orange-400 shadow-xs font-bold'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                }`}
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Modalità Guidata</span>
                              </button>
                            </div>
                          </div>

                          {/* Barra di Avanzamento Dinamica */}
                          <div className="space-y-1.5">
                            <div className="w-full h-2 rounded-full bg-[var(--surface-variant)] overflow-hidden">
                              <motion.div 
                                className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 rounded-full"
                                initial={false}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                              <span>Progresso ricetta</span>
                              <div className="flex items-center gap-3">
                                {completedCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setCompletedSteps(new Set())}
                                    className="hover:text-red-500 transition-colors cursor-pointer"
                                  >
                                    Azzera progressi
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isAllDone) {
                                      setCompletedSteps(new Set());
                                    } else {
                                      setCompletedSteps(new Set(selectedMeal.steps.map((_: any, i: number) => i)));
                                    }
                                  }}
                                  className="font-semibold text-orange-500 hover:text-orange-600 transition-colors cursor-pointer"
                                >
                                  {isAllDone ? 'Deseleziona tutti' : 'Segna tutti completati'}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Banner Celebrativo se completati tutti */}
                          {isAllDone && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300 text-xs font-bold"
                            >
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                              <span>🎉 Fantastico! Hai completato tutti i passaggi della ricetta. Buon appetito!</span>
                            </motion.div>
                          )}
                        </div>

                        {/* ─────────────────────────────────────────────────────────────
                            MODALITÀ GUIDATA PASSO-PASSO
                            ───────────────────────────────────────────────────────────── */}
                        {stepViewMode === 'guided' ? (
                          <div className="space-y-4">
                            {/* Selettore rapido dei passaggi (Mini Stepper) */}
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                              {selectedMeal.steps.map((_: any, i: number) => {
                                const isCurrent = i === activeGuidedStep;
                                const isDone = completedSteps.has(i);
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => setActiveGuidedStep(i)}
                                    className={`h-8 min-w-[2rem] px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                      isCurrent
                                        ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/25 scale-105'
                                        : isDone
                                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                          : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                    }`}
                                  >
                                    {isDone && !isCurrent ? (
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    ) : (
                                      <span>Passo {i + 1}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Card Grande del Passo Attivo */}
                            {(() => {
                              const step = selectedMeal.steps[activeGuidedStep];
                              const isStepDone = completedSteps.has(activeGuidedStep);
                              const stepIngs = getStepIngredients(step, selectedMeal.ingredients || []);
                              const detectedDuration = extractStepTimerDuration(step);
                              const timer = stepTimers[activeGuidedStep];

                              return (
                                <motion.div
                                  key={activeGuidedStep}
                                  initial={{ opacity: 0, x: 15 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -15 }}
                                  className={`p-5 md:p-6 rounded-3xl border transition-all ${
                                    isStepDone
                                      ? 'bg-emerald-500/[0.04] border-emerald-500/30'
                                      : 'bg-[var(--surface-variant)]/40 border-[var(--border)]'
                                  }`}
                                >
                                  {/* Intestazione Passo Attivo */}
                                  <div className="flex items-center justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-2.5">
                                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm transition-colors ${
                                        isStepDone
                                          ? 'bg-emerald-500 text-white shadow-xs shadow-emerald-500/25'
                                          : 'bg-orange-500 text-white shadow-xs shadow-orange-500/25'
                                      }`}>
                                        {activeGuidedStep + 1}
                                      </div>
                                      <div>
                                        <h4 className="font-extrabold text-sm md:text-base text-[var(--text-main)]">
                                          Passo {activeGuidedStep + 1} di {totalSteps}
                                        </h4>
                                        <p className="text-[11px] text-[var(--text-muted)]">
                                          {isStepDone ? 'Completato con successo' : 'In preparazione'}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Toggle completamento passo attivo */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCompletedSteps(prev => {
                                          const next = new Set(prev);
                                          if (next.has(activeGuidedStep)) next.delete(activeGuidedStep);
                                          else next.add(activeGuidedStep);
                                          return next;
                                        });
                                      }}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                        isStepDone
                                          ? 'bg-emerald-500 text-white shadow-xs'
                                          : 'bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-muted)] hover:border-emerald-500 hover:text-emerald-500'
                                      }`}
                                    >
                                      {isStepDone ? (
                                        <>
                                          <CheckCircle2 className="w-4 h-4" />
                                          <span>Fatto!</span>
                                        </>
                                      ) : (
                                        <>
                                          <Circle className="w-4 h-4" />
                                          <span>Segna fatto</span>
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  {/* Testo Passo */}
                                  <div 
                                    className={`text-[15px] md:text-base leading-relaxed text-[var(--text-main)] mb-5 font-normal ${
                                      isStepDone ? 'opacity-80' : ''
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: step }}
                                  />

                                  {/* Ingredienti del Passo Attivo */}
                                  {stepIngs.length > 0 && (
                                    <div className="mb-5 p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)]">
                                      <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Utensils className="w-3.5 h-3.5 text-orange-500" />
                                        <span>Ingredienti in questo passaggio</span>
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {stepIngs.map((name, idx) => (
                                          <span
                                            key={idx}
                                            className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/20"
                                          >
                                            {name}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Timer Integrato per il Passo Attivo */}
                                  {detectedDuration && (
                                    <div className="mb-5 p-3.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-3 shadow-xs">
                                      <div className="flex items-center gap-2.5">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                          timer?.isFinished
                                            ? 'bg-emerald-500 text-white animate-bounce'
                                            : timer?.isRunning
                                              ? 'bg-amber-500 text-white animate-pulse'
                                              : 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                                        }`}>
                                          <Timer className="w-5 h-5" />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-[var(--text-main)]">Timer Cottura</span>
                                            {timer?.isFinished && (
                                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                                Tempo Scaduto! 🔔
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-lg font-mono font-black text-[var(--text-main)] leading-none mt-0.5">
                                            {formatTimerClock(timer ? timer.remainingSeconds : detectedDuration)}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        {(!timer || !timer.isRunning) ? (
                                          <button
                                            type="button"
                                            onClick={() => handleStartTimer(activeGuidedStep, detectedDuration)}
                                            className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-sm shadow-orange-500/20"
                                          >
                                            <Play className="w-3.5 h-3.5 fill-current" />
                                            <span>{timer && timer.remainingSeconds < detectedDuration && !timer.isFinished ? 'Riprendi' : 'Avvia'}</span>
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => handlePauseTimer(activeGuidedStep)}
                                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-sm shadow-amber-500/20"
                                          >
                                            <Pause className="w-3.5 h-3.5 fill-current" />
                                            <span>Pausa</span>
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          title="Aggiungi 1 minuto"
                                          onClick={() => handleAddMinute(activeGuidedStep)}
                                          className="p-2 rounded-xl bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer text-xs font-bold"
                                        >
                                          +1m
                                        </button>

                                        {timer && (
                                          <button
                                            type="button"
                                            title="Resetta Timer"
                                            onClick={() => handleResetTimer(activeGuidedStep, detectedDuration)}
                                            className="p-2 rounded-xl bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer"
                                          >
                                            <RotateCcw className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Navigazione Guidata: Indietro / Avanti */}
                                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--border)]">
                                    <button
                                      type="button"
                                      disabled={activeGuidedStep === 0}
                                      onClick={() => setActiveGuidedStep(prev => Math.max(0, prev - 1))}
                                      className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                                        activeGuidedStep === 0
                                          ? 'opacity-40 cursor-not-allowed bg-[var(--card-bg)] text-[var(--text-muted)]'
                                          : 'bg-[var(--card-bg)] hover:bg-[var(--border)] text-[var(--text-main)] cursor-pointer shadow-xs'
                                      }`}
                                    >
                                      <ChevronLeft className="w-4 h-4" />
                                      <span>Precedente</span>
                                    </button>

                                    {activeGuidedStep < totalSteps - 1 ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!completedSteps.has(activeGuidedStep)) {
                                            setCompletedSteps(prev => new Set(prev).add(activeGuidedStep));
                                          }
                                          setActiveGuidedStep(prev => Math.min(totalSteps - 1, prev + 1));
                                        }}
                                        className="px-5 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-orange-500/20 active:scale-98 cursor-pointer"
                                      >
                                        <span>Prossimo Passo</span>
                                        <ChevronRight className="w-4 h-4" />
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
                          /* ─────────────────────────────────────────────────────────────
                             MODALITÀ PANORAMICA (LISTA COMPLETA CON TIMER & INGREDIENTI)
                             ───────────────────────────────────────────────────────────── */
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
                                    {/* Toggle completamento circolare */}
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
                                      {/* Descrizione Passo */}
                                      <p 
                                        className={`text-[14px] md:text-[15px] leading-relaxed transition-opacity ${
                                          isStepDone ? 'text-[var(--text-muted)] line-through decoration-emerald-500/50' : 'text-[var(--text-main)]'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: step }} 
                                      />

                                      {/* Ingredienti del Passo */}
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

                                      {/* Timer Inline se rilevato */}
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
          MODAL: CONDIVISIONE MENU (QR CODE & CONDIVISIONE AMICI)
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showShareMenuModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowShareMenuModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] shadow-2xl p-6 flex flex-col items-center text-center space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <Share2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-black text-[var(--text-main)]">
                  Condividi Menu
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Mostra il QR code a chi ha Chelona per inviargli questo menu
                </p>
              </div>

              {/* Titolo menu modificabile */}
              <div className="w-full text-left">
                <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                  Nome del Menu
                </label>
                <input
                  type="text"
                  value={shareMenuTitle}
                  onChange={(e) => setShareMenuTitle(e.target.value)}
                  placeholder="Nome del menu..."
                  className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-bold text-[var(--text-main)] outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* QR Code Container */}
              <div className="p-4 bg-white rounded-3xl shadow-md border border-gray-100 flex items-center justify-center">
                <QRCodeSVG
                  value={encodeMenuForSharing(showShareMenuModal, 'Tu')}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </div>

              {/* Anteprima Portate del Menu Condiviso */}
              <div className="w-full p-3 rounded-2xl bg-[var(--surface-variant)]/60 text-left text-xs space-y-1.5 border border-[var(--border)]">
                {showShareMenuModal.antipasto && (
                  <p className="truncate text-[var(--text-main)]">
                    <span className="font-bold text-orange-600">🥗 Antipasto:</span> {showShareMenuModal.antipasto.title}
                  </p>
                )}
                {showShareMenuModal.primo && (
                  <p className="truncate text-[var(--text-main)]">
                    <span className="font-bold text-orange-600">🍝 Primo:</span> {showShareMenuModal.primo.title}
                  </p>
                )}
                {showShareMenuModal.secondo && (
                  <p className="truncate text-[var(--text-main)]">
                    <span className="font-bold text-orange-600">🥩 Secondo:</span> {showShareMenuModal.secondo.title}
                  </p>
                )}
              </div>

              {/* Bottoni Azione */}
              <div className="w-full space-y-2 pt-1">
                <button
                  onClick={() => handleNativeShare(showShareMenuModal)}
                  className="w-full py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Condividi con Altre App</span>
                </button>

                <button
                  onClick={() => handleCopyShareCode(showShareMenuModal)}
                  className="w-full py-2.5 px-4 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-variant)] text-[var(--text-main)] font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {copiedShareCode ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-600">Codice Copiato!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[var(--text-muted)]" />
                      <span>Copia Codice Condivisione</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowShareMenuModal(null)}
                  className="w-full py-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  Chiudi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════
          SCHERMATA A SCHERMO INTERO: BACHECA MENU SALVATI & CONDIVISI
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
                  <div className="w-8 h-8 rounded-full bg-indigo-500/15 text-indigo-600 flex items-center justify-center font-bold">
                    📋
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[var(--text-main)]">
                      Menu Condivisi & Salvati
                    </h2>
                    <p className="text-[11px] text-[var(--text-muted)] font-semibold">
                      {savedMenus.length} {savedMenus.length === 1 ? 'menu salvato' : 'menu salvati'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottoni Scansione e Incolla Codice */}
              <div className="flex items-center gap-1.5 -mr-1">
                <button
                  onClick={() => setIsScanningMenuQr(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-600 text-white font-extrabold text-xs shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                  title="Scansiona QR di un amico"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Scansiona QR</span>
                </button>

                <button
                  onClick={() => setShowImportCodeModal(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--surface-variant)] hover:bg-indigo-500/10 text-[var(--text-main)] hover:text-indigo-600 font-extrabold text-xs border border-[var(--border)] transition-colors cursor-pointer"
                  title="Incolla codice menu ricevuto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Incolla Codice</span>
                </button>
              </div>
            </header>

            {/* Contenuto Bacheca Menu */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar max-w-4xl mx-auto w-full space-y-4 pb-20">
              
              {/* Barra Filtri e Ricerca */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Filtro Tab */}
                <div className="flex items-center p-1 rounded-2xl bg-[var(--surface-variant)]/60 border border-[var(--border)] w-full sm:w-auto">
                  {[
                    { id: 'all', label: 'Tutti' },
                    { id: 'mine', label: 'I Miei' },
                    { id: 'shared', label: 'Ricevuti' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSavedMenuFilter(f.id as any)}
                      className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        savedMenuFilter === f.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Input Ricerca Menu */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={savedMenuSearch}
                    onChange={(e) => setSavedMenuSearch(e.target.value)}
                    placeholder="Cerca per titolo o portata..."
                    className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl py-2 pl-9 pr-3 text-xs text-[var(--text-main)] outline-none"
                  />
                </div>
              </div>

              {/* Lista Menu */}
              {(() => {
                const filtered = savedMenus
                  .filter(m => {
                    if (savedMenuFilter === 'mine') return !m.isShared;
                    if (savedMenuFilter === 'shared') return m.isShared;
                    return true;
                  })
                  .filter(m => {
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
                      <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-3xl flex items-center justify-center mb-1">
                        📋
                      </div>
                      <h3 className="text-lg font-black text-[var(--text-main)]">
                        Nessun menu presente
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">
                        Crea un menu coordinato con l'assistente "Cosa mangiare oggi?" e salvalo, oppure inquadra il QR code di un amico con Chelona.
                      </p>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => {
                            setIsSavedMenusOpen(false);
                            if (!currentMenu && allMeals.length > 0) handleRegenerateMenu();
                            setIsMenuPlannerOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-orange-500 text-white font-extrabold text-xs shadow-xs cursor-pointer"
                        >
                          Crea Menu Ora
                        </button>
                        <button
                          onClick={() => setIsScanningMenuQr(true)}
                          className="px-4 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-variant)] text-[var(--text-main)] font-extrabold text-xs cursor-pointer"
                        >
                          Inquadra QR
                        </button>
                      </div>
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

                              {menu.isShared ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/15 text-indigo-600">
                                  Ricevuto
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/15 text-amber-600">
                                  Tuo Menu
                                </span>
                              )}
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
                            <div className="flex items-center gap-2.5 text-xs">
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
                            <div className="flex items-center gap-2.5 text-xs">
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
                            <div className="flex items-center gap-2.5 text-xs">
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
                        <div className="pt-1 flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleAddSavedMenuToCart(menu)}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-xs flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
                              title="Aggiungi tutti gli ingredienti di questo menu alla spesa"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>Spesa</span>
                            </button>

                            <button
                              onClick={() => handleOpenShareModal(menu)}
                              className="p-1.5 rounded-xl bg-[var(--surface-variant)] hover:bg-orange-500/10 text-[var(--text-muted)] hover:text-orange-500 border border-[var(--border)] transition-colors cursor-pointer"
                              title="Condividi o mostra QR"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleLoadSavedMenuIntoPlanner(menu)}
                              className="p-1.5 rounded-xl bg-[var(--surface-variant)] hover:bg-orange-500/10 text-[var(--text-muted)] hover:text-orange-500 border border-[var(--border)] transition-colors cursor-pointer"
                              title="Carica nell'assistente per modificarlo o cucinarlo"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>

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
          MODAL: INCOLLA CODICE MENU RICEVUTO
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showImportCodeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowImportCodeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-[var(--text-main)] flex items-center gap-2">
                  <span>📥 Incolla Codice Menu</span>
                </h3>
                <button
                  onClick={() => setShowImportCodeModal(false)}
                  className="p-1.5 rounded-full hover:bg-[var(--surface-variant)] text-[var(--text-muted)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                Incolla il codice condiviso da un amico per importare subito il suo menu su Chelona:
              </p>

              <textarea
                rows={4}
                value={importCodeInput}
                onChange={(e) => {
                  setImportCodeInput(e.target.value);
                  setImportNotice(null);
                }}
                placeholder="Incolla qui il codice (es. CHELONA_MENU:v1:...)"
                className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl p-3 text-xs font-mono text-[var(--text-main)] outline-none focus:ring-2 focus:ring-orange-500"
              />

              {importNotice && (
                <p className="text-xs font-bold text-rose-500">{importNotice}</p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setShowImportCodeModal(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-[var(--border)] font-bold text-xs text-[var(--text-muted)] hover:bg-[var(--surface-variant)] cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  onClick={handleImportCode}
                  disabled={!importCodeInput.trim()}
                  className="w-2/3 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black text-xs shadow-md shadow-orange-500/25 cursor-pointer transition-all active:scale-95"
                >
                  Importa Menu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanner QR per Menu Condiviso */}
      {isScanningMenuQr && (
        <QrScanner
          onScan={(data) => {
            setIsScanningMenuQr(false);
            const decoded = decodeMenuPayload(data);
            if (decoded) {
              saveSavedMenu(decoded);
              setSavedMenus(loadSavedMenus());
            } else {
              alert('Codice QR non riconosciuto come menu Chelona.');
            }
          }}
          onClose={() => setIsScanningMenuQr(false)}
        />
      )}
    </div>
  );
}
