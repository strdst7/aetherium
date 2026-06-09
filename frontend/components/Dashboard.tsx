import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { Zap, Shield, Wifi, AlertTriangle } from 'lucide-react';
import { MOCK_NETWORK_DATA } from '../constants';
import { NetworkMetric } from '../types';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<NetworkMetric[]>(MOCK_NETWORK_DATA);

  // Simulate real-time data updates
  useEffect(() => {
    const interval = window.setInterval(() => {
      setData(prev => {
        const newData = [...prev.slice(1)];
        const last = prev[prev.length - 1];
        const timeParts = last.time.split(':');
        const nextHour = (parseInt(timeParts[0]) + 1) % 24;
        
        newData.push({
          time: `${nextHour}:00`,
          flux: Math.max(20, Math.min(100, last.flux + (Math.random() * 20 - 10))),
          coherence: Math.max(40, Math.min(100, last.coherence + (Math.random() * 10 - 5))),
          latency: Math.max(5, Math.min(50, last.latency + (Math.random() * 10 - 5))),
        });
        return newData;
      });
    }, 3000);
    return () => window.clearInterval(interval);
  }, []);

  const currentMetrics = data[data.length - 1];

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Nexus Core Status</h2>
          <p className="text-slate-400 font-mono text-sm">System operational. Monitoring quantum fluctuations.</p>
        </div>
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-4 py-2 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-green-400 text-sm font-mono">NETWORK STABLE</span>
        </div>
      </header>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard 
          title="Aether Flux" 
          value={`${currentMetrics.flux.toFixed(1)} TH/s`} 
          icon={<Zap className="text-aether-orange" />}
          color="orange"
        />
        <MetricCard 
          title="Quantum Coherence" 
          value={`${currentMetrics.coherence.toFixed(1)} %`} 
          icon={<Shield className="text-aether-neon" />}
          color="neon"
        />
        <MetricCard 
          title="Subspace Latency" 
          value={`${currentMetrics.latency.toFixed(1)} ms`} 
          icon={<Wifi className="text-aether-gold" />}
          color="gold"
          alert={currentMetrics.latency > 30}
        />
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-primary-800/50 border border-aether-orange/20 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-medium text-slate-200 mb-6 font-mono">Flux & Coherence Matrix</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFlux" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff8c00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ff8c00" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCoherence" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#39ff14" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#39ff14" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3f" vertical={false} />
                <XAxis dataKey="time" stroke="#4b5563" tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis stroke="#4b5563" tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0b0316', borderColor: '#ff8c00', color: '#fff' }}
                  itemStyle={{ color: '#ff8c00' }}
                />
                <Area type="monotone" dataKey="flux" stroke="#ff8c00" fillOpacity={1} fill="url(#colorFlux)" />
                <Area type="monotone" dataKey="coherence" stroke="#39ff14" fillOpacity={1} fill="url(#colorCoherence)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-primary-800/50 border border-aether-orange/20 rounded-xl p-6 backdrop-blur-sm flex flex-col">
          <h3 className="text-lg font-medium text-slate-200 mb-6 font-mono">Latency Variance</h3>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3f" vertical={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0b0316', borderColor: '#ffb700', color: '#fff' }}
                />
                <Line type="stepAfter" dataKey="latency" stroke="#ffb700" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'orange' | 'neon' | 'gold';
  alert?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, alert }) => {
  const colorMap = {
    orange: 'border-aether-orange/30 shadow-[0_0_15px_rgba(255,140,0,0.1)]',
    neon: 'border-aether-neon/30 shadow-[0_0_15px_rgba(57,255,20,0.1)]',
    gold: 'border-aether-gold/30 shadow-[0_0_15px_rgba(255,183,0,0.1)]',
  };

  return (
    <div className={`bg-primary-800/60 backdrop-blur-md border rounded-xl p-6 relative overflow-hidden ${colorMap[color]}`}>
      {alert && (
        <div className="absolute top-0 right-0 p-2">
          <AlertTriangle className="text-aether-neon animate-pulse" size={20} />
        </div>
      )}
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-white/5 rounded-lg">
          {icon}
        </div>
        <h3 className="text-slate-400 font-mono text-sm uppercase tracking-wider">{title}</h3>
      </div>
      <div className="text-3xl font-bold text-white tracking-tight">
        {value}
      </div>
      {/* Decorative background element */}
      <div className="absolute -bottom-6 -right-6 opacity-5 pointer-events-none">
        {React.cloneElement(icon as React.ReactElement, { size: 100 })}
      </div>
    </div>
  );
};
