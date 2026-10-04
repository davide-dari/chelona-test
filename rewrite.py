import re

with open('src/components/RecipesScreen.tsx', 'r') as f:
    content = f.read()

# 1. State changes: Append wizard state after isMenuPlannerOpen
wizard_state = """
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardPeopleCount, setWizardPeopleCount] = useState<number>(2);
  const [wizardMealTime, setWizardMealTime] = useState<string>('Pranzo');
  const [wizardCategories, setWizardCategories] = useState<string[]>([]);
  const [wizardSelectedRecipes, setWizardSelectedRecipes] = useState<any[]>([]);
  const [wizardMenuName, setWizardMenuName] = useState<string>('');
"""
content = content.replace(
    "const [isMenuPlannerOpen, setIsMenuPlannerOpen] = useState(false);",
    "const [isMenuPlannerOpen, setIsMenuPlannerOpen] = useState(false);" + wizard_state
)

# 2. Remove orange banner Hero (and the tile that triggers handleRegenerateMenu)
banner_pattern = r'\{\/\* ── BANNER HERO: COSA MANGIARE OGGI\? ── \*\/\}.*?<\/motion\.div>'
content = re.sub(banner_pattern, '', content, flags=re.DOTALL)

tile_pattern = r'\{\/\* Tile speciale "Cosa mangiare oggi\?" in griglia \*\/\}.*?<\/motion\.button>'
content = re.sub(tile_pattern, '', content, flags=re.DOTALL)

# 3. Add discreet button in header
header_button = """
        {/* Accesso rapido Bacheca Menu Salvati & Condivisi */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setWizardStep(1); setWizardCategories([]); setWizardSelectedRecipes([]); setIsMenuPlannerOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-600 font-bold text-xs transition-all cursor-pointer shadow-xs"
            title="Cosa mangiamo oggi?"
          >
            <Sparkles className="w-4 h-4" />
            <span>Crea Menu</span>
          </button>
          <button
"""
content = content.replace('{/* Accesso rapido Bacheca Menu Salvati & Condivisi */}\n        <button', header_button)
content = content.replace('        </button>\n      </header>', '        </button>\n        </div>\n      </header>')

# 4. Replace Modal implementation
modal_pattern = r'\{\/\* ═══════════════════════════════════════════════════════════════════\n\s*MODAL SCHERMATA: "COSA MANGIARE OGGI\?" \(ASSISTENTE MENU\)\n\s*═══════════════════════════════════════════════════════════════════ \*\/\}\n\s*<AnimatePresence>.*?<\/AnimatePresence>'

new_modal = """
      {/* ═══════════════════════════════════════════════════════════════════
          MODAL SCHERMATA: "COSA MANGIARE OGGI?" (WIZARD)
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isMenuPlannerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-md flex flex-col h-[100dvh] w-full bg-[var(--bg)] overflow-hidden"
          >
            <header className="flex items-center justify-between pt-[max(env(safe-area-inset-top),16px)] px-4 pb-3 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0 z-30">
              <button
                onClick={() => setIsMenuPlannerOpen(false)}
                className="p-2.5 -ml-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex-1 text-center font-bold text-[var(--text-main)]">
                Cosa mangiamo oggi? (Step {wizardStep}/5)
              </div>
              <div className="w-10"></div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar max-w-3xl mx-auto w-full space-y-4 pb-28">
              {wizardStep === 1 && (
                <div className="flex flex-col items-center gap-6 mt-10">
                  <h2 className="text-2xl font-black text-[var(--text-main)]">Quante persone?</h2>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setWizardPeopleCount(Math.max(1, wizardPeopleCount - 1))} className="w-12 h-12 rounded-full bg-[var(--surface-variant)] text-xl font-bold flex items-center justify-center cursor-pointer">-</button>
                    <span className="text-4xl font-black">{wizardPeopleCount}</span>
                    <button onClick={() => setWizardPeopleCount(wizardPeopleCount + 1)} className="w-12 h-12 rounded-full bg-[var(--surface-variant)] text-xl font-bold flex items-center justify-center cursor-pointer">+</button>
                  </div>
                  <button onClick={() => setWizardStep(2)} className="mt-8 px-8 py-3 rounded-2xl bg-orange-500 text-white font-bold w-full max-w-xs cursor-pointer">Avanti</button>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="flex flex-col items-center gap-6 mt-10">
                  <h2 className="text-2xl font-black text-[var(--text-main)]">Quando?</h2>
                  <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                    {['Colazione', 'Pranzo', 'Cena', 'Brunch'].map(meal => (
                      <button
                        key={meal}
                        onClick={() => setWizardMealTime(meal)}
                        className={`py-3 rounded-2xl font-bold border-2 transition-all cursor-pointer ${wizardMealTime === meal ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-transparent bg-[var(--surface-variant)] text-[var(--text-main)]'}`}
                      >
                        {meal}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-8 w-full max-w-xs">
                    <button onClick={() => setWizardStep(1)} className="px-4 py-3 rounded-2xl bg-[var(--surface-variant)] font-bold flex-1 cursor-pointer">Indietro</button>
                    <button onClick={() => setWizardStep(3)} className="px-4 py-3 rounded-2xl bg-orange-500 text-white font-bold flex-1 cursor-pointer">Avanti</button>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="flex flex-col items-center gap-6 mt-10">
                  <h2 className="text-2xl font-black text-[var(--text-main)] text-center">Cosa vuoi mangiare?</h2>
                  <p className="text-sm text-[var(--text-muted)]">Seleziona una o più opzioni</p>
                  <div className="flex flex-wrap justify-center gap-3 max-w-lg">
                    {['Carne', 'Pesce', 'Vegetariano', 'Pasta', 'Zuppa', 'Insalata', 'Dolce'].map(cat => {
                      const isSelected = wizardCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            if (isSelected) setWizardCategories(wizardCategories.filter(c => c !== cat));
                            else setWizardCategories([...wizardCategories, cat]);
                          }}
                          className={`px-5 py-2.5 rounded-full font-bold border-2 transition-all cursor-pointer ${isSelected ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-transparent bg-[var(--surface-variant)] text-[var(--text-main)]'}`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-8 w-full max-w-xs">
                    <button onClick={() => setWizardStep(2)} className="px-4 py-3 rounded-2xl bg-[var(--surface-variant)] font-bold flex-1 cursor-pointer">Indietro</button>
                    <button onClick={() => setWizardStep(4)} className="px-4 py-3 rounded-2xl bg-orange-500 text-white font-bold flex-1 cursor-pointer" disabled={wizardCategories.length === 0}>Avanti</button>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="flex flex-col gap-6">
                  <h2 className="text-2xl font-black text-[var(--text-main)] text-center">Scegli le ricette</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {allMeals.filter(meal => {
                        if (wizardCategories.length === 0) return true;
                        const mealStr = JSON.stringify(meal).toLowerCase();
                        return wizardCategories.some(cat => mealStr.includes(cat.toLowerCase()));
                    }).map(meal => {
                      const isSelected = wizardSelectedRecipes.some(r => r.id === meal.id);
                      return (
                        <div key={meal.id} onClick={() => {
                          if (isSelected) setWizardSelectedRecipes(wizardSelectedRecipes.filter(r => r.id !== meal.id));
                          else setWizardSelectedRecipes([...wizardSelectedRecipes, meal]);
                        }} className={`relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all ${isSelected ? 'border-orange-500 shadow-md' : 'border-transparent'}`}>
                          <img src={meal.image || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800'} alt={meal.title} className="w-full h-32 object-cover" />
                          <div className="p-2 bg-[var(--card-bg)] text-[var(--text-main)] text-xs font-bold line-clamp-1">{meal.title}</div>
                          {isSelected && <div className="absolute top-2 right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white"><Check className="w-4 h-4"/></div>}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex gap-4 mt-4 justify-center">
                    <button onClick={() => setWizardStep(3)} className="px-4 py-3 rounded-2xl bg-[var(--surface-variant)] font-bold cursor-pointer">Indietro</button>
                    <button onClick={() => {
                      setWizardMenuName(`${wizardMealTime} del ${new Date().toLocaleDateString('it-IT')}`);
                      setWizardStep(5);
                    }} className="px-4 py-3 rounded-2xl bg-orange-500 text-white font-bold cursor-pointer" disabled={wizardSelectedRecipes.length === 0}>Avanti</button>
                  </div>
                </div>
              )}

              {wizardStep === 5 && (
                <div className="flex flex-col items-center gap-6 mt-10">
                  <h2 className="text-2xl font-black text-[var(--text-main)]">Il tuo menu</h2>
                  <input
                    type="text"
                    value={wizardMenuName}
                    onChange={(e) => setWizardMenuName(e.target.value)}
                    className="text-center bg-[var(--surface-variant)] text-[var(--text-main)] px-4 py-2 rounded-xl font-bold w-full max-w-sm outline-none"
                  />
                  <div className="w-full max-w-sm space-y-3">
                    {wizardSelectedRecipes.map(recipe => (
                      <div key={recipe.id} className="flex items-center gap-3 p-3 bg-[var(--card-bg)] rounded-xl border border-[var(--border)]">
                        <img src={recipe.image || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800'} className="w-12 h-12 rounded-lg object-cover" />
                        <span className="font-bold text-[var(--text-main)] text-sm flex-1">{recipe.title}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-8 w-full max-w-xs">
                    <button onClick={() => setWizardStep(4)} className="px-4 py-3 rounded-2xl bg-[var(--surface-variant)] font-bold flex-1 cursor-pointer">Indietro</button>
                    <button onClick={() => {
                      const newSaved = {
                        id: `menu_${Date.now()}`,
                        title: wizardMenuName,
                        mealType: wizardMealTime.toLowerCase() as MealType,
                        theme: 'sorprendimi' as DietTheme,
                        antipasto: wizardSelectedRecipes[0] || null,
                        primo: wizardSelectedRecipes[1] || null,
                        secondo: wizardSelectedRecipes[2] || null,
                        chefAdvice: '',
                        wineAdvice: '',
                        createdAt: new Date().toISOString(),
                        authorName: 'Tu'
                      };
                      saveSavedMenu(newSaved);
                      setSavedMenus(loadSavedMenus());
                      setIsMenuPlannerOpen(false);
                    }} className="px-4 py-3 rounded-2xl bg-orange-500 text-white font-bold flex-1 cursor-pointer">Salva Menu</button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
"""
content = re.sub(modal_pattern, new_modal.strip(), content, flags=re.DOTALL)

with open('src/components/RecipesScreen.tsx', 'w') as f:
    f.write(content)
