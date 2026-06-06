'use client';

import { useState } from 'react';
import { registerIdentity } from '../src/lib/api-client';
import { SigilIdentity, IdentityCreateRequest } from '../src/types/api';

interface IdentityFormProps {
  onSuccess?: (identity: SigilIdentity) => void;
}

export function IdentityForm({ onSuccess }: IdentityFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    developerId: '',
    voice: '',
    constraints: '',
    mythicSignature: '',
    allowedBehaviors: '',
    forbiddenBehaviors: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [createdIdentity, setCreatedIdentity] = useState<SigilIdentity | null>(null);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user types
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});
    setCreatedIdentity(null);

    // Client-side validation
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.developerId.trim()) errors.developerId = 'Developer ID is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      // Build custom rules from form fields
      const customRules: string[] = [];
      if (formData.voice.trim()) customRules.push(`voice: ${formData.voice.trim()}`);
      if (formData.constraints.trim()) customRules.push(`constraints: ${formData.constraints.trim()}`);
      if (formData.mythicSignature.trim()) customRules.push(`mythic: ${formData.mythicSignature.trim()}`);
      if (formData.allowedBehaviors.trim()) {
        formData.allowedBehaviors.split('\n').forEach((b) => {
          if (b.trim()) customRules.push(`must contain: ${b.trim()}`);
        });
      }
      if (formData.forbiddenBehaviors.trim()) {
        formData.forbiddenBehaviors.split('\n').forEach((b) => {
          if (b.trim()) customRules.push(`must not contain: ${b.trim()}`);
        });
      }

      const payload: IdentityCreateRequest = {
        name: formData.name.trim(),
        developerId: formData.developerId.trim(),
        config: {
          customRules,
        },
      };

      const identity = await registerIdentity(payload);
      setCreatedIdentity(identity);
      onSuccess?.(identity);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {createdIdentity && (
        <div
          style={{
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '4px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <h3 style={{ color: '#155724', margin: '0 0 8px 0' }}>✅ Identity Created</h3>
          <p style={{ margin: '4px 0', color: '#155724' }}>
            <strong>ID:</strong> <code>{createdIdentity.id}</code>
          </p>
          <p style={{ margin: '4px 0', color: '#155724' }}>
            <strong>Sigil Hash:</strong> <code>{createdIdentity.sigilHash}</code>
          </p>
          <p style={{ margin: '4px 0', color: '#155724' }}>
            <strong>Version:</strong> {createdIdentity.version}
          </p>
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <p style={{ color: '#721c24', margin: 0 }}>❌ {error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
        <FormField
          label="Name *"
          name="name"
          value={formData.name}
          onChange={(v) => handleChange('name', v)}
          error={fieldErrors.name}
          placeholder="e.g., Halo Arc Scholar"
        />

        <FormField
          label="Developer ID *"
          name="developerId"
          value={formData.developerId}
          onChange={(v) => handleChange('developerId', v)}
          error={fieldErrors.developerId}
          placeholder="e.g., dev_123"
        />

        <FormField
          label="Voice"
          name="voice"
          value={formData.voice}
          onChange={(v) => handleChange('voice', v)}
          placeholder="e.g., formal, authoritative, poetic"
          textarea
        />

        <FormField
          label="Constraints"
          name="constraints"
          value={formData.constraints}
          onChange={(v) => handleChange('constraints', v)}
          placeholder="e.g., must contain: sacred geometry; must not contain: casual"
          textarea
        />

        <FormField
          label="Mythic Signature"
          name="mythicSignature"
          value={formData.mythicSignature}
          onChange={(v) => handleChange('mythicSignature', v)}
          placeholder="e.g., golden_ratio, sacred_geometry"
        />

        <FormField
          label="Allowed Behaviors"
          name="allowedBehaviors"
          value={formData.allowedBehaviors}
          onChange={(v) => handleChange('allowedBehaviors', v)}
          placeholder="One per line. e.g., sacred geometry\ndivine proportion"
          textarea
        />

        <FormField
          label="Forbidden Behaviors"
          name="forbiddenBehaviors"
          value={formData.forbiddenBehaviors}
          onChange={(v) => handleChange('forbiddenBehaviors', v)}
          placeholder="One per line. e.g., casual language\nmodern slang"
          textarea
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 20px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1.05em',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {loading ? '⏳ Registering...' : '🚀 Register Identity'}
        </button>
      </form>
    </div>
  );
}

function FormField({
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
  textarea = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  textarea?: boolean;
}) {
  const inputStyle: React.CSSProperties = {
    padding: '10px',
    border: error ? '1px solid #e74c3c' : '1px solid #bdc3c7',
    borderRadius: '4px',
    fontSize: '1em',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  };

  const inputId = `field-${name}`;

  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      <label htmlFor={inputId} style={{ fontWeight: 600, color: '#2c3e50' }}>{label}</label>
      {textarea ? (
        <textarea
          id={inputId}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={inputStyle}
        />
      ) : (
        <input
          id={inputId}
          type="text"
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
        />
      )}
      {error && <span style={{ color: '#e74c3c', fontSize: '0.85em' }}>{error}</span>}
    </div>
  );
}
