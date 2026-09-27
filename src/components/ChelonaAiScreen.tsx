import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Mic, MicOff, Volume2, VolumeX, Trash2, ArrowLeft, 
  Brain, ExternalLink, Check, Copy, Plus, X,
  Radio, Car, FileText, CreditCard, StickyNote, Activity, Sparkles,
  Settings2, Sliders, Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Module } from '../types';
import { 
  AiMessage, AiMemory, getChatHistory, saveChatHistory, 
  getLearnedMemories, deleteLearnedMemory, clearAllLearnedMemories, 
  saveLearnedMemory, queryGemmaNano, buildKnowledgeBase 
} from '../services/gemmaNanoEngine';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import {
  prepareNaturalSpeech,
  splitIntoSentences,
  filterItalianVoices,
  getBestItalianVoice,
  getVoiceFriendlyName
} from '../utils/naturalSpeech';
import { getSavedParking, getNavigationUrl } from '../services/parkingService';
import { wakeWordService } from '../services/wakeWordService';

interface ChelonaAiScreenProps {
  modules: Module[];
  username: string;
  onClose: () => void;
  onOpenModule: (module: Module) => void;
  onOpenCategory: (category: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  mode?: 'embedded' | 'fullscreen';
  onAddModule?: (module: Module) => void;
  onOpenParking?: () => void;
  initialVoiceMode?: boolean;
}

type NeuralCategory = 'all' | 'vehicles' | 'documents' | 'finances' | 'notes' | 'fitness' | 'memories';

export const ChelonaAiScreen: React.FC<ChelonaAiScreenProps> = ({
  modules,
  username,
  onClose,
  onOpenModule,
  onOpenCategory,
  showToast,
  mode = 'fullscreen',
  onAddModule,
  onOpenParking,
  initialVoiceMode = false,
}) => {
  const [messages, setMessages] = useState<AiMessage[]>(() => {
    const history = getChatHistory();
    if (history.length > 0) return history;
    return [
      {
        id: 'msg_welcome_' + Date.now(),
        sender: 'assistant',
        text: `Ciao ${username || ''}! Come posso aiutarti oggi? Conosco le tue note, i veicoli, i documenti e le spese. Puoi chiedermi qualsiasi cosa o dirmi *"Ricordati che..."* per salvare promemoria.`,
        timestamp: Date.now(),
      }
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [showMemoryDrawer, setShowMemoryDrawer] = useState(false);
  const [activeNeuralCategory, setActiveNeuralCategory] = useState<NeuralCategory>('all');
  const [memories, setMemories] = useState<AiMemory[]>(() => getLearnedMemories());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Voci di sintesi vocale e preferenze umane
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speechRate, setSpeechRate] = useState<number>(() => {
    const saved = localStorage.getItem('chelona_speech_rate');
    return saved ? parseFloat(saved) : 0.97;
  });
  const [speechPitch, setSpeechPitch] = useState<number>(() => {
    const saved = localStorage.getItem('chelona_speech_pitch');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [previewingVoiceUri, setPreviewingVoiceUri] = useState<string | null>(null);

  const cancelSpeechRef = useRef(false);

  // Modalità interazione vocale a tutto schermo (Voice Mode)
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [lastUserSpeech, setLastUserSpeech] = useState<string>('');
  const [lastAiSpeech, setLastAiSpeech] = useState<string>('');

  // Form per nuova memoria manuale
  const [newKey, setNewKey] = useState('');
  const [newFact, setNewFact] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEmbedded = mode === 'embedded';

  // Auto-scroll in basso nella chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Salva cronologia quando cambia
  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  // Rilevamento e aggiornamento voci di sistema
  useEffect(() => {
    const updateVoices = () => {
      if (!('speechSynthesis' in window)) return;
      const all = window.speechSynthesis.getVoices();
      const italian = filterItalianVoices(all);
      const pool = italian.length > 0 ? italian : all;
      setAvailableVoices(pool);

      const savedUri = localStorage.getItem('chelona_preferred_voice_uri');
      if (savedUri) {
        const found = pool.find(v => v.voiceURI === savedUri);
        if (found) {
          setSelectedVoice(found);
          return;
        }
      }

      const best = getBestItalianVoice(pool);
      if (best) {
        setSelectedVoice(best);
      }
    };

    updateVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      cancelSpeechRef.current = true;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const stopSpeaking = () => {
    cancelSpeechRef.current = true;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setVoiceStatus('idle');
    setSpeakingMessageId(null);
    setPreviewingVoiceUri(null);
  };

  const speakText = (text: string, onEndCallback?: () => void, overrideVoice?: SpeechSynthesisVoice) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    cancelSpeechRef.current = false;

    // Normalizza il testo rendendolo fluido e naturale in italiano parlato
    const naturalText = prepareNaturalSpeech(text);
    if (!naturalText) {
      setVoiceStatus('idle');
      if (onEndCallback) onEndCallback();
      return;
    }

    const sentences = splitIntoSentences(naturalText);
    if (sentences.length === 0) {
      setVoiceStatus('idle');
      if (onEndCallback) onEndCallback();
      return;
    }

    setVoiceStatus('speaking');
    let idx = 0;
    const currentVoice = overrideVoice || selectedVoice;

    const speakNext = () => {
      if (cancelSpeechRef.current || idx >= sentences.length) {
        setVoiceStatus('idle');
        if (onEndCallback && !cancelSpeechRef.current) {
          onEndCallback();
        }
        return;
      }

      const sentence = sentences[idx++];
      const utterance = new SpeechSynthesisUtterance(sentence);

      if (currentVoice) {
        utterance.voice = currentVoice;
        utterance.lang = currentVoice.lang || 'it-IT';
      } else {
        utterance.lang = 'it-IT';
      }

      utterance.rate = speechRate;
      utterance.pitch = speechPitch;

      utterance.onend = () => {
        if (cancelSpeechRef.current) {
          setVoiceStatus('idle');
          return;
        }
        // Piccola pausa naturale tra frasi
        setTimeout(speakNext, 70);
      };

      utterance.onerror = (e) => {
        console.warn('Speech sentence warning:', e);
        if (!cancelSpeechRef.current && idx < sentences.length) {
          setTimeout(speakNext, 50);
        } else {
          setVoiceStatus('idle');
          if (onEndCallback && !cancelSpeechRef.current) onEndCallback();
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  };

  const handleSelectVoice = (v: SpeechSynthesisVoice) => {
    setSelectedVoice(v);
    localStorage.setItem('chelona_preferred_voice_uri', v.voiceURI);
    showToast(`Voce impostata: ${getVoiceFriendlyName(v)}`, 'info');
  };

  const handleUpdateRate = (rate: number) => {
    setSpeechRate(rate);
    localStorage.setItem('chelona_speech_rate', rate.toString());
  };

  const handleUpdatePitch = (pitch: number) => {
    setSpeechPitch(pitch);
    localStorage.setItem('chelona_speech_pitch', pitch.toString());
  };

  const handlePreviewVoice = (v: SpeechSynthesisVoice) => {
    stopSpeaking();
    setPreviewingVoiceUri(v.voiceURI);
    speakText(
      `Ciao! Questa è la voce ${getVoiceFriendlyName(v)}, pronta ad aiutarti in Chelona.`,
      () => setPreviewingVoiceUri(null),
      v
    );
  };

  const handleSend = async (customQuery?: string, isVoiceSession = false) => {
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

    if (isVoiceSession) {
      setLastUserSpeech(queryToSend);
      setVoiceStatus('thinking');
    }

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
      
      if (response.learnedFact) {
        setMemories(getLearnedMemories());
      }

      if (response.createdModule && onAddModule) {
        onAddModule(response.createdModule);
      }

      if (isVoiceSession) {
        setLastAiSpeech(response.text);
        speakText(response.text, () => {
          // Quando ha finito di parlare, riattiva automaticamente l'ascolto per dialogo continuo!
          if (isVoiceModeOpen) {
            setTimeout(() => {
              startVoiceRecognition(true);
            }, 400);
          }
        });
      }
    } catch (e) {
      console.error('AI query error', e);
      const errMsg = `Scusami, si è verificato un piccolo errore. Riprova tra un attimo.`;
      setMessages(prev => [
        ...prev,
        {
          id: 'msg_err_' + Date.now(),
          sender: 'assistant',
          text: errMsg,
          timestamp: Date.now(),
        }
      ]);
      if (isVoiceSession) {
        speakText(errMsg);
      }
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

  const startVoiceRecognition = async (isVoiceSession = false) => {
    if (isVoiceSession) {
      setVoiceStatus('listening');
    } else {
      setIsListening(true);
    }

    // 1. Prova Capacitor Speech Recognition nativo
    try {
      const isAvailable = await SpeechRecognition.available();
      if (isAvailable.available) {
        const perm = await SpeechRecognition.checkPermissions();
        if (perm.speechRecognition !== 'granted') {
          await SpeechRecognition.requestPermissions();
        }
        
        SpeechRecognition.start({
          language: 'it-IT',
          maxResults: 1,
          prompt: 'Parla con Chelona...',
          partialResults: false,
          popup: !isVoiceSession,
        }).then((result) => {
          if (result.matches && result.matches.length > 0) {
            handleSend(result.matches[0], isVoiceSession);
          } else if (isVoiceSession) {
            setVoiceStatus('idle');
          }
        }).catch(err => {
          console.warn('Speech error', err);
          if (isVoiceSession) setVoiceStatus('idle');
        }).finally(() => {
          setIsListening(false);
        });
        return;
      }
    } catch (e) {
      // Prova fallback Web Speech API
    }

    // 2. Web Speech API Fallback
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      showToast('Riconoscimento vocale non supportato su questo dispositivo.', 'error');
      if (isVoiceSession) setVoiceStatus('idle');
      setIsListening(false);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'it-IT';
      rec.continuous = false;
      rec.interimResults = false;

      rec.onresult = (evt: any) => {
        const text = evt.results[0][0].transcript;
        if (text) {
          handleSend(text, isVoiceSession);
        } else if (isVoiceSession) {
          setVoiceStatus('idle');
        }
        setIsListening(false);
      };

      rec.onerror = () => {
        setIsListening(false);
        if (isVoiceSession) setVoiceStatus('idle');
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.start();
    } catch {
      setIsListening(false);
      if (isVoiceSession) setVoiceStatus('idle');
      showToast('Errore durante l\'ascolto vocale.', 'error');
    }
  };

  const toggleVoiceMode = () => {
    if (!isVoiceModeOpen) {
      setIsVoiceModeOpen(true);
      setShowVoiceSettings(false);
      setLastUserSpeech('');
      const greeting = `Ciao ${username ? username + ', ' : ''}dimmi pure, ti ascolto.`;
      setLastAiSpeech(greeting);
      speakText(greeting, () => {
        setTimeout(() => {
          startVoiceRecognition(true);
        }, 250);
      });
    } else {
      stopSpeaking();
      setIsVoiceModeOpen(false);
      setShowVoiceSettings(false);
      setVoiceStatus('idle');
    }
  };

  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState<boolean>(() => wakeWordService.getEnabled());
  const initialVoiceTriggeredRef = useRef(false);

  useEffect(() => {
    return wakeWordService.subscribe((state) => {
      setIsWakeWordEnabled(state.isEnabled);
    });
  }, []);

  const handleToggleWakeWord = async () => {
    const next = !isWakeWordEnabled;
    const ok = await wakeWordService.setEnabled(next);
    if (ok) {
      setIsWakeWordEnabled(next);
      showToast(
        next
          ? 'Comando vocale attivo! Di\' "Ciao Chelona" per parlare.'
          : 'Comando vocale disattivato.',
        next ? 'success' : 'info'
      );
    } else {
      showToast('Permesso microfono necessario per attivare il comando vocale.', 'error');
    }
  };

  useEffect(() => {
    if (initialVoiceMode && !initialVoiceTriggeredRef.current && !isVoiceModeOpen) {
      initialVoiceTriggeredRef.current = true;
      const t = setTimeout(() => {
        toggleVoiceMode();
      }, 300);
      return () => clearTimeout(t);
    }
  }, [initialVoiceMode, isVoiceModeOpen]);

  const handleSpeak = (msgId: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      showToast('Sintesi vocale non supportata.', 'error');
      return;
    }

    if (speakingMessageId === msgId) {
      stopSpeaking();
      return;
    }

    stopSpeaking();
    setSpeakingMessageId(msgId);
    speakText(text, () => setSpeakingMessageId(null));
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Copiato!');
  };

  const handleClearChat = () => {
    if (confirm('Vuoi cancellare la conversazione?')) {
      const resetMsg: AiMessage[] = [
        {
          id: 'msg_welcome_' + Date.now(),
          sender: 'assistant',
          text: `Chat cancellata. Sono qui se hai bisogno!`,
          timestamp: Date.now(),
        }
      ];
      setMessages(resetMsg);
      saveChatHistory(resetMsg);
      showToast('Conversazione cancellata.');
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
    showToast('Memoria salvata!', 'success');
  };

  const handleDeleteMemory = (id: string) => {
    deleteLearnedMemory(id);
    setMemories(getLearnedMemories());
    showToast('Memoria rimossa.');
  };

  const knowledge = buildKnowledgeBase(modules, username);

  // Nodi del Diagramma Neurale
  const neuralNodes = [
    { id: 'vehicles', label: 'Veicoli', count: knowledge.vehicles.length, icon: Car, color: '#f59e0b', angle: 30 },
    { id: 'documents', label: 'Documenti', count: knowledge.documents.length, icon: FileText, color: '#3b82f6', angle: 90 },
    { id: 'finances', label: 'Finanze', count: knowledge.installments.modules.length + knowledge.expenses.count, icon: CreditCard, color: '#10b981', angle: 150 },
    { id: 'notes', label: 'Appunti', count: knowledge.notes.length, icon: StickyNote, color: '#8b5cf6', angle: 210 },
    { id: 'fitness', label: 'Fitness', count: knowledge.fitness ? 1 : 0, icon: Activity, color: '#ec4899', angle: 270 },
    { id: 'memories', label: 'Memorie', count: memories.length, icon: Brain, color: '#f97316', angle: 330 },
  ];

  const quickPrompts = [
    { label: '📍 Salva Parcheggio', query: 'Salva il parcheggio qui' },
    { label: '🚗 Dov\'è l\'auto?', query: 'Dove ho parcheggiato la mia auto?' },
    { label: '📅 Scadenze', query: 'Quali scadenze imminenti ho nei prossimi 60 giorni?' },
    { label: '🚗 La mia auto', query: 'Fammi un riepilogo della mia auto, scadenze e km' },
    { label: '📄 Documenti', query: 'Quali documenti personali ho salvato?' },
    { label: '💰 Spese e rate', query: 'Come sono messe le mie spese e rate questo mese?' },
    { label: '🧠 Cosa sai di me?', query: 'Cosa sai su di me e cosa hai imparato finora?' },
  ];

  return (
    <div className={
      isEmbedded 
        ? "flex flex-col h-full w-full bg-[var(--bg)] font-sans relative transition-colors duration-300"
        : "fixed inset-0 z-[120] bg-[var(--bg)] flex flex-col h-[100dvh] overflow-hidden font-sans transition-colors duration-300"
    }>
      {/* HEADER PULITO CON LOGO CHELONA - SOLO IN FULLSCREEN */}
      {!isEmbedded && (
        <header className="h-16 lg:h-20 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-2xl px-4 lg:px-8 flex items-center justify-between shrink-0 z-20 safe-area-header shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--surface-variant)] rounded-2xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors active:scale-95"
              title="Torna indietro"
            >
              <ArrowLeft className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
            
            <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
              <img src="/chelona_logo.png" alt="Chelona AI" className="w-full h-full object-contain" />
            </div>

            <div>
              <h2 className="text-base lg:text-lg font-black text-[var(--text-main)] tracking-tight">Chelona AI</h2>
              <p className="text-xs text-[var(--text-muted)] font-medium">Il tuo assistente personale</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleVoiceMode}
              className="px-3 py-1.5 lg:px-4 lg:py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 hover:opacity-95"
              title="Avvia conversazione a voce"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span className="hidden sm:inline">Voce</span>
            </button>

            <button
              onClick={() => setShowMemoryDrawer(true)}
              className="px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] text-xs font-bold transition-all flex items-center gap-1.5 border border-[var(--border)] active:scale-95 shadow-sm"
              title="Visualizza memoria"
            >
              <Brain className="w-4 h-4 text-amber-500" />
              <span className="hidden md:inline">Memoria</span>
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                {memories.length}
              </span>
            </button>

            <button
              onClick={handleClearChat}
              className="p-2 lg:p-2.5 rounded-2xl bg-[var(--surface-variant)] hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 transition-colors border border-[var(--border)] active:scale-95"
              title="Pulisci chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* CHAT MESSAGES BODY */}
      <main className="flex-1 overflow-y-auto px-4 lg:px-8 py-5 space-y-5 max-w-3xl w-full mx-auto custom-scrollbar">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div className={`flex items-start gap-2.5 max-w-[94%] sm:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isUser ? (
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 p-0.5 flex items-center justify-center shrink-0 mt-1 shadow-sm overflow-hidden">
                      <img src="/chelona_logo.png" alt="Chelona" className="w-full h-full object-contain" />
                    </div>
                  ) : null}

                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed transition-all ${
                      isUser
                        ? 'bg-[var(--accent)] text-white rounded-tr-none shadow-sm'
                        : 'bg-[var(--card-bg)] text-[var(--text-main)] border border-[var(--border)] rounded-tl-none shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-line text-inherit text-[13.5px]">
                      {msg.text}
                    </div>

                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-[var(--border)]/40 flex flex-wrap gap-1.5">
                        {msg.actions.map((act, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              if (act.type === 'parking' && onOpenParking) {
                                onOpenParking();
                                if (!isEmbedded) onClose();
                              } else if (act.type === 'navigate_parking') {
                                if (act.url) {
                                  window.open(act.url, '_blank');
                                } else {
                                  const p = getSavedParking();
                                  if (p) window.open(getNavigationUrl(p.latitude, p.longitude), '_blank');
                                }
                              } else if (act.type === 'save_parking') {
                                handleSend('Salva il parcheggio qui');
                              } else if (act.type === 'module' && act.module) {
                                onOpenModule(act.module);
                                if (!isEmbedded) onClose();
                              } else if (act.type === 'category' && act.category) {
                                onOpenCategory(act.category);
                                if (!isEmbedded) onClose();
                              }
                            }}
                            className="px-3 py-1 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--accent)] hover:text-white border border-[var(--border)] text-xs font-semibold text-[var(--text-main)] transition-all flex items-center gap-1.5 active:scale-95 shadow-xs"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>{act.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {!isUser && (
                      <div className="mt-2 pt-1 flex items-center justify-end gap-2 text-[11px] text-[var(--text-muted)]">
                        <button
                          onClick={() => handleSpeak(msg.id, msg.text)}
                          className="hover:text-amber-500 transition-colors p-1"
                          title="Ascolta"
                        >
                          {speakingMessageId === msg.id ? (
                            <VolumeX className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="hover:text-amber-500 transition-colors p-1"
                          title="Copia"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-xs text-[var(--text-muted)] pl-10"
            >
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
                    className="w-1.5 h-1.5 rounded-full bg-amber-500"
                  />
                ))}
              </div>
              <span>Chelona sta scrivendo...</span>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </main>

      {/* QUICK SUGGESTIONS DISCRETE */}
      <div className="px-4 lg:px-8 py-2 max-w-3xl w-full mx-auto overflow-x-auto no-scrollbar flex items-center gap-2 shrink-0">
        {quickPrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSend(p.query)}
            disabled={isProcessing}
            className="shrink-0 px-3 py-1 rounded-full bg-[var(--card-bg)] hover:bg-[var(--surface-variant)] border border-[var(--border)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all shadow-xs active:scale-95 disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* INPUT FOOTER PULITO */}
      <footer className={`p-3 lg:px-8 lg:py-4 shrink-0 safe-area-inset-bottom ${!isEmbedded ? 'border-t border-[var(--border)] bg-[var(--card-bg)]/80 backdrop-blur-xl' : 'bg-transparent'}`}>
        <div className="max-w-3xl mx-auto flex flex-col gap-2.5">
          {isEmbedded && (
            <div className="flex items-center justify-end gap-2 px-1">
              <button
                onClick={toggleVoiceMode}
                className="px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 hover:opacity-95"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Voce</span>
              </button>

              <button
                onClick={() => setShowMemoryDrawer(true)}
                className="px-3 py-1.5 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] text-xs font-bold transition-all flex items-center gap-1.5 border border-[var(--border)] active:scale-95 shadow-sm"
              >
                <Brain className="w-3.5 h-3.5 text-amber-500" />
                <span>Memoria</span>
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {memories.length}
                </span>
              </button>

              <button
                onClick={handleClearChat}
                className="p-1.5 rounded-2xl bg-[var(--surface-variant)] hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 transition-colors border border-[var(--border)] active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2.5">
            <button
              type="button"
              onClick={() => startVoiceRecognition(false)}
              className={`p-3 rounded-2xl border transition-all shrink-0 active:scale-95 shadow-xs ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-500 animate-pulse'
                  : 'bg-[var(--surface-variant)] hover:bg-[var(--border)] border-[var(--border)] text-amber-500'
              }`}
              title="Dettatura vocale"
            >
              <Mic className="w-5 h-5" />
            </button>

            <div className="flex-1 bg-[var(--surface-variant)] rounded-2xl border border-[var(--border)] focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all p-1.5 flex items-center">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Scrivi a Chelona o insegna qualcosa..."
                className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] resize-none py-1.5 px-2 max-h-28"
              />
            </div>

            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isProcessing}
              className="p-3 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white transition-all shrink-0 active:scale-95 shadow-md shadow-amber-500/20"
              title="Invia messaggio"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </footer>

      {/* OVERLAY INTERAZIONE VOCALE A TUTTO SCHERMO (VOICE MODE) */}
      <AnimatePresence>
        {isVoiceModeOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] bg-[var(--bg)]/95 backdrop-blur-2xl flex flex-col justify-between p-6 lg:p-12 safe-area-inset"
          >
            {/* Header Voce */}
            <div className="flex items-center justify-between w-full max-w-xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-1 flex items-center justify-center overflow-hidden">
                  <img src="/chelona_logo.png" alt="Chelona" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[var(--text-main)]">Conversazione Vocale</h3>
                  <p className="text-xs text-[var(--text-muted)]">Parla con Chelona a mani libere</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                  className={`p-2.5 rounded-full transition-colors border active:scale-95 ${
                    showVoiceSettings
                      ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                      : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] border-[var(--border)]'
                  }`}
                  title="Configura voce naturale"
                >
                  <Settings2 className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={toggleVoiceMode}
                  className="p-2.5 rounded-full bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border border-[var(--border)] active:scale-95"
                  title="Chiudi modalità voce"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Centro: Configurazione Voce OPPURE Visualizzatore Orb Vocale */}
            {showVoiceSettings ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md mx-auto my-auto bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-5 lg:p-6 shadow-2xl space-y-4 overflow-y-auto max-h-[70vh]"
              >
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-500" />
                    <h4 className="text-sm font-black text-[var(--text-main)]">Sintesi Vocale Umana</h4>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    100% Locale
                  </span>
                </div>

                {/* Scelta Voce */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Voci Italiane ({availableVoices.length})
                    </label>
                    <span className="text-[10px] text-[var(--text-muted)]">Tocca per selezionare</span>
                  </div>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {availableVoices.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)] italic py-2">
                        Rilevamento voci di sistema in corso...
                      </p>
                    ) : (
                      availableVoices.map((v) => {
                        const isSelected = selectedVoice?.voiceURI === v.voiceURI;
                        const isPreviewing = previewingVoiceUri === v.voiceURI;
                        const friendly = getVoiceFriendlyName(v);
                        const isHd = friendly.includes('HD') || friendly.includes('Alta Fedeltà') || friendly.includes('Naturale');

                        return (
                          <div
                            key={v.voiceURI}
                            onClick={() => handleSelectVoice(v)}
                            className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500/40 text-[var(--text-main)] shadow-xs'
                                : 'bg-[var(--surface-variant)]/60 border-[var(--border)]/60 hover:border-amber-500/30 text-[var(--text-muted)]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-amber-500 bg-amber-500' : 'border-[var(--text-muted)]'
                              }`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs font-bold truncate ${isSelected ? 'text-amber-500' : 'text-[var(--text-main)]'}`}>
                                  {friendly}
                                </p>
                                <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                                  <span>{v.lang}</span>
                                  {isHd && (
                                    <span className="text-amber-500 bg-amber-500/10 px-1 rounded font-bold text-[9px]">
                                      HD
                                    </span>
                                  )}
                                  {v.default && (
                                    <span className="text-sky-500 bg-sky-500/10 px-1 rounded font-bold text-[9px]">
                                      Default
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreviewVoice(v);
                              }}
                              className={`p-1.5 rounded-xl border transition-colors shrink-0 ${
                                isPreviewing
                                  ? 'bg-amber-500 text-white border-amber-500 animate-pulse'
                                  : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-amber-500 border-[var(--border)]'
                              }`}
                              title="Ascolta anteprima voce"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Cadenza / Velocità */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Cadenza e Ritmo
                    </label>
                    <span className="text-xs font-mono font-bold text-amber-500">{speechRate.toFixed(2)}x</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: 'Rilassata', val: 0.90 },
                      { label: 'Naturale ✨', val: 0.97 },
                      { label: 'Dinamica', val: 1.05 },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleUpdateRate(item.val)}
                        className={`py-2 px-1 text-center rounded-xl border text-xs font-semibold transition-all ${
                          Math.abs(speechRate - item.val) < 0.03
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                            : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] border-[var(--border)]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tono (Pitch) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Tono Vocale
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: 'Caldo', val: 0.98 },
                      { label: 'Standard', val: 1.00 },
                      { label: 'Brillante', val: 1.03 },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleUpdatePitch(item.val)}
                        className={`py-2 px-1 text-center rounded-xl border text-xs font-semibold transition-all ${
                          Math.abs(speechPitch - item.val) < 0.02
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                            : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] border-[var(--border)]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sezione Comando Vocale "Ciao Chelona!" */}
                <div className="bg-[var(--surface-variant)]/70 border border-[var(--border)] rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                        <Mic className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-[var(--text-main)] truncate">Comando Vocale "Ciao Chelona!"</h5>
                        <p className="text-[10px] text-[var(--text-muted)] truncate">Attivazione vocale a mani libere</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleWakeWord}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 shrink-0 ${
                        isWakeWordEnabled
                          ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                          : 'bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {isWakeWordEnabled ? 'Attivo' : 'Attiva'}
                    </button>
                  </div>
                  <p className="text-[10.5px] text-[var(--text-muted)] leading-relaxed">
                    Pronuncia <strong className="text-amber-500 font-semibold">"Ciao Chelona!"</strong>, <strong className="text-amber-500 font-semibold">"Ehi Chelona!"</strong> o <strong className="text-amber-500 font-semibold">"Chelona"</strong> con l'app aperta per avviare subito la conversazione vocale. 100% on-device.
                  </p>
                </div>

                {/* Tasto Fine */}
                <button
                  type="button"
                  onClick={() => setShowVoiceSettings(false)}
                  className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-md shadow-amber-500/20 active:scale-98"
                >
                  Conferma e Torna al Dialogo
                </button>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center my-auto space-y-6 w-full max-w-md mx-auto text-center">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  {/* Onde concentriche animate */}
                  <motion.div
                    animate={{
                      scale: voiceStatus === 'listening' ? [1, 1.35, 1] : voiceStatus === 'speaking' ? [1, 1.25, 1] : [1, 1.05, 1],
                      opacity: voiceStatus === 'idle' ? 0.2 : [0.3, 0.7, 0.3],
                    }}
                    transition={{ repeat: Infinity, duration: voiceStatus === 'speaking' ? 1.2 : 2, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/30 via-rose-500/30 to-indigo-500/30 blur-xl"
                  />

                  <motion.div
                    animate={{
                      scale: voiceStatus === 'listening' ? [1, 1.2, 1] : voiceStatus === 'speaking' ? [1, 1.15, 1] : 1,
                    }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 p-2 shadow-2xl shadow-amber-500/40 flex items-center justify-center border-4 border-white/20 overflow-hidden"
                  >
                    <img src="/chelona_logo.png" alt="Chelona Voice" className="w-16 h-16 object-contain filter drop-shadow-md" />
                  </motion.div>
                </div>

                {/* Badge Voce Attiva (Cliccabile per aprire le impostazioni) */}
                <button
                  type="button"
                  onClick={() => setShowVoiceSettings(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--surface-variant)]/90 hover:bg-[var(--surface-variant)] border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-amber-500 transition-all shadow-xs active:scale-95"
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-semibold text-[var(--text-main)]">
                    {selectedVoice ? getVoiceFriendlyName(selectedVoice) : 'Voce Naturale'}
                  </span>
                  <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md font-mono font-bold">
                    {speechRate.toFixed(2)}x
                  </span>
                </button>

                {/* Stato vocale testuale */}
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-widest text-amber-500">
                    {voiceStatus === 'listening' && '🎙️ Ti ascolto... Parla ora'}
                    {voiceStatus === 'thinking' && '✨ Sto pensando...'}
                    {voiceStatus === 'speaking' && '🔊 Chelona sta rispondendo...'}
                    {voiceStatus === 'idle' && 'Tocca il microfono per parlare'}
                  </span>

                  {/* Trascrizione in tempo reale */}
                  <p className="text-sm text-[var(--text-main)] font-medium max-w-sm mx-auto line-clamp-3 leading-relaxed">
                    {lastAiSpeech || lastUserSpeech || 'Di\' qualcosa come: "Quando mi scade l\'assicurazione?"'}
                  </p>
                </div>
              </div>
            )}

            {/* Controlli inferiori della modalità vocale */}
            <div className="flex items-center justify-center gap-6 w-full max-w-sm mx-auto">
              {voiceStatus === 'speaking' && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  className="p-3.5 rounded-full bg-[var(--surface-variant)] hover:bg-rose-500/10 text-rose-500 border border-[var(--border)] shadow-md transition-all active:scale-90"
                  title="Interrompi risposta"
                >
                  <VolumeX className="w-5 h-5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (voiceStatus === 'speaking') {
                    stopSpeaking();
                    setTimeout(() => startVoiceRecognition(true), 150);
                  } else if (voiceStatus === 'listening') {
                    setVoiceStatus('idle');
                  } else {
                    startVoiceRecognition(true);
                  }
                }}
                className={`p-5 rounded-full transition-all shadow-xl active:scale-90 ${
                  voiceStatus === 'listening'
                    ? 'bg-rose-500 text-white shadow-rose-500/30 animate-pulse'
                    : 'bg-amber-500 text-white shadow-amber-500/30 hover:scale-105'
                }`}
                title={
                  voiceStatus === 'listening'
                    ? 'Pausa ascolto'
                    : voiceStatus === 'speaking'
                    ? 'Interrompi e parla'
                    : 'Inizia ad ascoltare'
                }
              >
                {voiceStatus === 'listening' ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CASSETTO MEMORIA CON DIAGRAMMA NEURALE MIGLIORATO */}
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
              className="relative w-full max-w-lg bg-[var(--bg)] h-full border-l border-[var(--border)] shadow-2xl flex flex-col z-10 safe-area-inset"
            >
              {/* Header Drawer */}
              <div className="h-16 lg:h-20 border-b border-[var(--border)] px-6 flex items-center justify-between shrink-0 bg-[var(--header-bg)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-1 flex items-center justify-center overflow-hidden">
                    <img src="/chelona_logo.png" alt="Chelona" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-main)]">Rete Neurale Chelona</h3>
                    <p className="text-xs text-[var(--text-muted)]">Sinapsi e conoscenze apprese</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMemoryDrawer(false)}
                  className="p-2 hover:bg-[var(--surface-variant)] rounded-xl text-[var(--text-muted)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                
                {/* 🌌 DIAGRAMMA NEURALE INTERATTIVO MIGLIORATO */}
                <div className="relative rounded-3xl bg-gradient-to-b from-slate-900 to-slate-800 border border-slate-700/50 p-4 shadow-xl overflow-hidden">
                  {/* Pattern punti griglia */}
                  <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                  
                  <div className="relative z-10 flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Mappa Sinaptica
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Tocca un nodo</span>
                  </div>

                  {/* SVG Grafico Neurale (h-72 = 288px) */}
                  <div className="relative w-full h-72 flex items-center justify-center my-2 max-w-[320px] mx-auto">
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 288">
                      <defs>
                        {neuralNodes.map((node) => (
                          <linearGradient id={`grad-${node.id}`} key={node.id} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#475569" />
                            <stop offset="100%" stopColor={node.color} />
                          </linearGradient>
                        ))}
                      </defs>
                      {neuralNodes.map((node, i) => {
                        const rad = (node.angle * Math.PI) / 180;
                        const cx = 160; const cy = 144;
                        const x = cx + Math.cos(rad) * 115;
                        const y = cy + Math.sin(rad) * 105;
                        const isSelected = activeNeuralCategory === node.id;
                        return (
                          <g key={i}>
                            <line
                              x1={cx}
                              y1={cy}
                              x2={x}
                              y2={y}
                              stroke={`url(#grad-${node.id})`}
                              strokeWidth={isSelected ? '3' : '1.5'}
                              strokeDasharray={isSelected ? 'none' : '3 3'}
                              className="transition-all duration-300"
                            />
                            {/* Animated Particles on Synapse Lines */}
                            <circle r="2" fill={node.color} filter="blur(1px)">
                              <animate 
                                attributeName="cx" 
                                values={`${cx};${x}`} 
                                dur={`${1.5 + i * 0.2}s`} 
                                repeatCount="indefinite" 
                              />
                              <animate 
                                attributeName="cy" 
                                values={`${cy};${y}`} 
                                dur={`${1.5 + i * 0.2}s`} 
                                repeatCount="indefinite" 
                              />
                              <animate
                                attributeName="opacity"
                                values="0;1;0"
                                dur={`${1.5 + i * 0.2}s`}
                                repeatCount="indefinite"
                              />
                            </circle>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Nodo Centrale: Chelona Core (Ingrandito w-20 h-20) */}
                    <button
                      onClick={() => setActiveNeuralCategory('all')}
                      className={`absolute z-10 w-20 h-20 rounded-full p-2 flex items-center justify-center transition-all active:scale-95 shadow-xl border-2 ${
                        activeNeuralCategory === 'all'
                          ? 'border-amber-400 bg-amber-500/20 shadow-amber-500/40'
                          : 'border-slate-600 bg-slate-800'
                      }`}
                      style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                      title="Visualizza tutto"
                    >
                      {activeNeuralCategory === 'all' && (
                        <div className="absolute inset-0 rounded-full border-2 border-amber-400 animate-ping opacity-30"></div>
                      )}
                      <img src="/chelona_logo.png" alt="Chelona Core" className="w-12 h-12 object-contain drop-shadow-md" />
                    </button>

                    {/* Nodi Satellitari Orbitanti */}
                    {neuralNodes.map((node) => {
                      const rad = (node.angle * Math.PI) / 180;
                      const cx = 160; const cy = 144;
                      const x = cx + Math.cos(rad) * 115;
                      const y = cy + Math.sin(rad) * 105;
                      const isSelected = activeNeuralCategory === node.id;
                      const Icon = node.icon;

                      return (
                        <button
                          key={node.id}
                          onClick={() => setActiveNeuralCategory(isSelected ? 'all' : (node.id as NeuralCategory))}
                          style={{
                            left: `${(x / 320) * 100}%`,
                            top: `${(y / 288) * 100}%`,
                            transform: 'translate(-50%, -50%)',
                            boxShadow: isSelected ? `0 0 20px ${node.color}80` : undefined
                          }}
                          className={`absolute z-20 w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-90 border ${
                            isSelected
                              ? 'scale-110 border-white/20'
                              : 'bg-slate-800 border-slate-700 hover:scale-105 shadow-md'
                          }`}
                          title={node.label}
                        >
                          <div
                            className="w-full h-full rounded-2xl flex items-center justify-center text-white relative"
                            style={{ backgroundColor: isSelected ? node.color : 'transparent', color: isSelected ? '#fff' : node.color }}
                          >
                            <Icon className="w-5 h-5" />
                            {/* Badge count */}
                            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-slate-800" style={{ backgroundColor: node.color }}>
                              {node.count}
                            </span>
                          </div>
                          <span
                            className="absolute -bottom-4 text-[9px] font-bold whitespace-nowrap drop-shadow-md"
                            style={{ color: isSelected ? node.color : '#94a3b8' }}
                          >
                            {node.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Form pulito per insegnare qualcosa */}
                <form onSubmit={handleAddManualMemory} className="p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] space-y-2.5">
                  <h4 className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-amber-500" />
                    Insegna a Chelona
                  </h4>
                  <input
                    type="text"
                    value={newKey}
                    onChange={e => setNewKey(e.target.value)}
                    placeholder="Argomento (es. Codice portone, Taglia scarpe...)"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-amber-500"
                  />
                  <textarea
                    rows={2}
                    value={newFact}
                    onChange={e => setNewFact(e.target.value)}
                    placeholder="Dettaglio da ricordare..."
                    className="w-full px-3 py-2 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-amber-500 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={!newKey.trim() || !newFact.trim()}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
                  >
                    Salva nella Memoria
                  </button>
                </form>

                {/* Lista Memorie Personali */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[var(--text-main)]">
                      Appunti Personali Ricordati ({memories.length})
                    </h4>
                    {memories.length > 0 && (
                      <button
                        onClick={() => {
                          if (confirm('Vuoi azzerare tutte le memorie apprese?')) {
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
                    <div className="p-6 text-center border border-dashed border-[var(--border)] rounded-2xl">
                      <p className="text-xs text-[var(--text-muted)]">Nessuna memoria personalizzata registrata.</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">Puoi dirmi in chat *"Ricordati che..."* per memorizzare dati!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {memories.map(m => (
                        <div
                          key={m.id}
                          className="p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] flex items-start justify-between gap-3 shadow-xs"
                        >
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 px-2 py-0.5 rounded-md bg-amber-500/10 inline-block mb-1">
                              {m.key}
                            </span>
                            <p className="text-xs text-[var(--text-main)] leading-relaxed">{m.fact}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteMemory(m.id)}
                            className="p-1 text-[var(--text-muted)] hover:text-rose-500 transition-colors shrink-0"
                            title="Elimina"
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
