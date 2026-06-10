import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FurnitureModule, FurnitureRoom, FurnitureItem } from '../types';
import { 
  ArrowLeft, Plus, Trash2, Link as LinkIcon, Image as ImageIcon, Loader2, 
  Tag, ExternalLink, Armchair, Edit2, X, Sparkles, 
  Utensils, Tv, Bed, Bath, Layers, Grid, Sliders, Settings, Info,
  HelpCircle, Trash, Download, FileText, BookOpen, DoorOpen, Flower2
} from 'lucide-react';
import { generateUUID } from '../utils/uuid';
import { CapacitorHttp } from '@capacitor/core';
import { ConfirmDialog } from './ConfirmDialog';

interface FurnitureScreenProps {
  module: FurnitureModule;
  onSave: (m: FurnitureModule) => void;
  onClose: () => void;
}

const CATEGORIES = [
  "Sedie & Poltrone",
  "Tavoli & Scrivanie",
  "Letti & Materassi",
  "Contenitori & Armadi",
  "Elettrodomestici",
  "Illuminazione",
  "Decorazioni & Tessili",
  "Altro"
];

const ROOM_TYPES = [
  { name: 'Soggiorno', icon: Tv, color: 'text-indigo-500 bg-indigo-500/10' },
  { name: 'Cucina', icon: Utensils, color: 'text-orange-500 bg-orange-500/10' },
  { name: 'Camera da letto', icon: Bed, color: 'text-rose-500 bg-rose-500/10' },
  { name: 'Bagno', icon: Bath, color: 'text-blue-500 bg-blue-500/10' },
  { name: 'Studio', icon: BookOpen, color: 'text-purple-500 bg-purple-500/10' },
  { name: 'Ingresso', icon: DoorOpen, color: 'text-amber-500 bg-amber-500/10' },
  { name: 'Giardino', icon: Flower2, color: 'text-emerald-500 bg-emerald-500/10' },
  { name: 'Altro', icon: Armchair, color: 'text-teal-500 bg-teal-500/10' }
];

const guessCategory = (title: string, desc: string): string => {
  const text = `${title} ${desc}`.toLowerCase();
  if (/sedia|sedie|poltron|chair|armchair|sgabell|stool/i.test(text)) return "Sedie & Poltrone";
  if (/tavolo|tavoli|table|scrivani|desk|consolle/i.test(text)) return "Tavoli & Scrivanie";
  if (/letto|letti|bed|materass|mattress|comodin|nightstand/i.test(text)) return "Letti & Materassi";
  if (/armadio|guardaroba|wardrobe|cassett|dresser|credenza|scaffal|libreri|cabinet|chest/i.test(text)) return "Contenitori & Armadi";
  if (/frigo|forno|microonde|lavatric|lavastovigli|tv|television|asciugatric/i.test(text)) return "Elettrodomestici";
  if (/lampad|lamp|luce|luci|light|lampadario|faretto|applique/i.test(text)) return "Illuminazione";
  if (/specchio|mirror|quadro|tappet|rug|tenda|curtain|vaso|cuscin|pillow|poster|piant|plant/i.test(text)) return "Decorazioni & Tessili";
  return "Altro";
};

const parseDimensions = (text: string): { width?: number; depth?: number; height?: number } => {
  const regex3D = /(\d+(?:[.,]\d+)?)\s*(?:x|×|X)\s*(\d+(?:[.,]\d+)?)\s*(?:x|×|X)\s*(\d+(?:[.,]\d+)?)\s*(?:cm|mm|m)?/i;
  const match3D = text.match(regex3D);
  if (match3D) {
    let w = parseFloat(match3D[1].replace(',', '.'));
    let d = parseFloat(match3D[2].replace(',', '.'));
    let h = parseFloat(match3D[3].replace(',', '.'));
    if (text.includes(match3D[0]) && /[^c]m/i.test(match3D[0])) {
      w *= 100;
      d *= 100;
      h *= 100;
    } else if (text.includes(match3D[0]) && /mm/i.test(match3D[0])) {
      w /= 10;
      d /= 10;
      h /= 10;
    }
    return { width: Math.round(w), depth: Math.round(d), height: Math.round(h) };
  }

  const regex2D = /(\d+(?:[.,]\d+)?)\s*(?:x|×|X)\s*(\d+(?:[.,]\d+)?)\s*(?:cm|mm|m)?/i;
  const match2D = text.match(regex2D);
  if (match2D) {
    let w = parseFloat(match2D[1].replace(',', '.'));
    let d = parseFloat(match2D[2].replace(',', '.'));
    if (text.includes(match2D[0]) && /[^c]m/i.test(match2D[0])) {
      w *= 100;
      d *= 100;
    } else if (text.includes(match2D[0]) && /mm/i.test(match2D[0])) {
      w /= 10;
      d /= 10;
    }
    return { width: Math.round(w), depth: Math.round(d) };
  }

  return {};
};

export const FurnitureScreen = ({ module, onSave, onClose }: FurnitureScreenProps) => {
  const [data, setData] = useState<FurnitureModule>(module);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(module.rooms.length > 0 ? module.rooms[0].id : null);
  
  // Scraper State
  const [newItemLink, setNewItemLink] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
  const [targetRoomId, setTargetRoomId] = useState<string>('');

  useEffect(() => {
    if (isAddLinkModalOpen) {
      setTargetRoomId(activeRoomId || (data.rooms.length > 0 ? data.rooms[0].id : ''));
    }
  }, [isAddLinkModalOpen, activeRoomId, data.rooms]);

  // Category Filtering
  const [activeCategory, setActiveCategory] = useState<string>('Tutti');

  // Room Modal State (Create/Edit)
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<FurnitureRoom | null>(null);
  const [roomForm, setRoomForm] = useState({
    name: '',
    roomType: 'Soggiorno',
    width: 400,   // cm
    length: 300,  // cm
    height: 270   // cm
  });

  // Details Modal & Background Sync State
  const [selectedDetailsItem, setSelectedDetailsItem] = useState<FurnitureItem | null>(null);
  const [detailForm, setDetailForm] = useState<FurnitureItem | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  useEffect(() => {
    if (!activeRoomId && data.rooms.length > 0) {
      setActiveRoomId(data.rooms[0].id);
    }
  }, [data.rooms, activeRoomId]);

  const activeRoom = useMemo(() => {
    return data.rooms.find(r => r.id === activeRoomId) || null;
  }, [data.rooms, activeRoomId]);

  // Filter items in the active room by category
  const filteredItems = useMemo(() => {
    if (!activeRoom) return [];
    if (activeCategory === 'Tutti') return activeRoom.items;
    return activeRoom.items.filter(item => item.category === activeCategory);
  }, [activeRoom, activeCategory]);

  // Open modal to add a room
  const handleOpenAddRoomModal = () => {
    setEditingRoom(null);
    setRoomForm({
      name: '',
      roomType: 'Soggiorno',
      width: 400,
      length: 300,
      height: 270
    });
    setIsRoomModalOpen(true);
  };

  // Open modal to edit current room
  const handleOpenEditRoomModal = () => {
    if (!activeRoom) return;
    setEditingRoom(activeRoom);
    setRoomForm({
      name: activeRoom.name,
      roomType: activeRoom.roomType || 'Soggiorno',
      width: activeRoom.width || 400,
      length: activeRoom.length || 300,
      height: activeRoom.height || 270
    });
    setIsRoomModalOpen(true);
  };

  // Save room (Create/Update)
  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.name.trim()) return;

    let updatedRooms: FurnitureRoom[];
    let newId = activeRoomId;

    if (editingRoom) {
      // Edit Room
      updatedRooms = data.rooms.map(r => {
        if (r.id === editingRoom.id) {
          return {
            ...r,
            name: roomForm.name.trim(),
            roomType: roomForm.roomType,
            width: roomForm.width,
            length: roomForm.length,
            height: roomForm.height
          };
        }
        return r;
      });
    } else {
      // Create Room
      const newRoom: FurnitureRoom = {
        id: generateUUID(),
        name: roomForm.name.trim(),
        roomType: roomForm.roomType,
        width: roomForm.width,
        length: roomForm.length,
        height: roomForm.height,
        items: []
      };
      updatedRooms = [...data.rooms, newRoom];
      newId = newRoom.id;
    }

    const updatedData = { ...data, rooms: updatedRooms };
    setData(updatedData);
    setActiveRoomId(newId);
    setIsRoomModalOpen(false);
    onSave(updatedData);
  };

  // Delete current room
  const handleDeleteRoom = () => {
    if (!activeRoomId) return;
    const updatedRooms = data.rooms.filter(r => r.id !== activeRoomId);
    const updatedData = { ...data, rooms: updatedRooms };
    
    setData(updatedData);
    setActiveRoomId(updatedRooms.length > 0 ? updatedRooms[0].id : null);
    setIsRoomModalOpen(false);
    onSave(updatedData);
  };

  // Scrape and add item
  const handleScrapeAndAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemLink.trim() || !targetRoomId) return;

    let url = newItemLink.trim();
    if (!url.startsWith('http')) url = 'https://' + url;

    setIsScraping(true);
    let title = 'Nuovo Oggetto';
    let image = '';
    let price = '';
    let description = '';
    let category = 'Altro';
    let width = 50;
    let depth = 50;
    let height = 50;
    let manualUrl = '';

    try {
      const response = await CapacitorHttp.get({ 
        url, 
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' 
        } 
      });
      const html = typeof response.data === 'string' ? response.data : '';

      if (html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const metaTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc.querySelector('meta[name="title"]')?.getAttribute('content');
        const titleTag = doc.querySelector('title')?.innerText;
        const amzTitle = doc.querySelector('#productTitle')?.textContent?.trim();
        title = amzTitle || metaTitle || titleTag || url;

        const metaImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || doc.querySelector('meta[name="image"]')?.getAttribute('content');
        const amzImage = doc.querySelector('#landingImage')?.getAttribute('src');
        const ikeaImage = doc.querySelector('.pip-image')?.getAttribute('src');
        image = amzImage || ikeaImage || metaImage || '';

        const metaDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || doc.querySelector('meta[name="description"]')?.getAttribute('content');
        const amzDesc = doc.querySelector('#feature-bullets')?.textContent?.trim() || doc.querySelector('#productDescription')?.textContent?.trim();
        description = amzDesc || metaDesc || '';

        const ogPrice = doc.querySelector('meta[property="product:price:amount"]')?.getAttribute('content');
        const amzPriceWhole = doc.querySelector('.a-price-whole')?.textContent?.trim()?.replace(/[^0-9,]/g, '');
        const ikeaPrice = doc.querySelector('.pip-temp-price__integer')?.textContent?.trim();
        
        if (ogPrice) price = ogPrice;
        else if (amzPriceWhole) price = amzPriceWhole;
        else if (ikeaPrice) price = ikeaPrice;
        else {
          const genericPrice = html.match(/€\s*([0-9.,]+)/i);
          if (genericPrice) price = genericPrice[1];
        }

        category = guessCategory(title, description);

        const parsedDims = parseDimensions(`${title} ${description}`);
        width = parsedDims.width || 50;
        depth = parsedDims.depth || 50;
        height = parsedDims.height || 50;

        const pdfLink = Array.from(doc.querySelectorAll('a[href]'))
          .map(a => a.getAttribute('href'))
          .find(href => href && href.toLowerCase().endsWith('.pdf'));
        if (pdfLink) {
          if (pdfLink.startsWith('http')) {
            manualUrl = pdfLink;
          } else {
            try {
              manualUrl = new URL(pdfLink, url).toString();
            } catch {
              manualUrl = pdfLink;
            }
          }
        }
      }
    } catch (err) {
      console.error('Scrape failed', err);
    }

    const newItem: FurnitureItem = {
      id: generateUUID(),
      title: title.substring(0, 100) + (title.length > 100 ? '...' : ''),
      description: description.substring(0, 500) + (description.length > 500 ? '...' : ''),
      imageUrl: image,
      price: price,
      link: url,
      category,
      width,
      depth,
      height,
      manualUrl
    };

    const updatedRooms = data.rooms.map(r => {
      if (r.id === targetRoomId) {
        return { ...r, items: [newItem, ...r.items] };
      }
      return r;
    });

    const updatedData = { ...data, rooms: updatedRooms };
    setData(updatedData);
    setNewItemLink('');
    setIsScraping(false);
    setIsAddLinkModalOpen(false);
    
    // Switch active room to the target room where the item was added
    setActiveRoomId(targetRoomId);

    // Select the new item to open details immediately
    setSelectedDetailsItem(newItem);
    setDetailForm(newItem);
    setIsEditingItem(false);
    setIsSyncing(false);
    
    onSave(updatedData);
  };

  // Open item details modal
  const handleSelectItem = (item: FurnitureItem) => {
    setSelectedDetailsItem(item);
    setDetailForm({ ...item });
    setIsEditingItem(false);
    setIsSyncing(false);
  };

  // Background Web Scraping Synchronization
  const handleSyncItem = async (item: FurnitureItem) => {
    if (!item.link || !activeRoomId) return;
    setIsSyncing(true);

    let url = item.link;
    if (!url.startsWith('http')) url = 'https://' + url;

    try {
      const response = await CapacitorHttp.get({ 
        url, 
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' 
        } 
      });
      const html = typeof response.data === 'string' ? response.data : '';

      if (html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const metaTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc.querySelector('meta[name="title"]')?.getAttribute('content');
        const titleTag = doc.querySelector('title')?.innerText;
        const amzTitle = doc.querySelector('#productTitle')?.textContent?.trim();
        const scrapedTitle = amzTitle || metaTitle || titleTag || url;

        const metaImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || doc.querySelector('meta[name="image"]')?.getAttribute('content');
        const amzImage = doc.querySelector('#landingImage')?.getAttribute('src');
        const ikeaImage = doc.querySelector('.pip-image')?.getAttribute('src');
        const scrapedImage = amzImage || ikeaImage || metaImage || '';

        const metaDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || doc.querySelector('meta[name="description"]')?.getAttribute('content');
        const amzDesc = doc.querySelector('#feature-bullets')?.textContent?.trim() || doc.querySelector('#productDescription')?.textContent?.trim();
        const scrapedDesc = amzDesc || metaDesc || '';

        const ogPrice = doc.querySelector('meta[property="product:price:amount"]')?.getAttribute('content');
        const amzPriceWhole = doc.querySelector('.a-price-whole')?.textContent?.trim()?.replace(/[^0-9,]/g, '');
        const ikeaPrice = doc.querySelector('.pip-temp-price__integer')?.textContent?.trim();
        
        let scrapedPrice = '';
        if (ogPrice) scrapedPrice = ogPrice;
        else if (amzPriceWhole) scrapedPrice = amzPriceWhole;
        else if (ikeaPrice) scrapedPrice = ikeaPrice;
        else {
          const genericPrice = html.match(/€\s*([0-9.,]+)/i);
          if (genericPrice) scrapedPrice = genericPrice[1];
        }

        const pdfLink = Array.from(doc.querySelectorAll('a[href]'))
          .map(a => a.getAttribute('href'))
          .find(href => href && href.toLowerCase().endsWith('.pdf'));
        let scrapedManualUrl = '';
        if (pdfLink) {
          if (pdfLink.startsWith('http')) {
            scrapedManualUrl = pdfLink;
          } else {
            try {
              scrapedManualUrl = new URL(pdfLink, url).toString();
            } catch {
              scrapedManualUrl = pdfLink;
            }
          }
        }

        let hasChanges = false;
        const updatedItem = { ...item };

        if (scrapedTitle && scrapedTitle !== item.title) {
          updatedItem.title = scrapedTitle.substring(0, 100) + (scrapedTitle.length > 100 ? '...' : '');
          hasChanges = true;
        }
        if (scrapedImage && scrapedImage !== item.imageUrl) {
          updatedItem.imageUrl = scrapedImage;
          hasChanges = true;
        }
        if (scrapedDesc && scrapedDesc !== item.description) {
          updatedItem.description = scrapedDesc.substring(0, 500) + (scrapedDesc.length > 500 ? '...' : '');
          hasChanges = true;
        }
        if (scrapedPrice && scrapedPrice !== item.price) {
          updatedItem.price = scrapedPrice;
          hasChanges = true;
        }
        if (scrapedManualUrl && scrapedManualUrl !== item.manualUrl) {
          updatedItem.manualUrl = scrapedManualUrl;
          hasChanges = true;
        }

        if (item.category === 'Altro' || !item.category) {
          const newCat = guessCategory(updatedItem.title, updatedItem.description || '');
          if (newCat !== 'Altro') {
            updatedItem.category = newCat;
            hasChanges = true;
          }
        }

        if (hasChanges) {
          setSelectedDetailsItem(updatedItem);
          setDetailForm(updatedItem);

          const updatedRooms = data.rooms.map(r => {
            if (r.id === activeRoomId) {
              return {
                ...r,
                items: r.items.map(i => i.id === item.id ? updatedItem : i)
              };
            }
            return r;
          });
          const updatedData = { ...data, rooms: updatedRooms };
          setData(updatedData);
          onSave(updatedData);
        }
      }
    } catch (err) {
      console.error('Background sync failed', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger background sync when details modal opens
  useEffect(() => {
    if (selectedDetailsItem) {
      handleSyncItem(selectedDetailsItem);
    }
  }, [selectedDetailsItem?.id]);

  // Handle updates in details form
  const handleDetailChange = (field: keyof FurnitureItem, val: any) => {
    if (!detailForm || !activeRoomId) return;
    
    const updatedItem = { ...detailForm, [field]: val };
    setDetailForm(updatedItem);

    // Update locally in real time
    const updatedRooms = data.rooms.map(r => {
      if (r.id === activeRoomId) {
        return {
          ...r,
          items: r.items.map(i => i.id === updatedItem.id ? updatedItem : i)
        };
      }
      return r;
    });
    setData({ ...data, rooms: updatedRooms });
  };

  // Commit item updates and save
  const handleSaveItemDetails = () => {
    if (!detailForm || !activeRoomId) return;
    
    const updatedRooms = data.rooms.map(r => {
      if (r.id === activeRoomId) {
        return {
          ...r,
          items: r.items.map(i => i.id === detailForm.id ? detailForm : i)
        };
      }
      return r;
    });

    const updatedData = { ...data, rooms: updatedRooms };
    setData(updatedData);
    setSelectedDetailsItem(null);
    setDetailForm(null);
    setIsEditingItem(false);
    onSave(updatedData);
  };

  // Dismiss detail modal without saving (revert)
  const handleCloseItemDetails = () => {
    setData(module);
    setSelectedDetailsItem(null);
    setDetailForm(null);
    setIsEditingItem(false);
  };

  // Delete furniture item
  const handleDeleteItem = () => {
    if (!selectedDetailsItem || !activeRoomId) return;

    const updatedRooms = data.rooms.map(r => {
      if (r.id === activeRoomId) {
        return { ...r, items: r.items.filter(i => i.id !== selectedDetailsItem.id) };
      }
      return r;
    });

    const updatedData = { ...data, rooms: updatedRooms };
    setData(updatedData);
    onSave(updatedData);
    setIsDeletingItem(false);
    setSelectedDetailsItem(null);
    setDetailForm(null);
    setIsEditingItem(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full w-full max-w-6xl mx-auto bg-[var(--bg)] relative overflow-hidden">
      {/* HEADER */}
      <header className="flex items-center justify-between p-4 lg:p-6 bg-[var(--card-bg)] border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-4 w-full">
          <button onClick={onClose} className="p-2.5 hover:bg-[var(--surface-variant)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <input
              type="text"
              value={data.title}
              onChange={e => {
                const updated = { ...data, title: e.target.value };
                setData(updated);
                onSave(updated);
              }}
              className="text-xl lg:text-2xl font-black bg-transparent border-none outline-none text-[var(--text-main)] w-full placeholder:text-[var(--text-muted)] focus:ring-0"
              placeholder="Nome Progetto Mobili..."
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* ROOMS DASHBOARD / SELECTOR */}
        <div className="p-4 bg-[var(--sidebar-bg)] border-b border-[var(--border)] shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
              <Grid className="w-4 h-4 text-teal-500" /> Le Mie Stanze
            </h3>
            {activeRoom && (
              <button 
                onClick={handleOpenEditRoomModal}
                className="text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-400 px-3 py-1.5 rounded-full border border-teal-500/10 flex items-center gap-1.5 transition-all"
              >
                <Settings className="w-3.5 h-3.5" /> Modifica Stanza
              </button>
            )}
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar hide-scrollbar items-center">
            {data.rooms.map(room => {
              const roomTypePreset = ROOM_TYPES.find(t => t.name === room.roomType) || ROOM_TYPES[7];
              const RoomIcon = roomTypePreset.icon;
              const isActive = activeRoomId === room.id;

              return (
                <button
                  key={room.id}
                  onClick={() => {
                    setActiveRoomId(room.id);
                  }}
                  className={`flex-shrink-0 text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3 w-56 relative ${
                    isActive 
                      ? 'bg-[var(--card-bg)] border-teal-500 shadow-md ring-1 ring-teal-500/30' 
                      : 'bg-[var(--card-bg)] border-[var(--border)] hover:bg-[var(--surface-variant)] shadow-sm'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${roomTypePreset.color}`}>
                    <RoomIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-[var(--text-main)] text-sm truncate leading-snug">
                      {room.name}
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">
                      {room.items.length} {room.items.length === 1 ? 'oggetto' : 'oggetti'}
                    </p>
                  </div>
                </button>
              );
            })}

            <button
              onClick={handleOpenAddRoomModal}
              className="flex-shrink-0 p-3.5 rounded-2xl border border-dashed border-[var(--border)] bg-transparent hover:bg-[var(--surface-variant)] transition-all flex items-center gap-3 w-56 text-teal-600 font-bold text-sm"
            >
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 shrink-0">
                <Plus className="w-5 h-5" />
              </div>
              <span>Aggiungi Stanza</span>
            </button>
          </div>
        </div>

        {/* ACTIVE ROOM VIEWPORT */}
        {activeRoom ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)] relative">
            
            {/* Active Room Title and Info Header */}
            <div className="p-4 bg-[var(--sidebar-bg)] border-b border-[var(--border)] shrink-0 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[var(--text-main)] leading-tight flex items-center gap-2">
                  {activeRoom.name}
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--surface-variant)] text-[var(--text-muted)] font-bold">
                    {activeRoom.roomType || 'Altro'}
                  </span>
                </h2>
                {(activeRoom.width || activeRoom.length) && (
                  <p className="text-xs text-[var(--text-muted)] mt-1 font-semibold">
                    Misure: {((activeRoom.width || 400)/100).toFixed(1)}m × {((activeRoom.length || 300)/100).toFixed(1)}m · Area: {(((activeRoom.width || 400) * (activeRoom.length || 300)) / 10000).toFixed(1)} m²
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleOpenEditRoomModal}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-400 px-3.5 py-2 rounded-full border border-teal-500/10 flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Modifica Stanza</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="px-4 py-3 bg-[var(--sidebar-bg)] border-b border-[var(--border)] flex gap-2 overflow-x-auto shrink-0 custom-scrollbar hide-scrollbar">
              {['Tutti', ...CATEGORIES].map(cat => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all border ${
                      isActive 
                        ? 'bg-teal-500 text-white border-teal-500 shadow-sm' 
                        : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-variant)]'
                    }`}
                  >
                    {cat} {cat === 'Tutti' ? `(${activeRoom.items.length})` : `(${activeRoom.items.filter(i => i.category === cat).length})`}
                  </button>
                );
              })}
            </div>

            {/* Items Grid with bottom padding */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 custom-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)] text-center px-4">
                  <Armchair className="w-16 h-16 mb-4 opacity-25 text-teal-600" />
                  <p className="font-extrabold text-lg text-[var(--text-main)]">Nessun oggetto trovato</p>
                  <p className="text-xs mt-1.5 opacity-70 max-w-sm">
                    {activeCategory === 'Tutti' 
                      ? 'La stanza è ancora vuota! Fai clic sul tasto + in basso a destra per inserire un link e aggiungere il primo elemento.' 
                      : `Non ci sono ancora oggetti della categoria "${activeCategory}" in questa stanza.`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6 max-w-7xl mx-auto">
                  <AnimatePresence>
                    {filteredItems.map(item => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={() => handleSelectItem(item)}
                        className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col p-3.5 pb-5 group relative select-none"
                      >
                        <div className="aspect-square bg-[var(--surface-variant)] rounded-2xl flex items-center justify-center overflow-hidden relative border border-[var(--border)]/50">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-[var(--text-muted)]/40 p-4">
                              <ImageIcon className="w-10 h-10 mb-1" />
                              <span className="text-[10px] font-bold tracking-wider uppercase">{item.category || 'Altro'}</span>
                            </div>
                          )}
                          {item.price && (
                            <div className="absolute bottom-2 left-2 bg-teal-600 text-white font-black text-[10px] px-2 py-1 rounded-full shadow-sm flex items-center gap-0.5">
                              <Tag className="w-3 h-3" /> €{item.price}
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-3 px-1.5 flex-1 flex flex-col justify-between">
                          <h4 className="font-extrabold text-[var(--text-main)] text-xs line-clamp-2 leading-snug" title={item.title}>
                            {item.title}
                          </h4>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] text-center p-8 bg-[var(--sidebar-bg)]">
            <Armchair className="w-16 h-16 mb-4 text-teal-600/30" />
            <p className="font-black text-lg text-[var(--text-main)]">Nessuna stanza disponibile</p>
            <p className="text-xs mt-1.5 max-w-xs leading-relaxed opacity-70">Organizza la tua casa. Fai clic sul tasto &quot;Aggiungi Stanza&quot; per iniziare a inserire le stanze.</p>
            <button 
              onClick={handleOpenAddRoomModal}
              className="mt-6 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-extrabold text-sm rounded-2xl transition-all shadow-sm"
            >
              Crea Prima Stanza
            </button>
          </div>
        )}
      </div>

      {/* ROOM CREATION / EDITING MODAL */}
      <AnimatePresence>
        {isRoomModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--card-bg)] w-full max-w-md rounded-3xl shadow-xl overflow-hidden flex flex-col border border-[var(--border)] max-h-[80vh]"
            >
              <div className="p-4.5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-variant)]">
                <h3 className="font-black text-base text-[var(--text-main)] uppercase tracking-wider">
                  {editingRoom ? 'Modifica Stanza' : 'Crea Nuova Stanza'}
                </h3>
                <button onClick={() => setIsRoomModalOpen(false)} className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg)] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRoom} className="p-5 flex flex-col gap-4.5 overflow-y-auto max-h-[80vh] custom-scrollbar">
                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-wider">Nome Stanza</label>
                  <input
                    type="text"
                    required
                    placeholder="es. Cucina principale, Soggiorno..."
                    value={roomForm.name}
                    onChange={e => setRoomForm({ ...roomForm, name: e.target.value })}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 text-[var(--text-main)] font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Tipologia Stanza</label>
                  <div className="grid grid-cols-4 gap-2">
                    {ROOM_TYPES.map(type => {
                      const TypeIcon = type.icon;
                      const isSelected = roomForm.roomType === type.name;
                      return (
                        <button
                          key={type.name}
                          type="button"
                          onClick={() => setRoomForm({ ...roomForm, roomType: type.name })}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                            isSelected 
                              ? 'bg-teal-500/10 border-teal-500 text-teal-600 font-extrabold' 
                              : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-variant)]'
                          }`}
                        >
                          <TypeIcon className="w-5 h-5 mb-1" />
                          <span className="text-[9px] truncate w-full">{type.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-[var(--border)] pt-4 flex flex-col gap-4">
                  <h4 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider flex items-center gap-1.5">
                    Misure Stanza (in metri, opzionale)
                  </h4>
                  
                  {/* WIDTH */}
                  <div className="flex flex-col gap-1.5 bg-[var(--surface-variant)]/40 p-3.5 rounded-2xl border border-[var(--border)]">
                    <div className="flex justify-between text-xs font-extrabold">
                      <span className="text-[var(--text-muted)]">Larghezza</span>
                      <span className="text-teal-600 text-sm">{(roomForm.width / 100).toFixed(1)} m</span>
                    </div>
                    <input
                      type="range"
                      min="150"
                      max="1000"
                      step="10"
                      value={roomForm.width}
                      onChange={e => setRoomForm({ ...roomForm, width: parseInt(e.target.value) })}
                      className="w-full accent-teal-500"
                    />
                  </div>

                  {/* LENGTH */}
                  <div className="flex flex-col gap-1.5 bg-[var(--surface-variant)]/40 p-3.5 rounded-2xl border border-[var(--border)]">
                    <div className="flex justify-between text-xs font-extrabold">
                      <span className="text-[var(--text-muted)]">Lunghezza</span>
                      <span className="text-teal-600 text-sm">{(roomForm.length / 100).toFixed(1)} m</span>
                    </div>
                    <input
                      type="range"
                      min="150"
                      max="1000"
                      step="10"
                      value={roomForm.length}
                      onChange={e => setRoomForm({ ...roomForm, length: parseInt(e.target.value) })}
                      className="w-full accent-teal-500"
                    />
                  </div>

                  {/* HEIGHT */}
                  <div className="flex flex-col gap-1.5 bg-[var(--surface-variant)]/40 p-3.5 rounded-2xl border border-[var(--border)]">
                    <div className="flex justify-between text-xs font-extrabold">
                      <span className="text-[var(--text-muted)]">Altezza</span>
                      <span className="text-teal-600 text-sm">{(roomForm.height / 100).toFixed(1)} m</span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="400"
                      step="10"
                      value={roomForm.height}
                      onChange={e => setRoomForm({ ...roomForm, height: parseInt(e.target.value) })}
                      className="w-full accent-teal-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--border)]">
                  {editingRoom && (
                    <button
                      type="button"
                      onClick={handleDeleteRoom}
                      className="px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl font-black text-sm transition-colors flex items-center justify-center gap-2"
                      title="Elimina Stanza"
                    >
                      <Trash2 className="w-4 h-4" /> Elimina
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-teal-500 text-white hover:bg-teal-600 rounded-2xl font-black text-sm transition-colors shadow-sm text-center"
                  >
                    Salva Stanza
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD FROM LINK MODAL */}
      <AnimatePresence>
        {isAddLinkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--card-bg)] w-full max-w-md rounded-3xl shadow-xl overflow-hidden flex flex-col border border-[var(--border)]"
            >
              <div className="p-4.5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-variant)]">
                <h3 className="font-black text-base text-[var(--text-main)] uppercase tracking-wider">
                  Aggiungi da Link
                </h3>
                <button 
                  onClick={() => setIsAddLinkModalOpen(false)} 
                  disabled={isScraping}
                  className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg)] rounded-full transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleScrapeAndAddItem} className="p-5 flex flex-col gap-4.5">
                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Link Prodotto</label>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 text-[var(--text-muted)] pointer-events-none">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="url"
                      required
                      disabled={isScraping}
                      placeholder="Incolla link (es. Amazon, IKEA...)"
                      value={newItemLink}
                      onChange={e => setNewItemLink(e.target.value)}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl py-3 pl-10 pr-4 outline-none focus:border-teal-500 text-[var(--text-main)] font-semibold text-sm disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-wider">Stanza di Destinazione</label>
                  <select
                    disabled={isScraping}
                    value={targetRoomId}
                    onChange={e => setTargetRoomId(e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 font-semibold text-[var(--text-main)]"
                  >
                    {data.rooms.map(room => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--border)]">
                  <button
                    type="button"
                    disabled={isScraping}
                    onClick={() => setIsAddLinkModalOpen(false)}
                    className="flex-1 py-3 bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-2xl font-black text-sm transition-colors border border-[var(--border)] disabled:opacity-50 text-center"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={!newItemLink.trim() || isScraping}
                    className="flex-1 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-2xl font-black text-sm transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isScraping ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Scraping...
                      </>
                    ) : (
                      'Aggiungi'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FURNITURE ITEM DETAILS MODAL */}
      <AnimatePresence>
        {selectedDetailsItem && detailForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--card-bg)] w-full max-w-xl rounded-3xl shadow-xl overflow-hidden flex flex-col border border-[var(--border)] max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-variant)] shrink-0">
                <h3 className="font-black text-sm text-[var(--text-main)] uppercase tracking-wider">
                  {isEditingItem ? 'Modifica Oggetto' : 'Dettagli Oggetto'}
                </h3>
                <button onClick={handleCloseItemDetails} className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg)] rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-5">
                
                {/* 1. READ-ONLY VIEW (DEFAULT ON CLICK) */}
                {!isEditingItem ? (
                  <>
                    {/* Visual Overview */}
                    <div className="flex flex-col sm:flex-row gap-5 bg-[var(--surface-variant)]/30 p-5 rounded-2xl border border-[var(--border)] relative overflow-hidden">
                      <div className="w-full sm:w-36 h-36 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] flex-shrink-0 overflow-hidden relative flex items-center justify-center">
                        {detailForm.imageUrl ? (
                          <img src={detailForm.imageUrl} alt={detailForm.title} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-12 h-12 text-[var(--text-muted)]/30" />
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-base font-black text-[var(--text-main)] leading-snug">
                            {detailForm.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className="text-[10px] font-black uppercase text-[var(--text-muted)] bg-[var(--surface-variant)] px-2.5 py-1 rounded-full">
                              {detailForm.category || 'Altro'}
                            </span>
                            {detailForm.price && (
                              <span className="text-xs font-black text-teal-600 bg-teal-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                                <Tag className="w-3.5 h-3.5" /> €{detailForm.price}
                              </span>
                            )}
                            {isSyncing ? (
                              <span className="text-[10px] font-bold text-teal-600 bg-teal-500/5 px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin text-teal-500" /> Sincronizzazione...
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                                ✓ Aggiornato
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2.5 mt-5 sm:mt-0">
                          <a
                            href={detailForm.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 sm:flex-none px-4.5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Negozio
                          </a>
                          {detailForm.manualUrl && (
                            <a
                              href={detailForm.manualUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 sm:flex-none px-4.5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                            >
                              <FileText className="w-3.5 h-3.5" /> Manuale
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Dimensions metadata display */}
                    {(detailForm.width || detailForm.depth || detailForm.height) && (
                      <div className="border-t border-[var(--border)] pt-4">
                        <h4 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider mb-2 flex items-center gap-1">
                          Dimensioni Prodotto
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-[var(--surface-variant)]/30 p-3 rounded-xl border border-[var(--border)] flex flex-col gap-0.5">
                            <span className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Larghezza</span>
                            <span className="text-sm font-extrabold text-[var(--text-main)]">{detailForm.width || '--'} cm</span>
                          </div>
                          <div className="bg-[var(--surface-variant)]/30 p-3 rounded-xl border border-[var(--border)] flex flex-col gap-0.5">
                            <span className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Profondità</span>
                            <span className="text-sm font-extrabold text-[var(--text-main)]">{detailForm.depth || '--'} cm</span>
                          </div>
                          <div className="bg-[var(--surface-variant)]/30 p-3 rounded-xl border border-[var(--border)] flex flex-col gap-0.5">
                            <span className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Altezza</span>
                            <span className="text-sm font-extrabold text-[var(--text-main)]">{detailForm.height || '--'} cm</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Description Display */}
                    {detailForm.description && (
                      <div className="border-t border-[var(--border)] pt-4 flex-1">
                        <h4 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider mb-2">
                          Descrizione
                        </h4>
                        <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar bg-[var(--surface-variant)]/20 p-3.5 rounded-xl border border-[var(--border)]">
                          {detailForm.description}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  // 2. EDITING FORM (Toggled by "Modifica" button)
                  <>
                    {/* Visual Overview */}
                    <div className="flex flex-col sm:flex-row gap-4 bg-[var(--surface-variant)]/30 p-4 rounded-2xl border border-[var(--border)]">
                      <div className="w-full sm:w-32 h-32 rounded-xl bg-[var(--surface-variant)] border border-[var(--border)] flex-shrink-0 overflow-hidden relative flex items-center justify-center">
                        {detailForm.imageUrl ? (
                          <img src={detailForm.imageUrl} alt={detailForm.title} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-10 h-10 text-[var(--text-muted)]/30" />
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <label className="block text-[9px] font-black text-[var(--text-muted)] mb-0.5 uppercase tracking-wider">Titolo Oggetto</label>
                          <input 
                            type="text" 
                            value={detailForm.title} 
                            onChange={e => handleDetailChange('title', e.target.value)} 
                            className="text-sm font-extrabold text-[var(--text-main)] w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 outline-none focus:border-teal-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Category Selection */}
                      <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-wider">Tipologia Oggetto</label>
                        <select
                          value={detailForm.category || 'Altro'}
                          onChange={e => handleDetailChange('category', e.target.value)}
                          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 font-semibold text-[var(--text-main)]"
                        >
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Price */}
                      <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-wider">Prezzo (€)</label>
                        <input
                          type="text"
                          value={detailForm.price || ''}
                          onChange={e => handleDetailChange('price', e.target.value)}
                          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 font-semibold text-[var(--text-main)]"
                          placeholder="es. 149.99"
                        />
                      </div>
                    </div>

                    {/* Dimensions (W, D, H) */}
                    <div className="border-t border-[var(--border)] pt-4">
                      <h4 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider mb-2 flex items-center gap-1">
                        <Sliders className="w-4 h-4 text-teal-500" /> Dimensioni Oggetto (in cm)
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1 bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)]">
                          <span className="text-[10px] font-bold text-[var(--text-muted)]">Larghezza</span>
                          <input
                            type="number"
                            min="5"
                            max="800"
                            value={detailForm.width || 50}
                            onChange={e => handleDetailChange('width', parseInt(e.target.value) || '')}
                            className="bg-transparent text-sm font-extrabold text-teal-600 outline-none w-full"
                          />
                        </div>
                        <div className="flex flex-col gap-1 bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)]">
                          <span className="text-[10px] font-bold text-[var(--text-muted)]">Profondità</span>
                          <input
                            type="number"
                            min="5"
                            max="800"
                            value={detailForm.depth || 50}
                            onChange={e => handleDetailChange('depth', parseInt(e.target.value) || '')}
                            className="bg-transparent text-sm font-extrabold text-teal-600 outline-none w-full"
                          />
                        </div>
                        <div className="flex flex-col gap-1 bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)]">
                          <span className="text-[10px] font-bold text-[var(--text-muted)]">Altezza</span>
                          <input
                            type="number"
                            min="5"
                            max="800"
                            value={detailForm.height || 50}
                            onChange={e => handleDetailChange('height', parseInt(e.target.value) || '')}
                            className="bg-transparent text-sm font-extrabold text-teal-600 outline-none w-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-[10px] font-black text-[var(--text-muted)] mb-1 uppercase tracking-wider">Descrizione</label>
                      <textarea
                        value={detailForm.description || ''}
                        onChange={e => handleDetailChange('description', e.target.value)}
                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 font-semibold text-[var(--text-main)] resize-none h-24 custom-scrollbar"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--sidebar-bg)]">
                {isEditingItem ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsDeletingItem(true)}
                      className="px-4 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl font-black text-sm transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" /> Rimuovi
                    </button>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIsEditingItem(false)}
                        className="px-5 py-3 bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-2xl font-black text-sm transition-all border border-[var(--border)]"
                      >
                        Annulla
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveItemDetails}
                        className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-2xl font-black text-sm transition-all shadow-sm"
                      >
                        Salva
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditingItem(true)}
                      className="px-4.5 py-3 bg-teal-500/10 text-teal-600 hover:bg-teal-500 hover:text-white rounded-2xl font-black text-sm transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <Edit2 className="w-4 h-4" /> Modifica Dettagli
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseItemDetails}
                      className="px-6 py-3 bg-[var(--surface-variant)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-2xl font-black text-sm transition-all border border-[var(--border)]"
                    >
                      Chiudi
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Item Confirmation Dialog */}
      {isDeletingItem && (
        <ConfirmDialog
          isOpen={isDeletingItem}
          title="Elimina Oggetto"
          message="Sei sicuro di voler rimuovere questo oggetto dalla stanza?"
          confirmText="Elimina"
          cancelText="Annulla"
          onConfirm={handleDeleteItem}
          onCancel={() => setIsDeletingItem(false)}
        />
      )}

      {/* Pulsante Floating "+" a livello di sezione Mobili (FAB estetico squircle) */}
      {data.rooms.length > 0 && (
        <button
          onClick={() => setIsAddLinkModalOpen(true)}
          className="fixed bottom-8 right-6 md:bottom-10 md:right-10 w-16 h-16 bg-gradient-to-tr from-teal-500 to-teal-600 hover:brightness-110 active:scale-95 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-teal-500/30 hover:shadow-xl transition-all z-[9999] border border-white/20"
          title="Aggiungi da Link"
          id="fab-add-furniture-item"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}
    </motion.div>
  );
};
