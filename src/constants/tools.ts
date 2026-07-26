import { 
  Layers, RotateCw, FileDown, Minimize, 
  ImageIcon, Percent, Scan
} from 'lucide-react';

export const TOOLS_PDF = [
  { id: 'merge', title: 'Unisci PDF', desc: 'Unisci più documenti in uno.', icon: Layers, color: 'text-rose-500', bg: 'bg-rose-500/10', category: 'pdf' },
  { id: 'img2pdf', title: 'JPG in PDF', desc: 'Converti immagini in PDF.', icon: ImageIcon, color: 'text-[var(--accent)]', bg: 'bg-[var(--accent)]/10', category: 'pdf' },
  { id: 'rotate', title: 'Ruota PDF', desc: 'Cambia orientamento alle pagine.', icon: RotateCw, color: 'text-blue-500', bg: 'bg-blue-500/10', category: 'pdf' },
  { id: 'docx2pdf', title: 'Word in PDF', desc: 'Converti documenti .docx in PDF.', icon: FileDown, color: 'text-blue-600', bg: 'bg-blue-600/10', category: 'pdf' },
  { id: 'compress', title: 'Comprimi PDF', desc: 'Riduci la dimensione (MB) ottimizzando il PDF.', icon: Minimize, color: 'text-emerald-500', bg: 'bg-emerald-500/10', category: 'pdf' },
];

export const TOOLS_UTILITY = [
  { id: 'scanner', title: 'Scanner', desc: 'Scansiona e crea PDF.', icon: Scan, color: 'text-[var(--success)]', bg: 'bg-[var(--success)]/10', category: 'utility' },
  { id: 'percent', title: 'Percentuale', desc: 'Sconti e variazioni.', icon: Percent, color: 'text-indigo-500', bg: 'bg-indigo-500/10', category: 'utility' },
  { id: 'image-filter', title: 'Filtri Immagine', desc: 'Applica filtri stile Instagram.', icon: ImageIcon, color: 'text-pink-500', bg: 'bg-pink-500/10', category: 'utility' }
];

export const TOOLS = [...TOOLS_PDF, ...TOOLS_UTILITY];
