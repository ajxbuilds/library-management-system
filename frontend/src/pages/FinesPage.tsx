import React, { useState, useEffect } from 'react';
import { 
  DollarSign, CheckCircle2, AlertTriangle, ShieldCheck, 
  RotateCcw, Search, User, Filter, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const FinesPage: React.FC = () => {
  const { isAdmin, isLibrarian } = useAuth();
  const [fines, setFines] = useState<any[]>([]);
  const [heapData, setHeapData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sortByHeap, setSortByHeap] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'WAIVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Waive dialog state
  const [waiveTargetId, setWaiveTargetId] = useState<number | null>(null);
  const [waiveReason, setWaiveReason] = useState<string>('Academic waiver / Medical exception');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadFines = async () => {
    try {
      setLoading(true);
      const [res, heapRes] = await Promise.all([
        api.getAllFines(sortByHeap),
        api.getFinesHeap().catch(() => null)
      ]);
      setFines(res || []);
      setHeapData(heapRes);
    } catch (err) {
      console.error('Failed to load fines', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFines();
  }, [sortByHeap]);

  const handlePay = async (fineId: number) => {
    try {
      setIsProcessing(true);
      await api.payFine(fineId);
      setActionMsg({ type: 'success', text: `Fine #${fineId} successfully paid and cleared!` });
      loadFines();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Payment failed' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWaive = async () => {
    if (!waiveTargetId) return;
    try {
      setIsProcessing(true);
      await api.waiveFine(waiveTargetId, waiveReason);
      setActionMsg({ type: 'success', text: `Fine #${waiveTargetId} waived with reason: "${waiveReason}"` });
      setWaiveTargetId(null);
      loadFines();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to waive fine' });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredFines = fines.filter((f) => {
    const s = (f.status || '').toLowerCase();
    if (filter === 'PENDING' && s !== 'pending') return false;
    if (filter === 'PAID' && s !== 'paid') return false;
    if (filter === 'WAIVED' && s !== 'waived') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return String(f.user_id).includes(q) || 
             String(f.id).includes(q) || 
             String(f.user_name || '').toLowerCase().includes(q) || 
             String(f.book_title || '').toLowerCase().includes(q);
    }
    return true;
  });

  const totalOutstanding = fines
    .filter(f => (f.status || '').toLowerCase() === 'pending')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalCollected = fines
    .filter(f => (f.status || '').toLowerCase() === 'paid')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const pendingCount = fines
    .filter(f => (f.status || '').toLowerCase() === 'pending').length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Penalties & Fines
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Min-Heap Priority Queue Ranking
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mt-1">
            Fines & Priority Penalties Ledger
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Automated rate accrual ($1.00/day overdue) ranked using a binary Min-Heap for immediate priority resolution.
          </p>
        </div>

        <button
          onClick={loadFines}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {actionMsg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${
          actionMsg.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
        }`}>
          {actionMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span className="text-sm font-medium">{actionMsg.text}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Outstanding</span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
              <AlertTriangle size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-rose-400 mt-2">
            ${totalOutstanding.toFixed(2)}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Across {pendingCount} pending fines
          </p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Settled</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-emerald-400 mt-2">
            ${totalCollected.toFixed(2)}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Cleared & accounted in treasury
          </p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Algorithmic Queue</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <DollarSign size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-indigo-300 mt-2">
            Binary Min-Heap
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            O(log n) insertion & O(log n) priority extract
          </p>
        </div>
      </div>

      {/* Real-time Min-Heap Urgency Root Banner */}
      {heapData?.most_urgent_fine && (
        <div className="p-4 bg-gradient-to-r from-rose-950/40 via-amber-950/20 to-slate-900 border border-amber-500/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ROOT OF MIN-HEAP (PEEK O(1))
              </span>
              <span className="text-xs text-slate-300 font-semibold">Highest Penalty Urgency</span>
            </div>
            <p className="text-xs text-white mt-1">
              Member <strong className="text-amber-300">{heapData.most_urgent_fine.user_name || `User #${heapData.most_urgent_fine.user_id}`}</strong> is <strong>{heapData.most_urgent_fine.days_overdue} days overdue</strong> (${heapData.most_urgent_fine.amount?.toFixed(2)}) for <em>"{heapData.most_urgent_fine.book_title}"</em>.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700">
              Heap Size: {heapData.heap_size}
            </span>
            <button
              onClick={() => handlePay(heapData.most_urgent_fine.fine_id)}
              disabled={isProcessing}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-amber-500/20"
            >
              Extract Root & Settle
            </button>
          </div>
        </div>
      )}

      {/* Fines Table */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
          <div className="flex flex-wrap items-center gap-2">
            {(['ALL', 'PENDING', 'PAID', 'WAIVED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  filter === st
                    ? 'bg-brand-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {st === 'PENDING' ? 'PENDING (OUTSTANDING)' : st}
              </button>
            ))}

            <button
              onClick={() => setSortByHeap(!sortByHeap)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                sortByHeap
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 font-semibold'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {sortByHeap ? '⚡ Min-Heap Sorted (O(log n))' : '📅 Date Sorted'}
            </button>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by User, Book, Fine ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-4 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 w-56"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredFines.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No fines found matching selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-700/50">
                <tr>
                  <th className="py-3 px-2">Fine ID</th>
                  <th className="py-3 px-2">Member</th>
                  <th className="py-3 px-2">Book Title / Loan</th>
                  <th className="py-3 px-2">Amount & Late Days</th>
                  <th className="py-3 px-2">Reason</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredFines.map((fine, idx) => {
                  const s = (fine.status || '').toLowerCase();
                  const isPending = s === 'pending';
                  const isPaid = s === 'paid';
                  return (
                    <tr key={fine.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-2 font-mono text-slate-300">
                        #{fine.id}
                        {isPending && sortByHeap && idx === 0 && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                            HEAP #1
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-white font-medium">
                        {fine.user_name || `User #${fine.user_id}`}
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-slate-200 font-medium line-clamp-1">
                          {fine.book_title || `Loan #${fine.loan_id}`}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Loan #{fine.loan_id}</span>
                      </td>
                      <td className="py-3 px-2 font-mono text-sm font-bold text-white">
                        ${fine.amount?.toFixed(2)}
                        <span className="block text-[10px] font-normal text-slate-400 font-mono">
                          {fine.days_overdue} days overdue
                        </span>
                      </td>
                      <td className="py-3 px-2 text-slate-400 max-w-xs truncate">
                        {fine.waived_reason || fine.reason || 'Overdue late penalty'}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          isPending
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : isPaid
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-700/50 text-slate-400'
                        }`}>
                          {isPending ? 'PENDING' : isPaid ? 'PAID' : 'WAIVED'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right space-x-2">
                        {isPending && (
                          <>
                            <button
                              onClick={() => handlePay(fine.id)}
                              disabled={isProcessing}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition text-xs"
                            >
                              Mark Paid
                            </button>
                            {(isAdmin || isLibrarian) && (
                              <button
                                onClick={() => setWaiveTargetId(fine.id)}
                                disabled={isProcessing}
                                className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold transition text-xs"
                              >
                                Waive
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Waive Confirmation Modal */}
      {waiveTargetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck size={18} className="text-amber-400" />
              Waive Library Penalty #{waiveTargetId}
            </h3>
            <p className="text-xs text-slate-400">
              Waiving removes the fine from the student's ledger and updates the audit log.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reason for Exemption
              </label>
              <input
                type="text"
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setWaiveTargetId(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleWaive}
                disabled={isProcessing}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
              >
                Confirm Exemption
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
