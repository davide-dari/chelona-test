import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Globe, X, Clock, PlayCircle, BookOpen, Star } from 'lucide-react';

interface RecipeScreenProps {
  onClose: () => void;
}

interface Area {
  strArea: string;
  strAreaIT?: string;
}

interface Meal {
  strMeal: string;
  strMealIT?: string;
  strMealThumb: string;
  idMeal: string;
}

interface MealDetail {
  idMeal: string;
  strMeal: string;
  strMealIT?: string;
  strCategory: string;
  strCategoryIT?: string;
  strArea: string;
  strAreaIT?: string;
  strInstructions: string;
  strInstructionsIT?: string;
  strMealThumb: string;
  strTags: string;
  strYoutube: string;
  [key: string]: any;
}

const AREA_FLAGS: Record<string, string> = {
  'American': '🇺🇸', 'British': '🇬🇧', 'Canadian': '🇨🇦', 'Chinese': '🇨🇳', 'Croatian': '🇭🇷',
  'Dutch': '🇳🇱', 'Egyptian': '🇪🇬', 'Filipino': '🇵🇭', 'French': '🇫🇷', 'Greek': '🇬🇷',
  'Indian': '🇮🇳', 'Irish': '🇮🇪', 'Italian': '🇮🇹', 'Jamaican': '🇯🇲', 'Japanese': '🇯🇵',
  'Kenyan': '🇰🇪', 'Malaysian': '🇲🇾', 'Mexican': '🇲🇽', 'Moroccan': '🇲🇦', 'Polish': '🇵🇱',
  'Portuguese': '🇵🇹', 'Russian': '🇷🇺', 'Spanish': '🇪🇸', 'Thai': '🇹🇭', 'Tunisian': '🇹🇳',
  'Turkish': '🇹🇷', 'Ukrainian': '🇺🇦', 'Vietnamese': '🇻🇳', 'Unknown': '🌍', 'Preferiti': '⭐'
};

const chunkTexts = (texts: string[], maxLen = 3000): string[][] => {
  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentLen = 0;
  
  for (const text of texts) {
    const wrapped = `<t>${(text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</t>`;
    if (currentLen + wrapped.length > maxLen && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [wrapped];
      currentLen = wrapped.length;
    } else {
      currentChunk.push(wrapped);
      currentLen += wrapped.length;
    }
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);
  return chunks;
};

const translateTexts = async (texts: string[]): Promise<string[]> => {
  if (texts.length === 0) return [];
  try {
    const chunks = chunkTexts(texts, 3000);
    const results: string[] = [];
    
    for (const chunk of chunks) {
      const joinedText = chunk.join('');
      const res = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=en&tl=it', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'q=' + encodeURIComponent(joinedText)
      });
      if (!res.ok) throw new Error('Translation failed');
      const data = await res.json();
      const fullTranslated = data[0].map((item: any) => item[0]).join('');
      
      const regex = /<\s*t\s*>([\s\S]*?)<\/\s*t\s*>/gi;
      let match;
      let chunkResults = [];
      while ((match = regex.exec(fullTranslated)) !== null) {
        chunkResults.push(match[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim());
      }
      
      if (chunkResults.length !== chunk.length) {
         chunkResults = chunk.map(c => c.replace(/<t>/, '').replace(/<\/t>/, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
      }
      results.push(...chunkResults);
    }
    return texts.map((_, i) => results[i] || texts[i]);
  } catch (err) {
    console.error('Translation error', err);
    return texts;
  }
};

const translateToEnglish = async (text: string): Promise<string> => {
  if (!text) return '';
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=it&tl=en&q=${encodeURIComponent(text)}`);
    const data = await res.json();
    return data[0].map((item: any) => item[0]).join('');
  } catch (err) {
    return text;
  }
};

export function RecipesScreen({ onClose }: RecipeScreenProps) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  const [searchedMeals, setSearchedMeals] = useState<Meal[]>([]);
  const [isSearchingMeals, setIsSearchingMeals] = useState(false);

  const [selectedMeal, setSelectedMeal] = useState<MealDetail | null>(null);
  const [loadingMeal, setLoadingMeal] = useState(false);
  const [favorites, setFavorites] = useState<Meal[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('chelona_recipe_favorites');
    if (saved) {
      try { setFavorites(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    fetch('https://www.themealdb.com/api/json/v1/1/list.php?a=list')
      .then(res => res.json())
      .then(async data => {
        if (data.meals) {
          const areaNames = data.meals.map((a: any) => a.strArea);
          const translated = await translateTexts(areaNames);
          const finalAreas = data.meals.map((a: any, i: number) => ({
            ...a,
            strAreaIT: translated[i] || a.strArea
          }));
          setAreas(finalAreas);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedArea) {
      if (selectedArea.strArea === 'Preferiti') {
        setMeals(favorites);
      } else {
        setLoading(true);
        fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${selectedArea.strArea}`)
          .then(res => res.json())
          .then(async data => {
            if (data.meals) {
              const mealNames = data.meals.map((m: any) => m.strMeal);
              const translated = await translateTexts(mealNames);
              const translatedMeals = data.meals.map((m: any, i: number) => ({
                ...m,
                strMealIT: translated[i] || m.strMeal
              }));
              setMeals(translatedMeals);
            } else {
              setMeals([]);
            }
            setLoading(false);
          })
          .catch(() => setLoading(false));
      }
    }
  }, [selectedArea, favorites]);

  useEffect(() => {
    if (!selectedArea && debouncedSearchQuery.trim().length > 1) {
      const doSearch = async () => {
        setIsSearchingMeals(true);
        const engQuery = await translateToEnglish(debouncedSearchQuery);
        try {
          const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${engQuery}`);
          const data = await res.json();
          if (data.meals) {
            const mealNames = data.meals.map((m: any) => m.strMeal);
            const translated = await translateTexts(mealNames);
            const translatedMeals = data.meals.map((m: any, i: number) => ({
              ...m,
              strMealIT: translated[i] || m.strMeal
            }));
            setSearchedMeals(translatedMeals);
          } else {
            setSearchedMeals([]);
          }
        } catch (e) {
           console.error(e);
        }
        setIsSearchingMeals(false);
      };
      doSearch();
    } else {
      setSearchedMeals([]);
    }
  }, [debouncedSearchQuery, selectedArea]);

  const toggleFavorite = (meal: Meal | MealDetail, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const exists = prev.some(m => m.idMeal === meal.idMeal);
      let updated;
      if (exists) {
        updated = prev.filter(m => m.idMeal !== meal.idMeal);
      } else {
        updated = [{ idMeal: meal.idMeal, strMeal: meal.strMeal, strMealIT: meal.strMealIT || meal.strMeal, strMealThumb: meal.strMealThumb }, ...prev];
      }
      localStorage.setItem('chelona_recipe_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const isFavorite = (idMeal: string) => favorites.some(m => m.idMeal === idMeal);

  const loadMealDetails = (id: string) => {
    setLoadingMeal(true);
    fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`)
      .then(res => res.json())
      .then(async data => {
        if (data.meals && data.meals.length > 0) {
          const meal = data.meals[0] as MealDetail;
          const textsToTranslate = [];
          textsToTranslate.push(meal.strMeal);
          textsToTranslate.push(meal.strCategory);
          textsToTranslate.push(meal.strArea);
          textsToTranslate.push(meal.strInstructions);
          
          for (let i = 1; i <= 20; i++) {
            const ingredient = meal[`strIngredient${i}`];
            const measure = meal[`strMeasure${i}`];
            if (ingredient && ingredient.trim() !== '') {
               textsToTranslate.push(ingredient);
               textsToTranslate.push(measure);
            }
          }
          
          const translated = await translateTexts(textsToTranslate);
          
          let idx = 0;
          meal.strMealIT = translated[idx++] || meal.strMeal;
          meal.strCategoryIT = translated[idx++] || meal.strCategory;
          meal.strAreaIT = translated[idx++] || meal.strArea;
          meal.strInstructionsIT = translated[idx++] || meal.strInstructions;
          
          for (let i = 1; i <= 20; i++) {
            const ingredient = meal[`strIngredient${i}`];
            if (ingredient && ingredient.trim() !== '') {
              meal[`strIngredientIT${i}`] = translated[idx++] || ingredient;
              meal[`strMeasureIT${i}`] = translated[idx++] || meal[`strMeasure${i}`];
            }
          }
          setSelectedMeal(meal);
        }
        setLoadingMeal(false);
      })
      .catch(() => setLoadingMeal(false));
  };

  const getIngredients = (meal: MealDetail) => {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredientIT${i}`] || meal[`strIngredient${i}`];
      const measure = meal[`strMeasureIT${i}`] || meal[`strMeasure${i}`];
      if (ingredient && ingredient.trim() !== '') {
        ingredients.push({ ingredient, measure });
      }
    }
    return ingredients;
  };

  const extendedAreas = [{ strArea: 'Preferiti', strAreaIT: 'Preferiti' }, ...areas];
  const filteredAreas = extendedAreas.filter(a => 
    (a.strAreaIT || a.strArea).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const MealCard = ({ meal, idx }: { meal: Meal, idx: number }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.05 }}
      key={meal.idMeal}
      onClick={() => loadMealDetails(meal.idMeal)}
      className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 transition-all group flex flex-col relative"
    >
      <div className="relative aspect-square overflow-hidden shrink-0">
        <img 
          src={meal.strMealThumb} 
          alt={meal.strMeal} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <button 
          onClick={(e) => toggleFavorite(meal, e)}
          className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/60 transition-colors z-10"
        >
          <Star className={`w-5 h-5 ${isFavorite(meal.idMeal) ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`} />
        </button>
      </div>
      <div className="p-5 flex-1 flex items-center">
        <h3 className="font-bold text-[var(--text-main)] text-lg line-clamp-3 leading-tight group-hover:text-orange-500 transition-colors">
          {meal.strMealIT || meal.strMeal}
        </h3>
      </div>
    </motion.div>
  );

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] font-sans relative">
      <header className="h-16 lg:h-20 bg-[var(--bg)] px-6 flex items-center justify-between shrink-0 z-10 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] transition-all flex items-center justify-center"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-[var(--text-main)]">Ricettario Mondiale</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        {!selectedArea ? (
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="relative max-w-4xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
              <input
                type="text"
                placeholder="Cerca una ricetta, nazione o regione..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl py-4 pl-12 pr-4 text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all shadow-sm"
              />
            </div>

            {debouncedSearchQuery.trim().length > 1 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Search className="w-5 h-5 text-orange-500" /> Ricette trovate
                </h3>
                {isSearchingMeals ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                  </div>
                ) : searchedMeals.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {searchedMeals.map((meal, idx) => (
                      <MealCard meal={meal} idx={idx} key={meal.idMeal} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--text-muted)]">Nessuna ricetta trovata per "{debouncedSearchQuery}"</p>
                )}
                
                {filteredAreas.length > 0 && <div className="h-px bg-[var(--border)] my-8" />}
              </div>
            )}

            {filteredAreas.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Globe className="w-5 h-5 text-orange-500" /> Categorie e Nazioni
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredAreas.map((area, idx) => (
                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={area.strArea}
                      onClick={() => setSelectedArea(area)}
                      className={`flex flex-col items-center gap-3 p-6 bg-[var(--card-bg)] border ${area.strArea === 'Preferiti' ? 'border-yellow-500/30 hover:shadow-yellow-500/20' : 'border-[var(--border)] hover:border-orange-500/50 hover:shadow-orange-500/10'} rounded-2xl hover:shadow-lg transition-all group`}
                    >
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-all ${area.strArea === 'Preferiti' ? 'bg-yellow-50 shadow-inner' : 'bg-[var(--surface-variant)]'}`}>
                        {AREA_FLAGS[area.strArea] || '🌍'}
                      </div>
                      <span className="font-bold text-[var(--text-main)] text-sm md:text-base text-center line-clamp-2">
                        {area.strAreaIT || area.strArea}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedArea(null)}
                  className="px-4 py-2 bg-[var(--surface-variant)] text-[var(--text-main)] rounded-full text-sm font-medium hover:bg-[var(--border)] transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Indietro
                </button>
                <h2 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
                  {selectedArea.strArea === 'Preferiti' ? (
                    <><Star className="w-6 h-6 text-yellow-500 fill-yellow-500" /> Le mie Preferite</>
                  ) : (
                    <>Cucina <span className="text-orange-500">{selectedArea.strAreaIT || selectedArea.strArea}</span></>
                  )}
                </h2>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : meals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <BookOpen className="w-16 h-16 text-[var(--text-muted)] mb-4" />
                <p className="text-[var(--text-main)] font-bold text-xl">Nessuna ricetta presente.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {meals.map((meal, idx) => (
                  <MealCard meal={meal} idx={idx} key={meal.idMeal} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <AnimatePresence>
        {selectedMeal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 overflow-y-auto"
            onClick={() => setSelectedMeal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row my-auto relative"
            >
              <div className="w-full md:w-2/5 h-64 md:h-auto relative shrink-0">
                <img 
                  src={selectedMeal.strMealThumb} 
                  alt={selectedMeal.strMeal} 
                  className="w-full h-full object-cover"
                />
                <button 
                  onClick={() => setSelectedMeal(null)}
                  className="absolute top-4 left-4 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:bg-black/70 md:hidden"
                >
                  <X className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => toggleFavorite(selectedMeal)}
                  className="absolute top-4 right-4 w-12 h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/70 transition-colors z-10 shadow-lg"
                >
                  <Star className={`w-6 h-6 ${isFavorite(selectedMeal.idMeal) ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`} />
                </button>
              </div>

              <div className="w-full md:w-3/5 p-6 md:p-8 flex flex-col max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--text-main)] leading-tight">
                    {selectedMeal.strMealIT || selectedMeal.strMeal}
                  </h2>
                  <button 
                    onClick={() => setSelectedMeal(null)}
                    className="w-10 h-10 bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] flex items-center justify-center hover:bg-[var(--border)] hidden md:flex shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                    {AREA_FLAGS[selectedMeal.strArea]} {selectedMeal.strAreaIT || selectedMeal.strArea}
                  </span>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-xs font-bold uppercase tracking-wide">
                    {selectedMeal.strCategoryIT || selectedMeal.strCategory}
                  </span>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-main)] mb-3 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-orange-500" /> Ingredienti
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {getIngredients(selectedMeal).map((ing, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-[var(--surface-variant)]">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                          <span className="font-semibold text-[var(--text-main)]">{ing.ingredient}</span>
                          <span className="text-[var(--text-muted)] text-sm ml-auto text-right">{ing.measure}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-main)] mb-3 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange-500" /> Preparazione
                    </h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-[var(--text-main)] space-y-4">
                      {(selectedMeal.strInstructionsIT || selectedMeal.strInstructions).split('\n').filter(p => p.trim()).map((paragraph, i) => (
                        <p key={i} className="leading-relaxed">{paragraph}</p>
                      ))}
                    </div>
                  </div>

                  {selectedMeal.strYoutube && (
                    <a 
                      href={selectedMeal.strYoutube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold transition-all w-full justify-center md:w-auto"
                    >
                      <PlayCircle className="w-5 h-5" />
                      Guarda su YouTube
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {loadingMeal && (
        <div className="fixed inset-0 z-[110] bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-[var(--card-bg)] p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            <span className="font-bold text-[var(--text-main)]">Caricamento ricetta...</span>
          </div>
        </div>
      )}
    </div>
  );
}
