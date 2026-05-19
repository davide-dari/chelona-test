import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, X, MapPin, Globe, Compass, Navigation, Trash2, Check, Loader2, Pencil } from 'lucide-react';
import ReactGlobe from 'react-globe.gl';
import { TravelModule, TravelDestination, TravelCountryGroup, TravelNation } from '../types';

interface TravelScreenProps {
  module: TravelModule;
  onSave: (m: TravelModule) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

// --- 3D Globe with react-globe.gl ---
const Globe3D: React.FC<{ 
  destinations: TravelDestination[]; 
  selectedNation: string | null;
  focusedDestId?: string | null;
}> = ({ destinations, selectedNation, focusedDestId }) => {
  const globeEl = useRef<any>(null);
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
    setTimeout(updateSize, 100);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
      globeEl.current.pointOfView({ altitude: 1.5 });
    }
  }, [dimensions.width]);

  useEffect(() => {
    if (!globeEl.current) return;

    // 1) Focus on a specific destination (click on card)
    if (focusedDestId) {
      const target = destinations.find(d => d.id === focusedDestId);
      if (target) {
        globeEl.current.pointOfView(
          { lat: target.lat, lng: target.lng, altitude: 0.8 },
          1200
        );
        globeEl.current.controls().autoRotate = false;
        return;
      }
    }

    // 2) Focus on nation — zoom to the first destination of that nation
    if (selectedNation && destinations.length > 0) {
      const target = destinations[0];
      globeEl.current.pointOfView(
        { lat: target.lat, lng: target.lng, altitude: 0.8 },
        1200
      );
      globeEl.current.controls().autoRotate = false;
    } else {
      // 3) No selection — clean globe with auto-rotation
      globeEl.current.pointOfView({ altitude: 1.5 }, 1200);
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
    }
  }, [selectedNation, focusedDestId, destinations]);

  // Determine what to show on the globe:
  // - No selection: clean globe, no pins
  // - Nation selected (no focused dest): single label with nation name at centroid
  // - Focused dest (card click): single label with city/name at that point
  const globeLabels: { lat: number; lng: number; label: string }[] = [];
  const globeRings: { lat: number; lng: number }[] = [];

  if (focusedDestId) {
    const target = destinations.find(d => d.id === focusedDestId);
    if (target) {
      globeLabels.push({ lat: target.lat, lng: target.lng, label: target.city || target.name });
      globeRings.push({ lat: target.lat, lng: target.lng });
    }
  } else if (selectedNation && destinations.length > 0) {
    // Show one label with the nation name at the average position of all its destinations
    const avgLat = destinations.reduce((sum, d) => sum + d.lat, 0) / destinations.length;
    const avgLng = destinations.reduce((sum, d) => sum + d.lng, 0) / destinations.length;
    globeLabels.push({ lat: avgLat, lng: avgLng, label: selectedNation });
    globeRings.push({ lat: avgLat, lng: avgLng });
  }

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
          labelsData={globeLabels}
          labelLat="lat"
          labelLng="lng"
          labelText="label"
          labelSize={1.8}
          labelDotRadius={0.6}
          labelColor={() => '#60a5fa'}
          labelResolution={2}
          ringsData={globeRings}
          ringLat="lat"
          ringLng="lng"
          ringColor={() => '#60a5fa'}
          ringMaxRadius={4}
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

// --- Resolve destination nation (with legacy support for countryGroupId folders) ---
const getDestNation = (dest: TravelDestination, groups: TravelCountryGroup[]): string => {
  if (dest.nation) return dest.nation;
  if (dest.countryGroupId) {
    const matchedGroup = groups.find(g => g.id === dest.countryGroupId);
    if (matchedGroup) return matchedGroup.countryName;
  }
  return '';
};

// --- Add Nation Modal ---
const NationModal: React.FC<{
  onSubmit: (name: string) => void;
  onClose: () => void;
}> = ({ onSubmit, onClose }) => {
  const [name, setName] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim());
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
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white">
              🌍
            </div>
            <h3 className="text-lg font-black text-white">Nuova Nazione</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Nome Nazione</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Es. Italia, Spagna, Stati Uniti..." className={inputCls} autoFocus />
          </div>

          <button type="submit" disabled={!name.trim()} className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 disabled:opacity-50 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            Crea Nazione
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

// --- Add/Edit Country Group Modal ---
const GroupModal: React.FC<{
  onSubmit: (name: string, emoji: string, nationId?: string) => void;
  onClose: () => void;
  initial?: TravelCountryGroup;
  nations: TravelNation[];
}> = ({ onSubmit, onClose, initial, nations }) => {
  const [name, setName] = useState(initial?.countryName || '');
  const [emoji, setEmoji] = useState(initial?.emoji || '');
  const [nationId, setNationId] = useState(initial?.nationId || '');
  const isEdit = !!initial;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const finalEmoji = emoji.trim() || getCountryEmoji(name);
    onSubmit(name.trim(), finalEmoji, nationId || undefined);
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
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Es. Lazio, Catalogna, California..." className={inputCls} autoFocus />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Nazione di Appartenenza</label>
            <select
              value={nationId}
              onChange={e => setNationId(e.target.value)}
              className={`${inputCls} appearance-none cursor-pointer`}
            >
              <option value="">Nessuna Nazione (Cartella Libera)</option>
              {nations.map(n => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
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

// --- Static list of sovereign countries in Italian ---
const ALL_COUNTRIES = [
  "Italia", "Francia", "Spagna", "Germania", "Regno Unito", "Stati Uniti", "Giappone", 
  "Svizzera", "Austria", "Belgio", "Paesi Bassi", "Portogallo", "Grecia", "Svezia", 
  "Norvegia", "Finlandia", "Danimarca", "Irlanda", "Canada", "Australia", "Nuova Zelanda", 
  "Brasile", "Argentina", "Messico", "Cina", "India", "Sudafrica", "Egitto", "Turchia", 
  "Russia", "Polonia", "Repubblica Ceca", "Ungheria", "Romania", "Ucraina", "Colombia", 
  "Cile", "Perù", "Venezuela", "Marocco", "Tunisia", "Emirati Arabi Uniti", "Arabia Saudita", 
  "Tailandia", "Vietnam", "Indonesia", "Filippine", "Singapore", "Corea del Sud", "Macedonia del Nord",
  "Albania", "Croazia", "Slovenia", "Bosnia ed Erzegovina", "Montenegro", "Serbia", "Bulgaria",
  "Islanda", "Estonia", "Lettonia", "Lituania", "Malta", "Cipro", "Lussemburgo", "Monaco",
  "San Marino", "Andorra", "Liechtenstein", "Vaticano", "Cuba", "Giamaica", "Costa Rica",
  "Panama", "Repubblica Dominicana", "Bahamas", "Ecuador", "Bolivia", "Paraguay", "Uruguay",
  "Giordania", "Libano", "Israele", "Iran", "Iraq", "Pakistan", "Bangladesh", "Sri Lanka",
  "Maldive", "Seychelles", "Mauritius", "Madagascar", "Kenya", "Tanzania", "Uganda",
  "Nigeria", "Ghana", "Senegal", "Algeria", "Libia", "Qatar", "Kuwait", "Oman",
  "Malaysia", "Cambogia", "Laos", "Nepal", "Kazakistan", "Uzbekistan", "Georgia", "Armenia", "Azerbaigian"
];

// --- Add/Edit Destination Modal ---
const DestModal: React.FC<{
  onSubmit: (d: Omit<TravelDestination, 'id' | 'createdAt'>) => void;
  onClose: () => void;
  initial?: TravelDestination;
  defaultType?: 'place' | 'itinerary';
  defaultNation?: string | null;
}> = ({ onSubmit, onClose, initial, defaultType, defaultNation }) => {
  const [name, setName] = useState(initial?.name || '');
  const type = 'place';
  const [notes, setNotes] = useState(initial?.notes || '');

  const [nationInput, setNationInput] = useState(initial?.nation || defaultNation || '');
  const [showNationSuggestions, setShowNationSuggestions] = useState(false);
  const [cityInput, setCityInput] = useState(initial?.city || '');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<any[]>([]);

  const [selectedCoords, setSelectedCoords] = useState<{ lat: number, lng: number } | null>(
    initial ? { lat: initial.lat, lng: initial.lng } : null
  );

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isEdit = !!initial;

  // Debounced search for city suggestions using OpenStreetMap Nominatim
  useEffect(() => {
    if (!cityInput.trim() || cityInput.length < 3) {
      setCitySuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const query = nationInput ? `${cityInput.trim()}, ${nationInput.trim()}` : cityInput.trim();
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}&limit=5&accept-language=en`);
        const data = await res.json();
        if (data && Array.isArray(data)) {
          const suggestions = data.map((item: any) => {
            const address = item.address || {};
            const city = address.city || address.town || address.village || address.municipality || address.suburb || item.name || '';
            const nation = address.country || '';
            return {
              displayName: item.display_name,
              city: city,
              nation: nation,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon)
            };
          }).filter((s: any) => s.city);
          setCitySuggestions(suggestions);
        }
      } catch (err) {
        console.error('Error fetching city suggestions', err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [cityInput, nationInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityInput.trim()) { setError('Inserisci una città'); return; }
    
    setLoading(true);
    setError('');

    // If coordinates are already selected, save immediately
    if (selectedCoords) {
      onSubmit({
        name: name.trim() || cityInput.trim(),
        lat: selectedCoords.lat,
        lng: selectedCoords.lng,
        type,
        notes: notes.trim() || undefined,
        nation: nationInput.trim() || undefined,
        city: cityInput.trim()
      });
      onClose();
      setLoading(false);
      return;
    }

    try {
       const query = nationInput ? `${cityInput.trim()}, ${nationInput.trim()}` : cityInput.trim();
       const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&accept-language=en`);
       const data = await res.json();
       if (data && data.length > 0) {
          const la = parseFloat(data[0].lat);
          const lo = parseFloat(data[0].lon);
          onSubmit({
            name: name.trim() || cityInput.trim(),
            lat: la,
            lng: lo,
            type,
            notes: notes.trim() || undefined,
            nation: nationInput.trim() || undefined,
            city: cityInput.trim()
          });
          onClose();
       } else {
          setError('Città o luogo non trovato. Riprova con un nome più preciso.');
       }
    } catch (err) {
       setError('Errore di connessione. Controlla internet e riprova.');
    } finally {
       setLoading(false);
    }
  };

  const filteredCountries = nationInput.trim()
    ? ALL_COUNTRIES.filter(c => c.toLowerCase().includes(nationInput.toLowerCase())).slice(0, 5)
    : ALL_COUNTRIES.slice(0, 5);

  const inputCls = 'w-full pl-11 pr-4 py-3.5 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-sm font-semibold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/60';

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
        className="relative w-full max-w-md bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--border)] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              {isEdit ? <Pencil className="w-5 h-5 text-white" /> : <Globe className="w-5 h-5 text-white" />}
            </div>
            <h3 className="text-lg font-black text-white">{isEdit ? 'Modifica Luogo' : 'Nuovo Luogo'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Nome Luogo */}
          <div className="relative">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
              Nome Luogo (Es. Colosseo, Hotel Stella)
            </label>
            <div className="relative flex items-center">
              <Compass className="w-5 h-5 absolute left-4 text-[var(--text-muted)]" />
              <input 
                value={name} 
                onChange={e => { setName(e.target.value); setError(''); }} 
                placeholder="Es. Colosseo (lascia vuoto per usare il nome città)" 
                className={inputCls} 
                disabled={loading} 
              />
            </div>
          </div>

          {/* Nazione */}
          <div className="relative">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Nazione</label>
            <div className="relative flex items-center">
              <Globe className="w-5 h-5 absolute left-4 text-[var(--text-muted)]" />
              <input 
                value={nationInput} 
                onChange={e => { setNationInput(e.target.value); setShowNationSuggestions(true); setError(''); }} 
                onFocus={() => setShowNationSuggestions(true)}
                placeholder="Es. Italia, Giappone, Francia..." 
                className={inputCls} 
                disabled={loading} 
              />
            </div>
            {showNationSuggestions && filteredCountries.length > 0 && (
              <div className="absolute z-[310] left-0 right-0 mt-2 max-h-40 overflow-y-auto bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-xl custom-scrollbar animate-fade-in">
                {filteredCountries.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setNationInput(c);
                      setShowNationSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-blue-500/10 text-sm font-semibold text-[var(--text-main)] transition-colors border-b border-[var(--border)]/30 last:border-0"
                  >
                    {getCountryEmoji(c)} {c}
                  </button>
                ))}
              </div>
            )}
            {showNationSuggestions && (
              <div className="fixed inset-0 z-[305]" onClick={() => setShowNationSuggestions(false)} />
            )}
          </div>

          {/* Città */}
          <div className="relative">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Città</label>
            <div className="relative flex items-center">
              <MapPin className="w-5 h-5 absolute left-4 text-[var(--text-muted)]" />
              <input 
                value={cityInput} 
                onChange={e => { setCityInput(e.target.value); setShowCitySuggestions(true); setError(''); }} 
                onFocus={() => setShowCitySuggestions(true)}
                placeholder="Es. Roma, Tokyo, New York..." 
                className={inputCls} 
                disabled={loading} 
                required
              />
            </div>
            {showCitySuggestions && citySuggestions.length > 0 && (
              <div className="absolute z-[310] left-0 right-0 mt-2 max-h-48 overflow-y-auto bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-xl custom-scrollbar animate-fade-in">
                {citySuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCityInput(s.city);
                      if (s.nation && !nationInput) {
                        setNationInput(s.nation);
                      }
                      if (!name.trim()) {
                        setName(s.city);
                      }
                      setSelectedCoords({ lat: s.lat, lng: s.lng });
                      setCitySuggestions([]);
                      setShowCitySuggestions(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-blue-500/10 transition-colors border-b border-[var(--border)]/30 last:border-0"
                  >
                    <div className="text-sm font-bold text-[var(--text-main)]">{s.city}</div>
                    <div className="text-[10px] font-bold text-[var(--text-muted)] mt-0.5 truncate">{s.displayName}</div>
                  </button>
                ))}
              </div>
            )}
            {showCitySuggestions && (
              <div className="fixed inset-0 z-[305]" onClick={() => setShowCitySuggestions(false)} />
            )}
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Note (opzionale)</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              placeholder="Descrizione, da fare, ricordi..." 
              className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-sm font-semibold text-[var(--text-main)] placeholder:text-[var(--text-muted)]/60 resize-none h-20" 
              disabled={loading} 
            />
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
  const [nations, setNations] = useState<TravelNation[]>(module.nations || []);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedNation, setSelectedNation] = useState<string | null>(null);
  const [focusedDestId, setFocusedDestId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [destModalType, setDestModalType] = useState<'place' | 'itinerary'>('place');
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showAddNationModal, setShowAddNationModal] = useState(false);
  const [activeGroupActionSheet, setActiveGroupActionSheet] = useState<TravelCountryGroup | null>(null);
  const longPressTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingDest, setEditingDest] = useState<TravelDestination | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [expandedDestId, setExpandedDestId] = useState<string | null>(null);

  const handleTouchEnd = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  const handlePressStart = (g: TravelCountryGroup) => {
    handleTouchEnd();
    longPressTimeout.current = setTimeout(() => {
      setActiveGroupActionSheet(g);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 600);
  };

  const handlePressEnd = () => {
    handleTouchEnd();
  };

  const handleAdd = (d: Omit<TravelDestination, 'id' | 'createdAt'>) => {
    const newDest: TravelDestination = {
      ...d,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    const updated = [...destinations, newDest];
    setDestinations(updated);
    onSave({ ...module, destinations: updated });
    
    // Auto-select the newly added place's nation and focus the camera on it!
    const newNation = d.nation || null;
    setSelectedNation(newNation);
    setFocusedDestId(newDest.id);
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
    
    const newNation = d.nation || null;
    setSelectedNation(newNation);
    setFocusedDestId(editingDest.id);
    setEditingDest(null);
  };

  const handleDelete = (id: string) => {
    const updated = destinations.filter(d => d.id !== id);
    setDestinations(updated);
    onSave({ ...module, destinations: updated });
    setDeletingId(null);
  };

  const handleAddNation = (name: string) => {
    const newNation: TravelNation = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      createdAt: new Date().toISOString()
    };
    const updatedNations = [...nations, newNation];
    setNations(updatedNations);
    onSave({ ...module, nations: updatedNations });
  };

  const handleAddGroup = (name: string, emoji: string, nationId?: string) => {
    const newGroup: TravelCountryGroup = {
      id: Math.random().toString(36).substr(2, 9),
      countryName: name,
      emoji,
      nationId,
      createdAt: new Date().toISOString()
    };
    const updatedGroups = [...countryGroups, newGroup];
    setCountryGroups(updatedGroups);
    onSave({ ...module, countryGroups: updatedGroups, nations });
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
      destinations: updatedDests,
      nations
    });

    if (selectedGroupId === groupId) {
      setSelectedGroupId(null);
    }
    setDeletingGroupId(null);
  };

  const handleEditGroup = (name: string, emoji: string, nationId?: string) => {
    if (!editingGroupId) return;
    const updatedGroups = countryGroups.map(g => 
      g.id === editingGroupId 
        ? { ...g, countryName: name, emoji, nationId }
        : g
    );
    setCountryGroups(updatedGroups);
    onSave({ ...module, countryGroups: updatedGroups, nations });
    setEditingGroupId(null);
  };

  // Get all unique nations from active destinations (legacy fallback included!)
  const activeNations = Array.from(new Set(destinations.map(d => getDestNation(d, countryGroups)).filter(Boolean))) as string[];

  // Dynamically filter destinations based on selected country folder/nation
  const filteredDestinations = selectedNation
    ? destinations.filter(d => getDestNation(d, countryGroups) === selectedNation)
    : destinations;

  // Group filteredDestinations by city (with fallback)
  const destinationsByCity: Record<string, TravelDestination[]> = {};
  filteredDestinations.forEach(dest => {
    const cityKey = dest.city?.trim() || 'Altre località';
    if (!destinationsByCity[cityKey]) {
      destinationsByCity[cityKey] = [];
    }
    destinationsByCity[cityKey].push(dest);
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col"
    >
      {/* Header */}
      <div className="bg-[var(--card-bg)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between shrink-0 relative z-30 shadow-sm">
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
        <button
          onClick={() => {
            setDestModalType('place');
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-blue-500/25 active:scale-95 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" /> Aggiungi Meta
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Globe section - dynamically filtered! */}
        <div className="relative w-full h-[320px] lg:h-full lg:flex-1 shrink-0 bg-[#060d1a] overflow-hidden z-10">
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
            <Globe3D 
              destinations={filteredDestinations} 
              selectedNation={selectedNation} 
              focusedDestId={focusedDestId} 
            />
          </div>
        </div>

        {/* Destinations list panel */}
        <div className="flex-1 relative z-20 overflow-y-auto custom-scrollbar bg-[var(--bg)] pb-28 lg:pb-8 lg:max-w-sm lg:border-l border-[var(--border)] shadow-2xl">
          <div className="p-4 space-y-4">
            
            {/* Country Folders Horizontal Bar */}
            <div className="px-1 pt-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Nazioni</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x">
                <button
                  onClick={() => {
                    setSelectedNation(null);
                    setFocusedDestId(null);
                  }}
                  className={`px-4 py-2.5 rounded-2xl font-bold text-xs shrink-0 transition-all snap-start flex items-center gap-2 border ${selectedNation === null ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-variant)]'}`}
                >
                  <span>🌐</span> Tutte le mete ({destinations.length})
                </button>
                
                {activeNations.map(natName => {
                  const count = destinations.filter(d => getDestNation(d, countryGroups) === natName).length;
                  const isSelected = selectedNation === natName;
                  return (
                    <button
                      key={natName}
                      onClick={() => {
                        setSelectedNation(natName);
                        setFocusedDestId(null);
                      }}
                      className={`px-4 py-2.5 rounded-2xl font-bold text-xs shrink-0 transition-all snap-start flex items-center gap-2 border ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-variant)]'}`}
                    >
                      <span>{getCountryEmoji(natName)}</span> {natName} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-[var(--border)]" />

            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-3 px-1">
                {selectedNation 
                  ? `${getCountryEmoji(selectedNation)} ${selectedNation}`
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
                    Premi 'Aggiungi Meta' in alto per aggiungere un luogo {selectedGroupId && 'in questa cartella'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(destinationsByCity).map(([cityName, cityDests]) => (
                    <div key={cityName} className="space-y-2">
                      {/* City Section Header */}
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/5 px-2.5 py-1.5 rounded-xl inline-flex items-center gap-1.5 ml-1 select-none">
                        🏙️ {cityName}
                      </h4>
                      
                      <div className="space-y-2 pl-2.5 border-l border-[var(--border)] ml-2">
                        <AnimatePresence>
                          {cityDests.map(dest => (
                            <motion.div
                              key={dest.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden group cursor-pointer transition-all hover:border-blue-500/20"
                              onClick={(e) => {
                                 if ((e.target as HTMLElement).closest('button')) return;
                                 setExpandedDestId(prev => prev === dest.id ? null : dest.id);
                                 setFocusedDestId(dest.id);
                              }}
                            >
                              <div className="p-4 flex items-start gap-3 hover:bg-[var(--surface-variant)] transition-colors">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-blue-500/10 border-blue-500/20 text-blue-400">
                                  📍
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-[var(--text-main)] truncate">{dest.name}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <p className="text-[10px] font-bold text-[var(--text-muted)]">
                                      {dest.lat.toFixed(2)}, {dest.lng.toFixed(2)}
                                    </p>
                                    {(() => {
                                      const nationVal = getDestNation(dest, countryGroups);
                                      const cityVal = dest.city;
                                      if (!nationVal && !cityVal) return null;
                                      return (
                                        <>
                                          <span className="text-[8px] opacity-40">•</span>
                                          <span className="text-[9px] font-black text-blue-500 bg-blue-500/5 px-1.5 py-0.5 rounded-md">
                                            {getCountryEmoji(nationVal)} {nationVal}{cityVal ? ` · ${cityVal}` : ''}
                                          </span>
                                        </>
                                      );
                                    })()}
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
                                         {dest.notes && (
                                           <div className="mt-3 text-xs text-[var(--text-muted)]">
                                             <span className="font-bold block mb-1 text-[var(--text-main)] text-[10px] uppercase tracking-wider">Note</span>
                                             <p className="leading-relaxed whitespace-pre-wrap">{dest.notes}</p>
                                           </div>
                                         )}
                                      </div>
                                   </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FAB Menu removed to avoid overlap */}

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
          <GroupModal onSubmit={handleAddGroup} onClose={() => setShowAddGroupModal(false)} nations={nations} />
        )}
      </AnimatePresence>

      {/* Edit country group modal */}
      <AnimatePresence>
        {editingGroupId && (
          <GroupModal 
            onSubmit={handleEditGroup} 
            onClose={() => setEditingGroupId(null)} 
            initial={countryGroups.find(g => g.id === editingGroupId)}
            nations={nations}
          />
        )}
      </AnimatePresence>

      {/* Add nation modal */}
      <AnimatePresence>
        {showAddNationModal && (
          <NationModal onSubmit={handleAddNation} onClose={() => setShowAddNationModal(false)} />
        )}
      </AnimatePresence>

      {/* Add destination modal */}
      <AnimatePresence>
        {showAddModal && (
          <DestModal 
            onSubmit={handleAdd} 
            onClose={() => setShowAddModal(false)} 
            defaultNation={selectedNation}
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
            defaultNation={selectedNation}
          />
        )}
      </AnimatePresence>

      {/* Country Actions Sheet */}
      <AnimatePresence>
        {activeGroupActionSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[350] flex items-end sm:items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setActiveGroupActionSheet(null)} />
            
            {/* Sheet */}
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-sm bg-[var(--card-bg)] rounded-[2rem] border border-[var(--border)] shadow-2xl p-6 text-center z-10"
            >
              <div className="text-3xl mb-2">{activeGroupActionSheet.emoji}</div>
              <h3 className="text-lg font-black text-[var(--text-main)] mb-1">Gestisci {activeGroupActionSheet.countryName}</h3>
              {(() => {
                const nat = nations.find(n => n.id === activeGroupActionSheet.nationId);
                return nat ? (
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-500/10 px-2.5 py-1 rounded-full mb-3 inline-block">
                    {nat.name}
                  </span>
                ) : null;
              })()}
              <p className="text-xs text-[var(--text-muted)] mb-6">Scegli quale azione eseguire per questo paese.</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setEditingGroupId(activeGroupActionSheet.id);
                    setActiveGroupActionSheet(null);
                  }}
                  className="w-full py-4 bg-[var(--surface-variant)] hover:bg-[var(--border)] text-[var(--text-main)] rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-[var(--border)]"
                >
                  <Pencil className="w-4 h-4 text-amber-500" /> Modifica Nome/Emoji
                </button>
                
                <button
                  onClick={() => {
                    setDeletingGroupId(activeGroupActionSheet.id);
                    setActiveGroupActionSheet(null);
                  }}
                  className="w-full py-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-rose-500/20"
                >
                  <Trash2 className="w-4 h-4" /> Elimina Paese
                </button>
                
                <button
                  onClick={() => setActiveGroupActionSheet(null)}
                  className="w-full py-4 bg-[var(--bg)] hover:bg-[var(--surface-variant)] text-[var(--text-muted)] rounded-2xl font-bold text-sm transition-all border border-[var(--border)]"
                >
                  Annulla
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
