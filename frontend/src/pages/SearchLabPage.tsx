import React, { useState, useEffect } from 'react';
import { 
  Zap, Play, BarChart2, Cpu, CheckCircle, Clock, 
  Layers, ArrowRight, RefreshCw, Info
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, Legend, LineChart, Line, Cell, LabelList
} from 'recharts';
import { api } from '../services/api';

export const SearchLabPage: React.FC = () => {
  const [datasetSize, setDatasetSize] = useState<number>(10000);
  const [benchmarkResult, setBenchmarkResult] = useState<any>(null);
  const [suiteResult, setSuiteResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runningSuite, setRunningSuite] = useState<boolean>(false);
  const [scaleMode, setScaleMode] = useState<'linear' | 'log'>('linear');

  const runSingleBenchmark = async (size: number) => {
    try {
      setIsRunning(true);
      const res = await api.compareSearch(size);
      setBenchmarkResult(res);
    } catch (err) {
      console.error('Failed to run search benchmark', err);
    } finally {
      setIsRunning(false);
    }
  };

  const runFullSuite = async () => {
    try {
      setRunningSuite(true);
      const res = await api.getSearchBenchmarkSuite();
      setSuiteResult(res);
    } catch (err) {
      console.error('Failed to load benchmark suite', err);
    } finally {
      setRunningSuite(false);
    }
  };

  useEffect(() => {
    runSingleBenchmark(10000);
    runFullSuite();
  }, []);

  // Helper extracted algorithm results (supports both object keys and array formats)
  const linearData = benchmarkResult?.linear || benchmarkResult?.results?.find((r: any) => r.algorithm?.includes('Linear')) || {};
  const binaryData = benchmarkResult?.binary || benchmarkResult?.results?.find((r: any) => r.algorithm?.includes('Binary')) || {};
  const hashData = benchmarkResult?.hash_table || benchmarkResult?.results?.find((r: any) => r.algorithm?.includes('Hash')) || {};

  const linearTime = Number(linearData.time_microseconds ?? linearData.execution_time_us ?? 0);
  const binaryTime = Number(binaryData.time_microseconds ?? binaryData.execution_time_us ?? 0);
  const hashTime = Number(hashData.time_microseconds ?? hashData.execution_time_us ?? 0);

  const linearComp = Number(linearData.comparisons ?? 0);
  const binaryComp = Number(binaryData.comparisons ?? 0);
  const hashComp = Number(hashData.comparisons ?? 1);

  // Format bar chart data for single benchmark with dual-scale support
  const barChartData = benchmarkResult ? [
    {
      algorithm: 'Linear Search',
      complexity: 'O(n)',
      rawTime: linearTime,
      displayTime: scaleMode === 'log' ? Number(Math.log10(Math.max(1, linearTime)).toFixed(2)) : linearTime,
      rawComparisons: linearComp,
      displayComparisons: scaleMode === 'log' ? Number(Math.log10(Math.max(1, linearComp)).toFixed(2)) : linearComp,
      timeLabel: `${linearTime.toFixed(1)} μs`,
      compLabel: `${linearComp.toLocaleString()}`,
      fill: '#f43f5e'
    },
    {
      algorithm: 'Binary Search',
      complexity: 'O(log n)',
      rawTime: binaryTime,
      displayTime: scaleMode === 'log' ? Number(Math.log10(Math.max(1, binaryTime)).toFixed(2)) : binaryTime,
      rawComparisons: binaryComp,
      displayComparisons: scaleMode === 'log' ? Number(Math.log10(Math.max(1, binaryComp)).toFixed(2)) : binaryComp,
      timeLabel: `${binaryTime.toFixed(1)} μs`,
      compLabel: `${binaryComp}`,
      fill: '#0ea5e9'
    },
    {
      algorithm: 'Hash Table',
      complexity: 'O(1)',
      rawTime: hashTime,
      displayTime: scaleMode === 'log' ? Number(Math.log10(Math.max(1, hashTime)).toFixed(2)) : hashTime,
      rawComparisons: hashComp,
      displayComparisons: scaleMode === 'log' ? Number(Math.log10(Math.max(1, hashComp)).toFixed(2)) : hashComp,
      timeLabel: `${hashTime.toFixed(1)} μs`,
      compLabel: `${hashComp}`,
      fill: '#10b981'
    }
  ] : [];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
              DSA Empirical Benchmarks
            </span>
            <span className="text-xs text-emerald-400 font-mono">
              Live Microsecond Timing on Server Core
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mt-1">
            Search Algorithm Complexity Laboratory
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Empirically demonstrate time complexity scaling: Linear Search O(n) vs Binary Search O(log n) vs Hash Table O(1).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runFullSuite}
            disabled={runningSuite}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw size={14} className={runningSuite ? 'animate-spin' : ''} />
            <span>{runningSuite ? 'Benchmarking Suite...' : 'Re-run 100k Suite'}</span>
          </button>
        </div>
      </div>

      {/* Dataset Size Selector & Trigger */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">Select Benchmark Dataset Size (N)</h3>
            <p className="text-xs text-slate-400">
              Generate synthetic or memory-loaded records to observe comparison counts & execution latency.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {[100, 1000, 10000, 50000, 100000].map((size) => (
              <button
                key={size}
                onClick={() => { setDatasetSize(size); runSingleBenchmark(size); }}
                disabled={isRunning}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition ${
                  datasetSize === size
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-700'
                }`}
              >
                N = {size.toLocaleString()}
              </button>
            ))}

            <button
              onClick={() => runSingleBenchmark(datasetSize)}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
            >
              <Play size={14} />
              <span>{isRunning ? 'Benchmarking...' : 'Execute Test'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comparative Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Linear Search */}
        <div className="bg-slate-800/60 border border-rose-500/30 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Linear Search</span>
            <span className="text-xs font-mono px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded font-bold">O(n)</span>
          </div>
          <h3 className="text-2xl font-bold text-white mt-3 font-mono">
            {linearTime.toFixed(2)} <span className="text-xs font-normal text-slate-400">μs</span>
          </h3>
          <p className="text-xs text-slate-400 mt-2">
            Comparisons: <span className="font-mono text-rose-300 font-bold">{linearComp.toLocaleString()}</span>
          </p>
          <div className="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
            Scans every element sequentially until target found. Degrades linearly as N increases.
          </div>
        </div>

        {/* Binary Search */}
        <div className="bg-slate-800/60 border border-sky-500/30 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Binary Search</span>
            <span className="text-xs font-mono px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded font-bold">O(log n)</span>
          </div>
          <h3 className="text-2xl font-bold text-white mt-3 font-mono">
            {binaryTime.toFixed(2)} <span className="text-xs font-normal text-slate-400">μs</span>
          </h3>
          <p className="text-xs text-slate-400 mt-2">
            Comparisons: <span className="font-mono text-sky-300 font-bold">{binaryComp.toLocaleString()}</span>
          </p>
          <div className="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
            Halves search space each step. For N=100,000, requires maximum ~17 comparisons.
          </div>
        </div>

        {/* Hash Table Lookup */}
        <div className="bg-slate-800/60 border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Hash Table Lookup</span>
            <span className="text-xs font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold">O(1)</span>
          </div>
          <h3 className="text-2xl font-bold text-white mt-3 font-mono">
            {hashTime.toFixed(2)} <span className="text-xs font-normal text-slate-400">μs</span>
          </h3>
          <p className="text-xs text-slate-400 mt-2">
            Comparisons: <span className="font-mono text-emerald-300 font-bold">{hashComp.toLocaleString()}</span>
          </p>
          <div className="mt-4 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400">
            Computes bucket slot via polynomial rolling hash. Independent of total catalog size.
          </div>
        </div>
      </div>

      {/* Recharts Visualization Header with Scale Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h2 className="text-base font-bold text-white">Empirical Visual Comparison</h2>
          <p className="text-xs text-slate-400">Notice the dramatic order-of-magnitude separation across complexity classes.</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-slate-400 font-mono">Scale Mode:</span>
          <div className="flex items-center p-1 bg-slate-900 border border-slate-700/80 rounded-xl text-xs font-mono">
            <button
              onClick={() => setScaleMode('linear')}
              className={`px-3 py-1 rounded-lg transition font-medium ${
                scaleMode === 'linear'
                  ? 'bg-brand-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Linear Units (Real)
            </button>
            <button
              onClick={() => setScaleMode('log')}
              className={`px-3 py-1 rounded-lg transition font-medium ${
                scaleMode === 'log'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Log₁₀ Scale (Orders)
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Execution Time Comparison Bar Chart */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
            <BarChart2 size={16} className="text-brand-400" />
            Execution Latency Comparison ({scaleMode === 'log' ? 'log₁₀ μs' : 'μs'}) — N = {datasetSize.toLocaleString()}
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            {scaleMode === 'log' ? 'Logarithmic scale: Each unit increase represents a 10× jump in runtime.' : 'Linear scale: Direct execution time in microseconds.'}
          </p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 25, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="algorithm" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  formatter={(val: any, name: any, item: any) => [`${item.payload.rawTime.toFixed(2)} μs (${val} ${scaleMode === 'log' ? 'log₁₀' : 'μs'})`, 'Latency']}
                />
                <Bar dataKey="displayTime" name="Latency" minPointSize={14} radius={[8, 8, 0, 0]}>
                  {barChartData.map((entry, index) => (
                    <Cell key={`time-cell-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="timeLabel" position="top" fill="#ffffff" style={{ fontSize: '11px', fontWeight: 'bold' }} offset={8} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comparisons Comparison Bar Chart */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
            <Cpu size={16} className="text-emerald-400" />
            Number of Comparisons Executed ({scaleMode === 'log' ? 'log₁₀ scale' : 'count'}) — N = {datasetSize.toLocaleString()}
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            {scaleMode === 'log' ? 'Logarithmic operations scaling.' : 'Direct indicator of algorithmic operations executed.'}
          </p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 25, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="algorithm" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  formatter={(val: any, name: any, item: any) => [`${item.payload.rawComparisons.toLocaleString()} comparisons`, 'Comparisons']}
                />
                <Bar dataKey="displayComparisons" name="Comparisons" minPointSize={14} radius={[8, 8, 0, 0]}>
                  {barChartData.map((entry, index) => (
                    <Cell key={`comp-cell-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="compLabel" position="top" fill="#ffffff" style={{ fontSize: '11px', fontWeight: 'bold' }} offset={8} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Scientific Analysis Summary */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
          <Info size={16} className="text-brand-400" />
          Academic CSE Viva Takeaway & Architecture Decision
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          In a production library with millions of book barcodes, performing Linear Search on every catalog lookup causes severe server CPU bottlenecks.
          Binary Search requires pre-sorted contiguous arrays (<code className="text-sky-300">O(n log n)</code> to sort), making inserts slow.
          Our solution deploys <strong className="text-emerald-400">Custom Separate-Chaining Hash Tables</strong> for direct <code className="text-emerald-300">O(1)</code> ISBN lookup, paired with an <strong className="text-indigo-400">AVL Self-Balancing Tree</strong> for <code className="text-indigo-300">O(log n)</code> range filtering and sorted traversals.
        </p>
      </div>
    </div>
  );
};
