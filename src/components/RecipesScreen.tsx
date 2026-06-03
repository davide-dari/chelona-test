import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, X, BookOpen, Star, ChefHat } from 'lucide-react';

interface RecipeScreenProps {
  onClose: () => void;
}

export function RecipesScreen({ onClose }: RecipeScreenProps) {
  const [allMeals, setAllMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedMeal, setSelectedMeal] = useState<any | null>(null);
  const [favorites, setFavorites] = useState<any[]>([]);

  useEffect(() => {
    const savedFavs = localStorage.getItem('chelona_gz_favorites');
    if (savedFavs) {
      try { setFavorites(JSON.parse(savedFavs)); } catch (e) {}
    }
  }, []);

  const handleBack = useCallback(() => {
    if (selectedMeal) {
      setSelectedMeal(null);
    } else if (selectedCategory || searchQuery) {
      setSelectedCategory(null);
      setSearchQuery('');
    } else {
      onClose();
    }
  }, [selectedMeal, selectedCategory, searchQuery, onClose]);

  useEffect(() => {
    window.addEventListener('recipes-back', handleBack);
    return () => window.removeEventListener('recipes-back', handleBack);
  }, [handleBack]);

  useEffect(() => {
    // Load the static JSON containing GialloZafferano scraped recipes
    fetch('/gz_recipes.json')
      .then(res => res.json())
      .then(data => {
        if(Array.isArray(data)) {
          setAllMeals(data);
        }
        setLoading(false);
      })
      .catch(e => {
        console.error("Failed to load recipes", e);
        setLoading(false);
      });
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(allMeals.map(m => m.category));
    return Array.from(cats);
  }, [allMeals]);

  const filteredMeals = useMemo(() => {
    if (selectedCategory === 'favorites') {
      if (!searchQuery) return favorites;
      return favorites.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    return allMeals.filter(meal => {
      const matchCat = selectedCategory ? meal.category === selectedCategory : true;
      const matchSearch = searchQuery ? meal.title.toLowerCase().includes(searchQuery.toLowerCase()) : true;
      return matchCat && matchSearch;
    });
  }, [allMeals, selectedCategory, searchQuery, favorites]);

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
            className="p-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] transition-all flex items-center justify-center"
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
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedCategory('favorites')}
                    className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-yellow-100 to-amber-200 border border-yellow-300 rounded-2xl transition-all shadow-sm group hover:shadow-md"
                  >
                    <Star className="w-8 h-8 text-yellow-600 mb-2 fill-yellow-600" />
                    <span className="font-bold text-yellow-800 text-sm text-center">Le mie Preferite</span>
                  </motion.button>
                  
                  {categories.map((cat, i) => {
                    let emoji = "🍽️";
                    const lowerCat = cat.toLowerCase();
                    if (lowerCat.includes("primi")) emoji = "🍝";
                    else if (lowerCat.includes("secondi")) emoji = "🥩";
                    else if (lowerCat.includes("dolci")) emoji = "🍰";
                    else if (lowerCat.includes("antipasti")) emoji = "🥗";
                    
                    if (lowerCat.includes("fit")) emoji = "🥑 " + emoji;
                    
                    return (
                    <motion.button
                      key={cat}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedCategory(cat)}
                      className="flex flex-col items-center justify-center p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl hover:border-orange-500 hover:bg-orange-50/10 transition-all shadow-sm group"
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
                <h2 className="text-xl md:text-2xl font-bold text-[var(--text-main)] flex items-center gap-2 truncate">
                  {selectedCategory === 'favorites' ? (
                    <><Star className="w-6 h-6 text-yellow-500 fill-yellow-500" /> Le mie Preferite</>
                  ) : searchQuery && !selectedCategory ? (
                    <>Ricerca: <span className="text-orange-500">{searchQuery}</span></>
                  ) : (
                    <>Categoria <span className="text-orange-500 capitalize">{selectedCategory}</span></>
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
                        className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/60 transition-colors z-10"
                      >
                        <Star className={`w-5 h-5 ${isFavorite(meal.id) ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`} />
                      </button>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-center">
                      <span className="text-xs font-bold text-orange-500 mb-1 uppercase tracking-wider">{meal.category}</span>
                      <h3 className="font-bold text-[var(--text-main)] text-lg line-clamp-2 leading-tight group-hover:text-orange-500 transition-colors">{meal.title}</h3>
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
              className="w-full max-w-4xl bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row my-auto relative"
            >
              <div className="w-full md:w-2/5 h-64 md:h-auto relative shrink-0 bg-[var(--surface-variant)]">
                <img 
                  src={selectedMeal.image} 
                  alt={selectedMeal.title} 
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
                  <Star className={`w-6 h-6 ${isFavorite(selectedMeal.id) ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`} />
                </button>
              </div>

              <div className="w-full md:w-3/5 p-6 md:p-8 flex flex-col max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                      {selectedMeal.category}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--text-main)] leading-tight">
                      {selectedMeal.title}
                    </h2>
                  </div>
                  <button 
                    onClick={() => setSelectedMeal(null)}
                    className="w-10 h-10 bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] flex items-center justify-center hover:bg-[var(--border)] hidden md:flex shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-8">
                  {selectedMeal.ingredients && selectedMeal.ingredients.length > 0 && (
                    <section>
                      <h3 className="text-lg font-bold text-orange-500 mb-3 border-b border-[var(--border)] pb-2">Ingredienti</h3>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedMeal.ingredients.map((ing: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-main)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                            <span dangerouslySetInnerHTML={{ __html: ing }} />
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {selectedMeal.steps && selectedMeal.steps.length > 0 && (
                    <section>
                      <h3 className="text-lg font-bold text-orange-500 mb-3 border-b border-[var(--border)] pb-2">Preparazione</h3>
                      <div className="space-y-4">
                        {selectedMeal.steps.map((step: string, i: number) => (
                          <div key={i} className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0 mt-1">
                              {i + 1}
                            </div>
                            <p className="text-[var(--text-main)] leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: step }} />
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
