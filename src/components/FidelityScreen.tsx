import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, Trash2, CreditCard, QrCode, Type, Palette, Maximize, X, Image as ImageIcon, Upload } from 'lucide-react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { FidelityModule, FidelityCard } from '../types';

interface FidelityScreenProps {
  module: FidelityModule;
  onClose: () => void;
  onSave: (module: FidelityModule) => void;
}

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', 
  '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#1e293b',
  '#000000', '#ffffff'
];

const FORMATS: { value: FidelityCard['format'], label: string }[] = [
  { value: 'EAN13', label: 'EAN-13 (Classico Supermercato)' },
  { value: 'CODE128', label: 'CODE-128 (Universale)' },
  { value: 'CODE39', label: 'CODE-39 (Alfanumerico)' },
  { value: 'EAN8', label: 'EAN-8 (Corto)' },
  { value: 'UPC', label: 'UPC (Formato Americano)' },
  { value: 'QR', label: 'QR Code' },
  { value: 'MANUAL', label: 'Manuale (Nessun Codice a Barre)' }
];

export function FidelityScreen({ module, onClose, onSave }: FidelityScreenProps) {
  const [view, setView] = useState<'list' | 'add' | 'view'>('list');
  const [selectedCard, setSelectedCard] = useState<FidelityCard | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [format, setFormat] = useState<FidelityCard['format']>('EAN13');
  const [color, setColor] = useState(COLORS[0]);
  const [logo, setLogo] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cards = module.cards || [];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCard = () => {
    if (!name.trim() || !code.trim()) return;
    
    const newCard: FidelityCard = {
      id: crypto.randomUUID(),
      name: name.trim(),
      code: code.trim().toUpperCase(),
      format,
      color,
      logo: logo || undefined
    };

    onSave({
      ...module,
      cards: [...cards, newCard]
    });

    setView('list');
    setName('');
    setCode('');
    setFormat('EAN13');
    setColor(COLORS[0]);
    setLogo('');
  };

  const handleDeleteCard = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Vuoi davvero eliminare questa carta?')) {
      onSave({
        ...module,
        cards: cards.filter(c => c.id !== id)
      });
      if (selectedCard?.id === id) {
        setView('list');
      }
    }
  };

  const getContrastText = (hexcolor: string) => {
    if (hexcolor === '#ffffff') return 'text-slate-900';
    return 'text-white';
  };

  const renderBarcode = (card: FidelityCard) => {
    if (card.format === 'MANUAL') {
      return (
        <div className="bg-white p-6 rounded-xl shadow-sm inline-flex items-center justify-center min-w-[200px]">
          <span className="text-3xl font-mono font-black text-slate-800 tracking-widest">{card.code}</span>
        </div>
      );
    }

    if (card.format === 'QR') {
      return (
        <div className="bg-white p-4 rounded-xl shadow-sm inline-block">
          <QRCodeSVG value={card.code} size={200} level="H" />
        </div>
      );
    }

    return (
      <div className="bg-white px-6 py-4 rounded-xl shadow-sm inline-block overflow-hidden max-w-full">
        <Barcode 
          value={card.code} 
          format={card.format as any}
          width={2.5}
          height={100}
          displayValue={true}
          background="#ffffff"
          lineColor="#000000"
          margin={0}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[150] bg-[#f2f2f7] dark:bg-black flex flex-col h-[100dvh] overflow-hidden font-sans">
      <div className="h-20 bg-white/80 dark:bg-black/80 backdrop-blur-3xl px-6 flex items-center justify-between shrink-0 z-20 safe-area-header border-b border-black/5 dark:border-white/5">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-[300px]">
            {view === 'add' ? 'Nuova Carta' : view === 'view' ? selectedCard?.name : module.title || 'Portafoglio'}
          </h2>
        </div>
        
        {view === 'list' ? (
          <button
            onClick={onClose}
            className="w-10 h-10 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full flex items-center justify-center transition-all active:scale-95"
          >
            <X className="w-5 h-5 text-slate-900 dark:text-white" />
          </button>
        ) : (
          <button
            onClick={() => setView('list')}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Chiudi
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden safe-area-bottom pb-20">
        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 sm:p-6 max-w-lg mx-auto flex flex-col items-center relative"
            >
              <div className="w-full relative min-h-[400px]">
                {cards.map((card, index) => (
                  <motion.div
                    key={card.id}
                    layoutId={`card-${card.id}`}
                    onClick={() => {
                      setSelectedCard(card);
                      setView('view');
                    }}
                    style={{ 
                      backgroundColor: card.color,
                      top: `${index * 80}px`,
                      zIndex: index
                    }}
                    className="w-full h-52 rounded-[1.5rem] p-6 flex flex-col justify-between cursor-pointer active:scale-[0.98] transition-transform shadow-2xl absolute left-0 right-0 overflow-hidden group border border-white/20"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button
                        onClick={(e) => handleDeleteCard(card.id, e)}
                        className="w-8 h-8 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-4">
                        {card.logo ? (
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center shrink-0 p-1">
                            <img src={card.logo} alt="Logo" className="w-full h-full object-contain rounded-full" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shrink-0">
                            {card.format === 'QR' ? (
                              <QrCode className={`w-6 h-6 ${getContrastText(card.color)}`} />
                            ) : (
                              <CreditCard className={`w-6 h-6 ${getContrastText(card.color)}`} />
                            )}
                          </div>
                        )}
                        <h3 className={`font-black text-2xl truncate ${getContrastText(card.color)} drop-shadow-sm`}>{card.name}</h3>
                      </div>
                    </div>

                    <div className="relative z-10 flex justify-end">
                      <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                        <span className={`${getContrastText(card.color)} text-sm font-bold font-mono uppercase tracking-widest`}>{card.code}</span>
                      </div>
                    </div>
                    
                    {/* Decorative reflection */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-50 pointer-events-none mix-blend-overlay" />
                  </motion.div>
                ))}
              </div>

              {cards.length === 0 && (
                <div className="text-center mt-20 opacity-50">
                  <CreditCard className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-500 font-medium">Nessuna carta aggiunta.</p>
                </div>
              )}

              <div 
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
                style={{ top: cards.length > 0 ? `${cards.length * 80 + 100}px` : 'auto', bottom: cards.length > 0 ? 'auto' : '2rem' }}
              >
                <button
                  onClick={() => setView('add')}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-4 rounded-full font-black shadow-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all mx-auto mt-12"
                >
                  <Plus className="w-5 h-5" />
                  Aggiungi Carta
                </button>
              </div>
            </motion.div>
          )}

          {view === 'add' && (
            <motion.div
              key="add"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="p-6 max-w-xl mx-auto flex flex-col gap-6"
            >
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-black/5 dark:border-white/5 p-8 shadow-xl space-y-6">
                
                {/* Logo Upload */}
                <div className="flex flex-col items-center gap-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-500 transition-colors"
                  >
                    {logo ? (
                      <img src={logo} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400">
                        <ImageIcon className="w-8 h-8 mb-1" />
                        <span className="text-[10px] font-bold">LOGO</span>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  {logo && (
                    <button onClick={() => setLogo('')} className="text-xs text-red-500 font-bold">
                      Rimuovi Logo
                    </button>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    <Type className="w-4 h-4 text-slate-500" />
                    Nome Negozio / Carta
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Es. Esselunga, IKEA, Palestra"
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none text-slate-900 dark:text-white rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-slate-400 font-bold"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    <QrCode className="w-4 h-4 text-slate-500" />
                    Codice Carta
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Il numero sotto il codice a barre"
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none text-slate-900 dark:text-white rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono uppercase font-bold text-lg"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Formato Codice
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none text-slate-900 dark:text-white rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-slate-400 font-bold appearance-none"
                  >
                    {FORMATS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                    <Palette className="w-4 h-4 text-slate-500" />
                    Colore Carta
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-12 h-12 rounded-full transition-all active:scale-90 border-2 ${color === c ? 'border-slate-400 dark:border-white scale-110 shadow-lg' : 'border-transparent'}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handleSaveCard}
                    disabled={!name.trim() || !code.trim()}
                    className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95 shadow-xl"
                  >
                    Salva Carta
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'view' && selectedCard && (
            <motion.div
              key="view"
              layoutId={`card-${selectedCard.id}`}
              style={{ backgroundColor: selectedCard.color }}
              className="min-h-[100dvh] absolute inset-0 z-50 flex flex-col p-6 items-center justify-center overflow-hidden"
            >
              <div className="absolute top-6 left-6 z-[60]">
                <button
                  onClick={() => setView('list')}
                  className={`w-10 h-10 ${selectedCard.color === '#ffffff' ? 'bg-black/10 hover:bg-black/20' : 'bg-white/20 hover:bg-white/30'} rounded-full flex items-center justify-center transition-all active:scale-95 backdrop-blur-md`}
                >
                  <ChevronLeft className={`w-6 h-6 ${getContrastText(selectedCard.color)}`} />
                </button>
              </div>

              <div className="w-full max-w-sm flex flex-col items-center z-10 mt-10">
                
                {selectedCard.logo && (
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-white shadow-2xl mb-6 p-2 ring-4 ring-white/30">
                    <img src={selectedCard.logo} alt="Logo" className="w-full h-full object-contain rounded-full" />
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h2 className={`text-4xl font-black ${getContrastText(selectedCard.color)} drop-shadow-md mb-2`}>{selectedCard.name}</h2>
                </div>

                <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-8 w-full flex flex-col items-center gap-6 shadow-2xl border border-white/50">
                  <div className="w-full flex items-center justify-center overflow-hidden">
                    {renderBarcode(selectedCard)}
                  </div>
                  
                  {selectedCard.format !== 'MANUAL' && (
                    <div className="bg-slate-100 px-6 py-2 rounded-xl">
                      <span className="text-slate-800 font-mono font-bold tracking-widest text-lg">
                        {selectedCard.code}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex flex-col items-center gap-2 mt-4">
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <Maximize className="w-4 h-4" />
                      Luminosità Schermo Massima per la scansione
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-[150%] h-[150%] bg-gradient-to-b from-white/30 to-transparent pointer-events-none transform -translate-y-1/2 rotate-12" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
