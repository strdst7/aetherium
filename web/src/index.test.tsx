import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from '../pages/index';

// Mock the API client
jest.mock('../src/lib/api-client', () => ({
  getIdentities: jest.fn().mockResolvedValue([
    { id: 'test-id-1', name: 'Test Identity', version: 1, sigilHash: 'abc123', developerId: 'dev1', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
  ]),
  submitReasonRequest: jest.fn(),
}));

import { submitReasonRequest } from '../src/lib/api-client';

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the query form', async () => {
    render(<Home />);
    await waitFor(() => {
      expect(screen.getByText(/⚡ Aetherium Identity Test/i)).toBeInTheDocument();
    });
  });

  it('submits the form and displays the result', async () => {
    const mockResponse = {
      id: 'resp-1',
      status: 'approved',
      output: 'The Halo Array is a superweapon.',
      identity_anchor: 'test-id-1',
      reasoning: {
        orchestrator: {
          selectedProvider: 'mock',
          relevantMemoriesCount: 1,
          topMemories: [],
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

    (submitReasonRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getAllByText('Test Identity (v1)').length).toBe(2);
    });

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
      id: 'resp-2',
      status: 'refine',
      output: 'Original bad output',
      identity_anchor: 'test-id-1',
      reasoning: {
        orchestrator: { selectedProvider: 'mock', relevantMemoriesCount: 1, topMemories: [] },
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

    (submitReasonRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getAllByText('Test Identity (v1)').length).toBe(2);
    });

    const textarea = screen.getByPlaceholderText(/Enter your reasoning query.../i);
    fireEvent.change(textarea, { target: { value: 'Rotate sigil' } });
    fireEvent.click(screen.getByText(/🚀 Submit/i));

    await waitFor(() => {
      expect(screen.getByText(/Refined Answer — Identity Aligned/i)).toBeInTheDocument();
      expect(screen.getByText(/Refined good output/i)).toBeInTheDocument();
    });
  });
});
