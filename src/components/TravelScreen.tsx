import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, X, MapPin, Globe, Compass, Navigation, Trash2, Check } from 'lucide-react';
import { TravelModule, TravelDestination } from '../types';

interface TravelScreenProps {
  module: TravelModule;
  onSave: (m: TravelModule) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

// --- 3D Globe Canvas ---
const Globe3D: React.FC<{ destinations: TravelDestination[] }> = ({ destinations }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef({ x: 0.3, y: 0 });
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);
  const autoRotateRef = useRef(true);

  const latLngTo3D = (lat: number, lng: number, r: number, rx: number, ry: number) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const x0 = -r * Math.sin(phi) * Math.cos(theta);
    const y0 = r * Math.cos(phi);
    const z0 = r * Math.sin(phi) * Math.sin(theta);
    // Rotate Y
    const cosY = Math.cos(ry), sinY = Math.sin(ry);
    const x1 = x0 * cosY + z0 * sinY;
    const z1 = -x0 * sinY + z0 * cosY;
    // Rotate X
    const cosX = Math.cos(rx), sinX = Math.sin(rx);
    const y2 = y0 * cosX - z1 * sinX;
    const z2 = y0 * sinX + z1 * cosX;
    return { x: x1, y: y2, z: z2 };
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const r = Math.min(w, h) * 0.42;
    const rx = rotationRef.current.x, ry = rotationRef.current.y;

    ctx.clearRect(0, 0, w, h);

    // Globe background gradient
    const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.05, cx, cy, r);
    grad.addColorStop(0, '#1e3a5f');
    grad.addColorStop(0.4, '#0f2744');
    grad.addColorStop(1, '#060d1a');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Grid lines (lat/lng)
    ctx.strokeStyle = 'rgba(100,160,255,0.08)';
    ctx.lineWidth = 0.8;
    for (let lat = -80; lat <= 80; lat += 20) {
      ctx.beginPath();
      let first = true;
      for (let lng = -180; lng <= 180; lng += 3) {
        const p = latLngTo3D(lat, lng, r, rx, ry);
        if (p.z < 0) { first = true; continue; }
        const px = cx + p.x, py = cy - p.y;
        if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    for (let lng = -180; lng <= 180; lng += 30) {
      ctx.beginPath();
      let first = true;
      for (let lat = -90; lat <= 90; lat += 3) {
        const p = latLngTo3D(lat, lng, r, rx, ry);
        if (p.z < 0) { first = true; continue; }
        const px = cx + p.x, py = cy - p.y;
        if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Continents (simplified outlines as land dots)
    const landPoints: [number, number][] = [
      // Europe
      [51,10],[48,2],[44,12],[40,22],[36,14],[44,-8],[54,18],[60,25],[65,15],
      // Africa
      [0,20],[10,20],[-10,15],[-30,25],[5,38],[15,38],[30,30],
      // Asia
      [55,60],[40,70],[35,105],[25,120],[60,90],[70,100],[45,85],[30,70],
      // Americas
      [40,-100],[55,-95],[30,-90],[20,-80],[0,-65],[-15,-60],[-35,-65],[-50,-70],
      // Oceania
      [-25,135],[-35,148],[-20,120],[-10,130],
    ];

    landPoints.forEach(([lat, lng]) => {
      const p = latLngTo3D(lat, lng, r, rx, ry);
      if (p.z < 0) return;
      const px = cx + p.x, py = cy - p.y;
      const brightness = 0.4 + (p.z / r) * 0.6;
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(52,211,153,${brightness * 0.5})`;
      ctx.fill();
    });

    // Destinations markers
    destinations.forEach(dest => {
      const p = latLngTo3D(dest.lat, dest.lng, r, rx, ry);
      if (p.z < 0) return;
      const px = cx + p.x, py = cy - p.y;
      const isItinerary = dest.type === 'itinerary';
      const color = isItinerary ? '#f59e0b' : '#60a5fa';

      // Pulse ring
      const pulse = (Date.now() % 2000) / 2000;
      ctx.beginPath();
      ctx.arc(px, py, 6 + pulse * 10, 0, Math.PI * 2);
      ctx.strokeStyle = `${color}${Math.round((1 - pulse) * 80).toString(16).padStart(2,'0')}`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Dot
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Specular highlight
    const spec = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, 0, cx - r * 0.35, cy - r * 0.35, r * 0.7);
    spec.addColorStop(0, 'rgba(255,255,255,0.07)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = spec;
    ctx.fill();

    // Border glow
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(96,165,250,0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (autoRotateRef.current && !isDraggingRef.current) {
      rotationRef.current.y += 0.003;
    }
    animFrameRef.current = requestAnimationFrame(draw);
  }, [destinations]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={500}
      className="w-full h-full cursor-grab active:cursor-grabbing"
      style={{ maxWidth: '100%', maxHeight: '100%' }}
      onMouseDown={e => { isDraggingRef.current = true; autoRotateRef.current = false; lastPosRef.current = getPos(e); }}
      onMouseMove={e => {
        if (!isDraggingRef.current) return;
        const p = getPos(e);
        rotationRef.current.y += (p.x - lastPosRef.current.x) * 0.005;
        rotationRef.current.x += (p.y - lastPosRef.current.y) * 0.005;
        rotationRef.current.x = Math.max(-1.4, Math.min(1.4, rotationRef.current.x));
        lastPosRef.current = p;
      }}
      onMouseUp={() => { isDraggingRef.current = false; setTimeout(() => { autoRotateRef.current = true; }, 3000); }}
      onMouseLeave={() => { isDraggingRef.current = false; setTimeout(() => { autoRotateRef.current = true; }, 3000); }}
      onTouchStart={e => { isDraggingRef.current = true; autoRotateRef.current = false; lastPosRef.current = getPos(e); }}
      onTouchMove={e => {
        if (!isDraggingRef.current) return;
        const p = getPos(e);
        rotationRef.current.y += (p.x - lastPosRef.current.x) * 0.005;
        rotationRef.current.x += (p.y - lastPosRef.current.y) * 0.005;
        rotationRef.current.x = Math.max(-1.4, Math.min(1.4, rotationRef.current.x));
        lastPosRef.current = p;
      }}
      onTouchEnd={() => { isDraggingRef.current = false; setTimeout(() => { autoRotateRef.current = true; }, 3000); }}
    />
  );
};

// --- Add Destination Modal ---
const AddDestModal: React.FC<{
  onAdd: (d: Omit<TravelDestination, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}> = ({ onAdd, onClose }) => {
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [type, setType] = useState<'itinerary' | 'place'>('place');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Inserisci un nome'); return; }
    const la = parseFloat(lat), lo = parseFloat(lng);
    if (isNaN(la) || la < -90 || la > 90) { setError('Latitudine non valida (-90 a 90)'); return; }
    if (isNaN(lo) || lo < -180 || lo > 180) { setError('Longitudine non valida (-180 a 180)'); return; }
    onAdd({ name: name.trim(), lat: la, lng: lo, type, notes: notes.trim() || undefined });
    onClose();
  };

  const inputCls = 'w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-blue-400 transition-all text-sm font-semibold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/60';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="relative w-full max-w-md bg-[var(--card-bg)] rounded-[2rem] border border-[var(--border)] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-black text-white">Nuova Destinazione</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2 p-1 bg-[var(--bg)] rounded-2xl border border-[var(--border)]">
            {([['place', '📍', 'Luogo'], ['itinerary', '✈️', 'Itinerario']] as const).map(([v, emoji, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setType(v)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${type === v ? 'bg-[var(--card-bg)] shadow-sm text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}
              >
                <span>{emoji}</span> {label}
              </button>
            ))}
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Nome Luogo</label>
            <input value={name} onChange={e => { setName(e.target.value); setError(''); }} placeholder="Es. Roma, Eiffel Tower..." className={inputCls} autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Latitudine</label>
              <input value={lat} onChange={e => { setLat(e.target.value); setError(''); }} placeholder="Es. 41.9028" className={inputCls} inputMode="decimal" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Longitudine</label>
              <input value={lng} onChange={e => { setLng(e.target.value); setError(''); }} placeholder="Es. 12.4964" className={inputCls} inputMode="decimal" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Note (opzionale)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Descrizione, da fare, ricordi..." className={`${inputCls} resize-none h-20`} />
          </div>

          {error && (
            <p className="text-xs text-red-500 font-bold bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">{error}</p>
          )}

          <button type="submit" className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all">
            Aggiungi al Mappamondo
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

// --- Main TravelScreen ---
export const TravelScreen: React.FC<TravelScreenProps> = ({ module, onSave, onClose, onDelete }) => {
  const [destinations, setDestinations] = useState<TravelDestination[]>(module.destinations || []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = (d: Omit<TravelDestination, 'id' | 'createdAt'>) => {
    const newDest: TravelDestination = {
      ...d,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    const updated = [...destinations, newDest];
    setDestinations(updated);
    onSave({ ...module, destinations: updated });
  };

  const handleDelete = (id: string) => {
    const updated = destinations.filter(d => d.id !== id);
    setDestinations(updated);
    onSave({ ...module, destinations: updated });
    setDeletingId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col"
    >
      {/* Header */}
      <div className="bg-[var(--card-bg)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-variant)] rounded-xl transition-colors">
            <ArrowLeft className="w-6 h-6 text-[var(--text-main)]" />
          </button>
          <div>
            <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight leading-none">{module.title || 'I Miei Viaggi'}</h2>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">{destinations.length} destinazioni</p>
          </div>
        </div>
        {onDelete && (
          <button
            onClick={() => { if (window.confirm('Eliminare questo modulo viaggi?')) { onDelete(module.id); onClose(); } }}
            className="p-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Globe section */}
        <div className="relative flex items-center justify-center bg-[#060d1a] lg:flex-1 shrink-0" style={{ minHeight: '55vw', maxHeight: '55vh' }}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#0f2744_0%,_#060d1a_70%)]" />

          {/* Stars */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  width: Math.random() > 0.7 ? 2 : 1,
                  height: Math.random() > 0.7 ? 2 : 1,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.6 + 0.2
                }}
              />
            ))}
          </div>

          <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
            <Globe3D destinations={destinations} />
          </div>

          {/* Globe hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <Compass className="w-3 h-3 text-white/60" />
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Trascina per ruotare</span>
          </div>
        </div>

        {/* Destinations list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--bg)] pb-28 lg:pb-8 lg:max-w-sm lg:border-l border-[var(--border)]">
          <div className="p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-3 px-1">
              Le Tue Destinazioni
            </h3>

            {destinations.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                  <Navigation className="w-8 h-8 text-blue-400 opacity-60" />
                </div>
                <p className="text-sm font-bold text-[var(--text-muted)]">Nessuna destinazione</p>
                <p className="text-xs text-[var(--text-muted)] mt-1 opacity-70">Premi + per aggiungere un luogo</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {destinations.map(dest => (
                    <motion.div
                      key={dest.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 flex items-start gap-3 group"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${dest.type === 'itinerary' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                        {dest.type === 'itinerary' ? '✈️' : '📍'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text-main)] truncate">{dest.name}</p>
                        <p className="text-[10px] font-bold text-[var(--text-muted)] mt-0.5">
                          {dest.lat.toFixed(2)}, {dest.lng.toFixed(2)}
                        </p>
                        {dest.notes && (
                          <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{dest.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setDeletingId(dest.id)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAB */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[200] w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-[1.5rem] shadow-2xl shadow-blue-500/40 flex items-center justify-center border border-white/20"
      >
        <Plus className="w-8 h-8" />
      </motion.button>

      {/* Delete confirm */}
      <AnimatePresence>
        {deletingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setDeletingId(null)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-[var(--card-bg)] rounded-[2rem] p-8 w-full max-w-sm border border-[var(--border)] text-center shadow-2xl"
            >
              <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-lg font-black text-[var(--text-main)] mb-2">Elimina destinazione?</h3>
              <p className="text-sm text-[var(--text-muted)] mb-6">Questa azione è irreversibile.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingId(null)} className="flex-1 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-2xl font-bold text-[var(--text-muted)] text-sm">Annulla</button>
                <button onClick={() => handleDelete(deletingId)} className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-500/20">Elimina</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddDestModal onAdd={handleAdd} onClose={() => setShowAddModal(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
