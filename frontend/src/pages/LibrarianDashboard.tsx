import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, CheckCircle2, AlertCircle, RefreshCw, 
  Search, BookOpen, Clock, RotateCcw, User, Layers, Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { NavigationTab } from '../components/Sidebar';

interface LibrarianDashboardProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectBook: (bookId: number) => void;
}

export const LibrarianDashboard: React.FC<LibrarianDashboardProps> = ({ onNavigate, onSelectBook }) => {
  const [userId, setUserId] = useState('');
  const [bookId, setBookId] = useState('');
  const [loanDays, setLoanDays] = useState(14);
  const [deskMode, setDeskMode] = useState<'ISSUE' | 'QUEUE'>('ISSUE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [recentlyReturned, setRecentlyReturned] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDeskData = async () => {
    try {
      setLoading(true);
      const [loansRes, returnedRes] = await Promise.all([
        api.getActiveLoans(),
        api.getRecentlyReturned()
      ]);
      setActiveLoans(loansRes || []);
      setRecentlyReturned(returnedRes?.recent_returns || []);
    } catch (err) {
      console.error('Failed to load desk data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeskData();
  }, []);

  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !bookId) {
      setActionMessage({ type: 'error', text: 'Please enter both Member ID and Book ID' });
      return;
    }

    try {
      setIsSubmitting(true);
      setActionMessage(null);
      const res = await api.issueBook(parseInt(userId), parseInt(bookId), loanDays);
      setActionMessage({ 
        type: 'success', 
        text: `Successfully issued book #${bookId} to user #${userId}. Due date: ${new Date(res.due_date).toLocaleDateString()}` 
      });
      setBookId('');
      loadDeskData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to issue book' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnqueueHold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !bookId) {
      setActionMessage({ type: 'error', text: 'Please enter both Member ID and Book ID' });
      return;
    }

    try {
      setIsSubmitting(true);
      setActionMessage(null);
      const res = await api.reserveBook(parseInt(userId), parseInt(bookId));
      setActionMessage({
        type: 'success',
        text: `Successfully queued User #${userId} for Book #${bookId}! Position in FIFO Queue: #${res.queue_position}`
      });
      setBookId('');
      loadDeskData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to place book in queue' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeedDemo = async () => {
    try {
      setSeedingDemo(true);
      const res = await api.seedDemoCirculation();
      setActionMessage({ type: 'success', text: res.message });
      loadDeskData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to seed demo data' });
    } finally {
      setSeedingDemo(false);
    }
  };

  const handleClearDemo = async () => {
    try {
      setSeedingDemo(true);
      const res = await api.clearDemoCirculation();
      setActionMessage({ type: 'success', text: res.message });
      loadDeskData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to clear circulation data' });
    } finally {
      setSeedingDemo(false);
    }
  };

  const handleReturn = async (loanId: number) => {
    try {
      const res = await api.returnBook(loanId);
      const fineMsg = res.fine_amount > 0 ? ` (Fine applied: $${res.fine_amount.toFixed(2)})` : ' (No fine)';
      setActionMessage({ type: 'success', text: `Book returned successfully!${fineMsg}. Added to LIFO Undo Stack.` });
      loadDeskData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to return book' });
    }
  };

  const overdueLoans = activeLoans.filter(l => {
    return new Date(l.due_date) < new Date();
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Circulation Desk
            </span>
            <span className="text-xs text-slate-400 font-mono">
              FIFO Reservation Queue & Return Stack Active
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mt-1">
            Librarian Command Desk
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Process checkout requests, register book returns, and supervise priority overdues.
          </p>
        </div>

        <button
          onClick={loadDeskData}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Desk</span>
        </button>
      </div>

      {/* Professor Demo Action Toolbar */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-amber-400" />
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Viva / Professor Demonstration Toolkit</h3>
            <p className="text-[11px] text-slate-400">Load sample active loans, overdue heaps, and FIFO waitlists with one click.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedDemo}
            disabled={seedingDemo}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles size={13} />
            <span>{seedingDemo ? 'Processing...' : '⚡ Load Demo Dataset'}</span>
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

      {actionMessage && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${
          actionMessage.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{actionMessage.text}</span>
        </div>
      )}

      {/* Main Grid: Fast Issue Form + Overdue Alert Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fast Issue & Queue Form */}
        <div className="lg:col-span-1 bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                <ArrowLeftRight size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {deskMode === 'ISSUE' ? 'Express Checkout' : 'FIFO Hold Queue'}
                </h2>
                <p className="text-xs text-slate-400">
                  {deskMode === 'ISSUE' ? 'Issue physical copy to borrower' : 'Place borrower in FIFO waitlist'}
                </p>
              </div>
            </div>
          </div>

          {/* Mode Switcher: Issue vs Put in Queue */}
          <div className="mt-4 grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setDeskMode('ISSUE')}
              className={`py-1.5 rounded-lg transition font-semibold ${
                deskMode === 'ISSUE'
                  ? 'bg-brand-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Issue Book
            </button>
            <button
              type="button"
              onClick={() => setDeskMode('QUEUE')}
              className={`py-1.5 rounded-lg transition font-semibold ${
                deskMode === 'QUEUE'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Put in Queue (Hold)
            </button>
          </div>

          <form onSubmit={deskMode === 'ISSUE' ? handleIssueBook : handleEnqueueHold} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Member ID
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  placeholder="e.g. 3 (Student), 4, 5"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
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
                  value={bookId}
                  onChange={(e) => setBookId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  required
                />
              </div>
            </div>

            {deskMode === 'ISSUE' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Loan Duration
                </label>
                <select
                  value={loanDays}
                  onChange={(e) => setLoanDays(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
                >
                  <option value={7}>7 Days (Fast return)</option>
                  <option value={14}>14 Days (Standard Student)</option>
                  <option value={30}>30 Days (Faculty / Research)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2.5 px-4 rounded-xl text-white font-semibold text-sm shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 ${
                deskMode === 'ISSUE'
                  ? 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-brand-600/30'
                  : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-600/30'
              }`}
            >
              {deskMode === 'ISSUE' ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>{isSubmitting ? 'Issuing Copy...' : 'Issue Physical Copy'}</span>
                </>
              ) : (
                <>
                  <Layers size={16} />
                  <span>{isSubmitting ? 'Enqueuing...' : 'Put Book in FIFO Queue (Hold)'}</span>
                </>
              )}
            </button>
          </form>

          {/* Recently Returned Stack (LIFO Preview) */}
          <div className="mt-8 pt-6 border-t border-slate-700/60">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <RotateCcw size={14} className="text-amber-400" />
                Return Shelving Stack (LIFO)
              </span>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                Top of Stack
              </span>
            </div>

            {recentlyReturned.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No recent returns on shelf stack.</p>
            ) : (
              <div className="space-y-2">
                {recentlyReturned.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-900/70 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-200">Book #{item.book_id || item.title || 'ID'}</p>
                      <p className="text-[11px] text-slate-400">Copy #{item.copy_id}</p>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400">Ready to Reshelf</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Overdue Loans & Active Loans Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overdue Priority Box */}
          <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-rose-500/20">
              <div className="flex items-center gap-2">
                <AlertCircle size={20} className="text-rose-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Overdue Borrowings Priority Heap</h3>
                  <p className="text-xs text-rose-300/80">Managed by Min-Heap based on days overdue</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 font-mono">
                {overdueLoans.length} Overdue
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              {overdueLoans.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No overdue loans currently! System is clean.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-700/50">
                    <tr>
                      <th className="py-2">Loan ID</th>
                      <th className="py-2">Member</th>
                      <th className="py-2">Book Title</th>
                      <th className="py-2">Due Date</th>
                      <th className="py-2 text-right">Quick Return</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {overdueLoans.slice(0, 5).map((loan) => (
                      <tr key={loan.id} className="hover:bg-rose-900/10">
                        <td className="py-2.5 font-mono text-slate-300">#{loan.id}</td>
                        <td className="py-2.5 text-white font-medium">User #{loan.user_id}</td>
                        <td className="py-2.5 text-slate-200">
                          <button
                            onClick={() => onSelectBook(loan.book_id)}
                            className="hover:text-brand-300 hover:underline text-left"
                          >
                            Book #{loan.book_id}
                          </button>
                        </td>
                        <td className="py-2.5 font-mono text-rose-400">
                          {new Date(loan.due_date).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleReturn(loan.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition"
                          >
                            Return & Fine
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Active Loans Table */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <div>
                <h3 className="text-base font-bold text-white">Active Circulations</h3>
                <p className="text-xs text-slate-400">All current books on loan across students & staff</p>
              </div>
              <button
                onClick={() => onNavigate('circulation')}
                className="text-xs font-semibold text-brand-400 hover:text-brand-300 hover:underline"
              >
                View Full Queue →
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-700/50">
                  <tr>
                    <th className="py-2">Loan ID</th>
                    <th className="py-2">User ID</th>
                    <th className="py-2">Book ID</th>
                    <th className="py-2">Issued On</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {activeLoans.slice(0, 7).map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 font-mono text-slate-300">#{loan.id}</td>
                      <td className="py-2.5 text-white">User #{loan.user_id}</td>
                      <td className="py-2.5">
                        <button
                          onClick={() => onSelectBook(loan.book_id)}
                          className="text-brand-400 hover:underline"
                        >
                          Book #{loan.book_id}
                        </button>
                      </td>
                      <td className="py-2.5 text-slate-400">
                        {new Date(loan.issued_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {loan.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => handleReturn(loan.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-brand-600 text-white font-medium transition"
                        >
                          Return Book
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
