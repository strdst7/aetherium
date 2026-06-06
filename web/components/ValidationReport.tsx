'use client';

import { ValidationReport as ValidationReportType } from '../src/types/api';

interface ValidationReportProps {
  report: ValidationReportType;
}

export function ValidationReport({ report }: ValidationReportProps) {
  const statusColor = report.status === 'passed' ? '#27ae60' : '#e74c3c';
  const statusIcon = report.status === 'passed' ? '✅' : '❌';

  return (
    <div
      style={{
        backgroundColor: 'white',
        border: '1px solid #ecf0f1',
        borderRadius: '6px',
        padding: '20px',
        marginTop: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '1.5em' }}>{statusIcon}</span>
        <h3 style={{ margin: 0, color: '#2c3e50' }}>
          Validation Report
        </h3>
        <span
          data-testid="validation-status"
          style={{
            backgroundColor: statusColor,
            color: 'white',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '0.85em',
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          {report.status}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <MetricCard label="Passed" value={report.passedCount} color="#27ae60" />
        <MetricCard label="Failed" value={report.failedCount} color="#e74c3c" />
        <MetricCard label="Total" value={report.totalCount} color="#3498db" />
        <MetricCard
          label="Confidence"
          value={`${(report.confidenceScore * 100).toFixed(1)}%`}
          color="#9b59b6"
        />
      </div>

      <div style={{ display: 'grid', gap: '8px' }}>
        {report.checks.map((check, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '10px',
              backgroundColor: check.passed ? '#f8fff9' : '#fff8f8',
              border: `1px solid ${check.passed ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '4px',
            }}
          >
            <span style={{ fontSize: '1.1em', marginTop: '2px' }}>
              {check.passed ? '✅' : '❌'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#2c3e50' }}>
                  {check.rule.name}
                </span>
                <span
                  style={{
                    fontSize: '0.75em',
                    color: '#7f8c8d',
                    backgroundColor: '#ecf0f1',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                  }}
                >
                  {check.rule.category}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', color: '#7f8c8d', fontSize: '0.9em' }}>
                {check.detail}
              </p>
              {check.confidence !== undefined && (
                <p style={{ margin: '4px 0 0 0', color: '#95a5a6', fontSize: '0.8em' }}>
                  Confidence: {(check.confidence * 100).toFixed(1)}%
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '12px', fontSize: '0.8em', color: '#95a5a6' }}>
        Identity: {report.identityId} | Validated: {new Date(report.validatedAt).toLocaleString()}
        {report.attemptNumber !== undefined && (
          <span> | Attempt #{report.attemptNumber}</span>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '12px',
        backgroundColor: `${color}10`,
        borderRadius: '4px',
        border: `1px solid ${color}30`,
      }}
    >
      <div style={{ fontSize: '1.4em', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '0.8em', color: '#7f8c8d', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}
