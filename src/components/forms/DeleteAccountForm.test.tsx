import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...a: unknown[]) => apiCall(...a) }));
const signOut = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signOut: () => signOut() } },
}));

import { DeleteAccountForm } from './DeleteAccountForm';

describe('DeleteAccountForm', () => {
  beforeEach(() => {
    apiCall.mockReset();
    signOut.mockReset();
  });

  it('keeps the delete button disabled until "delete my account" is typed', async () => {
    render(<DeleteAccountForm />);
    expect(screen.getByRole('button', { name: /delete my account/i })).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/type/i), 'delete my account');
    expect(screen.getByRole('button', { name: /delete my account/i })).toBeEnabled();
  });

  it('calls DELETE /v1/account and signs out on confirm', async () => {
    apiCall.mockResolvedValue({});
    render(<DeleteAccountForm />);
    await userEvent.type(screen.getByLabelText(/type/i), 'delete my account');
    await userEvent.click(screen.getByRole('button', { name: /delete my account/i }));
    await waitFor(() => expect(apiCall).toHaveBeenCalledWith('/v1/account', { method: 'DELETE' }));
    expect(signOut).toHaveBeenCalled();
  });
});
