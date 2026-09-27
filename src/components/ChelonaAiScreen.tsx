import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Send, Mic, Volume2, VolumeX, Trash2, ArrowLeft, 
  Brain, ExternalLink, Check, Copy, AlertCircle, RefreshCw, X, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Module } from '../types';
import { 
  AiMessage, AiMemory, getChatHistory, saveChatHistory, 
  getLearnedMemories, deleteLearnedMemory, clearAllLearnedMemories, 
  saveLearnedMemory, queryGemmaNano, buildKnowledgeBase 
} from '../services/gemmaNanoEngine';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

interface ChelonaAiScreenProps {
  modules: Module[];
  username: string;
  onClose: () => void;
  onOpenModule: (module: Module) => void;
  onOpenCategory: (category: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ChelonaAiScreen: React.FC<ChelonaAiScreenProps> = ({
  modules,
  username,
  onClose,
  onOpenModule,
  onOpenCategory,
  showToast,
}) => {
  const [messages, setMessages] = useState<AiMessage[]>(() => {
    const history = getChatHistory();
    if (history.length > 0) return history;
    return [
      {
        id: 'msg_welcome',
        sender: 'assistant',
        text: `👋 Ciao **${username || 'amico'}**! Sono **Chelona AI**, il tuo assistente personale locale basato su **Gemma 4 Nano**.\n\nEseguo **direttamente sul tuo smartphone** senza utilizzare API o server esterni: tutti i tuoi dati rimangono crittografati e privati al 100%.\n\nHo già indicizzato i tuoi veicoli, documenti, note e spese. Puoi chiedermi qualsiasi cosa o insegnarmi nuove informazioni dicendo ad esempio:\n> *"Ricordati che il mio pin è 1234"*`,
        timestamp: Date.now(),
      }
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [showMemoryDrawer, setShowMemoryDrawer] = useState(false);
  const [memories, setMemories] = useState<AiMemory[]>(() => getLearnedMemories());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form per nuova memoria manuale
  const [newKey, setNewKey] = useState('');
  const [newFact, setNewFact] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll in basso
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Salva cronologia quando cambia
  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  // Ferma audio all'unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSend = async (customQuery?: string) => {
    const queryToSend = (customQuery || inputText).trim();
    if (!queryToSend || isProcessing) return;

    const userMsg: AiMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: queryToSend,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);

    try {
      const response = await queryGemmaNano(queryToSend, modules, username);
      const assistantMsg: AiMessage = {
        id: 'msg_ai_' + Date.now(),
        sender: 'assistant',
        text: response.text,
        timestamp: Date.now(),
        actions: response.actions,
        learnedFact: response.learnedFact,
      };

      setMessages(prev => [...prev, assistantMsg]);
      // Ricarica memorie se ne è stata appresa una nuova
      if (response.learnedFact) {
        setMemories(getLearnedMemories());
      }
    } catch (e) {
      console.error('Gemma Nano query error', e);
      setMessages(prev => [
        ...prev,
        {
          id: 'msg_err_' + Date.now(),
          sender: 'assistant',
          text: `⚠️ Si è verificato un errore durante l'elaborazione locale: riprova tra un istante.`,
          timestamp: Date.now(),
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSpeechInput = async () => {
    // 1. Prova Capacitor Speech Recognition nativo
    try {
      const isAvailable = await SpeechRecognition.available();
      if (isAvailable.available) {
        const perm = await SpeechRecognition.checkPermissions();
        if (perm.speechRecognition !== 'granted') {
          await SpeechRecognition.requestPermissions();
        }
        setIsListening(true);
        SpeechRecognition.start({
          language: 'it-IT',
          maxResults: 1,
          prompt: 'Chiedi a Chelona AI...',
          partialResults: false,
          popup: true,
        }).then((result) => {
          if (result.matches && result.matches.length > 0) {
            handleSend(result.matches[0]);
          }
        }).catch(err => {
          console.warn('Speech error', err);
        }).finally(() => {
          setIsListening(false);
        });
        return;
      }
    } catch (e) {
      // Ignora e prova Web Speech API
    }

    // 2. Web Speech API Fallback
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      showToast('Il riconoscimento vocale non è disponibile su questo dispositivo.', 'error');
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'it-IT';
      rec.continuous = false;
      rec.interimResults = false;

      setIsListening(true);

      rec.onresult = (evt: any) => {
        const text = evt.results[0][0].transcript;
        if (text) {
          handleSend(text);
        }
        setIsListening(false);
      };

      rec.onerror = () => {
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.start();
    } catch {
      setIsListening(false);
      showToast('Errore durante l\'ascolto vocale.', 'error');
    }
  };

  const handleSpeak = (msgId: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      showToast('Sintesi vocale non supportata.', 'error');
      return;
    }

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Pulisci il testo da markdown e simboli prima di parlarlo
    const cleanText = text
      .replace(/[*_#`~>]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n+/g, ' ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'it-IT';
    utterance.rate = 1.05;

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Testo copiato!');
  };

  const handleClearChat = () => {
    if (confirm('Sei sicuro di voler cancellare la cronologia della chat?')) {
      const resetMsg: AiMessage[] = [
        {
          id: 'msg_welcome_' + Date.now(),
          sender: 'assistant',
          text: `👋 Cronologia azzerata. Sono pronto ad aiutarti con i tuoi dati locali su Chelona!`,
          timestamp: Date.now(),
        }
      ];
      setMessages(resetMsg);
      saveChatHistory(resetMsg);
      showToast('Chat cancellata.');
    }
  };

  const handleAddManualMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newFact.trim()) return;

    saveLearnedMemory({
      key: newKey.trim(),
      fact: newFact.trim(),
      category: 'custom',
      source: 'learned_from_chat',
    });

    setMemories(getLearnedMemories());
    setNewKey('');
    setNewFact('');
    showToast('Nuova memoria memorizzata!', 'success');
  };

  const handleDeleteMemory = (id: string) => {
    deleteLearnedMemory(id);
    setMemories(getLearnedMemories());
    showToast('Memoria eliminata.');
  };

  const knowledge = buildKnowledgeBase(modules, username);

  const quickPrompts = [
    { label: '📅 Scadenze imminenti', query: 'Quali scadenze imminenti ho nei prossimi 60 giorni?' },
    { label: '🚗 Situazione auto', query: 'Fammi un riepilogo delle mie auto, scadenze e km' },
    { label: '📄 I miei documenti', query: 'Quali documenti personali ho salvato?' },
    { label: '💰 Spese e rate', query: 'Come sono messe le mie spese e rate questo mese?' },
    { label: '🧠 Cosa sai su di me?', query: 'Cosa sai su di me e cosa hai imparato finora?' },
    { label: '🏋️ Piano fitness', query: 'Riepilogo del mio piano fitness e calorie' },
  ];

  return (
    <div className="fixed inset-0 z-[120] bg-[var(--bg)] flex flex-col h-[100dvh] overflow-hidden font-sans transition-colors duration-300">
      {/* HEADER */}
      <header className="h-20 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-2xl px-4 lg:px-8 flex items-center justify-between shrink-0 z-20 safe-area-header shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-[var(--surface-variant)] rounded-2xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors active:scale-95"
            title="Torna indietro"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500 text-white flex items-center justify-center font-bold shrink-0 shadow-lg shadow-amber-500/20">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg lg:text-xl font-black text-[var(--text-main)] tracking-tight">Chelona AI</h2>
              <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500/10 to-indigo-500/10 text-[var(--accent)] px-2.5 py-0.5 rounded-full border border-[var(--accent)]/30">
                Gemma 4 Nano
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
              100% On-Device • Zero API • Privacy Assoluta
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMemoryDrawer(true)}
            className="px-3.5 py-2 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] text-xs font-bold transition-all flex items-center gap-2 border border-[var(--border)] active:scale-95 shadow-sm"
            title="Visualizza memoria locale"
          >
            <Brain className="w-4 h-4 text-[var(--accent)]" />
            <span className="hidden sm:inline">Memoria</span>
            <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[10px] flex items-center justify-center font-bold">
              {memories.length}
            </span>
          </button>

          <button
            onClick={handleClearChat}
            className="p-2.5 rounded-2xl bg-[var(--surface-variant)] hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 transition-colors border border-[var(--border)] active:scale-95"
            title="Pulisci chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* CHAT MESSAGES BODY */}
      <main className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 space-y-6 max-w-4xl w-full mx-auto custom-scrollbar">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div className={`flex items-start gap-3 max-w-[92%] sm:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isUser ? (
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-amber-500/20 mt-1">
                    <Sparkles className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-[var(--accent)]/20 mt-1">
                    {username ? username.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}

                <div
                  className={`rounded-3xl p-5 shadow-sm text-sm leading-relaxed transition-all ${
                    isUser
                      ? 'bg-[var(--accent)] text-white rounded-tr-none'
                      : 'bg-[var(--card-bg)] text-[var(--text-main)] border border-[var(--border)] rounded-tl-none shadow-md'
                  }`}
                >
                  {/* Se ha appreso un fatto, mostra badge */}
                  {msg.learnedFact && (
                    <div className="mb-3 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center gap-2 text-xs font-bold">
                      <Brain className="w-4 h-4 shrink-0" />
                      <span>Nuova conoscenza memorizzata in locale</span>
                    </div>
                  )}

                  {/* Testo formattato */}
                  <div className="whitespace-pre-line prose prose-sm max-w-none text-inherit">
                    {msg.text}
                  </div>

                  {/* Azioni interattive rapide */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[var(--border)]/50 flex flex-wrap gap-2">
                      {msg.actions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (act.type === 'module' && act.module) {
                              onOpenModule(act.module);
                              onClose();
                            } else if (act.type === 'category' && act.category) {
                              onOpenCategory(act.category);
                              onClose();
                            }
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--accent)] hover:text-white border border-[var(--border)] text-xs font-bold text-[var(--text-main)] transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{act.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Footer bubble per Assistant */}
                  {!isUser && (
                    <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-[var(--text-muted)] border-t border-[var(--border)]/30">
                      <span>Gemma 4 Nano</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleSpeak(msg.id, msg.text)}
                          className="hover:text-[var(--accent)] transition-colors p-1"
                          title="Ascolta risposta"
                        >
                          {speakingMessageId === msg.id ? (
                            <VolumeX className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="hover:text-[var(--accent)] transition-colors p-1"
                          title="Copia testo"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-amber-500/20">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl rounded-tl-none p-4 shadow-sm flex items-center gap-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    className="w-2 h-2 rounded-full bg-[var(--accent)]"
                  />
                ))}
              </div>
              <span className="text-xs text-[var(--text-muted)] font-medium">Gemma 4 Nano sta elaborando in locale...</span>
            </div>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </main>

      {/* QUICK SUGGESTIONS CAROUSEL */}
      <div className="px-4 lg:px-8 py-2 max-w-4xl w-full mx-auto overflow-x-auto no-scrollbar flex items-center gap-2">
        {quickPrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSend(p.query)}
            disabled={isProcessing}
            className="shrink-0 px-3.5 py-1.5 rounded-full bg-[var(--card-bg)] hover:bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-bold text-[var(--text-main)] transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* INPUT FOOTER */}
      <footer className="p-4 lg:px-8 lg:py-5 border-t border-[var(--border)] bg-[var(--card-bg)]/80 backdrop-blur-xl shrink-0 safe-area-inset-bottom">
        <div className="max-w-4xl mx-auto flex items-end gap-3">
          <button
            type="button"
            onClick={handleSpeechInput}
            className={`p-3.5 rounded-2xl border transition-all shrink-0 active:scale-95 shadow-sm ${
              isListening
                ? 'bg-rose-500 text-white border-rose-500 animate-pulse'
                : 'bg-[var(--surface-variant)] hover:bg-[var(--border)] border-[var(--border)] text-[var(--accent)]'
            }`}
            title="Dettatura vocale"
          >
            <Mic className="w-5 h-5" />
          </button>

          <div className="flex-1 bg-[var(--surface-variant)] rounded-2xl border border-[var(--border)] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/20 transition-all p-2 flex items-center">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Chiedi a Gemma 4 Nano o insegna qualcosa..."
              className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] resize-none py-1.5 px-2 max-h-32"
            />
          </div>

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isProcessing}
            className="p-3.5 rounded-2xl bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 text-white transition-all shrink-0 active:scale-95 shadow-md shadow-[var(--accent)]/20"
            title="Invia messaggio"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* DRAWER MEMORIA LOCALE */}
      <AnimatePresence>
        {showMemoryDrawer && (
          <div className="fixed inset-0 z-[150] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMemoryDrawer(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-[var(--bg)] h-full border-l border-[var(--border)] shadow-2xl flex flex-col z-10 safe-area-inset"
            >
              <div className="h-20 border-b border-[var(--border)] px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-main)]">Memoria Locale</h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium">Gemma 4 Nano Learning Engine</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMemoryDrawer(false)}
                  className="p-2 hover:bg-[var(--surface-variant)] rounded-xl text-[var(--text-muted)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Moduli sincronizzati in tempo reale */}
                <div className="p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--accent)]">
                    Dati Appresi dai Moduli
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-2xl bg-[var(--surface-variant)]">
                      <p className="text-[var(--text-muted)]">Veicoli</p>
                      <p className="font-bold text-base text-[var(--text-main)]">{knowledge.vehicles.length}</p>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-[var(--surface-variant)]">
                      <p className="text-[var(--text-muted)]">Documenti</p>
                      <p className="font-bold text-base text-[var(--text-main)]">{knowledge.documents.length}</p>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-[var(--surface-variant)]">
                      <p className="text-[var(--text-muted)]">Note</p>
                      <p className="font-bold text-base text-[var(--text-main)]">{knowledge.notes.length}</p>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-[var(--surface-variant)]">
                      <p className="text-[var(--text-muted)]">Scadenze a 60gg</p>
                      <p className="font-bold text-base text-[var(--text-main)]">{knowledge.urgentDeadlines.length}</p>
                    </div>
                  </div>
                </div>

                {/* Form nuova memoria */}
                <form onSubmit={handleAddManualMemory} className="p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)] flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
                    Insegna una nuova informazione
                  </h4>
                  <input
                    type="text"
                    value={newKey}
                    onChange={e => setNewKey(e.target.value)}
                    placeholder="Argomento (es. Allergia, Codice cancello, Taglia...)"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <textarea
                    rows={2}
                    value={newFact}
                    onChange={e => setNewFact(e.target.value)}
                    placeholder="Informazione da memorizzare..."
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
                  />
                  <button
                    type="submit"
                    disabled={!newKey.trim() || !newFact.trim()}
                    className="w-full py-2 bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
                  >
                    Salva nella Memoria
                  </button>
                </form>

                {/* Lista memorie personali */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                      Memorie Apprese ({memories.length})
                    </h4>
                    {memories.length > 0 && (
                      <button
                        onClick={() => {
                          if (confirm('Vuoi cancellare tutte le memorie personalizzate?')) {
                            clearAllLearnedMemories();
                            setMemories([]);
                            showToast('Memorie cancellate.');
                          }
                        }}
                        className="text-[11px] font-bold text-rose-500 hover:underline"
                      >
                        Azzera tutto
                      </button>
                    )}
                  </div>

                  {memories.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-[var(--border)] rounded-3xl">
                      <Brain className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
                      <p className="text-xs text-[var(--text-muted)] font-medium">Nessuna memoria personalizzata registrata.</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">Scrivi all'AI in chat *"Ricordati che..."* per memorizzare dati al volo!</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {memories.map(m => (
                        <div
                          key={m.id}
                          className="p-3.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] flex items-start justify-between gap-3 shadow-sm hover:border-[var(--accent)]/50 transition-colors"
                        >
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--accent)] px-2 py-0.5 rounded-md bg-[var(--accent-bg)] border border-[var(--accent)]/20 inline-block mb-1">
                              {m.key}
                            </span>
                            <p className="text-xs text-[var(--text-main)] font-medium leading-relaxed">{m.fact}</p>
                            <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                              {new Date(m.createdAt).toLocaleDateString('it-IT')}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteMemory(m.id)}
                            className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                            title="Elimina memoria"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
