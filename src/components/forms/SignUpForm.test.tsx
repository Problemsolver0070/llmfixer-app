import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const signUp = vi.fn();
const resend = vi.fn();
const signInWithPassword = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: (args: unknown) => signUp(args),
      resend: (args: unknown) => resend(args),
      signInWithPassword: (args: unknown) => signInWithPassword(args),
    },
  },
}));

import { SignUpForm } from './SignUpForm';

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/signup']}>
      <Routes>
        <Route path="/signup" element={<SignUpForm />} />
        <Route path="/app/dashboard" element={<p>dashboard here</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SignUpForm', () => {
  beforeEach(() => {
    signUp.mockReset();
    resend.mockReset();
    signInWithPassword.mockReset();
  });

  it('rejects passwords shorter than 8 characters', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'short');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('navigates to /app/dashboard when signup returns a session immediately', async () => {
    signUp.mockResolvedValue({
      data: {
        user: { id: 'u1', email: 'a@b.c' },
        session: { access_token: 't' },
      },
      error: null,
    });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'longenough');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(signUp).toHaveBeenCalledWith({
      email: 'a@b.c',
      password: 'longenough',
      options: { emailRedirectTo: expect.stringMatching(/\/app\/dashboard$/) },
    });
    await waitFor(() => expect(screen.getByText('dashboard here')).toBeInTheDocument());
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('falls back to signInWithPassword when signup returns no session', async () => {
    signUp.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.c' }, session: null },
      error: null,
    });
    signInWithPassword.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'longenough');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.c', password: 'longenough' }),
    );
    await waitFor(() => expect(screen.getByText('dashboard here')).toBeInTheDocument());
  });

  it('shows inline check-inbox state when both signup and auto-signin yield no session', async () => {
    signUp.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.c' }, session: null },
      error: null,
    });
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'Email not confirmed' },
    });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'longenough');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(screen.getByText(/check your inbox/i)).toBeInTheDocument());
    expect(screen.getByText('a@b.c')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
  });

  it('lets the user resend the verification email from the inline state', async () => {
    signUp.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.c' }, session: null },
      error: null,
    });
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'Email not confirmed' },
    });
    resend.mockResolvedValue({ error: null });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'longenough');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    await screen.findByText(/check your inbox/i);
    await userEvent.click(screen.getByRole('button', { name: /resend email/i }));
    expect(resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'a@b.c',
      options: { emailRedirectTo: expect.stringMatching(/\/app\/dashboard$/) },
    });
    await waitFor(() => expect(screen.getByText(/new link sent/i)).toBeInTheDocument());
  });

  it('surfaces a server error inline', async () => {
    signUp.mockResolvedValue({ data: {}, error: { message: 'User already registered' } });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'longenough');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/already registered/i);
  });
});
