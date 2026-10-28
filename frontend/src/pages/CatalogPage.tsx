import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, SlidersHorizontal, BookOpen, Star, 
  Layers, CheckCircle, Clock, ChevronLeft, ChevronRight,
  Hash, Cpu, Sparkles, AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { TrieAutocomplete } from '../components/TrieAutocomplete';

interface CatalogPageProps {
  onSelectBook: (bookId: number) => void;
  initialSearchQuery?: string;
  onClearSearch?: () => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({ onSelectBook, initialSearchQuery, onClearSearch }) => {
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>('title');
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize] = useState<number>(18);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Hash Map O(1) Lookup widget
  const [hashIsbn, setHashIsbn] = useState('');
  const [hashResult, setHashResult] = useState<any>(null);
  const [hashSearching, setHashSearching] = useState(false);
  const [hashLatency, setHashLatency] = useState<number | null>(null);

  // AVL Range Query state
  const [minYear, setMinYear] = useState<number>(2000);
  const [maxYear, setMaxYear] = useState<number>(2026);
  const [avlResultsCount, setAvlResultsCount] = useState<number | null>(null);
  const [isAvlActive, setIsAvlActive] = useState<boolean>(false);

  // Load books
  const loadBooks = async () => {
    try {
      setLoading(true);
      const [booksRes, catsRes] = await Promise.all([
        api.getBooks({
          skip: currentPage * pageSize,
          limit: pageSize,
          category_id: selectedCategory,
          sort_by: sortBy
        }),
        api.getCategories()
      ]);
      setBooks(booksRes || []);
      setCategories(catsRes || []);
      setIsAvlActive(false);
    } catch (err) {
      console.error('Failed to load books catalog', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAvlActive && !searchQuery) {
      loadBooks();
    }
  }, [currentPage, selectedCategory, sortBy]);

  useEffect(() => {
    if (initialSearchQuery && initialSearchQuery.trim()) {
      handleFullSearch(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Handle Full Multi-Factor Ranked Search
  const handleFullSearch = async (queryText: string) => {
    if (!queryText.trim()) {
      setIsSearching(false);
      setSearchQuery('');
      if (onClearSearch) onClearSearch();
      loadBooks();
      return;
    }

    try {
      setLoading(true);
      setIsSearching(true);
      setSearchQuery(queryText);
      const res = await api.searchBooks(queryText, 30);
      setBooks(res.results || []);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle AVL Tree Range Query
  const handleAvlRangeQuery = async () => {
    try {
      setLoading(true);
      const res = await api.avlRangeQuery('year', minYear, maxYear);
      const booksFound = res.results || res.books || [];
      setBooks(booksFound);
      setAvlResultsCount(res.count ?? res.total_found ?? booksFound.length);
      setIsAvlActive(true);
      setIsSearching(false);
    } catch (err) {
      console.error('AVL Range query failed', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Direct Hash Table ISBN Lookup
  const handleHashLookup = async (e?: React.FormEvent, customIsbn?: string) => {
    if (e) e.preventDefault();
    const queryIsbn = (customIsbn || hashIsbn).trim();
    if (!queryIsbn) return;

    try {
      setHashSearching(true);
      const start = performance.now();
      const res = await api.hashLookup({ isbn: queryIsbn });
      const duration = performance.now() - start;
      setHashLatency(Number(duration.toFixed(3)));
      setHashResult(res);
    } catch (err: any) {
      setHashResult({ error: err.message || 'ISBN not found in Hash Table' });
      setHashLatency(null);
    } finally {
      setHashSearching(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
              Master Catalog
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Indexed with In-Memory AVL Tree & Hash Table
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mt-1">
            Book Catalog & Intelligent Search
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Query across 1,000+ volumes with sub-millisecond Trie autocomplete, AVL ranges, and multi-factor ranking.
          </p>
        </div>
      </div>

      {/* Top Search Controls Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Prefix Trie Autocomplete & Search */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Search size={14} className="text-brand-400" />
                Prefix Trie Autocomplete & Multi-Factor Ranked Search
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                O(k) Autocomplete
              </span>
            </div>

            <TrieAutocomplete
              onSelectBook={onSelectBook}
              onSearchSubmit={handleFullSearch}
              placeholder="Search by title, author, or keyword (try 'Algorithm', 'Data', 'Python')..."
            />

            {/* Filter buttons & Sort */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-700/50">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => { setSelectedCategory(undefined); setCurrentPage(0); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    selectedCategory === undefined
                      ? 'bg-brand-600 text-white font-semibold shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  All Categories
                </button>
                {categories.slice(0, 5).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat.id); setCurrentPage(0); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                      selectedCategory === cat.id
                        ? 'bg-brand-600 text-white font-semibold shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setCurrentPage(0); }}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="title">Title (A-Z)</option>
                  <option value="rating">Rating (Highest)</option>
                  <option value="year">Year (Newest)</option>
                  <option value="popularity">Popularity (Most Borrowed)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* DSA Fast Widgets: Hash ISBN Lookup + AVL Range Filter */}
        <div className="space-y-4">
          {/* Hash Table O(1) ISBN Lookup */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Hash size={14} className="text-blue-400" />
                Hash Table O(1) ISBN Lookup
              </span>
              <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                Direct Bucket
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              Directly resolves memory bucket index without scanning database.
            </p>

            <form onSubmit={(e) => handleHashLookup(e)} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 978-0-100000-1"
                value={hashIsbn}
                onChange={(e) => setHashIsbn(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
              <button
                type="submit"
                disabled={hashSearching}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shrink-0"
              >
                {hashSearching ? '...' : 'Lookup'}
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-500">Quick Try:</span>
              {['978-0-100000-1', '978-0-100004-1', '978-0-100010-1'].map((isbnSample) => (
                <button
                  key={isbnSample}
                  type="button"
                  onClick={() => { setHashIsbn(isbnSample); handleHashLookup(undefined, isbnSample); }}
                  className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-700 text-blue-400 font-mono text-[10px] border border-slate-700 transition"
                >
                  {isbnSample}
                </button>
              ))}
            </div>

            {hashResult && (
              <div className="mt-3 p-3 bg-slate-900/90 border border-slate-700 rounded-xl text-xs">
                {hashResult.error || !hashResult.found ? (
                  <p className="text-rose-400">{hashResult.error || 'ISBN not found in Hash Table'}</p>
                ) : (
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-white line-clamp-1">{hashResult.book?.title}</span>
                      <span className="text-emerald-400 font-mono text-[10px]">
                        {hashResult.elapsed_microseconds ? `${hashResult.elapsed_microseconds} µs` : `${hashLatency} ms`}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">By {hashResult.book?.author_name || 'Author'}</p>
                    <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400 font-mono space-y-0.5">
                      <p>Bucket: <span className="text-amber-300 font-bold">#{hashResult.bucket_index ?? 0}</span> / {hashResult.capacity || 2048}</p>
                      <p>Collision Chain: <span className="text-amber-300">{hashResult.comparisons ?? 1} comparison(s)</span> (O(1) Direct Access)</p>
                    </div>
                    <button
                      onClick={() => onSelectBook(hashResult.book?.id)}
                      className="mt-2 text-brand-400 hover:underline text-[11px] font-semibold"
                    >
                      Open Book Details →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AVL Range Query Widget */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-400" />
                AVL Tree Range Filter
              </span>
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                O(k + log n)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Filter publication years between range using balanced BST subtree walk.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minYear}
                onChange={(e) => setMinYear(parseInt(e.target.value))}
                className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white text-center"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="number"
                value={maxYear}
                onChange={(e) => setMaxYear(parseInt(e.target.value))}
                className="w-20 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white text-center"
              />
              <button
                onClick={handleAvlRangeQuery}
                className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
              >
                Walk AVL
              </button>
            </div>

            {isAvlActive && (
              <div className="mt-2 text-[11px] text-indigo-300 flex items-center justify-between">
                <span>AVL Range: {avlResultsCount} volumes found</span>
                <button
                  onClick={() => { setIsAvlActive(false); loadBooks(); }}
                  className="text-slate-400 hover:text-white underline"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm font-medium">Scanning Catalog Index...</p>
          </div>
        </div>
      ) : books.length === 0 ? (
        <div className="py-20 text-center bg-slate-800/30 rounded-2xl border border-slate-800">
          <BookOpen size={36} className="mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-white">No Books Found</h3>
          <p className="text-slate-400 text-xs mt-1">Try broadening your search or resetting category filters.</p>
          <button
            onClick={() => { setSearchQuery(''); if (onClearSearch) onClearSearch(); setIsAvlActive(false); setSelectedCategory(undefined); loadBooks(); }}
            className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {books.map((book) => {
            const isAvailable = (book.available_copies ?? 1) > 0;
            return (
              <div
                key={book.id}
                onClick={() => onSelectBook(book.id)}
                className="group relative bg-slate-800/50 hover:bg-slate-800/90 border border-slate-700/60 hover:border-brand-500/60 rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-1"
              >
                <div>
                  {/* Category & Rating */}
                  <div className="flex items-center justify-between text-[11px] mb-2">
                    <span className="font-mono text-brand-400 text-[10px] uppercase font-semibold">
                      {book.category?.name || book.category_name || 'Computer Science'}
                    </span>
                    <span className="flex items-center gap-1 text-amber-400 text-[11px] font-mono">
                      <Star size={11} className="fill-amber-400" />
                      {book.average_rating ? Number(book.average_rating).toFixed(1) : '4.5'}
                    </span>
                  </div>

                  {/* Title & Author */}
                  <h3 className="text-sm font-bold text-white group-hover:text-brand-300 line-clamp-2 transition">
                    {book.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                    {book.author?.name || book.author_name || 'Various Authors'}
                  </p>

                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Year: {book.publication_year || 2023}
                  </p>
                </div>

                {/* Footer status & Copies */}
                <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                    isAvailable
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {isAvailable ? `${book.available_copies} Available` : 'Waitlist Queue'}
                  </span>

                  <span className="text-brand-400 text-[11px] font-medium group-hover:underline">
                    Action →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!isAvlActive && !isSearching && books.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
          <span className="text-slate-400">
            Showing Page <span className="font-mono text-white font-bold">{currentPage + 1}</span> (20 books/page)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 font-medium transition"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={books.length < pageSize}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 font-medium transition"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
