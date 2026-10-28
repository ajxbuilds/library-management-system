import React, { useState, useEffect } from 'react';
import { X, BookOpen, Star, Calendar, Hash, Tag, Layers, CheckCircle2, AlertCircle, BookmarkPlus } from 'lucide-react';
import { Book } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface BookDetailModalProps {
  bookId: number | null;
  onClose: () => void;
  onSuccessAction?: () => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({ bookId, onClose, onSuccessAction }) => {
  const { user, isLibrarian } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [queueInfo, setQueueInfo] = useState<{ queue_length: number } | null>(null);
  const [alreadyBorrowed, setAlreadyBorrowed] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!bookId) return;
    const fetchBook = async () => {
      setIsLoading(true);
      try {
        const data = await api.getBookById(bookId);
        setBook(data);
        const q = await api.getBookQueue(bookId);
        setQueueInfo(q);

        if (user) {
          try {
            const myLoans = await api.getMyLoans();
            const hasActive = myLoans.some((l: any) => {
              const status = l.status?.toLowerCase();
              return l.book_id === bookId && (status === 'active' || status === 'overdue');
            });
            setAlreadyBorrowed(hasActive);
          } catch {
            // ignore
          }
        }
      } catch (e: any) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBook();
  }, [bookId, user]);

  if (!bookId) return null;

  const handleIssue = async () => {
    if (!book || !user) return;
    setIsSubmitting(true);
    setActionMessage(null);
    try {
      const res = await api.issueBook(user.id, book.id);
      setActionMessage({ type: 'success', text: res.message || 'Book issued successfully!' });
      setAlreadyBorrowed(true);
      const updated = await api.getBookById(book.id);
      setBook(updated);
      window.dispatchEvent(new CustomEvent('loan-updated'));
      if (onSuccessAction) onSuccessAction();
    } catch (e: any) {
      setActionMessage({ type: 'error', text: e.message || 'Failed to issue book' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReserve = async () => {
    if (!book || !user) return;
    setIsSubmitting(true);
    setActionMessage(null);
    try {
      const res = await api.reserveBook(user.id, book.id);
      setActionMessage({
        type: 'success',
        text: `Reserved! You are #${res.queue_position} in the FIFO reservation line.`
      });
      const q = await api.getBookQueue(book.id);
      setQueueInfo(q);
      if (onSuccessAction) onSuccessAction();
    } catch (e: any) {
      setActionMessage({ type: 'error', text: e.message || 'Failed to reserve book' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400">
              <BookOpen size={18} />
            </span>
            <span className="text-sm font-mono text-slate-400">Book Details & Physical Copy Allocation</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {isLoading || !book ? (
          <div className="p-12 text-center text-slate-400">Loading book data via Hash Index...</div>
        ) : (
          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Status messages */}
            {actionMessage && (
              <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                actionMessage.type === 'success' ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
              }`}>
                {actionMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{actionMessage.text}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-6">
              {/* Cover */}
              <div className="w-full sm:w-44 h-56 rounded-xl bg-slate-800 border border-slate-700/60 overflow-hidden shrink-0 shadow-lg">
                <img
                  src={book.cover_image || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80"}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Details */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    {book.category_name || "General"}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-amber-400 font-mono font-medium">
                    <Star size={13} fill="currentColor" /> {book.average_rating} / 5.0
                  </span>
                  <span className="text-xs text-slate-500">• {book.borrow_count} total borrows</span>
                </div>

                <h1 className="text-xl font-bold text-slate-100 leading-snug">{book.title}</h1>
                <p className="text-sm text-slate-300 font-medium">By {book.author_name || "Unknown Author"}</p>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Hash size={13} className="text-slate-500" />
                    <span>ISBN: {book.isbn}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-500" />
                    <span>Year: {book.publication_year} ({book.edition || '1st'} Ed.)</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed pt-2 line-clamp-3">
                  {book.description || "No description provided."}
                </p>
              </div>
            </div>

            {/* Inventory Status Grid */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-semibold uppercase text-slate-300">
                  Real-Time Physical Inventory
                </span>
                <span className="text-xs text-brand-400 font-mono">
                  {book.available_copies > 0 ? 'AVAILABLE IN REPOSITORY' : 'CURRENTLY OUT OF STOCK'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-lg font-bold text-slate-100">{book.total_copies}</div>
                  <div className="text-[10px] text-slate-400 font-mono">Total Copies</div>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-lg font-bold text-emerald-400">{book.available_copies}</div>
                  <div className="text-[10px] text-emerald-300 font-mono">Available</div>
                </div>
                <div className="p-2.5 rounded-lg bg-brand-500/10 border border-brand-500/20">
                  <div className="text-lg font-bold text-brand-400">{book.issued_copies}</div>
                  <div className="text-[10px] text-brand-300 font-mono">Issued</div>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="text-lg font-bold text-amber-400">{book.reserved_copies}</div>
                  <div className="text-[10px] text-amber-300 font-mono">Reserved</div>
                </div>
              </div>

              {queueInfo && queueInfo.queue_length > 0 && (
                <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                  <span>FIFO Reservation Queue Active</span>
                  <span className="font-mono font-bold">{queueInfo.queue_length} student(s) waiting</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Close
              </button>

              {alreadyBorrowed ? (
                <div className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  <span>Already Borrowed (In Your Possession)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReserve}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <BookmarkPlus size={15} />
                    <span>Join FIFO Queue</span>
                  </button>
                  {book.available_copies > 0 && (
                    <button
                      onClick={handleIssue}
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <BookOpen size={15} />
                      <span>Borrow Book (Issue Copy)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
