import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const updateUser = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { updateUser: (a: unknown) => updateUser(a) } },
}));

import { ChangePasswordForm } from './ChangePasswordForm';

describe('ChangePasswordForm', () => {
  beforeEach(() => updateUser.mockReset());

  it('rejects mismatched confirmation', async () => {
    render(<ChangePasswordForm />);
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'abcdefgh');
    await userEvent.type(screen.getByLabelText(/confirm/i), 'different');
    await userEvent.click(screen.getByRole('button', { name: /update password/i }));
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('updates the password and shows success', async () => {
    updateUser.mockResolvedValue({ data: {}, error: null });
    render(<ChangePasswordForm />);
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'abcdefgh');
    await userEvent.type(screen.getByLabelText(/confirm/i), 'abcdefgh');
    await userEvent.click(screen.getByRole('button', { name: /update password/i }));
    expect(updateUser).toHaveBeenCalledWith({ password: 'abcdefgh' });
    await waitFor(() => expect(screen.getByText(/password updated/i)).toBeInTheDocument());
  });
});
