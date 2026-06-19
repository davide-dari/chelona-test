
import { Terminal, Play, Square, Settings, RefreshCw } from 'lucide-react';

export function TerminalView() {
  return (
    <div className="flex flex-col h-full rounded-2xl glass-panel overflow-hidden border border-gray-800">
      <div className="px-4 py-3 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-300 font-medium">
          <Terminal size={16} className="text-gray-400" />
          <span>Local Shell</span>
        </div>
        <div className="flex gap-2">
          <button className="p-1.5 hover:bg-gray-800 rounded-md text-gray-400 hover:text-white transition-colors">
            <RefreshCw size={14} />
          </button>
          <button className="p-1.5 hover:bg-gray-800 rounded-md text-gray-400 hover:text-white transition-colors">
            <Settings size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 bg-[#0d1117] p-4 font-mono text-sm overflow-y-auto custom-scrollbar">
        <div className="text-green-400 mb-2">antigravity@android:~$ ./start-agent.sh</div>
        <div className="text-gray-300 mb-1">[INFO] Initializing Antigravity Core v1.0.2...</div>
        <div className="text-gray-300 mb-1">[INFO] Loading tools and permissions... OK</div>
        <div className="text-blue-400 mb-4">[INFO] Agent connected to workspace. Ready for commands.</div>
        <div className="text-gray-400 flex items-center gap-2">
          <span className="animate-pulse">_</span>
        </div>
      </div>
      <div className="p-3 bg-gray-900 border-t border-gray-800 flex items-center gap-3">
        <button className="flex items-center gap-2 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg transition-colors border border-gray-700">
          <Play size={12} className="text-green-400" /> Run Script
        </button>
        <button className="flex items-center gap-2 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg transition-colors border border-gray-700">
          <Square size={12} className="text-red-400" /> Stop Task
        </button>
      </div>
    </div>
  );
}
