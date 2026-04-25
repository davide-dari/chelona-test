import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Anchor, ArrowLeft, MapPin, Plus, Navigation, Trash2, Map } from 'lucide-react';
import { generateUUID } from '../utils/uuid';

interface Address {
  id: string;
  title: string;
  query: string;
}

interface AddressBookScreenProps {
  onClose: () => void;
}

const STORAGE_KEY = 'chelona_address_book';

export const AddressBookScreen = ({ onClose }: AddressBookScreenProps) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newQuery, setNewQuery] = useState('');
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setAddresses(JSON.parse(saved));
    } catch {}
  }, []);

  const saveAddresses = (updated: Address[]) => {
    setAddresses(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newQuery.trim()) return;

    const updated = [
      { id: generateUUID(), title: newTitle.trim(), query: newQuery.trim() },
      ...addresses
    ];
    saveAddresses(updated);
    setIsAdding(false);
    setNewTitle('');
    setNewQuery('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Vuoi davvero eliminare questo indirizzo?')) {
      saveAddresses(addresses.filter(a => a.id !== id));
    }
  };

  const handleNavigate = (query: string) => {
    // Apri sul dispositivo
    const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(query)}`;
    window.open(mapUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="fixed inset-0 z-[200] bg-[var(--bg)] flex flex-col pt-[var(--safe-top)]"
    >
      <header className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-3xl shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2.5 bg-[var(--surface-variant)] hover:bg-[var(--border)] rounded-2xl text-[var(--text-main)] transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-500" />
              Rubrica Indirizzi
            </h2>
            <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">Modalità Pubblica (Non Cifrata)</p>
          </div>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-500/20 transition-all font-bold"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        {addresses.length === 0 && !isAdding ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-[var(--surface-variant)] rounded-full flex items-center justify-center text-[var(--text-muted)] mb-6">
              <Map className="w-12 h-12 opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Nessun Indirizzo</h3>
            <p className="text-[var(--text-muted)] max-w-sm mb-8">
              Aggiungi qui i tuoi indirizzi principali o di lavoro. Saranno accessibili rapidamente senza dover sbloccare l'applicazione.
            </p>
            <button
               onClick={() => setIsAdding(true)}
               className="px-8 py-4 bg-[var(--accent)] text-white font-bold rounded-2xl shadow-xl shadow-[var(--accent)]/30"
            >
               Aggiungi il primo indirizzo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <AnimatePresence>
                {addresses.map(addr => (
                  <motion.div
                    key={addr.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[var(--card-bg)] border border-[var(--border)] rounded-[2rem] overflow-hidden shadow-sm flex flex-col relative group"
                  >
                     {/* iFrame Map Preview */}
                     <div className="w-full h-32 bg-[var(--surface-variant)] relative">
                         <iframe 
                            width="100%" 
                            height="100%" 
                            frameBorder="0" 
                            scrolling="no" 
                            marginHeight={0} 
                            marginWidth={0} 
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(addr.query)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                         />
                         <div className="absolute inset-0 bg-transparent" /> {/* Overlay to prevent iframe scrolling interception */}
                     </div>
                     
                     <div className="p-5 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                           <div>
                             <h4 className="font-bold text-lg text-[var(--text-main)] mb-1">{addr.title}</h4>
                             <p className="text-xs font-semibold text-[var(--text-muted)] line-clamp-2 leading-relaxed">{addr.query}</p>
                           </div>
                           <button 
                             onClick={() => handleDelete(addr.id)}
                             className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                           >
                             <Trash2 className="w-5 h-5" />
                           </button>
                        </div>
                        
                        <div className="mt-auto pt-2">
                           <button
                             onClick={() => handleNavigate(addr.query)}
                             className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white rounded-2xl font-bold tracking-wide flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20"
                           >
                             <Navigation className="w-5 h-5" />
                             Naviga 
                           </button>
                        </div>
                     </div>
                  </motion.div>
                ))}
             </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[250] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative bg-[var(--card-bg)] border-t border-[var(--border)] rounded-t-[2.5rem] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl"
            >
               <h3 className="text-xl font-bold text-[var(--text-main)] mb-6">Nuovo Indirizzo</h3>
               <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Titolo</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      placeholder="Es. Casa, Lavoro, Ospedale..."
                      className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold text-[var(--text-main)]"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">Indirizzo o Coordinate</label>
                    <input
                      type="text"
                      value={newQuery}
                      onChange={e => setNewQuery(e.target.value)}
                      placeholder="Es. Via Roma 1, Milano"
                      className="w-full p-4 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold text-[var(--text-main)]"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="flex-1 py-4 bg-[var(--surface-variant)] text-[var(--text-main)] rounded-2xl font-bold"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      disabled={!newTitle.trim() || !newQuery.trim()}
                      className="flex-1 py-4 bg-[var(--accent)] disabled:opacity-50 text-white rounded-2xl font-bold shadow-lg shadow-[var(--accent)]/30"
                    >
                      Salva Indirizzo
                    </button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
