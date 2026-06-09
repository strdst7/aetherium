import React from 'react';
import { Activity, Cpu, MessageSquare, Settings, Hexagon } from 'lucide-react';
import { TabType } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Nexus Core', icon: <Activity size={20} /> },
    { id: 'nodes', label: 'Node Matrix', icon: <Cpu size={20} /> },
    { id: 'oracle', label: 'AI Oracle', icon: <MessageSquare size={20} /> },
  ];

  return (
    <div className="w-64 h-full bg-aether-800/80 backdrop-blur-md border-r border-aether-cyan/20 flex flex-col">
      <div className="p-6 flex items-center gap-3 border-b border-aether-cyan/20">
        <div className="relative">
          <Hexagon className="text-aether-cyan animate-pulse-slow" size={32} />
          <div className="absolute inset-0 bg-aether-cyan/20 blur-md rounded-full"></div>
        </div>
        <h1 className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-aether-cyan to-aether-purple">
          AETHERIUM
        </h1>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
              activeTab === item.id
                ? 'bg-aether-cyan/10 text-aether-cyan border border-aether-cyan/30 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            {item.icon}
            <span className="font-medium tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-aether-cyan/20">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors">
          <Settings size={20} />
          <span className="font-medium tracking-wide">System Config</span>
        </button>
      </div>
    </div>
  );
};
