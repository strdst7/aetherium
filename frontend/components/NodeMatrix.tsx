import React from 'react';
import { Server, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { MOCK_NODES } from '../constants';

export const NodeMatrix: React.FC = () => {
  return (
    <div className="p-8 h-full overflow-y-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Node Matrix</h2>
        <p className="text-slate-400 font-mono text-sm">Distributed quantum processing units status.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {MOCK_NODES.map((node) => (
          <div key={node.id} className="bg-aether-800/50 border border-aether-cyan/20 rounded-xl p-6 backdrop-blur-sm hover:border-aether-cyan/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <Server className="text-slate-400" size={24} />
                <div>
                  <h3 className="text-lg font-bold text-white font-mono">{node.id}</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">{node.location}</p>
                </div>
              </div>
              <StatusIcon status={node.status} />
            </div>
            
            <div className="space-y-4 mt-6">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Processing Load</span>
                  <span className="text-slate-200 font-mono">{node.load}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full ${node.load > 80 ? 'bg-aether-magenta' : node.load > 50 ? 'bg-yellow-400' : 'bg-aether-cyan'}`}
                    style={{ width: `${node.load}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="flex justify-between text-sm border-t border-white/5 pt-3">
                <span className="text-slate-400">Uptime</span>
                <span className="text-aether-cyan font-mono">{node.uptime}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'optimal':
      return <CheckCircle className="text-green-400" size={20} />;
    case 'warning':
      return <AlertTriangle className="text-yellow-400" size={20} />;
    case 'critical':
      return <XCircle className="text-aether-magenta animate-pulse" size={20} />;
    default:
      return null;
  }
};
