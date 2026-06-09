export interface NetworkMetric {
  time: string;
  flux: number;
  coherence: number;
  latency: number;
}

export interface NodeStatus {
  id: string;
  location: string;
  status: 'optimal' | 'warning' | 'critical';
  uptime: string;
  load: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export type TabType = 'dashboard' | 'nodes' | 'oracle';
