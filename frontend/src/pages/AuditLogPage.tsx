import React, { useState, useEffect } from 'react';
import { 
  History, RotateCcw, ShieldCheck, Search, Filter, 
  Clock, User, Layers, RefreshCw, CheckCircle2, AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [undoing, setUndoing] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadAuditData = async () => {
    try {
      setLoading(true);
      const [logsRes, stackRes] = await Promise.all([
        api.getAuditLogs(0, 50),
        api.getUndoStack()
      ]);
      setLogs(logsRes?.logs || logsRes || []);
      setUndoStack(stackRes?.commands || stackRes?.stack || []);
    } catch (err) {
      console.error('Failed to load audit data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditData();
  }, []);

  const handleUndo = async () => {
    try {
      setUndoing(true);
      const res = await api.undoLastAction();
      setActionMsg(`Undo successful: ${res.message || 'Action reverted'}`);
      loadAuditData();
    } catch (err: any) {
      setActionMsg(`Undo failed: ${err.message}`);
    } finally {
      setUndoing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
              Security & Compliance
            </span>
            <span className="text-xs text-slate-400 font-mono">
              LIFO Undo Stack & Immutable Ledger
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mt-1">
            System Audit Trail & LIFO Undo Stack
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Full compliance audit logs of all issues, returns, inventory updates, and stack-based undo operations.
          </p>
        </div>

        <button
          onClick={loadAuditData}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {actionMsg && (
        <div className="p-4 rounded-xl flex items-center gap-3 border bg-slate-900 border-brand-500/30 text-brand-300">
          <CheckCircle2 size={18} />
          <span className="text-sm font-medium">{actionMsg}</span>
        </div>
      )}

      {/* LIFO Undo Stack Box */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RotateCcw size={18} className="text-brand-400" />
              LIFO Undo Memory Stack State
            </h3>
            <p className="text-xs text-slate-400">
              Operations pushed to stack can be popped in reverse order with compensation handlers.
            </p>
          </div>

          <button
            onClick={handleUndo}
            disabled={undoing || undoStack.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-40 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition self-start sm:self-auto"
          >
            <RotateCcw size={14} className={undoing ? 'animate-spin' : ''} />
            <span>Pop & Undo Top Action</span>
          </button>
        </div>

        {undoStack.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-3">
            Stack is empty. Complete an operation (e.g. issue or return a book) to push a command to the stack.
          </p>
        ) : (
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-mono">Stack Depth: {undoStack.length} entries</span>
            <div className="flex flex-wrap gap-3">
              {undoStack.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs min-w-[200px] ${
                    idx === undoStack.length - 1
                      ? 'bg-brand-500/10 border-brand-500/50 text-brand-300 font-semibold shadow-lg'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span>Stack #{idx}</span>
                    {idx === undoStack.length - 1 && <span className="bg-brand-500/20 px-1 rounded text-white">TOP</span>}
                  </div>
                  <p className="text-white">{item.action_type || item.action || 'OPERATION'}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    Entity #{item.entity_id || item.target_id || 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white mb-2">Audit Ledger Entries</h3>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No audit records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-700/50">
                <tr>
                  <th className="py-3 px-2">Log ID</th>
                  <th className="py-3 px-2">Action</th>
                  <th className="py-3 px-2">Performed By</th>
                  <th className="py-3 px-2">Timestamp</th>
                  <th className="py-3 px-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-2 text-slate-400">#{log.id}</td>
                    <td className="py-3 px-2 font-sans font-bold text-white">
                      <span className="px-2 py-0.5 bg-slate-700 rounded text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-brand-300">User #{log.user_id}</td>
                    <td className="py-3 px-2 text-slate-400 font-sans">
                      {new Date(log.created_at || Date.now()).toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-slate-400 font-sans max-w-sm truncate">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || 'Standard execution'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
