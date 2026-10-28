import React, { useState, useEffect } from 'react';
import { Undo2, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useNotifications } from '../context/NotificationContext';

export const UndoFloatingButton: React.FC<{ onActionUndone?: () => void }> = ({ onActionUndone }) => {
  const [stackDepth, setStackDepth] = useState<number>(0);
  const [latestCommand, setLatestCommand] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { setUndoMessage } = useNotifications();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchUndoStack = async () => {
    try {
      const res = await api.getUndoStack();
      setStackDepth(res.stack_depth || 0);
      if (res.commands && res.commands.length > 0) {
        setLatestCommand(res.commands[0].description);
      } else {
        setLatestCommand(null);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchUndoStack();
    const interval = setInterval(fetchUndoStack, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleUndo = async () => {
    if (stackDepth === 0 || isProcessing) return;
    setIsProcessing(true);
    try {
      const res = await api.undoLastAction();
      setToast({ message: res.message || 'Operation undone successfully', type: 'success' });
      setUndoMessage(res.message);
      fetchUndoStack();
      if (onActionUndone) onActionUndone();
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to undo operation', type: 'error' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200">
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-400 shrink-0" />
          )}
          <div>
            <div className="text-xs font-semibold text-slate-200">LIFO Stack Undo Result</div>
            <div className="text-xs text-slate-400">{toast.message}</div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40 group">
        <button
          onClick={handleUndo}
          disabled={stackDepth === 0 || isProcessing}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-full font-medium shadow-2xl transition-all duration-200 ${
            stackDepth > 0
              ? 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-indigo-500/25 ring-2 ring-brand-400/30 hover:scale-105 active:scale-95'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
          }`}
          title={latestCommand ? `Undo: ${latestCommand}` : 'Undo stack is empty'}
        >
          <Undo2 size={18} className={isProcessing ? 'animate-spin' : 'group-hover:-rotate-45 transition-transform'} />
          <span className="text-sm font-semibold">Undo Last</span>
          <div className="flex items-center gap-1 pl-1 border-l border-white/20 text-xs font-mono font-bold">
            <Layers size={13} />
            <span>{stackDepth}</span>
          </div>
        </button>

        {/* Hover preview of top of stack */}
        {latestCommand && (
          <div className="absolute bottom-full right-0 mb-2 w-64 p-2.5 bg-slate-900 border border-slate-700 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-xs text-slate-300">
            <span className="text-[10px] font-mono text-brand-400 block mb-0.5">TOP OF STACK (LIFO):</span>
            {latestCommand}
          </div>
        )}
      </div>
    </>
  );
};
