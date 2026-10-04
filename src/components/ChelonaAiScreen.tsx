import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Mic, MicOff, Volume2, VolumeX, Trash2, Menu, Trash, ArrowLeft, 
  ExternalLink, Check, Copy, Plus, X, Zap, ChevronRight, UtensilsCrossed, Flame,
  Settings2, Sliders, Play, Store, Tag, Calendar, Car, FileText, ShoppingBasket,
  MapPin, Clock, FileSignature, Wallet, CheckSquare, Sparkles, Navigation, Globe, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Module } from '../types';
import { 
  AiMessage, AiAction, getChatHistory, saveChatHistory, 
  queryChelonaAi
} from '../services/chelonaEngine';
import { queryGemma2, preloadEngine } from '../services/gemma2Engine';
import {
  prepareNaturalSpeech,
  splitIntoSentences,
  filterItalianVoices,
  getBestItalianVoice,
  getVoiceFriendlyName
} from '../utils/naturalSpeech';
import { getSavedParking, getNavigationUrl } from '../services/parkingService';
import { wakeWordService } from '../services/wakeWordService';
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
  initialVoiceMode?: boolean;
  initialDictationMode?: boolean;
  onNavigate?: (action: AiAction) => void;
  activeSection?: string; // Sezione corrente dell'app per il contesto AI
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/D';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}


// ---- Conversation History Types ----
interface ChatConversation {
  id: string;
  title: string;
  messages: AiMessage[];
  createdAt: number;
  updatedAt: number;
}

const CONV_STORAGE_KEY = 'chelona_conversations';
const MAX_CONVERSATIONS = 50;

function loadConversations(): ChatConversation[] {
  try {
    const raw = localStorage.getItem(CONV_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveConversations(convs: ChatConversation[]) {
  try {
    const trimmed = convs.slice(0, MAX_CONVERSATIONS);
    localStorage.setItem(CONV_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}

function makeConvTitle(text: string): string {
  const clean = text.replace(/\*|#|_/g, '').trim();
  return clean.length > 42 ? clean.slice(0, 42).trimEnd() + '…' : clean;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Adesso';
  if (m < 60) return `${m} min fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ore fa`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} giorni fa`;
  return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

export const ChelonaAiScreen
: React.FC<ChelonaAiScreenProps> = ({
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
  initialDictationMode = false,
  onNavigate,
  activeSection,
}) => {
  const [conversations, setConversations] = useState<ChatConversation[]>(() => loadConversations());
  const [activeConvId, setActiveConvId] = useState<string | null>(() => {
    const convs = loadConversations();
    return convs.length > 0 ? convs[0].id : null;
  });
  const [messages, setMessages] = useState<AiMessage[]>(() => {
    const convs = loadConversations();
    if (convs.length > 0 && convs[0].messages.length > 0) return convs[0].messages;
    return [
      {
        id: 'msg_welcome_' + Date.now(),
        sender: 'assistant',
        text: `Ciao ${username || ''}! Come posso aiutarti oggi? Conosco tutte le sezioni di Chelona. Chiedimi qualsiasi cosa!`,
        timestamp: Date.now(),
      }
    ];
  });
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const firstUserMsgSentRef = useRef(false);

  // Sync to localStorage when conversations change
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  // Aggiorna o crea conversazione quando arrivano nuovi messaggi
  const updateConversationWithMessages = (newMessages: AiMessage[]) => {
    setMessages(newMessages);
    const hasUser = newMessages.some(m => m.sender === 'user');
    if (!hasUser) return;

    const firstUserMsg = newMessages.find(m => m.sender === 'user');
    const autoTitle = firstUserMsg ? makeConvTitle(firstUserMsg.text) : 'Nuova Chat';

    let targetId = activeConvId;
    if (!targetId) {
      targetId = 'conv_' + Date.now();
      setActiveConvId(targetId);
      const newConv: ChatConversation = {
        id: targetId,
        title: autoTitle,
        messages: newMessages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setConversations(prev => [newConv, ...prev]);
    } else {
      setConversations(prev => {
        const found = prev.some(c => c.id === targetId);
        if (found) {
          return prev.map(c => {
            if (c.id === targetId) {
              const title = c.title === 'Nuova Chat' || !c.title ? autoTitle : c.title;
              return { ...c, title, messages: newMessages, updatedAt: Date.now() };
            }
            return c;
          });
        } else {
          return [{
            id: targetId!,
            title: autoTitle,
            messages: newMessages,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }, ...prev];
        }
      });
    }
  };

  const handleNewConversation = () => {
    setActiveConvId(null);
    setMessages([
      {
        id: 'msg_welcome_' + Date.now(),
        sender: 'assistant',
        text: `Ciao ${username || ''}! Come posso aiutarti oggi? Conosco tutte le sezioni di Chelona. Chiedimi qualsiasi cosa!`,
        timestamp: Date.now(),
      }
    ]);
    setShowHistoryDrawer(false);
  };

  const handleSwitchConversation = (id: string) => {
    setActiveConvId(id);
    const conv = conversations.find(c => c.id === id);
    if (conv) {
      setMessages(conv.messages);
    }
    setShowHistoryDrawer(false);
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Vuoi davvero eliminare questa conversazione?')) {
      const remaining = conversations.filter(c => c.id !== id);
      setConversations(remaining);
      saveConversations(remaining);
      if (activeConvId === id) {
        handleNewConversation();
      }
      showToast('Conversazione eliminata.', 'info');
    }
  };

  const handleDeleteCurrentConversation = () => {
    if (confirm('Vuoi eliminare la conversazione corrente?')) {
      if (activeConvId) {
        const remaining = conversations.filter(c => c.id !== activeConvId);
        setConversations(remaining);
        saveConversations(remaining);
      }
      handleNewConversation();
      showToast('Conversazione eliminata.', 'info');
    }
  };

  // Warm-up e precaricamento background del motore AI per azzerare i tempi della prima risposta
  useEffect(() => {
    preloadEngine(modules, username);
  }, [modules, username]);

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveVoiceTranscript, setLiveVoiceTranscript] = useState('');
  const [liveAudioVolume, setLiveAudioVolume] = useState(0.2);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
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
  const speechSessionIdRef = useRef(0);
  const webSpeechRecRef = useRef<any>(null);

  // Modalità interazione vocale a tutto schermo (Voice Mode)
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const isVoiceModeOpenRef = useRef(false);
  isVoiceModeOpenRef.current = isVoiceModeOpen;
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [lastUserSpeech, setLastUserSpeech] = useState<string>('');
  const [lastAiSpeech, setLastAiSpeech] = useState<string>('');

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
    if (webSpeechRecRef.current) {
      try {
        webSpeechRecRef.current.abort();
      } catch {}
      webSpeechRecRef.current = null;
    }
    (window as any).__activeUtterance = null;
    setVoiceStatus('idle');
    setIsListening(false);
    setSpeakingMessageId(null);
    setPreviewingVoiceUri(null);
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

    // Normalizza il testo rendendolo fluido e naturale in italiano parlato
    const naturalText = prepareNaturalSpeech(text);
    if (!naturalText) {
      setVoiceStatus('idle');
      if (onEndCallback && !cancelSpeechRef.current && speechSessionIdRef.current === currentSessionId) {
        onEndCallback();
      }
      return;
    }

    const sentences = splitIntoSentences(naturalText);
    if (sentences.length === 0) {
      setVoiceStatus('idle');
      if (onEndCallback && !cancelSpeechRef.current && speechSessionIdRef.current === currentSessionId) {
        onEndCallback();
      }
      return;
    }

    setVoiceStatus('speaking');
    let idx = 0;
    const currentVoice = overrideVoice || selectedVoice;

    const speakNext = () => {
      if (cancelSpeechRef.current || speechSessionIdRef.current !== currentSessionId || idx >= sentences.length) {
        setVoiceStatus('idle');
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
          setVoiceStatus('idle');
          (window as any).__activeUtterance = null;
          return;
        }
        // Piccola pausa naturale tra frasi
        setTimeout(() => {
          if (!cancelSpeechRef.current && speechSessionIdRef.current === currentSessionId) {
            speakNext();
          }
        }, 70);
      };

      utterance.onerror = (e: any) => {
        if (e?.error === 'canceled' || e?.error === 'interrupted' || cancelSpeechRef.current || speechSessionIdRef.current !== currentSessionId) {
          setVoiceStatus('idle');
          (window as any).__activeUtterance = null;
          return;
        }
        console.warn('Speech sentence warning:', e);
        if (!cancelSpeechRef.current && idx < sentences.length) {
          setTimeout(() => {
            if (!cancelSpeechRef.current && speechSessionIdRef.current === currentSessionId) {
              speakNext();
            }
          }, 50);
        } else {
          setVoiceStatus('idle');
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

  const handleSend = async (customQuery?: string, isVoiceSession = false, shouldSpeak = false) => {
    const queryToSend = (customQuery || inputText).trim();
    if (!queryToSend || isProcessing) return;

    const userMsg: AiMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: queryToSend,
      timestamp: Date.now(),
    };

    const msgsWithUser = [...messages, userMsg];
    const assistantMsgId = 'msg_ai_' + (Date.now() + 1);
    let accumulatedText = '';

    // Creiamo subito il messaggio assistant a schermo vuoto per lo streaming progressivo!
    const placeholderAssistantMsg: AiMessage = {
      id: assistantMsgId,
      sender: 'assistant',
      text: '',
      timestamp: Date.now(),
    };

    const msgsWithPlaceholder = [...msgsWithUser, placeholderAssistantMsg];
    updateConversationWithMessages(msgsWithPlaceholder);
    setInputText('');
    setIsProcessing(true);

    if (isVoiceSession) {
      setLastUserSpeech(queryToSend);
      setVoiceStatus('thinking');
    }

    let isFinished = false;
    // Callback di streaming dei token in tempo reale
    const onToken = (token: string) => {
      if (isFinished) return;
      accumulatedText += token;
      setMessages(prev =>
        prev.map(m => (m.id === assistantMsgId ? { ...m, text: accumulatedText } : m))
      );
    };

    const queryStartTime = performance.now();
    try {
      const queryPromise = queryGemma2(queryToSend, modules, username, onToken, activeSection);
      const safetyTimeout = new Promise<import('../services/gemma2Engine').Gemma2Response>((resolve) => {
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
            const defaultTxt = `Eccomi ${username}! Sono pronta ad aiutarti con qualsiasi richiesta.`;
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
      const totalElapsed = Math.round(performance.now() - queryStartTime);
      const finalText = response.text || accumulatedText;

      const assistantMsg: AiMessage = {
        id: assistantMsgId,
        sender: 'assistant',
        text: finalText,
        timestamp: Date.now(),
        actions: response.actions,
        learnedFact: response.learnedFact,
        isCached: response.cached,
        engineUsed: response.engineUsed,
        latencyMs: response.latencyMs !== undefined ? response.latencyMs : totalElapsed,
      };

      const msgsWithAssistant = [...msgsWithUser, assistantMsg];
      updateConversationWithMessages(msgsWithAssistant);

      if (response.createdModule && onAddModule) {
        onAddModule(response.createdModule);
      }

      const mustSpeak = isVoiceSession || shouldSpeak;

      if (response.autoAction && onNavigate) {
        const autoAct = response.autoAction;
        const delay = mustSpeak ? 1000 : 350;
        setTimeout(() => {
          if (isVoiceModeOpenRef.current) {
            stopSpeaking();
            setIsVoiceModeOpen(false);
          }
          onNavigate(autoAct);
        }, delay);
      }
      if (mustSpeak) {
        if (isVoiceSession) {
          setLastAiSpeech(response.text);
          speakText(response.text, () => {
            // Quando ha finito di parlare, riattiva automaticamente l'ascolto per dialogo continuo!
            if (isVoiceModeOpenRef.current) {
              setTimeout(() => {
                if (isVoiceModeOpenRef.current) {
                  startVoiceRecognition(true);
                }
              }, 400);
            }
          });
        } else {
          // Input vocale da microfono in chat standard: parla la risposta ad alta voce
          setSpeakingMessageId(assistantMsg.id);
          speakText(response.text, () => {
            setSpeakingMessageId(null);
          });
        }
      }
    } catch (e) {
      console.error('AI query error', e);
      const errMsg = `Scusami, si è verificato un piccolo errore. Riprova tra un attimo.`;
      const errId = 'msg_err_' + Date.now();
      const msgsWithError: AiMessage[] = [
        ...msgsWithUser,
        {
          id: errId,
          sender: 'assistant',
          text: errMsg,
          timestamp: Date.now(),
        }
      ];
      updateConversationWithMessages(msgsWithError);
      const mustSpeak = isVoiceSession || shouldSpeak;
      if (mustSpeak) {
        if (isVoiceSession) {
          speakText(errMsg, () => {
            if (isVoiceModeOpenRef.current) {
              setTimeout(() => {
                if (isVoiceModeOpenRef.current) {
                  startVoiceRecognition(true);
                }
              }, 400);
            }
          });
        } else {
          setSpeakingMessageId(errId);
          speakText(errMsg, () => setSpeakingMessageId(null));
        }
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
    voiceRecognitionService.stop();

    if (isVoiceSession) {
      setVoiceStatus('listening');
    } else {
      setIsListening(true);
    }
    setLiveVoiceTranscript('');
    setLiveAudioVolume(0.2);

    const success = await voiceRecognitionService.start({
      lang: 'it-IT',
      onStart: () => {
        setIsListening(true);
        if (isVoiceSession) setVoiceStatus('listening');
      },
      onRms: (normVolume) => {
        setLiveAudioVolume(normVolume);
      },
      onPartial: (partialText) => {
        setLiveVoiceTranscript(partialText);
        if (isVoiceSession) {
          setLastUserSpeech(partialText);
        } else {
          setInputText(partialText);
        }
      },
      onResult: (finalText) => {
        setIsListening(false);
        setLiveVoiceTranscript(finalText);
        const trimmed = (finalText || '').trim();
        if (trimmed.length > 0) {
          handleSend(trimmed, isVoiceSession, true);
        } else if (isVoiceSession) {
          setVoiceStatus('idle');
        }
      },
      onError: (errMsg) => {
        console.warn('Voice recognition error:', errMsg);
        setIsListening(false);
        if (isVoiceSession) setVoiceStatus('idle');
        showToast(errMsg, 'error');
      },
      onEnd: () => {
        setIsListening(false);
        setLiveAudioVolume(0);
        if (isVoiceSession && voiceStatus !== 'speaking') {
          setVoiceStatus('idle');
        }
      },
      autoStopSilenceMs: 1400,
    });

    if (!success) {
      setIsListening(false);
      setLiveAudioVolume(0);
      if (isVoiceSession) setVoiceStatus('idle');
    }
  };

  const cancelVoiceRecognition = () => {
    voiceRecognitionService.cancel();
    setIsListening(false);
    setLiveVoiceTranscript('');
    setLiveAudioVolume(0);
    if (!isVoiceModeOpen) {
      setInputText('');
    }
    if (isVoiceModeOpen) {
      setVoiceStatus('idle');
    }
  };

  const confirmVoiceRecognition = () => {
    const textToSend = (liveVoiceTranscript || inputText).trim();
    voiceRecognitionService.stop();
    setIsListening(false);
    setLiveAudioVolume(0);
    if (textToSend.length > 0) {
      handleSend(textToSend, isVoiceModeOpen, true);
    }
  };

  const toggleVoiceMode = () => {
    if (!isVoiceModeOpen) {
      setIsVoiceModeOpen(true);
      setShowVoiceSettings(false);
      setLastUserSpeech('');
      setLiveVoiceTranscript('');
      const greeting = `Ciao ${username ? username + ', ' : ''}dimmi pure, ti ascolto.`;
      setLastAiSpeech(greeting);
      speakText(greeting, () => {
        setTimeout(() => {
          startVoiceRecognition(true);
        }, 250);
      });
    } else {
      voiceRecognitionService.stop();
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
    if (!initialVoiceMode) {
      initialVoiceTriggeredRef.current = false;
      return;
    }
    if (initialVoiceMode && !initialVoiceTriggeredRef.current && !isVoiceModeOpen) {
      initialVoiceTriggeredRef.current = true;
      const t = setTimeout(() => {
        toggleVoiceMode();
      }, 120);
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

  const handleDeleteMessage = (msgId: string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    if (activeConvId) {
      setConversations(prev => prev.map(c => {
        if (c.id === activeConvId) {
          return { ...c, messages: c.messages.filter(m => m.id !== msgId), updatedAt: Date.now() };
        }
        return c;
      }));
    }
    showToast('Messaggio rimosso');
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

  const quickPrompts = [
    { label: '🚗 La mia auto', query: 'Fammi un riepilogo della mia auto, scadenze e km' },
    { label: '📅 Scadenze', query: 'Quali scadenze imminenti ho nei prossimi 60 giorni?' },
    { label: '📍 Dov\'è l\'auto?', query: 'Dove ho parcheggiato la mia auto?' },
    { label: '📄 Documenti', query: 'Quali documenti personali ho salvato?' },
    { label: '👥 Spese Split', query: 'Chi deve a chi nei gruppi di spese condivise?' },
    { label: '💳 Spese del mese', query: 'Quanto ho speso questo mese e quali sono le ultime uscite?' },
    { label: '🗓️ Rate attive', query: 'Quando scade la prossima rata e quanto manca da pagare?' },
    { label: '🛒 Offerte & Volantini', query: 'Mostrami le offerte e i volantini disponibili' },
    { label: '📝 Lista Spesa', query: 'Cosa devo comprare nella lista della spesa?' },
    { label: '🍲 Ricette & Cucina', query: 'Cosa posso cucinare oggi con gli ingredienti che ho?' },
    { label: '🏋️ Fitness & Dieta', query: 'Qual è la mia scheda di allenamento e calorie target?' },
    { label: '✈️ Viaggi & Itinerari', query: 'Quali mete di viaggio e tappe ho programmato?' },
    { label: '🏠 Casa & Arredo', query: 'Riepilogo delle stanze, arredi e preventivi' },
    { label: '✍️ Note & Appunti', query: 'Quali note e appunti ho salvato?' },
    { label: '📇 Rubrica Indirizzi', query: 'Quali indirizzi e recapiti ho memorizzato?' },
    { label: '📑 Scanner & PDF', query: 'Apri lo scanner e gli strumenti PDF' },
    { label: '🧰 Strumenti & Utility', query: 'Quali strumenti e utility sono disponibili?' },
    { label: '🔒 Profilo & Sicurezza', query: 'Stato profilo, backup crittografato e comando Ciao Chelona' },
    { label: '🧠 Cosa sai di me?', query: 'Cosa sai su di me e cosa hai imparato finora?' },
    { label: '❓ Cosa puoi fare?', query: 'Mostrami tutte le sezioni e le cose che puoi fare' },
  ];

  return (
    <div className={
      isEmbedded 
        ? "flex flex-col h-full w-full bg-[var(--bg)] font-sans relative transition-colors duration-300"
        : "fixed inset-x-0 top-0 bottom-20 md:bottom-0 z-[120] bg-[var(--bg)] flex flex-col overflow-hidden font-sans transition-colors duration-300"
    }>
      {/* HEADER PULITO CON LOGO CHELONA E MENU STORICO - SOLO IN FULLSCREEN */}
      {!isEmbedded && (
        <header className="h-16 lg:h-20 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-2xl px-4 lg:px-8 flex items-center justify-between shrink-0 z-20 safe-area-header shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistoryDrawer(true)}
              className="p-2 hover:bg-[var(--surface-variant)] rounded-2xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors active:scale-95"
              title="Storico Conversazioni"
            >
              <Menu className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--surface-variant)] rounded-2xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors active:scale-95"
              title="Torna indietro"
            >
              <ArrowLeft className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base lg:text-lg font-black text-[var(--text-main)] tracking-tight">
                  {activeConvId ? conversations.find(c => c.id === activeConvId)?.title || 'Nuova Chat' : 'Nuova Chat'}
                </h2>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDeleteCurrentConversation}
              disabled={messages.length <= 1 && !activeConvId}
              className={`p-2 rounded-2xl transition-colors active:scale-95 ${
                messages.length <= 1 && !activeConvId
                  ? 'text-[var(--text-muted)]/30 cursor-not-allowed'
                  : 'hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 cursor-pointer'
              }`}
              title="Elimina conversazione corrente"
            >
              <Trash2 className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
            <button
              onClick={handleNewConversation}
              className="p-2 hover:bg-[var(--surface-variant)] rounded-2xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors active:scale-95"
              title="Nuova conversazione"
            >
              <Plus className="w-5 h-5 lg:w-6 lg:h-6" />
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
                    {!isUser && msg.latencyMs !== undefined && (
                      <div className="mb-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--surface-variant)] text-[var(--text-muted)] border border-[var(--border)] shadow-xs">
                        <Sparkles className="w-3 h-3 text-emerald-500" />
                        <span>
                          Elaborazione Live • {msg.latencyMs}ms
                        </span>
                      </div>
                    )}

                    {!msg.text && isProcessing ? (
                      <div className="flex items-center gap-1.5 py-1 text-[var(--text-muted)]">
                        <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : (
                      <div className="whitespace-pre-line text-inherit text-[13.5px]">
                        {msg.text}
                      </div>
                    )}

                    {msg.actions && msg.actions.length > 0 && (() => {
                      const recipeActions = msg.actions.filter(a => a.type === 'recipes' && a.recipe);
                      const volantinoActions = msg.actions.filter(a => a.type === 'volantino');
                      const moduleActions = msg.actions.filter(a => a.type === 'module' && a.module);
                      const categoryActions = msg.actions.filter(a => a.type === 'category' && a.category);
                      const parkingActions = msg.actions.filter(a => a.type === 'parking' || a.type === 'save_parking' || a.type === 'navigate_parking');
                      const doctorActions = msg.actions.filter(a => a.type === 'doctor');
                      const recessoActions = msg.actions.filter(a => a.type === 'recesso');
                      const deadlinesActions = msg.actions.filter(a => a.type === 'deadlines');
                      const shoppingActions = msg.actions.filter(a => a.type === 'add_shopping_items');
                      const otherActions = msg.actions.filter(a => 
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

                      const handleActionClick = (act: AiAction) => {
                        if (act.type === 'save_parking') {
                          handleSend('Salva il parcheggio qui');
                          return;
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
                        <div className="mt-3.5 pt-3 border-t border-[var(--border)]/50 space-y-3">
                          {/* 1. Volantini & Offerte Card Widget */}
                          {volantinoActions.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-500 uppercase tracking-wider">
                                <Store className="w-3.5 h-3.5" />
                                <span>Volantini & Offerte</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {volantinoActions.map((act, i) => (
                                  <button
                                    key={`volantino-${i}`}
                                    onClick={() => handleActionClick(act)}
                                    className="w-full text-left p-3 rounded-2xl bg-gradient-to-br from-[var(--surface-variant)] to-[var(--card-bg)] border border-amber-500/30 hover:border-amber-500 shadow-xs hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-between gap-3 group cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-inner">
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
                                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all shrink-0">
                                      <ChevronRight className="w-4 h-4" />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 2. Schede ricette interattive */}
                          {recipeActions.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-500 uppercase tracking-wider">
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
                                      className="w-full text-left p-2.5 rounded-2xl bg-[var(--surface-variant)]/70 hover:bg-[var(--surface-variant)] border border-[var(--border)] hover:border-amber-500/40 shadow-xs hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-3 group cursor-pointer"
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

                                      <div className="p-1.5 rounded-xl bg-[var(--card-bg)] text-[var(--text-muted)] group-hover:text-amber-500 group-hover:bg-amber-500/10 transition-colors shrink-0">
                                        <ChevronRight className="w-4 h-4" />
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 3. Schede Modulo Personale Preview */}
                          {moduleActions.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-500 uppercase tracking-wider">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>I Tuoi Contenuti Chelona</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {moduleActions.map((act, i) => {
                                  const m = act.module;
                                  const isAuto = m?.type === 'auto';
                                  const isDoc = m?.type === 'document';
                                  const isSplit = m?.type === 'split' || m?.type === 'single-expense' || m?.type === 'installments';
                                  const IconComponent = isAuto ? Car : isDoc ? FileText : isSplit ? Wallet : Sparkles;
                                  const colorClass = isAuto ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' : isDoc ? 'text-blue-500 bg-blue-500/10 border-blue-500/20' : isSplit ? 'text-purple-500 bg-purple-500/10 border-purple-500/20' : 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20';

                                  return (
                                    <button
                                      key={`mod-${i}`}
                                      onClick={() => handleActionClick(act)}
                                      className="w-full text-left p-3 rounded-2xl bg-[var(--card-bg)] hover:bg-[var(--surface-variant)] border border-[var(--border)] hover:border-indigo-500/40 shadow-xs hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-between gap-3 group cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${colorClass}`}>
                                          <IconComponent className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                            {m?.type === 'auto' ? 'Veicolo' : m?.type === 'document' ? 'Documento' : m?.type === 'split' ? 'Finanze' : 'Scheda'}
                                          </div>
                                          <h4 className="text-xs font-bold text-[var(--text-main)] group-hover:text-indigo-500 transition-colors truncate">
                                            {m?.title || act.label}
                                          </h4>
                                        </div>
                                      </div>
                                      <div className="p-1.5 rounded-xl bg-[var(--surface-variant)] text-[var(--text-muted)] group-hover:text-indigo-500 transition-colors shrink-0">
                                        <ChevronRight className="w-4 h-4" />
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 4. Categorie Navigabili */}
                          {categoryActions.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {categoryActions.map((act, i) => (
                                <button
                                  key={`cat-${i}`}
                                  onClick={() => handleActionClick(act)}
                                  className="w-full text-left p-3 rounded-2xl bg-[var(--surface-variant)]/60 hover:bg-[var(--surface-variant)] border border-[var(--border)] hover:border-indigo-500/40 transition-all flex items-center justify-between gap-3 group cursor-pointer shadow-xs active:scale-[0.98]"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                                      <Globe className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold text-[var(--text-main)] group-hover:text-indigo-500 transition-colors">
                                      {act.label}
                                    </span>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-indigo-500 transition-colors" />
                                </button>
                              ))}
                            </div>
                          )}

                          {/* 5. Studio Medico Widget */}
                          {doctorActions.length > 0 && (
                            <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-[var(--text-main)] space-y-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                                  🩺
                                </div>
                                <div>
                                  <h4 className="text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-300">Studio Medico Curante</h4>
                                  <p className="text-[10px] text-[var(--text-muted)]">Orari di ricevimento e prescrizioni ricette</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {doctorActions.map((act, i) => (
                                  <button
                                    key={`doc-${i}`}
                                    onClick={() => handleActionClick(act)}
                                    className="flex-1 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>{act.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 6. Disdetta PEC Widget */}
                          {recessoActions.length > 0 && (
                            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[var(--text-main)] space-y-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                                  <FileSignature className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">Disdetta Legale PEC</h4>
                                  <p className="text-[10px] text-[var(--text-muted)]">Modello pronto e certificato per recesso contrattuale</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {recessoActions.map((act, i) => (
                                  <button
                                    key={`rec-${i}`}
                                    onClick={() => handleActionClick(act)}
                                    className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                                  >
                                    <FileSignature className="w-3.5 h-3.5" />
                                    <span>{act.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 7. Mobilità & Parcheggio Widget */}
                          {parkingActions.length > 0 && (
                            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[var(--text-main)] space-y-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                  <Car className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Mobilità & Posizioni</h4>
                                  <p className="text-[10px] text-[var(--text-muted)]">Navigazione GPS e posizione auto salvata</p>
                                </div>
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

                          {/* 8. Scadenze Promemoria Widget */}
                          {deadlinesActions.length > 0 && (
                            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-[var(--text-main)] space-y-2">
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

                          {/* 9. Aggiungi a Lista della Spesa Widget */}
                          {shoppingActions.length > 0 && (
                            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[var(--text-main)] space-y-2">
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
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>{act.label}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* 10. Altre azioni secondarie discrete */}
                          {otherActions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {otherActions.map((act, i) => (
                                <button
                                  key={`other-${i}`}
                                  onClick={() => handleActionClick(act)}
                                  className="px-3 py-1.5 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--accent)] hover:text-white border border-[var(--border)] text-xs font-semibold text-[var(--text-main)] transition-all flex items-center gap-1.5 active:scale-95 shadow-xs cursor-pointer"
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
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="hover:text-rose-500 transition-colors p-1"
                          title="Elimina risposta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
                type="button"
                onClick={() => setShowHistoryDrawer(true)}
                className="px-3 py-1.5 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] text-xs font-bold transition-all flex items-center gap-1.5 border border-[var(--border)] active:scale-95 shadow-sm"
              >
                <Menu className="w-3.5 h-3.5 text-amber-500" />
                <span>Storico</span>
              </button>
              <button
                type="button"
                onClick={handleNewConversation}
                className="px-3 py-1.5 rounded-2xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] text-xs font-bold transition-all flex items-center gap-1.5 border border-[var(--border)] active:scale-95 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 text-amber-500" />
                <span>Nuova</span>
              </button>
            </div>
          )}

          {/* Semplice feedback visivo quando il microfono è in ascolto */}
          {isListening && !isVoiceModeOpen && (
            <div className="flex items-center justify-between px-3.5 py-1.5 mb-2 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-semibold shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                <span className="truncate">
                  In ascolto... Invio automatico appena finisci di parlare
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={confirmVoiceRecognition}
                  className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-white text-[11px] font-bold hover:bg-amber-600 transition-colors cursor-pointer shadow-xs active:scale-95"
                >
                  Invia
                </button>
                <button
                  type="button"
                  onClick={cancelVoiceRecognition}
                  className="text-[11px] font-bold text-rose-500 hover:text-rose-600 px-1 py-0.5 cursor-pointer"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}

          <div className="flex items-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (isListening) {
                  const speech = (liveVoiceTranscript || inputText).trim();
                  if (speech.length > 0) {
                    confirmVoiceRecognition();
                  } else {
                    cancelVoiceRecognition();
                  }
                } else {
                  startVoiceRecognition(false);
                }
              }}
              className={`p-3 rounded-2xl border transition-all shrink-0 active:scale-95 shadow-xs cursor-pointer ${
                isListening
                  ? 'bg-amber-500 text-white border-amber-500 shadow-amber-500/30 animate-pulse'
                  : 'bg-[var(--surface-variant)] hover:bg-[var(--border)] border-[var(--border)] text-amber-500'
              }`}
              title={isListening ? "Tocca per completare e inviare" : "Dettatura vocale"}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <div className={`flex-1 bg-[var(--surface-variant)] rounded-2xl border transition-all p-1.5 flex items-center ${
              isListening ? 'border-amber-500/60 ring-2 ring-amber-500/20' : 'border-[var(--border)] focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20'
            }`}>
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "In ascolto... Parla pure (invio auto)..." : "Scrivi a Chelona o insegna qualcosa..."}
                className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] resize-none py-1.5 px-2 max-h-28"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (isListening) {
                  confirmVoiceRecognition();
                } else {
                  handleSend();
                }
              }}
              disabled={!inputText.trim() || isProcessing}
              className="p-3 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white transition-all shrink-0 active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"
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
                  {/* Onde concentriche animate con volume RMS reale */}
                  <motion.div
                    animate={{
                      scale: voiceStatus === 'listening' 
                        ? [1 + liveAudioVolume * 0.2, 1.15 + liveAudioVolume * 0.35, 1 + liveAudioVolume * 0.2] 
                        : voiceStatus === 'speaking' 
                        ? [1, 1.25, 1] 
                        : [1, 1.05, 1],
                      opacity: voiceStatus === 'idle' ? 0.2 : [0.35, 0.75, 0.35],
                    }}
                    transition={{ repeat: Infinity, duration: voiceStatus === 'speaking' ? 1.2 : 1.8, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/30 via-rose-500/30 to-indigo-500/30 blur-xl"
                  />

                  <motion.div
                    role="button"
                    tabIndex={0}
                    aria-label={
                      voiceStatus === 'listening'
                        ? 'Pausa ascolto'
                        : voiceStatus === 'speaking'
                        ? 'Interrompi e parla'
                        : 'Inizia ad ascoltare'
                    }
                    onClick={() => {
                      if (voiceStatus === 'speaking') {
                        stopSpeaking();
                        setTimeout(() => startVoiceRecognition(true), 150);
                      } else if (voiceStatus === 'listening') {
                        voiceRecognitionService.stop();
                        setVoiceStatus('idle');
                        setIsListening(false);
                      } else {
                        startVoiceRecognition(true);
                      }
                    }}
                    whileTap={{ scale: 0.93 }}
                    animate={{
                      scale: voiceStatus === 'listening' ? (1 + liveAudioVolume * 0.15) : voiceStatus === 'speaking' ? [1, 1.15, 1] : 1,
                    }}
                    transition={voiceStatus === 'speaking' ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } : { type: 'spring', damping: 15, stiffness: 300 }}
                    className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 p-2 shadow-2xl shadow-amber-500/40 flex items-center justify-center border-4 border-white/20 overflow-hidden cursor-pointer select-none active:scale-95 transition-transform"
                  >
                    <img src="/chelona_logo.png" alt="Chelona Voice" className="w-16 h-16 object-contain filter drop-shadow-md pointer-events-none" />
                  </motion.div>
                </div>

                {/* Badge Voce Attiva (Cliccabile per aprire le impostazioni) */}
                <button
                  type="button"
                  onClick={() => setShowVoiceSettings(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--surface-variant)]/90 hover:bg-[var(--surface-variant)] border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-amber-500 transition-all shadow-xs active:scale-95 cursor-pointer"
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
                    {voiceStatus === 'idle' && 'Tocca il logo o il microfono per parlare'}
                  </span>

                  {/* Trascrizione in tempo reale */}
                  <p className="text-sm text-[var(--text-main)] font-medium max-w-sm mx-auto line-clamp-3 leading-relaxed">
                    {liveVoiceTranscript 
                      ? `"${liveVoiceTranscript}"` 
                      : (lastAiSpeech || lastUserSpeech || 'Di\' qualcosa come: "Quando mi scade l\'assicurazione?"')}
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
                    voiceRecognitionService.stop();
                    setVoiceStatus('idle');
                    setIsListening(false);
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

      {/* DRAWER STORICO CONVERSAZIONI (ChatGPT / Gemini style) */}
      <AnimatePresence>
        {showHistoryDrawer && (
          <div className="fixed inset-0 z-[150] flex justify-start">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryDrawer(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xs bg-[var(--bg)] h-full border-r border-[var(--border)] shadow-2xl flex flex-col z-10 safe-area-inset"
            >
              {/* Header Drawer */}
              <div className="h-16 lg:h-20 border-b border-[var(--border)] px-5 flex items-center justify-between shrink-0 bg-[var(--header-bg)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 p-1 flex items-center justify-center overflow-hidden">
                    <img src="/chelona_logo.png" alt="Chelona" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-main)]">Cronologia Chat</h3>
                    <p className="text-[10px] text-[var(--text-muted)]">I tuoi dialoghi salvati</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(false)}
                  className="p-2 hover:bg-[var(--surface-variant)] rounded-xl text-[var(--text-muted)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nuova chat button */}
              <div className="p-3 border-b border-[var(--border)]">
                <button
                  type="button"
                  onClick={handleNewConversation}
                  className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] text-xs font-bold border border-[var(--border)] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs"
                >
                  <Plus className="w-4 h-4 text-amber-500" />
                  <span>Nuova Conversazione</span>
                </button>
              </div>

              {/* Lista conversazioni */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                {conversations.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] text-center py-8">Nessuna conversazione salvata.</p>
                ) : (
                  conversations.map((conv) => {
                    const isActive = conv.id === activeConvId;
                    return (
                      <div
                        key={conv.id}
                        onClick={() => handleSwitchConversation(conv.id)}
                        className={`group p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition-all border ${
                          isActive
                            ? 'bg-amber-500/10 border-amber-500/30 text-[var(--text-main)] font-semibold shadow-xs'
                            : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-variant)]'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-xs">{conv.title}</p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{formatRelativeTime(conv.updatedAt)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-all rounded-lg shrink-0 cursor-pointer"
                          title="Elimina conversazione"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Elimina tutte le conversazioni */}
              {conversations.length > 0 && (
                <div className="p-3 border-t border-[var(--border)] shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Vuoi eliminare tutte le conversazioni salvate?')) {
                        setConversations([]);
                        handleNewConversation();
                        showToast('Tutte le conversazioni sono state eliminate.', 'info');
                      }
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold border border-rose-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                  >
                    <Trash className="w-4 h-4" />
                    <span>Elimina tutte le conversazioni</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
