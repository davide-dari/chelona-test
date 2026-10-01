import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Eraser, RotateCcw, Check } from 'lucide-react';

interface SignaturePadProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  height?: number;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ 
  value, 
  onChange, 
  height = 180 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const strokesHistoryRef = useRef<ImageData[]>([]);
  const lastEmittedRef = useRef<string | null>(null);
  const [hasInk, setHasInk] = useState(Boolean(value));

  // Configura stile tratto e coordinate DPR sul contesto
  const applyContextStyles = (ctx: CanvasRenderingContext2D, dpr: number) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#0F172A'; // Slate-900 per contrasto e leggibilità elevati
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  // Inizializza il canvas e supporta devicePixelRatio per rendering ultra nitido
  const setupCanvas = useCallback((initialSrc?: string | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 2;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      applyContextStyles(ctx, dpr);
    }

    const srcToLoad = initialSrc !== undefined ? initialSrc : value;
    if (srcToLoad) {
      const img = new Image();
      img.onload = () => {
        const ctx2 = canvas.getContext('2d');
        if (ctx2) {
          ctx2.drawImage(img, 0, 0, rect.width, rect.height);
          hasInkRef.current = true;
          setHasInk(true);
        }
      };
      img.src = srcToLoad;
    }
  }, [value]);

  // Montaggio iniziale e resize listener
  useEffect(() => {
    setupCanvas(value);

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // Se c'è inchiostro, salva l'immagine prima di riallocare il buffer
        const currentData = canvasRef.current && hasInkRef.current
          ? canvasRef.current.toDataURL('image/png')
          : null;
        setupCanvas(currentData);
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, []); // Run only once on mount

  // Sincronizzazione con cambi di `value` esterni (es. reset form o apertura da archivio)
  useEffect(() => {
    if (value === lastEmittedRef.current) {
      // Ignora aggiornamenti causati dall'evento pointerUp interno del canvas stesso
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!value) {
      // Valore azzerato dall'esterno
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasInkRef.current = false;
      strokesHistoryRef.current = [];
      setHasInk(false);
      lastEmittedRef.current = null;
    } else {
      // Valore caricato dall'esterno (es. riapertura da archivio)
      const rect = canvas.getBoundingClientRect();
      const img = new Image();
      img.onload = () => {
        const dpr = window.devicePixelRatio || 2;
        applyContextStyles(ctx, dpr);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        hasInkRef.current = true;
        setHasInk(true);
        lastEmittedRef.current = value;
      };
      img.src = value;
    }
  }, [value]);

  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Salva snapshot per undo
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      strokesHistoryRef.current.push(snap);
      if (strokesHistoryRef.current.length > 25) strokesHistoryRef.current.shift();
    } catch {}

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}

    drawingRef.current = true;
    hasInkRef.current = true;
    setHasInk(true);

    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (hasInkRef.current) {
      const dataUrl = canvas.toDataURL('image/png');
      lastEmittedRef.current = dataUrl;
      onChange(dataUrl);
    }
  };

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasInkRef.current = false;
      strokesHistoryRef.current = [];
      lastEmittedRef.current = null;
      setHasInk(false);
      onChange(null);
    }
  }, [onChange]);

  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const prevSnap = strokesHistoryRef.current.pop();
    if (prevSnap) {
      ctx.putImageData(prevSnap, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      lastEmittedRef.current = dataUrl;
      onChange(dataUrl);
    } else {
      handleClear();
    }
  }, [handleClear, onChange]);

  return (
    <div className="w-full select-none" ref={containerRef}>
      <div 
        className="relative bg-white dark:bg-slate-100 rounded-3xl border-2 border-dashed border-indigo-300 dark:border-indigo-400/50 shadow-inner overflow-hidden transition-all"
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none cursor-crosshair block"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {!hasInk && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none gap-1">
            <span className="text-xs font-bold uppercase tracking-wider">Traccia la tua firma qui</span>
            <span className="text-[11px] opacity-75">Usa il dito o una penna capacitiva</span>
          </div>
        )}

        {hasInk && (
          <div className="absolute top-2 right-2 bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 border border-emerald-500/20">
            <Check className="w-3 h-3" />
            <span>Firmato</span>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleUndo}
          disabled={!hasInk}
          className="px-3 py-1.5 rounded-xl bg-[var(--surface-variant)] hover:bg-[var(--border)] disabled:opacity-40 text-[var(--text-muted)] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Annulla tratto</span>
        </button>

        <button
          type="button"
          onClick={handleClear}
          disabled={!hasInk}
          className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Eraser className="w-3.5 h-3.5" />
          <span>Cancella firma</span>
        </button>
      </div>
    </div>
  );
};
