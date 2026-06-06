'use client';

import { useState } from 'react';
import { ReasoningTrace as TraceStep } from '../src/types/api';

interface ReasoningTraceProps {
  trace: TraceStep[];
}

export function ReasoningTrace({ trace }: ReasoningTraceProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!trace || trace.length === 0) {
    return <p style={{ color: '#7f8c8d', fontStyle: 'italic' }}>No trace available</p>;
  }

  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      {trace.map((step, index) => (
        <div
          key={index}
          style={{
            backgroundColor: 'white',
            border: '1px solid #ecf0f1',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '1em',
              fontWeight: 500,
              color: '#2c3e50',
              textAlign: 'left',
            }}
          >
            <span>
              <span
                style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#3498db',
                  color: 'white',
                  fontSize: '0.8em',
                  lineHeight: '24px',
                  textAlign: 'center',
                  marginRight: '10px',
                }}
              >
                {index + 1}
              </span>
              {step.stage}
            </span>
            <span style={{ color: '#7f8c8d', fontSize: '0.85em' }}>
              {expandedIndex === index ? '▼' : '▶'}
            </span>
          </button>

          {expandedIndex === index && (
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid #ecf0f1',
                backgroundColor: '#f8f9fa',
              }}
            >
              <p style={{ margin: '0 0 8px 0', color: '#7f8c8d', fontSize: '0.85em' }}>
                <strong>Timestamp:</strong>{' '}
                {new Date(step.timestamp).toLocaleTimeString()}
              </p>
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.85em',
                  color: '#2c3e50',
                  backgroundColor: 'white',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ecf0f1',
                  maxHeight: '300px',
                  overflow: 'auto',
                }}
              >
                {JSON.stringify(step.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
