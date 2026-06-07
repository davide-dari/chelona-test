import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FurnitureModule, FurnitureRoom, FurnitureItem } from '../types';
import { ArrowLeft, Plus, Trash2, Link as LinkIcon, Image as ImageIcon, Loader2, Tag, ExternalLink } from 'lucide-react';
import { generateUUID } from '../utils/uuid';
import { CapacitorHttp } from '@capacitor/core';
import { ConfirmDialog } from './ConfirmDialog';

interface FurnitureScreenProps {
  module: FurnitureModule;
  onSave: (m: FurnitureModule) => void;
  onClose: () => void;
}

export const FurnitureScreen = ({ module, onSave, onClose }: FurnitureScreenProps) => {
  const [data, setData] = useState<FurnitureModule>(module);
  const [newRoomName, setNewRoomName] = useState('');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(module.rooms.length > 0 ? module.rooms[0].id : null);
  
  const [newItemLink, setNewItemLink] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [deleteItemConfirm, setDeleteItemConfirm] = useState<{ roomId: string; itemId: string } | null>(null);

  useEffect(() => {
    if (!activeRoomId && data.rooms.length > 0) {
      setActiveRoomId(data.rooms[0].id);
    }
  }, [data.rooms, activeRoomId]);

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    const newRoom: FurnitureRoom = {
      id: generateUUID(),
      name: newRoomName.trim(),
      items: []
    };
    const updatedData = { ...data, rooms: [...data.rooms, newRoom] };
    setData(updatedData);
    setNewRoomName('');
    setActiveRoomId(newRoom.id);
    onSave(updatedData);
  };

  const handleScrapeAndAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemLink.trim() || !activeRoomId) return;

    let url = newItemLink.trim();
    if (!url.startsWith('http')) url = 'https://' + url;

    setIsScraping(true);
    let title = 'Nuovo Acquisto';
    let image = '';
    let price = '';

    try {
      const response = await CapacitorHttp.get({ url, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      const html = typeof response.data === 'string' ? response.data : '';

      if (html) {
        const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i);
        const titleTag = html.match(/<title>([^<]+)<\/title>/i);
        title = (ogTitle && ogTitle[1]) || (titleTag && titleTag[1]) || url;

        const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
        image = ogImage ? ogImage[1] : '';

        // Try basic price matching (generic or amazon)
        const ogPrice = html.match(/<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["'][^>]*>/i);
        const amzPriceWhole = html.match(/<span[^>]*class=["']a-price-whole["'][^>]*>([^<]+)<\/span>/i);
        const genericPrice = html.match(/€\s*([0-9.,]+)/i);

        if (ogPrice) price = ogPrice[1];
        else if (amzPriceWhole) price = amzPriceWhole[1].replace(/<[^>]+>/g, '').trim();
        else if (genericPrice) price = genericPrice[1];
      }
    } catch (err) {
      console.error('Scrape failed', err);
    }

    const newItem: FurnitureItem = {
      id: generateUUID(),
      title: title.substring(0, 80) + (title.length > 80 ? '...' : ''),
      imageUrl: image,
      price: price,
      link: url
    };

    const updatedRooms = data.rooms.map(r => {
      if (r.id === activeRoomId) {
        return { ...r, items: [newItem, ...r.items] };
      }
      return r;
    });

    const updatedData = { ...data, rooms: updatedRooms };
    setData(updatedData);
    setNewItemLink('');
    setIsScraping(false);
    onSave(updatedData);
  };

  const handleDeleteItem = (roomId: string, itemId: string) => {
    const updatedRooms = data.rooms.map(r => {
      if (r.id === roomId) {
        return { ...r, items: r.items.filter(i => i.id !== itemId) };
      }
      return r;
    });
    const updatedData = { ...data, rooms: updatedRooms };
    setData(updatedData);
    onSave(updatedData);
    setDeleteItemConfirm(null);
  };

  const activeRoom = data.rooms.find(r => r.id === activeRoomId);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full w-full max-w-4xl mx-auto bg-[var(--bg)]">
      <header className="flex items-center justify-between p-4 lg:p-6 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <input
            type="text"
            value={data.title}
            onChange={e => {
              const updated = { ...data, title: e.target.value };
              setData(updated);
              onSave(updated);
            }}
            className="text-xl lg:text-2xl font-bold bg-transparent border-none outline-none text-[var(--text-main)] w-full placeholder:text-[var(--text-muted)]"
            placeholder="Nome Progetto Mobili..."
          />
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Sidebar Rooms */}
        <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-[var(--border)] bg-[var(--surface-variant)] flex flex-col shrink-0">
          <div className="p-4 border-b border-[var(--border)]">
            <form onSubmit={handleAddRoom} className="flex gap-2">
              <input
                type="text"
                placeholder="Nuova Stanza..."
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                className="flex-1 min-w-0 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
              <button type="submit" disabled={!newRoomName.trim()} className="p-2 bg-teal-500 text-white rounded-xl disabled:opacity-50">
                <Plus className="w-5 h-5" />
              </button>
            </form>
          </div>
          <div className="flex-1 overflow-y-auto p-2 flex lg:flex-col gap-2 custom-scrollbar">
            {data.rooms.map(room => (
              <button
                key={room.id}
                onClick={() => setActiveRoomId(room.id)}
                className={`flex-shrink-0 lg:flex-shrink w-auto lg:w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap lg:whitespace-normal ${activeRoomId === room.id ? 'bg-teal-500/10 text-teal-600 border border-teal-500/20' : 'text-[var(--text-muted)] hover:bg-[var(--bg)] border border-transparent'}`}
              >
                {room.name} <span className="ml-2 opacity-50 font-normal">({room.items.length})</span>
              </button>
            ))}
            {data.rooms.length === 0 && (
              <p className="p-4 text-sm text-center text-[var(--text-muted)]">Nessuna stanza creata.</p>
            )}
          </div>
        </div>

        {/* Room Content */}
        <div className="flex-1 flex flex-col bg-[var(--bg)] overflow-hidden">
          {activeRoom ? (
            <>
              <div className="p-4 lg:p-6 border-b border-[var(--border)] bg-[var(--card-bg)] shadow-sm z-10">
                <form onSubmit={handleScrapeAndAddItem} className="relative max-w-2xl mx-auto">
                  <div className="relative flex items-center">
                    <div className="absolute left-4 text-[var(--text-muted)]">
                      <LinkIcon className="w-5 h-5" />
                    </div>
                    <input
                      type="url"
                      placeholder="Incolla link prodotto (es. Amazon, IKEA...)"
                      value={newItemLink}
                      onChange={e => setNewItemLink(e.target.value)}
                      className="w-full bg-[var(--surface-variant)] border-2 border-[var(--border)] rounded-2xl py-4 pl-12 pr-24 outline-none focus:border-teal-500 transition-colors text-[var(--text-main)] placeholder:text-[var(--text-muted)] font-medium"
                    />
                    <button
                      type="submit"
                      disabled={!newItemLink.trim() || isScraping}
                      className="absolute right-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:hover:bg-teal-500 flex items-center gap-2"
                    >
                      {isScraping ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Aggiungi'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar">
                {activeRoom.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] text-center px-4">
                    <Armchair className="w-16 h-16 mb-4 opacity-20" />
                    <p className="font-medium text-lg">La stanza è vuota</p>
                    <p className="text-sm mt-2 opacity-70">Incolla un link in alto per aggiungere il primo acquisto!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    <AnimatePresence>
                      {activeRoom.items.map(item => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col"
                        >
                          <div className="h-48 bg-[var(--surface-variant)] flex items-center justify-center overflow-hidden relative">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-12 h-12 text-[var(--text-muted)] opacity-20" />
                            )}
                            <button
                              onClick={() => setDeleteItemConfirm({ roomId: activeRoom.id, itemId: item.id })}
                              className="absolute top-3 right-3 p-2 bg-red-500/80 backdrop-blur text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="p-4 flex flex-col flex-1">
                            <h4 className="font-bold text-[var(--text-main)] text-sm line-clamp-2 leading-snug mb-2 flex-1" title={item.title}>
                              {item.title}
                            </h4>
                            
                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--border)]">
                              <div className="flex items-center gap-1.5 text-teal-600 font-black">
                                <Tag className="w-4 h-4" />
                                <span>{item.price ? `€ ${item.price}` : '---'}</span>
                              </div>
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-[var(--surface-variant)] hover:bg-teal-500/10 hover:text-teal-600 rounded-xl transition-colors text-[var(--text-muted)]"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
              <p>Seleziona o crea una stanza</p>
            </div>
          )}
        </div>
      </div>

      {deleteItemConfirm && (
        <ConfirmDialog
          title="Elimina Acquisto"
          message="Sei sicuro di voler rimuovere questo elemento dalla stanza?"
          confirmText="Elimina"
          cancelText="Annulla"
          onConfirm={() => handleDeleteItem(deleteItemConfirm.roomId, deleteItemConfirm.itemId)}
          onCancel={() => setDeleteItemConfirm(null)}
        />
      )}
    </motion.div>
  );
};
