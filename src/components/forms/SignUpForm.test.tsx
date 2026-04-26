import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const signUp = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signUp: (args: unknown) => signUp(args) } },
}));

import { SignUpForm } from './SignUpForm';

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/signup']}>
      <Routes>
        <Route path="/signup" element={<SignUpForm />} />
        <Route path="/verify-email" element={<p>verify here</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SignUpForm', () => {
  beforeEach(() => signUp.mockReset());

  it('rejects passwords shorter than 8 characters', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'short');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('signs up and redirects to /verify-email', async () => {
    signUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'longenough');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(signUp).toHaveBeenCalledWith({ email: 'a@b.c', password: 'longenough' });
    await waitFor(() => expect(screen.getByText('verify here')).toBeInTheDocument());
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
