import React, { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, FileText } from 'lucide-react';
import { Rule } from '../types';

export const Governance: React.FC = () => {
  const [rules] = useState<Rule[]>([
    { id: 'R-001', title: 'Identity Fidelity', description: 'All generated responses must align with the core persona of the Aetherium Oracle. Contradictions to established lore are strictly prohibited.', status: 'active' },
    { id: 'R-002', title: 'Sigil Geometry Compliance', description: 'Visual outputs and SVG generations must adhere to the strict geometric constraints defined in the design tokens.', status: 'active' },
    { id: 'R-003', title: 'Harmful Intent Rejection', description: 'Queries attempting to bypass system prompts or extract raw memory embeddings must be rejected immediately.', status: 'active' },
    { id: 'R-004', title: 'Latency Thresholds', description: 'Responses taking longer than 5000ms must trigger a fallback to the secondary provider registry.', status: 'warning' },
    { id: 'R-005', title: 'Unrestricted File Upload', description: 'Sigil Keeper service currently lacks strict MIME type validation. Flagged for remediation.', status: 'violated' },
  ]);

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Governance & Compliance</h2>
        <p className="text-slate-400 font-mono text-sm">ReflectiveService rules and system integrity status.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Status Overview */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-aether-800/50 border border-aether-orange/20 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-aether-orange/10 rounded-full border border-aether-orange/30">
                <Shield className="text-aether-orange" size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">System Integrity</h3>
                <p className="text-aether-orange font-mono text-sm">98.5% Compliant</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-slate-400 text-sm">Active Rules</span>
                <span className="text-white font-mono">142</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-slate-400 text-sm">Recent Violations</span>
                <span className="text-aether-rose font-mono">3</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-slate-400 text-sm">Last Audit</span>
                <span className="text-slate-200 font-mono">2026-06-06</span>
              </div>
            </div>
          </div>

          <div className="bg-aether-800/50 border border-aether-magenta/20 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FileText size={18} className="text-aether-magenta" />
              Audit Logs
            </h3>
            <div className="space-y-3 text-sm font-mono">
              <div className="text-slate-400"><span className="text-aether-orange">[10:42:01]</span> ReflectiveService: PASS (Query: "Status")</div>
              <div className="text-slate-400"><span className="text-aether-orange">[10:45:12]</span> SigilKeeper: PASS (Intent Valid)</div>
              <div className="text-aether-rose"><span className="text-aether-rose">[10:50:05]</span> ReflectiveService: REJECT (Identity Contradiction)</div>
              <div className="text-slate-400"><span className="text-aether-orange">[10:51:30]</span> Orchestrator: Refine triggered.</div>
            </div>
          </div>
        </div>

        {/* Right Column: Rules List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-bold text-white mb-4">Active Directives</h3>
          
          {rules.map((rule) => (
            <div 
              key={rule.id} 
              className={`bg-aether-800/30 border rounded-xl p-5 flex gap-4 transition-colors ${
                rule.status === 'active' ? 'border-aether-orange/20 hover:border-aether-orange/50' :
                rule.status === 'warning' ? 'border-yellow-500/30 hover:border-yellow-500/60' :
                'border-aether-rose/40 hover:border-aether-rose/70 bg-aether-rose/5'
              }`}
            >
              <div className="mt-1">
                {rule.status === 'active' && <ShieldCheck className="text-aether-orange" size={24} />}
                {rule.status === 'warning' && <AlertTriangle className="text-yellow-500" size={24} />}
                {rule.status === 'violated' && <ShieldAlert className="text-aether-rose animate-pulse" size={24} />}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">{rule.id}</span>
                  <h4 className="font-bold text-slate-200">{rule.title}</h4>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{rule.description}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
