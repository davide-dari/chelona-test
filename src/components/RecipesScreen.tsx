import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Search, X, BookOpen, Star, ChefHat, Sparkles, 
  ShoppingCart, Check, RefreshCw, Lock, Unlock, Utensils, 
  Wine, ArrowRight, CheckCircle2, ChevronRight, Eye, AlertCircle,
  Share2, QrCode, Copy, Plus, Trash2, Camera, BookmarkCheck,
  Bookmark, Sliders, CheckCheck, Lightbulb, Users
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory || null);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  
  const [selectedMeal, setSelectedMeal] = useState<any | null>(null);
  const [favorites, setFavorites] = useState<any[]>([]);

  // Ingredient multi-selection inside recipe view
  const [selectedMealIngredients, setSelectedMealIngredients] = useState<Set<string>>(new Set());
  const [mealAddedToCart, setMealAddedToCart] = useState(false);

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

  // Planner mode: 'auto' (Chelona consiglia) o 'custom' (Componi tu)
  const [plannerMode, setPlannerMode] = useState<'auto' | 'custom'>('auto');

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

  // Inventory state
  const [fridgeIngredients, setFridgeIngredients] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('chelona_fridge_ingredients');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [freezerIngredients, setFreezerIngredients] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('chelona_freezer_ingredients');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [pantryIngredients, setPantryIngredients] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('chelona_pantry_ingredients');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [inventoryInput, setInventoryInput] = useState('');

  // Sincronizza verso il LocalStorage
  useEffect(() => {
    localStorage.setItem('chelona_fridge_ingredients', JSON.stringify(fridgeIngredients));
  }, [fridgeIngredients]);
  useEffect(() => {
    localStorage.setItem('chelona_freezer_ingredients', JSON.stringify(freezerIngredients));
  }, [freezerIngredients]);
  useEffect(() => {
    localStorage.setItem('chelona_pantry_ingredients', JSON.stringify(pantryIngredients));
  }, [pantryIngredients]);

  // Sincronizza dal LocalStorage/Eventi
  useEffect(() => {
    const handleFridge = () => { try { setFridgeIngredients(JSON.parse(localStorage.getItem('chelona_fridge_ingredients') || '[]')); } catch {} };
    const handleFreezer = () => { try { setFreezerIngredients(JSON.parse(localStorage.getItem('chelona_freezer_ingredients') || '[]')); } catch {} };
    const handlePantry = () => { try { setPantryIngredients(JSON.parse(localStorage.getItem('chelona_pantry_ingredients') || '[]')); } catch {} };
    
    window.addEventListener('chelona_fridge_updated', handleFridge);
    window.addEventListener('chelona_freezer_updated', handleFreezer);
    window.addEventListener('chelona_pantry_updated', handlePantry);
    return () => {
      window.removeEventListener('chelona_fridge_updated', handleFridge);
      window.removeEventListener('chelona_freezer_updated', handleFreezer);
      window.removeEventListener('chelona_pantry_updated', handlePantry);
    };
  }, []);

  useEffect(() => {
    const savedFavs = localStorage.getItem('chelona_gz_favorites');
    if (savedFavs) {
      try { setFavorites(JSON.parse(savedFavs)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (initialRecipe) {
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

  // Quando si apre una ricetta, seleziona tutti gli ingredienti di default
  useEffect(() => {
    if (selectedMeal && Array.isArray(selectedMeal.ingredients)) {
      setSelectedMealIngredients(new Set(selectedMeal.ingredients));
      setMealAddedToCart(false);
    } else {
      setSelectedMealIngredients(new Set());
    }
  }, [selectedMeal]);

  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

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
    if (selectedCategory || searchQuery) {
      if (initialSearchQuery || initialCategory) {
        onClose();
      } else {
        setSelectedCategory(null);
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
    activeCourseSwapModal, 
    selectedMeal, 
    isMenuPlannerOpen, 
    isSavedMenusOpen,
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
                id: m.id || `gz_${i}`,
                title: m.title || m.nome,
                image: m.image,
                category: cat,
                ingredients: m.ingredients || m.ingredienti || [],
                steps: parsedSteps,
                calories: m.calories,
                protein: m.protein,
                carbs: m.carbs,
                fat: m.fat,
                tags: m.tags
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
    setMenuAddedToCart(false);
  };

  // Seleziona un piatto dai suggerimenti di continuazione di Chelona
  const handleSelectSuggestedDish = (courseKey: 'antipasto' | 'primo' | 'secondo', dish: RecipeItem) => {
    const courseLabel = courseKey === 'antipasto' ? 'Antipasti' : courseKey === 'primo' ? 'Primi' : 'Secondi';
    handleSelectAlternativeDish(courseLabel, dish);
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
    setPlannerMode('custom');
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

  const FIXED_CATEGORIES = ['Fitness & Dieta', 'Antipasti', 'Primi', 'Secondi', 'Dolci', 'Colazione'];

  const categories = useMemo(() => {
    return FIXED_CATEGORIES;
  }, []);

  const filteredMeals = useMemo(() => {
    if (selectedCategory === 'favorites') {
      if (!searchQuery) return favorites;
      return favorites.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    const isInventoryCategory = selectedCategory === 'fridge' || selectedCategory === 'freezer' || selectedCategory === 'pantry';

    if (isInventoryCategory) {
      const allInventoryIngredients = [...new Set([...fridgeIngredients, ...freezerIngredients, ...pantryIngredients])];
      if (allInventoryIngredients.length === 0) return [];
      
      const scored = allMeals.map(meal => {
        let score = 0;
        const recipeIngsText = meal.ingredients && meal.ingredients.length > 0 ? meal.ingredients.join(' ').toLowerCase() : meal.steps.join(' ').toLowerCase();
        
        allInventoryIngredients.forEach(ing => {
          if (recipeIngsText.includes(ing.toLowerCase())) {
            score += 1;
          }
        });

        const missingIngredients = (meal.ingredients || []).filter((ing: string) => {
          return !allInventoryIngredients.some(f => ing.toLowerCase().includes(f.toLowerCase()));
        });

        return { ...meal, fridgeScore: score, missingIngredients };
      }).filter(m => (m as any).fridgeScore > 0);
      
      return scored.sort((a, b) => {
        if ((b as any).fridgeScore !== (a as any).fridgeScore) {
          return (b as any).fridgeScore - (a as any).fridgeScore; // Most matched ingredients first
        }
        return (a as any).missingIngredients.length - (b as any).missingIngredients.length; // Least missing ingredients first
      });
    }

    return allMeals.filter(meal => {
      const matchCat = selectedCategory ? meal.category === selectedCategory : true;
      const matchSearch = searchQuery ? meal.title.toLowerCase().includes(searchQuery.toLowerCase()) : true;
      return matchCat && matchSearch;
    });
  }, [allMeals, selectedCategory, searchQuery, favorites, fridgeIngredients, freezerIngredients, pantryIngredients]);

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
        {!selectedCategory && !searchQuery ? (
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
              <input
                type="text"
                placeholder="Cerca una ricetta italiana..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl py-4 pl-12 pr-4 text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all shadow-sm"
              />
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
                    onClick={() => setSelectedCategory('fridge')}
                    className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-cyan-100 to-blue-200 border border-cyan-300 rounded-2xl transition-all shadow-sm group hover:shadow-md cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-[var(--surface-variant)] text-[var(--text-muted)] mb-1">
                      📦 Inventario
                    </span>
                    <div className="text-3xl mb-1">❄️</div>
                    <span className="font-bold text-blue-800 text-sm text-center">Il mio Frigo</span>
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
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <h2 className="text-xl sm:text-2xl font-black text-[var(--text-main)] flex items-center gap-2">
                  {selectedCategory === 'favorites' ? (
                    <>⭐ Preferiti</>
                  ) : ['fridge', 'freezer', 'pantry'].includes(selectedCategory || '') ? (
                    <>📦 Il mio Inventario</>
                  ) : searchQuery && !selectedCategory ? (
                    <>Ricerca: <span className="text-orange-500">{searchQuery}</span></>
                  ) : (
                    <>Categoria <span className="text-orange-500 capitalize">{selectedCategory}</span></>
                  )}
                </h2>
              </div>
              
              {!['fridge', 'freezer', 'pantry'].includes(selectedCategory || '') && (
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
              )}
            </div>

            {/* Inventory Controls */}
            {['fridge', 'freezer', 'pantry'].includes(selectedCategory || '') && (() => {
              const allInventoryCount = fridgeIngredients.length + freezerIngredients.length + pantryIngredients.length;
              
              const activeList = selectedCategory === 'fridge' ? fridgeIngredients 
                                : selectedCategory === 'freezer' ? freezerIngredients 
                                : pantryIngredients;
                                
              const setActiveList = selectedCategory === 'fridge' ? setFridgeIngredients
                                   : selectedCategory === 'freezer' ? setFreezerIngredients
                                   : setPantryIngredients;
                                   
              const getIcon = (cat: string) => cat === 'fridge' ? '🧊' : cat === 'freezer' ? '❄️' : '📦';
              const getColor = (cat: string) => cat === 'fridge' ? 'sky' : cat === 'freezer' ? 'indigo' : 'orange';
              const colorPrefix = getColor(selectedCategory!);
              const INV_STYLE: Record<string, { chip: string; remove: string; selected: string; hover: string }> = {
                sky: {
                  chip: 'bg-sky-500/10 text-sky-500 border border-sky-500/20',
                  remove: 'bg-sky-500/20 text-sky-600',
                  selected: 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/20',
                  hover: 'hover:border-sky-500'
                },
                indigo: {
                  chip: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20',
                  remove: 'bg-indigo-500/20 text-indigo-600',
                  selected: 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20',
                  hover: 'hover:border-indigo-500'
                },
                orange: {
                  chip: 'bg-orange-500/10 text-orange-500 border border-orange-500/20',
                  remove: 'bg-orange-500/20 text-orange-600',
                  selected: 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20',
                  hover: 'hover:border-orange-500'
                }
              };
              const style = INV_STYLE[colorPrefix];

              return (
              <div className="bg-[var(--card-bg)] p-6 rounded-[2.5rem] border border-[var(--border)] shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
                  <div>
                    <h3 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2">
                      <span className="text-2xl">📦</span> Inventario Casa
                    </h3>
                    <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">
                      {allInventoryCount === 0 
                        ? 'Seleziona gli ingredienti che hai in casa per trovare ricette su misura' 
                        : `Hai ${allInventoryCount} ingredienti salvati in casa • ${filteredMeals.length} ricette abbinabili trovate!`}
                    </p>
                  </div>
                  {allInventoryCount > 0 && (
                    <button 
                      onClick={() => {
                        setFridgeIngredients([]);
                        setFreezerIngredients([]);
                        setPantryIngredients([]);
                        localStorage.removeItem('chelona_fridge_ingredients');
                        localStorage.removeItem('chelona_freezer_ingredients');
                        localStorage.removeItem('chelona_pantry_ingredients');
                      }}
                      className="text-xs font-bold text-red-500 hover:text-red-600 px-3 py-1.5 rounded-xl border border-red-500/20 hover:bg-red-500/10 transition-colors"
                    >
                      Svuota tutto
                    </button>
                  )}
                </div>

                {/* Sub-Tabs: Frigo, Freezer, Dispensa */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {[
                    { id: 'fridge', label: '🧊 Frigorifero', count: fridgeIngredients.length },
                    { id: 'freezer', label: '❄️ Freezer', count: freezerIngredients.length },
                    { id: 'pantry', label: '📦 Dispensa', count: pantryIngredients.length }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedCategory(tab.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                        selectedCategory === tab.id
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                          : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-black/15 text-[10px]">{tab.count}</span>
                    </button>
                  ))}
                </div>

                {/* Manual Add Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Aggiungi a ${selectedCategory === 'fridge' ? 'Frigo' : selectedCategory === 'freezer' ? 'Freezer' : 'Dispensa'}...`}
                    value={inventoryInput}
                    onChange={(e) => setInventoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inventoryInput.trim()) {
                        const val = inventoryInput.trim().toLowerCase();
                        if (!activeList.includes(val)) {
                          setActiveList(prev => [...prev, val]);
                        }
                        setInventoryInput('');
                      }
                    }}
                    className="flex-1 bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={() => {
                      if (inventoryInput.trim()) {
                        const val = inventoryInput.trim().toLowerCase();
                        if (!activeList.includes(val)) {
                          setActiveList(prev => [...prev, val]);
                        }
                        setInventoryInput('');
                      }
                    }}
                    className="px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-orange-500/20 active:scale-95 shrink-0 cursor-pointer"
                  >
                    + Aggiungi
                  </button>
                </div>

                {/* Active Stock Chips */}
                {activeList.length > 0 && (
                  <div className="bg-[var(--bg)] p-4 rounded-2xl border border-[var(--border)]">
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">Ingredienti in {selectedCategory === 'fridge' ? 'Frigo' : selectedCategory === 'freezer' ? 'Freezer' : 'Dispensa'} ({activeList.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {activeList.map(ing => (
                        <span key={ing} className={`inline-flex items-center gap-1.5 ${style.chip} px-3.5 py-1.5 rounded-xl text-xs font-extrabold capitalize shadow-xs`}>
                          <span>{getIcon(selectedCategory!)} {ing}</span>
                          <button 
                            onClick={() => setActiveList(prev => prev.filter(i => i !== ing))} 
                            className={`w-4 h-4 rounded-full ${style.remove} hover:bg-red-500/30 hover:text-red-500 flex items-center justify-center text-xs transition-colors ml-1 cursor-pointer`}
                            title="Rimuovi"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              );
            })()}

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
                        {selectedCategory === 'fridge' && (meal as any).missingIngredients !== undefined && (
                          (meal as any).missingIngredients.length === 0 ? (
                            <span className="text-[10px] font-bold text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                              ✅ Hai tutto!
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                              ❌ Mancano {(meal as any).missingIngredients.length}
                            </span>
                          )
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
        {isMenuPlannerOpen && currentMenu && (
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
                  {plannerMode === 'auto' ? 'Menu coordinato automatico' : 'Componi il tuo menu con i consigli dello Chef'}
                </p>
              </div>
              <div className="flex items-center gap-1 -mr-2">
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
                {plannerMode === 'auto' && (
                  <button
                    onClick={() => handleRegenerateMenu()}
                    className="p-2 hover:bg-orange-500/10 text-orange-500 rounded-full transition-colors cursor-pointer"
                    title="Rigenera menu casuale"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                )}
              </div>
            </header>

            {/* Contenuto scrollabile del Menu Planner */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar max-w-4xl mx-auto w-full space-y-5 pb-24">
              
              {/* Switcher Modalità: Chelona Consiglia / Componi Tu */}
              <div className="flex items-center p-1 rounded-2xl bg-[var(--surface-variant)]/80 border border-[var(--border)] max-w-sm mx-auto w-full">
                <button
                  onClick={() => setPlannerMode('auto')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    plannerMode === 'auto'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Chelona Consiglia</span>
                </button>
                <button
                  onClick={() => setPlannerMode('custom')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    plannerMode === 'custom'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  <span>Componi Tu</span>
                </button>
              </div>

              {/* Sezione Controlli e Assistente per AUTO MODE */}
              {plannerMode === 'auto' && (
                <div className="bg-[var(--card-bg)] p-4 rounded-3xl border border-[var(--border)] shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Selettore Pranzo / Cena */}
                    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--surface-variant)]/60 border border-[var(--border)]">
                      <button
                        onClick={() => handleRegenerateMenu(undefined, 'pranzo')}
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
                        onClick={() => handleRegenerateMenu(undefined, 'cena')}
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

                    {/* Selettore Tema: Carne / Pesce / Vegetariano / Sorprendimi */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                      {[
                        { id: 'carne', label: 'Carne', emoji: '🥩' },
                        { id: 'pesce', label: 'Pesce', emoji: '🐟' },
                        { id: 'vegetariano', label: 'Vegetariano', emoji: '🥦' },
                        { id: 'sorprendimi', label: 'Sorprendimi', emoji: '🎲' }
                      ].map(themeItem => {
                        const isSelected = plannerTheme === themeItem.id;
                        return (
                          <button
                            key={themeItem.id}
                            onClick={() => handleRegenerateMenu(themeItem.id as DietTheme)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer border ${
                              isSelected
                                ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                                : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border)] hover:border-orange-500/30 hover:text-[var(--text-main)]'
                            }`}
                          >
                            <span>{themeItem.emoji}</span>
                            <span>{themeItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Banner Notifica Armonizzazione */}
                  {harmonizeNotice && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        <p className="font-bold text-[var(--text-main)]">{harmonizeNotice.message}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApplyHarmonization(harmonizeNotice.targetTheme)}
                          className="px-3 py-1.5 rounded-xl bg-orange-500 text-white font-extrabold text-xs shadow-xs hover:bg-orange-600 transition-colors cursor-pointer"
                        >
                          ✨ Armonizza Menu
                        </button>
                        <button
                          onClick={() => setHarmonizeNotice(null)}
                          className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Box Consiglio dello Chef & Sommelier */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-500/20 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider text-[10px]">
                      <ChefHat className="w-3.5 h-3.5" />
                      <span>Consiglio dello Chef</span>
                    </div>
                    <p className="text-[var(--text-main)] font-semibold leading-relaxed">
                      {currentMenu.chefAdvice}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 font-medium pt-1 border-t border-[var(--border)]/50">
                      <Wine className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{currentMenu.wineAdvice}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Sezione Controlli e Assistente per CUSTOM MODE (Componi Tu) */}
              {plannerMode === 'custom' && (
                <div className="space-y-4">
                  <div className="bg-[var(--card-bg)] p-4 rounded-3xl border border-[var(--border)] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Selettore Pranzo / Cena */}
                    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--surface-variant)]/60 border border-[var(--border)]">
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

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setCurrentMenu({
                            id: `menu_${Date.now()}`,
                            mealType: plannerMealType,
                            theme: 'pesce',
                            antipasto: null,
                            primo: null,
                            secondo: null,
                            chefAdvice: '',
                            wineAdvice: ''
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-bold transition-colors cursor-pointer"
                      >
                        Svuota Menu
                      </button>
                      {(!currentMenu.antipasto || !currentMenu.primo || !currentMenu.secondo) && (
                        <button
                          onClick={handleAutoCompleteMenu}
                          className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Completa per Me</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Box Intelligenza Chelona: Consigli di Continuazione */}
                  {continuationAdvice && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-orange-500/25 space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center text-sm shadow-xs font-bold">
                            👨‍🍳
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">
                              Chelona Culinaria
                            </h4>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase mt-0.5 ${
                              continuationAdvice.detectedTheme === 'pesce'
                                ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                                : continuationAdvice.detectedTheme === 'carne'
                                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            }`}>
                              {continuationAdvice.detectedTheme === 'pesce' ? '🐟 Tema Mare' : continuationAdvice.detectedTheme === 'carne' ? '🥩 Tema Terra' : '🥦 Tema Vegetariano'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-[var(--text-main)] leading-relaxed">
                        {continuationAdvice.reasoning}
                      </p>

                      {/* Avviso Conflitto di Tema */}
                      {continuationAdvice.hasThemeConflict && (
                        <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-xs font-bold text-amber-900 dark:text-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>{continuationAdvice.conflictMessage}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleApplyHarmonization('pesce')}
                              className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-[10px] font-extrabold cursor-pointer transition-colors"
                            >
                              🐟 Tutto Pesce
                            </button>
                            <button
                              onClick={() => handleApplyHarmonization('carne')}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold cursor-pointer transition-colors"
                            >
                              🥩 Tutto Carne
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-[var(--border)]/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-medium">
                          <ChefHat className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                          <span className="truncate">{continuationAdvice.chefTip}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[var(--text-muted)] font-medium">
                          <Wine className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate">{continuationAdvice.wineTip}</span>
                        </div>
                      </div>

                      {/* Suggerimenti rapidi per le portate vuote */}
                      {(!currentMenu.antipasto || !currentMenu.primo || !currentMenu.secondo) && (
                        <div className="pt-2 space-y-2.5 border-t border-[var(--border)]/60">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                            <Lightbulb className="w-3 h-3 text-amber-500" />
                            <span>Tocca per inserire le portate coordinate consigliate dallo Chef:</span>
                          </span>
                          
                          {!currentMenu.antipasto && continuationAdvice.suggestedAntipasti.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400">🥗 Per Antipasto:</span>
                              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                {continuationAdvice.suggestedAntipasti.slice(0, 3).map(dish => (
                                  <button
                                    key={dish.id}
                                    onClick={() => handleSelectSuggestedDish('antipasto', dish)}
                                    className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] hover:border-orange-500 hover:bg-orange-50/10 shrink-0 transition-all text-left cursor-pointer group shadow-xs"
                                  >
                                    {dish.image ? (
                                      <img src={dish.image} alt={dish.title} className="w-8 h-8 rounded-lg object-cover" />
                                    ) : (
                                      <span className="w-8 h-8 rounded-lg bg-[var(--surface-variant)] flex items-center justify-center text-sm">🥗</span>
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-[var(--text-main)] truncate max-w-[120px] group-hover:text-orange-500 transition-colors">
                                        {dish.title}
                                      </p>
                                      <span className="text-[9px] text-orange-500 font-extrabold">+ Scegli</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {!currentMenu.primo && continuationAdvice.suggestedPrimi.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400">🍝 Per Primo Piatto:</span>
                              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                {continuationAdvice.suggestedPrimi.slice(0, 3).map(dish => (
                                  <button
                                    key={dish.id}
                                    onClick={() => handleSelectSuggestedDish('primo', dish)}
                                    className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] hover:border-orange-500 hover:bg-orange-50/10 shrink-0 transition-all text-left cursor-pointer group shadow-xs"
                                  >
                                    {dish.image ? (
                                      <img src={dish.image} alt={dish.title} className="w-8 h-8 rounded-lg object-cover" />
                                    ) : (
                                      <span className="w-8 h-8 rounded-lg bg-[var(--surface-variant)] flex items-center justify-center text-sm">🍝</span>
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-[var(--text-main)] truncate max-w-[120px] group-hover:text-orange-500 transition-colors">
                                        {dish.title}
                                      </p>
                                      <span className="text-[9px] text-orange-500 font-extrabold">+ Scegli</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {!currentMenu.secondo && continuationAdvice.suggestedSecondi.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400">🥩 Per Secondo Piatto:</span>
                              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                {continuationAdvice.suggestedSecondi.slice(0, 3).map(dish => (
                                  <button
                                    key={dish.id}
                                    onClick={() => handleSelectSuggestedDish('secondo', dish)}
                                    className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] hover:border-orange-500 hover:bg-orange-50/10 shrink-0 transition-all text-left cursor-pointer group shadow-xs"
                                  >
                                    {dish.image ? (
                                      <img src={dish.image} alt={dish.title} className="w-8 h-8 rounded-lg object-cover" />
                                    ) : (
                                      <span className="w-8 h-8 rounded-lg bg-[var(--surface-variant)] flex items-center justify-center text-sm">🥩</span>
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-[var(--text-main)] truncate max-w-[120px] group-hover:text-orange-500 transition-colors">
                                        {dish.title}
                                      </p>
                                      <span className="text-[9px] text-orange-500 font-extrabold">+ Scegli</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}

              {/* ── LE 3 PORTATE (ANTIPASTO, PRIMO, SECONDO) ── */}
              <div className="space-y-4">
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
                ].map(({ key, courseLabel, title, emoji, dish }) => {
                  const isLocked = lockedCourses[key];
                  const dishTheme = dish ? classifyRecipeTheme(dish) : currentMenu.theme;

                  // Se il piatto non è ancora selezionato in modalità composizione libera
                  if (!dish) {
                    return (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => {
                          setActiveCourseSwapModal(courseLabel);
                          setSwapSearchQuery('');
                        }}
                        className="p-5 sm:p-6 rounded-3xl border-2 border-dashed border-[var(--border)] hover:border-orange-500/60 bg-[var(--card-bg)]/50 hover:bg-orange-500/5 flex items-center justify-between gap-4 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-14 h-14 rounded-2xl bg-[var(--surface-variant)] text-2xl flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                            {emoji}
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                              {title}
                            </span>
                            <h4 className="text-sm sm:text-base font-black text-[var(--text-main)] group-hover:text-orange-500 transition-colors">
                              + Seleziona {title}
                            </h4>
                            <p className="text-[11px] text-[var(--text-muted)] font-medium">
                              Tocca per scegliere dalla raccolta ricette
                            </p>
                          </div>
                        </div>

                        <div className="px-3.5 py-1.5 rounded-xl bg-orange-500 text-white font-extrabold text-xs shadow-xs group-hover:scale-105 transition-transform shrink-0">
                          Scegli
                        </div>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row relative"
                    >
                      {/* Immagine Piatto */}
                      <div className="sm:w-48 h-40 sm:h-auto relative bg-[var(--surface-variant)] shrink-0 overflow-hidden">
                        {dish?.image ? (
                          <img
                            src={dish.image}
                            alt={dish.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">
                            {emoji}
                          </div>
                        )}
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white font-extrabold text-[11px] flex items-center gap-1">
                          <span>{emoji}</span>
                          <span>{title}</span>
                        </span>
                      </div>

                      {/* Dettagli e Azioni Portata */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3 min-w-0">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              dishTheme === 'pesce'
                                ? 'bg-cyan-500/15 text-cyan-600 border border-cyan-500/30'
                                : dishTheme === 'carne'
                                  ? 'bg-rose-500/15 text-rose-600 border border-rose-500/30'
                                  : 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                            }`}>
                              {dishTheme === 'pesce' ? '🐟 Pesce' : dishTheme === 'carne' ? '🥩 Carne' : '🥦 Vegetariano'}
                            </span>
                            
                            <span className="text-[11px] text-[var(--text-muted)] font-semibold">
                              {dish?.ingredients ? `${dish.ingredients.length} ingredienti` : ''}
                            </span>
                          </div>

                          <h4 className="text-base sm:text-lg font-black text-[var(--text-main)] line-clamp-2 leading-snug">
                            {dish?.title}
                          </h4>
                        </div>

                        {/* Bottoni interattivi */}
                        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] gap-2">
                          {plannerMode === 'auto' ? (
                            <button
                              onClick={() => toggleCourseLock(key)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isLocked
                                  ? 'bg-amber-500/20 text-amber-600 border border-amber-500/40'
                                  : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                              }`}
                              title={isLocked ? "Piatto bloccato (non cambierà)" : "Blocca questo piatto per i prossimi abbinamenti"}
                            >
                              {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5" />}
                              <span>{isLocked ? 'Bloccato' : 'Blocca'}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRemoveCourse(key)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition-colors cursor-pointer"
                              title="Rimuovi piatto dal menu"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Rimuovi</span>
                            </button>
                          )}

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setActiveCourseSwapModal(courseLabel);
                                setSwapSearchQuery('');
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--surface-variant)] hover:bg-orange-500/15 text-[var(--text-main)] hover:text-orange-500 text-xs font-bold transition-colors cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Cambia</span>
                            </button>

                            {dish && (
                              <button
                                onClick={() => setSelectedMeal(dish)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-colors shadow-xs cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ricetta</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

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
              <div className="px-5 pt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Cerca piatto alternativo..."
                    value={swapSearchQuery}
                    onChange={(e) => setSwapSearchQuery(e.target.value)}
                    className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl py-2 pl-9 pr-3 text-xs text-[var(--text-main)] outline-none"
                  />
                </div>
              </div>

              {/* Lista piatti alternativi */}
              <div className="p-5 overflow-y-auto custom-scrollbar space-y-2.5 flex-1">
                {(() => {
                  const alternatives = getAlternativeDishes(
                    allMeals,
                    activeCourseSwapModal,
                    currentMenu.theme
                  ).filter(dish => !swapSearchQuery || dish.title.toLowerCase().includes(swapSearchQuery.toLowerCase()));

                  if (alternatives.length === 0) {
                    return (
                      <div className="py-12 text-center text-[var(--text-muted)] text-sm">
                        Nessun piatto alternativo trovato.
                      </div>
                    );
                  }

                  return alternatives.map(dish => {
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
                    <span className="inline-block px-3 py-1 bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                      {selectedMeal.category}
                    </span>
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
                          const isMissing = selectedCategory === 'fridge' && selectedMeal.missingIngredients?.includes(ing);

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
                              } ${isMissing ? 'ring-1 ring-red-500/40' : ''}`}
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

                              {isMissing && (
                                <span className="text-[10px] font-black bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded ml-1 shrink-0">
                                  Manca
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

                  {/* Preparazione Steps */}
                  {selectedMeal.steps && selectedMeal.steps.length > 0 && (
                    <section>
                      <h3 className="text-lg font-bold text-orange-500 mb-3 border-b border-[var(--border)] pb-2">Preparazione</h3>
                      <div className="space-y-6 mt-4">
                        {selectedMeal.steps.map((step: string, i: number) => (
                          <div key={i} className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0 mt-1 shadow-xs">
                              {i + 1}
                            </div>
                            <p className="text-[var(--text-main)] text-[15px] leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: step }} />
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
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
                                <img src={menu.antipasto.image} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
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
                                <img src={menu.primo.image} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
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
                                <img src={menu.secondo.image} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
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
