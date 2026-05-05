import React, { useState, useMemo, useEffect } from 'react';
import { Plus, X, MapPin, Calendar, Trash2, Search, Globe, ChevronLeft, Navigation, Flag } from 'lucide-react';
import { TravelModule, Itinerary, Module } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Globe3D } from './Globe3D';
import { WORLD_CITIES } from '../constants/worldCities';
import { generateUUID } from '../utils/uuid';

interface TravelScreenProps {
  module: TravelModule;
  onClose: () => void;
  onUpdate: (module: Module) => void;
}

export const TravelScreen = ({ module, onClose, onUpdate }: TravelScreenProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [itinerarySearch, setItinerarySearch] = useState('');
  const [formData, setFormData] = useState<Partial<Itinerary>>({
    date: new Date().toISOString().split('T')[0]
  });

  // Filter cities for the search menu
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    return WORLD_CITIES.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.country.toLowerCase().includes(query)
    ).slice(0, 6);
  }, [searchQuery]);

  // Filter displayed itineraries based on search
  const displayedItineraries = useMemo(() => {
    const list = module.itineraries || [];
    if (!itinerarySearch.trim()) return list;
    const q = itinerarySearch.toLowerCase();
    return list.filter(it => 
      it.name.toLowerCase().includes(q) || 
      it.city.toLowerCase().includes(q) || 
      it.country.toLowerCase().includes(q)
    );
  }, [module.itineraries, itinerarySearch]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.city) return;

    const newItem: Itinerary = {
      id: generateUUID(),
      name: formData.name,
      placeName: formData.placeName || '',
      city: formData.city,
      country: formData.country || '',
      lat: formData.lat || 0,
      lng: formData.lng || 0,
      date: formData.date || new Date().toISOString().split('T')[0],
      notes: formData.notes
    };

    const updated = {
      ...module,
      itineraries: [...(module.itineraries || []), newItem]
    };

    onUpdate(updated);
    setIsAdding(false);
    setFormData({ date: new Date().toISOString().split('T')[0] });
    setSearchQuery('');
  };

  const handleDelete = (id: string) => {
    const updated = {
      ...module,
      itineraries: (module.itineraries || []).filter(it => it.id !== id)
    };
    onUpdate(updated);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[var(--bg)] flex flex-col animate-in fade-in duration-300">
      {/* 1. HEADER (STAY AT TOP) */}
      <div className="bg-[var(--card-bg)] border-b border-[var(--border)] p-4 flex items-center justify-between z-[101]">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[var(--surface-variant)] rounded-xl text-[var(--text-muted)] active:scale-90 transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-lg font-black text-[var(--text-main)] leading-none">{module.title || 'I Miei Viaggi'}</h2>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">
              {module.itineraries?.length || 0} Tappe Esplorate
            </p>
          </div>
        </div>
        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
          <Globe className="w-5 h-5 text-emerald-500" />
        </div>
      </div>

      {/* 2. SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        
        {/* GLOBE SECTION (Sopra la barra cerca viaggi) */}
        <div className="w-full h-[320px] bg-[var(--card-bg)] relative shrink-0">
          <Globe3D itineraries={module.itineraries || []} className="w-full h-full" />
        </div>

        {/* SEARCH & ADD SECTION */}
        <div className="p-4 pt-6 max-w-2xl mx-auto w-full sticky top-0 bg-[var(--bg)] z-50">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input 
                type="text"
                placeholder="Cerca viaggi..."
                className="w-full pl-11 pr-4 py-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold text-[var(--text-main)] shadow-sm"
                value={itinerarySearch}
                onChange={e => setItinerarySearch(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setIsAdding(true)}
              className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ITINERARIES LIST */}
        <div className="px-4 pb-20 max-w-2xl mx-auto w-full">
          <div className="space-y-4">
            {displayedItineraries.length === 0 ? (
              <div className="py-20 text-center opacity-50">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
                <p className="font-bold text-sm text-[var(--text-muted)] uppercase tracking-widest">
                  {itinerarySearch ? 'Nessun risultato' : 'Inizia la tua avventura'}
                </p>
              </div>
            ) : (
              displayedItineraries.map((it) => (
                <div 
                  key={it.id}
                  className="bg-[var(--card-bg)] p-5 rounded-3xl border border-[var(--border)] flex items-center justify-between group shadow-sm"
                >
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                      <Flag className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--text-main)]">{it.name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">
                          <MapPin className="w-3 h-3" /> {it.city}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">
                          <Calendar className="w-3 h-3" /> {new Date(it.date).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                      {it.notes && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-2 italic leading-tight">{it.notes}</p>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(it.id)}
                    className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* CREATE MODAL (FULL SCREEN OVERLAY) */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex flex-col p-4 sm:p-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg mx-auto bg-[var(--card-bg)] rounded-[2.5rem] overflow-hidden border border-[var(--border)] shadow-2xl flex flex-col max-h-full"
            >
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-zinc-900/10">
                <h3 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tighter">Nuovo Itinerario</h3>
                <button onClick={() => setIsAdding(false)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full active:scale-90 transition-all">
                  <X className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                {/* 1. Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-2">Esperienza / Luogo</label>
                  <input 
                    type="text" required placeholder="es. Giro in Barca, Museo..."
                    className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl font-bold text-[var(--text-main)] outline-none focus:border-emerald-500"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {/* 2. City Search */}
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-2">Città / Località</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input 
                      type="text" required placeholder="Cerca città nel mondo..."
                      className="w-full pl-11 pr-4 py-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl font-bold text-[var(--text-main)] outline-none focus:border-emerald-500"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  {filteredCities.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-2xl z-[10001] overflow-hidden">
                      {filteredCities.map(city => (
                        <button
                          key={`${city.name}-${city.country}`} type="button"
                          onClick={() => {
                            setFormData({ ...formData, city: city.name, country: city.country, lat: city.lat, lng: city.lng });
                            setSearchQuery(`${city.name}, ${city.country}`);
                          }}
                          className="w-full p-4 text-left hover:bg-emerald-500/10 border-b border-[var(--border)] last:border-0 flex items-center justify-between group"
                        >
                          <div>
                            <p className="font-bold text-[var(--text-main)]">{city.name}</p>
                            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{city.country}</p>
                          </div>
                          <MapPin className="w-4 h-4 text-[var(--text-muted)] group-hover:text-emerald-500" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-2">Data</label>
                    <input 
                      type="date" required
                      className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl font-bold text-[var(--text-main)] outline-none"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-2">Attrazione (Opz)</label>
                    <input 
                      type="text" placeholder="es. Eiffel Tower"
                      className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl font-bold text-[var(--text-main)] outline-none"
                      value={formData.placeName || ''}
                      onChange={e => setFormData({ ...formData, placeName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-2">Note / Ricordi</label>
                  <textarea 
                    placeholder="Com'è stato?"
                    className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl font-bold text-[var(--text-main)] outline-none h-24 resize-none"
                    value={formData.notes || ''}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  Salva Esperienza
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
