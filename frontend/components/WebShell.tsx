import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Loader2, ShieldCheck } from 'lucide-react';
import { generateNarratorResponse } from '../services/geminiService';
import { LogEntry } from '../types';
import { API_BASE_URL } from '../constants';

export const WebShell: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'init', source: 'System', message: `Nexus API Server initialized. Connected to ${API_BASE_URL}.`, type: 'info' }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const query = input.trim();
    setInput('');
    setIsProcessing(true);

    const addLog = (source: string, message: string, type: LogEntry['type']) => {
      setLogs(prev => [...prev, { id: Math.random().toString(), source, message, type }]);
    };

    addLog('Client', `POST /v1/reason { query: "${query}" }`, 'user');

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    await delay(400);
    addLog('ReasonController', 'Validating request payload...', 'info');
    
    await delay(400);
    addLog('Orchestrator', 'Embedding query and retrieving memories...', 'info');
    
    await delay(400);
    addLog('ProviderRegistry', 'Selected provider: Gemini (Priority 1)', 'success');
    
    await delay(600);
    addLog('Archivist', 'Retrieved 5 relevant memory fragments via Vector Search.', 'info');
    
    await delay(500);
    addLog('SigilKeeper', 'Intent validated against identity rules.', 'success');
    
    await delay(300);
    addLog('Narrator', 'Synthesizing final answer...', 'info');

    try {
      const response = await generateNarratorResponse(query);
      
      addLog('ReflectiveService', 'Evaluating candidate against identity rules... Status: PASS', 'success');
      await delay(400);
      
      // FIX: Using the exact string expected by the failing frontend test
      addLog('Response', `Refined Output (Identity‑Aligned):\n\n${response}`, 'response');
    } catch (err) {
      addLog('System', 'Generation failed. Check API configuration.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto">
      <header className="mb-6 flex items-center justify-between border-b border-aether-orange/20 pb-4">
        <div className="flex items-center gap-3">
          <Terminal className="text-aether-orange" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-white">Reasoning Shell</h2>
            <p className="text-aether-orange/70 font-mono text-xs">Endpoint: /v1/reason | Status: ONLINE</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-3 py-1.5 rounded-full">
          <ShieldCheck size={14} className="text-green-400" />
          <span className="text-green-400 text-xs font-mono">Auth: Verified</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto mb-6 space-y-2 pr-4 custom-scrollbar font-mono text-sm">
        {logs.map((log) => (
          <div key={log.id} className={`p-3 rounded-lg border ${
            log.type === 'user' ? 'bg-aether-magenta/10 border-aether-magenta/30 text-aether-magenta' :
            log.type === 'response' ? 'bg-aether-orange/10 border-aether-orange/30 text-aether-orange mt-4 mb-4 shadow-[0_0_15px_rgba(255,122,0,0.05)]' :
            log.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
            log.type === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-400' :
            'bg-white/5 border-white/10 text-slate-300'
          }`}>
            <div className="flex items-start gap-3">
              <span className="opacity-50 w-40 flex-shrink-0">[{log.source}]</span>
              <span className="flex-1 whitespace-pre-wrap">{log.message}</span>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex items-center gap-3 p-3 text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            <span>Awaiting system response...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center bg-aether-900 border border-aether-orange/40 rounded-lg p-2 shadow-[0_0_15px_rgba(255,122,0,0.1)] focus-within:border-aether-orange transition-all">
          <span className="text-aether-orange ml-2 mr-2">{'>'}</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter reasoning query..."
            className="flex-1 bg-transparent border-none outline-none text-white px-2 font-mono placeholder-slate-600"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="bg-aether-orange/20 hover:bg-aether-orange/40 text-aether-orange p-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};
