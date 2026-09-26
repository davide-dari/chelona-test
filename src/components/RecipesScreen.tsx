import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Search, X, BookOpen, Star, ChefHat, Sparkles, 
  ShoppingCart, Check, RefreshCw, Lock, Unlock, Utensils, 
  Wine, ArrowRight, CheckCircle2, ChevronRight, Eye, AlertCircle 
} from 'lucide-react';
import { 
  parseIngredient, classifyRecipeTheme, generateHarmoniousMenu, 
  getAlternativeDishes, type RecipeItem, type HarmoniousMenu, 
  type DietTheme, type MealType 
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
    showShoppingReviewModal, 
    activeCourseSwapModal, 
    selectedMeal, 
    isMenuPlannerOpen, 
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

  // Sostituzione di un piatto specifico con rilevamento armonizzazione
  const handleSelectAlternativeDish = (course: 'Antipasti' | 'Primi' | 'Secondi', dish: RecipeItem) => {
    if (!currentMenu) return;

    const courseKey = course === 'Antipasti' ? 'antipasto' : course === 'Primi' ? 'primo' : 'secondo';
    const updatedMenu = { ...currentMenu, [courseKey]: dish };

    const newDishTheme = classifyRecipeTheme(dish);
    const currentTheme = currentMenu.theme;

    // Se il tema del piatto scelto è diverso da quello attuale (es. Primo a pesce in menu carne)
    if (newDishTheme !== currentTheme && newDishTheme !== 'vegetariano') {
      const courseLabel = course === 'Antipasti' ? 'Antipasto' : course === 'Primi' ? 'Primo' : 'Secondo';
      const themeLabel = newDishTheme === 'pesce' ? 'Pesce 🐟' : 'Carne 🥩';
      setHarmonizeNotice({
        message: `Hai selezionato un ${courseLabel} a tema ${themeLabel}! Vuoi armonizzare tutto il menu a tema ${newDishTheme}?`,
        targetTheme: newDishTheme
      });
    } else {
      setHarmonizeNotice(null);
    }

    setCurrentMenu(updatedMenu);
    setActiveCourseSwapModal(null);
    setMenuAddedToCart(false);
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

        {/* Pulsante rapido header "Cosa mangiare oggi?" */}
        <button
          onClick={() => {
            if (!currentMenu && allMeals.length > 0) {
              handleRegenerateMenu();
            }
            setIsMenuPlannerOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-md shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Cosa mangiare oggi?</span>
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
                  Menu armonioso coordinato per il tuo pasto
                </p>
              </div>
              <button
                onClick={() => handleRegenerateMenu()}
                className="p-2.5 -mr-2 hover:bg-orange-500/10 text-orange-500 rounded-full transition-colors cursor-pointer"
                title="Rigenera menu casuale"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </header>

            {/* Contenuto scrollabile del Menu Planner */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar max-w-4xl mx-auto w-full space-y-6 pb-24">
              
              {/* Barra Controlli: Pranzo / Cena & Tema */}
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
                      { id: 'carne', label: 'Carne', emoji: '🥩', color: 'rose' },
                      { id: 'pesce', label: 'Pesce', emoji: '🐟', color: 'cyan' },
                      { id: 'vegetariano', label: 'Vegetariano', emoji: '🥦', color: 'emerald' },
                      { id: 'sorprendimi', label: 'Sorprendimi', emoji: '🎲', color: 'orange' }
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

                {/* Banner Notifica Armonizzazione (se utente ha cambiato portata a tema diverso) */}
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

              {/* ── LE 3 PORTATE ARMONIOSE (ANTIPASTO, PRIMO, SECONDO) ── */}
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
                            {dish?.title || 'Piatto non selezionato'}
                          </h4>
                        </div>

                        {/* Bottoni interattivi: Blocca / Cambia / Ricetta */}
                        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] gap-2">
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

              {/* Barra Azioni Inferiore: Rigenera & Aggiungi tutto alla Spesa */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => handleRegenerateMenu()}
                  className="w-full sm:w-1/3 py-3.5 px-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--surface-variant)] text-[var(--text-main)] font-extrabold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-orange-500" />
                  <span>Nuovo Abbinamento</span>
                </button>

                <button
                  onClick={handleOpenShoppingReviewForMenu}
                  className={`w-full sm:w-2/3 py-3.5 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 cursor-pointer ${
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
                      <span>Aggiungi tutto alla Spesa (3 Piatti)</span>
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
    </div>
  );
}
