import React, { useState, useMemo } from 'react';
import { 
  X, Search, Smartphone, Check, Sparkles, 
  ExternalLink, Layers, ShieldCheck, ArrowRight,
  Car, FileText, MapPin, ShoppingBag, ShoppingCart,
  UtensilsCrossed, CreditCard, Receipt, Users,
  Dumbbell, Compass, Home, StickyNote, BookUser,
  CalendarClock, Scan
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SECTION_SHORTCUTS, 
  createSectionShortcut, 
  isPinShortcutSupported, 
  SectionShortcutDef 
} from '../services/shortcutService';

interface HomeScreenShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  initialSectionId?: string;
}

const CATEGORIES = [
  { id: 'all', label: 'Tutte' },
  { id: 'vault', label: 'Vault' },
  { id: 'casa', label: 'Casa & Spesa' },
  { id: 'finanze', label: 'Finanze' },
  { id: 'utility', label: 'Utility' },
  { id: 'ai', label: 'AI' }
];

export const HomeScreenShortcutsModal: React.FC<HomeScreenShortcutsModalProps> = ({
  isOpen,
  onClose,
  showToast,
  initialSectionId
}) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [recentAddedIds, setRecentAddedIds] = useState<string[]>([]);

  const isNativeSupported = useMemo(() => isPinShortcutSupported(), []);

  const filteredShortcuts = useMemo(() => {
    return SECTION_SHORTCUTS.filter(s => {
      const matchCat = selectedCat === 'all' || s.category === selectedCat;
      const matchSearch = !search.trim() || 
        s.shortLabel.toLowerCase().includes(search.toLowerCase()) ||
        s.longLabel.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, selectedCat]);

  const handleAddShortcut = async (shortcut: SectionShortcutDef) => {
    setCreatingId(shortcut.id);
    try {
      const res = await createSectionShortcut(shortcut.id);
      if (res.success) {
        showToast(res.message, 'success');
        setRecentAddedIds(prev => [...prev.filter(id => id !== shortcut.id), shortcut.id]);
      } else {
        showToast(res.message, 'info');
      }
    } catch {
      showToast('Impossibile creare il collegamento in questo momento.', 'error');
    } finally {
      setCreatingId(null);
    }
  };

  const renderIconComponent = (id: string, colorHex: string) => {
    const props = { className: 'w-6 h-6 text-white' };
    switch (id) {
      case 'auto': return <Car {...props} />;
      case 'document': return <FileText {...props} />;
      case 'parking': return <MapPin {...props} />;
      case 'volantino': return <ShoppingBag {...props} />;
      case 'supermarket': return <ShoppingCart {...props} />;
      case 'recipes': return <UtensilsCrossed {...props} />;
      case 'installments': return <CreditCard {...props} />;
      case 'single-expense': return <Receipt {...props} />;
      case 'split': return <Users {...props} />;
      case 'fitness': return <Dumbbell {...props} />;
      case 'travel': return <Compass {...props} />;
      case 'furniture': return <Home {...props} />;
      case 'notes': return <StickyNote {...props} />;
      case 'addresses': return <BookUser {...props} />;
      case 'deadlines': return <CalendarClock {...props} />;
      case 'scanner': return <Scan {...props} />;
      case 'ai': return <Sparkles {...props} />;
      default: return <Smartphone {...props} />;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-5">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl max-h-[92vh] bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-[var(--border)] flex items-start justify-between gap-4 bg-gradient-to-r from-[var(--surface-variant)]/60 via-transparent to-[var(--surface-variant)]/40">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-[var(--text-main)]">
                    Collegamenti Schermata Home
                  </h2>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    Android
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
                  Fai uscire ogni sezione da Chelona e creala come app indipendente
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors active:scale-95 cursor-pointer"
              title="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Info Banner */}
          <div className="px-5 sm:px-6 pt-4">
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3 text-xs text-[var(--text-main)]">
              <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">Come funziona: </strong>
                Tocca <strong>"Aggiungi a Home"</strong> su qualsiasi sezione. Sul tuo telefono apparirà il dialogo Android per confermare l'aggiunta. Toccando l'icona sul launcher, si aprirà <em>immediatamente e a tutto schermo</em> quella specifica sezione come se fosse un'applicazione dedicata!
              </div>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="px-5 sm:px-6 pt-4 pb-2 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cerca tra Auto, Spesa, Volantini, Parcheggio, Ricette..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs sm:text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCat === cat.id
                      ? 'bg-[var(--accent)] text-white shadow-xs shadow-[var(--accent)]/20'
                      : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border)]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Shortcuts Grid List */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-3 space-y-2.5">
            {filteredShortcuts.length === 0 ? (
              <div className="py-12 text-center text-[var(--text-muted)] text-sm">
                Nessuna sezione trovata per "{search}".
              </div>
            ) : (
              filteredShortcuts.map(s => {
                const isCreating = creatingId === s.id;
                const isRecent = recentAddedIds.includes(s.id);
                return (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface-variant)]/50 transition-all flex items-center justify-between gap-3 group"
                  >
                    {/* Left: Icon Preview */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md shrink-0 relative overflow-hidden transition-transform group-hover:scale-105"
                        style={{
                          background: `linear-gradient(135deg, ${s.gradientFrom}, ${s.gradientTo})`
                        }}
                      >
                        {/* Glow highlight */}
                        <div className="absolute top-0 left-0 w-8 h-8 rounded-full bg-white/20 blur-xs" />
                        {renderIconComponent(s.id, s.colorHex)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[var(--text-main)] truncate">
                            {s.shortLabel}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface-variant)] text-[var(--text-muted)] border border-[var(--border)] font-medium">
                            {s.category}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] truncate max-w-xs sm:max-w-md mt-0.5">
                          {s.description}
                        </p>
                      </div>
                    </div>

                    {/* Right: Action Button */}
                    <button
                      type="button"
                      onClick={() => handleAddShortcut(s)}
                      disabled={isCreating}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer ${
                        isRecent
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xs shadow-indigo-500/20'
                      }`}
                    >
                      {isCreating ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : isRecent ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Aggiunto!</span>
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Aggiungi a Home</span>
                          <span className="sm:hidden">Aggiungi</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-[var(--border)] bg-[var(--surface-variant)]/30 flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Protezione biometrica del Vault sempre garantita</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] font-semibold transition-all active:scale-95 cursor-pointer"
            >
              Fatto
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
