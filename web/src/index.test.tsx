import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '../pages/index';

// Mock fetch
global.fetch = jest.fn();

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the query form', () => {
    render(<Home />);
    expect(screen.getByText(/⚡ Aetherium Reasoning Shell/i)).toBeInTheDocument();
  });

  it('submits the form and displays the result', async () => {
    const mockResponse = {
      status: 'approved',
      output: 'The Halo Array is a superweapon.',
      reasoning: {
        orchestrator: {
          selectedProvider: 'mock',
          relevantMemoriesCount: 1,
          topMemories: [],
          trace: []
        },
        reflective: {
          status: 'approved',
          violations: [],
          suggestedConstraints: [],
          confidenceScore: 0.95
        },
        trace: []
      },
      metadata: { processingTimeMs: 100 }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<Home />);
    
    const textarea = screen.getByPlaceholderText(/Enter your reasoning query.../i);
    fireEvent.change(textarea, { target: { value: 'What is the Halo Array?' } });
    fireEvent.click(screen.getByText(/🚀 Submit/i));

    await waitFor(() => {
      expect(screen.getByText(/Candidate Output/i)).toBeInTheDocument();
      expect(screen.getByText(/The Halo Array is a superweapon./i)).toBeInTheDocument();
    });
  });

  it('displays refined output when available', async () => {
    const mockResponse = {
      status: 'refine',
      output: 'Original bad output',
      reasoning: {
        orchestrator: { selectedProvider: 'mock', relevantMemoriesCount: 1, topMemories: [], trace: [] },
        reflective: { 
          status: 'refine', 
          violations: [{ message: 'Bad geometry', severity: 'error' }],
          suggestedConstraints: [],
          confidenceScore: 0.2
        },
        trace: []
      },
      metadata: { 
        refinedCandidate: { text: 'Refined good output' },
        processingTimeMs: 200 
      }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<Home />);
    
    const textarea = screen.getByPlaceholderText(/Enter your reasoning query.../i);
    fireEvent.change(textarea, { target: { value: 'Rotate sigil' } });
    fireEvent.click(screen.getByText(/🚀 Submit/i));

    await waitFor(() => {
      expect(screen.getByText(/Refined Output \(Identity‑Aligned\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Refined good output/i)).toBeInTheDocument();
    });
  });
});
