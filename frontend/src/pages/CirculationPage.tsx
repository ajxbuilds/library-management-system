import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, Clock, AlertTriangle, CheckCircle, 
  RotateCcw, Search, User, BookOpen, Layers, Users, RefreshCw, Sparkles
} from 'lucide-react';
import { api } from '../services/api';

interface CirculationPageProps {
  onSelectBook: (bookId: number) => void;
}

export const CirculationPage: React.FC<CirculationPageProps> = ({ onSelectBook }) => {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'OVERDUE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quick Issue & Queue Desk state
  const [deskUserId, setDeskUserId] = useState('');
  const [deskBookId, setDeskBookId] = useState('');
  const [deskLoanDays, setDeskLoanDays] = useState(14);
  const [deskMode, setDeskMode] = useState<'ISSUE' | 'QUEUE'>('ISSUE');
  const [deskSubmitting, setDeskSubmitting] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);

  // Book Queue inspect state
  const [inspectBookId, setInspectBookId] = useState<string>('5');
  const [queueData, setQueueData] = useState<any>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [activeQueuesList, setActiveQueuesList] = useState<any[]>([]);

  const loadLoans = async () => {
    try {
      setLoading(true);
      const res = await api.getActiveLoans();
      setLoans(res || []);
    } catch (err) {
      console.error('Failed to load circulation loans', err);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deskUserId || !deskBookId) {
      setActionMsg({ type: 'error', text: 'Please enter both Member ID and Book ID' });
      return;
    }
    try {
      setDeskSubmitting(true);
      const res = await api.issueBook(parseInt(deskUserId), parseInt(deskBookId), deskLoanDays);
      setActionMsg({
        type: 'success',
        text: `Successfully issued Book #${deskBookId} to User #${deskUserId}. Due date: ${new Date(res.due_date).toLocaleDateString()}`
      });
      setDeskBookId('');
      loadLoans();
      loadActiveQueues();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to issue book' });
    } finally {
      setDeskSubmitting(false);
    }
  };

  const handleEnqueueHold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deskUserId || !deskBookId) {
      setActionMsg({ type: 'error', text: 'Please enter both Member ID and Book ID' });
      return;
    }
    try {
      setDeskSubmitting(true);
      const res = await api.reserveBook(parseInt(deskUserId), parseInt(deskBookId));
      setActionMsg({
        type: 'success',
        text: `Successfully placed User #${deskUserId} in FIFO Queue for Book #${deskBookId}! Position: #${res.queue_position}`
      });
      setInspectBookId(deskBookId);
      loadQueue(parseInt(deskBookId));
      loadActiveQueues();
      setDeskBookId('');
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to place book in queue' });
    } finally {
      setDeskSubmitting(false);
    }
  };

  const handleSeedDemo = async () => {
    try {
      setSeedingDemo(true);
      const res = await api.seedDemoCirculation();
      setActionMsg({ type: 'success', text: res.message });
      loadLoans();
      loadActiveQueues();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to seed demo data' });
    } finally {
      setSeedingDemo(false);
    }
  };

  const handleClearDemo = async () => {
    try {
      setSeedingDemo(true);
      const res = await api.clearDemoCirculation();
      setActionMsg({ type: 'success', text: res.message });
      loadLoans();
      loadActiveQueues();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to clear circulation data' });
    } finally {
      setSeedingDemo(false);
    }
  };

  const loadQueue = async (bookIdNum: number) => {
    try {
      setQueueLoading(true);
      const res = await api.getBookQueue(bookIdNum);
      setQueueData(res);
    } catch (err) {
      console.error('Failed to load queue for book', err);
    } finally {
      setQueueLoading(false);
    }
  };

  const loadActiveQueues = async () => {
    try {
      const activeList = await api.getActiveQueues();
      setActiveQueuesList(activeList || []);
      if (activeList && activeList.length > 0) {
        setInspectBookId(String(activeList[0].book_id));
        loadQueue(activeList[0].book_id);
      } else {
        loadQueue(5);
      }
    } catch {
      loadQueue(5);
    }
  };

  useEffect(() => {
    loadLoans();
    loadActiveQueues();
  }, []);

  const handleReturn = async (loanId: number) => {
    try {
      const res = await api.returnBook(loanId);
      const fineNotice = res.fine_amount > 0 ? ` (Overdue fine generated: $${res.fine_amount.toFixed(2)})` : ' (No fine)';
      setActionMsg({
        type: 'success',
        text: `Book returned successfully!${fineNotice}. Action recorded to LIFO Undo Stack.`
      });
      loadLoans();
      if (queueData?.book_id) loadQueue(queueData.book_id);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to return book' });
    }
  };

  const filteredLoans = loans.filter((l) => {
    const isOverdue = new Date(l.due_date) < new Date();
    if (filter === 'ACTIVE' && isOverdue) return false;
    if (filter === 'OVERDUE' && !isOverdue) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchUser = String(l.user_id).includes(q);
      const matchBook = String(l.book_id).includes(q);
      return matchUser || matchBook;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Circulation Management
            </span>
            <span className="text-xs text-slate-400 font-mono">
              FIFO Reservation Queues & Min-Heap Overdue Priority
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mt-1">
            Active Loans & FIFO Waiting Queues
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Supervise book checkouts, calculate automated overdue fines, and track fair FIFO queue reservations.
          </p>
        </div>

        <button
          onClick={loadLoans}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Loans</span>
        </button>
      </div>

      {actionMsg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${
          actionMsg.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
        }`}>
          {actionMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span className="text-sm font-medium">{actionMsg.text}</span>
        </div>
      )}

      {/* Professor Demo Action Toolbar */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-amber-400" />
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Professor Demonstration Toolkit</h3>
            <p className="text-[11px] text-slate-400">Instantly populate or reset active borrowings, overdue penalties, and waiting queues.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedDemo}
            disabled={seedingDemo}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles size={13} />
            <span>{seedingDemo ? 'Loading...' : '⚡ Load Demo Dataset'}</span>
          </button>
          <button
            onClick={handleClearDemo}
            disabled={seedingDemo}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 text-xs font-semibold border border-slate-700 hover:border-rose-500/40 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw size={13} />
            <span>Clear All Data</span>
          </button>
        </div>
      </div>

      {/* Fast Issue / Queue Desk Card */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <ArrowLeftRight size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {deskMode === 'ISSUE' ? 'Express Checkout' : 'FIFO Hold Queue Desk'}
              </h2>
              <p className="text-xs text-slate-400">
                {deskMode === 'ISSUE' ? 'Issue available book copy to member' : 'Place borrower into FIFO reservation queue for held/popular books'}
              </p>
            </div>
          </div>

          {/* Toggle between Issue and Queue */}
          <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-medium w-full sm:w-64">
            <button
              type="button"
              onClick={() => setDeskMode('ISSUE')}
              className={`py-1.5 rounded-lg transition font-semibold ${
                deskMode === 'ISSUE' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Issue Book
            </button>
            <button
              type="button"
              onClick={() => setDeskMode('QUEUE')}
              className={`py-1.5 rounded-lg transition font-semibold ${
                deskMode === 'QUEUE' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Put in Queue
            </button>
          </div>
        </div>

        <form onSubmit={deskMode === 'ISSUE' ? handleIssueBook : handleEnqueueHold} className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Member ID
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                placeholder="e.g. 3 (Student), 4, 5"
                value={deskUserId}
                onChange={(e) => setDeskUserId(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Book ID
            </label>
            <div className="relative">
              <BookOpen size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                placeholder="e.g. 1 (CLRS), 5 (Clean Code)"
                value={deskBookId}
                onChange={(e) => setDeskBookId(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={deskSubmitting}
              className={`w-full py-2.5 px-4 rounded-xl text-white font-semibold text-xs shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 ${
                deskMode === 'ISSUE'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
              }`}
            >
              {deskMode === 'ISSUE' ? (
                <>
                  <CheckCircle size={15} />
                  <span>{deskSubmitting ? 'Issuing...' : 'Issue Physical Copy'}</span>
                </>
              ) : (
                <>
                  <Layers size={15} />
                  <span>{deskSubmitting ? 'Enqueuing...' : 'Put in FIFO Queue'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* FIFO Waiting Queue Visualizer Widget */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers size={18} className="text-amber-400" />
              FIFO Book Reservation Queue Inspector
            </h3>
            <p className="text-xs text-slate-400">
              When a copy is returned, the Front of the FIFO Queue is automatically assigned next priority.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            {activeQueuesList.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400">Waiting Lines:</span>
                {activeQueuesList.map((q) => (
                  <button
                    key={q.book_id}
                    onClick={() => {
                      setInspectBookId(String(q.book_id));
                      loadQueue(q.book_id);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                      inspectBookId === String(q.book_id)
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    #{q.book_id} ({q.queue_length} waiting)
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Book ID:</span>
              <input
                type="number"
                value={inspectBookId}
                onChange={(e) => setInspectBookId(e.target.value)}
                className="w-16 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white text-center font-mono"
              />
              <button
                onClick={() => inspectBookId && loadQueue(parseInt(inspectBookId))}
                disabled={queueLoading}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition"
              >
                {queueLoading ? '...' : 'Inspect Queue'}
              </button>
            </div>
          </div>
        </div>

        {/* Visual Queue Pipeline */}
        <div className="mt-5">
          {!queueData || queueData.queue_length === 0 ? (
            <div className="p-6 bg-slate-900/50 rounded-xl border border-dashed border-slate-700 text-center text-xs text-slate-400">
              No members currently waiting in queue for Book #{inspectBookId}.
              Copies can be checked out immediately!
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>
                  Front of Queue for <strong className="text-white">{queueData.book_title || `Book #${inspectBookId}`}</strong> (Next in Line):
                </span>
                <span className="font-mono text-amber-400 font-semibold">Queue Size: {queueData.queue_length}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 overflow-x-auto pb-2">
                {(queueData.queue_items || queueData.fifo_queue_items || []).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={`p-3.5 rounded-xl border min-w-[190px] ${
                      idx === 0 
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' 
                        : 'bg-slate-900/80 border-slate-800 text-slate-300'
                    }`}>
                      <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                        <span className="font-bold">Position #{idx + 1}</span>
                        {idx === 0 && <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded font-bold">FRONT (NEXT)</span>}
                      </div>
                      <p className="text-xs font-bold text-white">{item.user_name || `User #${item.user_id}`}</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-mono">
                        Held: {new Date(item.reserved_at || item.created_at || Date.now()).toLocaleDateString()}
                      </p>
                    </div>

                    {idx < (queueData.queue_items || queueData.fifo_queue_items || []).length - 1 && (
                      <span className="text-slate-600 font-bold text-lg">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loans Table with Filters */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                filter === 'ALL' ? 'bg-brand-600 text-white font-semibold' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All Active ({loans.length})
            </button>
            <button
              onClick={() => setFilter('OVERDUE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                filter === 'OVERDUE' ? 'bg-rose-600 text-white font-semibold' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Overdue ({loans.filter(l => new Date(l.due_date) < new Date()).length})
            </button>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by User or Book ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-4 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No active loans found matching current criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-700/50">
                <tr>
                  <th className="py-3 px-2">Loan ID</th>
                  <th className="py-3 px-2">Member</th>
                  <th className="py-3 px-2">Book Title / ID</th>
                  <th className="py-3 px-2">Issued On</th>
                  <th className="py-3 px-2">Due Date</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-right">Circulation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredLoans.map((loan) => {
                  const isOverdue = new Date(loan.due_date) < new Date();
                  return (
                    <tr key={loan.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-2 font-mono text-slate-300">#{loan.id}</td>
                      <td className="py-3 px-2 text-white font-medium">
                        {loan.user_name || `User #${loan.user_id}`}
                      </td>
                      <td className="py-3 px-2">
                        <button
                          onClick={() => onSelectBook(loan.book_id)}
                          className="text-brand-400 hover:text-brand-300 hover:underline text-left font-medium line-clamp-1"
                        >
                          {loan.book_title || `Book #${loan.book_id}`}
                        </button>
                      </td>
                      <td className="py-3 px-2 text-slate-400 font-mono">
                        {new Date(loan.issue_date || loan.issued_at || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 font-mono">
                        <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                          {new Date(loan.due_date).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                          isOverdue 
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {isOverdue ? 'OVERDUE' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => handleReturn(loan.id)}
                          className={`px-3 py-1.5 rounded-lg text-white font-semibold transition text-xs ${
                            isOverdue 
                              ? 'bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/30' 
                              : 'bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-600/30'
                          }`}
                        >
                          Process Return
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
