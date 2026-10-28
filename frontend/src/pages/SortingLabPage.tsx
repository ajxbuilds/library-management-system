import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, Play, Pause, RotateCcw, Cpu, 
  Layers, CheckCircle2, Clock, Sparkles, RefreshCw,
  Shuffle, ArrowUpDown, Zap, Sliders
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, Cell, LabelList
} from 'recharts';
import { api } from '../services/api';

type AlgoType = 'bubble' | 'selection' | 'insertion' | 'merge' | 'quick' | 'heap';

interface AlgoMeta {
  name: string;
  best: string;
  avg: string;
  worst: string;
  space: string;
  stable: boolean;
  desc: string;
}

const ALGO_METAS: Record<AlgoType, AlgoMeta> = {
  bubble: {
    name: 'Bubble Sort',
    best: 'O(n)',
    avg: 'O(n²)',
    worst: 'O(n²)',
    space: 'O(1)',
    stable: true,
    desc: 'Repeatedly steps through the list, compares adjacent elements and swaps them if they are in the wrong order.'
  },
  selection: {
    name: 'Selection Sort',
    best: 'O(n²)',
    avg: 'O(n²)',
    worst: 'O(n²)',
    space: 'O(1)',
    stable: false,
    desc: 'Repeatedly finds the minimum element from the unsorted part and puts it at the beginning.'
  },
  insertion: {
    name: 'Insertion Sort',
    best: 'O(n)',
    avg: 'O(n²)',
    worst: 'O(n²)',
    space: 'O(1)',
    stable: true,
    desc: 'Builds the sorted array one item at a time by inserting each element into its proper position.'
  },
  merge: {
    name: 'Merge Sort',
    best: 'O(n log n)',
    avg: 'O(n log n)',
    worst: 'O(n log n)',
    space: 'O(n)',
    stable: true,
    desc: 'Divide-and-conquer algorithm that divides the input array into two halves, recursively sorts them, and merges the sorted halves.'
  },
  quick: {
    name: 'Quick Sort',
    best: 'O(n log n)',
    avg: 'O(n log n)',
    worst: 'O(n²)',
    space: 'O(log n)',
    stable: false,
    desc: 'Picks an element as pivot and partitions the given array around the picked pivot.'
  },
  heap: {
    name: 'Heap Sort',
    best: 'O(n log n)',
    avg: 'O(n log n)',
    worst: 'O(n log n)',
    space: 'O(1)',
    stable: false,
    desc: 'Builds a binary max-heap from the array, then repeatedly extracts the maximum root to the end.'
  }
};

export const SortingLabPage: React.FC = () => {
  const [recordCount, setRecordCount] = useState<number>(300);
  const [sortField, setSortField] = useState<string>('rating');
  const [loading, setLoading] = useState<boolean>(false);
  const [sortMetrics, setSortMetrics] = useState<any[]>([]);
  const [scaleMode, setScaleMode] = useState<'linear' | 'log'>('linear');

  // Animation simulator state
  const [simArray, setSimArray] = useState<number[]>([45, 12, 89, 34, 70, 23, 56, 91, 15, 62, 38, 81, 29, 95, 48]);
  const [selectedAlgo, setSelectedAlgo] = useState<AlgoType>('bubble');
  const [isSorting, setIsSorting] = useState<boolean>(false);
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [pivotIndex, setPivotIndex] = useState<number | null>(null);
  const [sortedIndices, setSortedIndices] = useState<number[]>([]);
  const [statusMsg, setStatusMsg] = useState<string>('Select an algorithm and click Start Animation to begin');
  const [simComparisons, setSimComparisons] = useState<number>(0);
  const [simSwaps, setSimSwaps] = useState<number>(0);
  const [simSpeed, setSimSpeed] = useState<number>(180); // ms delay
  const simSpeedRef = useRef<number>(180);

  const stopRef = useRef<boolean>(false);

  const setSpeed = (ms: number) => {
    setSimSpeed(ms);
    simSpeedRef.current = ms;
  };

  const delayCurrent = () => new Promise(res => setTimeout(res, simSpeedRef.current));

  const runBenchmark = async (count: number, field: string) => {
    try {
      setLoading(true);
      const res = await api.compareSort(count, field, false);
      if (res && res.results) {
        const mapped = res.results.map((m: any) => {
          const timeMs = m.time_ms !== undefined ? m.time_ms : (m.execution_time_us ? m.execution_time_us / 1000.0 : 0.001);
          return {
            ...m,
            time_ms: Number(Number(timeMs).toFixed(4)),
            // Log10 representation for logarithmic comparison scale
            time_log: timeMs > 0 ? Number(Math.log10(Math.max(timeMs, 0.001) * 1000).toFixed(2)) : 0.1,
            comparisons_log: m.comparisons > 0 ? Number(Math.log10(m.comparisons).toFixed(2)) : 0.1,
            display_time: timeMs >= 0.01 
              ? `${timeMs.toFixed(2)} ms` 
              : `${(timeMs * 1000).toFixed(1)} µs`
          };
        });
        setSortMetrics(mapped);
      }
    } catch (err) {
      console.error('Failed to benchmark sorting algorithms', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runBenchmark(recordCount, sortField);
  }, []);

  const resetVisualArray = (preset: 'random' | 'reversed' | 'nearly_sorted' = 'random') => {
    stopRef.current = true;
    setIsSorting(false);
    setActiveIndices([]);
    setPivotIndex(null);
    setSortedIndices([]);
    setSimComparisons(0);
    setSimSwaps(0);

    let newArr: number[];
    if (preset === 'reversed') {
      newArr = Array.from({ length: 15 }, (_, i) => 95 - i * 5);
      setStatusMsg('Initialized Reversed Array (Worst-case input for O(n²) algorithms)');
    } else if (preset === 'nearly_sorted') {
      newArr = [10, 18, 25, 30, 42, 38, 55, 64, 70, 79, 82, 88, 91, 85, 98];
      setStatusMsg('Initialized Nearly Sorted Array (Shows O(n) best-case for Bubble & Insertion)');
    } else {
      newArr = Array.from({ length: 15 }, () => Math.floor(Math.random() * 85) + 12);
      setStatusMsg('Initialized Random Array with 15 integer elements');
    }
    setSimArray(newArr);
  };

  const stopSorting = () => {
    stopRef.current = true;
    setIsSorting(false);
    setActiveIndices([]);
    setPivotIndex(null);
    setStatusMsg('Animation paused/stopped.');
  };

  // Main Visual Sorting Dispatcher
  const runVisualSimulation = async () => {
    if (isSorting) {
      stopSorting();
      return;
    }
    stopRef.current = false;
    setIsSorting(true);
    setSimComparisons(0);
    setSimSwaps(0);
    setSortedIndices([]);
    setActiveIndices([]);
    setPivotIndex(null);

    const arr = [...simArray];
    const n = arr.length;

    try {
      if (selectedAlgo === 'bubble') {
        setStatusMsg('Bubble Sort: Starting pairwise scans. Largest unsorted elements bubble to the right.');
        for (let i = 0; i < n; i++) {
          let swapped = false;
          for (let j = 0; j < n - i - 1; j++) {
            if (stopRef.current) return;
            setActiveIndices([j, j + 1]);
            setSimComparisons(c => c + 1);
            setStatusMsg(`Bubble Sort: Comparing index ${j} (${arr[j]}) with index ${j + 1} (${arr[j + 1]})`);
            await delayCurrent();

            if (arr[j] > arr[j + 1]) {
              const temp = arr[j];
              arr[j] = arr[j + 1];
              arr[j + 1] = temp;
              swapped = true;
              setSimSwaps(s => s + 1);
              setSimArray([...arr]);
              await delayCurrent();
            }
          }
          setSortedIndices(prev => [...prev, n - i - 1]);
          if (!swapped) break;
        }
      } else if (selectedAlgo === 'selection') {
        setStatusMsg('Selection Sort: Repeatedly locating minimum element in unsorted suffix.');
        for (let i = 0; i < n; i++) {
          let minIdx = i;
          setPivotIndex(i);
          for (let j = i + 1; j < n; j++) {
            if (stopRef.current) return;
            setActiveIndices([minIdx, j]);
            setSimComparisons(c => c + 1);
            setStatusMsg(`Selection Sort: Searching minimum. Current min = ${arr[minIdx]}, inspecting ${arr[j]}`);
            await delayCurrent();

            if (arr[j] < arr[minIdx]) {
              minIdx = j;
            }
          }
          if (minIdx !== i) {
            setStatusMsg(`Selection Sort: Swapping minimum element ${arr[minIdx]} into sorted slot ${i}`);
            const temp = arr[i];
            arr[i] = arr[minIdx];
            arr[minIdx] = temp;
            setSimSwaps(s => s + 1);
            setSimArray([...arr]);
            await delayCurrent();
          }
          setSortedIndices(prev => [...prev, i]);
        }
      } else if (selectedAlgo === 'insertion') {
        setStatusMsg('Insertion Sort: Inserting elements one-by-one into sorted prefix [0..i].');
        setSortedIndices([0]);
        for (let i = 1; i < n; i++) {
          const key = arr[i];
          let j = i - 1;
          setPivotIndex(i);
          setStatusMsg(`Insertion Sort: Picking key ${key} from index ${i}`);
          await delayCurrent();

          while (j >= 0 && arr[j] > key) {
            if (stopRef.current) return;
            setActiveIndices([j, j + 1]);
            setSimComparisons(c => c + 1);
            setStatusMsg(`Insertion Sort: Shifting ${arr[j]} right because ${arr[j]} > ${key}`);
            arr[j + 1] = arr[j];
            setSimSwaps(s => s + 1);
            setSimArray([...arr]);
            j--;
            await delayCurrent();
          }
          arr[j + 1] = key;
          setSimArray([...arr]);
          setSortedIndices(prev => [...prev, i]);
          await delayCurrent();
        }
      } else if (selectedAlgo === 'merge') {
        setStatusMsg('Merge Sort: Iterative divide-and-conquer merging subarrays of size 1, 2, 4, 8...');
        for (let width = 1; width < n; width *= 2) {
          for (let left = 0; left < n; left += 2 * width) {
            const mid = Math.min(left + width, n);
            const right = Math.min(left + 2 * width, n);
            if (mid >= right) continue;

            setStatusMsg(`Merge Sort: Merging sorted sublists [${left}..${mid - 1}] and [${mid}..${right - 1}]`);
            let p1 = left;
            let p2 = mid;
            const merged: number[] = [];

            while (p1 < mid && p2 < right) {
              if (stopRef.current) return;
              setActiveIndices([p1, p2]);
              setSimComparisons(c => c + 1);
              await delayCurrent();
              if (arr[p1] <= arr[p2]) {
                merged.push(arr[p1++]);
              } else {
                merged.push(arr[p2++]);
              }
            }
            while (p1 < mid) merged.push(arr[p1++]);
            while (p2 < right) merged.push(arr[p2++]);

            for (let k = 0; k < merged.length; k++) {
              if (stopRef.current) return;
              arr[left + k] = merged[k];
              setActiveIndices([left + k]);
              setSimSwaps(s => s + 1);
              setSimArray([...arr]);
              await delayCurrent();
            }
          }
        }
      } else if (selectedAlgo === 'quick') {
        setStatusMsg('Quick Sort: Partitioning array around chosen pivot elements.');
        
        const partition = async (low: number, high: number): Promise<number> => {
          const pivot = arr[high];
          setPivotIndex(high);
          setStatusMsg(`Quick Sort: Partitioning range [${low}..${high}] with pivot = ${pivot}`);
          let i = low - 1;

          for (let j = low; j < high; j++) {
            if (stopRef.current) return -1;
            setActiveIndices([j, high]);
            setSimComparisons(c => c + 1);
            await delayCurrent();

            if (arr[j] < pivot) {
              i++;
              const temp = arr[i];
              arr[i] = arr[j];
              arr[j] = temp;
              setSimSwaps(s => s + 1);
              setSimArray([...arr]);
              await delayCurrent();
            }
          }
          const temp = arr[i + 1];
          arr[i + 1] = arr[high];
          arr[high] = temp;
          setSimSwaps(s => s + 1);
          setSimArray([...arr]);
          await delayCurrent();
          return i + 1;
        };

        const quickSortRec = async (low: number, high: number) => {
          if (low < high) {
            const pi = await partition(low, high);
            if (stopRef.current || pi === -1) return;
            setSortedIndices(prev => [...prev, pi]);
            await quickSortRec(low, pi - 1);
            await quickSortRec(pi + 1, high);
          } else if (low === high) {
            setSortedIndices(prev => [...prev, low]);
          }
        };

        await quickSortRec(0, n - 1);
      } else if (selectedAlgo === 'heap') {
        setStatusMsg('Heap Sort: Phase 1 — Building Max-Heap binary tree from unsorted array.');
        
        const heapify = async (heapSize: number, rootIdx: number) => {
          let largest = rootIdx;
          const left = 2 * rootIdx + 1;
          const right = 2 * rootIdx + 2;

          if (left < heapSize) {
            setActiveIndices([largest, left]);
            setSimComparisons(c => c + 1);
            await delayCurrent();
            if (arr[left] > arr[largest]) largest = left;
          }
          if (right < heapSize) {
            setActiveIndices([largest, right]);
            setSimComparisons(c => c + 1);
            await delayCurrent();
            if (arr[right] > arr[largest]) largest = right;
          }
          if (largest !== rootIdx) {
            setStatusMsg(`Heap Sort: Sifting root down — swapping ${arr[rootIdx]} with child ${arr[largest]}`);
            const temp = arr[rootIdx];
            arr[rootIdx] = arr[largest];
            arr[largest] = temp;
            setSimSwaps(s => s + 1);
            setSimArray([...arr]);
            await delayCurrent();
            await heapify(heapSize, largest);
          }
        };

        // Phase 1: Build max heap
        for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
          if (stopRef.current) return;
          await heapify(n, i);
        }

        setStatusMsg('Heap Sort: Phase 2 — Extracting maximum root to end and sifting remaining elements.');
        // Phase 2: Extract elements
        for (let i = n - 1; i > 0; i--) {
          if (stopRef.current) return;
          setActiveIndices([0, i]);
          setStatusMsg(`Heap Sort: Extracting maximum root ${arr[0]} to position ${i}`);
          const temp = arr[0];
          arr[0] = arr[i];
          arr[i] = temp;
          setSimSwaps(s => s + 1);
          setSortedIndices(prev => [...prev, i]);
          setSimArray([...arr]);
          await delayCurrent();

          await heapify(i, 0);
        }
        setSortedIndices(prev => [...prev, 0]);
      }

      // Mark all sorted
      setSortedIndices(Array.from({ length: n }, (_, i) => i));
      setStatusMsg(`Complete! ${ALGO_METAS[selectedAlgo].name} finished sorting ${n} elements.`);
    } catch (e) {
      console.error('Animation error', e);
    } finally {
      setIsSorting(false);
      setActiveIndices([]);
      setPivotIndex(null);
    }
  };

  const COLORS = ['#f43f5e', '#fb923c', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
              Algorithm Benchmarking Lab
            </span>
            <span className="text-xs text-brand-400 font-mono">
              6 Classical Sorting Engines
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mt-1">
            Sorting Algorithms Laboratory
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Empirical runtime, comparison count, and memory allocation comparison across Bubble, Selection, Insertion, Merge, Quick, and Heap sort.
          </p>
        </div>

        <button
          onClick={() => runBenchmark(recordCount, sortField)}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Re-run Benchmark</span>
        </button>
      </div>

      {/* Dataset Benchmark Controls */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">Dataset Configuration</h3>
            <p className="text-xs text-slate-400">Select catalog sample size & sorting criteria</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Sample Records:</span>
              <select
                value={recordCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setRecordCount(val);
                  runBenchmark(val, sortField);
                }}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
              >
                <option value={100}>N = 100</option>
                <option value={300}>N = 300</option>
                <option value={600}>N = 600</option>
                <option value={1000}>N = 1,000</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Key Field:</span>
              <select
                value={sortField}
                onChange={(e) => {
                  setSortField(e.target.value);
                  runBenchmark(recordCount, e.target.value);
                }}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="rating">Average Rating (Float)</option>
                <option value="publication_year">Publication Year (Int)</option>
                <option value="total_pages">Page Count (Int)</option>
              </select>
            </div>

            <button
              onClick={() => runBenchmark(recordCount, sortField)}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition disabled:opacity-50"
            >
              <Play size={14} />
              <span>Run Comparison</span>
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Algorithm Visual Simulation Studio */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-brand-400" />
              Interactive Multi-Algorithm Sorting Visualizer
            </h3>
            <p className="text-xs text-slate-400">
              Select any of the 6 classical algorithms, configure animation speed or input distribution, and observe comparisons in real time.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={runVisualSimulation}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold transition shadow-md ${
                isSorting 
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' 
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
              }`}
            >
              {isSorting ? <Pause size={14} /> : <Play size={14} />}
              <span>{isSorting ? 'Pause / Stop' : `Run ${ALGO_METAS[selectedAlgo].name}`}</span>
            </button>

            <button
              onClick={() => resetVisualArray('random')}
              disabled={isSorting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition disabled:opacity-50"
              title="Shuffle Random Array"
            >
              <Shuffle size={14} />
              <span>Shuffle</span>
            </button>

            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 text-xs">
              <button
                onClick={() => resetVisualArray('reversed')}
                disabled={isSorting}
                className="px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition disabled:opacity-50 text-[11px]"
                title="Worst-case scenario (Reversed)"
              >
                Reversed
              </button>
              <button
                onClick={() => resetVisualArray('nearly_sorted')}
                disabled={isSorting}
                className="px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition disabled:opacity-50 text-[11px]"
                title="Best-case scenario (Nearly sorted)"
              >
                Nearly Sorted
              </button>
            </div>
          </div>
        </div>

        {/* Algorithm Selector Tabs */}
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Select Sorting Algorithm:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {(Object.keys(ALGO_METAS) as AlgoType[]).map((algoKey) => {
              const meta = ALGO_METAS[algoKey];
              const isSelected = selectedAlgo === algoKey;
              return (
                <button
                  key={algoKey}
                  onClick={() => {
                    if (isSorting) stopSorting();
                    setSelectedAlgo(algoKey);
                    setStatusMsg(`Selected ${meta.name}. Click Run to start animation.`);
                  }}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                    isSelected
                      ? 'bg-brand-600/20 border-brand-500 text-white shadow-lg shadow-brand-500/10'
                      : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold">{meta.name}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                      meta.avg.includes('log') ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {meta.avg}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 font-mono">
                    Space: {meta.space} • {meta.stable ? 'Stable' : 'Unstable'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Algorithm Profile & Live Counters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/70 p-4 rounded-xl border border-slate-800">
          <div className="space-y-1">
            <span className="text-xs font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={13} /> {ALGO_METAS[selectedAlgo].name} Contract
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {ALGO_METAS[selectedAlgo].desc}
            </p>
          </div>

          <div className="flex items-center justify-around md:justify-center gap-6 border-t md:border-t-0 md:border-l md:border-r border-slate-800 pt-2 md:pt-0">
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Comparisons</span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                {simComparisons.toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Swaps / Moves</span>
              <div className="text-xl font-bold font-mono text-sky-400 mt-0.5">
                {simSwaps.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Speed:</span>
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs font-mono">
                <button
                  onClick={() => setSpeed(450)}
                  className={`px-2 py-1 rounded transition ${simSpeed === 450 ? 'bg-brand-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                  title="Slow & deliberate (best for showing each comparison to the professor)"
                >
                  Slow (450ms)
                </button>
                <button
                  onClick={() => setSpeed(180)}
                  className={`px-2 py-1 rounded transition ${simSpeed === 180 ? 'bg-brand-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                  title="Smooth animation"
                >
                  Normal (180ms)
                </button>
                <button
                  onClick={() => setSpeed(40)}
                  className={`px-2 py-1 rounded transition ${simSpeed === 40 ? 'bg-brand-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                  title="Fast execution"
                >
                  Fast (40ms)
                </button>
                <button
                  onClick={() => setSpeed(10)}
                  className={`px-2 py-1 rounded transition ${simSpeed === 10 ? 'bg-brand-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                  title="Near instantaneous"
                >
                  Turbo (10ms)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Step Explanation Bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/90 rounded-xl border border-slate-800 text-xs">
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse"></span>
          <span className="text-slate-400 font-semibold font-mono">STATUS:</span>
          <span className="text-slate-200 font-mono flex-1 truncate">{statusMsg}</span>
        </div>

        {/* Visual Bar Canvas */}
        <div className="h-48 bg-slate-900/90 rounded-xl p-4 flex items-end justify-center gap-2 sm:gap-3 border border-slate-800">
          {simArray.map((val, idx) => {
            const isActive = activeIndices.includes(idx);
            const isPivot = pivotIndex === idx;
            const isSorted = sortedIndices.includes(idx);

            let barColor = 'bg-brand-500/80 hover:bg-brand-400 text-slate-200';
            let extraStyles = '';

            if (isActive) {
              barColor = 'bg-rose-500 text-white shadow-lg shadow-rose-500/60 scale-105';
              extraStyles = 'ring-2 ring-rose-400';
            } else if (isPivot) {
              barColor = 'bg-purple-500 text-white shadow-lg shadow-purple-500/60';
              extraStyles = 'ring-2 ring-purple-300';
            } else if (isSorted) {
              barColor = 'bg-emerald-500 text-emerald-950 font-bold';
            }

            return (
              <div
                key={idx}
                style={{ height: `${Math.max(val, 10)}%` }}
                className={`w-6 sm:w-9 rounded-t-md transition-all duration-75 flex flex-col justify-between items-center text-[10px] pb-1 font-mono font-bold ${barColor} ${extraStyles}`}
              >
                <span className="text-[9px] pt-1 opacity-70">#{idx}</span>
                <span>{val}</span>
              </div>
            );
          })}
        </div>

        {/* Color Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-brand-500"></span>
            <span>Unsorted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500 ring-2 ring-rose-400/40"></span>
            <span>Comparing / Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-purple-500"></span>
            <span>Pivot / Key</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500"></span>
            <span>Sorted In Place</span>
          </div>
        </div>
      </div>

      {/* Scale Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h2 className="text-base font-bold text-white">Empirical Sorting Performance Visualizer</h2>
          <p className="text-xs text-slate-400">Notice the massive order-of-magnitude gap between O(n²) and O(n log n) algorithms.</p>
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
                  ? 'bg-brand-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Log₁₀ Scale (Orders)
            </button>
          </div>
        </div>
      </div>

      {/* Recharts Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Comparison */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
            <Clock size={16} className="text-brand-400" />
            Execution Duration {scaleMode === 'log' ? '(Log₁₀ Microseconds)' : '(Milliseconds)'} — N = {recordCount}
          </h3>
          <p className="text-xs text-slate-400 mb-6">Lower is better. Notice O(n log n) efficiency over O(n²).</p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortMetrics} margin={{ top: 25, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="algorithm" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  formatter={(val: any, name: any, item: any) => [
                    `${item.payload.display_time || `${val} ms`} (${val} ms)`,
                    'Execution Time'
                  ]}
                />
                <Bar 
                  dataKey={scaleMode === 'log' ? 'time_log' : 'time_ms'} 
                  name="Time" 
                  radius={[8, 8, 0, 0]}
                  minPointSize={14}
                >
                  <LabelList 
                    dataKey="display_time" 
                    position="top" 
                    fill="#f8fafc" 
                    style={{ fontSize: '10px', fontWeight: 'bold' }} 
                    offset={8} 
                  />
                  {sortMetrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comparisons Comparison */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
            <Cpu size={16} className="text-indigo-400" />
            Comparisons Count {scaleMode === 'log' ? '(Log₁₀ Orders)' : ''} — N = {recordCount}
          </h3>
          <p className="text-xs text-slate-400 mb-6">Theoretical complexity visible directly in comparison operations.</p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortMetrics} margin={{ top: 25, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="algorithm" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  formatter={(val: any, name: any, item: any) => [
                    `${item.payload.comparisons.toLocaleString()} comparisons`,
                    'Comparisons'
                  ]}
                />
                <Bar 
                  dataKey={scaleMode === 'log' ? 'comparisons_log' : 'comparisons'} 
                  name="Comparisons" 
                  radius={[8, 8, 0, 0]}
                  minPointSize={14}
                >
                  <LabelList 
                    dataKey="comparisons" 
                    position="top" 
                    fill="#f8fafc" 
                    formatter={(val: any) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                    style={{ fontSize: '10px', fontWeight: 'bold' }} 
                    offset={8} 
                  />
                  {sortMetrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Complexity Breakdown Table */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-4">
          Theoretical vs Empirical Metrics Matrix
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-700/60">
              <tr>
                <th className="py-2.5 px-3">Algorithm</th>
                <th className="py-2.5 px-3">Best Case</th>
                <th className="py-2.5 px-3">Average Case</th>
                <th className="py-2.5 px-3">Worst Case</th>
                <th className="py-2.5 px-3">Space Complexity</th>
                <th className="py-2.5 px-3">Stability</th>
                <th className="py-2.5 px-3">Comparisons</th>
                <th className="py-2.5 px-3">Measured Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {sortMetrics.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-bold text-white font-sans">{m.algorithm}</td>
                  <td className="py-2.5 px-3 text-emerald-400">{m.complexity_best || 'O(n)'}</td>
                  <td className="py-2.5 px-3 text-sky-400">{m.complexity_avg || 'O(n log n)'}</td>
                  <td className="py-2.5 px-3 text-rose-400">{m.complexity_worst || 'O(n²)'}</td>
                  <td className="py-2.5 px-3 text-slate-300">{m.space_complexity || 'O(1)'}</td>
                  <td className="py-2.5 px-3 text-slate-400">{m.is_stable ? 'Stable' : 'Unstable'}</td>
                  <td className="py-2.5 px-3 text-amber-300 font-bold">{(m.comparisons ?? 0).toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-brand-300 font-bold">{m.display_time || `${(m.time_ms ?? 0).toFixed(2)} ms`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};