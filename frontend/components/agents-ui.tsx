import React from 'react';
import { Server, Cpu, Shield, Database, MessageSquare, Layers, Activity, ArrowDown, ArrowRight, ShieldCheck } from 'lucide-react';

interface NodeBoxProps {
  title: string;
  desc: string;
  color?: 'orange' | 'neon' | 'gold' | 'slate';
  icon: React.ReactNode;
}

const NodeBox: React.FC<NodeBoxProps> = ({ title, desc, color = 'orange', icon }) => {
  const colorClasses = {
    orange: 'border-aether-orange/50 bg-aether-orange/10 text-aether-orange shadow-[0_0_15px_rgba(255,140,0,0.1)]',
    neon: 'border-aether-neon/50 bg-aether-neon/10 text-aether-neon shadow-[0_0_15px_rgba(57,255,20,0.1)]',
    gold: 'border-aether-gold/50 bg-aether-gold/10 text-aether-gold shadow-[0_0_15px_rgba(255,183,0,0.1)]',
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
        <p className="text-slate-400 font-mono text-sm">Live visualization of the Nexus reasoning pipeline (Phase 6).</p>
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
        <div className="w-full mb-8 bg-primary-800/50 p-6 rounded-2xl border border-aether-orange/20">
          <h3 className="text-aether-orange font-mono mb-6 flex items-center gap-2">
            <Server size={16}/> API Layer (Express)
          </h3>
          <div className="flex gap-6 flex-wrap justify-center">
            <NodeBox title="ReasonController" desc="Handles /v1/reason, validates requests" icon={<Activity size={18}/>} color="orange" />
            <NodeBox title="MemoryController" desc="Exposes memory retrieval & trace" icon={<Database size={18}/>} color="orange" />
            <NodeBox title="FailoverController" desc="Simulates provider failures" icon={<Activity size={18}/>} color="orange" />
          </div>
        </div>

        <ArrowDown className="text-aether-neon mb-8 animate-bounce" size={24} />

        {/* Service Layer */}
        <div className="w-full mb-8 bg-primary-800/50 p-6 rounded-2xl border border-aether-neon/20">
          <h3 className="text-aether-neon font-mono mb-6 flex items-center gap-2">
            <Layers size={16}/> Service Layer
          </h3>
          <div className="flex gap-6 flex-wrap justify-center mb-6">
            <NodeBox title="Orchestrator" desc="Core reasoning engine & flow control" icon={<Cpu size={18}/>} color="neon" />
            <NodeBox title="MultiAgentOrchestrator" desc="Coordinates Archivist → SigilKeeper → Narrator" icon={<Cpu size={18}/>} color="neon" />
          </div>
          <div className="flex gap-6 flex-wrap justify-center mb-6">
            <NodeBox title="ProviderRegistry" desc="Singleton registry with priority failover" icon={<Server size={18}/>} color="neon" />
            <NodeBox title="ReflectiveService" desc="Identity compliance & governance gate" icon={<Shield size={18}/>} color="neon" />
            <NodeBox title="MemoryService" desc="Vector search & CRUD operations" icon={<Database size={18}/>} color="neon" />
          </div>
          <div className="flex gap-6 flex-wrap justify-center">
            <NodeBox title="IdentityConstraintEngine" desc="Evaluates outputs against parsed identity rules" icon={<Shield size={18}/>} color="neon" />
            <NodeBox title="MythicModule" desc="Shapes prompts & rewrites outputs with symbolic anchors" icon={<MessageSquare size={18}/>} color="neon" />
            <NodeBox title="SymbolicAnchorLoader" desc="Reads design/sigil/v1.json at runtime" icon={<Database size={18}/>} color="neon" />
            <NodeBox title="SovereignHalo" desc="Validates output and triggers true LLM regeneration" icon={<ShieldCheck size={18}/>} color="neon" />
          </div>
        </div>

        <ArrowDown className="text-aether-gold mb-8 animate-bounce" size={24} />

        {/* Agent Layer */}
        <div className="w-full mb-8 bg-primary-800/50 p-6 rounded-2xl border border-aether-gold/20">
          <h3 className="text-aether-gold font-mono mb-6 flex items-center gap-2">
            <Cpu size={16}/> Agent Layer (Council)
          </h3>
          <div className="flex gap-6 flex-wrap justify-center items-center">
            <NodeBox title="Archivist" desc="Retrieves identity-scoped memories" icon={<Database size={18}/>} color="gold" />
            <ArrowRight className="text-aether-gold hidden md:block" size={24} />
            <NodeBox title="SigilKeeper" desc="Enforces Sigil law & identity fidelity" icon={<Shield size={18}/>} color="gold" />
            <ArrowRight className="text-aether-gold hidden md:block" size={24} />
            <NodeBox title="Narrator" desc="Produces final user-facing answers" icon={<MessageSquare size={18}/>} color="gold" />
          </div>
        </div>

        <ArrowDown className="text-slate-500 mb-8 animate-bounce" size={24} />

        {/* Data & Adapters */}
        <div className="w-full flex gap-8 flex-wrap justify-center">
          <div className="flex-1 min-w-[300px] bg-primary-800/50 p-6 rounded-2xl border border-slate-700">
            <h3 className="text-slate-400 font-mono mb-6 flex items-center gap-2">
              <Server size={16}/> Adapter Layer
            </h3>
            <div className="flex gap-4 justify-center">
              <NodeBox title="AIProvider" desc="Ollama / Mock / Gemini Adapters" icon={<Cpu size={18}/>} color="slate" />
            </div>
          </div>
          <div className="flex-1 min-w-[300px] bg-primary-800/50 p-6 rounded-2xl border border-slate-700">
            <h3 className="text-slate-400 font-mono mb-6 flex items-center gap-2">
              <Database size={16}/> Data Layer
            </h3>
            <div className="flex gap-4 justify-center">
              <NodeBox title="MongoDB" desc="Persistent memory & embeddings" icon={<Database size={18}/>} color="slate" />
              <NodeBox title="MinIO" desc="S3-compatible object storage" icon={<Database size={18}/>} color="slate" />
              <NodeBox title="Redis" desc="Caching & session store" icon={<Database size={18}/>} color="slate" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
