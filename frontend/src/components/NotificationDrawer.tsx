import React from 'react';
import { Bell, Check, Clock, AlertTriangle, BookOpen, ShieldCheck, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export const NotificationDrawer: React.FC = () => {
  const { notifications, unreadCount, isOpen, setIsOpen, markAsRead, markAllAsRead } = useNotifications();

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'book_issued':
      case 'book_returned':
        return <BookOpen size={16} className="text-brand-400" />;
      case 'overdue_warning':
      case 'fine_generated':
        return <AlertTriangle size={16} className="text-amber-400" />;
      case 'reservation_ready':
        return <Check size={16} className="text-emerald-400" />;
      default:
        return <ShieldCheck size={16} className="text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-brand-500/10 rounded-xl text-brand-400">
                <Bell size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">Notification Center</h2>
                <p className="text-xs text-slate-400">{unreadCount} unread alert{unreadCount === 1 ? '' : 's'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-brand-400 hover:text-brand-300 font-medium px-2 py-1 rounded bg-brand-500/10"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400">
                <Bell size={36} className="text-slate-600 mb-2" />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs text-slate-500">You're all caught up with library updates.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                  className={`p-4 rounded-xl transition-all cursor-pointer ${
                    n.is_read ? 'opacity-65 hover:opacity-90' : 'bg-slate-800/50 hover:bg-slate-800 border-l-4 border-brand-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-950/60 mt-0.5">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200">{n.title}</span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                          <Clock size={10} />
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
