import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const resend = vi.fn();
const useSession = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { resend: (a: unknown) => resend(a) } },
}));
vi.mock('@/hooks/useSession', () => ({
  useSession: () => useSession(),
}));

import VerifyEmail from './VerifyEmail';

function shell() {
  return render(
    <MemoryRouter initialEntries={['/verify-email']}>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/login" element={<p>login here</p>} />
        <Route path="/app/dashboard" element={<p>dashboard here</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VerifyEmail', () => {
  beforeEach(() => {
    resend.mockReset();
    useSession.mockReset();
  });

  it('redirects to /login when there is no session', async () => {
    useSession.mockReturnValue({
      session: null, user: null, loading: false, emailVerified: false,
    });
    shell();
    await waitFor(() => expect(screen.getByText('login here')).toBeInTheDocument());
  });

  it('redirects to /app/dashboard when already verified', async () => {
    useSession.mockReturnValue({
      session: { access_token: 't' }, user: { id: 'u', email: 'a@b.c' },
      loading: false, emailVerified: true,
    });
    shell();
    await waitFor(() => expect(screen.getByText('dashboard here')).toBeInTheDocument());
  });

  it('lets the user resend the verification email', async () => {
    useSession.mockReturnValue({
      session: { access_token: 't' }, user: { id: 'u', email: 'a@b.c' },
      loading: false, emailVerified: false,
    });
    resend.mockResolvedValue({ error: null });
    shell();
    await userEvent.click(screen.getByRole('button', { name: /resend/i }));
    expect(resend).toHaveBeenCalledWith({ type: 'signup', email: 'a@b.c' });
    expect(await screen.findByText(/sent a fresh link/i)).toBeInTheDocument();
  });
});
