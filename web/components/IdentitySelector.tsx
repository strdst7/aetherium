'use client';

import { useState, useEffect } from 'react';
import { getIdentities } from '../src/lib/api-client';
import { SigilIdentity } from '../src/types/api';

interface IdentitySelectorProps {
  value?: string;
  selectedId?: string;
  onChange: (value: string) => void;
  identities?: SigilIdentity[];
  label?: string;
}

export function IdentitySelector({ value, selectedId, onChange, identities: externalIdentities, label }: IdentitySelectorProps) {
  const [internalIdentities, setInternalIdentities] = useState<SigilIdentity[]>([]);
  const [loading, setLoading] = useState(!externalIdentities);
  const [error, setError] = useState<string | null>(null);

  const currentValue = value ?? selectedId ?? '';

  useEffect(() => {
    if (externalIdentities) {
      setLoading(false);
      return;
    }

    async function loadIdentities() {
      try {
        const data = await getIdentities();
        setInternalIdentities(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load identities');
      } finally {
        setLoading(false);
      }
    }

    loadIdentities();
  }, [externalIdentities]);

  const identities = externalIdentities || internalIdentities;

  if (loading) {
    return <span style={{ color: '#7f8c8d', fontSize: '0.9em' }}>Loading identities...</span>;
  }

  if (error) {
    return <span style={{ color: '#e74c3c', fontSize: '0.9em' }}>Error: {error}</span>;
  }

  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontWeight: 600, color: '#2c3e50', marginBottom: '6px', fontSize: '0.9em' }}>
          {label}
        </label>
      )}
      <select
        value={currentValue}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '10px',
          border: '1px solid #bdc3c7',
          borderRadius: '4px',
          minWidth: '200px',
          fontSize: '1em',
          backgroundColor: 'white',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        <option value="">Select Identity...</option>
        {identities.map((identity) => (
          <option key={identity.id} value={identity.id}>
            {identity.name} (v{identity.version})
          </option>
        ))}
      </select>
    </div>
  );
}
