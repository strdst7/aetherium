import { GoogleGenAI, Chat } from '@google/genai';
import { SYSTEM_INSTRUCTION } from '../constants';

let aiInstance: GoogleGenAI | null = null;

export const getGenAI = (): GoogleGenAI => {
  if (!aiInstance) {
    // The prompt guarantees process.env.API_KEY is available in the execution context.
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });
  }
  return aiInstance;
};

export const createOracleChat = (): Chat => {
  const ai = getGenAI();
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
  });
};
