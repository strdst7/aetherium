import React from 'react';
import { render, screen } from '@testing-library/react';
import { ValidationReport } from './ValidationReport';
import { ValidationReport as ValidationReportType } from '../src/types/api';

describe('ValidationReport', () => {
  const mockReport: ValidationReportType = {
    status: 'passed',
    checks: [
      {
        rule: { id: 'r1', name: 'No Forbidden Words', category: 'forbidden', weight: 1.0 },
        passed: true,
        detail: 'No forbidden words found',
        confidence: 0.95,
      },
      {
        rule: { id: 'r2', name: 'Tone Check', category: 'tone', weight: 0.8 },
        passed: false,
        detail: 'Tone too casual',
        confidence: 0.7,
      },
    ],
    passedCount: 1,
    failedCount: 1,
    totalCount: 2,
    confidenceScore: 0.82,
    identityId: 'test-id',
    validatedAt: '2024-01-01T00:00:00Z',
    attemptNumber: 1,
  };

  it('renders status badge and metrics', () => {
    render(<ValidationReport report={mockReport} />);
    expect(screen.getByText(/Validation Report/i)).toBeInTheDocument();
    expect(screen.getByTestId('validation-status')).toHaveTextContent('passed');
    // Metric cards contain the counts
    const metrics = screen.getAllByText('1');
    expect(metrics.length).toBeGreaterThanOrEqual(2); // passed count + failed count
    expect(screen.getByText('82.0%')).toBeInTheDocument(); // confidence
  });

  it('renders all checks with pass/fail indicators', () => {
    render(<ValidationReport report={mockReport} />);
    expect(screen.getByText('No Forbidden Words')).toBeInTheDocument();
    expect(screen.getByText('Tone Check')).toBeInTheDocument();
    expect(screen.getByText('No forbidden words found')).toBeInTheDocument();
    expect(screen.getByText('Tone too casual')).toBeInTheDocument();
  });

  it('renders failed status correctly', () => {
    const failedReport: ValidationReportType = {
      ...mockReport,
      status: 'failed',
    };
    render(<ValidationReport report={failedReport} />);
    expect(screen.getByTestId('validation-status')).toHaveTextContent('failed');
  });
});
