import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Terminal } from 'lucide-react';
import { Chat } from '@google/genai';
import { createOracleChat } from '../services/geminiService';
import { ChatMessage } from '../types';

export const OracleChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: "Connection established. I am the Aetherium Oracle. State your query regarding the network's quantum state.",
      timestamp: Date.now(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      chatRef.current = createOracleChat();
    } catch (err) {
      console.error("Failed to initialize Oracle:", err);
      setError("Failed to initialize AI core. Check API configuration.");
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !chatRef.current || isTyping) return;

    const userText = input.trim();
    setInput('');
    setError(null);
    
    setMessages(prev => [...prev, { role: 'user', text: userText, timestamp: Date.now() }]);
    setIsTyping(true);

    try {
      // Add a placeholder for the model's response
      setMessages(prev => [...prev, { role: 'model', text: '', timestamp: Date.now() }]);
      
      const responseStream = await chatRef.current.sendMessageStream({ message: userText });
      
      for await (const chunk of responseStream) {
        if (chunk.text) {
          setMessages(prev => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              text: newMessages[lastIndex].text + chunk.text
            };
            return newMessages;
          });
        }
      }
    } catch (err) {
      console.error("Oracle communication error:", err);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        newMessages[lastIndex] = {
          ...newMessages[lastIndex],
          text: "CRITICAL ERROR: Subspace communication link severed. Unable to process query."
        };
        return newMessages;
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto">
      <header className="mb-6 flex items-center gap-3 border-b border-aether-cyan/20 pb-4">
        <Terminal className="text-aether-cyan" size={28} />
        <div>
          <h2 className="text-2xl font-bold text-white">Oracle Interface</h2>
          <p className="text-aether-cyan/70 font-mono text-xs">Secure Quantum Channel: ACTIVE</p>
        </div>
      </header>

      {error && (
        <div className="bg-aether-magenta/20 border border-aether-magenta text-white p-4 rounded-lg mb-4 font-mono text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto mb-6 space-y-6 pr-4 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${
              msg.role === 'user' 
                ? 'bg-aether-purple/20 border-aether-purple text-aether-purple' 
                : 'bg-aether-cyan/20 border-aether-cyan text-aether-cyan shadow-[0_0_10px_rgba(0,240,255,0.3)]'
            }`}>
              {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
            </div>
            
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.role === 'user'
                ? 'bg-aether-purple/10 border border-aether-purple/30 text-slate-200 rounded-tr-none'
                : 'bg-aether-800/80 border border-aether-cyan/30 text-aether-cyan/90 rounded-tl-none font-mono text-sm leading-relaxed shadow-[inset_0_0_20px_rgba(0,240,255,0.05)]'
            }`}>
              {/* Simple markdown-like rendering for bold text if needed, but keeping it plain for safety */}
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-4 flex-row">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border bg-aether-cyan/20 border-aether-cyan text-aether-cyan">
              <Loader2 size={20} className="animate-spin" />
            </div>
            <div className="bg-aether-800/80 border border-aether-cyan/30 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-aether-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-aether-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-aether-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="relative">
        <div className="absolute inset-0 bg-aether-cyan/5 blur-xl rounded-full pointer-events-none"></div>
        <div className="relative flex items-center bg-aether-900 border border-aether-cyan/40 rounded-full p-2 shadow-[0_0_15px_rgba(0,240,255,0.1)] focus-within:shadow-[0_0_25px_rgba(0,240,255,0.2)] focus-within:border-aether-cyan transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Query the Oracle..."
            className="flex-1 bg-transparent border-none outline-none text-white px-4 font-mono placeholder-slate-500"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="bg-aether-cyan/20 hover:bg-aether-cyan/40 text-aether-cyan p-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};
