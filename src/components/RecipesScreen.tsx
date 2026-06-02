import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, X, BookOpen, Star, Globe } from 'lucide-react';

interface RecipeScreenProps {
  onClose: () => void;
}

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

export function RecipesScreen({ onClose }: RecipeScreenProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  const [selectedMeal, setSelectedMeal] = useState<any | null>(null);
  const [loadingMeal, setLoadingMeal] = useState(false);
  const [translatedContent, setTranslatedContent] = useState('');
  
  const [favorites, setFavorites] = useState<any[]>([]);

  useEffect(() => {
    const savedFavs = localStorage.getItem('chelona_smitten_favorites');
    if (savedFavs) {
      try { setFavorites(JSON.parse(savedFavs)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    fetch('https://smittenkitchen.com/wp-json/wp/v2/categories?orderby=count&order=desc&per_page=30')
      .then(res => res.json())
      .then(async data => {
        // filter out unwanted categories like 'Uncategorized'
        let validCats = data.filter((c: any) => c.name !== 'Uncategorized' && c.name !== 'Announcements');
        // Translate category names
        const names = validCats.map((c: any) => c.name);
        const translatedNames = await translateTexts(names);
        
        validCats = validCats.map((c: any, i: number) => ({
          ...c,
          nameIT: translatedNames[i] || c.name
        }));
        
        setCategories(validCats);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedCategory && selectedCategory.id === 'favorites') {
      setMeals(favorites);
      return;
    }

    setLoading(true);
    let url = 'https://smittenkitchen.com/wp-json/wp/v2/posts?per_page=20&_embed';
    if (selectedCategory) {
      url += `&categories=${selectedCategory.id}`;
    }
    if (debouncedSearchQuery) {
      url += `&search=${encodeURIComponent(debouncedSearchQuery)}`;
    }

    fetch(url)
      .then(res => res.json())
      .then(async data => {
        if (Array.isArray(data)) {
          const titles = data.map((m: any) => {
             const parser = new DOMParser();
             const doc = parser.parseFromString(m.title.rendered, 'text/html');
             return doc.body.textContent || '';
          });
          const translatedTitles = await translateTexts(titles);
          
          const translatedMeals = data.map((m: any, i: number) => ({
            ...m,
            titleIT: translatedTitles[i] || titles[i]
          }));
          setMeals(translatedMeals);
        } else {
          setMeals([]);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setMeals([]);
        setLoading(false);
      });
  }, [selectedCategory, debouncedSearchQuery, favorites]);

  const loadMealDetails = async (meal: any) => {
    setLoadingMeal(true);
    setSelectedMeal(meal);
    
    // Parse the HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(meal.content.rendered, 'text/html');
    
    // Try to find the recipe block, otherwise take the whole body
    let container = doc.querySelector('.jetpack-recipe') || doc.querySelector('.tasty-recipes');
    
    if (!container) {
       // If no recipe block, let's just grab the whole content
       container = doc.body;
       // remove images and junk to save translation quota
       container.querySelectorAll('img, script, style, iframe, .sharedaddy, .jp-relatedposts').forEach(el => el.remove());
    }
    
    // Extract text nodes
    const textNodes: Text[] = [];
    const walk = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let n: Node | null;
    while ((n = walk.nextNode())) {
      if (n.nodeValue && n.nodeValue.trim().length > 0) {
        textNodes.push(n as Text);
      }
    }
    
    const texts = textNodes.map(node => node.nodeValue || '');
    const translatedTexts = await translateTexts(texts);
    
    textNodes.forEach((node, i) => {
      node.nodeValue = translatedTexts[i];
    });
    
    setTranslatedContent(container.innerHTML);
    setLoadingMeal(false);
  };

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
      localStorage.setItem('chelona_smitten_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const isFavorite = (id: number) => favorites.some(f => f.id === id);

  const getImageUrl = (meal: any) => {
    try {
      return meal._embedded['wp:featuredmedia'][0].source_url;
    } catch {
      return 'https://images.unsplash.com/photo-1495195134817-a1a18bdce66c?q=80&w=600&auto=format&fit=crop';
    }
  };

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
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        {!selectedCategory && !debouncedSearchQuery ? (
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
              <input
                type="text"
                placeholder="Cerca una ricetta, ingrediente o stile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl py-4 pl-12 pr-4 text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--accent)] transition-all shadow-sm"
              />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
                <Globe className="w-6 h-6 text-orange-500" /> Categorie e Nazioni
              </h2>
              {categories.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-24 bg-[var(--surface-variant)] animate-pulse rounded-2xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedCategory({ id: 'favorites', nameIT: 'Preferiti' })}
                    className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-yellow-100 to-amber-200 border border-yellow-300 rounded-2xl transition-all shadow-sm group hover:shadow-md"
                  >
                    <Star className="w-8 h-8 text-yellow-600 mb-2 fill-yellow-600" />
                    <span className="font-bold text-yellow-800 text-sm text-center">Le mie Preferite</span>
                  </motion.button>
                  
                  {categories.map((cat, i) => (
                    <motion.button
                      key={cat.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedCategory(cat)}
                      className="flex flex-col items-center justify-center p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl hover:border-orange-500 hover:bg-orange-50/10 transition-all shadow-sm group"
                    >
                      <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">🍲</span>
                      <span className="font-bold text-[var(--text-main)] text-sm text-center capitalize">
                        {cat.nameIT || cat.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => {
                     setSelectedCategory(null);
                     setSearchQuery('');
                  }}
                  className="px-4 py-2 bg-[var(--surface-variant)] text-[var(--text-main)] rounded-full text-sm font-medium hover:bg-[var(--border)] transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Indietro
                </button>
                <h2 className="text-xl md:text-2xl font-bold text-[var(--text-main)] flex items-center gap-2 truncate">
                  {selectedCategory?.id === 'favorites' ? (
                    <><Star className="w-6 h-6 text-yellow-500 fill-yellow-500" /> Le mie Preferite</>
                  ) : debouncedSearchQuery ? (
                    <>Ricerca: <span className="text-orange-500">{debouncedSearchQuery}</span></>
                  ) : (
                    <>Categoria <span className="text-orange-500 capitalize">{selectedCategory?.nameIT || selectedCategory?.name}</span></>
                  )}
                </h2>
              </div>
              
              {!selectedCategory && (
                 <div className="relative w-full sm:w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                   <input
                     type="text"
                     placeholder="Cerca..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl py-2 pl-9 pr-4 text-[var(--text-main)] outline-none text-sm"
                   />
                 </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : meals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <BookOpen className="w-16 h-16 text-[var(--text-muted)] mb-4" />
                <p className="text-[var(--text-main)] font-bold text-xl">Nessuna ricetta trovata.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {meals.map((meal, idx) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 > 1 ? 0 : idx * 0.05 }}
                    key={meal.id}
                    onClick={() => loadMealDetails(meal)}
                    className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 transition-all group flex flex-col relative"
                  >
                    <div className="relative aspect-square overflow-hidden shrink-0 bg-[var(--surface-variant)]">
                      <img 
                        src={getImageUrl(meal)} 
                        alt={meal.titleIT || meal.title.rendered} 
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
                    <div className="p-5 flex-1 flex flex-col justify-center">
                      <h3 className="font-bold text-[var(--text-main)] text-lg line-clamp-2 leading-tight group-hover:text-orange-500 transition-colors" dangerouslySetInnerHTML={{__html: meal.titleIT || meal.title.rendered}} />
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
                  src={getImageUrl(selectedMeal)} 
                  alt={selectedMeal.titleIT || selectedMeal.title.rendered} 
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
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 
                    className="text-2xl md:text-3xl font-extrabold text-[var(--text-main)] leading-tight" 
                    dangerouslySetInnerHTML={{__html: selectedMeal.titleIT || selectedMeal.title.rendered}} 
                  />
                  <button 
                    onClick={() => setSelectedMeal(null)}
                    className="w-10 h-10 bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] flex items-center justify-center hover:bg-[var(--border)] hidden md:flex shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none text-[var(--text-main)] space-y-4">
                  <div dangerouslySetInnerHTML={{ __html: translatedContent }} />
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
            <span className="font-bold text-[var(--text-main)]">Caricamento e traduzione...</span>
          </div>
        </div>
      )}
    </div>
  );
}
