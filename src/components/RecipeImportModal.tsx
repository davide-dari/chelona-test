import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Link2, Sparkles, Globe, ChefHat, Check, Clock, 
  Users, AlertCircle, ArrowRight, ExternalLink, RefreshCw, ClipboardPaste, 
  Flame, Edit3, CheckSquare, Square, Layers, ArrowLeft, Loader2
} from 'lucide-react';
import { 
  fetchAndExtractRecipesFromUrl, 
  enrichRecipeDetail,
  enrichRecipesWithProgress,
  saveUserRecipe,
  saveUserRecipes,
  type UserRecipeItem 
} from '../services/userRecipesService';

const CATEGORIES = [
  'Primi',
  'Secondi',
  'Antipasti',
  'Dolci',
  'Fitness & Dieta',
  'Cucine dal Mondo',
  'Colazione',
];

interface RecipeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (recipe: UserRecipeItem, allRecipes?: UserRecipeItem[]) => void;
  onOpenInBuilder?: (recipe: UserRecipeItem) => void;
}

export function RecipeImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  onOpenInBuilder,
}: RecipeImportModalProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Elenco ricette trovate dalla scansione dell'URL
  const [extractedRecipes, setExtractedRecipes] = useState<UserRecipeItem[]>([]);
  // Insieme degli indici selezionati per l'importazione multipla
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  // Ricetta singola aperta in modalità anteprima/modifica dettagliata
  const [activeRecipe, setActiveRecipe] = useState<UserRecipeItem | null>(null);
  const [activeRecipeIndex, setActiveRecipeIndex] = useState<number | null>(null);
  
  // Stato avanzamento importazione ed arricchimento
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; title: string } | null>(null);
  const [isEnrichingSingle, setIsEnrichingSingle] = useState(false);

  if (!isOpen) return null;

  // Incolla rapido dagli appunti
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
          setUrl(text.trim());
          setErrorMsg(null);
        } else if (text) {
          setUrl(text.trim());
        }
      }
    } catch {
      // Ignora errore permessi appunti
    }
  };

  // Esecuzione estrazione ricette dal link
  const handleExtract = async () => {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      setErrorMsg('Inserisci l\'URL di una ricetta o raccolta da importare.');
      return;
    }
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      setErrorMsg('L\'URL deve iniziare con https:// o http://');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);
      const recipes = await fetchAndExtractRecipesFromUrl(cleanUrl);
      if (!recipes || recipes.length === 0) {
        throw new Error('Nessuna ricetta valida trovata in questa pagina.');
      }

      setExtractedRecipes(recipes);
      if (recipes.length === 1) {
        // Singola ricetta: apri subito l'anteprima dettagliata
        const single = recipes[0];
        setActiveRecipe(single);
        setActiveRecipeIndex(0);
        setSelectedIndices(new Set([0]));
        if (single.sourceUrl && (!single.ingredients?.length || !single.steps?.length)) {
          handleOpenDetail(single, 0);
        }
      } else {
        // Multi-ricetta: tutte selezionate di default
        setActiveRecipe(null);
        setActiveRecipeIndex(null);
        setSelectedIndices(new Set(recipes.map((_, i) => i)));
      }
    } catch (err: any) {
      console.error('Errore estrazione ricette', err);
      setErrorMsg(err.message || 'Impossibile estrarre le ricette da questo link. Verifica che la pagina sia pubblica.');
    } finally {
      setIsLoading(false);
    }
  };

  // Seleziona / Deseleziona tutte le ricette
  const handleSelectAll = () => {
    setSelectedIndices(new Set(extractedRecipes.map((_, i) => i)));
  };

  const handleDeselectAll = () => {
    setSelectedIndices(new Set());
  };

  const handleToggleIndex = (idx: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  // Apri una specifica ricetta per visualizzarne/modificarne i dettagli
  const handleOpenDetail = async (recipe: UserRecipeItem, index: number) => {
    setActiveRecipe(recipe);
    setActiveRecipeIndex(index);

    // Se la ricetta manca ancora di ingredienti o passaggi ma ha sourceUrl, arricchiscila in background
    if (recipe.sourceUrl && (!recipe.ingredients?.length || !recipe.steps?.length)) {
      setIsEnrichingSingle(true);
      try {
        const enriched = await enrichRecipeDetail(recipe);
        setActiveRecipe(enriched);
        setExtractedRecipes(prev => {
          const copy = [...prev];
          copy[index] = enriched;
          return copy;
        });
      } catch (e) {
        console.warn('Errore arricchimento singola ricetta', e);
      } finally {
        setIsEnrichingSingle(false);
      }
    }
  };

  // Torna dall'anteprima dettagliata all'elenco multi-ricetta
  const handleBackToList = () => {
    if (activeRecipe && activeRecipeIndex !== null) {
      // Aggiorna l'elemento modificato nella lista
      setExtractedRecipes(prev => {
        const copy = [...prev];
        copy[activeRecipeIndex] = activeRecipe;
        return copy;
      });
    }
    setActiveRecipe(null);
    setActiveRecipeIndex(null);
  };

  // Salva TUTTE le ricette selezionate arricchendole con barra di avanzamento
  const handleImportSelected = async () => {
    const toSave = extractedRecipes.filter((_, idx) => selectedIndices.has(idx));
    if (toSave.length === 0) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: toSave.length, title: 'Avvio arricchimento...' });

    try {
      const enrichedList = await enrichRecipesWithProgress(toSave, (curr, tot, title) => {
        setImportProgress({ current: curr, total: tot, title });
      });

      const savedList = saveUserRecipes(enrichedList);
      if (savedList.length > 0) {
        onImportSuccess(savedList[0], savedList);
      }
      handleCloseModal();
    } catch (err: any) {
      console.error('Errore importazione ricette', err);
      // Salva comunque le ricette base trovate
      const fallbackList = saveUserRecipes(toSave);
      if (fallbackList.length > 0) {
        onImportSuccess(fallbackList[0], fallbackList);
      }
      handleCloseModal();
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  // Salva la singola ricetta attiva
  const handleConfirmSingleSave = () => {
    if (!activeRecipe) return;
    const saved = saveUserRecipe(activeRecipe);
    onImportSuccess(saved, [saved]);
    handleCloseModal();
  };

  const handleCloseModal = () => {
    if (isImporting) return; // Non chiudere durante l'importazione in corso
    onClose();
    setExtractedRecipes([]);
    setSelectedIndices(new Set());
    setActiveRecipe(null);
    setActiveRecipeIndex(null);
    setUrl('');
    setErrorMsg(null);
    setIsImporting(false);
    setImportProgress(null);
  };

  const handleReset = () => {
    if (isImporting) return;
    setExtractedRecipes([]);
    setSelectedIndices(new Set());
    setActiveRecipe(null);
    setActiveRecipeIndex(null);
    setErrorMsg(null);
    setIsImporting(false);
    setImportProgress(null);
  };

  const isMultiView = extractedRecipes.length > 1 && !activeRecipe;
  const isSingleView = !!activeRecipe;

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--surface-variant)]/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/15 text-orange-600 flex items-center justify-center shrink-0">
              {isMultiView ? <Layers className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[var(--text-main)]">
                {isMultiView 
                  ? `Trovate ${extractedRecipes.length} ricette in questa pagina`
                  : isSingleView 
                    ? 'Anteprima Ricetta Importata' 
                    : 'Importa Ricette da Link Web'}
              </h2>
              <p className="text-xs text-[var(--text-muted)] font-medium">
                {isMultiView
                  ? 'Seleziona le ricette che desideri salvare nel tuo ricettario personale'
                  : isSingleView
                    ? 'Verifica e modifica i dettagli prima di salvarla nel tuo ricettario'
                    : 'Incolla qualsiasi link da GialloZafferano, Cookist, raccolte di ricette o blog culinari'}
              </p>
            </div>
          </div>

          <button
            onClick={handleCloseModal}
            disabled={isImporting}
            className="w-9 h-9 rounded-full bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-center cursor-pointer transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* FASE 1: INSERIMENTO URL */}
          {extractedRecipes.length === 0 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                  <span>URL della Ricetta o Raccolta</span>
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="text-orange-500 hover:underline flex items-center gap-1 cursor-pointer font-bold capitalize text-xs"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Incolla dagli Appunti</span>
                  </button>
                </label>

                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
                  <input
                    type="url"
                    placeholder="https://ricette.giallozafferano.it/... o qualsiasi pagina di ricette"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleExtract();
                      }
                    }}
                    className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium text-[var(--text-main)] outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
              </div>

              {/* Info Compatibilità e Supporto Multi-Ricetta */}
              <div className="p-4 rounded-2xl bg-[var(--surface-variant)]/60 border border-[var(--border)] space-y-3">
                <span className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Compatibilità Universale con Ricette Singole e Raccolte:</span>
                </span>
                
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'GialloZafferano',
                    'Cookist',
                    'Allrecipes',
                    'Fatto in Casa da Benedetta',
                    'Il Cucchiaio d\'Argento',
                    'Misya',
                    'Raccolte & Menu con più ricette',
                    'Tutti i blog Schema.org'
                  ].map((site) => (
                    <span
                      key={site}
                      className="px-2.5 py-1 rounded-full bg-[var(--card-bg)] border border-[var(--border)] text-[11px] font-semibold text-[var(--text-muted)]"
                    >
                      {site}
                    </span>
                  ))}
                </div>

                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  ⚖️ <strong>Uso Personale & Rispetto del Diritto d'Autore:</strong> le ricette vengono salvate esclusivamente sul tuo dispositivo in locale per uso privato e mantengono sempre il link originale e l'attribuzione alla fonte.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleExtract}
                  disabled={isLoading || !url.trim()}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Analisi e scansione pagina in corso...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Estrai Tutte le Ricette dal Link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* FASE 2: SCHERMATA MULTI-RICETTA */}
          {isMultiView && (
            <div className="space-y-4">
              {/* Barra di avanzamento e stato arricchimento durante importazione multipla */}
              {isImporting && importProgress && (
                <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-black text-orange-600 dark:text-orange-400">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Importazione ricetta {importProgress.current} di {importProgress.total}...</span>
                    </div>
                    <span className="font-black text-orange-600 dark:text-orange-400">
                      {Math.round((importProgress.current / Math.max(1, importProgress.total)) * 100)}%
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-[var(--text-main)] truncate">
                    {importProgress.title}
                  </p>

                  <div className="w-full bg-[var(--card-bg)] h-2.5 rounded-full overflow-hidden border border-[var(--border)] p-0.5">
                    <motion.div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.round((importProgress.current / Math.max(1, importProgress.total)) * 100))}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>

                  <p className="text-[10px] text-[var(--text-muted)] font-medium">
                    Download e arricchimento di tutti gli ingredienti, dosi e procedimenti completi in corso...
                  </p>
                </div>
              )}

              {/* Barra comandi selezione rapida */}
              <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-[var(--surface-variant)]/60 border border-[var(--border)] flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 font-black text-xs">
                    {selectedIndices.size} di {extractedRecipes.length} selezionate
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    disabled={isImporting}
                    className="px-3 py-1.5 rounded-xl bg-[var(--card-bg)] hover:bg-orange-500/10 text-[var(--text-main)] hover:text-orange-600 font-bold text-xs border border-[var(--border)] flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-orange-500" />
                    <span>Seleziona tutte</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    disabled={isImporting}
                    className="px-3 py-1.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold text-xs border border-[var(--border)] flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Deseleziona tutte</span>
                  </button>
                </div>
              </div>

              {/* Elenco schede ricetta trovate */}
              <div className="space-y-2.5 max-h-[52vh] overflow-y-auto custom-scrollbar pr-1">
                {extractedRecipes.map((recipe, index) => {
                  const isSelected = selectedIndices.has(index);
                  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

                  return (
                    <div
                      key={recipe.id || index}
                      onClick={() => handleToggleIndex(index)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                        isSelected 
                          ? 'bg-orange-500/10 border-orange-500/40 shadow-sm' 
                          : 'bg-[var(--surface-variant)]/40 border-[var(--border)] hover:bg-[var(--surface-variant)]/70 opacity-75'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleIndex(index);
                        }}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-orange-500 text-white' 
                            : 'border-2 border-[var(--border)] text-transparent hover:border-orange-400'
                        }`}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>

                      {/* Foto ricetta */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[var(--surface-variant)] shrink-0 shadow-sm border border-[var(--border)]">
                        <img
                          src={recipe.image}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>

                      {/* Informazioni principali */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold text-[10px]">
                            {recipe.category}
                          </span>
                          {recipe.sourceName && (
                            <span className="text-[10px] text-[var(--text-muted)] font-semibold">
                              {recipe.sourceName}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-[var(--text-main)] line-clamp-2 leading-snug">
                          {recipe.title}
                        </h4>

                        {/* Metriche rapide */}
                        <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] font-medium pt-0.5 flex-wrap">
                          {totalTime > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>{totalTime} min</span>
                            </span>
                          )}
                          {recipe.calories && (
                            <span className="flex items-center gap-1">
                              <Flame className="w-3 h-3 text-rose-500" />
                              <span>{recipe.calories} kcal</span>
                            </span>
                          )}
                          {recipe.servings && recipe.servings > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-blue-500" />
                              <span>{recipe.servings} porz.</span>
                            </span>
                          )}
                          {recipe.ingredients && recipe.ingredients.length > 0 && (
                            <span className="flex items-center gap-1">
                              <ChefHat className="w-3 h-3 text-emerald-500" />
                              <span>{recipe.ingredients.length} ingr.</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pulsante Modifica / Ispezione rapida */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(recipe, index);
                        }}
                        className="p-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-orange-500/15 text-[var(--text-muted)] hover:text-orange-600 border border-[var(--border)] transition-colors shrink-0 cursor-pointer"
                        title="Vedi e modifica i dettagli di questa ricetta"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FASE 3: ANTEPRIMA & MODIFICA DETTAGLIATA (Singola o da elenco) */}
          {isSingleView && activeRecipe && (
            <div className="space-y-6">
              {/* Indicatore arricchimento dettagli ricetta in background */}
              {isEnrichingSingle && (
                <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center gap-2.5 animate-pulse shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Download dettagli ricetta e arricchimento ingredienti dal web in corso...</span>
                </div>
              )}

              {/* Tasto torna all'elenco se c'erano più ricette */}
              {extractedRecipes.length > 1 && (
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Torna all'elenco delle {extractedRecipes.length} ricette trovate</span>
                </button>
              )}

              {/* Header scheda anteprima */}
              <div className="flex flex-col sm:flex-row gap-4 items-start bg-[var(--surface-variant)]/50 p-4 rounded-3xl border border-[var(--border)]">
                <div className="w-full sm:w-36 h-28 rounded-2xl overflow-hidden bg-[var(--surface-variant)] shrink-0 shadow-sm">
                  <img
                    src={activeRecipe.image}
                    alt={activeRecipe.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-[var(--text-muted)]">Categoria:</span>
                      <select
                        value={activeRecipe.category}
                        onChange={(e) => setActiveRecipe({ ...activeRecipe, category: e.target.value })}
                        className="bg-[var(--card-bg)] border border-[var(--border)] text-orange-600 dark:text-orange-400 font-bold text-xs rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {activeRecipe.sourceUrl && (
                      <a
                        href={activeRecipe.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--text-muted)] hover:text-orange-500 transition-colors"
                      >
                        <span>Fonte: {activeRecipe.sourceName || 'Web'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* Modifica Rapida Titolo */}
                  <input
                    type="text"
                    value={activeRecipe.title}
                    onChange={(e) => setActiveRecipe({ ...activeRecipe, title: e.target.value })}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl py-2 px-3 text-base font-black text-[var(--text-main)] outline-none focus:ring-2 focus:ring-orange-500"
                  />

                  {/* Badge & Input Metriche */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] font-bold pt-1">
                    <label className="flex items-center gap-1.5 bg-[var(--card-bg)] px-2.5 py-1 rounded-xl border border-[var(--border)]">
                      <Users className="w-3.5 h-3.5 text-orange-500" />
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={activeRecipe.servings || 4}
                        onChange={(e) => setActiveRecipe({ ...activeRecipe, servings: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        className="w-8 font-black text-xs text-[var(--text-main)] outline-none bg-transparent"
                      />
                      <span>porzioni</span>
                    </label>

                    <label className="flex items-center gap-1.5 bg-[var(--card-bg)] px-2.5 py-1 rounded-xl border border-[var(--border)]">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>Prep:</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="min"
                        value={activeRecipe.prepTimeMinutes ?? ''}
                        onChange={(e) => setActiveRecipe({ ...activeRecipe, prepTimeMinutes: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                        className="w-10 font-black text-xs text-[var(--text-main)] outline-none bg-transparent"
                      />
                      <span>m</span>
                    </label>

                    <label className="flex items-center gap-1.5 bg-[var(--card-bg)] px-2.5 py-1 rounded-xl border border-[var(--border)]">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Cottura:</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="min"
                        value={activeRecipe.cookTimeMinutes ?? ''}
                        onChange={(e) => setActiveRecipe({ ...activeRecipe, cookTimeMinutes: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                        className="w-10 font-black text-xs text-[var(--text-main)] outline-none bg-transparent"
                      />
                      <span>m</span>
                    </label>

                    {activeRecipe.calories && (
                      <span className="flex items-center gap-1 bg-[var(--card-bg)] px-2.5 py-1 rounded-xl border border-[var(--border)]">
                        <Flame className="w-3.5 h-3.5 text-rose-500" />
                        <span>{activeRecipe.calories} kcal</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista Ingredienti Estratti */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                    <ChefHat className="w-4 h-4 text-orange-500" />
                    <span>Ingredienti Rilevati ({activeRecipe.ingredients?.length || 0})</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {activeRecipe.ingredients && activeRecipe.ingredients.length > 0 ? (
                    activeRecipe.ingredients.map((ing, i) => (
                      <div
                        key={i}
                        className="px-3 py-1.5 rounded-xl bg-[var(--surface-variant)]/60 border border-[var(--border)] text-xs font-semibold text-[var(--text-main)] flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                        <span className="truncate">{ing}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] italic">Nessun ingrediente dettagliato rilevato.</p>
                  )}
                </div>
              </div>

              {/* Procedimento a Passaggi Estratto */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span>Procedimento ({activeRecipe.steps?.length || 0} passaggi)</span>
                  </h3>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                  {activeRecipe.steps && activeRecipe.steps.length > 0 ? (
                    activeRecipe.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-[var(--surface-variant)]/40 border border-[var(--border)] flex items-start gap-2.5 text-xs text-[var(--text-main)]"
                      >
                        <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="leading-relaxed flex-1">{step}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] italic">Nessun passaggio dettagliato rilevato.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--surface-variant)]/30 flex-wrap gap-2">
          {/* Footer FASE 2: MULTI-RICETTA */}
          {isMultiView && (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-2 rounded-xl bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Altro link</span>
              </button>

              <button
                type="button"
                onClick={handleImportSelected}
                disabled={selectedIndices.size === 0 || isImporting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-md flex items-center gap-2 cursor-pointer transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importazione in corso ({importProgress?.current || 0}/{importProgress?.total || selectedIndices.size})...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Importa tutte le ricette selezionate ({selectedIndices.size})</span>
                  </>
                )}
              </button>
            </>
          )}

          {/* Footer FASE 3: ANTEPRIMA DETTAGLIATA */}
          {isSingleView && activeRecipe && (
            <>
              {extractedRecipes.length > 1 ? (
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="px-3.5 py-2 rounded-xl bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Torna all'elenco</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3.5 py-2 rounded-xl bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Altro link</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                {onOpenInBuilder && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenInBuilder(activeRecipe);
                      handleCloseModal();
                    }}
                    className="px-4 py-2 rounded-xl bg-[var(--surface-variant)] hover:bg-orange-500/15 text-[var(--text-main)] hover:text-orange-600 font-bold text-xs border border-[var(--border)] flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Modifica ingredienti, dosi e passaggi nel builder completo"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-orange-500" />
                    <span>Personalizza nel Builder</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleConfirmSingleSave}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Salva nel Ricettario</span>
                </button>
              </div>
            </>
          )}

          {/* Footer FASE 1: INSERIMENTO URL */}
          {extractedRecipes.length === 0 && (
            <div className="flex justify-end w-full">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-xl bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold text-xs transition-colors cursor-pointer"
              >
                Chiudi
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
