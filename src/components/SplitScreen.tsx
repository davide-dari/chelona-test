import React, { useState, useMemo } from 'react';
import { ArrowLeft, Users, Receipt, ArrowRightLeft, Plus, Check, X, Trash2, Edit2, Wallet, Camera, Paperclip, FileDown, Eye } from 'lucide-react';
import { SplitModule, SplitExpense, SplitParticipant, SplitType } from '../types';
import { calculateSplits, Settlement } from '../utils/splitAlgorithm';
import { encryption } from '../services/encryption';
import { DocumentScanner } from './DocumentScanner';
import { DocumentViewer } from './DocumentViewer';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, LineChart, Line 
} from 'recharts';

interface SplitScreenProps {
  module: SplitModule;
  onClose: () => void;
  onSave: (m: SplitModule) => void;
  onSaveToSandbox?: (title: string, base64: string) => Promise<void>;
}

const COMMON_CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD'];

// Helper for initials
const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

export const SplitScreen = ({ module, onClose, onSave, onSaveToSandbox }: SplitScreenProps) => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'participants' | 'balances' | 'dashboard'>('expenses');
  const [currency, setCurrency] = useState(module.currency || 'EUR');
  const [participants, setParticipants] = useState<SplitParticipant[]>(module.participants || []);
  const [expenses, setExpenses] = useState<SplitExpense[]>(module.expenses || []);
  const [title, setTitle] = useState(module.title || 'Gruppo Spese');

  // Modal states
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState('');

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  
  // Expense form state
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().substring(0, 10));
  const [expPaidBy, setExpPaidBy] = useState<string>('');
  const [expSplitType, setExpSplitType] = useState<SplitType>('equal');
  const [expParticipants, setExpParticipants] = useState<{participantId: string, value: number}[]>([]);
  const [expReceipt, setExpReceipt] = useState<string | undefined>(undefined);

  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  
  // Personal Mode
  const [expIsPersonal, setExpIsPersonal] = useState(false);
  const [expShouldArchive, setExpShouldArchive] = useState(false);

  const formatCurrency = (val: number) => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(val);
    } catch {
      return `${val.toFixed(2)} ${currency}`;
    }
  };

  const handleSaveAll = () => {
    onSave({
      ...module,
      title,
      currency,
      participants,
      expenses
    });
  };

  // Participant Handlers
  const handleAddParticipant = () => {
    if (!newParticipantName.trim()) return;
    const newP: SplitParticipant = {
      id: crypto.randomUUID(),
      name: newParticipantName.trim()
    };
    setParticipants([...participants, newP]);
    setNewParticipantName('');
    setShowParticipantModal(false);
  };

  const handleDeleteParticipant = (id: string) => {
    if (expenses.some(e => e.paidById === id || e.participants.some(p => p.participantId === id))) {
      alert("Non puoi eliminare un partecipante coinvolto in delle spese.");
      return;
    }
    setParticipants(participants.filter(p => p.id !== id));
  };

  // Expense Handlers
  const openNewExpense = () => {
    setExpTitle('');
    setExpAmount('');
    setExpDate(new Date().toISOString().substring(0, 10));
    setExpPaidBy(participants[0]?.id || '');
    setExpSplitType('equal');
    setExpParticipants(participants.map(p => ({ participantId: p.id, value: 0 })));
    setEditingExpenseId(null);
    setExpReceipt(undefined);
    setExpIsPersonal(false);
    setExpShouldArchive(false);
    setShowExpenseModal(true);
  };

  const openEditExpense = (exp: SplitExpense) => {
    setExpTitle(exp.title);
    setExpAmount(String(exp.amount));
    setExpDate(exp.date);
    setExpPaidBy(exp.paidById);
    setExpSplitType(exp.splitType);
    setExpParticipants(exp.participants.map(p => ({ participantId: p.participantId, value: p.value || 0 })));
    setExpReceipt(exp.receiptAttachment);
    setExpIsPersonal(exp.participants.length === 1 && exp.participants[0].participantId === exp.paidById);
    setExpShouldArchive(false);
    setEditingExpenseId(exp.id);
    setShowExpenseModal(true);
  };

  const handleSaveExpense = async () => {
    if (!expTitle || !expAmount || !expPaidBy) return;
    
    // validazione selettori a seconda del tipo
    let validParticipants = expParticipants;
    
    if (expIsPersonal) {
      validParticipants = [{ participantId: expPaidBy, value: Number(expAmount) }];
    } else {
      if (expSplitType === 'percentages' as any || expSplitType === 'percentage') {
         const sum = validParticipants.reduce((a, b) => a + (b.value || 0), 0);
         if (Math.abs(sum - 100) > 0.1) {
            alert("La somma delle percentuali deve essere 100%");
            return;
         }
      } else if (expSplitType === 'exact') {
         const sum = validParticipants.reduce((a, b) => a + (b.value || 0), 0);
         if (Math.abs(sum - Number(expAmount)) > 0.1) {
            alert(`La somma degli importi esatti deve essere ${expAmount}`);
            return;
         }
      }
    }

    const newExp: SplitExpense = {
      id: editingExpenseId || crypto.randomUUID(),
      title: expTitle,
      amount: Number(expAmount),
      date: expDate,
      paidById: expPaidBy,
      splitType: expIsPersonal ? 'exact' : expSplitType,
      participants: expIsPersonal 
        ? [{ participantId: expPaidBy, value: 1 }] 
        : validParticipants.filter(p => expSplitType === 'equal' ? true : p.value !== 0),
      receiptAttachment: expReceipt,
    };

    // Archiviazione se richiesto
    if (expShouldArchive && expReceipt && onSaveToSandbox) {
      await onSaveToSandbox(`Ricevuta: ${expTitle}`, expReceipt);
    }

    if (editingExpenseId) {
      setExpenses(expenses.map(e => e.id === editingExpenseId ? newExp : e));
    } else {
      setExpenses([...expenses, newExp]);
    }
    setShowExpenseModal(false);
  };

  const handleDeleteExpense = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setExpenses(expenses.filter(x => x.id !== id));
  }

  const { balances, settlements } = useMemo(() => calculateSplits(participants, expenses), [participants, expenses]);

  return (
    <div className="fixed inset-0 z-[150] bg-[var(--bg)] flex flex-col h-full font-sans transition-colors duration-300">
      
      {/* Header */}
      <header className="h-16 lg:h-20 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-2xl px-4 flex items-center justify-between shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => { handleSaveAll(); onClose(); }} className="p-2.5 bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--border)] rounded-xl transition-all">
            <ArrowLeft className="w-5 h-5 text-[var(--text-main)]" />
          </button>
          <div className="flex flex-col">
            <input 
               type="text" 
               value={title} 
               onChange={e => setTitle(e.target.value)} 
               className="bg-transparent border-none text-xl lg:text-2xl font-bold text-[var(--text-main)] outline-none w-full"
               placeholder="Titolo Gruppo"
            />
            <div className="flex items-center gap-2 mt-1">
                <select 
                    value={currency} 
                    onChange={e => setCurrency(e.target.value)}
                    className="bg-[var(--card-bg)] text-[10px] font-bold border border-[var(--border)] rounded px-1.5 py-0.5 outline-none text-[var(--text-muted)]"
                >
                    {COMMON_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    {!COMMON_CURRENCIES.includes(currency) && <option value={currency}>{currency}</option>}
                </select>
                <input 
                    type="text"
                    value={currency}
                    onChange={e => setCurrency(e.target.value.toUpperCase())}
                    className="bg-transparent border-none text-[10px] uppercase font-bold text-amber-500 w-12 outline-none"
                    placeholder="Es. USD"
                />
            </div>
          </div>
        </div>
        <button onClick={() => { handleSaveAll(); onClose(); }} className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
          <Check className="w-5 h-5" /> <span className="hidden sm:inline">Salva</span>
        </button>
      </header>

      {/* Tabs */}
      <div className="flex justify-around items-center border-b border-[var(--border)] bg-[var(--card-bg)] shrink-0">
        {[
          { id: 'expenses', icon: Receipt, label: 'Spese' },
          { id: 'participants', icon: Users, label: 'Chi' },
          { id: 'dashboard', icon: Wallet, label: 'Grafici' },
          { id: 'balances', icon: ArrowRightLeft, label: 'Bilanci' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex flex-col items-center justify-center p-3 sm:flex-row sm:gap-2 transition-colors ${
              activeTab === tab.id ? 'text-amber-500 border-b-2 border-amber-500 bg-amber-500/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg)]'
            }`}
          >
            <tab.icon className="w-5 h-5 mb-1 sm:mb-0" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto w-full max-w-2xl mx-auto p-4 custom-scrollbar">
        
        {/* PARTECIPANTI TAB */}
        {activeTab === 'participants' && (
          <div className="space-y-4 fade-in">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">Partecipanti ({participants.length})</h3>
                <button onClick={() => setShowParticipantModal(true)} className="flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-600 px-3 py-1.5 rounded-lg font-bold hover:bg-amber-500/20 transition-colors border border-amber-500/20">
                    <Plus className="w-4 h-4" /> Aggiungi
                </button>
            </div>
            {participants.length === 0 ? (
                <div className="text-center py-10 bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] border-dashed">
                    <Users className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-[var(--text-muted)] font-bold">Nessun partecipante</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {participants.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-amber-600">
                                    {getInitials(p.name)}
                                </div>
                                <span className="font-bold text-[var(--text-main)]">{p.name}</span>
                            </div>
                            <button onClick={() => handleDeleteParticipant(p.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-xl transition-all">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
          </div>
        )}

        {/* SPESE TAB */}
        {activeTab === 'expenses' && (
          <div className="space-y-4 fade-in pb-20">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">Lista Spese ({expenses.length})</h3>
            </div>
            {expenses.length === 0 ? (
                <div className="text-center py-10 bg-[var(--card-bg)] rounded-3xl border border-[var(--border)] border-dashed">
                    <Receipt className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-[var(--text-muted)] font-bold">Nessuna spesa inserita</p>
                </div>
            ) : (
                expenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => {
                    const payer = participants.find(p => p.id === exp.paidById);
                    return (
                        <div key={exp.id} onClick={() => openEditExpense(exp)} className="flex items-center justify-between p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm cursor-pointer hover:border-amber-400/50 transition-all active:scale-[0.99] group">
                            <div className="flex items-center gap-4">
                                <div className="hidden sm:flex w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 items-center justify-center">
                                    <Receipt className="w-6 h-6 text-purple-500" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-[var(--text-main)] text-base leading-tight mb-1 flex items-center gap-2">
                                      {exp.title}
                                      {exp.receiptAttachment && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setViewingReceipt(exp.receiptAttachment!); }}
                                          className="inline-flex items-center gap-1 text-[9px] font-bold uppercase bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                                        >
                                          <Paperclip className="w-3 h-3" /> Scontrino
                                        </button>
                                      )}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                                        Pagato da <span className="text-[var(--text-main)]">{payer?.name || 'Sconosciuto'}</span> • {new Date(exp.date).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <span className="font-black text-lg text-[var(--text-main)]">{formatCurrency(exp.amount)}</span>
                                </div>
                                <button onClick={(e) => handleDeleteExpense(exp.id, e)} className="p-2 w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all shrink-0">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })
            )}

            {/* Fab button for new expense */}
            <div className="fixed bottom-6 right-6 z-30">
                <button onClick={() => {
                    if (participants.length === 0) {
                        alert("Aggiungi prima dei partecipanti!");
                        setActiveTab('participants');
                        return;
                    }
                    openNewExpense();
                }} className="w-14 h-14 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
                    <Plus className="w-6 h-6" />
                </button>
            </div>
          </div>
        )}

        {/* BILANCI E SETTLEMENTS TAB */}
        {activeTab === 'balances' && (
          <div className="space-y-6 fade-in pb-10">
            {/* Saldi Netto */}
            <div>
                <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider mb-3">Saldi Netti</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {participants.map(p => {
                        const bal = balances[p.id] || 0;
                        const roundedBal = Math.round(bal * 100) / 100;
                        const isPos = roundedBal > 0;
                        const isNeg = roundedBal < 0;
                        return (
                            <div key={p.id} className="flex flex-col p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm">
                                <span className="font-bold text-[var(--text-main)] text-sm mb-1 truncate">{p.name}</span>
                                <span className={`text-lg font-black ${isPos ? 'text-emerald-500' : isNeg ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>
                                    {isPos ? '+' : ''}{formatCurrency(roundedBal)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Suggerimenti di pagamento */}
            <div>
                <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
                    Chi deve a chi
                </h3>
                {settlements.length === 0 ? (
                    <div className="text-center py-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/20">
                        <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm text-emerald-600 font-bold">I conti sono in pari!</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {settlements.map((s, i) => {
                            const from = participants.find(p => p.id === s.from);
                            const to = participants.find(p => p.id === s.to);
                            return (
                                <div key={i} className="flex items-center justify-between p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="font-bold text-red-500 truncate max-w-[80px] sm:max-w-xs">{from?.name}</span>
                                        <ArrowRightLeft className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                                        <span className="font-bold text-emerald-500 truncate max-w-[80px] sm:max-w-xs">{to?.name}</span>
                                    </div>
                                    <span className="font-black text-[var(--text-main)] ml-2">{formatCurrency(s.amount)}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
          </div>
        )}

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 fade-in pb-10">
            {/* Riepilogo Totale */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-amber-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Wallet className="w-24 h-24" />
                </div>
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-amber-100 text-[10px] font-black uppercase tracking-widest mb-1">Spesa Totale Gruppo</p>
                    <h2 className="text-4xl font-black">{formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}</h2>
                  </div>
                  <button 
                    onClick={() => {
                      if (participants.length === 0) {
                        alert("Aggiungi prima dei partecipanti!");
                        setActiveTab('participants');
                        return;
                      }
                      openNewExpense();
                    }}
                    className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl transition-all border border-white/20"
                    title="Aggiungi Nuova Spesa"
                  >
                    <Plus className="w-6 h-6 text-white" />
                  </button>
                </div>
                <div className="mt-4 flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-amber-100/80">
                   <span>{expenses.length} Spese</span>
                   <span>•</span>
                   <span>{participants.length} Partecipanti</span>
                </div>
            </div>
            <div className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border)] shadow-sm">
                <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider mb-6">Distribuzione Spese</h3>
                {expenses.length === 0 ? (
                  <p className="text-center text-xs text-[var(--text-muted)] py-10">Aggiungi spese per vedere il grafico</p>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={participants.map((p, i) => ({
                            name: p.name,
                            value: expenses.filter(e => e.paidById === p.id).reduce((s, e) => s + e.amount, 0)
                          })).filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {participants.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444'][index % 6]} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px' }}
                          itemStyle={{ fontWeight: 'bold' }}
                        />
                        <Legend iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </div>

            {/* Grafico Andamento Mensile (Recharts) */}
            <div className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border)] shadow-sm">
                <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider mb-6">Analisi Personale vs Gruppo</h3>
                {expenses.length === 0 ? (
                  <p className="text-center text-xs text-[var(--text-muted)] py-10">Aggiungi spese per vedere l'andamento</p>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            name: 'Spese Totali',
                            Gruppo: expenses.filter(e => !e.categoryId || e.categoryId !== 'personal').reduce((s, e) => s + e.amount, 0),
                            Personali: expenses.filter(e => e.categoryId === 'personal').reduce((s, e) => s + e.amount, 0)
                          }
                        ]}
                      >
                        <XAxis dataKey="name" hide />
                        <YAxis hide />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px' }} />
                        <Legend />
                        <Bar 
                          dataKey="Gruppo" 
                          fill="#f59e0b" 
                          radius={[10, 10, 10, 10]} 
                          name="Spese di Gruppo"
                        />
                        <Bar 
                          dataKey="Personali" 
                          fill="#3b82f6" 
                          radius={[10, 10, 10, 10]} 
                          name="Spese Personali"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </div>
            {/* Grafico Andamento Temporale (Recharts Line Chart) */}
            <div className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--border)] shadow-sm">
                <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider mb-6">Andamento Spese Ultimi 30 Giorni</h3>
                {expenses.length === 0 ? (
                  <p className="text-center text-xs text-[var(--text-muted)] py-10">Aggiungi spese per vedere l'andamento</p>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[...new Set(expenses.map(e => e.date))]
                          .sort()
                          .slice(-15)
                          .map(date => ({
                            date: new Date(date).toLocaleDateString('it', { day: '2-digit', month: 'short' }),
                            Importo: expenses.filter(e => e.date === date).reduce((s, e) => s + e.amount, 0)
                          }))
                        }
                      >
                        <XAxis dataKey="date" fontSize={10} tick={{fill: 'var(--text-muted)'}} />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="Importo" 
                          stroke="#f59e0b" 
                          strokeWidth={4} 
                          dot={{r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: 'var(--card-bg)'}} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </div>
          </div>
        )}

      </div>

      {/* Partipant Modal */}
      {showParticipantModal && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl w-full max-w-sm p-6 shadow-2xl">
                  <h3 className="text-lg font-bold text-[var(--text-main)] mb-4">Aggiungi Partecipante</h3>
                  <input 
                      autoFocus
                      type="text"
                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-main)] font-bold outline-none focus:border-amber-500 mb-6"
                      placeholder="Nome partecipante (es. Mario)"
                      value={newParticipantName}
                      onChange={e => setNewParticipantName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddParticipant()}
                  />
                  <div className="flex gap-3">
                      <button onClick={() => setShowParticipantModal(false)} className="flex-1 py-3 font-bold text-[var(--text-muted)] bg-[var(--bg)] border border-[var(--border)] rounded-xl hover:bg-[var(--border)] transition-colors">
                          Annulla
                      </button>
                      <button onClick={handleAddParticipant} className="flex-1 py-3 font-bold text-white bg-amber-500 border border-amber-500 rounded-xl hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20">
                          Salva
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
                  <div className="p-5 border-b border-[var(--border)] flex justify-between items-center shrink-0">
                      <h3 className="text-lg font-bold text-[var(--text-main)]">{editingExpenseId ? 'Modifica Spesa' : 'Nuova Spesa'}</h3>
                      <button onClick={() => setShowExpenseModal(false)} className="p-2 hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 rounded-xl transition-all">
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-5">
                      {/* Tipo Spesa: Gruppo o Personale */}
                      <div className="flex bg-[var(--bg)] p-1 rounded-2xl border border-[var(--border)]">
                        <button 
                          onClick={() => setExpIsPersonal(false)}
                          className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${!expIsPersonal ? 'bg-[var(--card-bg)] text-amber-500 shadow-sm border border-[var(--border)]' : 'text-[var(--text-muted)]'}`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Users className="w-3.5 h-3.5" />
                            Spesa di Gruppo
                          </div>
                        </button>
                        <button 
                          onClick={() => {
                            setExpIsPersonal(true);
                            // Se personale, il pagatore è il primo partecipante (di solito l'utente)
                            if (!expPaidBy && participants.length > 0) setExpPaidBy(participants[0].id);
                          }}
                          className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${expIsPersonal ? 'bg-[var(--card-bg)] text-amber-500 shadow-sm border border-[var(--border)]' : 'text-[var(--text-muted)]'}`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <User className="w-3.5 h-3.5" />
                            Spesa Personale
                          </div>
                        </button>
                      </div>

                      {/* Descrizione / Importo */}
                      <div className="grid grid-cols-1 gap-4 pt-2">
                          <input 
                              type="text" placeholder="Descrizione (es. Cena Pizzeria)"
                              value={expTitle} onChange={e => setExpTitle(e.target.value)}
                              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-main)] font-bold outline-none focus:border-amber-500"
                          />
                          <div className="flex gap-2 relative">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-amber-500">{currency}</div>
                              <input 
                                  type="number" placeholder="0.00" min="0" step="0.01"
                                  value={expAmount} onChange={e => setExpAmount(e.target.value)}
                                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl pl-16 pr-4 py-3 text-2xl text-[var(--text-main)] font-black outline-none focus:border-amber-500"
                              />
                          </div>
                      </div>

                      {/* Receipt Scanner Button */}
                      <div className="mt-2">
                        {expReceipt ? (
                          <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                              <Paperclip className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-emerald-600">Scontrino allegato</p>
                              <p className="text-[10px] text-[var(--text-muted)]">PDF scansionato pronto</p>
                            </div>
                            <button
                              onClick={() => setExpReceipt(undefined)}
                              className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowReceiptScanner(true)}
                            className="w-full flex items-center justify-center gap-3 py-3 bg-[var(--bg)] border-2 border-dashed border-[var(--border)] hover:border-amber-500/50 rounded-xl text-[var(--text-muted)] hover:text-amber-500 font-bold transition-all"
                          >
                            <Camera className="w-5 h-5" />
                            <span className="text-xs uppercase tracking-wider">Scansiona Scontrino</span>
                          </button>
                        )}

                        {expReceipt && (
                          <div className="mt-3 flex items-center gap-3 px-4 py-3 bg-[var(--bg)] border border-[var(--border)] rounded-2xl relative overflow-hidden group/receipt">
                            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover/receipt:opacity-100 transition-opacity" />
                            <input 
                              type="checkbox"
                              id="archiveToggle"
                              checked={expShouldArchive}
                              onChange={(e) => setExpShouldArchive(e.target.checked)}
                              className="w-5 h-5 rounded-lg border-[var(--border)] text-amber-500 focus:ring-amber-500 bg-[var(--card-bg)] relative z-10"
                            />
                            <label htmlFor="archiveToggle" className="text-xs font-bold text-[var(--text-main)] cursor-pointer relative z-10 flex-1">
                              Archivia in Documenti
                            </label>
                            <Check className="w-4 h-4 text-emerald-500" />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div className="flex flex-col">
                             <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">Pagato da</label>
                             <select 
                                 value={expPaidBy} onChange={e => setExpPaidBy(e.target.value)}
                                 className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-[var(--text-main)] font-bold outline-none focus:border-amber-500"
                             >
                                 {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                             </select>
                         </div>
                         <div className="flex flex-col">
                             <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-1">Data</label>
                             <input 
                                 type="date"
                                 value={expDate} onChange={e => setExpDate(e.target.value)}
                                 className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-main)] font-bold outline-none focus:border-amber-500"
                             />
                         </div>
                      </div>

                      {/* Divisione Type - Only show if not personal */}
                      {!expIsPersonal && (
                        <div className="mt-4 border-t border-[var(--border)] pt-4">
                          <label className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-2 block">Riparto spesa per</label>
                          <div className="flex flex-wrap gap-2 mb-4 bg-[var(--bg)] p-1 rounded-xl border border-[var(--border)]">
                              {[
                                  {id: 'equal', l: 'Parti uguali'}, 
                                  {id: 'exact', l: 'Importi Esatti'},
                                  {id: 'percentage', l: 'Percentuali'},
                                  {id: 'shares', l: 'Quote'}
                              ].map(t => (
                                  <button 
                                      key={t.id}
                                      onClick={() => {
                                          setExpSplitType(t.id as any);
                                          // Initialize valid values based on length
                                          const val = t.id === 'equal' ? 1 
                                                     : t.id === 'percentage' ? (100 / participants.length)
                                                     : t.id === 'exact' && expAmount ? (Number(expAmount) / participants.length)
                                                     : 1;
                                          setExpParticipants(participants.map(p => ({ participantId: p.id, value: val })));
                                      }}
                                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-colors ${expSplitType === t.id ? 'bg-[var(--card-bg)] text-[var(--text-main)] shadow-sm border border-[var(--border)]' : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                                  >
                                      {t.l}
                                  </button>
                              ))}
                          </div>

                          {/* Dettaglio Partecipanti */}
                          <div className="space-y-2 bg-[var(--bg)] rounded-2xl p-2 border border-[var(--border)] max-h-48 overflow-y-auto">
                              {participants.map(p => {
                                  const config = expParticipants.find(x => x.participantId === p.id);
                                  const isSelected = expSplitType === 'equal' ? config?.value !== 0 : true;

                                  return (
                                      <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] shadow-sm">
                                          <div className="flex items-center gap-2">
                                              {expSplitType === 'equal' && (
                                                  <input 
                                                      type="checkbox"
                                                      checked={isSelected}
                                                      onChange={(e) => {
                                                          const checked = e.target.checked;
                                                          setExpParticipants(expParticipants.map(x => x.participantId === p.id ? { ...x, value: checked ? 1 : 0 } : x));
                                                      }}
                                                      className="w-4 h-4 rounded border-[var(--border)] text-amber-500 focus:ring-amber-500"
                                                  />
                                              )}
                                              <span className="font-bold text-[var(--text-main)] text-sm">{p.name}</span>
                                          </div>

                                          {expSplitType !== 'equal' && (
                                              <div className="flex items-center gap-1 w-24">
                                                  <input 
                                                      type="number" step="any" min="0"
                                                      className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-right text-sm font-bold outline-none focus:border-amber-500"
                                                      value={config?.value || ''}
                                                      onChange={e => {
                                                          const val = Number(e.target.value);
                                                          setExpParticipants(expParticipants.map(x => x.participantId === p.id ? { ...x, value: val } : x));
                                                      }}
                                                  />
                                                  <span className="text-[10px] font-bold text-[var(--text-muted)]">
                                                      {expSplitType === 'percentage' ? '%' : expSplitType === 'shares' ? 'qt' : currency}
                                                  </span>
                                              </div>
                                          )}
                                      </div>
                                  );
                              })}
                          </div>
                        </div>
                      )}

                  </div>
                  
                  <div className="p-5 border-t border-[var(--border)] mt-auto shrink-0 flex gap-3">
                      <button onClick={handleSaveExpense} className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20">
                          <Check className="w-5 h-5" /> Salva Spesa
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Receipt Scanner Overlay */}
      {showReceiptScanner && (
        <DocumentScanner
          onCapture={(pdf) => {
            setExpReceipt(pdf);
            setShowReceiptScanner(false);
          }}
          onClose={() => setShowReceiptScanner(false)}
        />
      )}

      <DocumentViewer
        isOpen={!!viewingReceipt}
        onClose={() => setViewingReceipt(null)}
        title="Scontrino Allegato"
        data={viewingReceipt || ''}
        type="pdf"
      />

    </div>
  );
};
