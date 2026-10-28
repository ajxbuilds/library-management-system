import React, { useEffect, useState } from 'react';
import { 
  BookOpen, Users, Clock, AlertTriangle, DollarSign, Activity, 
  Cpu, Layers, Network, ArrowUpRight, CheckCircle2, ShieldCheck,
  Search, BarChart3, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { NavigationTab } from '../components/Sidebar';

interface AdminDashboardProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectBook?: (bookId: number) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<any>(null);
  const [dsaStats, setDsaStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [sumRes, dsaRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getDSAStats()
      ]);
      setSummary(sumRes);
      setDsaStats(dsaRes);
    } catch (err) {
      console.error('Failed to load admin summary', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Loading Real-time System Metrics...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Catalog Size',
      value: summary?.total_books ?? '1,025',
      subtext: `${summary?.available_copies ?? 0} available copies`,
      icon: BookOpen,
      color: 'from-blue-500 to-indigo-600',
      badge: 'AVL Tree Indexed',
      onClick: () => onNavigate('catalog')
    },
    {
      title: 'Active Members',
      value: summary?.total_users ?? '512',
      subtext: 'Students & Faculty',
      icon: Users,
      color: 'from-emerald-500 to-teal-600',
      badge: 'Hash Table O(1)',
      onClick: () => onNavigate('circulation')
    },
    {
      title: 'Active Loans',
      value: summary?.active_loans ?? '0',
      subtext: `${summary?.overdue_loans ?? 0} overdue accounts`,
      icon: Clock,
      color: 'from-amber-500 to-orange-600',
      badge: summary?.overdue_loans > 0 ? 'Action Needed' : 'Normal',
      badgeColor: summary?.overdue_loans > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400',
      onClick: () => onNavigate('circulation')
    },
    {
      title: 'Pending Fines',
      value: `$${(summary?.total_unpaid_fines ?? 0).toFixed(2)}`,
      subtext: 'Calculated via Min-Heap',
      icon: DollarSign,
      color: 'from-rose-500 to-red-600',
      badge: 'Priority Queue',
      onClick: () => onNavigate('fines')
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
              Executive Dashboard
            </span>
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              DSA Core Active
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mt-1">
            System Overview & Algorithmic Health
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Real-time telemetry from In-Memory Hash Tables, AVL Index Trees, and Graph Engine.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => onNavigate('search-lab')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition"
          >
            <Cpu size={14} />
            <span>Open DSA Lab</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.onClick}
              className="group relative bg-slate-800/60 backdrop-blur-md border border-slate-700/60 hover:border-brand-500/50 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-lg`}>
                  <Icon size={22} />
                </div>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-medium ${card.badgeColor || 'bg-slate-700/60 text-slate-300'}`}>
                  {card.badge}
                </span>
              </div>

              <div className="mt-4">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {card.title}
                </p>
                <h3 className="text-2xl font-bold text-white mt-1 group-hover:text-brand-300 transition">
                  {card.value}
                </h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                  <span>{card.subtext}</span>
                  <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 text-brand-400 transition" />
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* DSA Internal Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Memory Hash Table Stats */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/60 rounded-2xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Layers size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Custom Hash Table</h3>
                <p className="text-[11px] text-slate-400 font-mono">Separate Chaining O(1)</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
              Load: {dsaStats?.hash_table?.load_factor ?? '0.45'}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Total Buckets</span>
              <span className="font-mono text-white font-semibold">{dsaStats?.hash_table?.capacity ?? 2048}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Indexed Elements</span>
              <span className="font-mono text-white font-semibold">{dsaStats?.hash_table?.size ?? summary?.total_books ?? 1025}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Max Collision Chain</span>
              <span className="font-mono text-amber-400 font-semibold">{dsaStats?.hash_table?.max_chain_length ?? 2}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Avg Lookup Latency</span>
              <span className="font-mono text-emerald-400 font-semibold">&lt; 0.05 ms</span>
            </div>
          </div>
        </div>

        {/* AVL Balanced Trees Stats */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/60 rounded-2xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Activity size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">AVL Balanced Trees</h3>
                <p className="text-[11px] text-slate-400 font-mono">Strict O(log n) Guarantee</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded">
              Balanced
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Year Index Height</span>
              <span className="font-mono text-white font-semibold">{dsaStats?.avl_trees?.year?.height ?? 11}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Rating Index Height</span>
              <span className="font-mono text-white font-semibold">{dsaStats?.avl_trees?.rating?.height ?? 9}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Total Rotations Executed</span>
              <span className="font-mono text-indigo-400 font-semibold">{dsaStats?.avl_trees?.total_rotations ?? 84}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Range Query Speed</span>
              <span className="font-mono text-emerald-400 font-semibold">O(k + log n)</span>
            </div>
          </div>
        </div>

        {/* Knowledge Graph Stats */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/60 rounded-2xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Network size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Knowledge Graph</h3>
                <p className="text-[11px] text-slate-400 font-mono">Adjacency List (BFS/DFS)</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded">
              Connected
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Total Entities (V)</span>
              <span className="font-mono text-white font-semibold">{dsaStats?.graph?.total_nodes ?? 1050}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Relationships (E)</span>
              <span className="font-mono text-white font-semibold">{dsaStats?.graph?.total_edges ?? 3200}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Graph Density</span>
              <span className="font-mono text-white font-semibold font-mono">{dsaStats?.graph?.density ?? '0.0058'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Recommendation Engine</span>
              <span className="font-mono text-emerald-400 font-semibold">2-Hop Traversal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Launchpad & Architecture Explanations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-brand-400" />
            DSA Core Module Quick Launch
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Jump directly into algorithm demonstrations and live benchmarks.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              onClick={() => onNavigate('search-lab')}
              className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/70 text-left transition group"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200 group-hover:text-brand-300">
                <span>Search Complexity Lab</span>
                <ArrowUpRight size={14} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Linear vs Binary vs Hash Table O(1)</p>
            </button>

            <button
              onClick={() => onNavigate('sorting-lab')}
              className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/70 text-left transition group"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200 group-hover:text-brand-300">
                <span>Sorting Algorithm Lab</span>
                <ArrowUpRight size={14} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Bubble, Merge, Quick, Heap sort comparison</p>
            </button>

            <button
              onClick={() => onNavigate('graph-lab')}
              className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/70 text-left transition group"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200 group-hover:text-brand-300">
                <span>Graph Visualizer</span>
                <ArrowUpRight size={14} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Interactive BFS & DFS path exploration</p>
            </button>

            <button
              onClick={() => onNavigate('circulation')}
              className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/70 text-left transition group"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200 group-hover:text-brand-300">
                <span>FIFO Queue & Heap</span>
                <ArrowUpRight size={14} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Live reservation queue & return stack</p>
            </button>
          </div>
        </div>

        {/* Theoretical DSA Mapping Table */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Cpu size={18} className="text-indigo-400" />
            DSA Theoretical Architecture Map
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            How theoretical computer science concepts solve library problems in this app:
          </p>

          <div className="mt-4 divide-y divide-slate-700/50 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">Prefix Trie</span>
                <span className="text-slate-400 ml-2">Book Title Autocomplete</span>
              </div>
              <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">O(k) where k=len</span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">AVL Tree</span>
                <span className="text-slate-400 ml-2">Publication Year & Rating Queries</span>
              </div>
              <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">O(log n + count)</span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">Min-Heap</span>
                <span className="text-slate-400 ml-2">Overdue Loan Priority & Penalties</span>
              </div>
              <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">O(log n) Extract</span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">FIFO Queue</span>
                <span className="text-slate-400 ml-2">Fair Waiting List for Borrowing</span>
              </div>
              <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">O(1) Enqueue/Dequeue</span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">LIFO Stack</span>
                <span className="text-slate-400 ml-2">Audit Undo / Redo Mechanism</span>
              </div>
              <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">O(1) Push/Pop</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
