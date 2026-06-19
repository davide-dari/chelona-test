import { useState } from 'react';
import { ChatInterface } from './ChatInterface';
import { TerminalView } from './TerminalView';
import { FileExplorer } from './FileExplorer';
import { Layers, Terminal, MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function AntigravityAssistant({ currentProfileId, onClose }: { currentProfileId: string, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'chat' | 'terminal' | 'files'>('chat');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-0 z-[100] flex flex-col bg-[#0b0f19] text-white overflow-hidden"
    >
      {/* Decorative Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-[1px]">
            <div className="bg-gray-900 w-full h-full rounded-lg flex items-center justify-center">
              <Terminal className="text-blue-400" size={16} />
            </div>
          </div>
          <h1 className="font-semibold tracking-wide">Antigravity AI</h1>
        </div>
        <button 
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10 p-0 md:p-4 gap-4">
        {/* Navigation Sidebar (Desktop) */}
        <div className="hidden md:flex flex-col w-16 items-center py-4 border border-gray-800 bg-gray-900/50 backdrop-blur-xl rounded-2xl shrink-0">
          <nav className="flex flex-col gap-4 w-full items-center">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`p-3 rounded-xl transition-all ${activeTab === 'chat' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
              title="Chat"
            >
              <MessageSquare size={20} />
            </button>
            <button 
              onClick={() => setActiveTab('terminal')}
              className={`p-3 rounded-xl transition-all ${activeTab === 'terminal' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
              title="Terminale"
            >
              <Terminal size={20} />
            </button>
            <button 
              onClick={() => setActiveTab('files')}
              className={`p-3 rounded-xl transition-all ${activeTab === 'files' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
              title="Files"
            >
              <Layers size={20} />
            </button>
          </nav>
        </div>

        {/* Mobile Tabs */}
        <div className="md:hidden flex border-b border-gray-800 bg-gray-900/50 shrink-0">
          {[
            { id: 'chat', icon: MessageSquare, label: 'Chat' },
            { id: 'terminal', icon: Terminal, label: 'Terminal' },
            { id: 'files', icon: Layers, label: 'Files' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <tab.icon size={20} />
            </button>
          ))}
        </div>

        {/* Workspace Panels */}
        
        {/* Left Panel: Files & Terminal (Hidden on mobile if not active) */}
        <div className={`${activeTab === 'files' || activeTab === 'terminal' ? 'flex' : 'hidden'} md:flex flex-col gap-4 w-full md:w-80 lg:w-96 shrink-0 h-full p-4 md:p-0`}>
          <div className={`${activeTab === 'files' ? 'flex' : 'hidden'} md:flex flex-1 min-h-[40%]`}>
            <FileExplorer />
          </div>
          <div className={`${activeTab === 'terminal' ? 'flex' : 'hidden'} md:flex flex-1 min-h-[40%]`}>
            <TerminalView />
          </div>
        </div>

        {/* Right Panel: Chat Interface */}
        <div className={`${activeTab === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 h-full p-4 md:p-0`}>
          <ChatInterface currentProfileId={currentProfileId} />
        </div>
      </div>
    </motion.div>
  );
}
