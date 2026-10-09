import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Mic, MicOff, Volume2, VolumeX, ArrowLeft, 
  ExternalLink, Check, Copy, X, Sparkles, ChevronRight, UtensilsCrossed, Flame,
  Store, Calendar, Car, ShoppingBasket,
  Navigation, Globe, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Module } from '../types';
import { AiAction, queryChelonaAi } from '../services/chelonaEngine';
import { queryGemma2, preloadEngine, Gemma2Response } from '../services/gemma2Engine';
import {
  prepareNaturalSpeech,
  splitIntoSentences,
  filterItalianVoices,
  getBestItalianVoice,
  getVoiceFriendlyName
} from '../utils/naturalSpeech';
import { getSavedParking, getNavigationUrl } from '../services/parkingService';
import { voiceRecognitionService } from '../services/voiceService';

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
  onNavigate?: (action: AiAction) => void;
  activeSection?: string;
}

// ---- Dynamic Inspirational Phrases ----
const INSPIRATIONAL_PHRASES = [
  "Cosa c'è da segnare nella lista della spesa?",
  "Cosa ti va di cucinare oggi?",
  "Vuoi controllare le scadenze o l'auto?",
  "Hai una spesa o un conto da calcolare?",
  "Quali volantini e offerte vuoi scoprire?",
  "Dove vuoi andare o cosa vuoi pianificare?",
  "Cosa posso fare per te oggi?",
  "Hai bisogno di un'idea per il pranzo o la cena?",
  "Vuoi verificare dove hai parcheggiato la macchina?",
  "Come posso semplificarti la giornata?",
  "Chiedimi qualsiasi cosa sui tuoi documenti o note.",
  "Quali impegni o pagamenti devi saldare presto?",
  "Cosa vuoi che ricordi o organizzi per te?"
];

interface ActiveResponse {
  query: string;
  text: string;
  actions?: AiAction[];
  engineUsed?: string;
  timestamp: number;
}

// Feedback aptico e chime sonoro armonico in stile Google Gemini
const playGeminiChime = (type: 'start' | 'stop') => {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'start') {
      // Tono ascendente armonico in stile Gemini / Google Assistant (520Hz -> 880Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.23);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
    } else {
      // Tono discendente morbido di chiusura / risoluzione (784Hz -> 440Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(784, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.14);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.10, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
    }
  } catch {}
};

// Componente Equalizzatore d'Onda Gemini a 4 barre dinamiche reattive al volume
const GeminiWaveVisualizer: React.FC<{ volume: number; isActive: boolean; size?: 'sm' | 'md' }> = ({ volume, isActive, size = 'sm' }) => {
  const bars = [
    { baseH: 8, maxH: size === 'md' ? 32 : 22, factor: 0.8, color: 'from-amber-400 to-orange-500' },
    { baseH: 14, maxH: size === 'md' ? 40 : 28, factor: 1.25, color: 'from-orange-500 to-rose-500' },
    { baseH: 18, maxH: size === 'md' ? 44 : 32, factor: 1.45, color: 'from-amber-500 to-yellow-400' },
    { baseH: 10, maxH: size === 'md' ? 34 : 24, factor: 0.95, color: 'from-amber-500 to-indigo-500' },
  ];

  return (
    <div className="flex items-center justify-center gap-1 h-7 sm:h-8 px-1">
      {bars.map((bar, i) => {
        const height = isActive
          ? Math.max(bar.baseH, Math.min(bar.maxH, bar.baseH + volume * (bar.maxH - bar.baseH) * bar.factor))
          : 5;
        return (
          <motion.span
            key={i}
            animate={{ height }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            className={`w-1 sm:w-1.5 rounded-full bg-gradient-to-t ${bar.color} shadow-xs`}
            style={{ minHeight: '5px' }}
          />
        );
      })}
    </div>
  );
};

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
  onNavigate,
  activeSection,
}) => {
  // Frase dinamica che cambia sempre all'apertura dello schermo e ogni 5 secondi
  const [dynamicPhrase, setDynamicPhrase] = useState<string>(() => {
    const lastIndex = parseInt(sessionStorage.getItem('chelona_last_phrase_idx') || '-1', 10);
    let nextIndex = Math.floor(Math.random() * INSPIRATIONAL_PHRASES.length);
    if (nextIndex === lastIndex && INSPIRATIONAL_PHRASES.length > 1) {
      nextIndex = (nextIndex + 1) % INSPIRATIONAL_PHRASES.length;
    }
    sessionStorage.setItem('chelona_last_phrase_idx', nextIndex.toString());
    return INSPIRATIONAL_PHRASES[nextIndex];
  });

  // Rotazione automatica della frase ogni 9 secondi
  useEffect(() => {
    const timer = setInterval(() => {
      setDynamicPhrase(prev => {
        const currentIndex = INSPIRATIONAL_PHRASES.indexOf(prev);
        let nextIndex = Math.floor(Math.random() * INSPIRATIONAL_PHRASES.length);
        if (nextIndex === currentIndex && INSPIRATIONAL_PHRASES.length > 1) {
          nextIndex = (nextIndex + 1) % INSPIRATIONAL_PHRASES.length;
        }
        sessionStorage.setItem('chelona_last_phrase_idx', nextIndex.toString());
        return INSPIRATIONAL_PHRASES[nextIndex];
      });
    }, 9000);
    return () => clearInterval(timer);
  }, []);

  // Stato per la risposta attiva corrente (NO sistema a chat con bolle che si accumulano)
  const [activeResponse, setActiveResponse] = useState<ActiveResponse | null>(null);

  // Warm-up e precaricamento background del motore AI
  useEffect(() => {
    preloadEngine(modules, username);
  }, [modules, username]);

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveVoiceTranscript, setLiveVoiceTranscript] = useState('');
  const [liveAudioVolume, setLiveAudioVolume] = useState(0.2);
  const [isSpeakingActive, setIsSpeakingActive] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Voci di sintesi vocale
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

  const cancelSpeechRef = useRef(false);
  const speechSessionIdRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEmbedded = mode === 'embedded';

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
      if (best) setSelectedVoice(best);
    };

    updateVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
      try {
        window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
      } catch {}
    }
    const t1 = setTimeout(updateVoices, 200);
    const t2 = setTimeout(updateVoices, 800);

    return () => {
      cancelSpeechRef.current = true;
      speechSessionIdRef.current++;
      clearTimeout(t1);
      clearTimeout(t2);
      voiceRecognitionService.stop();
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          window.speechSynthesis.onvoiceschanged = null;
          window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
        } catch {}
      }
    };
  }, []);

  const stopSpeaking = () => {
    cancelSpeechRef.current = true;
    speechSessionIdRef.current++;
    voiceRecognitionService.stop();
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    (window as any).__activeUtterance = null;
    setIsListening(false);
    setIsSpeakingActive(false);
  };

  const speakText = (text: string, onEndCallback?: () => void, overrideVoice?: SpeechSynthesisVoice) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {}
    cancelSpeechRef.current = false;
    const currentSessionId = ++speechSessionIdRef.current;

    const naturalText = prepareNaturalSpeech(text);
    if (!naturalText) {
      setIsSpeakingActive(false);
      if (onEndCallback && !cancelSpeechRef.current && speechSessionIdRef.current === currentSessionId) {
        onEndCallback();
      }
      return;
    }

    const sentences = splitIntoSentences(naturalText);
    if (sentences.length === 0) {
      setIsSpeakingActive(false);
      if (onEndCallback && !cancelSpeechRef.current && speechSessionIdRef.current === currentSessionId) {
        onEndCallback();
      }
      return;
    }

    setIsSpeakingActive(true);
    let idx = 0;
    const currentVoice = overrideVoice || selectedVoice;

    const speakNext = () => {
      if (cancelSpeechRef.current || speechSessionIdRef.current !== currentSessionId || idx >= sentences.length) {
        setIsSpeakingActive(false);
        (window as any).__activeUtterance = null;
        if (onEndCallback && !cancelSpeechRef.current && speechSessionIdRef.current === currentSessionId) {
          onEndCallback();
        }
        return;
      }

      const sentence = sentences[idx++];
      const utterance = new SpeechSynthesisUtterance(sentence);
      (window as any).__activeUtterance = utterance;

      let voiceToUse = currentVoice || selectedVoice;
      if (!voiceToUse && 'speechSynthesis' in window) {
        const pool = window.speechSynthesis.getVoices();
        const best = getBestItalianVoice(pool);
        if (best) {
          voiceToUse = best;
          setSelectedVoice(best);
        }
      }

      if (voiceToUse) {
        utterance.voice = voiceToUse;
        utterance.lang = voiceToUse.lang || 'it-IT';
      } else {
        utterance.lang = 'it-IT';
      }

      utterance.rate = speechRate;
      utterance.pitch = speechPitch;
      utterance.volume = 1.0;

      utterance.onend = () => {
        if (cancelSpeechRef.current || speechSessionIdRef.current !== currentSessionId) {
          setIsSpeakingActive(false);
          (window as any).__activeUtterance = null;
          return;
        }
        setTimeout(() => {
          if (!cancelSpeechRef.current && speechSessionIdRef.current === currentSessionId) {
            speakNext();
          }
        }, 70);
      };

      utterance.onerror = (e: any) => {
        if (e?.error === 'canceled' || e?.error === 'interrupted' || cancelSpeechRef.current || speechSessionIdRef.current !== currentSessionId) {
          setIsSpeakingActive(false);
          (window as any).__activeUtterance = null;
          return;
        }
        if (!cancelSpeechRef.current && idx < sentences.length) {
          setTimeout(() => {
            if (!cancelSpeechRef.current && speechSessionIdRef.current === currentSessionId) {
              speakNext();
            }
          }, 50);
        } else {
          setIsSpeakingActive(false);
          (window as any).__activeUtterance = null;
          if (onEndCallback && !cancelSpeechRef.current && speechSessionIdRef.current === currentSessionId) {
            onEndCallback();
          }
        }
      };

      if (window.speechSynthesis.paused) {
        try { window.speechSynthesis.resume(); } catch {}
      }
      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  };

  // Invio query: sostituisce la risposta attiva direttamente nella schermata
  const handleSend = async (customQuery?: string, shouldSpeak = false) => {
    const queryToSend = (customQuery || inputText).trim();
    if (!queryToSend || isProcessing) return;

    setInputText('');
    setIsProcessing(true);
    stopSpeaking();

    // Impostiamo la query attiva con testo temporaneo
    setActiveResponse({
      query: queryToSend,
      text: '',
      timestamp: Date.now()
    });

    let accumulatedText = '';
    let isFinished = false;

    const onToken = (token: string) => {
      if (isFinished) return;
      accumulatedText += token;
      setActiveResponse(prev => prev ? { ...prev, text: accumulatedText } : null);
    };

    try {
      const queryPromise = queryGemma2(queryToSend, modules, username, onToken, activeSection);
      const safetyTimeout = new Promise<Gemma2Response>((resolve) => {
        setTimeout(async () => {
          try {
            const fallbackRes = await queryChelonaAi(queryToSend, modules, username, activeSection);
            if (fallbackRes && fallbackRes.text && !accumulatedText) {
              onToken(fallbackRes.text);
            }
            resolve({
              ...fallbackRes,
              engineUsed: 'chelona-engine',
            });
          } catch {
            const defaultTxt = `Eccomi ${username}! Ho elaborato la tua richiesta.`;
            if (!accumulatedText) onToken(defaultTxt);
            resolve({
              text: defaultTxt,
              engineUsed: 'chelona-engine',
            });
          }
        }, 2000);
      });

      const response = await Promise.race([queryPromise, safetyTimeout]);
      isFinished = true;
      const finalText = response.text || accumulatedText;

      const newResponse: ActiveResponse = {
        query: queryToSend,
        text: finalText,
        actions: response.actions,
        engineUsed: response.engineUsed,
        timestamp: Date.now(),
      };

      setActiveResponse(newResponse);

      if (response.createdModule && onAddModule) {
        onAddModule(response.createdModule);
      }

      if (response.autoAction && onNavigate) {
        const autoAct = response.autoAction;
        const delay = shouldSpeak ? 1000 : 350;
        setTimeout(() => {
          onNavigate(autoAct);
        }, delay);
      }

      if (shouldSpeak && response.text) {
        speakText(response.text);
      }
    } catch (e) {
      console.error('AI query error', e);
      const errMsg = `Scusami, si è verificato un piccolo errore. Riprova tra un attimo.`;
      setActiveResponse({
        query: queryToSend,
        text: errMsg,
        timestamp: Date.now()
      });
      if (shouldSpeak) {
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

  const startVoiceRecognition = async () => {
    voiceRecognitionService.stop();
    playGeminiChime('start');
    setIsListening(true);
    setLiveVoiceTranscript('');
    setLiveAudioVolume(0.2);

    const success = await voiceRecognitionService.start({
      lang: 'it-IT',
      onStart: () => {
        setIsListening(true);
      },
      onRms: (normVolume) => {
        setLiveAudioVolume(normVolume);
      },
      onPartial: (partialText) => {
        setLiveVoiceTranscript(partialText);
        setInputText(partialText);
      },
      onResult: (finalText) => {
        playGeminiChime('stop');
        setIsListening(false);
        setLiveVoiceTranscript(finalText);
        const trimmed = (finalText || '').trim();
        if (trimmed.length > 0) {
          handleSend(trimmed, true);
        }
      },
      onError: (errMsg) => {
        console.warn('Voice recognition error:', errMsg);
        setIsListening(false);
        showToast(errMsg, 'error');
      },
      onEnd: () => {
        setIsListening(false);
        setLiveAudioVolume(0);
      },
      autoStopSilenceMs: 1400,
    });

    if (!success) {
      setIsListening(false);
      setLiveAudioVolume(0);
    }
  };

  const cancelVoiceRecognition = () => {
    playGeminiChime('stop');
    voiceRecognitionService.cancel();
    setIsListening(false);
    setLiveVoiceTranscript('');
    setLiveAudioVolume(0);
    setInputText('');
  };

  const confirmVoiceRecognition = () => {
    playGeminiChime('stop');
    const textToSend = (liveVoiceTranscript || inputText).trim();
    voiceRecognitionService.stop();
    setIsListening(false);
    setLiveAudioVolume(0);
    if (textToSend.length > 0) {
      handleSend(textToSend, true);
    }
  };

  const handleToggleSpeakCurrent = () => {
    if (!activeResponse || !activeResponse.text) return;
    if (isSpeakingActive) {
      stopSpeaking();
    } else {
      speakText(activeResponse.text);
    }
  };

  const handleCopyCurrent = () => {
    if (!activeResponse || !activeResponse.text) return;
    navigator.clipboard.writeText(activeResponse.text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    showToast('Copiato!');
  };

  const quickPills = [
    { label: '🛒 Lista spesa', query: 'Cosa devo comprare nella lista della spesa?' },
    { label: '🍲 Cosa cucino oggi?', query: 'Cosa posso cucinare oggi?' },
    { label: '📍 Dov\'è l\'auto?', query: 'Dove ho parcheggiato la mia auto?' },
    { label: '💳 Spese del mese', query: 'Quanto ho speso questo mese?' },
    { label: '📅 Scadenze', query: 'Quali scadenze ho nei prossimi 60 giorni?' },
    { label: '🚗 La mia auto', query: 'Riepilogo scadenze e dati della mia auto' },
    { label: '🏪 Volantini attivi', query: 'Mostrami i volantini e le offerte disponibili' },
  ];

  const handleActionClick = (act: AiAction) => {
    if (act.type === 'save_parking' || act.type === 'parking' || act.category === 'mobility' || act.category === 'parking') {
      if (onNavigate) {
        onNavigate(act);
        return;
      }
      if (onOpenParking) {
        onOpenParking();
        if (!isEmbedded) onClose();
        return;
      }
    }
    if (act.type === 'navigate_parking') {
      if (act.url) {
        window.open(act.url, '_blank');
      } else {
        const p = getSavedParking();
        if (p) window.open(getNavigationUrl(p.latitude, p.longitude), '_blank');
      }
      return;
    }
    if (act.type === 'doctor') {
      window.dispatchEvent(new CustomEvent('notificationRouteReceived', { detail: { route: 'doctor' } }));
      if (!isEmbedded) onClose();
      return;
    }
    if (act.type === 'recesso') {
      window.dispatchEvent(new CustomEvent('notificationRouteReceived', { detail: { route: 'recesso' } }));
      if (!isEmbedded) onClose();
      return;
    }
    if (act.type === 'deadlines') {
      window.dispatchEvent(new CustomEvent('notificationRouteReceived', { detail: { route: 'deadlines' } }));
      if (!isEmbedded) onClose();
      return;
    }
    if (act.type === 'add_shopping_items' && act.items && act.items.length > 0) {
      const existingSupermarket = modules.find(m => m.type === 'supermarket') as any;
      if (existingSupermarket && onAddModule) {
        const newItems = act.items.map(it => ({
          id: Math.random().toString(36).substr(2, 9),
          name: it.name,
          checked: false,
          quantity: it.quantity || '1',
          category: it.category || 'Altro'
        }));
        const updated = {
          ...existingSupermarket,
          items: [...(existingSupermarket.items || []), ...newItems]
        };
        onAddModule(updated);
        showToast(`Aggiunti ${newItems.length} prodotti alla Lista della Spesa!`, 'success');
      } else {
        showToast('Aggiunto alla Lista della Spesa!', 'success');
      }
      return;
    }
    if (onNavigate) {
      onNavigate(act);
      return;
    }
    if (act.type === 'parking' && onOpenParking) {
      onOpenParking();
      if (!isEmbedded) onClose();
    } else if (act.type === 'volantino') {
      if (act.page || act.flyerId) {
        window.dispatchEvent(new CustomEvent('open-flyer-offer', {
          detail: {
            fid: act.flyerId,
            page: act.page,
            pg: typeof act.page === 'number' ? act.page - 1 : 0,
            store: act.storeName || act.chainSlug
          }
        }));
      } else {
        window.dispatchEvent(new CustomEvent('open-volantino', { 
          detail: { 
            chain: act.chainSlug || act.storeName,
            slug: act.chainSlug,
            store: act.storeName 
          } 
        }));
      }
      if (!isEmbedded) onClose();
    } else if (act.type === 'module' && act.module) {
      onOpenModule(act.module);
      if (!isEmbedded) onClose();
    } else if (act.type === 'category' && act.category) {
      onOpenCategory(act.category);
      if (!isEmbedded) onClose();
    }
  };

  return (
    <div className={
      isEmbedded 
        ? "flex flex-col h-full w-full bg-[var(--bg)] font-sans relative transition-colors duration-300"
        : "fixed inset-x-0 top-0 bottom-20 md:bottom-0 z-[120] bg-[var(--bg)] flex flex-col overflow-hidden font-sans transition-colors duration-300"
    }>
      {/* ── TOP HEADER MINIMALE ── */}
      {!isEmbedded && (
        <header className="h-16 lg:h-20 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-2xl px-4 lg:px-8 flex items-center justify-between shrink-0 z-20 safe-area-header shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors active:scale-95 cursor-pointer shadow-2xs"
              title="Torna indietro"
            >
              <ArrowLeft className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>

            <div className="flex items-center gap-2.5">
              <img src="/chelona_logo.png" alt="Chelona" className="w-9 h-9 lg:w-10 lg:h-10 object-contain shrink-0 drop-shadow-sm" />
              <div>
                <h2 className="text-base lg:text-lg font-black text-[var(--text-main)] tracking-tight flex items-center gap-1.5 leading-tight">
                  Chelona AI
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                </h2>
                <p className="text-[11px] text-[var(--text-muted)] font-semibold truncate hidden sm:block">
                  Assistente on-device 100% offline
                </p>
              </div>
            </div>
          </div>

          <div className="w-9 sm:w-10 shrink-0" />
        </header>
      )}

      {/* ── CORPO PRINCIPALE (CENTRATO STILE LISTA DELLA SPESA SENZA CATEGORIE) ── */}
      {(() => {
        const hasActiveView = !!activeResponse || isProcessing;

        return (
          <main className={`flex-1 flex flex-col ${
            !hasActiveView
              ? 'h-full justify-center items-center overflow-y-auto p-4 sm:p-6 pb-10 sm:pb-16 custom-scrollbar'
              : 'overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-3xl w-full mx-auto custom-scrollbar'
          }`}>
            {/* HERO CENTRATO STILE LISTA DELLA SPESA */}
            <div className={`w-full transition-all duration-200 ${
              !hasActiveView
                ? 'max-w-xl mx-auto space-y-6 text-center my-auto flex flex-col items-center'
                : 'max-w-3xl mx-auto space-y-4 mb-3 shrink-0'
            }`}>
              
              {/* 1. FRASE DINAMICA / ISPIRAZIONALE (cambia ad ogni apertura e ogni 9 secondi con animazione fluida) */}
              <div className="text-center space-y-2.5 w-full min-h-[56px] sm:min-h-[72px] flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.h1
                    key={dynamicPhrase}
                    initial={{ opacity: 0, y: 16, filter: 'blur(6px)', scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
                    exit={{ opacity: 0, y: -16, filter: 'blur(6px)', scale: 0.98 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className={`font-black text-[var(--text-main)] tracking-tight leading-tight max-w-2xl ${
                      !hasActiveView ? 'text-2xl sm:text-3xl lg:text-4xl' : 'text-xl sm:text-2xl'
                    }`}
                  >
                    {dynamicPhrase}
                  </motion.h1>
                </AnimatePresence>
              </div>

              {/* 2. BOX DI INPUT IN PRIMO PIANO - HERO GRANDE STILE GEMINI */}
              <div className="w-full space-y-2">
                <div className="relative group w-full max-w-2xl sm:max-w-3xl mx-auto">
                  {/* Aura luminosa circostante in stile Google Gemini */}
                  <div className={`absolute -inset-1 rounded-[34px] sm:rounded-[38px] blur-xl transition-all duration-500 pointer-events-none ${
                    isListening
                      ? 'bg-gradient-to-r from-amber-500/50 via-purple-500/40 to-sky-500/50 opacity-100 animate-pulse'
                      : 'bg-gradient-to-r from-amber-500/25 via-orange-500/25 to-yellow-500/25 opacity-60 group-focus-within:opacity-100'
                  }`} />
                  
                  <div className={`relative flex items-center gap-2 sm:gap-3 bg-[var(--card-bg)] border-2 rounded-[30px] sm:rounded-[36px] p-2.5 sm:p-3.5 shadow-2xl transition-all ${
                    isListening
                      ? 'border-amber-500 shadow-amber-500/25 ring-2 ring-amber-500/30'
                      : 'border-[var(--border)] focus-within:border-amber-500'
                  }`}>
                    {/* Tasto Microfono Dettatura Vocale con Equalizzatore d'Onda Gemini */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isListening) {
                          confirmVoiceRecognition();
                        } else {
                          startVoiceRecognition();
                        }
                      }}
                      className={`p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl border transition-all shrink-0 active:scale-95 shadow-xs cursor-pointer ${
                        isListening
                          ? 'bg-gradient-to-tr from-amber-500 to-amber-600 text-white border-amber-400 shadow-amber-500/40 ring-2 ring-amber-400/40'
                          : 'bg-[var(--surface-variant)] hover:bg-[var(--border)] border-[var(--border)] text-amber-500'
                      }`}
                      title={isListening ? "Tocca per completare e inviare" : "Dettatura vocale intelligente (stile Gemini)"}
                    >
                      {isListening ? (
                        <GeminiWaveVisualizer volume={liveAudioVolume} isActive={true} size="sm" />
                      ) : (
                        <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
                      )}
                    </button>

                    {/* Textarea Input con placeholder 'Chiedi a Chelona' */}
                    <div className="flex-1 min-w-0">
                      <textarea
                        ref={textareaRef}
                        rows={1}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isListening ? "In ascolto... Parla pure..." : "Chiedi a Chelona"}
                        className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-base sm:text-lg lg:text-xl text-[var(--text-main)] placeholder-gray-400 dark:placeholder-gray-500 placeholder:font-medium resize-none py-2.5 sm:py-3.5 px-2 max-h-36 font-semibold leading-relaxed"
                      />
                    </div>

                    {/* Controlli di Invio / Annullamento / Modalità Live */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isListening ? (
                        <>
                          <button
                            type="button"
                            onClick={cancelVoiceRecognition}
                            className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer active:scale-95"
                            title="Annulla registrazione"
                          >
                            <X className="w-5 h-5" />
                          </button>

                          <button
                            type="button"
                            onClick={confirmVoiceRecognition}
                            className="p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white transition-all active:scale-95 shadow-md shadow-amber-500/30 cursor-pointer animate-pulse"
                            title="Invia subito"
                          >
                            <Send className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSend()}
                          disabled={!inputText.trim() || isProcessing}
                          className="p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-30 text-white transition-all shrink-0 active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"
                          title="Invia richiesta"
                        >
                          <Send className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. SUGGERIMENTI RAPIDI A PILLOLA */}
              <div className="w-full space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block text-center">
                  Domande Rapide
                </span>
                <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                  {quickPills.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSend(p.query)}
                      className="px-3.5 py-2 rounded-2xl bg-[var(--card-bg)] hover:bg-[var(--surface-variant)] border border-[var(--border)] hover:border-amber-500/40 text-xs font-bold text-[var(--text-main)] transition-all shadow-2xs active:scale-95 cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

        {/* 3. RISPOSTA ATTIVA CORRENTE (90% UI + 10% TESTO, SENZA STORICO A CHAT) */}
        {isProcessing && (
          <div className="p-6 rounded-3xl bg-[var(--card-bg)] border border-amber-500/30 shadow-lg flex items-center justify-center gap-3 text-amber-500 animate-pulse">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
            <span className="text-sm font-bold text-[var(--text-main)]">
              Chelona sta elaborando la richiesta...
            </span>
          </div>
        )}

        {activeResponse && !isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 sm:p-6 rounded-3xl bg-[var(--card-bg)] border-2 border-amber-500/30 shadow-xl space-y-4"
          >
            {/* Header Risposta con Query e Tasto Chiudi */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20 font-bold">
                  ✨
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] block">
                    Risposta per:
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--text-main)] truncate">
                    "{activeResponse.query}"
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Tasto Ascolta TTS */}
                <button
                  type="button"
                  onClick={handleToggleSpeakCurrent}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                    isSpeakingActive
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse'
                      : 'bg-[var(--surface-variant)] hover:bg-amber-500/15 text-[var(--text-main)] hover:text-amber-600 dark:hover:text-amber-400 border border-[var(--border)]'
                  }`}
                  title={isSpeakingActive ? "Ferma riproduzione vocale" : "Ascolta risposta a voce"}
                >
                  {isSpeakingActive ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5 text-amber-500" />}
                  <span>{isSpeakingActive ? 'Stop' : 'Ascolta'}</span>
                </button>

                {/* Copia */}
                <button
                  type="button"
                  onClick={handleCopyCurrent}
                  className="p-2 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                  title="Copia testo"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>

                {/* Chiudi / Reset */}
                <button
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    setActiveResponse(null);
                  }}
                  className="p-2 rounded-xl bg-[var(--surface-variant)] hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                  title="Chiudi risultato"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Testo Risposta (10% Testo) */}
            {activeResponse.text && (
              <p className="text-sm sm:text-base text-[var(--text-main)] leading-relaxed font-medium whitespace-pre-line">
                {activeResponse.text}
              </p>
            )}

            {/* Azioni & Widget Visivi (90% UI) */}
            {activeResponse.actions && activeResponse.actions.length > 0 && (() => {
              const recipeActions = activeResponse.actions.filter(a => a.type === 'recipes' && a.recipe);
              const volantinoActions = activeResponse.actions.filter(a => a.type === 'volantino');
              const moduleActions = activeResponse.actions.filter(a => a.type === 'module' && a.module);
              const categoryActions = activeResponse.actions.filter(a => a.type === 'category' && a.category);
              const parkingActions = activeResponse.actions.filter(a => a.type === 'parking' || a.type === 'save_parking' || a.type === 'navigate_parking');
              const doctorActions = activeResponse.actions.filter(a => a.type === 'doctor');
              const recessoActions = activeResponse.actions.filter(a => a.type === 'recesso');
              const deadlinesActions = activeResponse.actions.filter(a => a.type === 'deadlines');
              const shoppingActions = activeResponse.actions.filter(a => a.type === 'add_shopping_items');
              const otherActions = activeResponse.actions.filter(a => 
                !(a.type === 'recipes' && a.recipe) &&
                a.type !== 'volantino' &&
                !(a.type === 'module' && a.module) &&
                !(a.type === 'category' && a.category) &&
                a.type !== 'parking' && a.type !== 'save_parking' && a.type !== 'navigate_parking' &&
                a.type !== 'doctor' &&
                a.type !== 'recesso' &&
                a.type !== 'deadlines' &&
                a.type !== 'add_shopping_items'
              );

              return (
                <div className="pt-2 space-y-3">
                  {/* Volantini */}
                  {volantinoActions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 uppercase tracking-wider">
                        <Store className="w-3.5 h-3.5" />
                        <span>Volantini & Offerte</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {volantinoActions.map((act, i) => (
                          <button
                            key={`volantino-${i}`}
                            onClick={() => handleActionClick(act)}
                            className="w-full text-left p-3 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--surface-variant)]/80 border border-amber-500/30 hover:border-amber-500 shadow-xs transition-all active:scale-[0.98] flex items-center justify-between gap-3 group cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                                <Store className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                    {act.storeName || act.chainSlug || 'Volantino'}
                                  </span>
                                  {act.page && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400">
                                      📄 Pag. {act.page}
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-xs font-bold text-[var(--text-main)] group-hover:text-amber-500 transition-colors truncate">
                                  {act.label}
                                </h4>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-amber-500 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ricette */}
                  {recipeActions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-orange-500 uppercase tracking-wider">
                        <UtensilsCrossed className="w-3.5 h-3.5" />
                        <span>Ricette Consigliate</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {recipeActions.map((act, i) => {
                          const r = act.recipe;
                          return (
                            <button
                              key={`recipe-${i}`}
                              onClick={() => handleActionClick(act)}
                              className="w-full text-left p-2.5 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--surface-variant)]/80 border border-[var(--border)] hover:border-amber-500/40 shadow-xs transition-all active:scale-[0.98] flex items-center gap-3 group cursor-pointer"
                            >
                              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20 overflow-hidden relative">
                                <UtensilsCrossed className="w-5 h-5 absolute" />
                                {r?.image && (
                                  <img
                                    src={r.image}
                                    alt={r.title || act.label}
                                    className="w-full h-full object-cover relative z-10"
                                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                  {r?.category && (
                                    <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                      {r.category}
                                    </span>
                                  )}
                                  {r?.calories && (
                                    <span className="text-[10px] font-semibold text-[var(--text-muted)] flex items-center gap-0.5">
                                      <Flame className="w-3 h-3 text-orange-500" />
                                      {r.calories} kcal
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-xs font-bold text-[var(--text-main)] group-hover:text-amber-500 transition-colors truncate">
                                  {r?.title || act.label}
                                </h4>
                              </div>
                              <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-amber-500 transition-colors shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Moduli Personali */}
                  {moduleActions.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {moduleActions.map((act, i) => (
                        <button
                          key={`mod-${i}`}
                          onClick={() => handleActionClick(act)}
                          className="w-full text-left p-3 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--surface-variant)]/80 border border-[var(--border)] hover:border-indigo-500/40 shadow-xs transition-all active:scale-[0.98] flex items-center justify-between gap-3 group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-500/20">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                                Scheda Chelona
                              </span>
                              <h4 className="text-xs font-bold text-[var(--text-main)] group-hover:text-indigo-500 transition-colors truncate">
                                {act.label}
                              </h4>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-indigo-500 transition-colors shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Categorie */}
                  {categoryActions.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categoryActions.map((act, i) => (
                        <button
                          key={`cat-${i}`}
                          onClick={() => handleActionClick(act)}
                          className="w-full text-left p-3 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--surface-variant)]/80 border border-[var(--border)] hover:border-amber-500/40 transition-all flex items-center justify-between gap-3 group cursor-pointer shadow-xs active:scale-[0.98]"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                              <Globe className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-[var(--text-main)] group-hover:text-amber-500 transition-colors">
                              {act.label}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-amber-500 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Parcheggio & Mobilità */}
                  {parkingActions.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-amber-500" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Mobilità & Posizioni</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {parkingActions.map((act, i) => (
                          <button
                            key={`park-${i}`}
                            onClick={() => handleActionClick(act)}
                            className="flex-1 min-w-[130px] py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>{act.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Aggiunta a Spesa */}
                  {shoppingActions.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
                      <div className="flex items-center gap-2">
                        <ShoppingBasket className="w-4 h-4 text-emerald-500" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Lista della Spesa</h4>
                      </div>
                      {shoppingActions.map((act, i) => (
                        <button
                          key={`shop-${i}`}
                          onClick={() => handleActionClick(act)}
                          className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          <ShoppingBasket className="w-3.5 h-3.5" />
                          <span>{act.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Scadenze */}
                  {deadlinesActions.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Scadenze & Promemoria</h4>
                      </div>
                      {deadlinesActions.map((act, i) => (
                        <button
                          key={`dead-${i}`}
                          onClick={() => handleActionClick(act)}
                          className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{act.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Altre azioni */}
                  {otherActions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {otherActions.map((act, i) => (
                        <button
                          key={`other-${i}`}
                          onClick={() => handleActionClick(act)}
                          className="px-3 py-1.5 rounded-xl bg-[var(--surface-variant)] hover:bg-amber-500 hover:text-white border border-[var(--border)] text-xs font-bold text-[var(--text-main)] transition-all flex items-center gap-1.5 active:scale-95 shadow-xs cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{act.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Tasto per chiudere / nuova richiesta */}
            <div className="pt-3 flex items-center justify-between border-t border-[var(--border)]/60">
              <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                Richiesta completata
              </span>
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setActiveResponse(null);
                  textareaRef.current?.focus();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-variant)] hover:bg-amber-500 hover:text-white border border-[var(--border)] text-xs font-bold text-[var(--text-main)] transition-all cursor-pointer active:scale-95 shadow-2xs"
                title="Chiudi risposta e fai una nuova richiesta"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Chiudi / Nuova richiesta</span>
              </button>
            </div>
          </motion.div>
        )}

      </main>
    );
  })()}




    </div>
  );
};
