import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const signUp = vi.fn();
const resend = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: (args: unknown) => signUp(args),
      resend: (args: unknown) => resend(args),
    },
  },
}));

import { SignUpForm } from './SignUpForm';

function renderForm() {
  return render(
    <MemoryRouter>
      <SignUpForm />
    </MemoryRouter>,
  );
}

describe('SignUpForm', () => {
  beforeEach(() => {
    signUp.mockReset();
    resend.mockReset();
  });

  it('rejects passwords shorter than 8 characters', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'short');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('signs up with the dashboard redirect and shows the inline success state', async () => {
    signUp.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.c' }, session: null },
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
    await waitFor(() =>
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument(),
    );
    expect(screen.getByText('a@b.c')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
  });

  it('lets the user resend the verification email from the success state', async () => {
    signUp.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.c' }, session: null },
      error: null,
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

  it('lets the user step back with a different email', async () => {
    signUp.mockResolvedValue({
      data: { user: { id: 'u1' }, session: null },
      error: null,
    });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'longenough');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    await screen.findByText(/check your inbox/i);
    await userEvent.click(screen.getByRole('button', { name: /use a different email/i }));
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
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
