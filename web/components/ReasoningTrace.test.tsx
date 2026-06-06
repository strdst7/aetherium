import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReasoningTrace } from './ReasoningTrace';

describe('ReasoningTrace', () => {
  it('renders empty state when no trace', () => {
    render(<ReasoningTrace trace={[]} />);
    expect(screen.getByText(/No trace available/i)).toBeInTheDocument();
  });

  it('renders trace steps as expandable cards', () => {
    const trace = [
      { stage: 'validation', timestamp: '2024-01-01T00:00:00Z', details: { identity: 'test' } },
      { stage: 'orchestrator', timestamp: '2024-01-01T00:00:01Z', details: { provider: 'mock' } },
    ];

    render(<ReasoningTrace trace={trace} />);
    expect(screen.getByText('validation')).toBeInTheDocument();
    expect(screen.getByText('orchestrator')).toBeInTheDocument();
  });

  it('expands and collapses trace steps on click', () => {
    const trace = [
      { stage: 'validation', timestamp: '2024-01-01T00:00:00Z', details: { identity: 'test' } },
    ];

    render(<ReasoningTrace trace={trace} />);
    const button = screen.getByText('validation').closest('button');
    expect(button).toBeInTheDocument();

    // Initially collapsed
    expect(screen.queryByText(/Timestamp:/i)).not.toBeInTheDocument();

    // Expand
    fireEvent.click(button!);
    expect(screen.getByText(/Timestamp:/i)).toBeInTheDocument();
    expect(screen.getByText(/identity/i)).toBeInTheDocument();

    // Collapse
    fireEvent.click(button!);
    expect(screen.queryByText(/Timestamp:/i)).not.toBeInTheDocument();
  });
});
