import React, { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, FileText } from 'lucide-react';
import { Rule } from '../types';

export const Governance: React.FC = () => {
  const [rules] = useState<Rule[]>([
    { id: 'R-001', title: 'Identity Fidelity', description: 'All generated responses must align with the core persona of the Aetherium Oracle. Contradictions to established lore are strictly prohibited.', status: 'active' },
    { id: 'R-002', title: 'Sigil Geometry Compliance', description: 'Visual outputs and SVG generations must adhere to the strict geometric constraints defined in the design tokens.', status: 'active' },
    { id: 'R-003', title: 'Cross-Identity Memory Isolation', description: 'Archivist and MemoryService must strictly scope vector searches using the identityAnchor to prevent data leaks. (CR-01 Resolved)', status: 'active' },
    { id: 'R-004', title: 'Strict Rule Parsing', description: 'IdentityConstraintEngine must correctly parse multi-colon rules without truncation. (CR-02 Resolved)', status: 'active' },
    { id: 'R-005', title: 'True LLM Regeneration', description: 'MultiAgentOrchestrator must call the provider generate method with tightened constraints on validation failure. (CR-03 Resolved)', status: 'active' },
    { id: 'R-006', title: 'PII Log Redaction', description: 'Identity anchors and sensitive metadata must be redacted in console warnings and audit logs. (WR-01 Resolved)', status: 'active' },
    { id: 'R-007', title: 'Mythic Fallback', description: 'Default neutral identity must be used when no identity is specified to ensure zero-latency fallback.', status: 'active' },
    { id: 'R-008', title: 'Symbolic Anchor Sourcing', description: 'Symbolic anchors must be loaded dynamically from design/sigil/v1.json.', status: 'active' },
    { id: 'R-009', title: 'Mythic Latency Budget', description: 'Identity lookup and mythic generation must not exceed the 200ms overhead budget.', status: 'active' },
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
          <div className="bg-primary-800/50 border border-aether-orange/20 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-aether-orange/10 rounded-full border border-aether-orange/30">
                <Shield className="text-aether-orange" size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">System Integrity</h3>
                <p className="text-aether-orange font-mono text-sm">100% Compliant</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-slate-400 text-sm">Active Rules</span>
                <span className="text-white font-mono">142</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-slate-400 text-sm">Recent Violations</span>
                <span className="text-aether-orange font-mono">0</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-slate-400 text-sm">Last Audit</span>
                <span className="text-slate-200 font-mono">2026-06-06</span>
              </div>
            </div>
          </div>

          <div className="bg-primary-800/50 border border-aether-neon/20 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FileText size={18} className="text-aether-neon" />
              Audit Logs
            </h3>
            <div className="space-y-3 text-sm font-mono">
              <div className="text-slate-400"><span className="text-aether-orange">✅ [10:42:01]</span> Archivist: Memory search scoped to identity 'oracle_v1'</div>
              <div className="text-slate-400"><span className="text-aether-orange">✅ [10:45:12]</span> IdentityConstraintEngine: Parsed multi-colon rule successfully</div>
              <div className="text-slate-400"><span className="text-aether-orange">✅ [10:50:05]</span> MultiAgentOrchestrator: LLM regeneration triggered with tightened constraints</div>
              <div className="text-slate-400"><span className="text-aether-orange">✅ [10:51:30]</span> IdentityBindingService: Null identity cached with sentinel</div>
              <div className="text-slate-400"><span className="text-aether-orange">✅ [10:55:10]</span> MythicModule: Applied symbolic anchors to regenerated output</div>
            </div>
          </div>
        </div>

        {/* Right Column: Rules List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-bold text-white mb-4">Active Directives</h3>
          
          {rules.map((rule) => (
            <div 
              key={rule.id} 
              className={`bg-primary-800/30 border rounded-xl p-5 flex gap-4 transition-colors ${
                rule.status === 'active' ? 'border-aether-orange/20 hover:border-aether-orange/50' :
                rule.status === 'warning' ? 'border-aether-gold/30 hover:border-aether-gold/60' :
                'border-aether-neon/40 hover:border-aether-neon/70 bg-aether-neon/5'
              }`}
            >
              <div className="mt-1">
                {rule.status === 'active' && <ShieldCheck className="text-aether-orange" size={24} />}
                {rule.status === 'warning' && <AlertTriangle className="text-aether-gold" size={24} />}
                {rule.status === 'violated' && <ShieldAlert className="text-aether-neon animate-pulse" size={24} />}
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
