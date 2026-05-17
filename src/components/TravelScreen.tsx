import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, X, MapPin, Globe, Compass, Navigation, Trash2, Check, Loader2, Pencil } from 'lucide-react';
import ReactGlobe from 'react-globe.gl';
import { TravelModule, TravelDestination, TravelCountryGroup } from '../types';

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
      globeEl.current.pointOfView({ altitude: 1.5 });
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

// --- Automatic Country Flag Emoji Guesser ---
const getCountryEmoji = (name: string): string => {
  const normalized = name.toLowerCase().trim();
  const maps: Record<string, string> = {
    'italia': '🇮🇹', 'italy': '🇮🇹',
    'francia': '🇫🇷', 'france': '🇫🇷',
    'spagna': '🇪🇸', 'spain': '🇪🇸',
    'germania': '🇩🇪', 'germany': '🇩🇪',
    'regno unito': '🇬🇧', 'uk': '🇬🇧', 'england': '🇬🇧',
    'stati uniti': '🇺🇸', 'usa': '🇺🇸', 'america': '🇺🇸',
    'giappone': '🇯🇵', 'japan': '🇯🇵',
    'cina': '🇨🇳', 'china': '🇨🇳',
    'grecia': '🇬🇷', 'greece': '🇬🇷',
    'portogallo': '🇵🇹', 'portugal': '🇵🇹',
    'svizzera': '🇨🇭', 'switzerland': '🇨🇭',
    'austria': '🇦🇹',
    'paesi bassi': '🇳🇱', 'holland': '🇳🇱', 'netherlands': '🇳🇱',
    'egitto': '🇪🇬', 'egypt': '🇪🇬',
    'marocco': '🇲🇦', 'morocco': '🇲🇦',
    'brasile': '🇧🇷', 'brazil': '🇧🇷',
    'messico': '🇲🇽', 'mexico': '🇲🇽',
    'canada': '🇨🇦',
    'australia': '🇦🇺',
    'india': '🇮🇳',
    'thailandia': '🇹🇭', 'thailand': '🇹🇭',
    'vietnam': '🇻🇳',
    'indonesia': '🇮🇩',
    'sudafrica': '🇿🇦', 'south africa': '🇿🇦',
    'croazia': '🇭🇷', 'croatia': '🇭🇷',
    'turchia': '🇹🇷', 'turkey': '🇹🇷'
  };
  
  if (maps[normalized]) return maps[normalized];
  const found = Object.keys(maps).find(key => normalized.includes(key));
  if (found) return maps[found];
  return '🗺️';
};

// --- Add/Edit Country Group Modal ---
const GroupModal: React.FC<{
  onSubmit: (name: string, emoji: string) => void;
  onClose: () => void;
  initial?: TravelCountryGroup;
}> = ({ onSubmit, onClose, initial }) => {
  const [name, setName] = useState(initial?.countryName || '');
  const [emoji, setEmoji] = useState(initial?.emoji || '');
  const isEdit = !!initial;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const finalEmoji = emoji.trim() || getCountryEmoji(name);
    onSubmit(name.trim(), finalEmoji);
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
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white">
              🗺️
            </div>
            <h3 className="text-lg font-black text-white">{isEdit ? 'Modifica Paese' : 'Nuova Cartella Paese'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Nome Paese</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Es. Giappone, Italia, Spagna..." className={inputCls} autoFocus />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Emoji Bandiera / Icona (opzionale)</label>
            <input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="Lascia vuoto per rilevamento automatico" className={inputCls} />
          </div>

          <button type="submit" disabled={!name.trim()} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 disabled:opacity-50 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            {isEdit ? 'Salva Modifiche' : 'Crea Cartella'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

// --- Add/Edit Destination Modal ---
const DestModal: React.FC<{
  onSubmit: (d: Omit<TravelDestination, 'id' | 'createdAt'>) => void;
  onClose: () => void;
  initial?: TravelDestination;
  countryGroups: TravelCountryGroup[];
  defaultGroupId?: string | null;
  defaultType?: 'place' | 'itinerary';
}> = ({ onSubmit, onClose, initial, countryGroups, defaultGroupId, defaultType }) => {
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState<'itinerary' | 'place'>(initial?.type || defaultType || 'place');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [countryGroupId, setCountryGroupId] = useState<string>(initial?.countryGroupId || defaultGroupId || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isEdit = !!initial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Inserisci un nome o una città'); return; }
    
    setLoading(true);
    setError('');
    
    const finalGroupId = countryGroupId || undefined;

    // If editing and name hasn't changed, reuse existing coords
    if (isEdit && name.trim() === initial!.name) {
      onSubmit({ name: name.trim(), lat: initial!.lat, lng: initial!.lng, type, notes: notes.trim() || undefined, countryGroupId: finalGroupId });
      onClose();
      return;
    }

    try {
       const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name.trim())}`);
       const data = await res.json();
       if (data && data.length > 0) {
          const la = parseFloat(data[0].lat);
          const lo = parseFloat(data[0].lon);
          onSubmit({ name: name.trim(), lat: la, lng: lo, type, notes: notes.trim() || undefined, countryGroupId: finalGroupId });
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
              {isEdit ? <Pencil className="w-5 h-5 text-white" /> : <Globe className="w-5 h-5 text-white" />}
            </div>
            <h3 className="text-lg font-black text-white">{isEdit ? 'Modifica Destinazione' : 'Nuova Destinazione'}</h3>
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
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
              {type === 'place' ? 'Nome Luogo' : 'Nome Itinerario'}
            </label>
            <input 
              value={name} 
              onChange={e => { setName(e.target.value); setError(''); }} 
              placeholder={type === 'place' ? "Es. Colosseo, Tour Eiffel, Monte Fuji..." : "Es. Tour del Giappone, Weekend a Parigi..."} 
              className={inputCls} 
              autoFocus 
              disabled={loading} 
            />
          </div>

          {countryGroups.length > 0 && (
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Paese</label>
              <select 
                value={countryGroupId} 
                onChange={e => setCountryGroupId(e.target.value)} 
                className={inputCls}
                disabled={loading}
              >
                <option value="">Nessun Paese (Libero)</option>
                {countryGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.emoji} {g.countryName}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Note (opzionale)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Descrizione, da fare, ricordi..." className={`${inputCls} resize-none h-20`} disabled={loading} />
          </div>

          {error && (
            <p className="text-xs text-red-500 font-bold bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">{error}</p>
          )}

          <button disabled={loading} type="submit" className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 disabled:opacity-70 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isEdit ? 'Salva Modifiche' : 'Aggiungi al Mappamondo'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

// --- Main TravelScreen ---
export const TravelScreen: React.FC<TravelScreenProps> = ({ module, onSave, onClose }) => {
  const [destinations, setDestinations] = useState<TravelDestination[]>(module.destinations || []);
  const [countryGroups, setCountryGroups] = useState<TravelCountryGroup[]>(module.countryGroups || []);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [destModalType, setDestModalType] = useState<'place' | 'itinerary'>('place');
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingDest, setEditingDest] = useState<TravelDestination | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [expandedDestId, setExpandedDestId] = useState<string | null>(null);

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

  const handleEdit = (d: Omit<TravelDestination, 'id' | 'createdAt'>) => {
    if (!editingDest) return;
    const updated = destinations.map(dest => 
      dest.id === editingDest.id 
        ? { ...dest, ...d }
        : dest
    );
    setDestinations(updated);
    onSave({ ...module, destinations: updated });
    setEditingDest(null);
  };

  const handleDelete = (id: string) => {
    const updated = destinations.filter(d => d.id !== id);
    setDestinations(updated);
    onSave({ ...module, destinations: updated });
    setDeletingId(null);
  };

  const handleAddGroup = (name: string, emoji: string) => {
    const newGroup: TravelCountryGroup = {
      id: Math.random().toString(36).substr(2, 9),
      countryName: name,
      emoji,
      createdAt: new Date().toISOString()
    };
    const updatedGroups = [...countryGroups, newGroup];
    setCountryGroups(updatedGroups);
    onSave({ ...module, countryGroups: updatedGroups });
    setSelectedGroupId(newGroup.id); // Auto-select new folder
  };

  const handleDeleteGroup = (groupId: string) => {
    const updatedGroups = countryGroups.filter(g => g.id !== groupId);
    setCountryGroups(updatedGroups);

    // Keep destinations by moving them to Uncategorized (no folder)
    const updatedDests = destinations.map(d => 
      d.countryGroupId === groupId 
        ? { ...d, countryGroupId: undefined }
        : d
    );
    setDestinations(updatedDests);
    
    onSave({ 
      ...module, 
      countryGroups: updatedGroups, 
      destinations: updatedDests 
    });

    if (selectedGroupId === groupId) {
      setSelectedGroupId(null);
    }
    setDeletingGroupId(null);
  };

  const handleEditGroup = (name: string, emoji: string) => {
    if (!editingGroupId) return;
    const updatedGroups = countryGroups.map(g => 
      g.id === editingGroupId 
        ? { ...g, countryName: name, emoji }
        : g
    );
    setCountryGroups(updatedGroups);
    onSave({ ...module, countryGroups: updatedGroups });
    setEditingGroupId(null);
  };

  // Dynamically filter destinations based on selected country folder
  const filteredDestinations = selectedGroupId
    ? destinations.filter(d => d.countryGroupId === selectedGroupId)
    : destinations;

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
            <h2 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight leading-none">Viaggi</h2>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">
              {destinations.length} destinazioni {countryGroups.length > 0 && `· ${countryGroups.length} paesi`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Globe section - dynamically filtered! */}
        <div className="relative flex items-center justify-center bg-[#060d1a] lg:flex-1 shrink-0" style={{ minHeight: '70vw', maxHeight: '70vh' }}>
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

          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <Globe3D destinations={filteredDestinations} />
          </div>
        </div>

        {/* Destinations list panel */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--bg)] pb-28 lg:pb-8 lg:max-w-sm lg:border-l border-[var(--border)]">
          <div className="p-4 space-y-4">
            
            {/* Country Folders Horizontal Bar */}
            <div className="px-1 pt-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Paesi / Gruppi</span>
                <div className="flex items-center gap-1.5">
                  {selectedGroupId && (
                    <>
                      <button 
                        onClick={() => setEditingGroupId(selectedGroupId)}
                        className="text-[10px] font-black uppercase tracking-widest text-amber-500 hover:text-amber-600 transition-colors flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg"
                        title="Modifica Nome/Emoji del Paese"
                      >
                        <Pencil className="w-3 h-3" /> Modifica
                      </button>
                      <button 
                        onClick={() => setDeletingGroupId(selectedGroupId)}
                        className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1 bg-rose-500/10 px-2 py-1 rounded-lg"
                        title="Elimina Paese"
                      >
                        <Trash2 className="w-3 h-3" /> Elimina
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => setShowAddGroupModal(true)}
                    className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded-lg"
                  >
                    <Plus className="w-3 h-3" /> Nuovo
                  </button>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x">
                <button
                  onClick={() => setSelectedGroupId(null)}
                  className={`px-4 py-2.5 rounded-2xl font-bold text-xs shrink-0 transition-all snap-start flex items-center gap-2 border ${selectedGroupId === null ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-variant)]'}`}
                >
                  <span>🌐</span> Tutte le mete ({destinations.length})
                </button>
                
                {countryGroups.map(g => {
                  const count = destinations.filter(d => d.countryGroupId === g.id).length;
                  const isSelected = selectedGroupId === g.id;
                  return (
                    <div key={g.id} className="relative shrink-0 snap-start group/folder">
                      <button
                        onClick={() => setSelectedGroupId(g.id)}
                        className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 border ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-variant)]'}`}
                      >
                        <span>{g.emoji}</span>
                        <span>{g.countryName}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-[var(--surface-variant)] text-[var(--text-muted)]'}`}>{count}</span>
                      </button>
                      
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeletingGroupId(g.id); }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/folder:opacity-100 transition-all shadow-md z-20"
                        title="Elimina Paese"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-[var(--border)]" />

            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-3 px-1">
                {selectedGroupId 
                  ? `${countryGroups.find(g => g.id === selectedGroupId)?.emoji} Luoghi da Vedere`
                  : 'Tutte le Destinazioni'
                }
              </h3>

              {filteredDestinations.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                    <Navigation className="w-8 h-8 text-blue-400 opacity-60" />
                  </div>
                  <p className="text-sm font-bold text-[var(--text-muted)]">Nessuna meta</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 opacity-70">
                    Premi + per aggiungere un luogo {selectedGroupId && 'in questa cartella'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {filteredDestinations.map(dest => (
                      <motion.div
                        key={dest.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden group cursor-pointer transition-all hover:border-blue-500/20"
                        onClick={(e) => {
                           if ((e.target as HTMLElement).closest('button')) return;
                           setExpandedDestId(prev => prev === dest.id ? null : dest.id);
                        }}
                      >
                        <div className="p-4 flex items-start gap-3 hover:bg-[var(--surface-variant)] transition-colors">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${dest.type === 'itinerary' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                            {dest.type === 'itinerary' ? '✈️' : '📍'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[var(--text-main)] truncate">{dest.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-[10px] font-bold text-[var(--text-muted)]">
                                {dest.lat.toFixed(2)}, {dest.lng.toFixed(2)}
                              </p>
                              {dest.countryGroupId && (
                                <>
                                  <span className="text-[8px] opacity-40">•</span>
                                  <span className="text-[9px] font-black text-blue-500 bg-blue-500/5 px-1.5 py-0.5 rounded-md">
                                    {countryGroups.find(g => g.id === dest.countryGroupId)?.emoji} {countryGroups.find(g => g.id === dest.countryGroupId)?.countryName}
                                  </span>
                                </>
                              )}
                            </div>
                            {dest.notes && (
                              <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{dest.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingDest(dest); }}
                              className="p-1.5 text-[var(--text-muted)] hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeletingId(dest.id); }}
                              className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {expandedDestId === dest.id && (
                             <motion.div
                               initial={{ height: 0, opacity: 0 }}
                               animate={{ height: 'auto', opacity: 1 }}
                               exit={{ height: 0, opacity: 0 }}
                               className="overflow-hidden bg-[var(--surface-variant)]"
                             >
                                <div className="p-4 pt-0">
                                   <div 
                                      className="w-full h-32 rounded-xl overflow-hidden relative cursor-pointer border border-[var(--border)] shadow-inner group/map"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const countryObj = countryGroups.find(g => g.id === dest.countryGroupId);
                                        const queryParts = [dest.name];
                                        if (countryObj) {
                                          queryParts.push(countryObj.countryName);
                                        }
                                        const mapsQuery = encodeURIComponent(queryParts.join(', '));
                                        window.open(`https://maps.google.com/?q=${mapsQuery}`, '_system');
                                      }}
                                   >
                                      <iframe
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0, pointerEvents: 'none' }}
                                        loading="lazy"
                                        src={`https://maps.google.com/maps?q=${dest.lat},${dest.lng}&z=14&output=embed`}
                                      />
                                      <div className="absolute inset-0 bg-black/5 hover:bg-transparent transition-colors flex items-center justify-center group-hover/map:bg-black/10">
                                         <div className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover/map:opacity-100 transition-opacity shadow-lg">
                                            <MapPin className="w-5 h-5 text-blue-500" />
                                         </div>
                                      </div>
                                   </div>
                                </div>
                             </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FAB Menu & Button */}
      <div className="fixed bottom-24 right-6 md:bottom-10 md:right-10 z-[200] flex flex-col items-end gap-3">
        <AnimatePresence>
          {showFabMenu && (
            <>
              {/* Tap to close backdrop */}
              <div className="fixed inset-0 z-[-1]" onClick={() => setShowFabMenu(false)} />
              
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.9 }}
                className="flex flex-col items-end gap-2 mb-2"
              >
                {/* Option 1: Paese */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowAddGroupModal(true);
                    setShowFabMenu(false);
                  }}
                  className="flex items-center gap-2.5 px-4 py-3 bg-[var(--card-bg)] hover:bg-[var(--surface-variant)] text-[var(--text-main)] rounded-2xl shadow-xl border border-[var(--border)] font-bold text-xs uppercase tracking-wider transition-all"
                >
                  <span>🗺️</span> Nuovo Paese
                </motion.button>

                {/* Option 2: Luogo */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setDestModalType('place');
                    setShowAddModal(true);
                    setShowFabMenu(false);
                  }}
                  className="flex items-center gap-2.5 px-4 py-3 bg-[var(--card-bg)] hover:bg-[var(--surface-variant)] text-[var(--text-main)] rounded-2xl shadow-xl border border-[var(--border)] font-bold text-xs uppercase tracking-wider transition-all"
                >
                  <span>📍</span> Nuovo Luogo
                </motion.button>

                {/* Option 3: Itinerario */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setDestModalType('itinerary');
                    setShowAddModal(true);
                    setShowFabMenu(false);
                  }}
                  className="flex items-center gap-2.5 px-4 py-3 bg-[var(--card-bg)] hover:bg-[var(--surface-variant)] text-[var(--text-main)] rounded-2xl shadow-xl border border-[var(--border)] font-bold text-xs uppercase tracking-wider transition-all"
                >
                  <span>✈️</span> Nuovo Itinerario
                </motion.button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowFabMenu(!showFabMenu)}
          className={`w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-[1.5rem] shadow-2xl shadow-blue-500/40 flex items-center justify-center border border-white/20 transition-all duration-300 ${showFabMenu ? 'rotate-45 bg-gradient-to-tr from-rose-500 to-rose-600 shadow-rose-500/40' : ''}`}
        >
          <Plus className="w-8 h-8" />
        </motion.button>
      </div>

      {/* Delete destination confirm */}
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

      {/* Delete country folder confirm */}
      <AnimatePresence>
        {deletingGroupId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setDeletingGroupId(null)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-[var(--card-bg)] rounded-[2rem] p-8 w-full max-w-sm border border-[var(--border)] text-center shadow-2xl"
            >
              <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-rose-500" />
              </div>
              <h3 className="text-lg font-black text-[var(--text-main)] mb-2">Elimina cartella paese?</h3>
              <p className="text-xs text-[var(--text-muted)] mb-6">
                Tutti i luoghi all'interno di questo paese verranno conservati e spostati in "Destinazioni Libere" (senza cartella).
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingGroupId(null)} className="flex-1 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-2xl font-bold text-[var(--text-muted)] text-sm">Annulla</button>
                <button onClick={() => handleDeleteGroup(deletingGroupId)} className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-rose-500/20">Elimina</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add country group modal */}
      <AnimatePresence>
        {showAddGroupModal && (
          <GroupModal onSubmit={handleAddGroup} onClose={() => setShowAddGroupModal(false)} />
        )}
      </AnimatePresence>

      {/* Edit country group modal */}
      <AnimatePresence>
        {editingGroupId && (
          <GroupModal 
            onSubmit={handleEditGroup} 
            onClose={() => setEditingGroupId(null)} 
            initial={countryGroups.find(g => g.id === editingGroupId)}
          />
        )}
      </AnimatePresence>

      {/* Add destination modal */}
      <AnimatePresence>
        {showAddModal && (
          <DestModal 
            onSubmit={handleAdd} 
            onClose={() => setShowAddModal(false)} 
            countryGroups={countryGroups}
            defaultGroupId={selectedGroupId}
            defaultType={destModalType}
          />
        )}
      </AnimatePresence>

      {/* Edit destination modal */}
      <AnimatePresence>
        {editingDest && (
          <DestModal 
            onSubmit={handleEdit} 
            onClose={() => setEditingDest(null)} 
            initial={editingDest} 
            countryGroups={countryGroups}
            defaultGroupId={selectedGroupId}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
