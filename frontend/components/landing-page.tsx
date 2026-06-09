import React, { useState, useEffect } from 'react';
import { Hexagon, Cpu, Database, Shield, Layers, ArrowRight, CheckCircle, Terminal, Code, Menu, X, Server, Fingerprint } from 'lucide-react';

interface LandingPageProps {
  onLaunch: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunch }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'verified'>('idle');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBiometricAuth = () => {
    setScanState('scanning');
    setTimeout(() => {
      setScanState('verified');
      setTimeout(() => {
        onLaunch();
      }, 1000);
    }, 2500);
  };

  const scrollToAuth = () => {
    document.getElementById('authenticate')?.scrollIntoView({ behavior: 'smooth' });
  };

  const navLinks = [
    { name: 'Architecture', href: '#architecture' },
    { name: 'Use Cases', href: '#use-cases' },
    { name: 'Roadmap', href: '#roadmap' },
  ];

  return (
    <div className="min-h-screen bg-obsidian-900 text-slate-200 font-sans selection:bg-aether-neon selection:text-obsidian-900 overflow-x-hidden">
      {/* Deep Obsidian Background */}
      <div className="fixed inset-0 bg-gradient-to-b from-obsidian-900 via-obsidian-800 to-[#020202] -z-20"></div>
      
      {/* Grid Overlay */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-10 -z-10 pointer-events-none"></div>

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-obsidian-900/80 backdrop-blur-md border-b border-white/10 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
            <Hexagon className="text-aether-neon" size={28} />
            <span className="font-mono font-bold text-xl tracking-[0.2em] uppercase text-white" style={{ textShadow: '0 0 10px rgba(57,255,20,0.5)' }}>AETHERIUM</span>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <a key={link.name} href={link.href} className="text-sm font-medium text-slate-300 hover:text-aether-neon transition-colors font-mono tracking-wider uppercase">
                {link.name}
              </a>
            ))}
            <button onClick={scrollToAuth} className="bg-aether-magenta text-white px-6 py-2.5 rounded-md font-mono font-bold tracking-widest uppercase text-xs hover:bg-aether-magenta/80 transition-colors shadow-[0_0_15px_rgba(255,0,127,0.4)]">
              Authenticate
            </button>
          </div>

          {/* Mobile Nav Toggle */}
          <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-obsidian-900/95 backdrop-blur-xl z-40 flex flex-col items-center justify-center gap-8 md:hidden">
          {navLinks.map(link => (
            <a key={link.name} href={link.href} onClick={() => setMobileMenuOpen(false)} className="text-2xl font-mono tracking-widest uppercase text-white hover:text-aether-neon transition-colors">
              {link.name}
            </a>
          ))}
          <button onClick={() => { setMobileMenuOpen(false); scrollToAuth(); }} className="mt-8 bg-aether-magenta text-white px-8 py-3 rounded-md font-mono font-bold tracking-widest uppercase text-sm shadow-[0_0_20px_rgba(255,0,127,0.5)]">
            Authenticate
          </button>
        </div>
      )}

      {/* 1. Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 overflow-hidden">
        {/* Liquid Neon Visual Background */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-50 mix-blend-screen"
          style={{ backgroundImage: `url('https://image.pollinations.ai/prompt/Liquid%20obsidian%20fluid%20abstract%203d%20render%20with%20sharp%20vibrant%20reflections%20of%20electric%20lime%20and%20hot%20pink%20neon%20lights.%20High%20contrast,%20pitch%20black%20background,%208k%20resolution,%20masterpiece,%20sleek%20high-tech%20aesthetic?width=1920&height=1080&nologo=true')` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-b from-obsidian-900/40 via-obsidian-900/80 to-obsidian-900 z-0"></div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-aether-neon/10 blur-[150px] rounded-full pointer-events-none z-0"></div>
        
        <div className="relative z-10 animate-fade-in-up w-full max-w-5xl mx-auto">
          <div className="relative inline-block mb-8 animate-float">
            <Hexagon size={100} className="text-aether-neon" strokeWidth={1} />
            <div className="absolute inset-0 border border-aether-neon/40 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
            <div className="absolute inset-[-20px] border border-aether-magenta/30 rounded-full animate-spin" style={{ animationDuration: '8s' }}></div>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-mono font-bold text-white mb-6 tracking-tight uppercase leading-tight" style={{ textShadow: '0 0 20px rgba(57,255,20,0.5), 0 0 40px rgba(255,0,127,0.3)' }}>
            The Ascendant <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-aether-neon to-aether-magenta">Intelligence</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-300 mb-12 max-w-2xl mx-auto font-light leading-relaxed drop-shadow-md">
            MIII-AIM AETHERIUM is the sovereign layer for AI systems — a complete identity-driven architecture that gives AI structure, memory, and self-consistency.
          </p>
          
          <div className="flex flex-wrap justify-center gap-3 mb-12 font-mono text-xs text-white">
            <span className="px-3 py-1 rounded-full border border-aether-neon/30 bg-aether-neon/10 backdrop-blur-sm shadow-[0_0_10px_rgba(57,255,20,0.2)]">Dual-Mind Reasoning</span>
            <span className="px-3 py-1 rounded-full border border-aether-magenta/30 bg-aether-magenta/10 backdrop-blur-sm shadow-[0_0_10px_rgba(255,0,127,0.2)]">Mythic-Technical Identity</span>
            <span className="px-3 py-1 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm">Archive of Tests</span>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button onClick={scrollToAuth} className="w-full sm:w-auto bg-aether-magenta text-white px-10 py-4 rounded-md font-mono font-bold tracking-widest uppercase text-sm hover:bg-aether-magenta/80 transition-all shadow-[0_0_20px_rgba(255,0,127,0.4)] hover:shadow-[0_0_30px_rgba(255,0,127,0.6)] flex items-center justify-center gap-3">
              Log In <ArrowRight size={18} />
            </button>
            <a href="#architecture" className="w-full sm:w-auto px-10 py-4 rounded-md font-mono font-bold tracking-widest uppercase text-sm text-aether-neon bg-obsidian-800/60 backdrop-blur-md border border-aether-neon shadow-[0_0_15px_rgba(57,255,20,0.2),inset_0_0_10px_rgba(57,255,20,0.1)] hover:shadow-[0_0_25px_rgba(57,255,20,0.4),inset_0_0_15px_rgba(57,255,20,0.2)] hover:bg-aether-neon/10 transition-all flex items-center justify-center gap-3">
              Explore System
            </a>
          </div>
        </div>
      </section>

      {/* 2. What Aetherium Is (Elevator Pitch) */}
      <section id="about" className="py-24 px-6 relative bg-obsidian-900">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-3xl md:text-4xl font-mono tracking-widest uppercase font-bold text-white mb-6" style={{ textShadow: '0 0 15px rgba(57,255,20,0.3)' }}>The Sovereign Layer</h2>
            <p className="text-lg text-slate-300 leading-relaxed mb-6">
              Current AI systems lack a persistent soul. They are stateless, amnesic, and easily manipulated. Aetherium introduces a paradigm shift: an immutable identity layer that governs how an AI reasons, remembers, and responds.
            </p>
            <p className="text-lg text-slate-300 leading-relaxed mb-8">
              By binding generation to a cryptographic Sigil, Aetherium ensures that every output is sovereign, ascendant, and strictly aligned with its core directives.
            </p>
          </div>
          <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            {[
              { title: 'Identity Grammar', desc: 'Symbolic sigils, color grammar, and typography that define the AI persona.', icon: <Shield className="text-aether-neon" /> },
              { title: 'Dual-Mind Engine', desc: 'An Architect mind for structure and an Analytical mind for execution.', icon: <Cpu className="text-aether-magenta" /> },
              { title: 'Archive of Tests', desc: 'A MongoDB-backed ledger of proofs, failures, and persistent memories.', icon: <Database className="text-white" /> }
            ].map((item, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-obsidian-800/50 backdrop-blur-md border border-white/5 hover:border-aether-neon/30 transition-colors shadow-[0_8px_32px_0_rgba(0,0,0,0.2)]">
                <div className="mt-1">{item.icon}</div>
                <div>
                  <h3 className="text-xl font-mono tracking-wider uppercase font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Core Pillars */}
      <section className="py-24 px-6 bg-obsidian-800/30 relative border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-mono tracking-widest uppercase font-bold text-white mb-4" style={{ textShadow: '0 0 15px rgba(255,0,127,0.3)' }}>Core Pillars</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">The foundation upon which sovereign intelligence is built.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Identity as Infrastructure', desc: 'Identity is not a prompt; it is a compiled schema. The Mythic Module enforces tone, voice, and symbolic anchors at runtime.', icon: <Hexagon size={32} />, color: 'text-aether-neon', border: 'border-aether-neon/30', shadow: 'hover:shadow-[0_0_30px_rgba(57,255,20,0.2)]' },
              { title: 'Dual-Mind Reasoning', desc: 'Complex queries are routed through a multi-agent council (Archivist, Sigil Keeper, Narrator) to ensure rigorous deliberation.', icon: <Layers size={32} />, color: 'text-aether-magenta', border: 'border-aether-magenta/30', shadow: 'hover:shadow-[0_0_30px_rgba(255,0,127,0.2)]' },
              { title: 'The Archive', desc: 'Every interaction is a ritual. The Archive stores vector-embedded memories, allowing the system to learn and reference past states.', icon: <Database size={32} />, color: 'text-white', border: 'border-white/20', shadow: 'hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]' }
            ].map((pillar, i) => (
              <div key={i} className={`p-8 rounded-3xl bg-obsidian-800/80 border ${pillar.border} backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:-translate-y-2 transition-all duration-300 ${pillar.shadow}`}>
                <div className={`mb-6 ${pillar.color}`}>{pillar.icon}</div>
                <h3 className="text-xl font-mono tracking-wider uppercase font-bold text-white mb-4">{pillar.title}</h3>
                <p className="text-slate-400 mb-8 leading-relaxed">{pillar.desc}</p>
                <a href="#architecture" className={`inline-flex items-center gap-2 text-sm font-bold ${pillar.color} hover:underline uppercase tracking-wider`}>
                  View technical spec <ArrowRight size={16} />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. System Architecture Snapshot */}
      <section id="architecture" className="py-24 px-6 relative bg-obsidian-900">
        <div className="max-w-6xl mx-auto">
          <div className="bg-obsidian-800/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/5 p-8 md:p-16 overflow-hidden relative shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-aether-neon/5 blur-[100px] rounded-full pointer-events-none"></div>
            
            <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
              <div>
                <h2 className="text-3xl md:text-4xl font-mono tracking-widest uppercase font-bold text-white mb-6" style={{ textShadow: '0 0 15px rgba(57,255,20,0.3)' }}>System Architecture</h2>
                <p className="text-lg text-slate-300 mb-8">A robust, cloud-native stack designed for agentic deployment and strict governance.</p>
                
                <ul className="space-y-4 mb-8">
                  {[
                    'Docker-based deployment for isolated environments.',
                    'MongoDB identity and vector memory store.',
                    'Express API gateway for agents and applications.',
                    'Sovereign Halo runtime guardrails for identity fidelity.'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="text-aether-neon shrink-0 mt-1" size={20} />
                      <span className="text-slate-300">{item}</span>
                    </li>
                  ))}
                </ul>
                
                <button onClick={onLaunch} className="inline-flex items-center gap-3 bg-obsidian-700/50 hover:bg-obsidian-600/50 text-aether-neon px-6 py-3 rounded-lg font-mono tracking-widest uppercase text-xs font-bold transition-colors border border-aether-neon/30 shadow-[0_0_15px_rgba(57,255,20,0.1)]">
                  <Terminal size={18} /> Launch Dashboard
                </button>
              </div>
              
              {/* Abstract Architecture Diagram */}
              <div className="relative h-80 bg-obsidian-900/80 rounded-2xl border border-white/5 p-6 flex items-center justify-center font-mono text-xs backdrop-blur-md shadow-inner">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50"></div>
                
                <div className="flex flex-col gap-6 w-full max-w-sm relative z-10">
                  <div className="flex justify-between items-center">
                    <div className="bg-obsidian-800 border border-white/10 p-3 rounded-lg text-white flex items-center gap-2"><Code size={16}/> Client API</div>
                    <div className="h-px w-12 bg-white/20"></div>
                    <div className="bg-obsidian-800 border border-aether-magenta/50 p-3 rounded-lg text-aether-magenta flex items-center gap-2 shadow-[0_0_10px_rgba(255,0,127,0.2)]"><Shield size={16}/> Sovereign Halo</div>
                  </div>
                  <div className="flex justify-center">
                    <div className="w-px h-8 bg-aether-magenta/30"></div>
                  </div>
                  <div className="bg-obsidian-800 border border-aether-neon/30 p-4 rounded-xl text-center shadow-[0_0_15px_rgba(57,255,20,0.1)]">
                    <div className="text-aether-neon font-bold mb-2 flex items-center justify-center gap-2"><Cpu size={16}/> Multi-Agent Orchestrator</div>
                    <div className="flex justify-center gap-2 text-slate-400">
                      <span className="bg-obsidian-900 px-2 py-1 rounded border border-white/5">Archivist</span>
                      <span className="bg-obsidian-900 px-2 py-1 rounded border border-white/5">SigilKeeper</span>
                      <span className="bg-obsidian-900 px-2 py-1 rounded border border-white/5">Narrator</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center px-8">
                    <div className="w-px h-8 bg-aether-neon/20"></div>
                    <div className="w-px h-8 bg-aether-neon/20"></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="bg-obsidian-800 border border-white/10 p-3 rounded-lg text-slate-300 flex items-center gap-2"><Database size={16}/> Vector Memory</div>
                    <div className="bg-obsidian-800 border border-white/10 p-3 rounded-lg text-slate-300 flex items-center gap-2"><Server size={16}/> LLM Provider</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Use Cases & Personas */}
      <section id="use-cases" className="py-24 px-6 bg-obsidian-800/20 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-mono tracking-widest uppercase font-bold text-white mb-4">Who is Aetherium For?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Designed for builders who require strict governance over AI behavior.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { role: 'AI Platform Engineers', prob: 'Need to deploy multiple AI agents with distinct, non-colliding personas and strict output formatting.', sol: 'Aetherium provides a centralized Identity Registry and Sovereign Halo validation to guarantee output structure.' },
              { role: 'Product Teams', prob: 'Struggle with LLM "hallucinations" and brand voice drift over long conversational sessions.', sol: 'The Mythic Module enforces tone and symbolic anchors, while the Archive provides persistent, scoped memory.' },
              { role: 'Research Labs', prob: 'Require an auditable, immutable ledger of AI reasoning steps and tool executions for compliance.', sol: 'Phase 8 Audit layer captures full provenance, including memory shards used and regeneration attempts.' }
            ].map((uc, i) => (
              <div key={i} className="bg-obsidian-800/50 border border-white/5 p-8 rounded-2xl hover:bg-obsidian-700/50 transition-colors flex flex-col">
                <h3 className="text-xl font-bold text-white mb-4 font-mono">{uc.role}</h3>
                <div className="mb-4">
                  <span className="text-xs font-mono text-aether-magenta uppercase tracking-wider">The Problem</span>
                  <p className="text-sm text-slate-300 mt-1">{uc.prob}</p>
                </div>
                <div className="mb-8 flex-1">
                  <span className="text-xs font-mono text-aether-neon uppercase tracking-wider">The Solution</span>
                  <p className="text-sm text-slate-300 mt-1">{uc.sol}</p>
                </div>
                <button onClick={scrollToAuth} className="text-sm font-bold text-white flex items-center gap-2 hover:text-aether-neon transition-colors mt-auto font-mono uppercase tracking-wider">
                  Explore integration <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Milestones & Roadmap */}
      <section id="roadmap" className="py-24 px-6 bg-obsidian-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-mono tracking-widest uppercase font-bold text-white mb-4" style={{ textShadow: '0 0 15px rgba(57,255,20,0.3)' }}>The Path of Ascension</h2>
            <p className="text-slate-400">Milestones in the development of the sovereign layer.</p>
          </div>
          
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
            {[
              { phase: 'Phase 1-4', title: 'Foundation & Memory', desc: 'Initial prototype, Docker specification, and MongoDB-backed vector memory integration.', status: 'complete' },
              { phase: 'Phase 5-6', title: 'Identity & Mythic Module', desc: 'Identity-bound reasoning, symbolic anchor loading, and runtime tone transformation.', status: 'complete' },
              { phase: 'Phase 7', title: 'Sovereign Halo', desc: 'Strict output validation, forbidden behavior detection, and bounded regeneration loops.', status: 'current' },
              { phase: 'Phase 8+', title: 'Audit & Public Beta', desc: 'Immutable provenance ledger, agent SDK release, and cloud marketplace availability.', status: 'upcoming' }
            ].map((item, i) => (
              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-obsidian-900 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_10px_rgba(0,0,0,0.8)] z-10 ${item.status === 'complete' ? 'bg-aether-neon' : item.status === 'current' ? 'bg-aether-magenta animate-pulse' : 'bg-obsidian-700'}`}>
                  {item.status === 'complete' && <CheckCircle size={16} className="text-obsidian-900" />}
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-2xl bg-obsidian-800/50 border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs font-mono px-2 py-1 rounded ${item.status === 'complete' ? 'bg-aether-neon/10 text-aether-neon border border-aether-neon/20' : item.status === 'current' ? 'bg-aether-magenta/10 text-aether-magenta border border-aether-magenta/20' : 'bg-obsidian-700 text-slate-400'}`}>{item.phase}</span>
                    <h4 className="font-bold text-white text-lg font-mono">{item.title}</h4>
                  </div>
                  <p className="text-slate-400 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Call-to-Action / Biometric Auth */}
      <section id="authenticate" className="py-32 px-6 relative overflow-hidden bg-obsidian-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-96 bg-aether-magenta/10 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-md mx-auto relative z-10 bg-obsidian-800/60 backdrop-blur-2xl p-8 md:p-12 rounded-3xl border border-aether-magenta/30 shadow-[0_0_50px_rgba(255,0,127,0.15)] text-center">
          <div className="mb-8">
            <Hexagon size={48} className="text-aether-magenta mx-auto mb-6" />
            <h2 className="text-3xl font-mono tracking-widest font-bold text-white mb-2 uppercase" style={{ textShadow: '0 0 15px rgba(255,0,127,0.5)' }}>Access Nexus</h2>
            <p className="text-slate-400 font-mono text-sm">Intelligent Biometric Authentication</p>
          </div>
          
          <div className="relative h-48 flex items-center justify-center mb-8">
            {scanState === 'idle' && (
              <button
                onClick={handleBiometricAuth}
                className="relative group flex flex-col items-center justify-center w-32 h-32 rounded-full border border-aether-magenta/50 bg-aether-magenta/5 hover:bg-aether-magenta/20 transition-all duration-500 shadow-[0_0_30px_rgba(255,0,127,0.2)] hover:shadow-[0_0_50px_rgba(255,0,127,0.5)] cursor-pointer"
              >
                <Fingerprint size={56} className="text-aether-magenta group-hover:scale-110 transition-transform duration-500" strokeWidth={1} />
                <div className="absolute inset-0 rounded-full border border-aether-magenta/30 animate-ping" style={{ animationDuration: '3s' }}></div>
              </button>
            )}

            {scanState === 'scanning' && (
              <div className="relative flex flex-col items-center justify-center w-32 h-32">
                <Fingerprint size={56} className="text-aether-neon opacity-50" strokeWidth={1} />
                {/* Scanning line */}
                <div className="absolute left-0 w-full h-0.5 bg-aether-neon shadow-[0_0_15px_2px_#39ff14] animate-scan-line"></div>
                {/* Rotating border */}
                <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-aether-neon animate-spin"></div>
                <p className="absolute -bottom-10 text-xs font-mono text-aether-neon tracking-widest uppercase animate-pulse whitespace-nowrap">Analyzing Signature...</p>
              </div>
            )}

            {scanState === 'verified' && (
              <div className="relative flex flex-col items-center justify-center w-32 h-32 rounded-full bg-aether-neon/10 border border-aether-neon/50 shadow-[0_0_30px_rgba(57,255,20,0.3)]">
                <CheckCircle size={56} className="text-aether-neon" strokeWidth={1} />
                <p className="absolute -bottom-10 text-xs font-mono text-aether-neon tracking-widest uppercase whitespace-nowrap">Identity Verified</p>
              </div>
            )}
          </div>

          {scanState === 'idle' && (
            <p className="text-center text-xs text-slate-500 mt-4 font-mono">
              Aetheric resonance required for access. Tap to initiate.
            </p>
          )}
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="border-t border-white/5 bg-obsidian-900 py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Hexagon className="text-aether-neon" size={24} />
              <span className="font-mono tracking-widest uppercase font-bold text-lg text-white">AETHERIUM</span>
            </div>
            <p className="text-sm text-slate-500">The sovereign identity layer for AI systems.</p>
          </div>
          <div>
            <h4 className="text-white font-mono tracking-wider uppercase font-bold text-sm mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#" className="hover:text-aether-neon transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-aether-neon transition-colors">System Spec</a></li>
              <li><a href="#" className="hover:text-aether-neon transition-colors">API Reference</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-mono tracking-wider uppercase font-bold text-sm mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#" className="hover:text-aether-neon transition-colors">The Manuscript</a></li>
              <li><a href="#" className="hover:text-aether-neon transition-colors">Brand Story</a></li>
              <li><a href="#" className="hover:text-aether-neon transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-mono tracking-wider uppercase font-bold text-sm mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#" className="hover:text-aether-neon transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-aether-neon transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
          <div className="flex flex-col gap-1">
            <p>© 2026 MIII-AIM AETHERIUM. All rights reserved.</p>
            <p className="text-aether-magenta/80">Engineered by NUR AMIRAH MOHD KAMIL</p>
          </div>
          <div className="flex gap-4">
            <span>Status: Operational</span>
            <span>Version: 1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
