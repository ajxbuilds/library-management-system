import React, { useState, useEffect, useRef } from 'react';
import { Search, Book as BookIcon, User, Tag, Zap, Clock } from 'lucide-react';
import { api } from '../services/api';
import { AutocompleteSuggestion } from '../types';

interface TrieAutocompleteProps {
  onSelectBook?: (bookId: number) => void;
  onSearchSubmit?: (query: string) => void;
  placeholder?: string;
}

export const TrieAutocomplete: React.FC<TrieAutocompleteProps> = ({
  onSelectBook,
  onSearchSubmit,
  placeholder = "Search 1,000+ books, authors, topics (Trie O(k))..."
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [latencyUs, setLatencyUs] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length === 0) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.autocomplete(query, 7);
        setSuggestions(res.suggestions || []);
        setLatencyUs(res.elapsed_microseconds || 0);
        setIsOpen(true);
      } catch (err) {
        console.error(err);
      }
    }, 120); // Responsive debounce

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsOpen(false);
      if (onSearchSubmit) {
        onSearchSubmit(query);
      }
    }
  };

  const handleSelect = (item: AutocompleteSuggestion) => {
    setIsOpen(false);
    if (item.type === 'book') {
      if (onSelectBook) {
        onSelectBook(item.id);
      }
      if (onSearchSubmit) {
        onSearchSubmit(item.title);
      }
    } else if (onSearchSubmit) {
      onSearchSubmit(item.title);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
          <Search size={18} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-24 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all shadow-inner"
        />
        <div className="absolute right-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-mono text-brand-400">
          <Zap size={10} className="text-yellow-400 animate-pulse" />
          <span>Trie O(k)</span>
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div 
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute z-50 left-0 right-0 mt-2 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800 bg-slate-950/40 text-[11px] text-slate-400">
            <span className="font-medium text-slate-300">Trie Prefix Autocomplete Suggestions</span>
            <span className="flex items-center gap-1 font-mono text-emerald-400">
              <Clock size={11} /> {latencyUs.toFixed(1)} μs
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
            {suggestions.map((item, idx) => (
              <button
                key={`${item.type}-${item.id}-${idx}`}
                onClick={() => handleSelect(item)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-brand-600/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${
                    item.type === 'book' ? 'bg-indigo-500/20 text-indigo-400' :
                    item.type === 'author' ? 'bg-cyan-500/20 text-cyan-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {item.type === 'book' ? <BookIcon size={14} /> :
                     item.type === 'author' ? <User size={14} /> :
                     <Tag size={14} />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-200 group-hover:text-brand-300 transition-colors">
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span className="capitalize">{item.type}</span>
                      {item.author && item.type === 'book' && (
                        <span>• by {item.author}</span>
                      )}
                      {item.category && item.type === 'book' && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {item.rating && (
                  <div className="text-xs font-mono font-medium text-amber-400">
                    ★ {item.rating}
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="px-3.5 py-2 bg-slate-950/70 border-t border-slate-800 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                if (onSearchSubmit) onSearchSubmit(query);
              }}
              className="text-xs text-brand-400 hover:text-brand-300 font-medium"
            >
              Press Enter for Full Multi-Level Ranked Search →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
