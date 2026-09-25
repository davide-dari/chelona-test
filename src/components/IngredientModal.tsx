import React, { useEffect, useState, useRef } from 'react';
import { 
  X, ExternalLink, Sparkles, Scale, BookOpen, Flame, 
  Dumbbell, Droplets, CheckCircle2, Loader2, Wheat, Apple,
  ShieldCheck, Info, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { foodWikiService, FoodDetail } from '../services/foodWikiService';

export interface IngredientModalProps {
  ingredient: {
    name: string;
    amount?: number;
    unit?: string;
  } | null;
  onClose: () => void;
}

export function IngredientModal({ ingredient, onClose }: IngredientModalProps) {
  const [detail, setDetail] = useState<FoodDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const dragControls = useDragControls();
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ingredient) {
      setDetail(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    foodWikiService.getFoodDetail(ingredient.name)
      .then(res => {
        if (isMounted) {
          setDetail(res);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Error fetching food detail:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [ingredient]);

  const handleOpenWikipedia = (url?: string) => {
    if (!url) return;
    try {
      window.open(url, '_system');
    } catch {
      window.open(url, '_blank');
    }
  };

  // Gestione swipe touch: swipe orizzontale (back gesture) o swipe verticale verso il basso
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    // 1. Swipe orizzontale da sinistra a destra (edge swipe / swipe back gesture)
    if (deltaX > 75 && Math.abs(deltaY) < 65 && deltaTime < 450) {
      onClose();
      return;
    }

    // 2. Swipe verticale verso il basso quando si è in cima al contenuto
    const isAtTop = scrollContainerRef.current ? scrollContainerRef.current.scrollTop <= 5 : true;
    if (isAtTop && deltaY > 90 && Math.abs(deltaX) < 65 && deltaTime < 450) {
      onClose();
      return;
    }
  };

  const getCategoryLabel = (cat?: string) => {
    switch (cat) {
      case 'superfood': return '🫐 Superfood';
      case 'cereali': return '🌾 Cereale & Carboidrati';
      case 'proteine': return '🥩 Fonte Proteica';
      case 'grassi_buoni': return '🥑 Grassi Sani & Lipidi';
      case 'frutta_verdura': return '🥗 Frutta & Verdura';
      case 'latticini': return '🧀 Latticini & Derivati';
      case 'legumi': return '🌱 Legumi & Fibre';
      default: return '🍃 Alimento Naturale';
    }
  };

  return (
    <AnimatePresence>
      {ingredient && (
        <div 
          className="fixed inset-0 z-[200] bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 touch-pan-y"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 70, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 70, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 350) {
                onClose();
              }
            }}
            className="bg-[var(--card-bg)] border border-[var(--border)] rounded-t-[2.2rem] sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden text-[var(--text-main)]"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Header & Drag Grab Area per swipe-down immediato */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              className="cursor-grab active:cursor-grabbing select-none shrink-0 bg-[var(--surface-variant)]/40 border-b border-[var(--border)]"
            >
              {/* Mobile swipe grab bar */}
              <div className="w-12 h-1.5 bg-gray-400/40 hover:bg-gray-400/60 rounded-full mx-auto mt-2.5 mb-1 sm:hidden transition-colors" />

              {/* Header content */}
              <div className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base leading-tight">Scheda Alimento</h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-semibold">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      <span>Wikipedia Open Knowledge (CC BY-SA 4.0)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="hidden sm:inline-block text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                    Swipe per chiudere
                  </span>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                    aria-label="Chiudi"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar overscroll-contain"
            >
              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                  <p className="text-xs font-bold text-[var(--text-muted)]">
                    Caricamento da Wikipedia ed enciclopedia nutrizionale...
                  </p>
                </div>
              ) : detail ? (
                <>
                  {/* Hero Image (if available from Wikipedia) */}
                  {detail.thumbnailUrl && (
                    <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-black/5 border border-[var(--border)] shadow-inner">
                      <img 
                        src={detail.thumbnailUrl} 
                        alt={detail.displayTitle}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute bottom-2.5 left-3 text-[11px] font-bold text-white/90 drop-shadow-md">
                        {detail.displayTitle}
                      </div>
                    </div>
                  )}

                  {/* Title & Portion Badge */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h2 className="text-xl sm:text-2xl font-black text-[var(--text-main)] tracking-tight">
                        {detail.displayTitle}
                      </h2>
                      <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {getCategoryLabel(detail.nutrients?.category)}
                      </span>
                    </div>

                    {ingredient.amount && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                        <Scale className="w-4 h-4 shrink-0" />
                        <span>Porzione prevista nel tuo pasto: <strong className="font-black underline">{ingredient.amount}{ingredient.unit || 'g'}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Nutritional Values Grid (per 100g) */}
                  {detail.nutrients && (
                    <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-black">
                        <span className="flex items-center gap-1.5 text-amber-500 uppercase tracking-wider text-[11px]">
                          <Flame className="w-3.5 h-3.5" /> Valori Nutrizionali (per 100g)
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-semibold">Base a crudo</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border)]">
                          <p className="text-[10px] font-bold text-[var(--text-muted)]">Calorie</p>
                          <p className="text-sm font-black text-amber-500">{detail.nutrients.caloriesPer100g}</p>
                          <p className="text-[9px] text-[var(--text-muted)] font-bold">kcal</p>
                        </div>
                        <div className="p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border)]">
                          <p className="text-[10px] font-bold text-[var(--text-muted)]">Carboidrati</p>
                          <p className="text-sm font-black text-amber-600 dark:text-amber-400">{detail.nutrients.carbs}g</p>
                          <p className="text-[9px] text-[var(--text-muted)] font-bold">🍞</p>
                        </div>
                        <div className="p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border)]">
                          <p className="text-[10px] font-bold text-[var(--text-muted)]">Proteine</p>
                          <p className="text-sm font-black text-emerald-500">{detail.nutrients.protein}g</p>
                          <p className="text-[9px] text-[var(--text-muted)] font-bold">💪</p>
                        </div>
                        <div className="p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border)]">
                          <p className="text-[10px] font-bold text-[var(--text-muted)]">Grassi</p>
                          <p className="text-sm font-black text-sky-500">{detail.nutrients.fat}g</p>
                          <p className="text-[9px] text-[var(--text-muted)] font-bold">🫒</p>
                        </div>
                      </div>
                      {detail.nutrients.fiber > 0 && (
                        <div className="text-[11px] text-[var(--text-muted)] font-semibold flex items-center justify-between px-1 pt-1 border-t border-[var(--border)]">
                          <span>Fibre alimentari:</span>
                          <span className="font-extrabold text-[var(--text-main)]">{detail.nutrients.fiber}g / 100g</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Wikipedia Encyclopedic Summary */}
                  <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-500">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Descrizione Enciclopedica</span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-muted)] font-medium leading-relaxed">
                      {detail.extract}
                    </p>
                  </div>

                  {/* Key Nutrients / Vitamins */}
                  {detail.nutrients?.keyNutrients && detail.nutrients.keyNutrients.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                        ✨ Nutrienti & Micronutrienti Chiave
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.nutrients.keyNutrients.map((nut, idx) => (
                          <span 
                            key={idx}
                            className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-[var(--surface-variant)] text-[var(--text-main)] border border-[var(--border)]"
                          >
                            {nut}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Health Benefits */}
                  {detail.nutrients?.healthBenefits && detail.nutrients.healthBenefits.length > 0 && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3.5 space-y-2">
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Benefici per la Salute & Fitness
                      </p>
                      <ul className="space-y-1.5">
                        {detail.nutrients.healthBenefits.map((benefit, idx) => (
                          <li key={idx} className="text-xs text-[var(--text-muted)] font-medium flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Fun Fact */}
                  {detail.nutrients?.funFact && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3.5 space-y-1">
                      <p className="text-xs font-black text-amber-500 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Curiosità
                      </p>
                      <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed italic">
                        "{detail.nutrients.funFact}"
                      </p>
                    </div>
                  )}

                  {/* Wikipedia External Link Button */}
                  <div className="pt-2 space-y-2">
                    {detail.wikiUrl && (
                      <button
                        onClick={() => handleOpenWikipedia(detail.wikiUrl)}
                        className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Leggi Articolo Completo su Wikipedia</span>
                      </button>
                    )}
                    <p className="text-[10px] text-center text-[var(--text-muted)] leading-tight">
                      Contenuti enciclopedici liberi distribuiti sotto licenza <strong className="font-bold">Creative Commons Attribuzione - Condividi allo stesso modo (CC BY-SA 4.0)</strong> da Wikipedia Italia.
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-[var(--text-muted)]">
                  <p className="font-bold">Nessun dettaglio trovato per questo alimento.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
