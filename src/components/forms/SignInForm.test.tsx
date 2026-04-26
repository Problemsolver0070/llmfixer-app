import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const signInWithPassword = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: (args: unknown) => signInWithPassword(args) } },
}));

import { SignInForm } from './SignInForm';

function renderForm() {
  return render(
    <MemoryRouter>
      <SignInForm />
    </MemoryRouter>,
  );
}

describe('SignInForm', () => {
  beforeEach(() => signInWithPassword.mockReset());

  it('submits email and password', async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: null });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.c', password: 'secret123' });
  });

  it('shows a generic error when supabase fails', async () => {
    signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'Invalid login credentials' },
    });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/wrong email or password/i),
    );
  });

  it('disables the submit button while loading', async () => {
    let resolve: (v: unknown) => void = () => {};
    signInWithPassword.mockReturnValue(new Promise((r) => (resolve = r)));
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByRole('button')).toBeDisabled();
    resolve({ data: {}, error: null });
  });
});
