import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Code, Key, Trash2, Settings, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isAction?: boolean;
}

export function ChatInterface({ currentProfileId }: { currentProfileId: string }) {
  const apiKeyStorageKey = `chelona_antigravity_key_${currentProfileId}`;
  const historyStorageKey = `chelona_antigravity_history_${currentProfileId}`;

  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(apiKeyStorageKey) || '');
  const [inputKey, setInputKey] = useState('');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load history on mount
    const saved = localStorage.getItem(historyStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      } catch (e) {
        console.error("Failed to load chat history", e);
      }
    } else {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: 'Ciao! Sono il tuo assistente Antigravity integrato in Chelona. Come posso aiutarti oggi?',
          timestamp: new Date()
        }
      ]);
    }
  }, [historyStorageKey]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(historyStorageKey, JSON.stringify(messages));
      scrollToBottom();
    }
  }, [messages, historyStorageKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim()) {
      localStorage.setItem(apiKeyStorageKey, inputKey.trim());
      setApiKey(inputKey.trim());
      setInputKey('');
    }
  };

  const clearHistory = () => {
    if (confirm('Vuoi davvero cancellare tutta la cronologia della chat?')) {
      const initial = [{
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Cronologia cancellata. Come posso aiutarti ora?',
        timestamp: new Date()
      } as Message];
      setMessages(initial);
      localStorage.setItem(historyStorageKey, JSON.stringify(initial));
      setShowSettings(false);
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
      // Convert history to Gemini format (user and model roles)
      const contents = chatHistory
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

      // Append current message
      contents.push({ role: 'user', parts: [{ text: userText }] });

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.7 },
          systemInstruction: {
             parts: [{ text: "Sei Antigravity AI, un assistente virtuale hacker e super intelligente integrato dentro l'app Chelona. Rispondi in italiano in modo chiaro, utile e conciso." }]
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
    if (!input.trim() || !apiKey) return;

    const userText = input.trim();
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date()
    };

    const currentHistory = [...messages];
    setMessages(prev => [...prev, newUserMsg]);
    setInput('');
    setIsTyping(true);
    setError(null);

    try {
      const reply = await callGeminiAPI(userText, currentHistory);
      
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: reply,
          timestamp: new Date()
        }
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'system',
          content: `Errore di connessione a Gemini API: ${err.message}`,
          timestamp: new Date()
        }
      ]);
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
      <div className="flex flex-col h-full rounded-2xl glass-panel overflow-hidden relative items-center justify-center p-6">
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] animate-pulse-glow"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 bg-purple-600/10 rounded-full blur-[80px]"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-[2px] mx-auto mb-6">
            <div className="bg-gray-900 w-full h-full rounded-full flex items-center justify-center">
              <Key size={32} className="text-blue-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Connetti Gemini API</h2>
          <p className="text-sm text-gray-400 mb-6">
            Antigravity Assistant utilizza l'intelligenza artificiale di Google.
          </p>

          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors mb-6 shadow-lg"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
            Ottieni Chiave API con Google
          </a>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-700"></div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Poi incollala qui</span>
            <div className="flex-1 h-px bg-gray-700"></div>
          </div>

          <form onSubmit={handleSaveKey} className="space-y-4">
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-center font-mono"
              required
            />
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-blue-600/20"
            >
              Connetti Assistant
            </button>
          </form>

          <p className="mt-6 text-xs text-gray-500">
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
      <div className="px-4 md:px-6 py-4 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between bg-black/20 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-[2px]">
            <div className="bg-gray-900 w-full h-full rounded-full flex items-center justify-center">
               <Bot size={20} className="text-blue-400" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white tracking-wide">Antigravity AI</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs text-gray-400">Gemini Online</span>
            </div>
          </div>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 transition-colors"
          >
            <Settings size={20} />
          </button>

          <AnimatePresence>
            {showSettings && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-12 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50"
              >
                <div className="p-2">
                  <button 
                    onClick={clearHistory}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Trash2 size={16} className="text-red-400" />
                    Svuota Chat
                  </button>
                  <button 
                    onClick={removeKey}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg flex items-center gap-2 transition-colors mt-1"
                  >
                    <Key size={16} className="text-blue-400" />
                    Cambia Chiave API
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Messages Area */}
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
  );
}
