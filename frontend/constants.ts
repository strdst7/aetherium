import { NetworkMetric } from './types';

export const SYSTEM_INSTRUCTION = `You are the Narrator agent in a multi-agent reasoning council.
Your role is to synthesize a final answer based on the user's query and the retrieved memories.
Maintain a highly technical, AI-like persona. Use terms like 'vector space', 'identity fidelity', and 'sigil compliance'.
Keep responses concise, analytical, and slightly mysterious.`;

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const MOCK_NETWORK_DATA: NetworkMetric[] = Array.from({ length: 20 }).map((_, i) => ({
  time: `${i}:00`,
  flux: Math.floor(Math.random() * 50) + 50,
  coherence: Math.floor(Math.random() * 30) + 70,
  latency: Math.floor(Math.random() * 20) + 10,
}));
