import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const signInWithPassword = vi.fn();
const resend = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (args: unknown) => signInWithPassword(args),
      resend: (args: unknown) => resend(args),
    },
  },
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

import { SignInForm } from './SignInForm';

function renderForm(initialEntry = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SignInForm />
    </MemoryRouter>,
  );
}

describe('SignInForm', () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    resend.mockReset();
    navigate.mockReset();
  });

  it('submits email and password', async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: null });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.c', password: 'secret123' });
  });

  it('shows a generic error on bad credentials', async () => {
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

  it('shows the verify-email prompt when the account is unverified', async () => {
    signInWithPassword.mockResolvedValue({
      data: {},
      error: { code: 'email_not_confirmed', message: 'Email not confirmed' },
    });
    resend.mockResolvedValue({ error: null });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'whatever1');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() =>
      expect(screen.getByText(/email not verified yet/i)).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /resend verification email/i }));
    expect(resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'a@b.c',
      options: { emailRedirectTo: expect.stringMatching(/\/app\/dashboard$/) },
    });
    await waitFor(() => expect(screen.getByText(/new link sent/i)).toBeInTheDocument());
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

  it('navigates to /app/dashboard by default after a successful sign-in', async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: null });
    renderForm('/login');
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/app/dashboard'));
  });

  it('navigates to a same-origin /app/ path from ?next=', async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: null });
    renderForm('/login?next=%2Fapp%2Fbilling');
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/app/billing'));
  });

  describe('cross-subdomain absolute next=', () => {
    let originalLocation: Location;
    let assigned: string | null;

    beforeEach(() => {
      originalLocation = window.location;
      assigned = null;
      // happy-dom location is a getter; replace with a stub that captures
      // the href setter so we can assert without actually navigating.
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
          ...originalLocation,
          origin: 'https://thefixer.in',
          set href(value: string) {
            assigned = value;
          },
          get href() {
            return assigned ?? '';
          },
        },
      });
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
    });

    it('does a full document navigation to *.thefixer.in when next= is absolute', async () => {
      signInWithPassword.mockResolvedValue({ data: {}, error: null });
      const target = encodeURIComponent('https://chat.thefixer.in/');
      renderForm(`/login?next=${target}`);
      await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
      await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() => expect(assigned).toBe('https://chat.thefixer.in/'));
      // navigate(...) should NOT be called when we do a full-page redirect.
      expect(navigate).not.toHaveBeenCalled();
    });

    it('falls back to /app/dashboard when next= points to an external host', async () => {
      signInWithPassword.mockResolvedValue({ data: {}, error: null });
      const target = encodeURIComponent('https://evil.com/');
      renderForm(`/login?next=${target}`);
      await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
      await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() => expect(navigate).toHaveBeenCalledWith('/app/dashboard'));
      expect(assigned).toBeNull();
    });
  });
});
