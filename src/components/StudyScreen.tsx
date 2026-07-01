import React, { useState } from 'react';
import { ArrowLeft, Check, Trash2, BookOpen, GraduationCap, ChevronDown, ChevronUp, RefreshCw, Key, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateUUID } from '../utils/uuid';

interface StudyTopic {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  duration?: string;
}

interface StudyModule {
  id: string;
  type: 'study';
  title: string;
  status: 'wizard' | 'study';
  targetSubject?: string;
  level?: string;
  hoursPerWeek?: string;
  learningStyle?: string;
  objective?: string;
  teacherIntro?: string;
  topics: StudyTopic[];
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  folderId?: string;
}

interface StudyScreenProps {
  module: StudyModule;
  onClose: () => void;
  onSave: (m: StudyModule) => void;
  currentProfileId: string;
}

export function StudyScreen({ module, onClose, onSave, currentProfileId }: StudyScreenProps) {
  const [formData, setFormData] = useState<StudyModule>({
    ...module,
    title: module.title || 'Studio',
    status: module.status || 'wizard',
    topics: module.topics || []
  });

  const [wizardStep, setWizardStep] = useState(0);
  const [subject, setSubject] = useState(formData.targetSubject || '');
  const [level, setLevel] = useState(formData.level || 'Principiante');
  const [hours, setHours] = useState(formData.hoursPerWeek || '2-4 ore');
  const [style, setStyle] = useState(formData.learningStyle || 'Pratico (Progetti ed Esercizi)');
  const [objective, setObjective] = useState(formData.objective || '');

  // Local state for API Key configuration
  const apiKeyStorageKey = `chelona_antigravity_key_${currentProfileId}`;
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(apiKeyStorageKey) || '');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim()) {
      localStorage.setItem(apiKeyStorageKey, inputKey.trim());
      setApiKey(inputKey.trim());
      setInputKey('');
      setShowApiKeyModal(false);
      setErrorMsg('');
    }
  };

  const handleGeneratePlan = async () => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    if (!subject.trim()) {
      alert("Specifica un argomento di studio!");
      return;
    }

    setIsGenerating(true);
    setErrorMsg('');

    const prompt = `Sei un insegnante professionista altamente qualificato. 
L'utente desidera creare un piano di studi personalizzato per l'argomento: "${subject}".
Ecco il profilo dello studente ricavato dal questionario:
- Livello di partenza: ${level}
- Tempo disponibile a settimana: ${hours}
- Stile di apprendimento preferito: ${style}
- Obiettivo finale dello studio: ${objective}

Crea un piano di studio strutturato e dettagliato diviso in lezioni/argomenti sequenziali (da 6 a 12 argomenti a seconda dell'argomento e delle ore).
Rispondi RIGIDAMENTE con un oggetto JSON valido. Non includere blocchi di codice markdown (tipo \`\`\`json) o altre frasi introduttive prima del JSON. 
Il formato del JSON deve essere esattamente il seguente:
{
  "title": "Corso personalizzato di [Argomento]",
  "teacherIntro": "[Una breve lettera di incoraggiamento e consigli pratici scritti dall'insegnante AI su come affrontare lo studio in base al profilo dello studente]",
  "topics": [
    {
      "id": "[id univoco breve, es: 1]",
      "title": "[Titolo dell'argomento]",
      "description": "[Spiegazione dettagliata di cosa studiare, risorse consigliate, concetti chiave da comprendere]",
      "duration": "[Durata o sforzo stimato, es: 4 ore / Settimana 1]"
    }
  ]
}`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Errore HTTP ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error("Nessuna risposta generata dall'AI.");
      }

      // Parse JSON response
      const parsedPlan = JSON.parse(text.trim());
      
      const formattedTopics: StudyTopic[] = (parsedPlan.topics || []).map((t: any) => ({
        id: t.id || generateUUID(),
        title: t.title || 'Senza Titolo',
        description: t.description || '',
        duration: t.duration || '',
        isCompleted: false
      }));

      const updatedModule: StudyModule = {
        ...formData,
        title: parsedPlan.title || `Studio ${subject}`,
        status: 'study',
        targetSubject: subject,
        level,
        hoursPerWeek: hours,
        learningStyle: style,
        objective,
        teacherIntro: parsedPlan.teacherIntro || '',
        topics: formattedTopics
      };

      setFormData(updatedModule);
      onSave(updatedModule);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(`Generazione fallita: ${e.message || 'Verifica la chiave API'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTopic = (topicId: string) => {
    const updatedTopics = formData.topics.map(t => 
      t.id === topicId ? { ...t, isCompleted: !t.isCompleted } : t
    );
    const updatedModule = { ...formData, topics: updatedTopics };
    setFormData(updatedModule);
    onSave(updatedModule);
  };

  const handleReset = () => {
    if (confirm("Vuoi davvero cancellare questo piano di studi e ricominciare da capo?")) {
      const resetModule: StudyModule = {
        ...formData,
        status: 'wizard',
        topics: [],
        teacherIntro: undefined
      };
      setFormData(resetModule);
      setWizardStep(0);
      onSave(resetModule);
    }
  };

  const completedCount = formData.topics.filter(t => t.isCompleted).length;
  const totalTopics = formData.topics.length;
  const progress = totalTopics > 0 ? (completedCount / totalTopics) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col h-[100dvh] overflow-hidden font-sans transition-colors duration-300">
      {/* Header */}
      <header className="h-20 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-2xl px-6 flex items-center justify-between shrink-0 z-20 safe-area-header">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-3 bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--border)] rounded-2xl transition-all shadow-sm">
            <ArrowLeft className="w-6 h-6 text-[var(--text-main)]" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)]">{formData.title}</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              {formData.status === 'study' ? 'Corso Attivo' : 'Pianificatore di Studio'}
            </p>
          </div>
        </div>
        {formData.status === 'study' && (
          <button 
            onClick={handleReset}
            className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-2xl transition-all"
            title="Ricomincia"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8 pb-32">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* AISTUDIO API Key Status Indicator */}
          {!apiKey && formData.status === 'wizard' && (
            <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Key className="w-6 h-6 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-[var(--text-main)]">Chiave Gemini Mancante</p>
                  <p className="text-[11px] text-[var(--text-muted)] font-semibold">Configura la chiave API per sbloccare la generazione automatica.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowApiKeyModal(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-black text-xs rounded-xl shadow transition-all"
              >
                Imposta
              </button>
            </div>
          )}

          {/* WIZARD MODE */}
          {formData.status === 'wizard' && (
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-6 sm:p-10 shadow-sm relative overflow-hidden">
              {isGenerating ? (
                <div className="py-20 flex flex-col items-center justify-center text-center gap-6">
                  <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-[var(--text-main)]">Generazione in Corso</h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium max-w-sm">
                      L'insegnante AI di Antigravity sta strutturando un syllabus ottimizzato per {subject}...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Step Indicators */}
                  <div className="flex justify-between items-center border-b border-[var(--border)] pb-6">
                    <span className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Pianifica lo studio</span>
                    <span className="text-xs font-black text-indigo-500">{wizardStep + 1} di 5</span>
                  </div>

                  {/* Step 1: Subject */}
                  {wizardStep === 0 && (
                    <div className="space-y-4">
                      <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold text-[var(--text-main)]">Cosa desideri imparare?</h3>
                      <input 
                        type="text"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Es. Linguaggio Python, Inglese Commerciale, Fotografia..."
                        className="w-full p-5 bg-[var(--bg)] border border-[var(--border)] rounded-3xl outline-none focus:border-indigo-500 transition-all font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)] text-base"
                      />
                    </div>
                  )}

                  {/* Step 2: Level */}
                  {wizardStep === 1 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-[var(--text-main)]">Qual è il tuo livello attuale?</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {['Principiante (Parto da zero)', 'Intermedio (Ho già alcune basi)', 'Avanzato (Voglio perfezionarmi)'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => setLevel(opt)}
                            className={`p-5 rounded-3xl border text-left font-bold transition-all text-sm flex items-center justify-between ${level === opt ? 'border-indigo-500 bg-indigo-500/5 text-[var(--text-main)]' : 'border-[var(--border)] hover:bg-[var(--bg)] text-[var(--text-muted)]'}`}
                          >
                            <span>{opt}</span>
                            {level === opt && <Check className="w-5 h-5 text-indigo-500" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Hours */}
                  {wizardStep === 2 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-[var(--text-main)]">Quante ore a settimana puoi dedicare?</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {['1-2 ore (Studio leggero)', '3-5 ore (Studio regolare)', '6-10 ore (Studio intensivo)', '10+ ore (Immersione totale)'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => setHours(opt)}
                            className={`p-5 rounded-3xl border text-left font-bold transition-all text-sm flex items-center justify-between ${hours === opt ? 'border-indigo-500 bg-indigo-500/5 text-[var(--text-main)]' : 'border-[var(--border)] hover:bg-[var(--bg)] text-[var(--text-muted)]'}`}
                          >
                            <span>{opt}</span>
                            {hours === opt && <Check className="w-5 h-5 text-indigo-500" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 4: Learning Style */}
                  {wizardStep === 3 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-[var(--text-main)]">Come preferisci apprendere?</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          'Pratico (Progetti ed Esercizi pratici)',
                          'Teorico (Lettura, libri e manuali)',
                          'Visuale (Video, corsi multimediali e slide)'
                        ].map(opt => (
                          <button
                            key={opt}
                            onClick={() => setStyle(opt)}
                            className={`p-5 rounded-3xl border text-left font-bold transition-all text-sm flex items-center justify-between ${style === opt ? 'border-indigo-500 bg-indigo-500/5 text-[var(--text-main)]' : 'border-[var(--border)] hover:bg-[var(--bg)] text-[var(--text-muted)]'}`}
                          >
                            <span>{opt}</span>
                            {style === opt && <Check className="w-5 h-5 text-indigo-500" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 5: Objective */}
                  {wizardStep === 4 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold text-[var(--text-main)]">Qual è il tuo obiettivo finale?</h3>
                      <textarea
                        value={objective}
                        onChange={e => setObjective(e.target.value)}
                        placeholder="Es. Trovare lavoro come sviluppatore, creare la mia prima applicazione web, superare un esame scolastico..."
                        rows={4}
                        className="w-full p-5 bg-[var(--bg)] border border-[var(--border)] rounded-3xl outline-none focus:border-indigo-500 transition-all font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)] text-base resize-none"
                      />
                    </div>
                  )}

                  {errorMsg && (
                    <p className="text-xs text-red-500 font-bold bg-red-500/5 p-4 rounded-2xl border border-red-500/10">
                      {errorMsg}
                    </p>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex items-center gap-4 pt-4 border-t border-[var(--border)]">
                    {wizardStep > 0 && (
                      <button
                        onClick={() => setWizardStep(prev => prev - 1)}
                        className="px-6 py-4 border border-[var(--border)] hover:bg-[var(--bg)] text-[var(--text-main)] font-black text-sm rounded-2xl transition-all"
                      >
                        Indietro
                      </button>
                    )}
                    
                    {wizardStep < 4 ? (
                      <button
                        onClick={() => {
                          if (wizardStep === 0 && !subject.trim()) {
                            alert("Inserisci l'argomento per procedere!");
                            return;
                          }
                          setWizardStep(prev => prev + 1);
                        }}
                        className="flex-1 py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-sm rounded-2xl shadow transition-all text-center"
                      >
                        Avanti
                      </button>
                    ) : (
                      <button
                        onClick={handleGeneratePlan}
                        className="flex-1 py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-sm rounded-2xl shadow transition-all flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" /> Genera Piano con AI
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACTIVE STUDY MODE */}
          {formData.status === 'study' && (
            <div className="space-y-8 animate-fade-in">
              {/* Progress Card */}
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-sm">
                <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="var(--border)" strokeWidth="8" fill="transparent" />
                    <circle cx="48" cy="48" r="40" stroke="var(--accent, #6366f1)" strokeWidth="8" fill="transparent"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={(2 * Math.PI * 40) * (1 - progress / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-lg font-black text-[var(--text-main)]">{Math.round(progress)}%</span>
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <h3 className="text-lg font-black text-[var(--text-main)]">I tuoi progressi</h3>
                  <p className="text-xs text-[var(--text-muted)] font-semibold">
                    Hai completato {completedCount} argomenti su {totalTopics} totali.
                  </p>
                  {progress === 100 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase rounded-lg border border-emerald-500/20 mt-2">
                      <Award className="w-3.5 h-3.5" /> Corso Completato!
                    </span>
                  )}
                </div>
              </div>

              {/* Teacher Introduction Box */}
              {formData.teacherIntro && (
                <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-[2rem] p-6 space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" /> I Consigli del Professore
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] font-bold leading-relaxed whitespace-pre-line">
                    {formData.teacherIntro}
                  </p>
                </div>
              )}

              {/* Syllabus / Topics Checklist */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Programma di Studio</h4>
                
                <div className="flex flex-col gap-3">
                  {formData.topics.map((t, index) => {
                    const isExpanded = expandedTopicId === t.id;
                    return (
                      <div 
                        key={t.id} 
                        className={`border rounded-3xl bg-[var(--card-bg)] transition-all overflow-hidden ${t.isCompleted ? 'border-indigo-500/20 opacity-80' : 'border-[var(--border)] hover:border-indigo-500/40'}`}
                      >
                        <div className="p-5 flex items-center justify-between gap-4">
                          <button
                            onClick={() => toggleTopic(t.id)}
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                              t.isCompleted ? 'bg-indigo-500 border-indigo-500 text-white shadow shadow-indigo-500/30' : 'border-[var(--border)] hover:bg-[var(--border)] text-[var(--text-muted)]'
                            }`}
                          >
                            {t.isCompleted && <Check className="w-4 h-4 stroke-[3px]" />}
                          </button>

                          <div className="flex-1 min-w-0" onClick={() => setExpandedTopicId(isExpanded ? null : t.id)}>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Argomento {index + 1}</span>
                              {t.duration && (
                                <span className="text-[9px] font-black bg-[var(--border)] text-[var(--text-muted)] px-2 py-0.5 rounded">
                                  {t.duration}
                                </span>
                              )}
                            </div>
                            <h5 className={`text-sm font-bold text-[var(--text-main)] truncate mt-1 ${t.isCompleted ? 'line-through opacity-55' : ''}`}>
                              {t.title}
                            </h5>
                          </div>

                          <button 
                            onClick={() => setExpandedTopicId(isExpanded ? null : t.id)}
                            className="p-2 hover:bg-[var(--border)] rounded-xl text-[var(--text-muted)] transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>

                        {/* Expanded details */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden border-t border-[var(--border)] bg-[var(--bg)]/50"
                            >
                              <div className="p-5 text-xs text-[var(--text-muted)] font-bold leading-relaxed whitespace-pre-line">
                                {t.description || 'Nessuna descrizione o risorsa fornita.'}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* API KEY CONFIGURATION MODAL */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] p-6 shadow-2xl space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-main)]">Configura Gemini API</h3>
                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Necessario per l'Insegnante AI</p>
              </div>
            </div>

            <form onSubmit={handleSaveKey} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] block ml-1">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={inputKey}
                  onChange={e => setInputKey(e.target.value)}
                  placeholder="Incolla qui la tua API Key..."
                  className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-[var(--text-main)] placeholder:text-[var(--text-muted)] text-sm"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-5 py-3 border border-[var(--border)] hover:bg-[var(--bg)] text-[var(--text-muted)] font-black text-xs rounded-xl transition-all"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs rounded-xl shadow transition-all text-center"
                >
                  Salva Chiave
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
