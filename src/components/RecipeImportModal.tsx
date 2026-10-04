import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Link2, Sparkles, Globe, ChefHat, Check, Clock, 
  Users, AlertCircle, ArrowRight, ExternalLink, RefreshCw, ClipboardPaste, Flame
} from 'lucide-react';
import { 
  fetchAndExtractRecipeFromUrl, 
  saveUserRecipe,
  type UserRecipeItem 
} from '../services/userRecipesService';

interface RecipeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (recipe: UserRecipeItem) => void;
}

export function RecipeImportModal({
  isOpen,
  onClose,
  onImportSuccess,
}: RecipeImportModalProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Modalità Anteprima & Modifica prima del salvataggio
  const [extractedRecipe, setExtractedRecipe] = useState<UserRecipeItem | null>(null);

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

  // Esecuzione estrazione ricetta dal link
  const handleExtract = async () => {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      setErrorMsg('Inserisci l\'URL di una ricetta web da importare.');
      return;
    }
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      setErrorMsg('L\'URL deve iniziare con https:// o http://');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);
      const recipe = await fetchAndExtractRecipeFromUrl(cleanUrl);
      setExtractedRecipe(recipe);
    } catch (err: any) {
      console.error('Errore estrazione ricetta', err);
      setErrorMsg(err.message || 'Impossibile estrarre la ricetta da questo link. Verifica che la pagina sia pubblica.');
    } finally {
      setIsLoading(false);
    }
  };

  // Conferma salvataggio nel ricettario locale
  const handleConfirmSave = () => {
    if (!extractedRecipe) return;
    const saved = saveUserRecipe(extractedRecipe);
    onImportSuccess(saved);
    onClose();
    // Reset state
    setExtractedRecipe(null);
    setUrl('');
  };

  const handleReset = () => {
    setExtractedRecipe(null);
    setErrorMsg(null);
  };

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
            <div className="w-10 h-10 rounded-2xl bg-orange-500/15 text-orange-600 flex items-center justify-center">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[var(--text-main)]">
                {extractedRecipe ? 'Anteprima Ricetta Importata' : 'Importa Ricetta da Link Web'}
              </h2>
              <p className="text-xs text-[var(--text-muted)] font-medium">
                {extractedRecipe ? 'Verifica e modifica i dettagli prima di salvarla nel tuo ricettario' : 'Incolla qualsiasi link da GialloZafferano, Cookist, Allrecipes o blog culinari'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-center cursor-pointer transition-colors"
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

          {!extractedRecipe ? (
            /* FASE 1: INSERIMENTO URL */
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                  <span>URL della Ricetta</span>
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
                    placeholder="https://ricette.giallozafferano.it/... o qualsiasi blog"
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

              {/* Siti Supportati e Info di Sicurezza / Legale */}
              <div className="p-4 rounded-2xl bg-[var(--surface-variant)]/60 border border-[var(--border)] space-y-3">
                <span className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Compatibilità Universale Schema.org & Blog Web:</span>
                </span>
                
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'GialloZafferano',
                    'Cookist',
                    'Allrecipes',
                    'Fatto in Casa da Benedetta',
                    'Il Cucchiaio d\'Argento',
                    'Misya',
                    'Tutti i blog e siti con Recipe Schema'
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
                  ⚖️ <strong>Uso Personale & Rispetto del Diritto d'Autore:</strong> la ricetta viene salvata esclusivamente sul tuo dispositivo in locale per uso privato e riporta sempre il link e l'attribuzione alla fonte originale.
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
                      <span>Analisi e importazione in corso...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Estrai Ricetta dal Link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* FASE 2: ANTEPRIMA & MODIFICA PRE-SALVATAGGIO */
            <div className="space-y-6">
              {/* Header scheda anteprima */}
              <div className="flex flex-col sm:flex-row gap-4 items-start bg-[var(--surface-variant)]/50 p-4 rounded-3xl border border-[var(--border)]">
                <div className="w-full sm:w-36 h-28 rounded-2xl overflow-hidden bg-[var(--surface-variant)] shrink-0 shadow-sm">
                  <img
                    src={extractedRecipe.image}
                    alt={extractedRecipe.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold text-xs uppercase">
                      {extractedRecipe.category}
                    </span>

                    {extractedRecipe.sourceUrl && (
                      <a
                        href={extractedRecipe.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--text-muted)] hover:text-orange-500 transition-colors"
                      >
                        <span>Fonte: {extractedRecipe.sourceName || 'Web'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* Modifica Rapida Titolo */}
                  <input
                    type="text"
                    value={extractedRecipe.title}
                    onChange={(e) => setExtractedRecipe({ ...extractedRecipe, title: e.target.value })}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl py-2 px-3 text-base font-black text-[var(--text-main)] outline-none focus:ring-2 focus:ring-orange-500"
                  />

                  {/* Badge Metriche */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] font-bold pt-1">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-orange-500" />
                      <span>{extractedRecipe.servings || 4} porzioni</span>
                    </span>

                    {extractedRecipe.prepTimeMinutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span>Prep: {extractedRecipe.prepTimeMinutes}m</span>
                      </span>
                    )}

                    {extractedRecipe.cookTimeMinutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Cottura: {extractedRecipe.cookTimeMinutes}m</span>
                      </span>
                    )}

                    {extractedRecipe.calories && (
                      <span className="flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-rose-500" />
                        <span>{extractedRecipe.calories} kcal</span>
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
                    <span>Ingredienti Rilevati ({extractedRecipe.ingredients?.length || 0})</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {extractedRecipe.ingredients?.map((ing, i) => (
                    <div
                      key={i}
                      className="px-3 py-1.5 rounded-xl bg-[var(--surface-variant)]/60 border border-[var(--border)] text-xs font-semibold text-[var(--text-main)] flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                      <span className="truncate">{ing}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Procedimento a Passaggi Estratto */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span>Procedimento ({extractedRecipe.steps?.length || 0} passaggi)</span>
                  </h3>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                  {extractedRecipe.steps?.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-[var(--surface-variant)]/40 border border-[var(--border)] flex items-start gap-2.5 text-xs text-[var(--text-main)]"
                    >
                      <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed flex-1">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--surface-variant)]/30">
          {extractedRecipe ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-xl bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Importa un altro link</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmSave}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Salva nel Ricettario</span>
              </button>
            </>
          ) : (
            <div className="flex justify-end w-full">
              <button
                type="button"
                onClick={onClose}
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
