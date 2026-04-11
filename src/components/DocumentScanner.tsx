import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Camera, RefreshCw, Check, Zap, ZapOff, Home, ChevronRight, RotateCcw, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PDFDocument, degrees } from 'pdf-lib';

interface Point {
  x: number;
  y: number;
}

interface CornerPoints {
  topLeftCorner: Point;
  topRightCorner: Point;
  bottomRightCorner: Point;
  bottomLeftCorner: Point;
}

interface DocumentScannerProps {
  onCapture: (base64Pdf: string) => void;
  onClose: () => void;
  /** If true, 'Salva PDF' downloads the file to the device instead of calling onCapture */
  downloadOnly?: boolean;
}

export const DocumentScanner = ({ onCapture, onClose, downloadOnly = false }: DocumentScannerProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isDetected, setIsDetected] = useState(false);
  const [torch, setTorch] = useState(false);

  const [mode, setMode] = useState<'scanning' | 'editing' | 'preview'>('scanning');
  const [captureData, setCaptureData] = useState<{
    imageUrl: string;
    width: number;
    height: number;
    corners: CornerPoints;
  } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rawPreviewUrl, setRawPreviewUrl] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'original' | 'enhance' | 'bw' | 'document'>('original');
  const [rotation, setRotation] = useState(0);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scannerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectionRef = useRef({ lastDetected: false });
  const lastCornersRef = useRef<CornerPoints | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);

  useEffect(() => {
    let checkCount = 0;
    const checkLibs = setInterval(() => {
      const cv = (window as any).cv;
      const JScanify = (window as any).jscanify;

      if (cv && JScanify && (window as any).cvReady) {
        scannerRef.current = new JScanify();
        setIsReady(true);
        clearInterval(checkLibs);
      }

      checkCount++;
      if (checkCount > 20) clearInterval(checkLibs);
    }, 500);
    return () => clearInterval(checkLibs);
  }, []);

  // Detection runs OpenCV on a tiny canvas every ~100ms; rendering interpolates at 60fps
  const lastDetectTimeRef = useRef(0);
  const smoothCornersRef = useRef<{ x: number; y: number }[] | null>(null);
  const targetCornersRef = useRef<{ x: number; y: number }[] | null>(null);
  const detectCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

  const runDetection = useCallback(() => {
    if (!scannerRef.current || !videoRef.current || !canvasRef.current || isProcessing || mode !== 'scanning') {
      rafRef.current = requestAnimationFrame(runDetection);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(runDetection);
      return;
    }

    const displayWidth = video.offsetWidth;
    const displayHeight = video.offsetHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ── Run OpenCV detection max every 100ms on a tiny canvas ──
    const now = performance.now();
    if (now - lastDetectTimeRef.current > 100) {
      lastDetectTimeRef.current = now;
      try {
        const DETECT_W = 480;
        const dScale = DETECT_W / video.videoWidth;
        const DETECT_H = Math.round(video.videoHeight * dScale);
        const dc = detectCanvasRef.current;
        if (dc.width !== DETECT_W || dc.height !== DETECT_H) {
          dc.width = DETECT_W;
          dc.height = DETECT_H;
        }
        const dctx = dc.getContext('2d', { alpha: false })!;
        dctx.drawImage(video, 0, 0, DETECT_W, DETECT_H);

        const contour = scannerRef.current.findPaperContour(dc);
        if (contour) {
          const cp = scannerRef.current.getCornerPoints(contour);
          // Scale back to video pixel coords
          const s = 1 / dScale;
          lastCornersRef.current = {
            topLeftCorner:     { x: cp.topLeftCorner.x * s,     y: cp.topLeftCorner.y * s },
            topRightCorner:    { x: cp.topRightCorner.x * s,    y: cp.topRightCorner.y * s },
            bottomRightCorner: { x: cp.bottomRightCorner.x * s, y: cp.bottomRightCorner.y * s },
            bottomLeftCorner:  { x: cp.bottomLeftCorner.x * s,  y: cp.bottomLeftCorner.y * s },
          };
          lastDetectionTimeRef.current = Date.now();

          // Map to display coords
          const containerRatio = displayWidth / displayHeight;
          const videoRatio = video.videoWidth / video.videoHeight;
          let renderWidth = displayWidth, renderHeight = displayHeight, offsetX = 0, offsetY = 0;
          if (containerRatio > videoRatio) {
            renderHeight = displayWidth / videoRatio;
            offsetY = (displayHeight - renderHeight) / 2;
          } else {
            renderWidth = displayHeight * videoRatio;
            offsetX = (displayWidth - renderWidth) / 2;
          }
          const scale = renderWidth / video.videoWidth;

          targetCornersRef.current = [
            { x: lastCornersRef.current.topLeftCorner.x * scale + offsetX,     y: lastCornersRef.current.topLeftCorner.y * scale + offsetY },
            { x: lastCornersRef.current.topRightCorner.x * scale + offsetX,    y: lastCornersRef.current.topRightCorner.y * scale + offsetY },
            { x: lastCornersRef.current.bottomRightCorner.x * scale + offsetX, y: lastCornersRef.current.bottomRightCorner.y * scale + offsetY },
            { x: lastCornersRef.current.bottomLeftCorner.x * scale + offsetX,  y: lastCornersRef.current.bottomLeftCorner.y * scale + offsetY },
          ];

          if (!detectionRef.current.lastDetected) {
            detectionRef.current.lastDetected = true;
            setIsDetected(true);
          }
        } else {
          targetCornersRef.current = null;
          if (detectionRef.current.lastDetected) {
            detectionRef.current.lastDetected = false;
            setIsDetected(false);
          }
        }
      } catch (e) {}
    }

    // ── Smooth rendering at 60fps ──
    const target = targetCornersRef.current;
    if (target) {
      // Lerp smoothCorners toward target for fluid motion
      const lerp = 0.35;
      if (!smoothCornersRef.current) {
        smoothCornersRef.current = target.map(p => ({ ...p }));
      } else {
        for (let i = 0; i < 4; i++) {
          smoothCornersRef.current[i].x += (target[i].x - smoothCornersRef.current[i].x) * lerp;
          smoothCornersRef.current[i].y += (target[i].y - smoothCornersRef.current[i].y) * lerp;
        }
      }

      const points = smoothCornersRef.current;

      // Draw glowing polygon
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.closePath();

      ctx.shadowBlur = 15;
      ctx.shadowColor = '#fbbf24';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.shadowBlur = 0;
      ctx.fill();

      // Corner dots
      points.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    } else {
      smoothCornersRef.current = null;
    }

    rafRef.current = requestAnimationFrame(runDetection);
  }, [isProcessing, mode]);

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            rafRef.current = requestAnimationFrame(runDetection);
          };
        }
      } catch (err) {
        console.error('Camera error:', err);
        alert('Impossibile accedere alla fotocamera.');
        onClose();
      }
    };
    if (mode === 'scanning') start();
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [runDetection, onClose, mode]);

  const handleTapFocus = async (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    // Show focus ring at tap position
    setFocusPoint({ x: clientX - rect.left, y: clientY - rect.top });
    setTimeout(() => setFocusPoint(null), 1200);

    // Apply camera focus if supported
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
      const caps = (track as any).getCapabilities?.() || {};
      if (caps.focusMode && caps.pointOfInterest) {
        try {
          await (track as any).applyConstraints({
            advanced: [{ focusMode: 'manual', pointOfInterest: { x, y } }]
          });
        } catch {
          try {
            await (track as any).applyConstraints({
              advanced: [{ focusMode: 'single-shot', pointOfInterest: { x, y } }]
            });
          } catch { /* not supported */ }
        }
      }
    }
  };

  const handleCapture = async () => {
    if (!scannerRef.current || !videoRef.current || isProcessing) return;
    setIsProcessing(true);
    const video = videoRef.current;
    try {
      // ── 1. Grab full-res frame directly from video (fastest path) ──────────
      const fullW = video.videoWidth;
      const fullH = video.videoHeight;
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = fullW;
      frameCanvas.height = fullH;
      const fctx = frameCanvas.getContext('2d', { alpha: false })!;
      fctx.drawImage(video, 0, 0);

      // ── 2. Run OpenCV contour detection on a SMALL downscaled canvas ───────
      //    This is 8-10x faster than full-res detection
      const DETECT_W = 800;
      const detectScale = DETECT_W / fullW;
      const detectH = Math.round(fullH * detectScale);
      const detectCanvas = document.createElement('canvas');
      detectCanvas.width = DETECT_W;
      detectCanvas.height = detectH;
      const dctx = detectCanvas.getContext('2d', { alpha: false })!;
      dctx.drawImage(frameCanvas, 0, 0, DETECT_W, detectH);

      let corners: CornerPoints;
      let contour;
      try { contour = scannerRef.current.findPaperContour(detectCanvas); } catch (e) {}

      if (contour) {
        const raw = scannerRef.current.getCornerPoints(contour);
        // Scale corners back up to full-res coordinate space
        const s = 1 / detectScale;
        corners = {
          topLeftCorner:     { x: raw.topLeftCorner.x * s,     y: raw.topLeftCorner.y * s },
          topRightCorner:    { x: raw.topRightCorner.x * s,    y: raw.topRightCorner.y * s },
          bottomRightCorner: { x: raw.bottomRightCorner.x * s, y: raw.bottomRightCorner.y * s },
          bottomLeftCorner:  { x: raw.bottomLeftCorner.x * s,  y: raw.bottomLeftCorner.y * s },
        };
      } else {
        corners = {
          topLeftCorner:     { x: fullW * 0.05, y: fullH * 0.05 },
          topRightCorner:    { x: fullW * 0.95, y: fullH * 0.05 },
          bottomRightCorner: { x: fullW * 0.95, y: fullH * 0.95 },
          bottomLeftCorner:  { x: fullW * 0.05, y: fullH * 0.95 },
        };
      }

      setCaptureData({
        imageUrl: frameCanvas.toDataURL('image/jpeg', 0.95),
        width: fullW,
        height: fullH,
        corners,
      });
      setRotation(0);
      setActiveFilter('original');
      setMode('editing');
      setIsProcessing(false);
    } catch (err) {
      console.error(err);
      alert('Errore durante la cattura.');
      setIsProcessing(false);
    }
  };

  // ─── Image filter helper ─────────────────────────────────────────────────
  const applyFilterToDataUrl = (dataUrl: string, filter: typeof activeFilter): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        if (filter === 'original') return resolve(dataUrl);

        const id = ctx.getImageData(0, 0, c.width, c.height);
        const d = id.data;

        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];

          if (filter === 'bw') {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            const val = gray > 128 ? 255 : 0;
            d[i] = d[i + 1] = d[i + 2] = val;
          } else if (filter === 'enhance') {
            // Boost contrast aggressively
            const factor = 2.2;
            d[i]     = Math.min(255, Math.max(0, factor * (r - 128) + 128));
            d[i + 1] = Math.min(255, Math.max(0, factor * (g - 128) + 128));
            d[i + 2] = Math.min(255, Math.max(0, factor * (b - 128) + 128));
          } else if (filter === 'document') {
            // Grayscale + strong threshold + warm white
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            if (gray > 160) {
              d[i] = 255; d[i + 1] = 252; d[i + 2] = 245; // warm white
            } else if (gray > 90) {
              const v = Math.round(gray * 0.6);
              d[i] = d[i + 1] = d[i + 2] = v;
            } else {
              d[i] = 20; d[i + 1] = 18; d[i + 2] = 15; // deep black
            }
          }
        }
        ctx.putImageData(id, 0, 0);
        resolve(c.toDataURL('image/jpeg', 0.95));
      };
      img.src = dataUrl;
    });
  const imageToPdf = async (dataUrl: string, rotationAngle: number = 0): Promise<string | null> => {
    try {
      const base64Content = dataUrl.split(',')[1];
      const binaryString = window.atob(base64Content);
      const buffer = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        buffer[i] = binaryString.charCodeAt(i);
      }

      const pdfDoc = await PDFDocument.create();
      const img = await pdfDoc.embedJpg(buffer);
      
      const is90or270 = (rotationAngle / 90) % 2 !== 0;
      const pageWidth = is90or270 ? img.height : img.width;
      const pageHeight = is90or270 ? img.width : img.height;
      
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      
      page.drawImage(img, {
        x: rotationAngle === 90 ? pageWidth : (rotationAngle === 180 ? pageWidth : (rotationAngle === 270 ? 0 : 0)),
        y: rotationAngle === 90 ? 0 : (rotationAngle === 180 ? pageHeight : (rotationAngle === 270 ? pageHeight : 0)),
        width: img.width,
        height: img.height,
        rotate: degrees(rotationAngle)
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes] as any[], { type: 'application/pdf' });
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) { 
      console.error("PDF Generation Error:", e);
      return null; 
    }
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        await (track as any).applyConstraints({ advanced: [{ torch: !torch }] });
        setTorch(!torch);
      } catch (e) { }
    }
  };

  const CornerEditor = ({ data }: { data: NonNullable<typeof captureData> }) => {
    const [points, setPoints] = useState(data.corners);
    const containerRef = useRef<HTMLDivElement>(null);
    const [bounds, setBounds] = useState({ w: 0, h: 0 });

    useEffect(() => {
      const updateBounds = () => {
        if (containerRef.current) {
          setBounds({ w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight });
        }
      };
      updateBounds();
      window.addEventListener('resize', updateBounds);
      return () => window.removeEventListener('resize', updateBounds);
    }, []);

    const imgRatio = data.width / data.height;
    const containerRatio = bounds.w > 0 && bounds.h > 0 ? bounds.w / bounds.h : 1;

    let renderWidth = bounds.w;
    let renderHeight = bounds.h;
    let offsetX = 0;
    let offsetY = 0;

    if (containerRatio > imgRatio) {
      renderWidth = bounds.h * imgRatio;
      offsetX = (bounds.w - renderWidth) / 2;
    } else {
      renderHeight = bounds.w / imgRatio;
      offsetY = (bounds.h - renderHeight) / 2;
    }

    const scale = bounds.w > 0 ? renderWidth / data.width : 1;

    const handleConfirm = async () => {
      setIsProcessing(true);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const m = new Image();
          m.onload = () => resolve(m);
          m.onerror = (err) => reject(err);
          m.src = data.imageUrl;
        });

        const finalCanvas = scannerRef.current.extractPaper(img, 1240, 1754, points);
        if (!finalCanvas) throw new Error("Could not extract paper from image");

        // ── Adaptive local normalization (eliminates wrinkles + flattens doc) ─
        // Sample a grid of bright-reference values then normalize each pixel
        // relative to its local estimated illumination.
        const W = finalCanvas.width;
        const H = finalCanvas.height;
        const scanCtx = finalCanvas.getContext('2d')!;
        const scanId = scanCtx.getImageData(0, 0, W, H);
        const sd = scanId.data;

        // Pass 1: build a coarse luminance map (1 sample per 32×32 block)
        const BLK = 32;
        const cols = Math.ceil(W / BLK);
        const rows = Math.ceil(H / BLK);
        const localMax = new Float32Array(cols * rows);
        for (let by = 0; by < rows; by++) {
          for (let bx = 0; bx < cols; bx++) {
            let maxL = 0;
            const x0 = bx * BLK, y0 = by * BLK;
            const x1 = Math.min(x0 + BLK, W), y1 = Math.min(y0 + BLK, H);
            for (let y = y0; y < y1; y++) {
              for (let x = x0; x < x1; x++) {
                const i = (y * W + x) * 4;
                const l = 0.299 * sd[i] + 0.587 * sd[i+1] + 0.114 * sd[i+2];
                if (l > maxL) maxL = l;
              }
            }
            localMax[by * cols + bx] = maxL || 255;
          }
        }

        // Pass 2: normalize each pixel → eliminate shadows from wrinkles
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4;
            const bx = Math.min(Math.floor(x / BLK), cols - 1);
            const by = Math.min(Math.floor(y / BLK), rows - 1);
            const ref = localMax[by * cols + bx];
            const lum = 0.299 * sd[i] + 0.587 * sd[i+1] + 0.114 * sd[i+2];
            // Normalized luminance: brings all local whites to 1.0
            const norm = Math.min(1, lum / ref);

            // Map to scanner-style output curve
            let out: number;
            if (norm > 0.82) {
              // Paper white zone
              out = 253;
              sd[i] = 253; sd[i+1] = 251; sd[i+2] = 247;
              continue;
            } else if (norm > 0.5) {
              // Mid-tone: push toward white (wrinkle shadows)
              const t = (norm - 0.5) / 0.32;
              out = Math.round(160 + t * 90);
              sd[i] = sd[i+1] = sd[i+2] = out;
            } else if (norm > 0.22) {
              // Text and lines zone
              out = Math.round(norm * 100);
              sd[i] = sd[i+1] = sd[i+2] = out;
            } else {
              // Deep black
              sd[i] = sd[i+1] = sd[i+2] = 10;
            }
          }
        }
        scanCtx.putImageData(scanId, 0, 0);
        // ─────────────────────────────────────────────────────────────────────

        const raw = finalCanvas.toDataURL('image/jpeg', 0.97);
        setRawPreviewUrl(raw);
        const filtered = await applyFilterToDataUrl(raw, activeFilter);
        setPreviewUrl(filtered);
        setMode('preview');
        setIsProcessing(false);
      } catch (e) {
        console.error("Scanner Preview Error:", e);
        alert("Errore generazione anteprima.");
        setIsProcessing(false);
      }
    };

    const renderHandle = (key: keyof CornerPoints) => {
      const p = points[key];
      return (
        <motion.div
          onPan={(_, info) => {
            setPoints(prev => {
              const currentP = prev[key];
              const newX = Math.max(0, Math.min(data.width, currentP.x + (info.delta.x / scale)));
              const newY = Math.max(0, Math.min(data.height, currentP.y + (info.delta.y / scale)));
              return { ...prev, [key]: { x: newX, y: newY } };
            });
          }}
          style={{
            left: p.x * scale + offsetX,
            top: p.y * scale + offsetY,
            position: 'absolute',
            x: '-50%',
            y: '-50%'
          }}
          className="w-12 h-12 flex items-center justify-center z-10 touch-none cursor-move"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center">
            <div className="w-6 h-6 bg-cyan-500 rounded-full border-2 border-white shadow-lg shadow-cyan-500/50" />
          </div>
        </motion.div>
      );
    };

    return (
      <div className="fixed inset-0 z-[320] bg-black flex flex-col">
        <div className="flex items-center justify-between px-6 py-8 bg-black/80 backdrop-blur-xl border-b border-white/10" translate="no">
          <button onClick={() => setMode('scanning')} className="flex items-center gap-2 text-white/50 font-bold uppercase text-xs">
            <RotateCcw className="w-4 h-4" /> Indietro
          </button>
          <span className="text-white font-black text-xs tracking-widest uppercase">Scanner Documenti</span>
          <button onClick={handleConfirm} className="flex items-center gap-2 text-amber-500 font-black uppercase text-xs">
            Avanti <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div ref={containerRef} className="flex-1 relative overflow-hidden bg-black">
          <img src={data.imageUrl} className="w-full h-full object-contain" alt="captured" />

          {bounds.w > 0 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <polygon
                points={`
                  ${points.topLeftCorner.x * scale + offsetX},${points.topLeftCorner.y * scale + offsetY} 
                  ${points.topRightCorner.x * scale + offsetX},${points.topRightCorner.y * scale + offsetY} 
                  ${points.bottomRightCorner.x * scale + offsetX},${points.bottomRightCorner.y * scale + offsetY} 
                  ${points.bottomLeftCorner.x * scale + offsetX},${points.bottomLeftCorner.y * scale + offsetY}
                `}
                className="fill-amber-500/10 stroke-amber-500 stroke-[3px]"
              />
            </svg>
          )}

          {bounds.w > 0 && (
            <>
              {renderHandle('topLeftCorner')}
              {renderHandle('topRightCorner')}
              {renderHandle('bottomRightCorner')}
              {renderHandle('bottomLeftCorner')}
            </>
          )}
        </div>

        <div className="p-8 bg-black/95 text-center">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
            Trascina i cerchi azzurri per farli coincidere con gli angoli del foglio.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col font-sans overflow-hidden select-none">
      {/* Top Bar - Minimalist */}
      <div className="absolute top-0 left-0 right-0 z-[310] flex items-center justify-between px-6 py-8">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md transition-all active:scale-95 text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <button
          onClick={toggleTorch}
          className="w-10 h-10 flex items-center justify-center bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md transition-all active:scale-95 text-white"
        >
          {torch ? <Zap className="w-5 h-5 text-amber-400 fill-amber-400" /> : <ZapOff className="w-5 h-5 text-white/50" />}
        </button>
      </div>

      {mode === 'scanning' ? (
        <div
          className="flex-1 relative bg-black"
          onClick={handleTapFocus}
          onTouchStart={handleTapFocus}
        >
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

          {/* Tap-to-focus ring */}
          <AnimatePresence>
            {focusPoint && (
              <motion.div
                key={`${focusPoint.x}-${focusPoint.y}`}
                initial={{ opacity: 1, scale: 1.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.25 }}
                style={{ left: focusPoint.x, top: focusPoint.y, translateX: '-50%', translateY: '-50%' }}
                className="absolute w-16 h-16 pointer-events-none"
              >
                <div className="w-full h-full rounded-full border-2 border-amber-400" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-4 bg-amber-400" style={{ position: 'absolute' }} />
                  <div className="w-4 h-1 bg-amber-400" style={{ position: 'absolute' }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
            <div className="w-full h-full relative">
              {/* Viewfinder Corners */}
              <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-xl transition-colors duration-300 ${isDetected ? 'border-amber-400' : 'border-white/20'}`} />
              <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-xl transition-colors duration-300 ${isDetected ? 'border-amber-400' : 'border-white/20'}`} />
              <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-xl transition-colors duration-300 ${isDetected ? 'border-amber-400' : 'border-white/20'}`} />
              <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-xl transition-colors duration-300 ${isDetected ? 'border-amber-400' : 'border-white/20'}`} />
            </div>
          </div>
        </div>
      ) : mode === 'editing' ? (
        captureData && <CornerEditor data={captureData} />
      ) : (
        <div className="flex-1 relative bg-black flex flex-col pt-28 px-4 pb-0">
           {/* Filter Chips */}
           <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
             {([
               { id: 'original', label: 'Originale' },
               { id: 'enhance',  label: 'Nitidezza' },
               { id: 'bw',       label: 'B&N' },
               { id: 'document', label: 'Documento' },
             ] as const).map(f => (
               <button
                 key={f.id}
                 onClick={async () => {
                   if (!rawPreviewUrl) return;
                   setActiveFilter(f.id);
                   const filtered = await applyFilterToDataUrl(rawPreviewUrl, f.id);
                   setPreviewUrl(filtered);
                 }}
                 className={`shrink-0 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${
                   activeFilter === f.id
                     ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/30'
                     : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                 }`}
               >
                 {f.label}
               </button>
             ))}
           </div>

           <div className="flex-1 relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-zinc-900 flex items-center justify-center transition-all duration-500">
              {previewUrl ? (
                <motion.img 
                  animate={{ rotate: rotation }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  src={previewUrl} 
                  className="max-w-full max-h-full object-contain" 
                  alt="Preview" 
                />
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Generazione Anteprima...</p>
                </div>
              )}
           </div>

           {/* Action Bar */}
           <div className="flex gap-3 py-4">
              <button 
                onClick={() => setMode('editing')}
                className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all active:scale-95 text-white/70"
              >
                <RotateCcw className="w-5 h-5" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Modifica</span>
              </button>
              
              <button 
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 transition-all active:scale-95 text-white"
              >
                <RotateCw className="w-5 h-5" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Ruota</span>
              </button>

              <button 
                onClick={async () => {
                  if (!previewUrl || isProcessing) return;
                  setIsProcessing(true);
                  const pdf = await imageToPdf(previewUrl, rotation);
                  if (pdf) {
                    if (downloadOnly) {
                      const base64 = pdf.split(',')[1];
                      const binary = atob(base64);
                      const bytes = new Uint8Array(binary.length);
                      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                      const blob = new Blob([bytes], { type: 'application/pdf' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `scansione_${Date.now()}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      onClose();
                    } else {
                      onCapture(pdf);
                    }
                  } else {
                    alert("Errore generazione PDF.");
                    setIsProcessing(false);
                  }
                }}
                disabled={!previewUrl || isProcessing}
                className="flex-[2] flex flex-col items-center justify-center gap-1.5 py-3 bg-amber-500 hover:bg-amber-600 rounded-2xl shadow-lg shadow-amber-500/30 transition-all active:scale-95 text-white disabled:opacity-50"
              >
                {isProcessing
                  ? <RefreshCw className="w-5 h-5 animate-spin" />
                  : <Check className="w-5 h-5" />
                }
                <span className="text-[9px] font-black uppercase tracking-wider">
                  {isProcessing ? 'Attendi...' : (downloadOnly ? 'Scarica PDF' : 'Salva PDF')}
                </span>
              </button>
           </div>
        </div>
      )}

      {mode === 'scanning' && (
        <div className="h-48 bg-black flex items-center justify-center relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />

          {/* Shutter Button — centered only */}
          <button
            onClick={handleCapture}
            disabled={!isReady || isProcessing}
            className={`relative w-20 h-20 flex items-center justify-center transition-all duration-300 ${isProcessing ? 'opacity-50' : 'opacity-100'} active:scale-90`}
          >
            <div className="absolute inset-0 rounded-full border-[3px] border-white" />
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center transition-transform group-active:scale-95" />
          </button>
        </div>
      )}


    </div>
  );
};
