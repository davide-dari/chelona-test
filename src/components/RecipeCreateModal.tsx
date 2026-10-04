import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, Trash2, Camera, Image as ImageIcon, Clock, Flame, 
  Users, ChefHat, Check, Globe, Sparkles, AlertCircle
} from 'lucide-react';
import { 
  saveUserRecipe, 
  compressImageFile, 
  CULINARY_PRESETS,
  type UserRecipeItem,
  type CulinaryPreset
} from '../services/userRecipesService';

interface RecipeCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (recipe: UserRecipeItem) => void;
  recipeToEdit?: UserRecipeItem | null;
}

const CATEGORIES = [
  'Primi',
  'Secondi',
  'Antipasti',
  'Dolci',
  'Fitness & Dieta',
  'Cucine dal Mondo',
  'Colazione',
];

const COMMON_UNITS = [
  'g',
  'kg',
  'ml',
  'l',
  'cucchiaio',
  'cucchiai',
  'cucchiaino',
  'cucchiaini',
  'pizzico',
  'q.b.',
  'fette',
  'spicchi',
  'pz',
];

export function RecipeCreateModal({
  isOpen,
  onClose,
  onSaveSuccess,
  recipeToEdit,
}: RecipeCreateModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Primi');
  const [country, setCountry] = useState('Italia');
  const [servings, setServings] = useState<number>(4);
  const [prepTime, setPrepTime] = useState<string>('15');
  const [cookTime, setCookTime] = useState<string>('20');
  const [calories, setCalories] = useState<string>('');
  
  // Immagine
  const [image, setImage] = useState<string>(CULINARY_PRESETS[0].image);
  const [showPresetsPicker, setShowPresetsPicker] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ingredienti
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [ingName, setIngName] = useState('');
  const [ingQuantity, setIngQuantity] = useState('');
  const [ingUnit, setIngUnit] = useState('g');
  const [bulkIngText, setBulkIngText] = useState('');
  const [showBulkIngInput, setShowBulkIngInput] = useState(false);

  // Procedimento a step
  const [steps, setSteps] = useState<Array<{ text: string; timerMinutes?: number }>>([
    { text: '' }
  ]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inizializza campi se siamo in modifica o nuova ricetta
  useEffect(() => {
    if (recipeToEdit) {
      setTitle(recipeToEdit.title || '');
      setCategory(recipeToEdit.category || 'Primi');
      setCountry(recipeToEdit.country || 'Italia');
      setServings(recipeToEdit.servings || 4);
      setPrepTime(recipeToEdit.prepTimeMinutes ? String(recipeToEdit.prepTimeMinutes) : '');
      setCookTime(recipeToEdit.cookTimeMinutes ? String(recipeToEdit.cookTimeMinutes) : '');
      setCalories(recipeToEdit.calories ? String(recipeToEdit.calories) : '');
      setImage(recipeToEdit.image || CULINARY_PRESETS[0].image);
      setIngredients(recipeToEdit.ingredients || []);
      
      if (Array.isArray(recipeToEdit.steps) && recipeToEdit.steps.length > 0) {
        setSteps(recipeToEdit.steps.map(s => {
          // Cerca se c'è un timer nel testo
          const match = s.match(/(?:timer|cuoci|lascia|riposare|inforna)[^.\n]*?(\d+)\s*(?:minuti|minuto|min)\b/i);
          const timerMin = match ? parseInt(match[1], 10) : undefined;
          return { text: s, timerMinutes: timerMin };
        }));
      } else {
        setSteps([{ text: '' }]);
      }
    } else {
      // Reset default
      setTitle('');
      setCategory('Primi');
      setCountry('Italia');
      setServings(4);
      setPrepTime('15');
      setCookTime('20');
      setCalories('');
      setImage(CULINARY_PRESETS[0].image);
      setIngredients([]);
      setSteps([{ text: '' }]);
    }
    setErrorMsg(null);
    setShowPresetsPicker(false);
    setShowBulkIngInput(false);
  }, [recipeToEdit, isOpen]);

  if (!isOpen) return null;

  // Gestione caricamento immagine da fotocamera/galleria
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      setErrorMsg(null);
      const compressedBase64 = await compressImageFile(file, 900, 900, 0.8);
      setImage(compressedBase64);
    } catch (err: any) {
      console.error('Errore compressione immagine', err);
      setErrorMsg('Impossibile elaborare l\'immagine selezionata. Riprova con un altro file.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Aggiunta singolo ingrediente
  const handleAddIngredient = () => {
    const name = ingName.trim();
    if (!name) return;

    let row = '';
    if (ingQuantity.trim()) {
      row = `${ingQuantity.trim()}${ingUnit !== 'q.b.' ? ` ${ingUnit}` : ''} ${name}`;
    } else {
      row = `${name} ${ingUnit}`;
    }

    setIngredients(prev => [...prev, row]);
    setIngName('');
    setIngQuantity('');
  };

  // Rimozione ingrediente
  const handleRemoveIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  // Inserimento multiplo ingredienti
  const handleAddBulkIngredients = () => {
    if (!bulkIngText.trim()) return;
    const lines = bulkIngText
      .split(/\r?\n/)
      .map(l => l.replace(/^[-*•\d.]+\s*/, '').trim())
      .filter(l => l.length > 0);
    
    if (lines.length > 0) {
      setIngredients(prev => [...prev, ...lines]);
      setBulkIngText('');
      setShowBulkIngInput(false);
    }
  };

  // Gestione Passaggi
  const handleStepChange = (index: number, text: string) => {
    setSteps(prev => {
      const next = [...prev];
      next[index] = { ...next[index], text };
      return next;
    });
  };

  const handleStepTimerChange = (index: number, minutesStr: string) => {
    const val = parseInt(minutesStr, 10);
    setSteps(prev => {
      const next = [...prev];
      next[index] = { ...next[index], timerMinutes: isNaN(val) || val <= 0 ? undefined : val };
      return next;
    });
  };

  const handleAddStep = () => {
    setSteps(prev => [...prev, { text: '' }]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      setSteps([{ text: '' }]);
      return;
    }
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  // Salvataggio ricetta
  const handleSave = () => {
    if (!title.trim()) {
      setErrorMsg('Inserisci un titolo per la ricetta.');
      return;
    }

    const cleanSteps = steps
      .map(s => {
        let txt = s.text.trim();
        if (s.timerMinutes && s.timerMinutes > 0 && !txt.toLowerCase().includes('minut')) {
          txt += ` (⏱️ Tempo: ${s.timerMinutes} minuti)`;
        }
        return txt;
      })
      .filter(t => t.length > 0);

    const saved = saveUserRecipe({
      id: recipeToEdit?.id,
      title: title.trim(),
      category,
      country: country.trim() || 'Italia',
      flag: country.toLowerCase().includes('italia') ? '🇮🇹' : '🌍',
      servings: Number(servings) || 4,
      prepTimeMinutes: prepTime ? Number(prepTime) : undefined,
      cookTimeMinutes: cookTime ? Number(cookTime) : undefined,
      calories: calories ? Number(calories) : undefined,
      image: image || CULINARY_PRESETS[0].image,
      ingredients,
      steps: cleanSteps,
      isCustom: true,
      sourceUrl: recipeToEdit?.sourceUrl,
      sourceName: recipeToEdit?.sourceName,
      createdAt: recipeToEdit?.createdAt,
    });

    onSaveSuccess(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-3xl bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--surface-variant)]/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/15 text-orange-600 flex items-center justify-center">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[var(--text-main)]">
                {recipeToEdit ? 'Modifica Ricetta' : 'Crea Nuova Ricetta'}
              </h2>
              <p className="text-xs text-[var(--text-muted)] font-medium">
                Inserisci ingredienti, tempi e procedimento per il tuo ricettario
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

        {/* Form Body Scrollabile */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Sezione Immagine e Foto */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-orange-500" />
              <span>Foto della Ricetta</span>
            </label>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative w-full sm:w-48 h-36 rounded-2xl overflow-hidden bg-[var(--surface-variant)] border border-[var(--border)] shrink-0 shadow-sm group">
                <img
                  src={image}
                  alt="Anteprima Ricetta"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {isUploadingImage && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Ottimizzazione...</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 w-full">
                <div className="flex flex-wrap gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="px-3.5 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs flex items-center gap-2 hover:bg-orange-600 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Scatta o Carica Foto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPresetsPicker(!showPresetsPicker)}
                    className="px-3.5 py-2 rounded-xl bg-[var(--surface-variant)] text-[var(--text-main)] font-bold text-xs border border-[var(--border)] hover:bg-[var(--border)] flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Scegli da Foto Culinari</span>
                  </button>
                </div>

                <p className="text-[11px] text-[var(--text-muted)] leading-tight">
                  Scatta una foto del tuo piatto, carica un'immagine dalla galleria oppure scegli da una galleria di splendide foto già pronte.
                </p>
              </div>
            </div>

            {/* Galleria Preset Culinari */}
            <AnimatePresence>
              {showPresetsPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 rounded-2xl bg-[var(--surface-variant)]/50 border border-[var(--border)] space-y-3 overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-main)]">Seleziona una foto consigliata:</span>
                    <button
                      type="button"
                      onClick={() => setShowPresetsPicker(false)}
                      className="text-xs text-orange-500 font-bold hover:underline"
                    >
                      Chiudi
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto custom-scrollbar p-1">
                    {CULINARY_PRESETS.map((preset: CulinaryPreset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setImage(preset.image);
                          setShowPresetsPicker(false);
                        }}
                        className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 text-left group cursor-pointer transition-all ${
                          image === preset.image ? 'border-orange-500 ring-2 ring-orange-500/30' : 'border-transparent hover:border-orange-300'
                        }`}
                      >
                        <img src={preset.image} alt={preset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 flex flex-col justify-end">
                          <span className="text-white text-[11px] font-bold line-clamp-1 flex items-center gap-1">
                            <span>{preset.emoji}</span>
                            <span>{preset.name}</span>
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Dati Principali: Titolo, Categoria, Paese */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Titolo Ricetta *
              </label>
              <input
                type="text"
                placeholder="Es. Carbonara Cremosa della Tradizione"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl py-3 px-4 text-sm font-bold text-[var(--text-main)] outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl py-2.5 px-3 text-sm font-bold text-[var(--text-main)] outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                  Cucina / Paese
                </label>
                <input
                  type="text"
                  placeholder="Es. Italia, Messico, Giappone..."
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl py-2.5 px-3 text-sm font-bold text-[var(--text-main)] outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Metriche: Porzioni, Tempo di Preparazione, Tempo Cottura, Calorie */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-[var(--surface-variant)]/60 border border-[var(--border)] space-y-1">
                <span className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-orange-500" /> Porzioni
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={servings}
                    onChange={(e) => setServings(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-transparent font-black text-sm text-[var(--text-main)] outline-none"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--surface-variant)]/60 border border-[var(--border)] space-y-1">
                <span className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" /> Prep (min)
                </span>
                <input
                  type="number"
                  min="0"
                  placeholder="15"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  className="w-full bg-transparent font-black text-sm text-[var(--text-main)] outline-none"
                />
              </div>

              <div className="p-3 rounded-2xl bg-[var(--surface-variant)]/60 border border-[var(--border)] space-y-1">
                <span className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> Cottura (min)
                </span>
                <input
                  type="number"
                  min="0"
                  placeholder="20"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  className="w-full bg-transparent font-black text-sm text-[var(--text-main)] outline-none"
                />
              </div>

              <div className="p-3 rounded-2xl bg-[var(--surface-variant)]/60 border border-[var(--border)] space-y-1">
                <span className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-rose-500" /> Kcal (opz)
                </span>
                <input
                  type="number"
                  min="0"
                  placeholder="450"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="w-full bg-transparent font-black text-sm text-[var(--text-main)] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Sezione Ingredienti */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <label className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <ChefHat className="w-4 h-4 text-orange-500" />
                <span>Ingredienti ({ingredients.length})</span>
              </label>

              <button
                type="button"
                onClick={() => setShowBulkIngInput(!showBulkIngInput)}
                className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
              >
                {showBulkIngInput ? 'Inserimento singolo' : 'Incolla lista completa'}
              </button>
            </div>

            {showBulkIngInput ? (
              <div className="space-y-2">
                <textarea
                  rows={4}
                  placeholder={`Incolla o scrivi un ingrediente per riga:\n320g spaghetti\n150g guanciale\n4 tuorli d'uovo\n50g pecorino romano`}
                  value={bulkIngText}
                  onChange={(e) => setBulkIngText(e.target.value)}
                  className="w-full bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl p-3 text-xs font-medium text-[var(--text-main)] outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={handleAddBulkIngredients}
                  className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-orange-600"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Aggiungi alla lista</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Nome ingrediente (es. Spaghetti, Farina, Olio EVO)..."
                    value={ingName}
                    onChange={(e) => setIngName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddIngredient();
                      }
                    }}
                    className="flex-1 min-w-[160px] bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-bold text-[var(--text-main)] outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="text"
                    placeholder="Q.tà (es. 200)"
                    value={ingQuantity}
                    onChange={(e) => setIngQuantity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddIngredient();
                      }
                    }}
                    className="w-24 bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl py-2 px-3 text-xs font-bold text-[var(--text-main)] outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <select
                    value={ingUnit}
                    onChange={(e) => setIngUnit(e.target.value)}
                    className="w-28 bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl py-2 px-2 text-xs font-bold text-[var(--text-main)] outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {COMMON_UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Aggiungi</span>
                  </button>
                </div>

                {ingredients.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {ingredients.map((ing, i) => (
                      <div
                        key={i}
                        className="px-3 py-2 rounded-xl bg-[var(--surface-variant)]/60 border border-[var(--border)] flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-bold text-[var(--text-main)] truncate">{ing}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(i)}
                          className="p-1 hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sezione Procedimento a Step Numerati con Timer */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <label className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-500" />
                <span>Procedimento a Step ({steps.length})</span>
              </label>

              <button
                type="button"
                onClick={handleAddStep}
                className="px-3 py-1.5 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 hover:bg-orange-500/25 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Aggiungi Passo</span>
              </button>
            </div>

            <div className="space-y-3">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[var(--surface-variant)]/50 border border-[var(--border)] space-y-2 relative group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="w-6 h-6 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-[var(--card-bg)] px-2.5 py-1 rounded-xl border border-[var(--border)]">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[11px] font-bold text-[var(--text-muted)]">Timer:</span>
                        <input
                          type="number"
                          min="0"
                          max="360"
                          placeholder="min"
                          value={step.timerMinutes ?? ''}
                          onChange={(e) => handleStepTimerChange(idx, e.target.value)}
                          className="w-12 bg-transparent font-bold text-xs text-[var(--text-main)] outline-none"
                        />
                      </div>

                      {steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          className="p-1 hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                          title="Elimina passaggio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    placeholder={`Descrivi il passaggio ${idx + 1} (es. Metti a bollire l'acqua per la pasta e cala gli spaghetti)...`}
                    value={step.text}
                    onChange={(e) => handleStepChange(idx, e.target.value)}
                    className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-2.5 text-xs font-medium text-[var(--text-main)] outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer con Bottoni Salva / Annulla */}
        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-end gap-3 shrink-0 bg-[var(--surface-variant)]/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold text-xs transition-colors cursor-pointer"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>{recipeToEdit ? 'Salva Modifiche' : 'Salva Ricetta'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
