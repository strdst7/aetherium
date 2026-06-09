import React from 'react';
import { Server, Cpu, Shield, Database, MessageSquare, Layers, Activity, ArrowDown, ArrowRight } from 'lucide-react';

const NodeBox: React.FC<{ title: string, desc: string, color?: 'orange' | 'magenta' | 'rose' | 'slate', icon: React.ReactNode }> = ({ title, desc, color = 'orange', icon }) => {
  const colorClasses = {
    orange: 'border-aether-orange/50 bg-aether-orange/10 text-aether-orange shadow-[0_0_15px_rgba(255,122,0,0.1)]',
    magenta: 'border-aether-magenta/50 bg-aether-magenta/10 text-aether-magenta shadow-[0_0_15px_rgba(255,0,127,0.1)]',
    rose: 'border-aether-rose/50 bg-aether-rose/10 text-aether-rose shadow-[0_0_15px_rgba(230,0,92,0.1)]',
    slate: 'border-slate-500/50 bg-slate-500/10 text-slate-300',
  };

  return (
    <div className={`border-2 rounded-xl p-4 flex-1 min-w-[220px] backdrop-blur-md transition-transform hover:scale-105 ${colorClasses[color]}`}>
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <h4 className="font-bold font-mono text-sm tracking-wide">{title}</h4>
      </div>
      <p className="text-xs opacity-80 leading-relaxed">{desc}</p>
    </div>
  );
};

export const AgentsUI: React.FC = () => {
  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar relative">
      <header className="mb-10">
        <h2 className="text-3xl font-bold text-white mb-2">Architecture Topology</h2>
        <p className="text-slate-400 font-mono text-sm">Live visualization of the Nexus reasoning pipeline.</p>
      </header>

      <div className="flex flex-col items-center max-w-5xl mx-auto relative">
        
        {/* Web Client */}
        <div className="w-full mb-8">
          <h3 className="text-slate-300 font-mono mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
            <Activity size={16}/> Presentation Layer (Web)
          </h3>
          <div className="flex gap-4 justify-center">
            <NodeBox title="Web Client (Next.js)" desc="Pages: Shell, Agents, Memory, Governance" icon={<Layers size={18}/>} color="slate" />
          </div>
        </div>

        <ArrowDown className="text-aether-orange mb-8 animate-bounce" size={24} />

        {/* API Layer */}
        <div className="w-full mb-8 bg-aether-900/50 p-6 rounded-2xl border border-aether-orange/20">
          <h3 className="text-aether-orange font-mono mb-6 flex items-center gap-2">
            <Server size={16}/> API Layer (Express)
          </h3>
          <div className="flex gap-6 flex-wrap justify-center">
            <NodeBox title="ReasonController" desc="Handles /v1/reason, validates requests" icon={<Activity size={18}/>} color="orange" />
            <NodeBox title="MemoryController" desc="Exposes memory retrieval & trace" icon={<Database size={18}/>} color="orange" />
            <NodeBox title="FailoverController" desc="Simulates provider failures" icon={<Activity size={18}/>} color="orange" />
          </div>
        </div>

        <ArrowDown className="text-aether-magenta mb-8 animate-bounce" size={24} />

        {/* Service Layer */}
        <div className="w-full mb-8 bg-aether-900/50 p-6 rounded-2xl border border-aether-magenta/20">
          <h3 className="text-aether-magenta font-mono mb-6 flex items-center gap-2">
            <Layers size={16}/> Service Layer
          </h3>
          <div className="flex gap-6 flex-wrap justify-center mb-6">
            <NodeBox title="Orchestrator" desc="Core reasoning engine & flow control" icon={<Cpu size={18}/>} color="magenta" />
            <NodeBox title="MultiAgentOrchestrator" desc="Coordinates Archivist → SigilKeeper → Narrator" icon={<Cpu size={18}/>} color="magenta" />
          </div>
          <div className="flex gap-6 flex-wrap justify-center">
            <NodeBox title="ProviderRegistry" desc="Singleton registry with priority failover" icon={<Server size={18}/>} color="magenta" />
            <NodeBox title="ReflectiveService" desc="Identity compliance & governance gate" icon={<Shield size={18}/>} color="magenta" />
            <NodeBox title="MemoryService" desc="Vector search & CRUD operations" icon={<Database size={18}/>} color="magenta" />
          </div>
        </div>

        <ArrowDown className="text-aether-rose mb-8 animate-bounce" size={24} />

        {/* Agent Layer */}
        <div className="w-full mb-8 bg-aether-900/50 p-6 rounded-2xl border border-aether-rose/20">
          <h3 className="text-aether-rose font-mono mb-6 flex items-center gap-2">
            <Cpu size={16}/> Agent Layer (Council)
          </h3>
          <div className="flex gap-6 flex-wrap justify-center items-center">
            <NodeBox title="Archivist" desc="Retrieves & summarizes identity memories" icon={<Database size={18}/>} color="rose" />
            <ArrowRight className="text-aether-rose hidden md:block" size={24} />
            <NodeBox title="SigilKeeper" desc="Enforces Sigil law & identity fidelity" icon={<Shield size={18}/>} color="rose" />
            <ArrowRight className="text-aether-rose hidden md:block" size={24} />
            <NodeBox title="Narrator" desc="Produces final user-facing answers" icon={<MessageSquare size={18}/>} color="rose" />
          </div>
        </div>

        <ArrowDown className="text-slate-500 mb-8 animate-bounce" size={24} />

        {/* Data & Adapters */}
        <div className="w-full flex gap-8 flex-wrap justify-center">
          <div className="flex-1 min-w-[300px] bg-aether-900/50 p-6 rounded-2xl border border-slate-700">
            <h3 className="text-slate-400 font-mono mb-6 flex items-center gap-2">
              <Server size={16}/> Adapter Layer
            </h3>
            <div className="flex gap-4 justify-center">
              <NodeBox title="AIProvider" desc="Ollama / Mock / Gemini Adapters" icon={<Cpu size={18}/>} color="slate" />
            </div>
          </div>
          <div className="flex-1 min-w-[300px] bg-aether-900/50 p-6 rounded-2xl border border-slate-700">
            <h3 className="text-slate-400 font-mono mb-6 flex items-center gap-2">
              <Database size={16}/> Data Layer
            </h3>
            <div className="flex gap-4 justify-center">
              <NodeBox title="MongoDB" desc="Persistent memory & embeddings" icon={<Database size={18}/>} color="slate" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
