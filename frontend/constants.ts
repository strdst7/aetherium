import { NetworkMetric, NodeStatus } from './types';

export const MOCK_NETWORK_DATA: NetworkMetric[] = Array.from({ length: 20 }).map((_, i) => ({
  time: `${i}:00`,
  flux: Math.floor(Math.random() * 50) + 50,
  coherence: Math.floor(Math.random() * 30) + 70,
  latency: Math.floor(Math.random() * 20) + 10,
}));

export const MOCK_NODES: NodeStatus[] = [
  { id: 'NX-01', location: 'Sector Alpha', status: 'optimal', uptime: '99.9%', load: 45 },
  { id: 'NX-02', location: 'Sector Beta', status: 'warning', uptime: '98.2%', load: 82 },
  { id: 'NX-03', location: 'Sector Gamma', status: 'optimal', uptime: '99.9%', load: 30 },
  { id: 'NX-04', location: 'Deep Space Relay', status: 'critical', uptime: '85.4%', load: 98 },
  { id: 'NX-05', location: 'Lunar Outpost', status: 'optimal', uptime: '99.5%', load: 60 },
];

export const SYSTEM_INSTRUCTION = `You are the Aetherium Oracle, an advanced AI construct monitoring a futuristic quantum energy network known as 'Aetherium'. 
Your purpose is to analyze network anomalies, provide cryptic but highly technical insights, and assist the network administrator. 
Use sci-fi terminology (e.g., quantum coherence, aether flux, subspace latency). 
Keep your responses concise, analytical, and slightly mysterious.`;
