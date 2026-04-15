import React, { useState, useMemo } from 'react';
import { 
  FileUp, FileDown, Layers, SplitSquareHorizontal, RotateCw, 
  Image as ImageIcon, Type, X, FileCheck, ArrowRight, Percent, 
  Scan, ArrowLeft, Book, Search as SearchIcon, Eye, Trash2,
  Wrench, ClipboardList, Settings2
} from 'lucide-react';
import { DocumentScanner } from './DocumentScanner';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { Module } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';

export const TOOLS_PDF = [
  { id: 'merge', title: 'Unisci PDF', desc: 'Unisci più documenti in uno.', icon: Layers, color: 'text-rose-500', bg: 'bg-rose-500/10', category: 'pdf' },
  { id: 'img2pdf', title: 'JPG in PDF', desc: 'Converti immagini in PDF.', icon: ImageIcon, color: 'text-[var(--accent)]', bg: 'bg-[var(--accent)]/10', category: 'pdf' },
  { id: 'rotate', title: 'Ruota PDF', desc: 'Cambia orientamento alle pagine.', icon: RotateCw, color: 'text-blue-500', bg: 'bg-blue-500/10', category: 'pdf' },
  { id: 'docx2pdf', title: 'Word in PDF', desc: 'Converti documenti .docx in PDF.', icon: FileDown, color: 'text-blue-600', bg: 'bg-blue-600/10', category: 'pdf' },
];

export const TOOLS_UTILITY = [
  { id: 'scanner', title: 'Scanner', desc: 'Scansiona e crea PDF.', icon: Scan, color: 'text-[var(--success)]', bg: 'bg-[var(--success)]/10', category: 'utility' },
  { id: 'percent', title: 'Percentuale', desc: 'Sconti e variazioni.', icon: Percent, color: 'text-indigo-500', bg: 'bg-indigo-500/10', category: 'utility' }
];

export const TOOLS = [...TOOLS_PDF, ...TOOLS_UTILITY];

type ToolCategory = 'all' | 'pdf' | 'utility';

export const ToolsScreen = ({ showToast, onSaveToSandbox, initialToolId, onReset, modules = [] }: { 
  showToast: (m: string, t?: 'success'|'error'|'info') => void, 
  onSaveToSandbox?: (title: string, base64: string) => void, 
  initialToolId?: string | null, 
  onReset?: () => void,
  modules?: Module[]
}) => {
  const [activeTool, setActiveTool] = useState<string | null>(initialToolId || null);
  const [category, setCategory] = useState<ToolCategory>('all');
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [percentMode, setPercentMode] = useState<'of'|'discount'|'increase'>('of');
  const [percentVal1, setPercentVal1] = useState('');
  const [percentVal2, setPercentVal2] = useState('');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const [viewingTitle, setViewingTitle] = useState('');

  React.useEffect(() => {
    if (initialToolId) {
      setActiveTool(initialToolId);
    }
  }, [initialToolId]);

  const filteredTools = useMemo(() => {
    if (category === 'all') return TOOLS;
    return TOOLS.filter(t => t.category === category);
  }, [category]);

  const bytesToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processMerge = async (saveToSandbox: boolean) => {
    if (files.length < 2) return showToast('Seleziona almeno 2 file PDF da unire.', 'error');
    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }
      const mergedBytes = await mergedPdf.save();
      
      if (saveToSandbox && onSaveToSandbox) {
        onSaveToSandbox('PDF Unito', `data:application/pdf;base64,${bytesToBase64(mergedBytes)}`);
      } else {
        downloadFile(mergedBytes, 'unito.pdf', 'application/pdf');
        showToast('PDF scaricato con successo!');
      }
      reset();
    } catch (e) {
      console.error(e);
      showToast("Errore durante l'unione dei PDF.", 'error');
    }
    setIsProcessing(false);
  };

  const processImg2Pdf = async (saveToSandbox: boolean) => {
    if (files.length === 0) return showToast("Seleziona almeno un'immagine.", 'error');
    setIsProcessing(true);
    try {
      const pdf = await PDFDocument.create();
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        let image;
        if (file.type === 'image/jpeg') image = await pdf.embedJpg(bytes);
        else if (file.type === 'image/png') image = await pdf.embedPng(bytes);
        else continue;

        const page = pdf.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      }
      const pdfBytes = await pdf.save();
      if (saveToSandbox && onSaveToSandbox) {
        onSaveToSandbox('Immagini in PDF', `data:application/pdf;base64,${bytesToBase64(pdfBytes)}`);
      } else {
        downloadFile(pdfBytes, 'convertito.pdf', 'application/pdf');
        showToast('PDF scaricato con successo!');
      }
      reset();
    } catch (e) {
      console.error(e);
      showToast("Errore durante la conversione in PDF.", 'error');
    }
    setIsProcessing(false);
  };

  const processRotate = async (saveToSandbox: boolean) => {
    if (files.length === 0) return showToast("Seleziona almeno un PDF da ruotare.", 'error');
    setIsProcessing(true);
    try {
      const pdf = await PDFDocument.load(await files[0].arrayBuffer());
      const pages = pdf.getPages();
      pages.forEach(p => p.setRotation(degrees((p.getRotation().angle + 90) % 360)));
      
      const pdfBytes = await pdf.save();
      if (saveToSandbox && onSaveToSandbox) {
        onSaveToSandbox('PDF Ruotato', `data:application/pdf;base64,${bytesToBase64(pdfBytes)}`);
      } else {
        downloadFile(pdfBytes, 'ruotato.pdf', 'application/pdf');
        showToast('PDF scaricato con successo!');
      }
      reset();
    } catch (e) {
      console.error(e);
      showToast("Errore durante la rotazione del PDF.", 'error');
    }
    setIsProcessing(false);
  };

  const processWord2Pdf = async (saveToSandbox: boolean) => {
    if (files.length === 0) return showToast("Seleziona un file .docx.", 'error');
    setIsProcessing(true);
    try {
      const arrayBuffer = await files[0].arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;

      const doc = new jsPDF();
      
      // Basic text extraction if html translation is too complex for jspdf without extra plugins
      // For a better experience, we use a hidden div to render and then capture, 
      // but here we'll try a simpler approach first or use doc.text with stripped tags
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const text = tempDiv.innerText || tempDiv.textContent || "";

      const margin = 10;
      const pageHeight = doc.internal.pageSize.height;
      const splitText = doc.splitTextToSize(text, 180);
      doc.text(splitText, margin, 20);

      const pdfOutput = doc.output('arraybuffer');
      const uint8Array = new Uint8Array(pdfOutput);

      if (saveToSandbox && onSaveToSandbox) {
        onSaveToSandbox('Word in PDF', `data:application/pdf;base64,${bytesToBase64(uint8Array)}`);
      } else {
        downloadFile(uint8Array, 'documento.pdf', 'application/pdf');
        showToast('PDF scaricato con successo!');
      }
      reset();
    } catch (e) {
      console.error(e);
      showToast("Errore durante la conversione del file Word.", 'error');
    }
    setIsProcessing(false);
  };

  const downloadFile = (bytes: Uint8Array, filename: string, type: string) => {
    const blob = new Blob([bytes as BlobPart], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFiles([]);
    setActiveTool(null);
    setPercentVal1('');
    setPercentVal2('');
    if (onReset) onReset();
  };

  const executeTool = (saveToSandbox: boolean) => {
    switch (activeTool) {
      case 'merge': processMerge(saveToSandbox); break;
      case 'img2pdf': processImg2Pdf(saveToSandbox); break;
      case 'rotate': processRotate(saveToSandbox); break;
      case 'docx2pdf': processWord2Pdf(saveToSandbox); break;
      default: showToast('Questo strumento è in fase di sviluppo (offline).', 'info'); break;
    }
  };

  const TOOL_CATEGORIES = [
    { id: 'all', label: 'Tutti', icon: ClipboardList },
    { id: 'pdf', label: 'PDF', icon: FileDown },
    { id: 'utility', label: 'Vario', icon: Settings2 },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--bg)]">
      <div className="max-w-[1000px] mx-auto w-full h-full flex flex-col">
        {!activeTool ? (
          <>
            {/* Compact Header */}
            <div className="px-6 py-6 lg:py-10 text-center lg:text-left">
              <h2 className="text-2xl lg:text-3xl font-black text-[var(--text-main)] tracking-tight">Strumenti</h2>
              <p className="text-[var(--text-muted)] text-xs lg:text-sm font-medium mt-1">Utility offline, sicure e private.</p>
            </div>

            {/* Category Pills - Sticky */}
            <div className="px-4 mb-6 sticky top-0 z-20 bg-[var(--bg)] pb-2 overflow-x-auto scrollbar-none">
              <div className="flex bg-[var(--card-bg)] p-1 rounded-2xl border border-[var(--border)] shadow-sm min-w-max">
                {TOOL_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id as ToolCategory)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                      category === cat.id 
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg)]'
                    }`}
                  >
                    <cat.icon className="w-3.5 h-3.5" />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 pb-32 scrollbar-none">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-fade-in">
                  {filteredTools.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTool(t.id)}
                      className="bg-[var(--card-bg)] border border-[var(--border)] p-4 rounded-2xl hover:border-amber-500 shadow-sm hover:shadow-md transition-all group flex items-center gap-4 text-left"
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${t.bg} ${t.color} group-hover:scale-110 transition-transform`}>
                        <t.icon className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-[var(--text-main)] truncate">{t.title}</h3>
                        <p className="text-[10px] text-[var(--text-muted)] font-medium truncate">{t.desc}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-amber-500 transition-colors mr-1" />
                    </button>
                  ))}
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
             {/* Tool Active Header */}
             <div className="px-6 py-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card-bg)]/50 backdrop-blur-xl">
               <div className="flex items-center gap-4">
                  <button onClick={reset} className="p-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-amber-500 hover:bg-amber-500/10 transition-all">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-lg font-black text-[var(--text-main)] leading-tight">
                      {TOOLS.find(t => t.id === activeTool)?.title}
                    </h2>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Strumento {TOOLS.find(t => t.id === activeTool)?.category}</p>
                  </div>
               </div>
               {activeTool === 'percent' && (
                 <div className="flex bg-[var(--bg)] p-1 rounded-xl border border-[var(--border)]">
                    {(['of', 'discount', 'increase'] as const).map(m => (
                      <button key={m} onClick={() => setPercentMode(m)} className={`px-3 py-1.5 text-[9px] font-bold uppercase transition-all rounded-lg ${percentMode === m ? 'bg-amber-500 text-white shadow-md' : 'text-[var(--text-muted)]'}`}>
                        {m === 'of' ? '%' : m === 'discount' ? '-' : '+'}
                      </button>
                    ))}
                  </div>
               )}
             </div>

             <div className="flex-1 overflow-y-auto px-6 py-8 pb-32">
                <div className="max-w-xl mx-auto space-y-6">
                  {activeTool === 'scanner' ? (
                    <DocumentScanner 
                      onClose={reset} 
                      downloadOnly={!onSaveToSandbox}
                      onCapture={(pdf) => {
                        if (onSaveToSandbox) onSaveToSandbox("Scansione Documento", pdf);
                        else showToast("Documento acquisito!");
                        reset();
                      }}
                    />
                  ) : activeTool === 'percent' ? (
                    <div className="bg-[var(--card-bg)] rounded-3xl p-6 lg:p-10 border border-[var(--border)] shadow-xl animate-scale-up">
                      <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-[var(--text-muted)] uppercase ml-2">{percentMode === 'of' ? 'Percentuale' : 'Variazione %'}</label>
                             <input type="number" placeholder="Es. 22" value={percentVal1} onChange={e => setPercentVal1(e.target.value)} className="w-full p-5 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 font-black text-center text-2xl text-[var(--text-main)] shadow-inner" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-[var(--text-muted)] uppercase ml-2">Valore Base</label>
                             <input type="number" placeholder="Es. 100" value={percentVal2} onChange={e => setPercentVal2(e.target.value)} className="w-full p-5 bg-[var(--bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 font-black text-center text-2xl text-[var(--text-main)] shadow-inner" />
                          </div>
                        </div>
                        <div className="p-8 bg-gradient-to-br from-amber-500 to-amber-400 rounded-2xl text-center shadow-lg shadow-amber-500/20">
                           <p className="text-[10px] font-black text-white/80 uppercase mb-2 tracking-widest">Risultato Finale</p>
                           <p className="text-5xl font-black text-white drop-shadow-md">
                             {(() => {
                               const v1 = parseFloat(percentVal1);
                               const v2 = parseFloat(percentVal2);
                               if (isNaN(v1) || isNaN(v2)) return '0.00';
                               if (percentMode === 'of') return ((v1 / 100) * v2).toFixed(2);
                               if (percentMode === 'discount') return (v2 - (v1 / 100 * v2)).toFixed(2);
                               return (v2 + (v1 / 100 * v2)).toFixed(2);
                             })()}
                           </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className={`py-12 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border)] rounded-[2.5rem] bg-[var(--card-bg)]/30 relative hover:bg-amber-500/5 transition-colors cursor-pointer group ${files.length > 0 ? 'py-8' : 'py-12'}`}>
                        <input
                          type="file"
                          multiple
                          accept={activeTool === 'img2pdf' ? 'image/jpeg, image/png' : activeTool === 'docx2pdf' ? '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf'}
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className={`rounded-2xl bg-amber-500/10 flex items-center justify-center transition-all ${files.length > 0 ? 'w-12 h-12 mb-4' : 'w-20 h-20 mb-6'}`}>
                          <FileUp className={`${files.length > 0 ? 'w-6 h-6' : 'w-10 h-10'} text-amber-500`} />
                        </div>
                        <p className={`${files.length > 0 ? 'text-sm' : 'text-lg'} font-black text-[var(--text-main)]`}>
                          {files.length > 0 ? 'Aggiungi altri file' : 'Seleziona File'}
                        </p>
                      </div>

                      {files.length > 0 && (
                        <div className="space-y-4 animate-fade-in">
                          <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-none">
                            {files.map((f, i) => (
                              <div key={i} className="flex items-center gap-3 p-3 bg-[var(--card-bg)] rounded-xl border border-[var(--border)] shadow-sm">
                                <FileCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span className="text-[11px] font-bold text-[var(--text-main)] truncate flex-1">{f.name}</span>
                                <button onClick={() => removeFile(i)} className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg"><X className="w-4 h-4" /></button>
                              </div>
                            ))}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <button onClick={() => executeTool(false)} disabled={isProcessing} className="py-4 bg-[var(--card-bg)] border-2 border-amber-500 text-amber-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm">
                              {isProcessing ? '...' : 'Scarica'}
                            </button>
                            <button onClick={() => executeTool(true)} disabled={isProcessing} className="py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20">
                              {isProcessing ? '...' : 'Salva Appunto'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Document Viewer Modal - Unchanged but compactified internal padding */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[100002] bg-black/60 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} className="w-full max-w-lg bg-[var(--card-bg)] rounded-t-[2.5rem] sm:rounded-b-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[var(--text-main)] truncate uppercase tracking-tight">{viewingTitle}</h3>
                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Documento PDF</p>
              </div>
              <button onClick={() => setViewingDoc(null)} className="p-2.5 bg-[var(--bg)] rounded-xl text-[var(--text-muted)]"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 p-10 bg-black/5 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mb-6"><Book className="w-10 h-10" /></div>
              <p className="text-sm font-bold text-[var(--text-main)] mb-10">Il documento è pronto per la visualizzazione esterna o il download.</p>
              <div className="w-full space-y-3">
                 <button onClick={() => {
                   const base64 = viewingDoc.split(',')[1] || viewingDoc;
                   const binary = atob(base64);
                   const bytes = new Uint8Array(binary.length);
                   for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                   const blob = new Blob([bytes], { type: 'application/pdf' });
                   const url = URL.createObjectURL(blob);
                   window.open(url, '_blank');
                 }} className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Apri Documento</button>
                 <button onClick={() => {
                   const base64 = viewingDoc.split(',')[1] || viewingDoc;
                   const binary = atob(base64);
                   const bytes = new Uint8Array(binary.length);
                   for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                   const blob = new Blob([bytes], { type: 'application/pdf' });
                   const url = URL.createObjectURL(blob);
                   const a = document.createElement('a'); a.href = url; a.download = `${viewingTitle}.pdf`; a.click();
                 }} className="w-full py-4 bg-[var(--bg)] text-[var(--text-main)] border border-[var(--border)] rounded-2xl font-black text-xs uppercase tracking-widest">Scarica</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
