import React, { useState, useRef, useEffect } from 'react';
import { Camera, Download, X, Image as ImageIcon, Check, Images } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateUUID } from '../utils/uuid';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

interface ImageFilterToolProps {
  onClose: () => void;
  onSaveToSandbox?: (title: string, data: string, folderName?: string) => Promise<void> | void;
}

const FILTERS = [
  { name: 'Normale', css: 'none' },
  { 
    name: 'Cocco', 
    css: 'brightness(0.82) contrast(0.88) saturate(0.95) sepia(0.18) hue-rotate(6deg) blur(0.25px)',
    hasGrain: true 
  },
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
  const [showGalleryToast, setShowGalleryToast] = useState(false);
  const [showDownloadToast, setShowDownloadToast] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addGrain = (ctx: CanvasRenderingContext2D, width: number, height: number, amount: number) => {
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = 128;
    grainCanvas.height = 128;
    const gCtx = grainCanvas.getContext('2d');
    if (!gCtx) return;
    const gData = gCtx.createImageData(128, 128);
    for (let i = 0; i < gData.data.length; i += 4) {
      const val = Math.random() * 255;
      gData.data[i] = val;
      gData.data[i+1] = val;
      gData.data[i+2] = val;
      gData.data[i+3] = amount * 255;
    }
    gCtx.putImageData(gData, 0, 0);
    const pattern = ctx.createPattern(grainCanvas, 'repeat');
    if (pattern) {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        originalImageRef.current = img;
        setImageSrc(event.target?.result as string);
        setActiveFilterIndex(0);
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

    const MAX_SIZE = 2500;
    let width = img.width;
    let height = img.height;
    if (width > MAX_SIZE || height > MAX_SIZE) {
      if (width > height) { height = Math.round((height * MAX_SIZE) / width); width = MAX_SIZE; }
      else { width = Math.round((width * MAX_SIZE) / height); height = MAX_SIZE; }
    }
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = FILTERS[filterIndex].css;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if ((FILTERS[filterIndex] as any).hasGrain) {
      addGrain(ctx, canvas.width, canvas.height, 0.12);
    }
  };

  useEffect(() => {
    if (imageSrc) applyFilter(activeFilterIndex);
  }, [activeFilterIndex, imageSrc]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    setIsProcessing(true);
    applyFilter(activeFilterIndex);
    setTimeout(async () => {
      try {
        const dataUrl = canvasRef.current!.toDataURL('image/jpeg', 0.9);
        const fileName = `chelona_${generateUUID().substring(0, 6)}.jpg`;
        if (Capacitor.isNativePlatform()) {
          try {
            await Filesystem.writeFile({
              path: `Download/${fileName}`,
              data: dataUrl.split(',')[1],
              directory: Directory.ExternalStorage
            });
          } catch {
            // Fallback to Documents if ExternalStorage fails
            await Filesystem.writeFile({
              path: fileName,
              data: dataUrl.split(',')[1],
              directory: Directory.Documents
            });
          }
        } else {
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        setShowDownloadToast(true);
        setTimeout(() => setShowDownloadToast(false), 3000);
      } catch (err) {
        console.error('Download error:', err);
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  const handleSaveToApp = () => {
    if (!canvasRef.current || !onSaveToSandbox) return;
    setIsProcessing(true);
    applyFilter(activeFilterIndex);
    setTimeout(async () => {
      try {
        const canvas = canvasRef.current!;
        const maxDim = 1200;
        let width = canvas.width;
        let height = canvas.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
          else { width = Math.round((width * maxDim) / height); height = maxDim; }
        }
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        tempCanvas.getContext('2d')?.drawImage(canvas, 0, 0, width, height);
        const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.75);
        await onSaveToSandbox(`Immagine: ${FILTERS[activeFilterIndex].name}`, dataUrl, 'Galleria');
        setShowGalleryToast(true);
        setTimeout(() => setShowGalleryToast(false), 3500);
      } catch (err) {
        console.error('Save error:', err);
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] p-4 lg:p-6 w-full shadow-xl flex flex-col h-[85vh] max-h-[800px] relative overflow-hidden"
    >
      {/* Gallery Toast */}
      <AnimatePresence>
        {showGalleryToast && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-indigo-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-indigo-500/50 border border-indigo-400/30 pointer-events-none"
            style={{ whiteSpace: 'nowrap' }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
              className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0"
            >
              <Images className="w-4 h-4" />
            </motion.div>
            <div>
              <p className="font-black text-sm leading-tight">Aggiunto nella galleria</p>
              <p className="text-[10px] text-indigo-200 font-semibold">Foto salvata con successo ✓</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Download Toast */}
      <AnimatePresence>
        {showDownloadToast && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-emerald-500/50 border border-emerald-400/30 pointer-events-none"
            style={{ whiteSpace: 'nowrap' }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
              className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0"
            >
              <Download className="w-4 h-4" />
            </motion.div>
            <div>
              <p className="font-black text-sm leading-tight">Foto scaricata</p>
              <p className="text-[10px] text-emerald-200 font-semibold">Salvata nella cartella Download ✓</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
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

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      {!imageSrc ? (
        <div
          className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border)] rounded-[2rem] bg-[var(--bg)] hover:bg-[var(--surface-variant)] transition-all cursor-pointer p-8"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-20 h-20 bg-pink-500/10 rounded-full flex items-center justify-center text-pink-500 mb-6">
            <ImageIcon className="w-10 h-10" />
          </div>
          <h4 className="text-xl font-bold text-[var(--text-main)] mb-2 text-center">Seleziona un'immagine</h4>
          <p className="text-sm text-[var(--text-muted)] text-center font-medium max-w-xs">Carica una foto dalla tua galleria per applicare filtri di alta qualità.</p>
          <button className="mt-8 px-8 py-3.5 bg-[var(--accent)] text-white rounded-2xl font-bold shadow-lg shadow-[var(--accent)]/20 active:scale-95 transition-all">
            Scegli Foto
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden gap-4">
          {/* Canvas Preview */}
          <div className="flex-1 min-h-0 bg-[var(--bg)] rounded-[2rem] border border-[var(--border)] overflow-hidden flex items-center justify-center relative p-2">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full object-contain rounded-xl shadow-sm"
              style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))' }}
            />
            <button
              onClick={() => { setImageSrc(null); originalImageRef.current = null; setActiveFilterIndex(0); }}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white rounded-xl transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Strip */}
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
                      style={{ backgroundImage: `url(${imageSrc})`, filter: filter.css }}
                    />
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                      {filter.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {/* Download */}
            <button
              onClick={handleDownload}
              disabled={isProcessing}
              className={`flex items-center justify-center gap-2 py-4 bg-[var(--bg)] border border-[var(--border)] hover:bg-[var(--surface-variant)] text-[var(--text-main)] rounded-2xl font-bold transition-all ${isProcessing ? 'opacity-50 cursor-wait' : 'active:scale-95'}`}
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              ) : showDownloadToast ? (
                <Check className="w-5 h-5 text-emerald-500" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              <span>{isProcessing ? 'Elaborazione...' : showDownloadToast ? 'Scaricato!' : 'Scarica'}</span>
            </button>

            {/* Save to Gallery */}
            {onSaveToSandbox ? (
              <button
                onClick={handleSaveToApp}
                disabled={isProcessing}
                className={`flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/30 ${isProcessing ? 'opacity-50 cursor-wait' : 'active:scale-95'}`}
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : showGalleryToast ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Images className="w-5 h-5" />
                )}
                <span>{isProcessing ? 'Salvataggio...' : showGalleryToast ? 'In Galleria!' : 'Galleria'}</span>
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-4 bg-[var(--bg)] border border-[var(--border)] opacity-40 rounded-2xl font-bold text-[var(--text-muted)] cursor-not-allowed">
                <Images className="w-5 h-5" />
                <span>Galleria</span>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
