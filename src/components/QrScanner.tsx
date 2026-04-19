import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Zap, ZapOff, Minus, Plus, Maximize } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QrScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export const QrScanner: React.FC<QrScannerProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  const scannerRef = React.useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isMounted = true;
    
    const runScanner = () => {
      if (!isMounted) return;
      
      if (!window.isSecureContext) {
        setError('Errore di Sicurezza: La fotocamera può essere usata solo su siti sicuri (HTTPS o localhost).');
        return;
      }

      try {
        html5QrCode = new Html5Qrcode('reader');
        scannerRef.current = html5QrCode;
        
        html5QrCode.start(
          { facingMode: 'environment' }, 
          { 
            fps: 24,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdge * 0.8); // Box leggermente più grande
              return { width: qrboxSize, height: qrboxSize };
            },
            aspectRatio: 1.0,
            useBarCodeDetectorIfSupported: true
          },
          (decodedText) => {
            if (isMounted) {
              if (navigator.vibrate) navigator.vibrate(100);
              html5QrCode?.stop().then(() => {
                html5QrCode?.clear();
                onScan(decodedText);
              }).catch((e) => {
                console.error('Stop on scan error', e);
                onScan(decodedText);
              });
            }
          },
          () => {}
        ).then(() => {
          if (!isMounted) return;
          
          setIsReady(true);
          
          // Rilevamento capacità hardware
          try {
            const capabilities = html5QrCode?.getRunningTrackCapabilities();
            if (capabilities) {
              if (capabilities.zoom) {
                setMinZoom(capabilities.zoom.min || 1);
                setMaxZoom(capabilities.zoom.max || 1);
                setZoom(capabilities.zoom.min || 1);
              }
              if (capabilities.torch) {
                setHasTorch(true);
              }
            }
          } catch (e) {
            console.warn("Failed to get track capabilities", e);
          }
        }).catch((err) => {
          if (isMounted) {
            console.error('Camera start error:', err);
            setError('Impossibile accedere alla fotocamera. Assicurati di aver concesso i permessi.');
          }
        });
      } catch (e) {
        console.error("Html5Qrcode init error", e);
      }
    };

    runScanner();

    return () => {
      isMounted = false;
      if (html5QrCode) {
        html5QrCode.stop().then(() => {
          html5QrCode?.clear();
        }).catch(() => {});
      }
      scannerRef.current = null;
    };
  }, [onScan]);

  const handleZoomChange = async (newZoom: number) => {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.applyVideoConstraints({
        zoom: newZoom
      });
      setZoom(newZoom);
    } catch (e) {
      console.error("Failed to apply zoom", e);
    }
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const newState = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        torch: newState
      } as any);
      setIsTorchOn(newState);
    } catch (e) {
      console.error("Failed to toggle torch", e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm h-[100dvh] w-full overflow-hidden">
      <div className="relative bg-[var(--card-bg)] rounded-[2.5rem] overflow-hidden w-full max-w-md shadow-2xl border border-[var(--border)]">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)] bg-[var(--header-bg)]">
            <h3 className="font-bold text-[var(--text-main)] translate-x-1">Scansiona QR Code</h3>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg)] rounded-xl text-[var(--text-muted)] transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="relative rounded-3xl overflow-hidden aspect-square bg-black border-2 border-[var(--border)]">
            <div id="reader" className="w-full h-full object-cover"></div>
            
            {/* Overlay Scanner UI */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Corner Brackets */}
              <div className="absolute inset-[10%] border-2 border-white/10 rounded-3xl scale-110"></div>
              
              {/* Scanning Active Area (Visual Guide) - Larger for distant recognition */}
              <div className="w-[80%] h-[80%] border-2 border-amber-500/30 rounded-2xl relative">
                {/* Scanning Line Animation */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-scan-line"></div>
                
                {/* Corners highlight */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-amber-500 rounded-tl-xl transition-all duration-500 group-hover:scale-110"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-amber-500 rounded-tr-xl transition-all duration-500 group-hover:scale-110"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-amber-500 rounded-bl-xl transition-all duration-500 group-hover:scale-110"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-amber-500 rounded-br-xl transition-all duration-500 group-hover:scale-110"></div>
              </div>
              
              {/* Hint Text */}
              <div className="absolute bottom-6 left-0 right-0 text-center">
                <p className="text-[9px] text-white/70 font-black uppercase tracking-widest bg-black/60 backdrop-blur-md py-1.5 px-6 rounded-full inline-block border border-white/10 shadow-lg">
                  Avvicinati o usa lo zoom
                </p>
              </div>
            </div>

            {/* Torch Button float */}
            {hasTorch && isReady && (
              <button 
                onClick={toggleTorch}
                className={`absolute top-4 right-4 z-20 w-12 h-12 rounded-2xl backdrop-blur-md border flex items-center justify-center transition-all ${
                  isTorchOn 
                  ? 'bg-amber-500 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]' 
                  : 'bg-black/40 border-white/20 text-white/70 hover:bg-black/60'
                }`}
              >
                {isTorchOn ? <Zap className="w-6 h-6 fill-current" /> : <ZapOff className="w-6 h-6" />}
              </button>
            )}
          </div>

          {/* Zoom Control Section */}
          {maxZoom > minZoom && isReady && (
            <div className="mt-8 px-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                  <Maximize className="w-3 h-3" /> Zoom Control
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                  {zoom.toFixed(1)}x
                </span>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleZoomChange(Math.max(minZoom, zoom - 0.5))}
                  className="p-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-amber-500 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="flex-1 relative flex items-center h-8">
                  <input 
                    type="range"
                    min={minZoom}
                    max={maxZoom}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[var(--bg)] rounded-full appearance-none cursor-pointer accent-amber-500 border border-[var(--border)]"
                  />
                </div>
                <button 
                  onClick={() => handleZoomChange(Math.min(maxZoom, zoom + 0.5))}
                  className="p-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-[var(--text-muted)] hover:text-amber-500 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          <style>{`
            @keyframes scan-line {
              0% { top: 0%; opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { top: 100%; opacity: 0; }
            }
            .animate-scan-line {
              position: absolute;
              animation: scan-line 2.5s cubic-bezier(0.445, 0.05, 0.55, 0.95) infinite;
            }
            input[type='range']::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 18px;
              height: 18px;
              background: #f59e0b;
              border-radius: 50%;
              border: 3px solid #fff;
              box-shadow: 0 0 10px rgba(0,0,0,0.2);
            }
            #reader__dashboard_section_csr button {
              color: var(--text-main);
              background: var(--bg);
              border: 1px solid var(--border);
              border-radius: 8px;
              padding: 4px 12px;
              font-size: 12px;
            }
            video::-webkit-media-controls { 
              display:none !important; 
            }
            video::-webkit-media-controls-start-playback-button {
              display: none !important;
            }
            #reader video {
              object-fit: cover !important;
              width: 100% !important;
              height: 100% !important;
              background: black;
            }
          `}</style>

          {error && (
            <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold rounded-2xl flex items-center gap-3">
              <div className="w-6 h-6 bg-red-500/10 rounded-lg flex items-center justify-center shrink-0">
                <X className="w-4 h-4" />
              </div>
              {error}
            </div>
          )}
          
          <p className="mt-8 text-center text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em] leading-relaxed opacity-60">
            Secure local scanning • No data shared
          </p>
        </div>
      </div>
    </div>
  );
};
