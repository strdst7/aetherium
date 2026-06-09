import React from 'react';
import { Terminal, Cpu, Database, Settings, Hexagon, ShieldAlert, Lock, LogOut, Activity } from 'lucide-react';
import { TabType } from '../types';
import { API_BASE_URL } from '../constants';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Nexus Core', icon: <Activity size={20} /> },
    { id: 'shell', label: 'Web Shell', icon: <Terminal size={20} /> },
    { id: 'agents', label: 'Agents UI', icon: <Cpu size={20} /> },
    { id: 'memory', label: 'Memory Viz', icon: <Database size={20} /> },
    { id: 'governance', label: 'Governance', icon: <ShieldAlert size={20} /> },
  ];

  return (
    <div className="w-64 h-full bg-primary-800/80 backdrop-blur-md border-r border-aether-orange/20 flex flex-col">
      <div 
        className="p-6 flex items-center gap-3 border-b border-aether-orange/20 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setActiveTab('landing')}
        title="Return to Home"
      >
        <div className="relative">
          <Hexagon className="text-aether-orange animate-pulse-slow" size={32} />
          <div className="absolute inset-0 bg-aether-orange/20 blur-md rounded-full"></div>
        </div>
        <h1 className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-aether-orange via-aether-gold to-aether-neon">
          NEXUS
        </h1>
      </div>

      <div className="px-6 py-4 border-b border-aether-orange/10 bg-black/20">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
          <Lock size={12} className="text-green-400" />
          <span>Auth: Admin (Token Valid)</span>
        </div>
        <div className="text-[10px] font-mono text-slate-500 truncate" title={API_BASE_URL}>
          API: {API_BASE_URL}
        </div>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
              activeTab === item.id
                ? 'bg-aether-orange/10 text-aether-orange border border-aether-orange/30 shadow-[0_0_10px_rgba(255,140,0,0.2)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            {item.icon}
            <span className="font-medium tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-aether-orange/20 space-y-2">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors">
          <Settings size={20} />
          <span className="font-medium tracking-wide">System Config</span>
        </button>
        <button 
          onClick={() => setActiveTab('landing')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-aether-neon hover:bg-aether-neon/10 transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium tracking-wide">Disconnect</span>
        </button>
        <div className="pt-4 text-center text-[10px] font-mono text-aether-orange/60">
          Engineered by NUR AMIRAH MOHD KAMIL
        </div>
      </div>
    </div>
  );
};
