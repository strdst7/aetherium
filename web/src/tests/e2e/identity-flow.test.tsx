import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IdentityForm } from '../../../components/IdentityForm';
import { registerIdentity } from '../../lib/api-client';

jest.mock('../../lib/api-client', () => ({
  registerIdentity: jest.fn(),
}));

describe('Identity Registration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render identity registration form', () => {
    render(<IdentityForm />);

    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Developer ID/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register Identity/i })).toBeInTheDocument();
  });

  it('should submit registration and display success', async () => {
    const mockIdentity = {
      id: 'new-id',
      name: 'New Identity',
      sigilHash: 'sigil-123',
      version: 1,
      developerId: 'dev-new',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    (registerIdentity as jest.Mock).mockResolvedValueOnce(mockIdentity);

    render(<IdentityForm />);

    fireEvent.change(screen.getByLabelText(/Name/i), {
      target: { value: 'New Identity' },
    });
    fireEvent.change(screen.getByLabelText(/Developer ID/i), {
      target: { value: 'dev-new' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Register Identity/i }));

    await waitFor(() => {
      expect(screen.getByText(/Identity Created/i)).toBeInTheDocument();
      expect(screen.getByText(/new-id/i)).toBeInTheDocument();
    });

    expect(registerIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Identity',
        developerId: 'dev-new',
      })
    );
  });

  it('should display validation errors for invalid input', async () => {
    render(<IdentityForm />);

    fireEvent.click(screen.getByRole('button', { name: /Register Identity/i }));

    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Developer ID is required/i)).toBeInTheDocument();
    });

    expect(registerIdentity).not.toHaveBeenCalled();
  });
});
