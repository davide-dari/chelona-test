import React, { useState } from 'react';
import { FileUp, FileDown, Layers, SplitSquareHorizontal, RotateCw, Image as ImageIcon, Type, X, FileCheck, ArrowRight, Percent, Scan, ArrowLeft, Book, Search as SearchIcon, Eye, Trash2 } from 'lucide-react';
import { DocumentScanner } from './DocumentScanner';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { Module } from '../types';

import { motion, AnimatePresence } from 'motion/react';

export const TOOLS_PDF = [
  { id: 'merge', title: 'Unisci PDF', desc: 'Unisci più PDF e organizzali nel modo che preferisci.', icon: Layers, color: 'var(--danger)', bg: 'var(--danger-bg)' },
  { id: 'split', title: 'Dividi PDF', desc: 'Estrai una o varie pagine di un PDF in documenti separati.', icon: SplitSquareHorizontal, color: 'var(--warning)', bg: 'var(--warning-bg)' },
  { id: 'img2pdf', title: 'JPG in PDF', desc: 'Converti le tue immagini JPG o PNG in un documento PDF.', icon: ImageIcon, color: 'var(--accent)', bg: 'rgba(245, 158, 11, 0.1)' },
  { id: 'rotate', title: 'Ruota PDF', desc: 'Ruota i PDF come vuoi. Ruota molti documenti allo stesso tempo.', icon: RotateCw, color: 'var(--info)', bg: 'var(--info-bg)' },
  { id: 'watermark', title: 'Filigrana', desc: 'Aggiungi un testo trasparente sopra un PDF come filigrana.', icon: Type, color: 'var(--success)', bg: 'var(--success-bg)' },
];

export const TOOLS_UTILITY = [
  { id: 'scanner', title: 'Scanner Documenti', desc: 'Scansiona documenti con la fotocamera e trasforma in PDF.', icon: Scan, color: 'var(--accent)', bg: 'rgba(245, 158, 11, 0.1)' },
  { id: 'archive', title: 'Archivio Documenti', desc: 'Sfoglia e visualizza tutti i PDF salvati nella tua sandbox.', icon: Book, color: 'var(--info)', bg: 'var(--info-bg)' },
  { id: 'percent', title: 'Calcolo Percentuale', desc: 'Calcola facilmente sconti, ricarichi e proporzioni percentuali.', icon: Percent, color: 'var(--success)', bg: 'var(--success-bg)' }
];

export const TOOLS = [...TOOLS_PDF, ...TOOLS_UTILITY];

export const ToolsScreen = ({ showToast, onSaveToSandbox, initialToolId, onReset, modules = [] }: { 
  showToast: (m: string, t?: 'success'|'error'|'info') => void, 
  onSaveToSandbox?: (title: string, base64: string) => void, 
  initialToolId?: string | null, 
  onReset?: () => void,
  modules?: Module[]
}) => {
  const [activeTool, setActiveTool] = useState<string | null>(initialToolId || null);
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

  const executeTool = (saveToSandbox: boolean = false) => {
    switch(activeTool) {
      case 'merge': return processMerge(saveToSandbox);
      case 'img2pdf': return processImg2Pdf(saveToSandbox);
      case 'rotate': return processRotate(saveToSandbox);
      default: return showToast('Questo strumento è in fase di sviluppo (offline).', 'info');
    }
  };

  return (
    <div className="h-full flex flex-col p-4 lg:p-8 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto w-full">
        {!activeTool ? (
          <>
            <div className="mb-10 text-center pt-8">
              <h2 className="text-3xl lg:text-5xl font-extrabold text-[var(--text-main)] mb-4 tracking-tight">I Tuoi Strumenti</h2>
              <p className="text-[var(--text-muted)] text-lg max-w-2xl mx-auto">Tutto ciò di cui hai bisogno a portata di mano. Completamente offline, sicuro e privato.</p>
            </div>
            
            <h3 className="text-xl font-bold text-[var(--text-main)] mb-6 drop-shadow-sm border-b border-[var(--border)] pb-2">PDF</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {TOOLS_PDF.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTool(t.id)}
                  className="bg-[var(--card-bg)] backdrop-blur-3xl border border-[var(--border)] p-6 rounded-[2rem] hover:border-amber-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all group flex flex-col items-start text-left h-full"
                >
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm"
                    style={{ backgroundColor: t.bg, color: t.color }}
                  >
                    <t.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">{t.title}</h3>
                  <p className="text-sm text-[var(--text-muted)] flex-1">{t.desc}</p>
                </button>
              ))}
            </div>

            <h3 className="text-xl font-bold text-[var(--text-main)] mb-6 drop-shadow-sm border-b border-[var(--border)] pb-2">Utilità</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-40">
              {TOOLS_UTILITY.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTool(t.id)}
                  className="bg-[var(--card-bg)] backdrop-blur-3xl border border-[var(--border)] p-6 rounded-[2rem] hover:border-amber-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all group flex flex-col items-start text-left h-full"
                >
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm"
                    style={{ backgroundColor: t.bg, color: t.color }}
                  >
                    <t.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">{t.title}</h3>
                  <p className="text-sm text-[var(--text-muted)] flex-1">{t.desc}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-[var(--card-bg)] rounded-3xl p-8 border border-[var(--border)] shadow-sm max-w-2xl mx-auto text-center mt-10">
            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-[var(--border)] text-left">
              <button onClick={reset} className="p-2 hover:bg-[var(--bg)] rounded-xl transition-colors text-[var(--accent)] group" title="Torna agli strumenti">
                <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
              </button>
              <h2 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-3">
                {TOOLS.find(t => t.id === activeTool)?.title}
              </h2>
            </div>

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
              <div className="py-8 flex flex-col items-center">
                <div className="w-full text-left bg-[var(--bg)] rounded-[2rem] p-6 lg:p-8 border border-[var(--border)]">
                  <div className="space-y-6">
                    <div className="flex bg-[var(--card-bg)] p-1 rounded-xl border border-[var(--border)]">
                      {(['of', 'discount', 'increase'] as const).map(m => (
                        <button key={m} onClick={() => setPercentMode(m)} className={`flex-1 py-2 text-[10px] font-bold uppercase transition-all rounded-lg ${percentMode === m ? 'bg-amber-500 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                          {m === 'of' ? '%' : m === 'discount' ? 'Sconto' : 'Più'}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-4">
                       <input type="number" placeholder={percentMode === 'of' ? 'Quanto è il...' : percentMode === 'discount' ? 'Sconto del...' : 'Aggiungi il...'} value={percentVal1} onChange={e => setPercentVal1(e.target.value)} className="w-full p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 font-bold text-center text-xl text-[var(--text-main)]" />
                       <input type="number" placeholder="...del valore" value={percentVal2} onChange={e => setPercentVal2(e.target.value)} className="w-full p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl outline-none focus:border-amber-500 font-bold text-center text-xl text-[var(--text-main)]" />
                    </div>
                    <div className="p-6 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-center">
                       <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Risultato</p>
                       <p className="text-3xl font-black text-amber-700">
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
              </div>
            ) : activeTool === 'archive' ? (
              <div className="space-y-6 text-left">
                <div className="relative group">
                  <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] group-focus-within:text-amber-500" />
                  <input 
                    type="text" 
                    placeholder="Cerca nei documenti salvati..." 
                    value={archiveSearch}
                    onChange={(e) => setArchiveSearch(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-[var(--bg)] border border-[var(--border)] rounded-[2rem] outline-none focus:ring-4 focus:ring-amber-500/5 transition-all font-bold text-[var(--text-main)]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {modules
                    .filter(m => {
                      const hasPdf = (m as any).pdfAttachment || (m as any).receiptAttachment;
                      if (!hasPdf) return false;
                      const title = (m.title || '').toLowerCase();
                      const search = archiveSearch.toLowerCase();
                      return title.includes(search);
                    })
                    .map(m => (
                      <div 
                        key={m.id} 
                        onClick={() => {
                          setViewingDoc((m as any).pdfAttachment || (m as any).receiptAttachment);
                          setViewingTitle(m.title);
                        }}
                        className="bg-[var(--bg)] p-5 rounded-3xl border border-[var(--border)] hover:border-amber-500/50 shadow-sm transition-all cursor-pointer group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                            <Book className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-[var(--text-main)] truncate text-sm">{m.title}</h4>
                            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase mt-1">
                              {new Date(m.createdAt || Date.now()).toLocaleDateString()}
                            </p>
                          </div>
                          <Eye className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))
                  }
                  {modules.filter(m => (m as any).pdfAttachment || (m as any).receiptAttachment).length === 0 && (
                    <div className="col-span-full py-12 text-center bg-[var(--bg)] border-2 border-dashed border-[var(--border)] rounded-[2.5rem]">
                      <div className="w-16 h-16 bg-[var(--card-bg)] rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-30">
                        <Book className="w-8 h-8 text-[var(--text-muted)]" />
                      </div>
                      <p className="text-sm font-bold text-[var(--text-muted)]">Nessun documento PDF salvato.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border)] rounded-[2.5rem] bg-[var(--bg)] relative hover:bg-[var(--bg)]/80 transition-colors cursor-pointer group hover:border-amber-300">
                  <input
                    type="file"
                    multiple
                    accept={activeTool === 'img2pdf' ? 'image/jpeg, image/png' : 'application/pdf'}
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-20 h-20 bg-[var(--card-bg)] rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
                    <FileUp className="w-10 h-10 text-amber-500" />
                  </div>
                  <p className="text-xl font-bold text-[var(--text-main)] mb-2">
                    {files.length > 0 ? 'Aggiungi altri file' : `Seleziona i file ${activeTool === 'img2pdf' ? 'immagini' : 'PDF'}`}
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">oppure trascinali e rilasciali qui</p>
                </div>

                {files.length > 0 && (
                  <div className="mt-8 text-left">
                    <h4 className="text-sm font-bold text-[var(--text-muted)] uppercase mb-4">File selezionati ({files.length})</h4>
                    <div className="space-y-2 mb-8 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {files.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-[var(--bg)] rounded-xl border border-[var(--border)] group/file shadow-sm">
                          <FileCheck className="w-5 h-5 text-green-500 shrink-0" />
                          <span className="text-sm font-medium text-[var(--text-main)] truncate flex-1">{f.name}</span>
                          <button 
                            onClick={() => removeFile(i)}
                            className="p-1.5 hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 rounded-lg transition-colors opacity-0 group-hover/file:opacity-100"
                            title="Rimuovi file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={() => executeTool(false)}
                        disabled={isProcessing}
                        className="flex-1 py-4 bg-[var(--card-bg)] border-2 border-amber-500 text-amber-600 hover:bg-amber-500/10 disabled:opacity-50 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                      >
                        <FileDown className="w-5 h-5" />
                        {isProcessing ? 'Elaborazione...' : 'Scarica PDF'}
                      </button>
                      {onSaveToSandbox && (
                        <button
                          onClick={() => executeTool(true)}
                          disabled={isProcessing}
                          className="flex-1 py-4 bg-gradient-to-tr from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 disabled:opacity-50 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]"
                        >
                          {isProcessing ? 'Elaborazione...' : 'Salva in Sandbox'}
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[100002] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[var(--card-bg)] border border-[var(--border)] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[var(--text-main)] truncate uppercase tracking-wider">{viewingTitle}</h3>
                <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">Visualizzatore Interno</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const base64 = viewingDoc.split(',')[1] || viewingDoc;
                    const binary = atob(base64);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                    const blob = new Blob([bytes], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `documento_${Date.now()}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="p-2.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-xl transition-all"
                  title="Scarica"
                >
                  <FileDown className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="p-2.5 hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-10 bg-black/5">
              <div className="w-24 h-24 mb-6 bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-500">
                <Book className="w-12 h-12" />
              </div>
              <p className="text-sm font-bold text-[var(--text-main)] text-center mb-8">
                Documento Pronto per la visualizzazione
              </p>
              <button
                onClick={() => {
                  const base64 = viewingDoc.split(',')[1] || viewingDoc;
                  const binary = atob(base64);
                  const bytes = new Uint8Array(binary.length);
                  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                  const blob = new Blob([bytes], { type: 'application/pdf' });
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                  setTimeout(() => URL.revokeObjectURL(url), 60000);
                }}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <Eye className="w-5 h-5" /> Apri PDF Intero
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
