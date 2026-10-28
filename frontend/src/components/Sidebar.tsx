import React from 'react';
import {
  LayoutDashboard,
  Library,
  BookOpen,
  ArrowLeftRight,
  Sparkles,
  Zap,
  BarChart3,
  Network,
  DollarSign,
  History,
  TrendingUp,
  Cpu,
  Layers,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavigationTab = 
  | 'admin-dash'
  | 'librarian-dash'
  | 'student-dash'
  | 'catalog'
  | 'circulation'
  | 'fines'
  | 'recommendations'
  | 'search-lab'
  | 'sorting-lab'
  | 'graph-lab'
  | 'audit-logs'
  | 'analytics';

interface SidebarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const { user, isAdmin, isLibrarian } = useAuth();

  const navSections = [
    {
      title: 'Dashboards',
      items: [
        ...(isAdmin ? [{ id: 'admin-dash' as NavigationTab, label: 'Admin Dashboard', icon: LayoutDashboard, badge: 'Overview' }] : []),
        ...(isLibrarian ? [{ id: 'librarian-dash' as NavigationTab, label: 'Librarian Desk', icon: Library, badge: 'Desk' }] : []),
        { id: 'student-dash' as NavigationTab, label: 'Student Portal', icon: BookOpen, badge: 'My Space' },
      ]
    },
    {
      title: 'Library Operations',
      items: [
        { id: 'catalog' as NavigationTab, label: 'Catalog & Inventory', icon: BookOpen, badge: '1,025 Books' },
        { id: 'circulation' as NavigationTab, label: 'Circulation & Queue', icon: ArrowLeftRight, badge: 'FIFO' },
        { id: 'recommendations' as NavigationTab, label: 'Recommendations', icon: Sparkles, badge: 'AI/Graph' },
        { id: 'fines' as NavigationTab, label: 'Fines & Penalties', icon: DollarSign, badge: 'Heap' },
      ]
    },
    {
      title: 'DSA Laboratories',
      items: [
        { id: 'search-lab' as NavigationTab, label: 'Search Complexity Lab', icon: Zap, badge: 'O(1) vs O(log n)' },
        { id: 'sorting-lab' as NavigationTab, label: 'Sorting Algorithm Lab', icon: BarChart3, badge: '6 Algorithms' },
        { id: 'graph-lab' as NavigationTab, label: 'Knowledge Graph Lab', icon: Network, badge: 'BFS / DFS' },
      ]
    },
    {
      title: 'Reports & Logs',
      items: [
        { id: 'analytics' as NavigationTab, label: 'Analytics & Trends', icon: TrendingUp },
        ...(isAdmin ? [{ id: 'audit-logs' as NavigationTab, label: 'Audit Trail', icon: History, badge: 'Stack Undo' }] : []),
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {navSections.map((sec, idx) => (
          <div key={sec.title || idx} className="space-y-1">
            <h3 className="px-3 text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">
              {sec.title}
            </h3>
            <div className="space-y-1">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 text-brand-400 border border-slate-700/80'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer DSA Engine badge */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400">
            <Cpu size={18} />
          </div>
          <div className="text-left">
            <div className="text-[11px] font-bold text-slate-200">DSA Engine Active</div>
            <div className="text-[10px] text-slate-400 font-mono">Trie • AVL • Heap • Graph</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
