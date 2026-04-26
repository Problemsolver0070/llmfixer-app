import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const resetPasswordForEmail = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { resetPasswordForEmail: (...a: unknown[]) => resetPasswordForEmail(...a) } },
}));

import { ForgotForm } from './ForgotForm';

describe('ForgotForm', () => {
  beforeEach(() => resetPasswordForEmail.mockReset());

  it('sends a reset email and shows the success message regardless of result', async () => {
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: { message: 'unknown user' } });
    render(<MemoryRouter><ForgotForm /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(resetPasswordForEmail).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText(/if an account exists/i)).toBeInTheDocument(),
    );
  });

  it('lets the user resend the reset link from the success state', async () => {
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    render(<MemoryRouter><ForgotForm /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    await screen.findByText(/if an account exists/i);
    await userEvent.click(screen.getByRole('button', { name: /resend link/i }));
    expect(resetPasswordForEmail).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByText(/new link sent/i)).toBeInTheDocument());
  });
});
