import React, { useState } from 'react';
import { Sidebar } from './components/sidebar';
import { WebShell } from './components/web-shell';
import { AgentsUI } from './components/agents-ui';
import { MemoryViz } from './components/memory-viz';
import { Governance } from './components/governance';
import { LandingPage } from './components/landing-page';
import { Dashboard } from './components/Dashboard';
import { TabType } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('landing');

  if (activeTab === 'landing') {
    return <LandingPage onLaunch={() => setActiveTab('dashboard')} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'shell':
        return <WebShell />;
      case 'agents':
        return <AgentsUI />;
      case 'memory':
        return <MemoryViz />;
      case 'governance':
        return <Governance />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-aether-900 overflow-hidden relative text-slate-200">
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-aether-neon/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-aether-orange/10 blur-[120px] rounded-full pointer-events-none"></div>
      
      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] pointer-events-none opacity-30"></div>

      {/* Sidebar */}
      <div className="z-10 h-full">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 h-full overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
