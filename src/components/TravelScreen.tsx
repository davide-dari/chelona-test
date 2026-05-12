import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, X, MapPin, Globe, Compass, Navigation, Trash2, Check, Loader2 } from 'lucide-react';
import ReactGlobe from 'react-globe.gl';
import { TravelModule, TravelDestination } from '../types';

interface TravelScreenProps {
  module: TravelModule;
  onSave: (m: TravelModule) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

// --- 3D Globe with react-globe.gl ---
const Globe3D: React.FC<{ destinations: TravelDestination[] }> = ({ destinations }) => {
  const globeEl = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', updateSize);
    // Timeout needed for container to fully layout
    setTimeout(updateSize, 100);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    // Auto-rotate
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
    }
  }, [dimensions.width]);

  return (
    <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center">
      {dimensions.width > 0 && (
        <ReactGlobe
          ref={globeEl}
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundColor="rgba(0,0,0,0)"
          labelsData={destinations}
          labelLat="lat"
          labelLng="lng"
          labelText="name"
          labelSize={1.5}
          labelDotRadius={0.5}
          labelColor={(d: any) => d.type === 'itinerary' ? '#f59e0b' : '#60a5fa'}
          labelResolution={2}
          ringsData={destinations}
          ringLat="lat"
          ringLng="lng"
          ringColor={(d: any) => d.type === 'itinerary' ? '#f59e0b' : '#60a5fa'}
          ringMaxRadius={3}
          ringPropagationSpeed={2}
          ringRepeatPeriod={1500}
        />
      )}
    </div>
  );
};

// --- Add Destination Modal ---
const AddDestModal: React.FC<{
  onAdd: (d: Omit<TravelDestination, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}> = ({ onAdd, onClose }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'itinerary' | 'place'>('place');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Inserisci un nome o una città'); return; }
    
    setLoading(true);
    setError('');
    
    try {
       const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name.trim())}`);
       const data = await res.json();
       if (data && data.length > 0) {
          const la = parseFloat(data[0].lat);
          const lo = parseFloat(data[0].lon);
          onAdd({ name: name.trim(), lat: la, lng: lo, type, notes: notes.trim() || undefined });
          onClose();
       } else {
          setError('Città non trovata. Riprova con un nome più preciso.');
       }
    } catch (err) {
       setError('Errore di connessione. Controlla internet e riprova.');
    } finally {
       setLoading(false);
    }
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
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Città / Nome Luogo</label>
            <input value={name} onChange={e => { setName(e.target.value); setError(''); }} placeholder="Es. Roma, Parigi, Tokyo..." className={inputCls} autoFocus disabled={loading} />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Note (opzionale)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Descrizione, da fare, ricordi..." className={`${inputCls} resize-none h-20`} disabled={loading} />
          </div>

          {error && (
            <p className="text-xs text-red-500 font-bold bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">{error}</p>
          )}

          <button disabled={loading} type="submit" className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 disabled:opacity-70 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Aggiungi al Mappamondo'}
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
