import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Code, Key, Trash2, Settings, AlertCircle, Menu, Plus, X, MessageSquare, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Settings, Terminal, Play, Square, Menu, MessageSquare, X, Send } from 'lucide-react';
import { NodeJS } from '@choreruiz/capacitor-node-js';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isAction?: boolean;
}

interface ChatSettings {
  provider: 'aistudio';
}

const DEFAULT_SETTINGS: ChatSettings = {
  provider: 'aistudio'
};

export function ChatInterface({ currentProfileId }: { currentProfileId: string }) {
  const apiKeyStorageKey = `chelona_antigravity_key_${currentProfileId}`;
  const sessionsStorageKey = `chelona_antigravity_sessions_${currentProfileId}`;
  const settingsStorageKey = `chelona_antigravity_settings_${currentProfileId}`;

  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(apiKeyStorageKey) || '');
  const [inputKey, setInputKey] = useState('');
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [terminalLog, setTerminalLog] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Initialize NodeJS listener
  useEffect(() => {
    let listener: any = null;
    const initNode = async () => {
      listener = await NodeJS.addListener('output', (event: any) => {
        const msg = event.args[0];
        if (msg.type === 'stdout' || msg.type === 'stderr' || msg.type === 'system') {
          setTerminalLog(prev => prev + (msg.type === 'system' ? `\n\n[SISTEMA] ${msg.data}\n\n` : msg.data));
        }
        if (msg.type === 'exit') {
          setTerminalLog(prev => prev + `\n\n[SISTEMA] Processo terminato con codice ${msg.code}\n`);
          setIsRunning(false);
        }
      });
    };
    initNode();
    return () => {
      if (listener) listener.remove();
    };
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLog]);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim()) {
      localStorage.setItem(apiKeyStorageKey, inputKey.trim());
      setApiKey(inputKey.trim());
      setInputKey('');
    }
  };

  const removeKey = () => {
    if (confirm('Vuoi rimuovere la chiave API di Gemini?')) {
      localStorage.removeItem(apiKeyStorageKey);
      setApiKey('');
      setShowSettings(false);
    }
  };

  const toggleProcess = async () => {
    if (isRunning) {
      await NodeJS.send({ eventName: 'control', args: [{ command: 'kill' }] });
      setIsRunning(false);
    } else {
      setTerminalLog('[SISTEMA] Avvio della CLI in corso...\n');
      await NodeJS.send({ eventName: 'control', args: [{ command: 'start', apiKey }] });
      setIsRunning(true);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !isRunning) return;
    const userText = input.trim();
    setTerminalLog(prev => prev + `${userText}\n`);
    setInput('');
    await NodeJS.send({ eventName: 'control', args: [{ command: 'input', data: userText }] });
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
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Connetti Antigravity CLI</h2>
          <p className="text-xs sm:text-sm text-gray-400 mb-6">
            L'assistente richiede una API Key di AI Studio per avviare il processo nativo Node.js sul telefono.
          </p>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-700"></div>
            <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Autenticazione</span>
            <div className="flex-1 h-px bg-gray-700"></div>
          </div>

          <form onSubmit={handleSaveKey} className="space-y-4">
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-black/40 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-center font-mono text-sm sm:text-base"
              required
            />
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-blue-600/20 text-sm sm:text-base"
            >
              Accedi
            </button>
          </form>
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
      <div className="px-4 py-3 sm:py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHistory(true)}
            className="p-2 sm:hidden hover:bg-gray-800 rounded-xl text-gray-400 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="hidden sm:flex items-center justify-center">
            <Terminal size={20} className="text-green-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-mono font-bold text-green-400 tracking-wide">Antigravity CLI</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[10px] sm:text-xs text-gray-400 font-mono">v1.15.55 ({settings.model})</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button onClick={toggleProcess} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm transition-colors border border-red-500/30 font-semibold">
              <Square size={14} /> Stop
            </button>
          ) : (
            <button onClick={toggleProcess} className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-sm transition-colors border border-green-500/30 font-semibold">
              <Play size={14} /> Start
            </button>
          )}
          <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 transition-colors" title="Impostazioni">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex">
        <div className="flex-1 flex flex-col h-full relative bg-[#0d1117]">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
            <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-gray-300">
              {terminalLog || "Terminale pronto. Premi 'Start' per avviare il motore Node.js locale."}
            </div>
            <div ref={terminalEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 md:p-4 bg-gray-900 border-t border-gray-800 shrink-0">
            <div className="relative flex items-center font-mono">
              <span className="absolute left-4 text-green-400 text-sm hidden sm:inline">user@antigravity:~$</span>
              <span className="absolute left-4 text-green-400 text-sm sm:hidden">~$</span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder=""
                disabled={!isRunning}
                className="w-full bg-transparent text-gray-100 placeholder-gray-600 py-2 pl-12 sm:pl-48 pr-12 focus:outline-none transition-all text-sm md:text-base disabled:opacity-50"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || !isRunning}
                className="absolute right-2 p-2 rounded-lg text-green-400 hover:text-green-300 disabled:opacity-50 transition-colors"
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
                <div className="pt-4 border-t border-gray-800">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Gestione API Key</h3>
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
