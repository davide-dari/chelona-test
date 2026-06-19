
import { Folder, FileCode, FileJson, FileText, ChevronDown, ChevronRight, File, Archive } from 'lucide-react';

interface FileNode {
  name: string;
  type: 'folder' | 'file';
  ext?: string;
  isOpen?: boolean;
  children?: FileNode[];
}

const mockFileSystem: FileNode[] = [
  {
    name: 'src',
    type: 'folder',
    isOpen: true,
    children: [
      {
        name: 'components',
        type: 'folder',
        isOpen: true,
        children: [
          { name: 'ChatInterface.tsx', type: 'file', ext: 'tsx' },
          { name: 'TerminalView.tsx', type: 'file', ext: 'tsx' },
          { name: 'FileExplorer.tsx', type: 'file', ext: 'tsx' }
        ]
      },
      { name: 'App.tsx', type: 'file', ext: 'tsx' },
      { name: 'index.css', type: 'file', ext: 'css' },
      { name: 'main.tsx', type: 'file', ext: 'tsx' },
    ]
  },
  {
    name: 'android',
    type: 'folder',
    isOpen: false,
    children: []
  },
  { name: 'package.json', type: 'file', ext: 'json' },
  { name: 'capacitor.config.ts', type: 'file', ext: 'ts' },
  { name: 'README.md', type: 'file', ext: 'md' },
];

const getIcon = (type: string, ext?: string, isOpen?: boolean) => {
  if (type === 'folder') {
    return isOpen ? <Folder size={16} className="text-blue-400" /> : <Folder size={16} className="text-gray-400" />;
  }
  switch (ext) {
    case 'tsx':
    case 'ts':
      return <FileCode size={16} className="text-blue-400" />;
    case 'json':
      return <FileJson size={16} className="text-yellow-400" />;
    case 'md':
      return <FileText size={16} className="text-gray-300" />;
    case 'zip':
    case 'gz':
      return <Archive size={16} className="text-red-400" />;
    default:
      return <File size={16} className="text-gray-400" />;
  }
};

const FileTree = ({ nodes, level = 0 }: { nodes: FileNode[], level?: number }) => {
  return (
    <div className="w-full">
      {nodes.map((node, i) => (
        <div key={i}>
          <div 
            className="flex items-center gap-1.5 py-1.5 px-2 hover:bg-gray-800/60 rounded-md cursor-pointer text-sm text-gray-300 transition-colors"
            style={{ paddingLeft: `${level * 16 + 8}px` }}
          >
            <span className="w-4 h-4 flex items-center justify-center opacity-70">
              {node.type === 'folder' && (
                node.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
              )}
            </span>
            {getIcon(node.type, node.ext, node.isOpen)}
            <span className="truncate">{node.name}</span>
          </div>
          {node.type === 'folder' && node.isOpen && node.children && (
            <FileTree nodes={node.children} level={level + 1} />
          )}
        </div>
      ))}
    </div>
  );
};

export function FileExplorer() {
  return (
    <div className="flex flex-col h-full rounded-2xl glass-panel overflow-hidden border border-gray-800">
      <div className="px-4 py-3 bg-gray-900 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-200 tracking-wide uppercase">Workspace</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        <FileTree nodes={mockFileSystem} />
      </div>
    </div>
  );
}
