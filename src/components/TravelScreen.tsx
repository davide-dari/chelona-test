import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Plus, X, MapPin, Globe, Compass, Navigation, Trash2, Check, 
  Loader2, Pencil, Search, CloudSun, Briefcase, DollarSign, PhoneCall, 
  AlertTriangle, Shield, CheckCircle2, ChevronRight, Calculator, RefreshCw, 
  Luggage, Umbrella, Thermometer, Wind, Droplets, ExternalLink, PlusCircle,
  HeartPulse, Syringe, Sparkles, Sun, CloudRain, Snowflake, CloudLightning,
  ArrowDownUp, CheckCheck, Shirt, FileText, Smartphone, Coffee, AlertCircle, Info
} from 'lucide-react';
import ReactGlobe from 'react-globe.gl';
import { TravelModule, TravelDestination, TravelCountryGroup, TravelNation } from '../types';
import { FAMOUS_PLACES_DB } from '../constants/famousPlaces';

import { ConfirmDialog } from './ConfirmDialog';

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
  const isEdit = !!initial;
  
  const [step, setStep] = useState<'search' | 'details'>(isEdit ? 'details' : 'search');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [localSuggestions, setLocalSuggestions] = useState<any[]>([]);
  const [remoteSuggestions, setRemoteSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

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

  // 1. Dynamic local famous places filtering
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setLocalSuggestions([]);
      return;
    }
    const matches = FAMOUS_PLACES_DB.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.nation.toLowerCase().includes(q)
    ).slice(0, 5).map(p => ({
      name: p.name,
      city: p.city,
      nation: p.nation,
      lat: p.lat,
      lng: p.lng,
      displayName: `${p.name}, ${p.city}, ${p.nation}`,
      source: 'local'
    }));
    setLocalSuggestions(matches);
  }, [searchQuery]);

  // 2. Debounced online Nominatim place geocoding search
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 3) {
      setRemoteSuggestions([]);
      return;
    }

    setLoadingSuggestions(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(q)}&limit=8&accept-language=it`);
        const data = await res.json();
        if (data && Array.isArray(data)) {
          const formatted = data.map((item: any) => {
            const addr = item.address || {};
            const city = addr.city || addr.town || addr.village || addr.municipality || addr.suburb || addr.county || item.name || '';
            const nation = addr.country || '';
            
            const displayName = item.display_name;
            const name = item.name || city;
            
            return {
              name: name,
              city: city,
              nation: nation,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              displayName: displayName,
              source: 'remote'
            };
          }).filter((item: any) => item.city || item.nation);
          setRemoteSuggestions(formatted);
        }
      } catch (err) {
        console.error('Error fetching remote suggestions', err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Merge suggestions
  const allSuggestions = [
    ...localSuggestions,
    ...remoteSuggestions.filter(remoteItem => 
      !localSuggestions.some(localItem => 
        (localItem.name.toLowerCase() === remoteItem.name.toLowerCase() && 
         localItem.city.toLowerCase() === remoteItem.city.toLowerCase()) ||
        (Math.abs(localItem.lat - remoteItem.lat) < 0.005 && Math.abs(localItem.lng - remoteItem.lng) < 0.005)
      )
    )
  ];

  // Debounced search for city suggestions in Details view (using OpenStreetMap Nominatim)
  useEffect(() => {
    if (!cityInput.trim() || cityInput.length < 3) {
      setCitySuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const query = nationInput ? `${cityInput.trim()}, ${nationInput.trim()}` : cityInput.trim();
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}&limit=5&accept-language=it`);
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

  const handleSelectSuggestion = (s: any) => {
    setName(s.name);
    setCityInput(s.city);
    setNationInput(s.nation);
    setSelectedCoords({ lat: s.lat, lng: s.lng });
    setError('');
    setStep('details');
  };

  const handleManualEntry = () => {
    setName(searchQuery);
    setCityInput('');
    setNationInput(defaultNation || '');
    setSelectedCoords(null);
    setError('');
    setStep('details');
  };

  const handleCityChange = (val: string) => {
    setCityInput(val);
    setSelectedCoords(null);
    setShowCitySuggestions(true);
    setError('');
  };

  const handleNationChange = (val: string) => {
    setNationInput(val);
    setSelectedCoords(null);
    setShowNationSuggestions(true);
    setError('');
  };

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
       const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&accept-language=it`);
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
            {step === 'details' && !isEdit ? (
              <button 
                type="button" 
                onClick={() => setStep('search')} 
                className="p-2 hover:bg-white/20 rounded-xl transition-colors -ml-2"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            ) : (
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                {isEdit ? <Pencil className="w-5 h-5 text-white" /> : <Globe className="w-5 h-5 text-white" />}
              </div>
            )}
            <h3 className="text-lg font-black text-white">
              {isEdit ? 'Modifica Luogo' : step === 'search' ? 'Aggiungi Luogo' : 'Conferma Dettagli'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {step === 'search' ? (
          /* Search mode View */
          <div className="p-6 space-y-5 max-h-[75vh] flex flex-col">
            {/* Search query input */}
            <div className="relative">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
                Nome, Città o Attrazione
              </label>
              <div className="relative flex items-center">
                <Search className="w-5 h-5 absolute left-4 text-[var(--text-muted)]" />
                <input 
                  value={searchQuery} 
                  onChange={e => { setSearchQuery(e.target.value); setError(''); }} 
                  placeholder="Es. Eiffel Tower, Colosseo, Tokyo..." 
                  className={inputCls} 
                  autoFocus
                />
                {searchQuery && (
                  <button 
                    type="button" 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 p-1 hover:bg-[var(--bg)] rounded-full text-[var(--text-muted)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Suggestions list */}
            <div className="flex-1 overflow-y-auto max-h-[35vh] pr-1 space-y-2.5 custom-scrollbar">
              {loadingSuggestions && searchQuery.length >= 3 && allSuggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-[var(--text-muted)]">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                  <span className="text-xs font-semibold">Ricerca in corso su mappa...</span>
                </div>
              ) : allSuggestions.length > 0 ? (
                allSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full text-left p-3.5 bg-[var(--bg)] border border-[var(--border)] hover:border-blue-500/50 hover:bg-blue-500/5 rounded-2xl transition-all flex items-start gap-3.5 group active:scale-[0.99]"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-[var(--text-main)] truncate group-hover:text-blue-500 transition-colors">
                          {s.name}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                          s.source === 'local' 
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {s.source === 'local' ? 'Suggerito' : 'Mappa'}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                        {s.city ? `${s.city}, ` : ''}{s.nation}
                      </p>
                    </div>
                  </button>
                ))
              ) : searchQuery.trim().length >= 3 ? (
                <div className="text-center py-8 text-xs font-semibold text-[var(--text-muted)]">
                  Nessun luogo trovato. Prova ad inserire manualmente.
                </div>
              ) : (
                <div className="text-center py-8 text-xs font-semibold text-[var(--text-muted)] flex flex-col items-center gap-2">
                  <Compass className="w-8 h-8 text-[var(--text-muted)]/50" />
                  <span>Digita una destinazione famosa o città per iniziare</span>
                </div>
              )}
            </div>

            {/* Manual entry button */}
            <div className="pt-2 border-t border-[var(--border)]/60">
              <button
                type="button"
                onClick={handleManualEntry}
                className="w-full py-4 bg-[var(--bg)] border border-[var(--border)] hover:border-blue-500/30 hover:bg-blue-500/5 text-[var(--text-main)] rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 text-blue-500" /> Inserisci manualmente
              </button>
            </div>
          </div>
        ) : (
          /* Confirmation / Details Form Mode */
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
                  placeholder="Es. Colosseo" 
                  className={inputCls} 
                  disabled={loading} 
                  required
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
                  onChange={e => handleNationChange(e.target.value)} 
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
                        setSelectedCoords(null);
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
                  onChange={e => handleCityChange(e.target.value)} 
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

            {selectedCoords && (
              <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-2xl text-xs font-semibold">
                <Check className="w-4 h-4 shrink-0" />
                <span>Coordinate rilevate correttamente ({selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)})</span>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-500 font-bold bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">{error}</p>
            )}

            <button disabled={loading} type="submit" className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 disabled:opacity-70 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isEdit ? 'Salva Modifiche' : 'Aggiungi al Mappamondo'}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
};

// --- Global Currencies Database ---
export interface CurrencyInfo {
  code: string;
  name: string;
  country: string;
  symbol: string;
  rateAgainstEur: number;
}

export const GLOBAL_CURRENCIES: CurrencyInfo[] = [
  { code: 'EUR', name: 'Euro', country: 'Unione Europea', symbol: '€', rateAgainstEur: 1.0 },
  { code: 'USD', name: 'Dollaro USA', country: 'Stati Uniti', symbol: '$', rateAgainstEur: 1.085 },
  { code: 'GBP', name: 'Sterlina britannica', country: 'Regno Unito', symbol: '£', rateAgainstEur: 0.855 },
  { code: 'JPY', name: 'Yen giapponese', country: 'Giappone', symbol: '¥', rateAgainstEur: 163.5 },
  { code: 'CHF', name: 'Franco svizzero', country: 'Svizzera', symbol: 'CHF', rateAgainstEur: 0.958 },
  { code: 'CAD', name: 'Dollaro canadese', country: 'Canada', symbol: 'C$', rateAgainstEur: 1.485 },
  { code: 'AUD', name: 'Dollaro australiano', country: 'Australia', symbol: 'A$', rateAgainstEur: 1.662 },
  { code: 'CNY', name: 'Yuan Renminbi', country: 'Cina', symbol: '¥', rateAgainstEur: 7.85 },
  { code: 'BRL', name: 'Real brasiliano', country: 'Brasile', symbol: 'R$', rateAgainstEur: 5.92 },
  { code: 'INR', name: 'Rupia indiana', country: 'India', symbol: '₹', rateAgainstEur: 91.2 },
  { code: 'THB', name: 'Baht thailandese', country: 'Thailandia', symbol: '฿', rateAgainstEur: 39.5 },
  { code: 'MXN', name: 'Peso messicano', country: 'Messico', symbol: 'Mex$', rateAgainstEur: 21.4 },
  { code: 'AED', name: 'Dirham degli Emirati', country: 'Emirati Arabi Uniti', symbol: 'AED', rateAgainstEur: 3.985 },
  { code: 'EGP', name: 'Sterlina egiziana', country: 'Egitto', symbol: 'E£', rateAgainstEur: 52.8 },
  { code: 'MAD', name: 'Dirham marocchino', country: 'Marocco', symbol: 'DH', rateAgainstEur: 10.85 },
  { code: 'TRY', name: 'Lira turca', country: 'Turchia', symbol: '₺', rateAgainstEur: 37.2 },
  { code: 'KRW', name: 'Won sudcoreano', country: 'Corea del Sud', symbol: '₩', rateAgainstEur: 1470.0 },
  { code: 'SGD', name: 'Dollaro di Singapore', country: 'Singapore', symbol: 'S$', rateAgainstEur: 1.45 },
  { code: 'HKD', name: 'Dollaro di Hong Kong', country: 'Hong Kong', symbol: 'HK$', rateAgainstEur: 8.48 },
  { code: 'SEK', name: 'Corona svedese', country: 'Svezia', symbol: 'kr', rateAgainstEur: 11.42 },
  { code: 'NOK', name: 'Corona norvegese', country: 'Norvegia', symbol: 'kr', rateAgainstEur: 11.65 },
  { code: 'DKK', name: 'Corona danese', country: 'Danimarca', symbol: 'kr', rateAgainstEur: 7.46 },
  { code: 'PLN', name: 'Złoty polacco', country: 'Polonia', symbol: 'zł', rateAgainstEur: 4.28 },
  { code: 'CZK', name: 'Corona ceca', country: 'Repubblica Ceca', symbol: 'Kč', rateAgainstEur: 25.15 },
  { code: 'HUF', name: 'Fiorino ungherese', country: 'Ungheria', symbol: 'Ft', rateAgainstEur: 405.0 },
  { code: 'IDR', name: 'Rupia indonesiana', country: 'Indonesia', symbol: 'Rp', rateAgainstEur: 17200.0 },
  { code: 'VND', name: 'Dong vietnamita', country: 'Vietnam', symbol: '₫', rateAgainstEur: 27150.0 },
  { code: 'ZAR', name: 'Rand sudafricano', country: 'Sudafrica', symbol: 'R', rateAgainstEur: 19.35 },
  { code: 'ARS', name: 'Peso argentino', country: 'Argentina', symbol: '$', rateAgainstEur: 1050.0 },
  { code: 'CLP', name: 'Peso cileno', country: 'Cile', symbol: '$', rateAgainstEur: 1025.0 },
  { code: 'PEN', name: 'Sol peruviano', country: 'Perù', symbol: 'S/', rateAgainstEur: 4.05 },
  { code: 'ISK', name: 'Corona islandese', country: 'Islanda', symbol: 'kr', rateAgainstEur: 149.0 },
  { code: 'NZD', name: 'Dollaro neozelandese', country: 'Nuova Zelanda', symbol: 'NZ$', rateAgainstEur: 1.82 },
  { code: 'PHP', name: 'Peso filippino', country: 'Filippine', symbol: '₱', rateAgainstEur: 62.5 },
  { code: 'MYR', name: 'Ringgit malese', country: 'Malesia', symbol: 'RM', rateAgainstEur: 4.75 }
];

// --- Travel Health & Vaccines Database ---
export interface CountryHealthInfo {
  country: string;
  flag: string;
  code: string;
  requiredVaccines: string[];
  recommendedVaccines: string[];
  healthRisks: string[];
  waterSafety: 'safe' | 'bottled_only' | 'boil';
  malariaRisk: 'none' | 'low' | 'moderate' | 'high';
  advisoryNote: string;
  recommendedKit: string[];
}

export const TRAVEL_HEALTH_DB: CountryHealthInfo[] = [
  {
    country: 'Kenya',
    flag: '🇰🇪',
    code: 'KE',
    requiredVaccines: ['Febbre Gialla (obbligatoria se da paesi a rischio o transito > 12h)'],
    recommendedVaccines: ['Epatite A', 'Epatite B', 'Tetano-Difterite', 'Febbre Tifoide', 'Meningite Meningococcica', 'Rabbia'],
    healthRisks: ['Malaria (rischio alto nei parchi e zone costiere come Malindi/Watamu)', 'Dengue', 'Diarrea del viaggiatore'],
    waterSafety: 'bottled_only',
    malariaRisk: 'high',
    advisoryNote: 'Profilassi antimalarica (Malarone) vivamente raccomandata per safari e coste. Bere tassativamente acqua minerale sigillata.',
    recommendedKit: ['Repellente DEET > 30%', 'Malarone / Antimalarico', 'Fermenti lattici', 'Disinfettante intestinale', 'Paracetamolo']
  },
  {
    country: 'Tanzania & Zanzibar',
    flag: '🇹🇿',
    code: 'TZ',
    requiredVaccines: ['Febbre Gialla (richiesto certificato di vaccinazione all\'ingresso a Zanzibar)'],
    recommendedVaccines: ['Epatite A', 'Epatite B', 'Tetano-Difterite', 'Febbre Tifoide', 'Colera (orale)'],
    healthRisks: ['Malaria (presente in tutto il paese e nelle aree rurali di Zanzibar)', 'Dengue', 'Batteri intestinali'],
    waterSafety: 'bottled_only',
    malariaRisk: 'high',
    advisoryNote: 'Certificato Febbre Gialla obbligatorio. Dormire sotto zanzariere impregnate e usare spray antizanzare tropicale.',
    recommendedKit: ['Profilassi antimalarica', 'Zanzariera da viaggio', 'Reidratante orale', 'Crema solare 50+', 'Antibiotico intestinale']
  },
  {
    country: 'Brasile',
    flag: '🇧🇷',
    code: 'BR',
    requiredVaccines: ['Febbre Gialla (raccomandata per tutto il paese e bacino Amazzonico)'],
    recommendedVaccines: ['Epatite A', 'Epatite B', 'Tetano-Difterite', 'Febbre Tifoide', 'Rabbia'],
    healthRisks: ['Dengue (frequente in aree urbane e costiere)', 'Zika e Chikungunya', 'Malaria (solo bacino dell\'Amazzonia)'],
    waterSafety: 'bottled_only',
    malariaRisk: 'moderate',
    advisoryNote: 'Vaccinazione contro la febbre gialla raccomandata con almeno 10 giorni d\'anticipo per Iguazù, Manaus e stati centrali.',
    recommendedKit: ['Repellente antizanzare tropicale', 'Cerotti e disinfettante', 'Antidiarroico', 'Antistaminico']
  },
  {
    country: 'Thailandia',
    flag: '🇹🇭',
    code: 'TH',
    requiredVaccines: ['Febbre Gialla (solo se provenienti da paesi endemici)'],
    recommendedVaccines: ['Epatite A', 'Epatite B', 'Tetano-Difterite', 'Febbre Tifoide', 'Encefalite Giapponese (se soggiorni rurali)', 'Rabbia'],
    healthRisks: ['Dengue (diffusa nel sud-est asiatico)', 'Intossicazioni alimentari da street food', 'Rabbia (morsi da scimmie o randagi)'],
    waterSafety: 'bottled_only',
    malariaRisk: 'low',
    advisoryNote: 'Rischio malaria nullo nelle grandi città e isole turistiche (Bangkok, Phuket, Koh Samui, Chiang Mai). Non toccare scimmie.',
    recommendedKit: ['Repellente DEET', 'Fermenti lattici e carbone vegetale', 'Sali minerali per il caldo umido', 'Cerotti vesciche']
  },
  {
    country: 'India',
    flag: '🇮🇳',
    code: 'IN',
    requiredVaccines: ['Febbre Gialla (obbligatoria se da paesi endemici, con quarantena rigida se sprovvisti)'],
    recommendedVaccines: ['Epatite A', 'Epatite B', 'Tetano-Difterite', 'Febbre Tifoide', 'Colera', 'Rabbia', 'Encefalite Giapponese'],
    healthRisks: ['Diarrea del viaggiatore (Delhi Belly)', 'Malaria (rischio variabile a seconda della regione)', 'Dengue'],
    waterSafety: 'bottled_only',
    malariaRisk: 'moderate',
    advisoryNote: 'Non bere mai acqua non sigillata né consumare ghiaccio. Cibi solo cotti caldi e frutta sbucciata al momento.',
    recommendedKit: ['Gel disinfettante mani', 'Rifaximina / Antibiotico intestinale', 'Fermenti lattici', 'Soluzioni reidratanti']
  },
  {
    country: 'Perù',
    flag: '🇵🇪',
    code: 'PE',
    requiredVaccines: ['Febbre Gialla (raccomandata per aree sotto i 2300m, Amazzonia e Puerto Maldonado)'],
    recommendedVaccines: ['Epatite A', 'Epatite B', 'Tetano-Difterite', 'Febbre Tifoide'],
    healthRisks: ['Mal di Montagna / Soroche (Cusco 3400m, Lago Titicaca 3800m)', 'Malaria (solo Amazzonia profonda)'],
    waterSafety: 'bottled_only',
    malariaRisk: 'low',
    advisoryNote: 'Per altitudini oltre 2500m: acclimatarsi 1-2 giorni a Cusco, bere tè di coca, idratarsi molto ed evitare sforzi intensi il primo giorno.',
    recommendedKit: ['Medicinali per altitudine (Acetazolamide)', 'Gocce occhi e burrocacao', 'Crema solare alta quota', 'Repellente Amazzonia']
  },
  {
    country: 'Egitto',
    flag: '🇪🇬',
    code: 'EG',
    requiredVaccines: ['Febbre Gialla (solo se provenienti da paesi endemici)'],
    recommendedVaccines: ['Epatite A', 'Epatite B', 'Tetano-Difterite', 'Febbre Tifoide'],
    healthRisks: ['Infezioni gastrointestinali (sbalzi termici aria condizionata/caldo)', 'Colpi di calore nel deserto'],
    waterSafety: 'bottled_only',
    malariaRisk: 'none',
    advisoryNote: 'Evitare bevande con ghiaccio e verdure crude non sbucciate. Usare acqua in bottiglia anche per lavare i denti. Rischio malaria nullo.',
    recommendedKit: ['Antidiarroico (Loperamide/Dissenten)', 'Integratori salini e magnesio', 'Protezione solare 50+', 'Cappello protettivo']
  },
  {
    country: 'Madagascar',
    flag: '🇲🇬',
    code: 'MG',
    requiredVaccines: ['Febbre Gialla (se da paesi a rischio)'],
    recommendedVaccines: ['Epatite A', 'Epatite B', 'Tetano-Difterite', 'Febbre Tifoide', 'Rabbia'],
    healthRisks: ['Malaria (presente in tutta l\'isola)', 'Dengue', 'Parassitosi delle acque dolci'],
    waterSafety: 'bottled_only',
    malariaRisk: 'high',
    advisoryNote: 'Profilassi antimalarica raccomandata. Evitare bagni in laghi o fiumi di acqua dolce stagnante.',
    recommendedKit: ['Profilassi antimalarica', 'Repellente tropicale potente', 'Antinfiammatori', 'Kit medicazione sterile']
  },
  {
    country: 'Vietnam',
    flag: '🇻🇳',
    code: 'VN',
    requiredVaccines: ['Febbre Gialla (solo se da paesi endemici)'],
    recommendedVaccines: ['Epatite A', 'Epatite B', 'Tetano-Difterite', 'Febbre Tifoide', 'Encefalite Giapponese'],
    healthRisks: ['Dengue', 'Diarrea alimentare', 'Rabbia'],
    waterSafety: 'bottled_only',
    malariaRisk: 'low',
    advisoryNote: 'Rischio malaria limitato a foreste dell\'altopiano centrale. Nelle città (Hanoi, Ho Chi Minh) e baie (Halong) rischio quasi nullo.',
    recommendedKit: ['Repellente antizanzare', 'Fermenti lattici', 'Disinfettante mani', 'Antistaminico']
  },
  {
    country: 'Indonesia & Bali',
    flag: '🇮🇩',
    code: 'ID',
    requiredVaccines: ['Febbre Gialla (se da paesi a rischio)'],
    recommendedVaccines: ['Epatite A', 'Epatite B', 'Tetano-Difterite', 'Febbre Tifoide', 'Rabbia'],
    healthRisks: ['Bali Belly (infezione intestinale)', 'Dengue', 'Rabbia da scimmie/cani'],
    waterSafety: 'bottled_only',
    malariaRisk: 'low',
    advisoryNote: 'A Bali e Giava non c\'è rischio malaria significativo. Attenzione a graffi o morsi di scimmie nelle foreste di Ubud.',
    recommendedKit: ['Elettroliti e fermenti lattici', 'Carbone vegetale', 'Repellente DEET', 'Spray disinfettante']
  },
  {
    country: 'Messico',
    flag: '🇲🇽',
    code: 'MX',
    requiredVaccines: ['Febbre Gialla (solo se da paesi a rischio)'],
    recommendedVaccines: ['Epatite A', 'Epatite B', 'Tetano-Difterite', 'Febbre Tifoide'],
    healthRisks: ['Diarrea del viaggiatore', 'Dengue e Zika nello Yucatan'],
    waterSafety: 'bottled_only',
    malariaRisk: 'low',
    advisoryNote: 'Acqua del rubinetto non potabile. Nei resort turistici dei Caraibi si usa acqua depurata. Usare repellenti biologici per i cenote.',
    recommendedKit: ['Repellente biodegradabile', 'Antidiarroico', 'Fermenti', 'Paracetamolo']
  },
  {
    country: 'Giappone',
    flag: '🇯🇵',
    code: 'JP',
    requiredVaccines: ['Nessun vaccino obbligatorio'],
    recommendedVaccines: ['Vaccinazioni di routine (Tetano, Morbillo, Epatite A)'],
    healthRisks: ['Nessun rischio sanitario particolare', 'Allergie ai pollini di cedro in primavera'],
    waterSafety: 'safe',
    malariaRisk: 'none',
    advisoryNote: 'Standard sanitari d\'eccellenza. Acqua del rubinetto purissima e potabile ovunque.',
    recommendedKit: ['Antistaminico (se primaverile)', 'Paracetamolo', 'Cerotti vesciche', 'Crema idratante']
  },
  {
    country: 'Stati Uniti & Canada',
    flag: '🇺🇸',
    code: 'US',
    requiredVaccines: ['Nessun vaccino obbligatorio'],
    recommendedVaccines: ['Vaccinazioni di routine (Tetano, Morbillo)'],
    healthRisks: ['Nessuno endemico', 'Costi sanitari privatizzati esorbitanti'],
    waterSafety: 'safe',
    malariaRisk: 'none',
    advisoryNote: 'FONDAMENTALE: stipulare un\'assicurazione sanitaria privata con massimale illimitato prima di partire.',
    recommendedKit: ['Polizza assicurazione sanitaria con contatti', 'Farmaci personali con prescrizione in inglese']
  },
  {
    country: 'Italia & Unione Europea',
    flag: '🇪🇺',
    code: 'IT',
    requiredVaccines: ['Nessun vaccino obbligatorio'],
    recommendedVaccines: ['Vaccinazioni di routine (Tetano, Morbillo-Parotite-Rosolia)'],
    healthRisks: ['Nessuno specifico', 'Zecche in aree montane/boschi'],
    waterSafety: 'safe',
    malariaRisk: 'none',
    advisoryNote: 'Copertura sanitaria d\'emergenza garantita dalla Tessera Europea di Assicurazione Malattia (TEAM).',
    recommendedKit: ['Tessera Sanitaria TEAM valida', 'Farmaci abituali']
  }
];

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

  // --- Sub-tabs Strumenti Viaggio ---
  const [travelActiveTab, setTravelActiveTab] = useState<'destinations' | 'weather' | 'packing' | 'budget' | 'vaccines' | 'emergency'>('destinations');

  // --- Checklist Valigia ---
  const defaultPackingItems = [
    { id: '1', name: "Passaporto / Carta d'Identità", category: 'Documenti', checked: false },
    { id: '2', name: "Biglietti di viaggio / Carte d'imbarco", category: 'Documenti', checked: false },
    { id: '3', name: 'Assicurazione viaggio & Tessera sanitaria', category: 'Documenti', checked: false },
    { id: '4', name: 'Smartphone & Caricabatterie', category: 'Elettronica', checked: false },
    { id: '5', name: 'Powerbank portatile', category: 'Elettronica', checked: false },
    { id: '6', name: 'Adattatore prese universale', category: 'Elettronica', checked: false },
    { id: '7', name: 'Cuffie / Auricolari', category: 'Elettronica', checked: false },
    { id: '8', name: 'Abbigliamento & Intimo', category: 'Abbigliamento', checked: false },
    { id: '9', name: 'Giacca antivento / K-way', category: 'Abbigliamento', checked: false },
    { id: '10', name: 'Scarpe comode da cammino', category: 'Abbigliamento', checked: false },
    { id: '11', name: 'Spazzolino, dentifricio e beauty case', category: 'Toilette', checked: false },
    { id: '12', name: 'Kit medicinali base e cerotti', category: 'Salute', checked: false },
    { id: '13', name: 'Occhiali da sole & crema solare', category: 'Accessori', checked: false },
    { id: '14', name: 'Ombrello tascabile', category: 'Accessori', checked: false },
  ];

  const [packingItems, setPackingItems] = useState<{ id: string; name: string; category: string; checked: boolean }[]>(
    () => (module.packingList && module.packingList.length > 0 ? module.packingList : defaultPackingItems)
  );
  const [newPackingText, setNewPackingText] = useState('');
  const [newPackingCat, setNewPackingCat] = useState('Abbigliamento');
  const [packingCatFilter, setPackingCatFilter] = useState('Tutte');

  const handleTogglePacking = (id: string) => {
    const updated = packingItems.map(it => it.id === id ? { ...it, checked: !it.checked } : it);
    setPackingItems(updated);
    onSave({ ...module, destinations, packingList: updated });
  };

  const handleAddPackingItem = () => {
    if (!newPackingText.trim()) return;
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPackingText.trim(),
      category: newPackingCat,
      checked: false
    };
    const updated = [...packingItems, newItem];
    setPackingItems(updated);
    setNewPackingText('');
    onSave({ ...module, destinations, packingList: updated });
  };

  const handleDeletePackingItem = (id: string) => {
    const updated = packingItems.filter(it => it.id !== id);
    setPackingItems(updated);
    onSave({ ...module, destinations, packingList: updated });
  };

  const handleSmartSuggestions = () => {
    const essentials = [
      { name: 'Adattatore prese universale', category: 'Elettronica' },
      { name: 'Powerbank portatile 10000mAh', category: 'Elettronica' },
      { name: 'Crema solare protettiva 50+', category: 'Accessori' },
      { name: 'Ombrello pieghevole / K-way', category: 'Abbigliamento' },
      { name: 'Kit medicinali base e cerotti', category: 'Salute' },
      { name: 'Repellente antizanzare tropicale', category: 'Salute' },
      { name: 'Fotocopia passaporto e documenti', category: 'Documenti' },
      { name: 'Tappi per le orecchie e mascherina', category: 'Accessori' },
    ];
    const existingNames = new Set(packingItems.map(p => p.name.toLowerCase()));
    const toAdd = essentials
      .filter(e => !existingNames.has(e.name.toLowerCase()))
      .map(e => ({
        id: Math.random().toString(36).substr(2, 9),
        name: e.name,
        category: e.category,
        checked: false
      }));
    if (toAdd.length > 0) {
      const updated = [...packingItems, ...toAdd];
      setPackingItems(updated);
      onSave({ ...module, destinations, packingList: updated });
    }
  };

  const packingCompletedCount = packingItems.filter(it => it.checked).length;
  const packingProgressPercent = packingItems.length > 0 ? Math.round((packingCompletedCount / packingItems.length) * 100) : 0;

  // --- Weather Widget State (Smart & Open-Meteo Live) ---
  const [selectedWeatherCity, setSelectedWeatherCity] = useState<string>(() => {
    if (destinations.length > 0 && destinations[0].city) return destinations[0].city;
    if (destinations.length > 0) return destinations[0].name;
    return 'Roma';
  });

  const [liveWeather, setLiveWeather] = useState<{
    city: string;
    temp: number;
    cond: string;
    icon: string;
    humidity: number;
    wind: number;
    uv: number;
    forecast: { day: string; min: number; max: number; cond: string; icon: string }[];
    advice: string;
  }>({
    city: 'Roma',
    temp: 22,
    cond: 'Soleggiato',
    icon: '☀️',
    humidity: 55,
    wind: 12,
    uv: 5,
    forecast: [
      { day: 'Dom', min: 14, max: 23, cond: 'Sole', icon: '☀️' },
      { day: 'Lun', min: 15, max: 24, cond: 'Sereno', icon: '🌤️' },
      { day: 'Mar', min: 13, max: 20, cond: 'Rovesci', icon: '🌦️' },
      { day: 'Mer', min: 14, max: 22, cond: 'Sole', icon: '☀️' },
      { day: 'Gio', min: 12, max: 19, cond: 'Variabile', icon: '⛅' }
    ],
    advice: '👟 Clima ideale: perfetto per passeggiate ed esplorazioni della città a piedi!'
  });
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [weatherSearchQuery, setWeatherSearchQuery] = useState('');

  const getWeatherAdvice = (temp: number, code: number) => {
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) {
      return '🌧️ Prevista pioggia: metti un ombrello compatto o k-way antivento nello zaino!';
    }
    if ([71, 73, 75, 77].includes(code)) {
      return '❄️ Neve e clima rigido: indossa scarpe impermeabili e giacca termica a strati.';
    }
    if (temp >= 28) {
      return '☀️ Molto caldo: indossa vestiti leggeri, porta occhiali da sole, cappellino e tanta acqua!';
    }
    if (temp <= 10) {
      return '🧣 Clima freddo: consigliato abbigliamento pesante a strati e sciarpa.';
    }
    return '👟 Clima ideale: perfetto per camminare ed esplorare a piedi musei e parchi!';
  };

  const fetchLiveWeather = useCallback(async (cityName: string) => {
    setIsWeatherLoading(true);
    try {
      let lat: number | undefined;
      let lng: number | undefined;

      const foundDest = destinations.find(d => 
        (d.city && d.city.toLowerCase() === cityName.toLowerCase()) || 
        d.name.toLowerCase() === cityName.toLowerCase()
      );
      if (foundDest) {
        lat = foundDest.lat;
        lng = foundDest.lng;
      } else {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=it&format=json`);
        const geoData = await geoRes.json();
        if (geoData?.results?.[0]) {
          lat = geoData.results[0].latitude;
          lng = geoData.results[0].longitude;
        }
      }

      if (lat !== undefined && lng !== undefined) {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
        const data = await res.json();
        if (data?.current) {
          const cur = data.current;
          const code = cur.weather_code || 0;
          const parseWmo = (c: number) => {
            if (c === 0) return { cond: 'Limpido e soleggiato', icon: '☀️' };
            if (c <= 3) return { cond: 'Parzialmente nuvoloso', icon: '🌤️' };
            if (c <= 48) return { cond: 'Nebbia o foschia', icon: '🌫️' };
            if (c <= 57) return { cond: 'Pioviggine', icon: '🌦️' };
            if (c <= 67) return { cond: 'Pioggia', icon: '🌧️' };
            if (c <= 77) return { cond: 'Neve', icon: '❄️' };
            if (c <= 82) return { cond: 'Rovesci intensi', icon: '🌧️' };
            return { cond: 'Temporali', icon: '⛈️' };
          };

          const curInfo = parseWmo(code);
          const daily = data.daily || {};
          const daysNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
          const forecastList = (daily.time || []).slice(1, 6).map((timeStr: string, idx: number) => {
            const d = new Date(timeStr);
            const dayName = daysNames[d.getDay()];
            const dayCode = daily.weather_code ? daily.weather_code[idx + 1] : 0;
            const dayInfo = parseWmo(dayCode);
            return {
              day: dayName,
              min: Math.round(daily.temperature_2m_min?.[idx + 1] ?? 12),
              max: Math.round(daily.temperature_2m_max?.[idx + 1] ?? 22),
              cond: dayInfo.cond,
              icon: dayInfo.icon,
            };
          });

          setLiveWeather({
            city: cityName,
            temp: Math.round(cur.temperature_2m),
            cond: curInfo.cond,
            icon: curInfo.icon,
            humidity: Math.round(cur.relative_humidity_2m || 55),
            wind: Math.round(cur.wind_speed_10m || 12),
            uv: 5,
            forecast: forecastList.length > 0 ? forecastList : [
              { day: 'Dom', min: 14, max: 23, cond: 'Sole', icon: '☀️' },
              { day: 'Lun', min: 15, max: 24, cond: 'Sereno', icon: '🌤️' },
              { day: 'Mar', min: 13, max: 20, cond: 'Nubi', icon: '⛅' },
            ],
            advice: getWeatherAdvice(Math.round(cur.temperature_2m), code),
          });
          setIsWeatherLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Weather fetch error:', e);
    }
    setIsWeatherLoading(false);
  }, [destinations]);

  useEffect(() => {
    if (selectedWeatherCity) {
      fetchLiveWeather(selectedWeatherCity);
    }
  }, [selectedWeatherCity, fetchLiveWeather]);

  // --- Currency & Budget State ---
  const [currencyAmount, setCurrencyAmount] = useState<number>(100);
  const [currencyFrom, setCurrencyFrom] = useState<string>('EUR');
  const [currencyTo, setCurrencyTo] = useState<string>('USD');

  const convertedAmount = useMemo(() => {
    const fromInfo = GLOBAL_CURRENCIES.find(c => c.code === currencyFrom) || GLOBAL_CURRENCIES[0];
    const toInfo = GLOBAL_CURRENCIES.find(c => c.code === currencyTo) || GLOBAL_CURRENCIES[1];
    const inEur = (currencyAmount || 0) / (fromInfo.rateAgainstEur || 1);
    const converted = inEur * (toInfo.rateAgainstEur || 1);
    return converted.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [currencyAmount, currencyFrom, currencyTo]);

  const handleSwapCurrencies = () => {
    const prevFrom = currencyFrom;
    setCurrencyFrom(currencyTo);
    setCurrencyTo(prevFrom);
  };

  // --- Vaccines & Health State ---
  const [selectedHealthCountry, setSelectedHealthCountry] = useState<string>(() => {
    if (destinations.length > 0 && destinations[0].nation) return destinations[0].nation;
    return 'Kenya';
  });
  const [healthSearchQuery, setHealthSearchQuery] = useState('');
  const [userVaccines, setUserVaccines] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('chelona_travel_user_vaccines');
      if (stored) return new Set(JSON.parse(stored));
    } catch (e) {}
    return new Set(['Tetano-Difterite', 'Epatite A']);
  });

  const handleToggleUserVaccine = (vacName: string) => {
    setUserVaccines(prev => {
      const next = new Set(prev);
      if (next.has(vacName)) next.delete(vacName);
      else next.add(vacName);
      try {
        localStorage.setItem('chelona_travel_user_vaccines', JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });
  };

  // Travel Budget
  const [totalTripBudget, setTotalTripBudget] = useState<number>(() => module.travelBudget?.total || 1500);
  const [expenses, setExpenses] = useState<{ id: string; desc: string; amount: number; category: string; date: string }[]>(
    () => module.travelBudget?.expenses || [
      { id: '1', desc: 'Volo A/R', amount: 350, category: 'Trasporti', date: new Date().toISOString().substring(0, 10) },
      { id: '2', desc: 'Hotel / Soggiorno', amount: 480, category: 'Alloggio', date: new Date().toISOString().substring(0, 10) },
      { id: '3', desc: 'Pranzo Tipico', amount: 45, category: 'Cibo', date: new Date().toISOString().substring(0, 10) }
    ]
  );
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCat, setNewExpenseCat] = useState('Cibo');

  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const budgetRemaining = totalTripBudget - totalSpent;
  const budgetPercent = Math.min(100, Math.round((totalSpent / (totalTripBudget || 1)) * 100));

  const handleAddExpense = () => {
    const amt = parseFloat(newExpenseAmount);
    if (!newExpenseDesc.trim() || isNaN(amt) || amt <= 0) return;
    const newExp = {
      id: Math.random().toString(36).substr(2, 9),
      desc: newExpenseDesc.trim(),
      amount: amt,
      category: newExpenseCat,
      date: new Date().toISOString().substring(0, 10)
    };
    const updated = [newExp, ...expenses];
    setExpenses(updated);
    setNewExpenseDesc('');
    setNewExpenseAmount('');
    onSave({
      ...module,
      destinations,
      travelBudget: { total: totalTripBudget, currency: 'EUR', expenses: updated }
    });
  };

  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    onSave({
      ...module,
      destinations,
      travelBudget: { total: totalTripBudget, currency: 'EUR', expenses: updated }
    });
  };

  // --- Emergency Numbers Database ---
  const EMERGENCY_DB = [
    {
      country: 'Italia & Unione Europea',
      flag: '🇪🇺',
      code: 'IT',
      numbers: [
        { label: 'Numero Unico Europeo Emergenze', num: '112', desc: 'Carabinieri, Polizia, Vigili del Fuoco, Sanità' },
        { label: 'Soccorso Sanitario / Ambulanza', num: '118', desc: 'Pronto Soccorso Medico' },
        { label: 'Vigili del Fuoco', num: '115', desc: 'Incendi, soccorso tecnico urgente' },
        { label: 'Polizia di Stato', num: '113', desc: 'Sicurezza e pronto intervento' },
        { label: 'Soccorso Stradale ACI', num: '803116', desc: 'Guasti auto e traino' }
      ]
    },
    {
      country: 'Stati Uniti & Canada',
      flag: '🇺🇸',
      code: 'US',
      numbers: [
        { label: 'Emergency Services (911)', num: '911', desc: 'Polizia, Ambulanza, Pompieri unificato' },
        { label: 'Non-Emergency Services', num: '311', desc: 'Assistenza cittadina non urgente' }
      ]
    },
    {
      country: 'Regno Unito',
      flag: '🇬🇧',
      code: 'GB',
      numbers: [
        { label: 'Emergency Number', num: '999', desc: 'Police, Ambulance, Fire' },
        { label: 'EU Emergency Call', num: '112', desc: 'Standard Europeo da cellulare' },
        { label: 'NHS Non-Emergency Health', num: '111', desc: 'Consulenza medica urgente' }
      ]
    },
    {
      country: 'Giappone',
      flag: '🇯🇵',
      code: 'JP',
      numbers: [
        { label: 'Polizia (Keisatsu)', num: '110', desc: 'Incidenti e emergenze' },
        { label: 'Ambulanza & Pompieri (Shobo)', num: '119', desc: 'Pronto soccorso e incendi' },
        { label: 'Guardia Costiera', num: '118', desc: 'Soccorso marittimo' }
      ]
    },
    {
      country: 'Svizzera',
      flag: '🇨🇭',
      code: 'CH',
      numbers: [
        { label: 'Numero Emergenze Generale', num: '112', desc: 'Numero Unico Europeo' },
        { label: 'Soccorso Sanitario Ambulanza', num: '144', desc: 'Emergenza Medica' },
        { label: 'Polizia Cantonale', num: '117', desc: 'Polizia' },
        { label: 'Pompieri', num: '118', desc: 'Vigili del Fuoco' },
        { label: 'Soccorso Aereo REGA', num: '1414', desc: 'Soccorso alpino ed elicotteri' }
      ]
    },
    {
      country: 'Australia',
      flag: '🇦🇺',
      code: 'AU',
      numbers: [
        { label: 'Emergency Triple Zero', num: '000', desc: 'Police, Ambulance, Fire' },
        { label: 'Mobile Secondary Emergency', num: '112', desc: 'Numero da cellulari internazionali' }
      ]
    }
  ];
  const [selectedEmergencyCode, setSelectedEmergencyCode] = useState<string>('IT');

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

        {/* Travel Tools & Destinations Panel */}
        <div className="flex-1 relative z-20 overflow-y-auto custom-scrollbar bg-[var(--bg)] pb-28 lg:pb-8 lg:max-w-md lg:border-l border-[var(--border)] shadow-2xl">
          <div className="p-4 space-y-4">

            {/* Travel Tools Sub-tabs Bar */}
            <div className="flex bg-[var(--surface-variant)] p-1 rounded-2xl border border-[var(--border)] overflow-x-auto no-scrollbar">
              <button
                onClick={() => setTravelActiveTab('destinations')}
                className={`flex-1 py-2 px-1 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                  travelActiveTab === 'destinations' ? 'bg-[var(--card-bg)] text-blue-500 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Mete</span>
              </button>

              <button
                onClick={() => setTravelActiveTab('weather')}
                className={`flex-1 py-2 px-1 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                  travelActiveTab === 'weather' ? 'bg-[var(--card-bg)] text-amber-500 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <CloudSun className="w-3.5 h-3.5" />
                <span>Meteo</span>
              </button>

              <button
                onClick={() => setTravelActiveTab('packing')}
                className={`flex-1 py-2 px-1 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                  travelActiveTab === 'packing' ? 'bg-[var(--card-bg)] text-emerald-500 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Luggage className="w-3.5 h-3.5" />
                <span>Valigia</span>
              </button>

              <button
                onClick={() => setTravelActiveTab('budget')}
                className={`flex-1 py-2 px-1 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                  travelActiveTab === 'budget' ? 'bg-[var(--card-bg)] text-purple-500 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Budget</span>
              </button>

              <button
                onClick={() => setTravelActiveTab('vaccines')}
                className={`flex-1 py-2 px-1 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                  travelActiveTab === 'vaccines' ? 'bg-[var(--card-bg)] text-rose-500 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5" />
                <span>Vaccini</span>
              </button>

              <button
                onClick={() => setTravelActiveTab('emergency')}
                className={`flex-1 py-2 px-1 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                  travelActiveTab === 'emergency' ? 'bg-[var(--card-bg)] text-rose-500 shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Emergenze</span>
              </button>
            </div>

            {/* TAB 1: METE & NAZIONI */}
            {travelActiveTab === 'destinations' && (
              <div className="space-y-4">
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
                      className={`px-4 py-2.5 rounded-2xl font-bold text-xs shrink-0 transition-all snap-start flex items-center gap-2 border cursor-pointer ${selectedNation === null ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-variant)]'}`}
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
                          className={`px-4 py-2.5 rounded-2xl font-bold text-xs shrink-0 transition-all snap-start flex items-center gap-2 border cursor-pointer ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-variant)]'}`}
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
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 px-2.5 py-1.5 rounded-xl inline-flex items-center gap-1.5 ml-1 select-none">
                            🏙️ {cityName}
                          </h4>
                          
                          <div className="space-y-2 pl-2 border-l-2 border-blue-500/20 ml-2">
                            <AnimatePresence>
                              {cityDests.map(dest => (
                                <motion.div
                                  key={dest.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, x: -20 }}
                                  className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden group cursor-pointer transition-all hover:border-blue-500/40 shadow-xs hover:shadow-md"
                                  onClick={(e) => {
                                     if ((e.target as HTMLElement).closest('button')) return;
                                     setExpandedDestId(prev => prev === dest.id ? null : dest.id);
                                     setFocusedDestId(dest.id);
                                  }}
                                >
                                  <div className="p-3.5 flex items-start gap-3 hover:bg-[var(--surface-variant)] transition-colors">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-blue-500/10 border-blue-500/20 text-blue-500 shadow-inner">
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
                                              <span className="text-[9px] font-black text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-md">
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
                                        className="p-1.5 text-[var(--text-muted)] hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all cursor-pointer"
                                        title="Modifica"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setDeletingId(dest.id); }}
                                        className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                                        title="Elimina"
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
                                          <div className="p-3.5 pt-0">
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
            )}

            {/* TAB 2: METEO DESTINAZIONI (SMART & OPEN-METEO LIVE) */}
            {travelActiveTab === 'weather' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CloudSun className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)]">Meteo & Clima</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Live Open-Meteo
                    </span>
                    <button
                      onClick={() => fetchLiveWeather(selectedWeatherCity)}
                      title="Aggiorna meteo"
                      className="p-1 rounded-lg text-[var(--text-muted)] hover:text-amber-500 hover:bg-[var(--surface-variant)] transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isWeatherLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* City selection chips: user destinations + world hubs */}
                <div className="space-y-2">
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {Array.from(new Set([
                      ...destinations.map(d => d.city?.trim() || d.name.trim()).filter(Boolean),
                      'Roma', 'Parigi', 'Londra', 'Tokyo', 'New York', 'Bangkok', 'Madrid', 'Il Cairo'
                    ])).slice(0, 10).map(c => (
                      <button
                        key={c}
                        onClick={() => setSelectedWeatherCity(c)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                          selectedWeatherCity.toLowerCase() === c.toLowerCase()
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border)]'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  {/* Search any city globally */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={weatherSearchQuery}
                        onChange={(e) => setWeatherSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && weatherSearchQuery.trim()) {
                            setSelectedWeatherCity(weatherSearchQuery.trim());
                            fetchLiveWeather(weatherSearchQuery.trim());
                            setWeatherSearchQuery('');
                          }
                        }}
                        placeholder="Cerca qualsiasi città nel mondo (es. Kyoto, Sydney, Rio)..."
                        className="w-full pl-9 pr-3 py-2 bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none focus:border-amber-400 transition-all"
                      />
                    </div>
                    {weatherSearchQuery.trim() && (
                      <button
                        onClick={() => {
                          setSelectedWeatherCity(weatherSearchQuery.trim());
                          fetchLiveWeather(weatherSearchQuery.trim());
                          setWeatherSearchQuery('');
                        }}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0"
                      >
                        Cerca
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Weather Card */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/30 text-[var(--text-main)] relative overflow-hidden shadow-sm">
                  {isWeatherLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-amber-500">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-xs font-bold">Rilevamento meteo in tempo reale...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Condizioni Attuali
                          </span>
                          <h4 className="text-2xl font-black mt-0.5">{liveWeather.city}</h4>
                          <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">{liveWeather.cond}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-4xl mb-1">{liveWeather.icon}</div>
                          <span className="text-3xl font-black">{liveWeather.temp}°C</span>
                        </div>
                      </div>

                      {/* Smart Advice Box */}
                      <div className="mt-4 p-3 rounded-2xl bg-[var(--card-bg)]/90 border border-amber-500/30 shadow-xs flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-0.5">
                            Consiglio Smart per il Viaggiatore
                          </span>
                          <p className="text-xs text-[var(--text-main)] font-semibold leading-relaxed">
                            {liveWeather.advice}
                          </p>
                        </div>
                      </div>

                      {/* Weather Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[var(--border)]/60 text-center">
                        <div className="p-2 rounded-2xl bg-[var(--card-bg)]/80 border border-[var(--border)]">
                          <Droplets className="w-3.5 h-3.5 text-blue-500 mx-auto mb-1" />
                          <span className="text-[9px] text-[var(--text-muted)] uppercase font-bold block">Umidità</span>
                          <span className="text-xs font-black">{liveWeather.humidity}%</span>
                        </div>
                        <div className="p-2 rounded-2xl bg-[var(--card-bg)]/80 border border-[var(--border)]">
                          <Wind className="w-3.5 h-3.5 text-teal-500 mx-auto mb-1" />
                          <span className="text-[9px] text-[var(--text-muted)] uppercase font-bold block">Vento</span>
                          <span className="text-xs font-black">{liveWeather.wind} km/h</span>
                        </div>
                        <div className="p-2 rounded-2xl bg-[var(--card-bg)]/80 border border-[var(--border)]">
                          <CloudSun className="w-3.5 h-3.5 text-amber-500 mx-auto mb-1" />
                          <span className="text-[9px] text-[var(--text-muted)] uppercase font-bold block">Indice UV</span>
                          <span className="text-xs font-black">{liveWeather.uv} / 10</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* 5-Day Forecast */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 px-1">
                    Previsioni Prossimi 5 Giorni
                  </h4>
                  <div className="grid grid-cols-5 gap-1.5">
                    {liveWeather.forecast.map((f, i) => (
                      <div key={i} className="p-2.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] text-center shadow-xs">
                        <span className="text-[10px] font-black uppercase text-[var(--text-muted)] block">{f.day}</span>
                        <div className="text-xl my-1">{f.icon}</div>
                        <span className="text-xs font-black block">{f.max}°</span>
                        <span className="text-[10px] text-[var(--text-muted)] block">{f.min}°</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CHECKLIST VALIGIA REDESIGN */}
            {travelActiveTab === 'packing' && (
              <div className="space-y-4 animate-fade-in">
                {/* Progress Card */}
                <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-500/15 via-teal-500/5 to-transparent border border-emerald-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                        <Luggage className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-[var(--text-main)] block">
                          Preparazione Valigia
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-medium">
                          {packingCompletedCount} di {packingItems.length} oggetti pronti
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {packingProgressPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 rounded-full bg-[var(--surface-variant)] overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${packingProgressPercent}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>

                  {/* Smart Suggestions Action */}
                  <div className="mt-3 pt-3 border-t border-[var(--border)]/60 flex items-center justify-between gap-2">
                    <button
                      onClick={handleSmartSuggestions}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all cursor-pointer border border-emerald-500/20"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>+ Suggerimenti Essenziali</span>
                    </button>
                    <button
                      onClick={() => {
                        const allDone = packingItems.every(i => i.checked);
                        const updated = packingItems.map(i => ({ ...i, checked: !allDone }));
                        setPackingItems(updated);
                        onSave({ ...module, destinations, packingList: updated });
                      }}
                      className="text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      {packingItems.every(i => i.checked) ? 'Deseleziona tutti' : 'Spunta tutti'}
                    </button>
                  </div>
                </div>

                {/* Category filter chips with visual icons */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    { label: 'Tutte', icon: '🧳' },
                    { label: 'Abbigliamento', icon: '👕' },
                    { label: 'Documenti', icon: '📄' },
                    { label: 'Elettronica', icon: '🔌' },
                    { label: 'Toilette', icon: '🧴' },
                    { label: 'Salute', icon: '💊' },
                    { label: 'Accessori', icon: '🎒' }
                  ].map(cat => {
                    const isSelected = packingCatFilter === cat.label;
                    const count = cat.label === 'Tutte' ? packingItems.length : packingItems.filter(i => i.category === cat.label).length;
                    return (
                      <button
                        key={cat.label}
                        onClick={() => setPackingCatFilter(cat.label)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                          isSelected 
                            ? 'bg-emerald-600 text-white shadow-xs' 
                            : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                        <span className="text-[10px] opacity-70">({count})</span>
                      </button>
                    );
                  })}
                </div>

                {/* Add new packing item form */}
                <div className="p-3 bg-[var(--surface-variant)] rounded-2xl border border-[var(--border)] space-y-2">
                  <input
                    type="text"
                    value={newPackingText}
                    onChange={(e) => setNewPackingText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddPackingItem(); }}
                    placeholder="Nome oggetto da mettere in valigia..."
                    className="w-full bg-[var(--card-bg)] px-3 py-2 rounded-xl text-xs font-medium outline-none border border-[var(--border)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-emerald-500"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newPackingCat}
                      onChange={(e) => setNewPackingCat(e.target.value)}
                      className="flex-1 bg-[var(--card-bg)] text-xs font-bold px-3 py-2 rounded-xl border border-[var(--border)] text-[var(--text-main)] outline-none"
                    >
                      <option value="Abbigliamento">👕 Abbigliamento</option>
                      <option value="Documenti">📄 Documenti</option>
                      <option value="Elettronica">🔌 Elettronica</option>
                      <option value="Toilette">🧴 Toilette</option>
                      <option value="Salute">💊 Salute</option>
                      <option value="Accessori">🎒 Accessori</option>
                    </select>
                    <button
                      onClick={handleAddPackingItem}
                      disabled={!newPackingText.trim()}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm shadow-emerald-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Aggiungi</span>
                    </button>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                  {packingItems
                    .filter(it => packingCatFilter === 'Tutte' || it.category === packingCatFilter)
                    .map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleTogglePacking(item.id)}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                          item.checked 
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-[var(--text-muted)] opacity-80' 
                            : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-main)] hover:border-emerald-500/40 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                            item.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--border)] group-hover:border-emerald-500 bg-[var(--surface-variant)]'
                          }`}>
                            {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <span className={`text-xs font-bold truncate ${item.checked ? 'line-through text-[var(--text-muted)]' : ''}`}>
                            {item.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--surface-variant)] text-[var(--text-muted)]">
                            {item.category}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeletePackingItem(item.id); }}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* TAB 4: BUDGET & VALUTA (TUTTE LE VALUTE GLOBALI + UI FIX) */}
            {travelActiveTab === 'budget' && (
              <div className="space-y-4 animate-fade-in">
                {/* Global Currency Converter */}
                <div className="p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5" /> Convertitore Tutte le Valute Mondiali
                    </span>
                    <button
                      onClick={handleSwapCurrencies}
                      className="p-1 rounded-lg text-purple-600 hover:bg-purple-500/10 flex items-center gap-1 text-[10px] font-bold cursor-pointer transition-colors"
                      title="Inverti valute"
                    >
                      <ArrowDownUp className="w-3 h-3" />
                      <span>Inverti</span>
                    </button>
                  </div>

                  {/* Converter Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* From Currency */}
                    <div className="p-3 rounded-2xl bg-[var(--surface-variant)] border border-[var(--border)]">
                      <span className="text-[9px] font-bold text-[var(--text-muted)] block mb-1">Da:</span>
                      <select
                        value={currencyFrom}
                        onChange={(e) => setCurrencyFrom(e.target.value)}
                        className="w-full bg-[var(--card-bg)] text-xs font-bold text-[var(--text-main)] p-1.5 rounded-xl border border-[var(--border)] outline-none mb-2"
                      >
                        {GLOBAL_CURRENCIES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.code} - {c.country} ({c.name})
                          </option>
                        ))}
                      </select>
                      <div className="relative">
                        <input
                          type="number"
                          value={currencyAmount || ''}
                          onChange={(e) => setCurrencyAmount(parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent font-black text-xl outline-none text-[var(--text-main)]"
                          placeholder="100"
                        />
                        <span className="text-xs font-bold text-[var(--text-muted)] absolute right-1 top-1/2 -translate-y-1/2">
                          {currencyFrom}
                        </span>
                      </div>
                    </div>

                    {/* To Currency */}
                    <div className="p-3 rounded-2xl bg-[var(--surface-variant)] border border-[var(--border)]">
                      <span className="text-[9px] font-bold text-[var(--text-muted)] block mb-1">A:</span>
                      <select
                        value={currencyTo}
                        onChange={(e) => setCurrencyTo(e.target.value)}
                        className="w-full bg-[var(--card-bg)] text-xs font-bold text-purple-600 dark:text-purple-400 p-1.5 rounded-xl border border-[var(--border)] outline-none mb-2"
                      >
                        {GLOBAL_CURRENCIES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.code} - {c.country} ({c.name})
                          </option>
                        ))}
                      </select>
                      <div className="relative">
                        <div className="font-black text-xl text-purple-600 dark:text-purple-400 truncate">
                          {convertedAmount}
                        </div>
                        <span className="text-xs font-bold text-purple-500 absolute right-1 top-1/2 -translate-y-1/2">
                          {currencyTo}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Rates Ticker */}
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
                    {['USD', 'GBP', 'JPY', 'CHF', 'THB', 'BRL'].map(code => {
                      const c = GLOBAL_CURRENCIES.find(x => x.code === code);
                      if (!c) return null;
                      return (
                        <button
                          key={code}
                          onClick={() => setCurrencyTo(code)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 transition-all cursor-pointer ${
                            currencyTo === code 
                              ? 'bg-purple-600 text-white' 
                              : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          1 EUR = {c.rateAgainstEur} {code}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Travel Budget Tracker */}
                <div className="p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Budget Viaggio</span>
                      <h4 className="text-xl font-black text-[var(--text-main)]">
                        €{totalSpent} <span className="text-xs font-normal text-[var(--text-muted)]">/ €{totalTripBudget}</span>
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">Rimanenti</span>
                      <h4 className="text-lg font-black text-emerald-500">€{budgetRemaining}</h4>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 rounded-full bg-[var(--surface-variant)] overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${budgetPercent > 90 ? 'bg-rose-500' : budgetPercent > 70 ? 'bg-amber-500' : 'bg-purple-600'}`}
                      style={{ width: `${budgetPercent}%` }}
                    />
                  </div>

                  {/* Fixed Add Expense Form: Clean Responsive Layout (No Overflow) */}
                  <div className="pt-3 border-t border-[var(--border)]/60 space-y-2">
                    <input
                      type="text"
                      placeholder="Descrizione spesa (es. Volo, Hotel, Pranzo)..."
                      value={newExpenseDesc}
                      onChange={(e) => setNewExpenseDesc(e.target.value)}
                      className="w-full bg-[var(--surface-variant)] px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-main)] outline-none border border-[var(--border)] placeholder:text-[var(--text-muted)] focus:border-purple-500"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <select
                        value={newExpenseCat}
                        onChange={(e) => setNewExpenseCat(e.target.value)}
                        className="bg-[var(--surface-variant)] px-2 py-2 rounded-xl text-xs font-bold text-[var(--text-main)] outline-none border border-[var(--border)]"
                      >
                        <option value="Cibo">🍽️ Cibo</option>
                        <option value="Alloggio">🏨 Alloggio</option>
                        <option value="Trasporti">✈️ Trasporti</option>
                        <option value="Attività">🎟️ Attività</option>
                        <option value="Shopping">🛍️ Shopping</option>
                        <option value="Altro">📦 Altro</option>
                      </select>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="0.00"
                          value={newExpenseAmount}
                          onChange={(e) => setNewExpenseAmount(e.target.value)}
                          className="w-full bg-[var(--surface-variant)] px-2.5 py-2 pr-7 rounded-xl text-xs font-bold text-[var(--text-main)] outline-none border border-[var(--border)]"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">€</span>
                      </div>
                      <button
                        onClick={handleAddExpense}
                        disabled={!newExpenseDesc.trim() || !newExpenseAmount}
                        className="col-span-2 sm:col-span-1 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs cursor-pointer active:scale-95 transition-all shadow-md shadow-purple-500/20 flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Aggiungi</span>
                      </button>
                    </div>
                  </div>

                  {/* Expenses List */}
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar pt-1">
                    {expenses.map((exp) => (
                      <div key={exp.id} className="p-2.5 rounded-xl bg-[var(--surface-variant)]/60 border border-[var(--border)] flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-[var(--text-main)]">{exp.desc}</p>
                          <span className="text-[9px] text-[var(--text-muted)]">{exp.category} · {exp.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-[var(--text-main)]">€{exp.amount}</span>
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: VACCINI & REQUISITI SANITARI PAESE */}
            {travelActiveTab === 'vaccines' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-rose-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)]">
                      Vaccini & Sanità
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                    Requisiti Viaggio
                  </span>
                </div>

                {/* Country Quick Chips */}
                <div className="space-y-2">
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {Array.from(new Set([
                      ...destinations.map(d => getDestNation(d, countryGroups)).filter(Boolean),
                      ...TRAVEL_HEALTH_DB.map(h => h.country)
                    ])).slice(0, 12).map(cName => {
                      const info = TRAVEL_HEALTH_DB.find(h => h.country.toLowerCase().includes(cName.toLowerCase()) || cName.toLowerCase().includes(h.country.toLowerCase()));
                      const flag = info ? info.flag : getCountryEmoji(cName);
                      const isSelected = selectedHealthCountry.toLowerCase() === cName.toLowerCase();
                      return (
                        <button
                          key={cName}
                          onClick={() => setSelectedHealthCountry(cName)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          <span>{flag}</span>
                          <span>{cName.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Search Country Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={healthSearchQuery}
                      onChange={(e) => setHealthSearchQuery(e.target.value)}
                      placeholder="Cerca paese di destinazione (es. Kenya, Brasile, Thailandia)..."
                      className="w-full pl-9 pr-3 py-2 bg-[var(--surface-variant)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Country Health Details Card */}
                {(() => {
                  const filteredList = healthSearchQuery.trim()
                    ? TRAVEL_HEALTH_DB.filter(h => h.country.toLowerCase().includes(healthSearchQuery.toLowerCase()))
                    : TRAVEL_HEALTH_DB.filter(h => h.country.toLowerCase().includes(selectedHealthCountry.toLowerCase()) || selectedHealthCountry.toLowerCase().includes(h.country.toLowerCase()));
                  
                  const activeCountryData = filteredList.length > 0 ? filteredList[0] : TRAVEL_HEALTH_DB[0];

                  return (
                    <div className="space-y-3">
                      {/* Country Header Banner */}
                      <div className="p-4 rounded-3xl bg-gradient-to-br from-rose-500/15 via-red-500/5 to-transparent border border-rose-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{activeCountryData.flag}</span>
                            <div>
                              <h4 className="text-base font-black text-[var(--text-main)]">
                                {activeCountryData.country}
                              </h4>
                              <span className="text-[10px] text-[var(--text-muted)] font-semibold">
                                Norme igienico-sanitarie di viaggio
                              </span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            activeCountryData.malariaRisk === 'high' ? 'bg-red-500/15 text-red-500 border-red-500/30' :
                            activeCountryData.malariaRisk === 'moderate' ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' :
                            activeCountryData.malariaRisk === 'low' ? 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30' :
                            'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                          }`}>
                            Malaria: {activeCountryData.malariaRisk === 'high' ? 'Rischio Alto' : activeCountryData.malariaRisk === 'moderate' ? 'Moderato' : activeCountryData.malariaRisk === 'low' ? 'Basso' : 'Nessuno'}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-main)] font-medium leading-relaxed bg-[var(--card-bg)]/80 p-3 rounded-2xl border border-[var(--border)]">
                          💡 {activeCountryData.advisoryNote}
                        </p>
                      </div>

                      {/* Required Vaccines Card */}
                      <div className="p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] space-y-2 shadow-xs">
                        <div className="flex items-center gap-2 text-rose-500">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <h5 className="text-xs font-black uppercase tracking-wider">
                            Vaccinazioni Obbligatorie & Ingresso
                          </h5>
                        </div>
                        <div className="space-y-1.5">
                          {activeCountryData.requiredVaccines.map((v, i) => (
                            <div key={i} className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-start gap-2">
                              <Syringe className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span>{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recommended Vaccines Card */}
                      <div className="p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] space-y-2.5 shadow-xs">
                        <div className="flex items-center gap-2 text-amber-500">
                          <Shield className="w-4 h-4 shrink-0" />
                          <h5 className="text-xs font-black uppercase tracking-wider">
                            Vaccinazioni Fortemente Raccomandate
                          </h5>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {activeCountryData.recommendedVaccines.map((v, i) => (
                            <span key={i} className="text-xs font-bold px-2.5 py-1 rounded-xl bg-[var(--surface-variant)] text-[var(--text-main)] border border-[var(--border)]">
                              💉 {v}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Risks & Safe Drinking Water */}
                      <div className="p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] space-y-2 shadow-xs">
                        <h5 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                          Sicurezza Acqua & Rischi Sanitari
                        </h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className={`p-2.5 rounded-2xl border ${activeCountryData.waterSafety === 'safe' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'}`}>
                            <span className="font-black block text-[10px] uppercase mb-0.5">Acqua del Rubinetto</span>
                            <span className="font-bold">{activeCountryData.waterSafety === 'safe' ? '💧 Potabile e sicura' : '🚫 Bere solo sigillata'}</span>
                          </div>
                          <div className="p-2.5 rounded-2xl bg-[var(--surface-variant)] border border-[var(--border)] text-[var(--text-main)]">
                            <span className="font-black block text-[10px] uppercase mb-0.5 text-[var(--text-muted)]">Cibo & Street Food</span>
                            <span className="font-bold">🍽️ Consumare ben cotto</span>
                          </div>
                        </div>
                      </div>

                      {/* Destination Kit Checklist */}
                      <div className="p-4 rounded-3xl bg-[var(--card-bg)] border border-[var(--border)] space-y-2 shadow-xs">
                        <h5 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-blue-500" /> Farmacia da Viaggio Consigliata
                        </h5>
                        <div className="flex flex-wrap gap-1.5">
                          {activeCountryData.recommendedKit.map((item, i) => (
                            <span key={i} className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              💊 {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Personal Vaccines Passport Checklist */}
                      <div className="p-4 rounded-3xl bg-[var(--surface-variant)]/60 border border-[var(--border)] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> I Miei Vaccini Effettuati
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {userVaccines.size} registrati
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            'Febbre Gialla',
                            'Epatite A',
                            'Epatite B',
                            'Tetano-Difterite',
                            'Febbre Tifoide',
                            'Colera',
                            'Encefalite Giapponese',
                            'Meningococco'
                          ].map(vacName => {
                            const isChecked = userVaccines.has(vacName);
                            return (
                              <button
                                key={vacName}
                                type="button"
                                onClick={() => handleToggleUserVaccine(vacName)}
                                className={`p-2 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                  isChecked 
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 shadow-xs'
                                    : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)] hover:border-emerald-500/30'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                  isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--border)]'
                                }`}>
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className="truncate">{vacName}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB 5: NUMERI EMERGENZA LOCALI */}
            {travelActiveTab === 'emergency' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-rose-500 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Numeri Emergenze Locali
                  </h3>
                  <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">Chiamata Rapida</span>
                </div>

                {/* Country filter */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {EMERGENCY_DB.map(c => (
                    <button
                      key={c.code}
                      onClick={() => setSelectedEmergencyCode(c.code)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                        selectedEmergencyCode === c.code ? 'bg-rose-600 text-white shadow-sm' : 'bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      <span>{c.flag}</span>
                      <span>{c.country.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>

                {/* Emergency Numbers Cards */}
                {(() => {
                  const countryData = EMERGENCY_DB.find(c => c.code === selectedEmergencyCode) || EMERGENCY_DB[0];
                  return (
                    <div className="space-y-2">
                      <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs">
                        <span className="font-black text-rose-600 dark:text-rose-400 block mb-0.5">{countryData.flag} {countryData.country}</span>
                        <p className="text-[11px] text-[var(--text-muted)]">Tocca qualsiasi numero per avviare subito la chiamata dal telefono.</p>
                      </div>

                      {countryData.numbers.map((item, i) => (
                        <a
                          key={i}
                          href={`tel:${item.num.replace(/[^0-9+]/g, '')}`}
                          className="p-3.5 rounded-2xl bg-[var(--card-bg)] hover:bg-rose-500/5 border border-[var(--border)] hover:border-rose-500/40 shadow-xs flex items-center justify-between gap-3 group transition-all cursor-pointer"
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-black text-[var(--text-main)] group-hover:text-rose-500 transition-colors block">
                              {item.label}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                              {item.desc}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-xl border border-rose-500/20">
                              {item.num}
                            </span>
                            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                              <PhoneCall className="w-4 h-4" />
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* FAB Menu removed to avoid overlap */}

      <ConfirmDialog
        isOpen={!!deletingId}
        title="Elimina destinazione"
        message="Questa azione è irreversibile."
        onConfirm={() => { if(deletingId) handleDelete(deletingId); }}
        onCancel={() => setDeletingId(null)}
      />

      {/* Delete country folder confirm */}
      <ConfirmDialog
        isOpen={!!deletingGroupId}
        title="Elimina cartella paese"
        message="Tutti i luoghi all'interno di questo paese verranno conservati e spostati in 'Destinazioni Libere' (senza cartella)."
        onConfirm={() => { if(deletingGroupId) handleDeleteGroup(deletingGroupId); }}
        onCancel={() => setDeletingGroupId(null)}
      />

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
