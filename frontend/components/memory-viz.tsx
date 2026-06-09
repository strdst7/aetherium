import React, { useState, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Search, Database, Fingerprint, Zap, Shield } from 'lucide-react';
import { MemoryPoint, SearchResult } from '../types';

const generateMemories = (): MemoryPoint[] => Array.from({ length: 200 }).map((_, i) => ({
  id: `mem-${i}`,
  x: Math.random() * 100,
  y: Math.random() * 100,
  z: 20 + Math.random() * 80,
  content: `Memory fragment ${i} regarding system directives, identity anchors, and historical context.`,
  cluster: i % 4 === 0 ? 'core' : i % 4 === 1 ? 'recent' : i % 4 === 2 ? 'archived' : 'anomaly',
}));

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-primary-900 border border-aether-orange p-3 rounded-lg text-xs font-mono text-slate-200 shadow-[0_0_15px_rgba(255,140,0,0.2)] z-50">
        <p className="text-aether-orange font-bold mb-1">{data.id}</p>
        <p className="text-slate-400 mb-2">Cluster: {data.cluster}</p>
        <p className="max-w-[200px] truncate">{data.content}</p>
      </div>
    );
  }
  return null;
};

export const MemoryViz: React.FC = () => {
  const [memories] = useState<MemoryPoint[]>(generateMemories());
  const [searchQuery, setSearchQuery] = useState('');
  const [identityScope, setIdentityScope] = useState('oracle_v1');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [useServerUmap, setUseServerUmap] = useState(true);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }
      // Mock vector search
      const shuffled = [...memories].sort(() => 0.5 - Math.random());
      const topK = shuffled.slice(0, 5).map(m => ({
        ...m,
        similarity: 0.75 + Math.random() * 0.24
      })).sort((a, b) => b.similarity - a.similarity);
      setResults(topK);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      console.error(`❌ Search failed: ${message}`);
    }
  };

  // Simulate UMAP projection changes based on toggle
  const projectedMemories = useMemo(() => {
    if (useServerUmap) {
      return memories; // "Optimized" layout
    }
    // "Unoptimized" client-side layout simulation (slightly jittered)
    return memories.map(m => ({
      ...m,
      x: Math.max(0, Math.min(100, m.x + (Math.random() * 10 - 5))),
      y: Math.max(0, Math.min(100, m.y + (Math.random() * 10 - 5)))
    }));
  }, [memories, useServerUmap]);

  return (
    <div className="p-8 h-full flex flex-col">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Memory Visualization</h2>
          <p className="text-slate-400 font-mono text-sm">Vector search and embedding space mapping.</p>
        </div>
        
        {/* Performance Toggle to address architecture bottleneck */}
        <div className="flex items-center gap-3 bg-primary-800/80 border border-aether-orange/30 px-4 py-2 rounded-lg">
          <Zap size={16} className={useServerUmap ? 'text-aether-orange' : 'text-slate-500'} />
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs font-mono text-slate-300">Server-Side UMAP Projection</span>
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={useServerUmap}
                onChange={() => setUseServerUmap(!useServerUmap)}
              />
              <div className={`block w-10 h-6 rounded-full transition-colors ${useServerUmap ? 'bg-aether-orange/40' : 'bg-slate-700'}`}></div>
              <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${useServerUmap ? 'transform translate-x-4 bg-aether-orange' : ''}`}></div>
            </div>
          </label>
        </div>
      </header>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left Panel: Search & Results */}
        <div className="w-1/3 flex flex-col gap-4">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative flex items-center bg-primary-800 border border-aether-orange/30 rounded-lg p-2 focus-within:border-aether-orange transition-colors shadow-[0_0_10px_rgba(255,140,0,0.05)]">
              <Search size={18} className="text-aether-orange ml-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Query memory space..."
                className="flex-1 bg-transparent border-none outline-none text-white px-3 font-mono text-sm placeholder-slate-500"
              />
            </div>
            
            {/* Identity Scope Selector reflecting CR-01 and WR-05 fixes */}
            <div className="flex gap-2 mt-3">
              <div className="flex items-center gap-2 bg-primary-900 border border-aether-neon/30 rounded-lg p-1.5 px-3 w-full">
                <Shield size={14} className="text-aether-neon" />
                <select 
                  value={identityScope}
                  onChange={(e) => setIdentityScope(e.target.value)}
                  className="bg-transparent text-xs text-slate-300 outline-none font-mono cursor-pointer w-full"
                >
                  <option value="oracle_v1">Scope: oracle_v1</option>
                  <option value="halo_arc">Scope: halo_arc</option>
                  <option value="global">Scope: Global (Admin)</option>
                </select>
              </div>
            </div>
          </form>

          <div className="flex-1 bg-primary-800/50 border border-white/10 rounded-xl p-4 overflow-y-auto custom-scrollbar">
            <h3 className="text-slate-300 font-mono text-sm mb-4 flex items-center gap-2">
              <Database size={16} /> Top K Results
            </h3>
            {results.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                <Database size={48} className="mb-4" />
                <p className="text-sm italic text-center">No active query.<br/>Enter a search term to perform vector similarity search.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((res) => (
                  <div key={res.id} className="bg-white/5 border border-aether-orange/20 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-mono text-aether-orange">ID: {res.id}</span>
                      <span className="text-xs font-mono text-green-400 flex items-center gap-1">
                        <Fingerprint size={12} /> {(res.similarity * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-3">{res.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Scatter Chart */}
        <div className="flex-1 bg-primary-800/30 border border-white/10 rounded-xl p-4 flex flex-col relative overflow-hidden">
          {!useServerUmap && (
            <div className="absolute top-4 right-4 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 text-xs font-mono px-3 py-1 rounded-md z-10 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
              </span>
              Client-Side Processing (High CPU Load)
            </div>
          )}
          <h3 className="text-slate-300 font-mono text-sm mb-4">2D Projection of Embedding Space</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3f" />
                <XAxis type="number" dataKey="x" name="Dim 1" stroke="#4b5563" tick={false} axisLine={false} />
                <YAxis type="number" dataKey="y" name="Dim 2" stroke="#4b5563" tick={false} axisLine={false} />
                <ZAxis type="number" dataKey="z" range={[20, 100]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                <Scatter data={projectedMemories} fill="#39ff14" animationDuration={useServerUmap ? 500 : 0}>
                  {projectedMemories.map((entry, index) => {
                    const isResult = results.find(r => r.id === entry.id);
                    return <Cell 
                      key={`cell-${index}`} 
                      fill={isResult ? '#ffb700' : entry.cluster === 'anomaly' ? '#39ff14' : '#4b5563'} 
                      opacity={isResult ? 1 : 0.6} 
                    />;
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
