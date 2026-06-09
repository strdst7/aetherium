export type TabType = 'landing' | 'dashboard' | 'shell' | 'agents' | 'memory' | 'governance';

export type LogType = 'info' | 'success' | 'warning' | 'error' | 'user' | 'response';

export type RuleStatus = 'active' | 'warning' | 'violated';

export interface LogEntry {
  id: string;
  source: string;
  message: string;
  type: LogType;
}

export interface MemoryPoint {
  id: string;
  x: number;
  y: number;
  z: number;
  content: string;
  cluster: string;
}

export interface SearchResult extends MemoryPoint {
  similarity: number;
}

export interface Rule {
  id: string;
  title: string;
  description: string;
  status: RuleStatus;
}

export interface NetworkMetric {
  time: string;
  flux: number;
  coherence: number;
  latency: number;
}
