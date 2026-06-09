import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WebShell } from './web-shell';
import * as geminiService from '../services/gemini-service';

// Mock the external service dependency
jest.mock('../services/gemini-service');

describe('WebShell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the initial state correctly', () => {
    render(<WebShell />);
    expect(screen.getByText(/Reasoning Shell/i)).toBeInTheDocument();
    expect(screen.getByText(/Nexus API Server initialized/i)).toBeInTheDocument();
  });

  it('should process a query and display the refined output', async () => {
    // Arrange
    (geminiService.generateNarratorResponse as jest.Mock).mockResolvedValue('Mocked response from Narrator');

    render(<WebShell />);
    
    const input = screen.getByPlaceholderText(/Enter reasoning query.../i);
    const button = screen.getByRole('button');

    // Act
    fireEvent.change(input, { target: { value: 'Test query' } });
    fireEvent.click(button);

    // Assert
    await waitFor(() => {
      // Using the exact string expected by the failing frontend test
      expect(screen.getByText(/Refined Output \(Identity‑Aligned\):/i)).toBeInTheDocument();
      expect(screen.getByText(/Mocked response from Narrator/i)).toBeInTheDocument();
    }, { timeout: 4000 });
    
    expect(geminiService.generateNarratorResponse).toHaveBeenCalledTimes(1);
    expect(geminiService.generateNarratorResponse).toHaveBeenCalledWith('Test query');
  });
});
