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

  // Fridge state
  const [fridgeIngredients, setFridgeIngredients] = useState<string[]>([]);
  const [fridgeInput, setFridgeInput] = useState('');

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
    fetch('/ricette_mondo.json').then(res => res.json().catch(() => []))
    .then((mondoData) => {
      let combined: any[] = [];
      if (Array.isArray(mondoData)) {
        const formatted = mondoData
          .filter((m: any) => m.image) // Only recipes with images
          .map((m: any, i: number) => {
            let cat = m.category || m.categoria || 'Primi';
            if (cat === 'Primi Piatti') cat = 'Primi';
            if (cat === 'Secondi Piatti') cat = 'Secondi';
            
            return {
              id: m.id || `gz_${i}`,
              title: m.title || m.nome,
              image: m.image,
              category: cat,
              ingredients: m.ingredients || m.ingredienti || [],
              steps: m.steps || (typeof m.procedimento === 'string' ? m.procedimento.split(/\\r?\\n/).filter((s: string) => s.trim() !== '') : (m.procedimento || []))
            };
          });
        combined = [...formatted];
      }
      setAllMeals(combined);
      setLoading(false);
    })
    .catch(e => {
      console.error("Failed to load recipes", e);
      setLoading(false);
    });
  }, []);

  const FIXED_CATEGORIES = ['Antipasti', 'Primi', 'Secondi', 'Dolci', 'Colazione'];

  const categories = useMemo(() => {
    return FIXED_CATEGORIES;
  }, []);

  const filteredMeals = useMemo(() => {
    if (selectedCategory === 'favorites') {
      if (!searchQuery) return favorites;
      return favorites.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (selectedCategory === 'fridge') {
      if (fridgeIngredients.length === 0) return [];
      
      const scored = allMeals.map(meal => {
        let score = 0;
        const recipeIngsText = meal.ingredients && meal.ingredients.length > 0 ? meal.ingredients.join(' ').toLowerCase() : meal.steps.join(' ').toLowerCase();
        
        fridgeIngredients.forEach(ing => {
          if (recipeIngsText.includes(ing.toLowerCase())) {
            score += 1;
          }
        });

        const missingIngredients = (meal.ingredients || []).filter((ing: string) => {
          return !fridgeIngredients.some(f => ing.toLowerCase().includes(f.toLowerCase()));
        });

        return { ...meal, fridgeScore: score, missingIngredients };
      }).filter(m => m.fridgeScore > 0);
      
      return scored.sort((a, b) => {
        if (b.fridgeScore !== a.fridgeScore) {
          return b.fridgeScore - a.fridgeScore; // Most matched ingredients first
        }
        return a.missingIngredients.length - b.missingIngredients.length; // Least missing ingredients first
      });
    }

    return allMeals.filter(meal => {
      const matchCat = selectedCategory ? meal.category === selectedCategory : true;
      const matchSearch = searchQuery ? meal.title.toLowerCase().includes(searchQuery.toLowerCase()) : true;
      return matchCat && matchSearch;
    });
  }, [allMeals, selectedCategory, searchQuery, favorites, fridgeIngredients]);

  const availableIngredients = useMemo(() => {
    const commonSet = new Set([
      // Aromatiche e Spezie
      'aglio', 'aglio orsino', 'aglio nero', 'alloro', 'aneto', 'basilico', 'cannella', 'capperi',
      'chiodi di garofano', 'curcuma', 'curry', 'erba cipollina', 'finocchietto', 'menta',
      'noce moscata', 'origano', 'pepe', 'peperoncino', 'peperoncino fresco', 'peperoncino secco',
      'prezzemolo', 'rosmarino', 'sale', 'salvia', 'senape', 'timo', 'vaniglia', 'zafferano', 'zenzero',
      
      // Ortaggi e Verdure (con varianti)
      'asparagi', 'asparagi verdi', 'asparagi bianchi', 'asparagi selvatici',
      'carciofi', 'carciofi romaneschi', 'carciofi spinosi', 'carote',
      'cavolfiore', 'cavolo', 'cavolo nero', 'cavolo verza', 'cavolo cappuccio', 'cavolini di bruxelles',
      'cetrioli', 'cipolla', 'cipolla rossa', 'cipolla bianca', 'cipolla dorata', 'cipolla di tropea',
      'cipollotto', 'cipolline borettane',
      'fagiolini', 'taccole', 'finocchio',
      'funghi', 'funghi porcini', 'funghi champignon', 'funghi chiodini', 'funghi finferli',
      'insalata', 'lattuga', 'rucola', 'valeriana', 'indivia', 'scarola', 'iceberg', 'songino',
      'melanzane', 'melanzane tonde', 'melanzane lunghe', 'melanzane perlina',
      'olive', 'olive nere', 'olive verdi', 'olive taggiasche',
      'patate', 'patate novelle', 'patate rosse', 'patate dolci', 'patate gialle',
      'peperoni', 'peperoni rossi', 'peperoni gialli', 'peperoni verdi', 'peperoni cruschi', 'friggitelli',
      'pomodori', 'pomodorini', 'pomodori secchi', 'pomodori pelati', 'pomodorini ciliegino', 'pomodorini datterini',
      'pomodori ramati', 'pomodori cuore di bue', 'pomodori san marzano', 'passata di pomodoro',
      'porri', 'radicchio', 'radicchio rosso', 'radicchio trevigiano',
      'sedano', 'sedano rapa', 'spinaci', 'cime di rapa', 'broccoletti',
      'zucca', 'zucca mantovana', 'zucca delica', 'zucca butternut', 'zucca napoletana', 'fiori di zucca',
      'zucchine', 'zucchine tonde', 'zucchine chiare', 'zucchine romanesche', 'zucchine scure',
      
      // Legumi
      'ceci', 'fagioli', 'fagioli borlotti', 'fagioli cannellini', 'fagioli neri', 'fave',
      'lenticchie', 'lenticchie rosse', 'lenticchie nere', 'piselli', 'soia', 'lupini',
      
      // Frutta
      'arachidi', 'arancia', 'avocado', 'cedro', 'datteri', 'fichi', 'fragole', 'kiwi',
      'lampone', 'limone', 'mela', 'mirtilli', 'noci', 'nocciole', 'mandorle', 'pera', 'pesca',
      'pinoli', 'pistacchi', 'prugne', 'uva', 'castagne',
      
      // Carne, Pesce e Latticini (Base)
      'bacon', 'bresaola', 'brodo', 'burro', 'cacao', 'caffe', 'calamari', 'carne', 'cioccolato',
      'cozze', 'farina', 'farro', 'formaggio', 'gamberi', 'gorgonzola', 'grana', 'guanciale',
      'latte', 'lievito', 'maiale', 'maionese', 'mais', 'manzo', 'margarina', 'mascarpone',
      'miele', 'mozzarella', 'olio', 'olio extravergine', 'orzo', 'pancetta', 'pane', 'panna', 'parmigiano',
      'pesce', 'pollo', 'petto di pollo', 'prosciutto', 'ricotta', 'riso', 'salmone', 'salsiccia',
      'seppie', 'speck', 'tacchino', 'tonno', 'uova', 'vitello', 'vongole', 'zabaione', 'zucchero'
    ]);

    const stopWords = new Set(['di', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'q.b.', 'qb', 'g', 'ml', 'kg', 'litro', 'litri', 'cucchiaio', 'cucchiai', 'cucchiaino', 'cucchiaini', 'spicchio', 'spicchi', 'pizzico', 'pizzichi', 'foglia', 'foglie', 'fresco', 'freschi', 'fresche', 'tritato', 'tritati', 'tagliato', 'tagliati', 'a', 'al', 'alla', 'alle', 'agli', 'allo', 'del', 'della', 'delle', 'degli', 'dello', 'quanto', 'basta', 'circa', 'mezzo', 'mezza', 'intero', 'intera', 'temperatura', 'ambiente', 'caldo', 'freddo', 'tiepido', 'bollente', 'scaglie', 'gocce', 'cubetti', 'fette', 'pezzi', 'spolverata', 'macinata', 'q.b', 'qb.']);

    allMeals.forEach(meal => {
      (meal.ingredients || []).forEach((ingStr: string) => {
        const words = ingStr.toLowerCase().split(/[\s,()0-9'"+-]/).filter(w => w.length > 2 && !stopWords.has(w));
        words.forEach(w => commonSet.add(w));
      });
    });

    return Array.from(commonSet).sort();
  }, [allMeals]);

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

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedCategory('fridge')}
                    className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-cyan-100 to-blue-200 border border-cyan-300 rounded-2xl transition-all shadow-sm group hover:shadow-md"
                  >
                    <div className="text-3xl mb-2">❄️</div>
                    <span className="font-bold text-blue-800 text-sm text-center">Il mio Frigo</span>
                  </motion.button>
                  
                  {categories.map((cat, i) => {
                    const emojiMap: Record<string, string> = {
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
                  ) : selectedCategory === 'fridge' ? (
                    <>❄️ Il mio Frigo</>
                  ) : searchQuery && !selectedCategory ? (
                    <>Ricerca: <span className="text-orange-500">{searchQuery}</span></>
                  ) : (
                    <>Categoria <span className="text-orange-500 capitalize">{selectedCategory}</span></>
                  )}
                </h2>
              </div>
              
              {selectedCategory !== 'fridge' && (
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

            {selectedCategory === 'fridge' && (
              <div className="bg-[var(--surface-variant)] p-4 rounded-2xl border border-[var(--border)]">
                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <input 
                      type="text"
                      placeholder="Aggiungi ingrediente (es: pollo, uova...)"
                      value={fridgeInput}
                      onChange={(e) => setFridgeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && fridgeInput.trim()) {
                          if (!fridgeIngredients.includes(fridgeInput.trim().toLowerCase())) {
                            setFridgeIngredients([...fridgeIngredients, fridgeInput.trim().toLowerCase()]);
                          }
                          setFridgeInput('');
                        }
                      }}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-2 px-4 text-[var(--text-main)] outline-none focus:border-cyan-500"
                    />
                    {fridgeInput.trim().length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 custom-scrollbar">
                        {availableIngredients
                          .filter(ing => ing.includes(fridgeInput.toLowerCase().trim()) && !fridgeIngredients.includes(ing))
                          .slice(0, 50)
                          .map(ing => (
                            <button
                              key={ing}
                              onClick={() => {
                                setFridgeIngredients([...fridgeIngredients, ing]);
                                setFridgeInput('');
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-cyan-500/10 text-[var(--text-main)] capitalize border-b border-[var(--border)] last:border-b-0"
                            >
                              {ing}
                            </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      if (fridgeInput.trim() && !fridgeIngredients.includes(fridgeInput.trim().toLowerCase())) {
                        setFridgeIngredients([...fridgeIngredients, fridgeInput.trim().toLowerCase()]);
                        setFridgeInput('');
                      }
                    }}
                    className="px-4 py-2 bg-cyan-600 text-white rounded-xl font-bold hover:bg-cyan-700 transition-colors shrink-0 h-[42px]"
                  >
                    Aggiungi
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {fridgeIngredients.map(ing => (
                    <div key={ing} className="flex items-center gap-1 bg-cyan-900/30 text-cyan-500 px-3 py-1 rounded-full border border-cyan-800/50 text-sm">
                      {ing}
                      <button onClick={() => setFridgeIngredients(fridgeIngredients.filter(i => i !== ing))} className="hover:text-cyan-300 ml-1">
                        &times;
                      </button>
                    </div>
                  ))}
                  {fridgeIngredients.length > 0 && (
                    <button onClick={() => setFridgeIngredients([])} className="text-xs text-[var(--text-muted)] hover:text-red-400 ml-2">
                      Svuota
                    </button>
                  )}
                </div>
              </div>
            )}

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
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="text-xs font-bold text-orange-500 uppercase tracking-wider truncate">{meal.category}</span>
                        {selectedCategory === 'fridge' && meal.missingIngredients !== undefined && (
                          meal.missingIngredients.length === 0 ? (
                            <span className="text-[10px] font-bold text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                              ✅ Hai tutto!
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                              ❌ Mancano {meal.missingIngredients.length}
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
                        {selectedMeal.ingredients.map((ing: string, i: number) => {
                          const isMissing = selectedCategory === 'fridge' && selectedMeal.missingIngredients?.includes(ing);
                          return (
                            <li key={i} className={`flex items-start gap-2 text-sm ${isMissing ? 'text-red-400/80' : 'text-[var(--text-main)]'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isMissing ? 'bg-red-500/50' : 'bg-orange-400'} mt-1.5 shrink-0`} />
                              <span className="flex-1" dangerouslySetInnerHTML={{ __html: ing }} />
                              {isMissing && <span className="text-[10px] font-bold bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded ml-1 shrink-0">Manca</span>}
                            </li>
                          );
                        })}
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
