import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, RotateCcw, 
  Layers, Compass, CheckCircle2, ChevronRight,
  BookOpen, User, FolderTree, Sparkles, HelpCircle,
  Lightbulb, Zap, ArrowRight, RefreshCw, Check
} from 'lucide-react';
import { api } from '../services/api';

// Curated Textbook Topic Presets
const TOPIC_PRESETS = [
  {
    id: 'category:1',
    name: 'Algorithms & Data Structures',
    subtitle: 'CLRS, Donald Knuth, Sorting & Graphs',
    icon: BookOpen,
    color: 'from-blue-600 to-indigo-600'
  },
  {
    id: 'category:2',
    name: 'Artificial Intelligence & ML',
    subtitle: 'Stuart Russell, Deep Learning, Neural Nets',
    icon: Sparkles,
    color: 'from-purple-600 to-pink-600'
  },
  {
    id: 'category:3',
    name: 'Software Craft & Architecture',
    subtitle: 'Uncle Bob, Clean Code, Design Patterns',
    icon: FolderTree,
    color: 'from-emerald-600 to-teal-600'
  }
];

export const GraphLabPage: React.FC = () => {
  const [activeTopicId, setActiveTopicId] = useState<string>('category:1');
  const [subgraph, setSubgraph] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [algorithm, setAlgorithm] = useState<'BFS' | 'DFS'>('BFS');
  const [maxHops, setMaxHops] = useState<number>(2);

  // Traversal playback state
  const [traversalResult, setTraversalResult] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMs, setSpeedMs] = useState<number>(900); // 900ms is easy to follow
  const speedRef = useRef<number>(900);
  const timerRef = useRef<any>(null);

  const handleSetSpeed = (ms: number) => {
    setSpeedMs(ms);
    speedRef.current = ms;
  };

  const loadGraphAndTraverse = async (topicId: string, algo: 'BFS' | 'DFS' = algorithm) => {
    try {
      setLoading(true);
      setIsPlaying(false);
      // Fetch the focused 7-node cluster for this topic
      const subRes = await api.getGraphSubgraph(topicId, 8);
      setSubgraph(subRes);
      if (subRes.nodes && subRes.nodes.length > 0) {
        const found = subRes.nodes.find((n: any) => n.id === topicId);
        setSelectedNode(found || subRes.nodes[0]);
      }

      // Automatically compute traversal steps so page is ready for Play immediately
      const travRes = await api.traverseGraph(topicId, algo, maxHops);
      setTraversalResult(travRes);
      setCurrentStep(0);
    } catch (err) {
      console.error('Failed to load topic and traversal', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraphAndTraverse(activeTopicId, algorithm);
  }, [activeTopicId]);

  const runTraversal = async (autoPlay: boolean = true) => {
    const originId = selectedNode?.id || activeTopicId;
    try {
      const travRes = await api.traverseGraph(originId, algorithm, maxHops);
      setTraversalResult(travRes);
      setCurrentStep(0);
      if (autoPlay) {
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Failed to run traversal', err);
    }
  };

  const handleTogglePlay = async () => {
    const steps = traversalResult?.steps || traversalResult?.traversal_steps || [];
    if (steps.length === 0) {
      await runTraversal(true);
      return;
    }

    if (currentStep >= steps.length - 1) {
      // If at end of animation, restart from Step 1 and play!
      setCurrentStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(prev => !prev);
    }
  };

  const traversalSteps: any[] = traversalResult?.steps || traversalResult?.traversal_steps || [];
  const activeStepInfo = traversalSteps[currentStep] || null;

  useEffect(() => {
    if (isPlaying && traversalSteps.length > 0) {
      timerRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= traversalSteps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speedRef.current);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, traversalSteps, speedMs]);

  // Set of visited node IDs up to the current step
  const visitedNodesSet = new Set(
    traversalSteps.slice(0, currentStep + 1).map((s: any) => s.node_id)
  );

  // Set of nodes currently waiting in the frontier (Queue or Stack)
  const frontierSet = new Set<string>();
  if (activeStepInfo) {
    if (algorithm === 'BFS' && activeStepInfo.queue_snapshot) {
      activeStepInfo.queue_snapshot.forEach((item: any) => frontierSet.add(item.id));
    } else if (algorithm === 'DFS' && activeStepInfo.stack_snapshot) {
      activeStepInfo.stack_snapshot.forEach((item: any) => frontierSet.add(item.id));
    }
  }

  const nodes: any[] = subgraph?.nodes || [];
  const edges: any[] = subgraph?.edges || [];

  // Group nodes cleanly by type for a readable 3-tier layout
  const categories = nodes.filter(n => n.type === 'category');
  const books = nodes.filter(n => n.type === 'book');
  const authors = nodes.filter(n => n.type === 'author');

  const canvasWidth = 820;
  const canvasHeight = 430;
  const nodePositions: Record<string, { x: number; y: number; width: number; height: number }> = {};

  // Tier 1: Category at top center
  if (categories.length > 0) {
    categories.forEach((cat, idx) => {
      const spacing = canvasWidth / (categories.length + 1);
      nodePositions[cat.id] = {
        x: Math.round(spacing * (idx + 1)),
        y: 55,
        width: 250,
        height: 48
      };
    });
  }

  // Tier 2: Books in middle row with generous spacing
  if (books.length > 0) {
    const spacing = canvasWidth / (books.length + 1);
    books.forEach((b, idx) => {
      nodePositions[b.id] = {
        x: Math.round(spacing * (idx + 1)),
        y: 195,
        width: 215,
        height: 52
      };
    });
  }

  // Tier 3: Authors in bottom row aligned below books
  if (authors.length > 0) {
    const spacing = canvasWidth / (authors.length + 1);
    authors.forEach((a, idx) => {
      nodePositions[a.id] = {
        x: Math.round(spacing * (idx + 1)),
        y: 345,
        width: 205,
        height: 48
      };
    });
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
              Interactive Graph Laboratory
            </span>
            <span className="text-xs text-brand-400 font-mono">
              Knowledge Graph & Traversal Engine
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mt-1">
            Library Knowledge Graph & Search Traversal
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Visualize how Books, Authors, and Categories link together. Watch how BFS (Queue) and DFS (Stack) step through nodes.
          </p>
        </div>

        <button
          onClick={() => loadGraphAndTraverse(activeTopicId, algorithm)}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Reset Graph</span>
        </button>
      </div>

      {/* Step 1: Select Topic Presets */}
      <div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Lightbulb size={14} className="text-amber-400" />
          <span>Step 1: Choose a Library Knowledge Topic to Explore</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TOPIC_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = activeTopicId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setActiveTopicId(preset.id);
                  loadGraphAndTraverse(preset.id, algorithm);
                }}
                className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3.5 ${
                  isSelected
                    ? 'bg-slate-800 border-brand-500 ring-2 ring-brand-500/30 text-white shadow-lg'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${preset.color} text-white shadow-md`}>
                  <Icon size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold">{preset.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{preset.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Controls Toolbar */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Step 2: Search Strategy:</span>
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => {
                setAlgorithm('BFS');
                loadGraphAndTraverse(activeTopicId, 'BFS');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                algorithm === 'BFS' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers size={13} />
              <span>BFS (Queue — Layer by Layer)</span>
            </button>
            <button
              onClick={() => {
                setAlgorithm('DFS');
                loadGraphAndTraverse(activeTopicId, 'DFS');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                algorithm === 'DFS' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass size={13} />
              <span>DFS (Stack — Deep Dive)</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => runTraversal(true)}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition"
          >
            <Play size={14} />
            <span>Play {algorithm} Traversal</span>
          </button>
        </div>
      </div>

      {/* Main Presentation Area: Graph on Left, Step Walkthrough on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* SVG Graph Canvas Card */}
        <div className="lg:col-span-2 bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-2xl relative">
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-purple-300 font-semibold">
                <span className="w-3 h-3 rounded-md bg-purple-600 border border-purple-400"></span> Category
              </span>
              <span className="flex items-center gap-1.5 text-sky-300 font-semibold">
                <span className="w-3 h-3 rounded-md bg-sky-600 border border-sky-400"></span> Author
              </span>
              <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <span className="w-3 h-3 rounded-md bg-slate-700 border border-slate-500"></span> Book
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span> Visited
              </span>
              <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Waiting in Frontier
              </span>
            </div>
          </div>

          {/* SVG Diagram Canvas */}
          <div className="w-full overflow-x-auto flex justify-center py-2">
            <svg width={canvasWidth} height={canvasHeight} className="select-none max-w-full">
              {/* Layer Guidelines */}
              <line x1={30} y1={55} x2={canvasWidth - 30} y2={55} stroke="#334155" strokeDasharray="3 3" opacity={0.3} />
              <text x={35} y={35} fill="#a855f7" fontSize={11} fontWeight="bold" className="font-mono">
                TIER 1: CATEGORY
              </text>

              <line x1={30} y1={195} x2={canvasWidth - 30} y2={195} stroke="#334155" strokeDasharray="3 3" opacity={0.3} />
              <text x={35} y={150} fill="#64748b" fontSize={11} fontWeight="bold" className="font-mono">
                TIER 2: CURATED BOOKS (IN CATEGORY)
              </text>

              <line x1={30} y1={345} x2={canvasWidth - 30} y2={345} stroke="#334155" strokeDasharray="3 3" opacity={0.3} />
              <text x={35} y={300} fill="#0284c7" fontSize={11} fontWeight="bold" className="font-mono">
                TIER 3: AUTHORS (WRITTEN BY)
              </text>

              {/* Connecting Edges */}
              {edges.map((edge: any, idx: number) => {
                const srcPos = nodePositions[edge.source];
                const tgtPos = nodePositions[edge.target];
                if (!srcPos || !tgtPos) return null;

                const isTraversed = visitedNodesSet.has(edge.source) && visitedNodesSet.has(edge.target);

                // Smooth direct line with subtle curve
                const cx = (srcPos.x + tgtPos.x) / 2;
                const cy = (srcPos.y + tgtPos.y) / 2;

                return (
                  <g key={`edge-${idx}`}>
                    <path
                      d={`M ${srcPos.x} ${srcPos.y} Q ${cx} ${cy} ${tgtPos.x} ${tgtPos.y}`}
                      stroke={isTraversed ? '#10b981' : '#475569'}
                      strokeWidth={isTraversed ? 3 : 1.5}
                      fill="none"
                      opacity={isTraversed ? 1 : 0.6}
                      className="transition-all duration-300"
                    />
                  </g>
                );
              })}

              {/* Node Cards */}
              {nodes.map((node: any) => {
                const pos = nodePositions[node.id];
                if (!pos) return null;

                const isCurrent = activeStepInfo?.node_id === node.id;
                const isVisited = visitedNodesSet.has(node.id);
                const isFrontier = frontierSet.has(node.id);
                const isSelected = selectedNode?.id === node.id;

                const cardWidth = pos.width;
                const cardHeight = pos.height;

                let cardBg = '#1e293b';
                let cardBorder = '#475569';
                let tagBg = '#334155';
                let tagText = '#94a3b8';

                if (node.type === 'category') {
                  cardBg = '#2e1065';
                  cardBorder = '#7e22ce';
                  tagBg = '#581c87';
                  tagText = '#d8b4fe';
                } else if (node.type === 'author') {
                  cardBg = '#0c4a6e';
                  cardBorder = '#0284c7';
                  tagBg = '#075985';
                  tagText = '#7dd3fc';
                } else if (node.type === 'book') {
                  cardBg = '#0f172a';
                  cardBorder = '#334155';
                  tagBg = '#1e293b';
                  tagText = '#94a3b8';
                }

                if (isCurrent) {
                  cardBg = '#064e3b';
                  cardBorder = '#10b981';
                  tagBg = '#047857';
                  tagText = '#6ee7b7';
                } else if (isFrontier) {
                  cardBg = '#451a03';
                  cardBorder = '#f59e0b';
                  tagBg = '#78350f';
                  tagText = '#fde68a';
                } else if (isVisited) {
                  cardBorder = '#10b981';
                }

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x - cardWidth / 2}, ${pos.y - cardHeight / 2})`}
                    onClick={() => {
                      setSelectedNode(node);
                      runTraversal(false);
                    }}
                    className="cursor-pointer transition-all duration-200"
                  >
                    {/* Pulsing indicator for active step */}
                    {isCurrent && (
                      <rect
                        x={-4}
                        y={-4}
                        width={cardWidth + 8}
                        height={cardHeight + 8}
                        rx={16}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        className="animate-pulse"
                      />
                    )}

                    {/* Node Card Rect */}
                    <rect
                      width={cardWidth}
                      height={cardHeight}
                      rx={12}
                      fill={cardBg}
                      stroke={cardBorder}
                      strokeWidth={isCurrent || isSelected ? 2.5 : 1.5}
                      className="shadow-md"
                    />

                    {/* Type Tag inside Card */}
                    <rect
                      x={10}
                      y={7}
                      width={node.type === 'category' ? 62 : 52}
                      height={15}
                      rx={4}
                      fill={tagBg}
                    />
                    <text
                      x={14}
                      y={18}
                      fill={tagText}
                      fontSize={8.5}
                      fontWeight="bold"
                      className="font-mono uppercase select-none pointer-events-none"
                    >
                      {node.type}
                    </text>

                    {/* Status Badge */}
                    {isVisited && (
                      <text
                        x={cardWidth - 12}
                        y={18}
                        textAnchor="end"
                        fill="#34d399"
                        fontSize={9.5}
                        fontWeight="bold"
                      >
                        ✓ Visited
                      </text>
                    )}
                    {isFrontier && !isVisited && (
                      <text
                        x={cardWidth - 12}
                        y={18}
                        textAnchor="end"
                        fill="#fbbf24"
                        fontSize={9.5}
                        fontWeight="bold"
                      >
                        ⏳ In {algorithm === 'BFS' ? 'Queue' : 'Stack'}
                      </text>
                    )}

                    {/* Card Title Label */}
                    <text
                      x={10}
                      y={cardHeight - 12}
                      fill={isCurrent ? '#ffffff' : '#f1f5f9'}
                      fontSize={11}
                      fontWeight={isCurrent ? 'bold' : '600'}
                      className="select-none pointer-events-none font-sans"
                    >
                      {node.label && node.label.length > 25
                        ? `${node.label.slice(0, 23)}…`
                        : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="pt-2 text-center text-xs text-slate-400">
            Click any card on the graph to start traversal from that vertex.
          </div>
        </div>

        {/* Right Guided Traversal Panel */}
        <div className="space-y-4">
          {/* Step Walkthrough Controller */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles size={16} className="text-brand-400" />
                  {algorithm} Traversal Guide
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {traversalSteps.length > 0 
                    ? `Step ${currentStep + 1} of ${traversalSteps.length}` 
                    : 'Ready to traverse'}
                </p>
              </div>

              {/* Play / Step Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                  disabled={!traversalSteps.length || currentStep === 0}
                  className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 transition disabled:opacity-40"
                  title="Previous Step"
                >
                  <SkipBack size={14} />
                </button>

                <button
                  onClick={handleTogglePlay}
                  className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-brand-600/30"
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>

                <button
                  onClick={() => setCurrentStep(prev => Math.min(traversalSteps.length - 1, prev + 1))}
                  disabled={!traversalSteps.length || currentStep >= traversalSteps.length - 1}
                  className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 transition disabled:opacity-40"
                  title="Next Step"
                >
                  <SkipForward size={14} />
                </button>
              </div>
            </div>

            {/* Animation Speed Selector */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Step Speed:</span>
              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-700 font-mono text-[11px]">
                <button
                  onClick={() => handleSetSpeed(1400)}
                  className={`px-2.5 py-1 rounded transition ${speedMs === 1400 ? 'bg-brand-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Slow (1.4s)
                </button>
                <button
                  onClick={() => handleSetSpeed(850)}
                  className={`px-2.5 py-1 rounded transition ${speedMs === 850 ? 'bg-brand-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Normal (0.8s)
                </button>
                <button
                  onClick={() => handleSetSpeed(350)}
                  className={`px-2.5 py-1 rounded transition ${speedMs === 350 ? 'bg-brand-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Fast (0.3s)
                </button>
              </div>
            </div>

            {/* Conversational Explanation of Active Step */}
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wider block">
                {activeStepInfo ? `Step #${currentStep + 1} Action` : 'How it works'}
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {activeStepInfo?.action_description || (
                  traversalSteps.length === 0
                    ? `Click "Play ${algorithm} Traversal" to see the step-by-step search path.`
                    : `Currently visiting ${activeStepInfo?.label} at tree depth ${activeStepInfo?.depth}.`
                )}
              </p>
            </div>

            {/* Live Frontier Data Structure (Queue / Stack) */}
            <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  {algorithm === 'BFS' ? (
                    <>
                      <Layers size={14} className="text-amber-400" />
                      FIFO Queue [Front ──► Back]
                    </>
                  ) : (
                    <>
                      <Compass size={14} className="text-indigo-400" />
                      LIFO Call Stack [Top ──► Bottom]
                    </>
                  )}
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-semibold">
                  {algorithm === 'BFS'
                    ? `${activeStepInfo?.queue_snapshot?.length || 0} waiting`
                    : `${activeStepInfo?.stack_snapshot?.length || 0} on stack`}
                </span>
              </div>

              {/* Items in Queue / Stack */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {algorithm === 'BFS' ? (
                  activeStepInfo?.queue_snapshot && activeStepInfo.queue_snapshot.length > 0 ? (
                    activeStepInfo.queue_snapshot.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1.5 bg-slate-800 border border-amber-500/30 rounded-lg text-xs flex items-center justify-between text-amber-200"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-amber-400 font-bold">
                            {idx === 0 ? 'NEXT' : `#${idx + 1}`}
                          </span>
                          <span className="truncate max-w-[130px] font-medium">{item.label}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          {item.type}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic py-2 text-center">
                      Queue is currently empty.
                    </p>
                  )
                ) : (
                  activeStepInfo?.stack_snapshot && activeStepInfo.stack_snapshot.length > 0 ? (
                    activeStepInfo.stack_snapshot.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1.5 bg-slate-800 border border-indigo-500/30 rounded-lg text-xs flex items-center justify-between text-indigo-200"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-indigo-400 font-bold">
                            {idx === 0 ? 'TOP' : `#${idx + 1}`}
                          </span>
                          <span className="truncate max-w-[130px] font-medium">{item.label}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          {item.type}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic py-2 text-center">
                      Stack is currently empty.
                    </p>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Professor Viva Presentation Cheatsheet */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
          <HelpCircle size={16} className="text-brand-400" />
          <span>Viva Cheatsheet: What to Explain to the Professor</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-3.5 bg-slate-800/50 rounded-xl border border-slate-700/60 space-y-1.5">
            <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
              <Layers size={14} /> Breadth-First Search (BFS)
            </h4>
            <p className="leading-relaxed">
              <strong>Data Structure:</strong> First-In, First-Out (FIFO) Queue.<br/>
              <strong>Mechanism:</strong> Visits all immediate 1-hop neighbors first before expanding to 2-hop neighbors.<br/>
              <strong>Best Used For:</strong> Finding the <em>shortest unweighted path</em> (e.g. minimum degrees of separation between a scholar and a topic).
            </p>
          </div>

          <div className="p-3.5 bg-slate-800/50 rounded-xl border border-slate-700/60 space-y-1.5">
            <h4 className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Compass size={14} /> Depth-First Search (DFS)
            </h4>
            <p className="leading-relaxed">
              <strong>Data Structure:</strong> Last-In, First-Out (LIFO) Stack (or recursion call stack).<br/>
              <strong>Mechanism:</strong> Follows a single chain of connections down to maximum depth before backtracking.<br/>
              <strong>Best Used For:</strong> Cycle detection, dependency resolution, and deep curriculum path exploration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};