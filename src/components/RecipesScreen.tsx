import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Globe, ChevronRight, X, Clock, Users, PlayCircle, BookOpen } from 'lucide-react';

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
  [key: string]: any; // per gli ingredienti
}

const translateTexts = async (texts: string[]): Promise<string[]> => {
  if (texts.length === 0) return [];
  const safeTexts = texts.map(t => (t || '').replace(/\n/g, ' ~NL~ ').replace(/\r/g, ''));
  const joinedText = safeTexts.join('\n');
  try {
    const res = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=en&tl=it', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'q=' + encodeURIComponent(joinedText)
    });
    const data = await res.json();
    const fullTranslated = data[0].map((item: any) => item[0]).join('');
    const tArray = fullTranslated.split('\n').map(s => {
      return s.replace(/~ NL ~/gi, '\n')
              .replace(/~NL~/gi, '\n')
              .replace(/~ Nl ~/gi, '\n')
              .replace(/~ nl ~/gi, '\n')
              .replace(/~nl~/gi, '\n')
              .trim();
    });
    return texts.map((_, i) => tArray[i] || texts[i]);
  } catch (err) {
    console.error('Translation error', err);
    return texts;
  }
};

export function RecipesScreen({ onClose }: RecipeScreenProps) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedMeal, setSelectedMeal] = useState<MealDetail | null>(null);
  const [loadingMeal, setLoadingMeal] = useState(false);

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
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [selectedArea]);

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

  const filteredAreas = areas.filter(a => 
    (a.strAreaIT || a.strArea).toLowerCase().includes(searchQuery.toLowerCase())
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
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
              <input
                type="text"
                placeholder="Cerca una nazione o regione..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl py-4 pl-12 pr-4 text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all shadow-sm"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredAreas.map((area, idx) => (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={area.strArea}
                  onClick={() => setSelectedArea(area)}
                  className="flex flex-col items-center gap-3 p-6 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all group"
                >
                  <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white transition-all">
                    <Globe className="w-7 h-7" />
                  </div>
                  <span className="font-bold text-[var(--text-main)] text-sm md:text-base text-center line-clamp-2">
                    {area.strAreaIT || area.strArea}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedArea(null)}
                  className="px-4 py-2 bg-[var(--surface-variant)] text-[var(--text-main)] rounded-full text-sm font-medium hover:bg-[var(--border)] transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Torna ai Paesi
                </button>
                <h2 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
                  Cucina <span className="text-orange-500">{selectedArea.strAreaIT || selectedArea.strArea}</span>
                </h2>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {meals.map((meal, idx) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    key={meal.idMeal}
                    onClick={() => loadMealDetails(meal.idMeal)}
                    className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 transition-all group flex flex-col"
                  >
                    <div className="relative aspect-square overflow-hidden shrink-0">
                      <img 
                        src={meal.strMealThumb} 
                        alt={meal.strMeal} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-5 flex-1 flex items-center">
                      <h3 className="font-bold text-[var(--text-main)] text-lg line-clamp-3 leading-tight group-hover:text-orange-500 transition-colors">
                        {meal.strMealIT || meal.strMeal}
                      </h3>
                    </div>
                  </motion.div>
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
              className="w-full max-w-4xl bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row my-auto"
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
                  <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-bold uppercase tracking-wide">
                    {selectedMeal.strAreaIT || selectedMeal.strArea}
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
