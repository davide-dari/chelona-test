import React, { useState, useRef, useEffect } from 'react';
import { Camera, Download, X, Save, Image as ImageIcon, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateUUID } from '../utils/uuid';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

interface ImageFilterToolProps {
  onClose: () => void;
  onSaveToSandbox?: (title: string, data: string, folderName?: string) => void;
}

const FILTERS = [
  { name: 'Normale', css: 'none' },
  { name: 'Cocco', css: 'sepia(0.3) saturate(1.4) hue-rotate(-10deg) brightness(1.05) contrast(1.1)' },
  { name: 'Chelonas', css: 'contrast(1.35) saturate(1.2) sepia(0.15) hue-rotate(-5deg) brightness(1.05)' },
  { name: 'Clarendon', css: 'contrast(1.2) saturate(1.35) brightness(1.1) sepia(0.1)' },
  { name: 'Gingham', css: 'brightness(1.05) hue-rotate(-10deg) saturate(0.8)' },
  { name: 'Moon', css: 'grayscale(1) contrast(1.1) brightness(1.1)' },
  { name: 'Lark', css: 'contrast(0.9) saturate(1.1)' },
  { name: 'Reyes', css: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)' },
  { name: 'Juno', css: 'saturate(1.4) hue-rotate(-4deg) contrast(1.15)' },
  { name: 'Slumber', css: 'saturate(0.66) brightness(1.05) sepia(0.3)' },
  { name: 'Crema', css: 'sepia(0.5) contrast(1.15) brightness(1.15) saturate(0.9)' },
  { name: 'Ludwig', css: 'contrast(1.05) saturate(1.05) sepia(0.1)' },
  { name: 'Aden', css: 'hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)' },
  { name: 'Perpetua', css: 'contrast(1.1) saturate(1.1) sepia(0.1) hue-rotate(10deg)' },
  { name: 'Amaro', css: 'hue-rotate(-10deg) contrast(1.1) brightness(1.1) saturate(1.3)' },
  { name: 'Bianco/Nero', css: 'grayscale(100%)' },
  { name: 'Seppia', css: 'sepia(100%)' }
];

export const ImageFilterTool = ({ onClose, onSaveToSandbox }: ImageFilterToolProps) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [activeFilterIndex, setActiveFilterIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        originalImageRef.current = img;
        setImageSrc(event.target?.result as string);
        setActiveFilterIndex(0); // Reset filter
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const applyFilter = (filterIndex: number) => {
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Limit resolution for performance and to avoid mobile browser canvas limits
    const MAX_SIZE = 2500;
    let width = img.width;
    let height = img.height;

    if (width > MAX_SIZE || height > MAX_SIZE) {
      if (width > height) {
        height = Math.round((height * MAX_SIZE) / width);
        width = MAX_SIZE;
      } else {
        width = Math.round((width * MAX_SIZE) / height);
        height = MAX_SIZE;
      }
    }

    // Set canvas dimensions
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply filter
    ctx.filter = FILTERS[filterIndex].css;

    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    console.log('Filter applied:', FILTERS[filterIndex].name);
  };

  // Re-apply filter when index changes or image loads
  useEffect(() => {
    if (imageSrc) {
      applyFilter(activeFilterIndex);
    }
  }, [activeFilterIndex, imageSrc]);

  const handleDownload = () => {
    try {
      if (!canvasRef.current) return;
      setIsProcessing(true);
      
      // Ensure canvas is drawn
      applyFilter(activeFilterIndex);
      
      setTimeout(async () => {
        try {
          const dataUrl = canvasRef.current!.toDataURL('image/jpeg', 0.9);
          const fileName = `chelona_filter_${generateUUID().substring(0, 6)}.jpg`;
          
          if (Capacitor.isNativePlatform()) {
            const base64Data = dataUrl.split(',')[1];
            await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Documents
            });
            alert('Immagine salvata nella cartella Documenti del dispositivo!');
          } else {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
          
          setDownloaded(true);
          setTimeout(() => setDownloaded(false), 2000);
        } catch (err) {
          console.error('Download error:', err);
          alert('Errore durante il download dell\'immagine.');
        } finally {
          setIsProcessing(false);
        }
      }, 100);
    } catch (err) {
      console.error('Download error outer:', err);
      setIsProcessing(false);
    }
  };

  const handleSaveToApp = () => {
    try {
      if (!canvasRef.current || !onSaveToSandbox) return;
      setIsProcessing(true);
      
      // Ensure canvas is drawn
      applyFilter(activeFilterIndex);
      
      setTimeout(async () => {
        try {
          const dataUrl = canvasRef.current!.toDataURL('image/jpeg', 0.85);
          await onSaveToSandbox(`Immagine: ${FILTERS[activeFilterIndex].name}`, dataUrl, 'Galleria');
          
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } catch (err) {
          console.error('Save error:', err);
          alert('Errore durante il salvataggio dell\'immagine.');
        } finally {
          setIsProcessing(false);
        }
      }, 100);
    } catch (err) {
      console.error('Save error outer:', err);
      setIsProcessing(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const resetImage = () => {
    setImageSrc(null);
    originalImageRef.current = null;
    setActiveFilterIndex(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-6 lg:p-8 w-full shadow-xl flex flex-col min-h-[70vh] lg:min-h-[80vh]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-pink-500/10 rounded-2xl border border-pink-500/20 text-pink-500">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[var(--text-main)] leading-tight">Filtri Immagine</h3>
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5">Editor Foto</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 bg-[var(--bg)] hover:bg-red-500/10 border border-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-red-500 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {!imageSrc ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border)] rounded-[2rem] bg-[var(--bg)] hover:bg-[var(--surface-variant)] transition-all cursor-pointer p-8" onClick={triggerFileInput}>
          <div className="w-20 h-20 bg-pink-500/10 rounded-full flex items-center justify-center text-pink-500 mb-6 group-hover:scale-110 transition-transform">
            <ImageIcon className="w-10 h-10" />
          </div>
          <h4 className="text-xl font-bold text-[var(--text-main)] mb-2 text-center">Seleziona un'immagine</h4>
          <p className="text-sm text-[var(--text-muted)] text-center font-medium max-w-xs">Carica una foto dalla tua galleria per applicare filtri di alta qualità.</p>
          <button className="mt-8 px-8 py-3.5 bg-[var(--accent)] text-white rounded-2xl font-bold shadow-lg shadow-[var(--accent)]/20 active:scale-95 transition-all">
            Scegli Foto
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden gap-6">
          
          {/* Main Image Preview Area */}
          <div className="flex-1 min-h-0 bg-[var(--bg)] rounded-[2rem] border border-[var(--border)] overflow-hidden flex items-center justify-center relative p-2">
            {/* The canvas is styled to fit the container while maintaining aspect ratio */}
            <canvas 
              ref={canvasRef}
              className="max-w-full max-h-full object-contain rounded-xl shadow-sm"
              style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))' }}
            />
            
            <button 
              onClick={resetImage}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white rounded-xl transition-all"
              title="Cambia Immagine"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Selection Scrollbar */}
          <div className="shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-3 px-1">
              {FILTERS.map((filter, index) => {
                const isActive = activeFilterIndex === index;
                return (
                  <button
                    key={index}
                    onClick={() => setActiveFilterIndex(index)}
                    className={`flex flex-col items-center gap-2 p-2 rounded-2xl min-w-[80px] shrink-0 transition-all ${isActive ? 'bg-[var(--accent-bg)] border-2 border-[var(--accent)] shadow-sm' : 'hover:bg-[var(--bg)] border-2 border-transparent opacity-80 hover:opacity-100'}`}
                  >
                    <div 
                      className="w-14 h-14 rounded-xl bg-cover bg-center overflow-hidden border border-[var(--border)] shadow-inner"
                      style={{
                        backgroundImage: `url(${imageSrc})`,
                        filter: filter.css
                      }}
                    />
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                      {filter.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <button
              onClick={handleDownload}
              disabled={isProcessing}
              className={`flex items-center justify-center gap-2 py-4 bg-[var(--bg)] border border-[var(--border)] hover:bg-[var(--surface-variant)] text-[var(--text-main)] rounded-2xl font-bold transition-all ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              ) : downloaded ? (
                <Check className="w-5 h-5 text-emerald-500" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              {isProcessing ? 'Elaborazione...' : downloaded ? 'Scaricato' : 'Scarica'}
            </button>
            {onSaveToSandbox ? (
              <button
                onClick={handleSaveToApp}
                disabled={isProcessing}
                className={`flex items-center justify-center gap-2 py-4 bg-[var(--accent)] hover:brightness-110 text-white rounded-2xl font-bold transition-all shadow-lg shadow-[var(--accent)]/20 ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : saved ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isProcessing ? 'Salvataggio...' : saved ? 'Salvato' : 'Salva in App'}
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-4 bg-[var(--bg)] border border-[var(--border)] opacity-50 rounded-2xl font-bold text-[var(--text-muted)] cursor-not-allowed" title="Effettua il login per salvare in app">
                <Save className="w-5 h-5" />
                Salva in App (Login req.)
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
