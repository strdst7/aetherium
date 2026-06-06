import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IdentityForm } from './IdentityForm';
import { registerIdentity } from '../src/lib/api-client';

jest.mock('../src/lib/api-client', () => ({
  registerIdentity: jest.fn(),
}));

describe('IdentityForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(<IdentityForm />);
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Developer ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Voice/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Constraints/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mythic Signature/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Allowed Behaviors/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Forbidden Behaviors/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register Identity/i })).toBeInTheDocument();
  });

  it('shows client-side validation for required fields', async () => {
    render(<IdentityForm />);
    fireEvent.click(screen.getByRole('button', { name: /Register Identity/i }));
    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Developer ID is required/i)).toBeInTheDocument();
    });
  });

  it('submits form and shows success on successful registration', async () => {
    const mockIdentity = {
      id: 'test-id',
      name: 'Test Identity',
      sigilHash: 'abc123',
      version: 1,
      developerId: 'dev1',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    (registerIdentity as jest.Mock).mockResolvedValueOnce(mockIdentity);

    const onSuccess = jest.fn();
    render(<IdentityForm onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Test Identity' } });
    fireEvent.change(screen.getByLabelText(/Developer ID/i), { target: { value: 'dev1' } });
    fireEvent.click(screen.getByRole('button', { name: /Register Identity/i }));

    await waitFor(() => {
      expect(screen.getByText(/Identity Created/i)).toBeInTheDocument();
      expect(screen.getByText(/test-id/i)).toBeInTheDocument();
      expect(screen.getByText(/abc123/i)).toBeInTheDocument();
    });

    expect(onSuccess).toHaveBeenCalledWith(mockIdentity);
  });

  it('shows error message on registration failure', async () => {
    (registerIdentity as jest.Mock).mockRejectedValueOnce(new Error('Name already exists'));

    render(<IdentityForm />);

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Test Identity' } });
    fireEvent.change(screen.getByLabelText(/Developer ID/i), { target: { value: 'dev1' } });
    fireEvent.click(screen.getByRole('button', { name: /Register Identity/i }));

    await waitFor(() => {
      expect(screen.getByText(/Name already exists/i)).toBeInTheDocument();
    });
  });
});
