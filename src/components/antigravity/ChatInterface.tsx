import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Code, Key, Trash2, Settings, AlertCircle, Menu, Plus, X, MessageSquare, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isAction?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
}

interface ChatSettings {
  model: string;
  systemPrompt: string;
}

const DEFAULT_SETTINGS: ChatSettings = {
  model: 'gemini-3.5-flash',
  systemPrompt: 'Sei Antigravity AI, un assistente virtuale hacker e super intelligente integrato dentro l\'app Chelona. Rispondi in italiano in modo chiaro, utile e conciso.'
};

const AVAILABLE_MODELS = [
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (Medium)' },
  { id: 'gemini-3.5-flash-high', name: 'Gemini 3.5 Flash (High)' },
  { id: 'gemini-3.5-flash-low', name: 'Gemini 3.5 Flash (Low)' },
  { id: 'gemini-3.1-pro-low', name: 'Gemini 3.1 Pro (Low)' },
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro (High)' },
  { id: 'claude-4-6-sonnet', name: 'Claude Sonnet 4.6 (Thinking)' },
  { id: 'claude-4-6-opus', name: 'Claude Opus 4.6 (Thinking)' },
  { id: 'gpt-oss-120b', name: 'GPT-OSS 120B (Medium)' }
];

export function ChatInterface({ currentProfileId }: { currentProfileId: string }) {
  const apiKeyStorageKey = `chelona_antigravity_key_${currentProfileId}`;
  const sessionsStorageKey = `chelona_antigravity_sessions_${currentProfileId}`;
  const settingsStorageKey = `chelona_antigravity_settings_${currentProfileId}`;

  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(apiKeyStorageKey) || '');
  const [inputKey, setInputKey] = useState('');
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Settings
  useEffect(() => {
    const savedSettings = localStorage.getItem(settingsStorageKey);
    if (savedSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      } catch (e) {
        console.error("Failed to load chat settings", e);
      }
    }
  }, [settingsStorageKey]);

  // Load Sessions
  useEffect(() => {
    const saved = localStorage.getItem(sessionsStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const loadedSessions = parsed.map((s: any) => ({
          ...s,
          updatedAt: new Date(s.updatedAt),
          messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
        }));
        setSessions(loadedSessions);
        if (loadedSessions.length > 0) {
          setActiveSessionId(loadedSessions[0].id);
        } else {
          createNewSession();
        }
      } catch (e) {
        console.error("Failed to load chat sessions", e);
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, [sessionsStorageKey]);

  // Save Sessions automatically when they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(sessionsStorageKey, JSON.stringify(sessions));
    } else {
      localStorage.removeItem(sessionsStorageKey);
    }
  }, [sessions, sessionsStorageKey]);

  // Save Settings
  const saveSettings = (newSettings: ChatSettings) => {
    setSettings(newSettings);
    localStorage.setItem(settingsStorageKey, JSON.stringify(newSettings));
    setShowSettings(false);
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'Nuova Chat',
      messages: [{
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Ciao! Sono il tuo assistente Antigravity integrato in Chelona. Come posso aiutarti oggi?',
        timestamp: new Date()
      }],
      updatedAt: new Date()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setShowHistory(false);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Vuoi davvero eliminare questa chat?')) {
      setSessions(prev => {
        const filtered = prev.filter(s => s.id !== id);
        if (filtered.length === 0) {
          setTimeout(createNewSession, 0); // create new if empty
        } else if (activeSessionId === id) {
          setActiveSessionId(filtered[0].id);
        }
        return filtered;
      });
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, activeSessionId]);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim()) {
      localStorage.setItem(apiKeyStorageKey, inputKey.trim());
      setApiKey(inputKey.trim());
      setInputKey('');
    }
  };

  const removeKey = () => {
    if (confirm('Vuoi rimuovere la chiave API di Gemini? Non potrai più usare l\'assistente finché non ne inserirai una nuova.')) {
      localStorage.removeItem(apiKeyStorageKey);
      setApiKey('');
      setShowSettings(false);
    }
  };

  const callGeminiAPI = async (userText: string, chatHistory: Message[]) => {
    try {
      const contents = chatHistory
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

      contents.push({ role: 'user', parts: [{ text: userText }] });

      let url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      if (apiKey.startsWith('AIza')) {
        url += `?key=${apiKey}`;
      } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.7 },
          systemInstruction: {
             parts: [{ text: settings.systemPrompt }]
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
      throw new Error("Invalid response format from Gemini");
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      throw err;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !apiKey || !activeSessionId) return;

    const userText = input.trim();
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date()
    };

    // Auto-generate title if this is the first user message
    let newTitle = activeSession.title;
    if (activeSession.title === 'Nuova Chat') {
      newTitle = userText.length > 25 ? userText.substring(0, 25) + '...' : userText;
    }

    const currentHistory = [...messages];
    
    // Optimistic update
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, title: newTitle, messages: [...s.messages, newUserMsg], updatedAt: new Date() };
      }
      return s;
    }));
    
    setInput('');
    setIsTyping(true);

    try {
      const reply = await callGeminiAPI(userText, currentHistory);
      
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            updatedAt: new Date(),
            messages: [...s.messages, {
              id: Date.now().toString(),
              role: 'assistant',
              content: reply,
              timestamp: new Date()
            }]
          };
        }
        return s;
      }));
    } catch (err: any) {
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...s.messages, {
              id: Date.now().toString(),
              role: 'system',
              content: `Errore API: ${err.message}`,
              timestamp: new Date()
            }]
          };
        }
        return s;
      }));
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Login Screen
  if (!apiKey) {
    return (
      <div className="flex flex-col h-full rounded-2xl glass-panel overflow-hidden relative items-center justify-center p-4 sm:p-6">
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] animate-pulse-glow"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 bg-purple-600/10 rounded-full blur-[80px]"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-[2px] mx-auto mb-6">
            <div className="bg-gray-900 w-full h-full rounded-full flex items-center justify-center">
              <Key size={32} className="text-blue-400" />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Connetti Antigravity Cloud</h2>
          <p className="text-xs sm:text-sm text-gray-400 mb-6">
            L'assistente richiede un Token OAuth2 per accedere ai modelli Gemini.
          </p>

          <a 
            href="https://antigravity.google/oauth" 
            target="_blank" 
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors mb-6 shadow-lg text-sm sm:text-base"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
            Ottieni Token OAuth
          </a>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-700"></div>
            <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider">Poi incollalo qui</span>
            <div className="flex-1 h-px bg-gray-700"></div>
          </div>

          <form onSubmit={handleSaveKey} className="space-y-4">
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="ya29... o AIzaSy..."
              className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-center font-mono text-sm sm:text-base"
              required
            />
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-blue-600/20 text-sm sm:text-base"
            >
              Connetti Assistant
            </button>
          </form>

          <p className="mt-6 text-[10px] sm:text-xs text-gray-500">
            La chiave viene salvata in sicurezza solo sul tuo dispositivo e associata a questo profilo.
          </p>
        </motion.div>
      </div>
    );
  }

  // Main Chat Interface
  return (
    <div className="flex flex-col h-full rounded-2xl glass-panel overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] animate-pulse-glow"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 bg-purple-600/10 rounded-full blur-[80px]"></div>
      </div>

      {/* Header */}
      <div className="px-4 py-3 sm:py-4 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between bg-black/20 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHistory(true)}
            className="p-2 sm:hidden hover:bg-gray-800 rounded-xl text-gray-400 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="hidden sm:flex w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 items-center justify-center p-[2px]">
            <div className="bg-gray-900 w-full h-full rounded-full flex items-center justify-center">
               <Bot size={20} className="text-blue-400" />
            </div>
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-white tracking-wide">Antigravity AI</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[10px] sm:text-xs text-gray-400">Gemini Online ({settings.model})</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHistory(true)}
            className="hidden sm:flex p-2 hover:bg-gray-800 rounded-xl text-gray-400 transition-colors"
            title="Storico Chat"
          >
            <MessageSquare size={20} />
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 transition-colors"
            title="Impostazioni"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area: Sidebar + Chat */}
      <div className="flex-1 overflow-hidden relative flex">
        
        {/* History Sidebar / Drawer */}
        <AnimatePresence>
          {showHistory && (
            <>
              {/* Mobile overlay backdrop */}
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 z-40 sm:hidden"
                onClick={() => setShowHistory(false)}
              />
              <motion.div 
                initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                className="absolute left-0 top-0 bottom-0 w-64 bg-gray-900 border-r border-gray-700 z-50 flex flex-col shadow-2xl sm:relative sm:z-auto sm:shadow-none"
              >
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-200">Le tue Chat</h3>
                  <button onClick={() => setShowHistory(false)} className="p-1 sm:hidden text-gray-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="p-3">
                  <button 
                    onClick={createNewSession}
                    className="w-full flex items-center gap-2 justify-center py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-xl transition-colors border border-blue-500/30"
                  >
                    <Plus size={16} /> Nuova Chat
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4 custom-scrollbar">
                  {sessions.map(session => (
                    <div 
                      key={session.id}
                      onClick={() => { setActiveSessionId(session.id); setShowHistory(false); }}
                      className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                        activeSessionId === session.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="text-sm font-medium truncate">{session.title}</div>
                        <div className="text-[10px] opacity-60 mt-1">{session.updatedAt.toLocaleDateString()}</div>
                      </div>
                      <button 
                        onClick={(e) => deleteSession(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:bg-red-400/20 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Messages List */}
        <div className="flex-1 flex flex-col h-full relative">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3 md:gap-4`}
                >
                  {msg.role !== 'user' && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${msg.role === 'system' ? 'bg-red-900/30 border-red-700/50' : 'bg-gray-800 border-gray-700'}`}>
                      {msg.role === 'system' ? <AlertCircle size={16} className="text-red-400" /> : <Bot size={16} className={msg.isAction ? "text-purple-400" : "text-blue-400"} />}
                    </div>
                  )}
                  
                  <div className={`max-w-[85%] md:max-w-[80%] rounded-2xl p-4 shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : msg.role === 'system'
                        ? 'bg-red-900/20 text-red-200 border border-red-500/30 rounded-tl-sm text-sm'
                        : msg.isAction
                          ? 'bg-purple-900/30 text-purple-200 border border-purple-500/30 rounded-tl-sm text-sm font-mono'
                          : 'bg-gray-800/80 text-gray-200 border border-gray-700/50 rounded-tl-sm'
                  }`}>
                    {msg.isAction && (
                      <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
                        <Code size={14} /> Action Plan
                      </div>
                    )}
                    <div className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</div>
                    <span className={`text-[10px] mt-2 block opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0 border border-gray-600">
                      <User size={16} className="text-gray-300" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                 <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0 border border-gray-700">
                    <Bot size={16} className="text-blue-400" />
                  </div>
                  <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 md:p-4 bg-black/20 border-t border-[rgba(255,255,255,0.05)] backdrop-blur-md shrink-0">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Scrivi un messaggio per l'intelligenza artificiale..."
                className="w-full bg-gray-900/50 text-gray-100 placeholder-gray-500 rounded-xl py-3 md:py-4 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-700/50 transition-all shadow-inner text-sm md:text-base"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="absolute right-2 p-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowSettings(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-gray-900 border border-gray-700 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90dvh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Settings size={24} className="text-blue-400" /> Impostazioni AI
                </h2>
                <button onClick={() => setShowSettings(false)} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
                
                {/* Model Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Modello Gemini</label>
                  <select 
                    value={settings.model}
                    onChange={(e) => setSettings({...settings, model: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                  >
                    {AVAILABLE_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* System Prompt */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Istruzioni di Sistema (System Prompt)</label>
                  <textarea 
                    value={settings.systemPrompt}
                    onChange={(e) => setSettings({...settings, systemPrompt: e.target.value})}
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors custom-scrollbar resize-none text-sm"
                    placeholder="Come deve comportarsi l'AI?"
                  />
                  <p className="mt-2 text-[10px] text-gray-500">Queste istruzioni definiscono il comportamento base dell'assistente.</p>
                </div>

                {/* API Key Management */}
                <div className="pt-4 border-t border-gray-800">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Gestione Token / Chiave</h3>
                  <button 
                    onClick={removeKey}
                    className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-3 px-4 rounded-xl transition-colors border border-red-500/20 text-sm font-medium"
                  >
                    <Key size={16} /> Rimuovi Token di Accesso
                  </button>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-800">
                <button 
                  onClick={() => saveSettings(settings)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-xl transition-colors shadow-lg font-medium"
                >
                  <Save size={18} /> Salva Impostazioni
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
