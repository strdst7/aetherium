import { GoogleGenAI } from '@google/genai';
import { SYSTEM_INSTRUCTION } from '../constants';

// Module-level mutable state uses SCREAMING_SNAKE_CASE
let AI_INSTANCE: GoogleGenAI | null = null;

export const getGenAI = (): GoogleGenAI => {
  if (!AI_INSTANCE) {
    console.log('🚀 Initializing Gemini API client...');
    AI_INSTANCE = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });
  }
  return AI_INSTANCE;
};

export const generateNarratorResponse = async (prompt: string): Promise<string> => {
  try {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });
    console.log('✅ Successfully generated response from Gemini.');
    return response.text || 'Error generating response.';
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error(`❌ Gemini API Error: ${message}`);
    throw new Error(`Gemini API Error: ${message}`);
  }
};
