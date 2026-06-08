'use client';

import { ReactNode } from 'react';
import { IdentitySelector } from './IdentitySelector';

interface LayoutProps {
  children: ReactNode;
  selectedIdentity?: string;
  onIdentityChange?: (value: string) => void;
}

export function Layout({ children, selectedIdentity = '', onIdentityChange }: LayoutProps) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: 'white',
          borderBottom: '2px solid #3498db',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.5em', fontWeight: 700, color: '#2c3e50' }}>
            ⚡ Aetherium
          </span>
          <span style={{ color: '#D9C27A', fontSize: '1.2em', fontWeight: 300 }}>×</span>
          <span style={{ fontSize: '1em', fontWeight: 500, color: '#6b7280', letterSpacing: '0.02em' }}>
            MIII-AIM
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <NavLink href="/">Home</NavLink>
          <NavLink href="/identity/register">Register Identity</NavLink>
          <NavLink href="/memory">Memory</NavLink>
          <NavLink href="/agents">Agents</NavLink>
          <NavLink href="/governance">Governance</NavLink>
        </nav>

        {/* Identity Selector */}
        {onIdentityChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.9em', color: '#7f8c8d', fontWeight: 500 }}>
              Active Identity:
            </span>
            <IdentitySelector value={selectedIdentity} onChange={onIdentityChange} />
          </div>
        )}
      </header>

      {/* Main Content */}
      <main
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '20px',
        }}
      >
        {children}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid #e5e7eb',
          padding: '12px 24px',
          textAlign: 'center',
          fontSize: '0.8em',
          color: '#9ca3af',
        }}
      >
        <span style={{ color: '#D9C27A' }}>⊹</span>{' '}
        Powered by MIII-AIM Engine
      </footer>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      style={{
        color: '#2c3e50',
        textDecoration: 'none',
        fontWeight: 500,
        fontSize: '0.95em',
        padding: '8px 12px',
        borderRadius: '4px',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={(e) => {
        (e.target as HTMLElement).style.backgroundColor = '#ecf0f1';
      }}
      onMouseLeave={(e) => {
        (e.target as HTMLElement).style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </a>
  );
}
