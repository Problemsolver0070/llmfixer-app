import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('sonner', () => ({
  toast: {
    message: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import Login from './Login';

function renderAt(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/app/workspace/accept"
          element={<div data-testid="accept-page">accept page</div>}
        />
        <Route path="/app/dashboard" element={<div data-testid="dashboard-page">dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Login page', () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    resend.mockReset();
  });

  it('redirects to /app/workspace/accept?token=<token> after successful login when ?invite is set', async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: null });
    renderAt('/login?invite=TOKEN-X');
    await userEvent.type(screen.getByLabelText(/email/i), 'ben@acme.io');
    await userEvent.type(screen.getByLabelText(/password/i), 'pw-secret-1');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByTestId('accept-page')).toBeInTheDocument());
  });

  it('redirects to /app/dashboard after successful login when no invite token is present', async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: null });
    renderAt('/login');
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByTestId('dashboard-page')).toBeInTheDocument());
  });

  it('url-encodes invite tokens that contain special characters', async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: null });
    renderAt('/login?invite=tok%2Fwith%20space');
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'pw-secret-1');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByTestId('accept-page')).toBeInTheDocument());
  });

  it('shows the expired banner when ?expired=1 is present', async () => {
    renderAt('/login?expired=1');
    await waitFor(() =>
      expect(
        screen.getByText(/your admin session expired\. sign in again\./i),
      ).toBeInTheDocument(),
    );
  });
});
