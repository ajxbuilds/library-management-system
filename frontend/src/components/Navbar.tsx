import React from 'react';
import { BookMarked, Bell, Shield, User as UserIcon, LogOut, Cpu, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { TrieAutocomplete } from './TrieAutocomplete';
import { UserRole } from '../types';

interface NavbarProps {
  onSelectBook?: (bookId: number) => void;
  onSearchSubmit?: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSelectBook, onSearchSubmit }) => {
  const { user, logout, quickLoginAs } = useAuth();
  const { unreadCount, setIsOpen } = useNotifications();

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-6 flex items-center justify-between gap-4">
      {/* Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-500/20">
          <BookMarked size={22} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              SmartLib
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-500/20 text-brand-400 border border-brand-500/30">
              DSA v2.0
            </span>
          </div>
          <p className="text-[10px] text-slate-400 hidden sm:block">Intelligent Data Structures Platform</p>
        </div>
      </div>

      {/* Center Autocomplete Search */}
      <div className="flex-1 max-w-xl hidden md:block">
        <TrieAutocomplete onSelectBook={onSelectBook} onSearchSubmit={onSearchSubmit} />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Quick Role Switcher for Demo / Viva */}
        <div className="hidden lg:flex items-center bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-xs">
          <span className="px-2 text-[11px] font-mono text-slate-400">Role:</span>
          {(['admin', 'librarian', 'student'] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => quickLoginAs(r)}
              className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-all ${
                user?.role === r
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Engine status pill */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>1,025 Indexed</span>
        </div>

        {/* Notification Bell */}
        <button
          onClick={() => setIsOpen(true)}
          className="relative p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          title="Notifications"
        >
          <Bell size={19} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Badge / Logout */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-brand-400">
              {user.full_name?.charAt(0) || user.username.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-200 leading-none">{user.full_name}</div>
              <div className="text-[10px] font-mono text-brand-400 capitalize mt-0.5">{user.role}</div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
