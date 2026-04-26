import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const mockSession = vi.fn();

vi.mock('@/hooks/useSession', () => ({
  useSession: () => mockSession(),
}));
vi.mock('@/hooks/useAccount', () => ({
  useAccount: () => mockAccount(),
}));

const mockAccount = vi.fn();

import { RequireAuth, RequireAdmin } from './auth';

function shell(start: string, element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[start]}>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="/verify-email" element={<p>Verify page</p>} />
        <Route path="/app/dashboard" element={element} />
        <Route path="*" element={<p>Not found</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('shows nothing while loading', () => {
    mockSession.mockReturnValue({ session: null, user: null, loading: true, emailVerified: false });
    shell('/app/dashboard', <RequireAuth><p>Inside</p></RequireAuth>);
    expect(screen.queryByText('Inside')).not.toBeInTheDocument();
  });

  it('redirects to /login when no session', async () => {
    mockSession.mockReturnValue({ session: null, user: null, loading: false, emailVerified: false });
    shell('/app/dashboard', <RequireAuth><p>Inside</p></RequireAuth>);
    await waitFor(() => expect(screen.getByText('Login page')).toBeInTheDocument());
  });

  it('redirects to /verify-email when signed in but unverified', async () => {
    mockSession.mockReturnValue({
      session: { access_token: 't', user: { id: 'u' } },
      user: { id: 'u' },
      loading: false,
      emailVerified: false,
    });
    shell('/app/dashboard', <RequireAuth><p>Inside</p></RequireAuth>);
    await waitFor(() => expect(screen.getByText('Verify page')).toBeInTheDocument());
  });

  it('renders children when verified', () => {
    mockSession.mockReturnValue({
      session: { access_token: 't', user: { id: 'u' } },
      user: { id: 'u' },
      loading: false,
      emailVerified: true,
    });
    shell('/app/dashboard', <RequireAuth><p>Inside</p></RequireAuth>);
    expect(screen.getByText('Inside')).toBeInTheDocument();
  });
});

describe('RequireAdmin', () => {
  it('renders 404 when role is not admin', async () => {
    mockSession.mockReturnValue({
      session: { access_token: 't', user: { id: 'u' } },
      user: { id: 'u' },
      loading: false,
      emailVerified: true,
    });
    mockAccount.mockReturnValue({ data: { user: { role: 'user' } }, loading: false });
    shell('/app/dashboard', <RequireAdmin><p>Admin inside</p></RequireAdmin>);
    await waitFor(() => expect(screen.getByText('Not found')).toBeInTheDocument());
  });

  it('renders children when role is admin', () => {
    mockSession.mockReturnValue({
      session: { access_token: 't', user: { id: 'u' } },
      user: { id: 'u' },
      loading: false,
      emailVerified: true,
    });
    mockAccount.mockReturnValue({ data: { user: { role: 'admin' } }, loading: false });
    shell('/app/dashboard', <RequireAdmin><p>Admin inside</p></RequireAdmin>);
    expect(screen.getByText('Admin inside')).toBeInTheDocument();
  });
});
