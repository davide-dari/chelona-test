import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, X, Clock, BookOpen, Star, Server, Key, LogOut } from 'lucide-react';

interface RecipeScreenProps {
  onClose: () => void;
}

interface MealieRecipe {
  id: string;
  slug: string;
  name: string;
  description: string;
}

interface MealieRecipeDetail extends MealieRecipe {
  recipeYield?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeIngredient?: any[];
  recipeInstructions?: any[];
  tags?: any[];
}

export function RecipesScreen({ onClose }: RecipeScreenProps) {
  const [mealieUrl, setMealieUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  
  const [configError, setConfigError] = useState('');
  const [isTestingConfig, setIsTestingConfig] = useState(false);

  const [meals, setMeals] = useState<MealieRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedMeal, setSelectedMeal] = useState<MealieRecipeDetail | null>(null);
  const [loadingMeal, setLoadingMeal] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  const [showFavorites, setShowFavorites] = useState(false);

  useEffect(() => {
    const savedUrl = localStorage.getItem('chelona_mealie_url');
    const savedToken = localStorage.getItem('chelona_mealie_token');
    const savedFavs = localStorage.getItem('chelona_mealie_favorites');
    
    if (savedUrl && savedToken) {
      setMealieUrl(savedUrl);
      setApiToken(savedToken);
      setIsConfigured(true);
    }
    
    if (savedFavs) {
      try { setFavorites(JSON.parse(savedFavs)); } catch (e) {}
    }
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigError('');
    setIsTestingConfig(true);
    
    let cleanUrl = mealieUrl.trim().replace(/\/$/, '');
    
    try {
      const res = await fetch(`${cleanUrl}/api/recipes?perPage=1`, {
        headers: { Authorization: `Bearer ${apiToken.trim()}` }
      });
      
      if (res.ok) {
        localStorage.setItem('chelona_mealie_url', cleanUrl);
        localStorage.setItem('chelona_mealie_token', apiToken.trim());
        setMealieUrl(cleanUrl);
        setApiToken(apiToken.trim());
        setIsConfigured(true);
      } else {
        setConfigError('Errore di connessione. Verifica URL e Token.');
      }
    } catch (err) {
      setConfigError('Impossibile contattare il server. Verifica l\'URL.');
    } finally {
      setIsTestingConfig(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('chelona_mealie_url');
    localStorage.removeItem('chelona_mealie_token');
    setIsConfigured(false);
    setMeals([]);
  };

  useEffect(() => {
    if (isConfigured) {
      setLoading(true);
      fetch(`${mealieUrl}/api/recipes?perPage=1000`, {
        headers: { Authorization: `Bearer ${apiToken}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.items) {
          setMeals(data.items);
        } else if (Array.isArray(data)) {
          setMeals(data);
        }
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
    }
  }, [isConfigured, mealieUrl, apiToken]);

  const loadMealDetails = (slug: string) => {
    setLoadingMeal(true);
    fetch(`${mealieUrl}/api/recipes/${slug}`, {
      headers: { Authorization: `Bearer ${apiToken}` }
    })
    .then(res => res.json())
    .then(data => {
      setSelectedMeal(data);
      setLoadingMeal(false);
    })
    .catch(() => setLoadingMeal(false));
  };

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const isFav = prev.includes(id);
      const updated = isFav ? prev.filter(f => f !== id) : [id, ...prev];
      localStorage.setItem('chelona_mealie_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const isFavorite = (id: string) => favorites.includes(id);

  const getImageUrl = (recipeId: string) => `${mealieUrl}/api/media/recipes/${recipeId}/images/original.webp`;

  const filteredMeals = meals.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFav = showFavorites ? isFavorite(m.id) : true;
    return matchesSearch && matchesFav;
  });

  const renderIngredient = (ing: any, i: number) => {
    // Mealie has different ingredient formats. We try to safely extract a readable string.
    let text = ing.note || ing.display || ing.title || '';
    if (!text && ing.food) {
       const qty = ing.quantity || '';
       const unit = ing.unit?.name || '';
       const food = ing.food?.name || '';
       text = `${qty} ${unit} ${food}`.trim();
    }
    return text || 'Ingrediente sconosciuto';
  };

  const renderInstruction = (inst: any, i: number) => {
    const text = inst.text || inst.title || '';
    return text;
  };

  if (!isConfigured) {
    return (
      <div className="flex flex-col h-full bg-[var(--bg)] font-sans relative">
        <header className="h-16 lg:h-20 bg-[var(--bg)] px-6 flex items-center shrink-0 z-10 border-b border-[var(--border)]">
          <button 
            onClick={onClose}
            className="p-2 mr-4 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] transition-all flex items-center justify-center"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-[var(--text-main)]">Integrazione Mealie</h1>
          </div>
        </header>
        
        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-[var(--card-bg)] p-8 rounded-3xl border border-[var(--border)] shadow-xl"
          >
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-orange-500">
                <BookOpen className="w-10 h-10" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-main)] text-center mb-2">Collega Mealie</h2>
            <p className="text-[var(--text-muted)] text-center mb-8 text-sm">
              Inserisci l'URL del tuo server Mealie e un API Token valido per accedere al tuo ricettario personale.
            </p>
            
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[var(--text-main)] mb-2 flex items-center gap-2">
                  <Server className="w-4 h-4 text-orange-500" /> URL Server
                </label>
                <input
                  type="url"
                  required
                  placeholder="es. http://192.168.1.100:9000"
                  value={mealieUrl}
                  onChange={e => setMealieUrl(e.target.value)}
                  className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-main)] outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--text-main)] mb-2 flex items-center gap-2">
                  <Key className="w-4 h-4 text-orange-500" /> API Token
                </label>
                <input
                  type="password"
                  required
                  placeholder="Il tuo Bearer Token"
                  value={apiToken}
                  onChange={e => setApiToken(e.target.value)}
                  className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-main)] outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              {configError && (
                <div className="p-3 bg-red-100 text-red-600 rounded-xl text-sm font-medium">
                  {configError}
                </div>
              )}
              
              <button 
                type="submit"
                disabled={isTestingConfig}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors mt-4 flex items-center justify-center"
              >
                {isTestingConfig ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Connetti al Server'
                )}
              </button>
            </form>
          </motion.div>
        </main>
      </div>
    );
  }

  const MealCard = ({ meal, idx }: { meal: MealieRecipe, idx: number }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.05 > 1 ? 0 : idx * 0.05 }}
      key={meal.id}
      onClick={() => loadMealDetails(meal.slug)}
      className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 transition-all group flex flex-col relative"
    >
      <div className="relative aspect-square overflow-hidden shrink-0 bg-[var(--surface-variant)]">
        <img 
          src={getImageUrl(meal.id)} 
          alt={meal.name} 
          onError={(e) => {
             // Fallback visivo se manca l'immagine
             (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><polyline points="14 2 14 8 20 8"/><path d="M4 15h16"/></svg>';
             (e.target as HTMLImageElement).className = "w-1/2 h-1/2 m-auto opacity-50";
          }}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <button 
          onClick={(e) => toggleFavorite(meal.id, e)}
          className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/60 transition-colors z-10"
        >
          <Star className={`w-5 h-5 ${isFavorite(meal.id) ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`} />
        </button>
      </div>
      <div className="p-5 flex-1 flex flex-col justify-center">
        <h3 className="font-bold text-[var(--text-main)] text-lg line-clamp-2 leading-tight group-hover:text-orange-500 transition-colors">
          {meal.name}
        </h3>
        {meal.description && (
           <p className="text-[var(--text-muted)] text-sm line-clamp-1 mt-1">{meal.description}</p>
        )}
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
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-[var(--text-main)]">Ricettario</h1>
          </div>
        </div>
        
        <button
          onClick={handleDisconnect}
          className="p-2 hover:bg-red-100 rounded-full text-red-500 transition-all"
          title="Disconnetti Mealie"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
              <input
                type="text"
                placeholder="Cerca una ricetta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl py-4 pl-12 pr-4 text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all shadow-sm"
              />
            </div>
            <button
               onClick={() => setShowFavorites(!showFavorites)}
               className={`shrink-0 px-6 py-4 rounded-2xl font-bold flex items-center gap-2 transition-colors border ${showFavorites ? 'bg-yellow-100 border-yellow-200 text-yellow-700' : 'bg-[var(--surface-variant)] border-[var(--border)] text-[var(--text-main)] hover:border-yellow-400'}`}
            >
               <Star className={`w-5 h-5 ${showFavorites ? 'fill-yellow-500 text-yellow-500' : ''}`} />
               Preferite
            </button>
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
                <MealCard meal={meal} idx={idx} key={meal.id} />
              ))}
            </div>
          )}
        </div>
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
                  src={getImageUrl(selectedMeal.id)} 
                  alt={selectedMeal.name} 
                  onError={(e) => {
                     (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  className="w-full h-full object-cover"
                />
                <button 
                  onClick={() => setSelectedMeal(null)}
                  className="absolute top-4 left-4 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:bg-black/70 md:hidden"
                >
                  <X className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => toggleFavorite(selectedMeal.id)}
                  className="absolute top-4 right-4 w-12 h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/70 transition-colors z-10 shadow-lg"
                >
                  <Star className={`w-6 h-6 ${isFavorite(selectedMeal.id) ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`} />
                </button>
              </div>

              <div className="w-full md:w-3/5 p-6 md:p-8 flex flex-col max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--text-main)] leading-tight">
                    {selectedMeal.name}
                  </h2>
                  <button 
                    onClick={() => setSelectedMeal(null)}
                    className="w-10 h-10 bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] flex items-center justify-center hover:bg-[var(--border)] hidden md:flex shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {selectedMeal.description && (
                  <p className="text-[var(--text-muted)] mb-6 text-lg">
                    {selectedMeal.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mb-6">
                  {(selectedMeal.tags || []).map((tag: any, i: number) => (
                    <span key={i} className="px-3 py-1 bg-[var(--surface-variant)] text-[var(--text-main)] rounded-full text-xs font-bold uppercase tracking-wide">
                      {tag.name || tag}
                    </span>
                  ))}
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-main)] mb-3 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-orange-500" /> Ingredienti
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(selectedMeal.recipeIngredient || []).map((ing, i) => (
                        <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)]">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                          <span className="font-medium text-[var(--text-main)]">{renderIngredient(ing, i)}</span>
                        </div>
                      ))}
                      {(!selectedMeal.recipeIngredient || selectedMeal.recipeIngredient.length === 0) && (
                         <span className="text-[var(--text-muted)] italic">Nessun ingrediente specificato.</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-main)] mb-3 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange-500" /> Preparazione
                    </h3>
                    <div className="space-y-4">
                      {(selectedMeal.recipeInstructions || []).map((inst, i) => (
                        <div key={i} className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0 mt-1">
                            {i + 1}
                          </div>
                          <p className="text-[var(--text-main)] leading-relaxed pt-1">
                            {renderInstruction(inst, i)}
                          </p>
                        </div>
                      ))}
                      {(!selectedMeal.recipeInstructions || selectedMeal.recipeInstructions.length === 0) && (
                         <span className="text-[var(--text-muted)] italic">Nessuna istruzione specificata.</span>
                      )}
                    </div>
                  </div>
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
