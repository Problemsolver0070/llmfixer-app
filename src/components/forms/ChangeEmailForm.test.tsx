import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const updateUser = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { updateUser: (a: unknown) => updateUser(a) } },
}));

import { ChangeEmailForm } from './ChangeEmailForm';

describe('ChangeEmailForm', () => {
  beforeEach(() => updateUser.mockReset());

  it('submits the new email and shows confirmation copy', async () => {
    updateUser.mockResolvedValue({ data: {}, error: null });
    render(<ChangeEmailForm currentEmail="a@b.c" />);
    await userEvent.type(screen.getByLabelText(/new email/i), 'new@example.com');
    await userEvent.click(screen.getByRole('button', { name: /update email/i }));
    expect(updateUser).toHaveBeenCalledWith({ email: 'new@example.com' });
    await waitFor(() =>
      expect(screen.getByText(/check both inboxes/i)).toBeInTheDocument(),
    );
  });

  it('surfaces errors from supabase', async () => {
    updateUser.mockResolvedValue({ data: {}, error: { message: 'Email already in use' } });
    render(<ChangeEmailForm currentEmail="a@b.c" />);
    await userEvent.type(screen.getByLabelText(/new email/i), 'taken@example.com');
    await userEvent.click(screen.getByRole('button', { name: /update email/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/already in use/i));
  });
});
