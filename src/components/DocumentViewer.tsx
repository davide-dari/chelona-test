import React, { useState } from 'react';
import { X, Download, Share2, Maximize2, Minimize2, ZoomIn, ZoomOut, FileText, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: string; // Base64 data (image or PDF)
  type?: 'image' | 'pdf' | 'auto';
  onDelete?: () => void;
}

export const DocumentViewer = ({ isOpen, onClose, title, data, type = 'auto', onDelete }: DocumentViewerProps) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  
  if (!isOpen) return null;

  const isPdf = data.startsWith('data:application/pdf') || (!data.startsWith('data:image') && type === 'pdf');
  const isImage = data.startsWith('data:image') || (type === 'image');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = data;
    link.download = `${title.replace(/\s+/g, '_')}_${new Date().getTime()}.${isPdf ? 'pdf' : 'jpg'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        // Convert base64 to blob for sharing
        const res = await fetch(data);
        const blob = await res.blob();
        const file = new File([blob], `${title}.${isPdf ? 'pdf' : 'jpg'}`, { type: blob.type });
        
        await navigator.share({
          files: [file],
          title: title,
        });
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300000] flex flex-col bg-black/95 backdrop-blur-xl overflow-hidden">
          {/* Header */}
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between p-4 bg-black/40 border-b border-white/10 z-10"
          >
            <div className="flex items-center gap-3">
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Chiudi"
              >
                <X className="w-6 h-6 text-white" />
              </button>
              <div>
                <h3 className="text-white font-bold text-base truncate max-w-[200px] sm:max-w-md">{title}</h3>
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">
                  {isPdf ? 'Documento PDF' : 'Immagine/Scansione'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleShare}
                className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/10"
                title="Condividi"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button 
                onClick={handleDownload}
                className="p-2.5 bg-white/5 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-all border border-white/10 hover:border-emerald-500/30"
                title="Scarica"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          {/* Viewer Area */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden touch-none p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full h-full flex items-center justify-center"
            >
              {isPdf ? (
                <div className="w-full h-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl">
                  <object
                    data={data}
                    type="application/pdf"
                    className="w-full h-full"
                  >
                    <div className="p-10 text-center">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600 font-bold mb-4">L'anteprima PDF non è supportata in questo browser.</p>
                      <button 
                        onClick={handleDownload}
                        className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold"
                      >
                        Scarica per visualizzare
                      </button>
                    </div>
                  </object>
                </div>
              ) : isImage ? (
                <div 
                  className="relative transition-transform duration-200"
                  style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                >
                  <img 
                    src={data} 
                    alt={title} 
                    className="max-w-full max-h-[80vh] rounded-lg shadow-2xl select-none"
                    draggable={false}
                  />
                </div>
              ) : (
                <div className="text-center text-white/40">
                  <FileText className="w-20 h-20 mx-auto mb-4 opacity-10" />
                  <p className="text-sm font-bold">Tipo di file sconosciuto</p>
                </div>
              )}
            </motion.div>

            {/* Float Controls for Images */}
            {isImage && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md border border-white/10 rounded-full py-2 px-6 flex items-center gap-6 z-20">
                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="text-white/70 hover:text-white transition-colors">
                  <ZoomOut className="w-5 h-5" />
                </button>
                <span className="text-white font-mono text-xs font-bold w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="text-white/70 hover:text-white transition-colors">
                  <ZoomIn className="w-5 h-5" />
                </button>
                <div className="w-px h-4 bg-white/10 px-0" />
                <button onClick={() => setRotation(r => r + 90)} className="text-white/70 hover:text-white transition-colors">
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
