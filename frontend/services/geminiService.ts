import { GoogleGenAI } from '@google/genai';
import { SYSTEM_INSTRUCTION } from '../constants';

let aiInstance: GoogleGenAI | null = null;

export const getGenAI = (): GoogleGenAI => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });
  }
  return aiInstance;
};

export const generateNarratorResponse = async (prompt: string): Promise<string> => {
  const ai = getGenAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
  });
  return response.text || 'Error generating response.';
};
