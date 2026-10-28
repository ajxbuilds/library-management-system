import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Clock, AlertTriangle, Sparkles, DollarSign, 
  Calendar, CheckCircle, ArrowRight, Bookmark, RefreshCw, Star
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { NavigationTab } from '../components/Sidebar';

interface StudentDashboardProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectBook: (bookId: number) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate, onSelectBook }) => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingFineId, setPayingFineId] = useState<number | null>(null);
  const [returningLoanId, setReturningLoanId] = useState<number | null>(null);
  const [cancellingResId, setCancellingResId] = useState<number | null>(null);
  const [isResettingQueue, setIsResettingQueue] = useState<boolean>(false);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      const [loansRes, resRes, finesRes, recsRes] = await Promise.all([
        api.getMyLoans().catch(() => []),
        api.getMyReservations().catch(() => []),
        api.getMyFines().catch(() => []),
        api.getRecommendations(4).catch(() => ({ recommendations: [] }))
      ]);
      setLoans(loansRes || []);
      setReservations(resRes || []);
      setFines(finesRes || []);
      setRecommendations(recsRes?.recommendations || []);
    } catch (err) {
      console.error('Failed to load student dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
    const handleUpdate = () => loadStudentData();
    window.addEventListener('loan-updated', handleUpdate);
    return () => window.removeEventListener('loan-updated', handleUpdate);
  }, [user]);

  const handlePayFine = async (fineId: number) => {
    try {
      setPayingFineId(fineId);
      await api.payFine(fineId);
      await loadStudentData();
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    } finally {
      setPayingFineId(null);
    }
  };

  const handleReturnBook = async (loanId: number) => {
    try {
      setReturningLoanId(loanId);
      await api.returnBook(loanId);
      window.dispatchEvent(new CustomEvent('loan-updated'));
      await loadStudentData();
    } catch (err: any) {
      alert(err.message || 'Failed to return book');
    } finally {
      setReturningLoanId(null);
    }
  };

  const handleWithdrawReservation = async (resId: number) => {
    try {
      setCancellingResId(resId);
      await api.cancelReservation(resId);
      window.dispatchEvent(new CustomEvent('loan-updated'));
      await loadStudentData();
    } catch (err: any) {
      alert(err.message || 'Failed to withdraw from queue');
    } finally {
      setCancellingResId(null);
    }
  };

  const handleResetReservations = async () => {
    if (!window.confirm('Are you sure you want to withdraw from all hold queues and reset your reservation list?')) return;
    try {
      setIsResettingQueue(true);
      await api.resetMyReservations();
      window.dispatchEvent(new CustomEvent('loan-updated'));
      await loadStudentData();
    } catch (err: any) {
      alert(err.message || 'Failed to reset queue');
    } finally {
      setIsResettingQueue(false);
    }
  };

  const activeLoans = loans.filter(l => {
    const s = (l.status || '').toLowerCase();
    return s === 'active' || s === 'overdue';
  });
  const activeReservations = reservations.filter(r => {
    const s = (r.status || '').toLowerCase();
    return s === 'pending' || s === 'ready';
  });
  const unpaidFines = fines.filter(f => {
    const s = (f.status || '').toLowerCase();
    return s === 'pending' || s === 'unpaid';
  });
  const totalFineAmount = unpaidFines.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Profile Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
              Student Space
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Tier: {user?.member_tier || 'standard'} | Quota: {user?.borrow_limit ?? 5} Books Max
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mt-1">
            Welcome back, {user?.full_name || 'Student'}!
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Track your borrowed textbooks, queue status, and personalized reading recommendations.
          </p>
        </div>

        <button
          onClick={loadStudentData}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Loans</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <BookOpen size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mt-2">
            {activeLoans.length} <span className="text-sm font-normal text-slate-400">/ {user?.borrow_limit ?? 5}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {user?.borrow_limit ? user.borrow_limit - activeLoans.length : 3} borrowing slots remaining
          </p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">FIFO Queue Holds</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Bookmark size={20} />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <h3 className="text-2xl font-bold text-white">
              {activeReservations.length}
            </h3>
            {activeReservations.length > 0 && (
              <button
                onClick={handleResetReservations}
                disabled={isResettingQueue}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-medium underline"
              >
                {isResettingQueue ? 'Resetting...' : 'Reset Queue'}
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Active book hold requests
          </p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Outstanding Fines</span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
              <DollarSign size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mt-2">
            ${totalFineAmount.toFixed(2)}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {unpaidFines.length} pending fines to clear
          </p>
        </div>
      </div>

      {/* Current Books Borrowed */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen size={18} className="text-brand-400" />
              My Current Borrowings
            </h2>
            <p className="text-xs text-slate-400">Books currently in your possession</p>
          </div>
          <button
            onClick={() => onNavigate('catalog')}
            className="text-xs font-semibold text-brand-400 hover:text-brand-300 hover:underline flex items-center gap-1"
          >
            <span>Explore Catalog</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {activeLoans.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            You do not have any borrowed books right now. Explore the catalog to borrow your first book!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {activeLoans.map((loan) => {
              const isOverdue = new Date(loan.due_date) < new Date();
              const daysLeft = Math.ceil((new Date(loan.due_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
              return (
                <div
                  key={loan.id}
                  className={`p-4 rounded-xl border ${
                    isOverdue 
                      ? 'bg-rose-950/20 border-rose-500/30' 
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  } transition`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white line-clamp-1">
                        {loan.book_title || `Book #${loan.book_id}`}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        Copy #{loan.book_copy_id || loan.copy_id || loan.id}
                      </p>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      isOverdue 
                        ? 'bg-rose-500/20 text-rose-300' 
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {isOverdue ? 'OVERDUE' : `${daysLeft} days left`}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Calendar size={12} />
                      Due: {new Date(loan.due_date).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReturnBook(loan.id)}
                        disabled={returningLoanId === loan.id}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition disabled:opacity-50"
                      >
                        {returningLoanId === loan.id ? 'Returning...' : 'Return'}
                      </button>
                      <button
                        onClick={() => onSelectBook(loan.book_id)}
                        className="text-brand-400 hover:text-brand-300 font-medium"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Book Reservations (FIFO Queue Holds) */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Bookmark size={18} className="text-amber-400" />
              My Active Reservations (FIFO Queue Line)
            </h2>
            <p className="text-xs text-slate-400">
              Your real-time position in the First-In-First-Out waiting lines. You will be automatically notified when a copy is returned.
            </p>
          </div>
          {activeReservations.length > 0 && (
            <button
              onClick={handleResetReservations}
              disabled={isResettingQueue}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition"
            >
              {isResettingQueue ? 'Resetting...' : 'Withdraw All'}
            </button>
          )}
        </div>

        {activeReservations.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            You do not have any active reservation holds in the FIFO queue.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {activeReservations.map((res) => {
              const isReady = (res.status || '').toLowerCase() === 'ready';
              return (
                <div
                  key={res.id}
                  className={`p-4 rounded-xl border ${
                    isReady 
                      ? 'bg-emerald-950/20 border-emerald-500/40' 
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  } transition`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white line-clamp-1">
                        {res.book_title || `Book #${res.book_id}`}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        Hold ID #{res.id} • Priority Weight: {res.priority_score ?? 1.0}
                      </p>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      isReady 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {isReady ? 'READY FOR PICKUP' : `POSITION #${res.queue_position}`}
                    </span>
                  </div>

                  {isReady && res.ready_until && (
                    <div className="mt-2 text-[11px] text-emerald-400 font-mono">
                      Held until {new Date(res.ready_until).toLocaleString()}
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <button
                      onClick={() => onSelectBook(res.book_id)}
                      className="text-brand-400 hover:text-brand-300 font-medium"
                    >
                      {isReady ? 'Claim Book Now →' : 'Book Details'}
                    </button>
                    <button
                      onClick={() => handleWithdrawReservation(res.id)}
                      disabled={cancellingResId === res.id}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition disabled:opacity-50"
                    >
                      {cancellingResId === res.id ? 'Withdrawing...' : 'Withdraw from Queue'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unpaid Fines Banner if any */}
      {unpaidFines.length > 0 && (
        <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between pb-3 border-b border-rose-500/20">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-rose-400" />
              <h3 className="text-sm font-bold text-white">Pending Fines Requiring Clearance</h3>
            </div>
            <span className="font-mono text-xs font-bold text-rose-300">
              Total: ${totalFineAmount.toFixed(2)}
            </span>
          </div>

          <div className="divide-y divide-slate-800 mt-3">
            {unpaidFines.map((fine) => (
              <div key={fine.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="text-white font-medium">{fine.reason || 'Late return penalty'}</p>
                  <p className="text-[11px] text-slate-400 font-mono">Fine #{fine.id} • Loan #{fine.loan_id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-rose-400">${fine.amount.toFixed(2)}</span>
                  <button
                    onClick={() => handlePayFine(fine.id)}
                    disabled={payingFineId === fine.id}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition text-xs flex items-center gap-1"
                  >
                    {payingFineId === fine.id ? 'Processing...' : 'Pay Online'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hybrid AI / Graph Recommendations */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-amber-400" />
              Recommended For Your Degree & Reading History
            </h2>
            <p className="text-xs text-slate-400">
              Generated via Graph 2-Hop Traversal and Author / Category Co-occurrence
            </p>
          </div>
          <button
            onClick={() => onNavigate('recommendations')}
            className="text-xs font-semibold text-brand-400 hover:text-brand-300 hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {recommendations.slice(0, 4).map((rec: any, idx) => {
            const book = rec.book || rec;
            return (
              <div
                key={idx}
                onClick={() => onSelectBook(book.id)}
                className="group p-4 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-brand-500/50 rounded-xl cursor-pointer transition-all duration-200"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                  <span className="font-mono text-brand-400">{book.category?.name || 'Computer Science'}</span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <Star size={12} className="fill-amber-400" />
                    {book.average_rating || 4.5}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white group-hover:text-brand-300 line-clamp-2 transition">
                  {book.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                  {book.author?.name || 'Author'}
                </p>
                <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10px]">
                  <span className="text-emerald-400 font-mono">
                    Match: {rec.match_score ? `${Math.round(rec.match_score * 100)}%` : 'Graph Proximity'}
                  </span>
                  <span className="text-brand-400 font-semibold group-hover:translate-x-0.5 transition">
                    Borrow →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
