import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSession = vi.fn();
const mockAccount = vi.fn();
const listFactors = vi.fn();
const getAal = vi.fn();

vi.mock('@/hooks/useSession', () => ({
  useSession: () => mockSession(),
}));
vi.mock('@/hooks/useAccount', () => ({
  useAccount: () => mockAccount(),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      mfa: {
        listFactors: () => listFactors(),
        getAuthenticatorAssuranceLevel: () => getAal(),
      },
    },
  },
}));
vi.mock('@/lib/idleTimeout', () => ({
  useAdminIdleTimeout: () => undefined,
}));

import { RequireAuth, RequireAdmin } from './auth';

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname + loc.search}</div>;
}

function shell(start: string, element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[start]}>
      <Routes>
        <Route path="/login" element={<LocationProbe />} />
        <Route path="/verify-email" element={<p>Verify page</p>} />
        <Route
          path="/app/account/security"
          element={<LocationProbe />}
        />
        <Route path="/app/dashboard" element={element} />
        <Route path="/app/admin" element={element} />
        <Route path="*" element={<p>Not found</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  beforeEach(() => {
    mockSession.mockReset();
    mockAccount.mockReset();
    listFactors.mockReset();
    getAal.mockReset();
  });

  it('shows nothing while loading', () => {
    mockSession.mockReturnValue({ session: null, user: null, loading: true, emailVerified: false });
    shell('/app/dashboard', <RequireAuth><p>Inside</p></RequireAuth>);
    expect(screen.queryByText('Inside')).not.toBeInTheDocument();
  });

  it('redirects to /login when no session', async () => {
    mockSession.mockReturnValue({ session: null, user: null, loading: false, emailVerified: false });
    shell('/app/dashboard', <RequireAuth><p>Inside</p></RequireAuth>);
    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/login'));
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
  beforeEach(() => {
    mockSession.mockReset();
    mockAccount.mockReset();
    listFactors.mockReset();
    getAal.mockReset();
    mockSession.mockReturnValue({
      session: { access_token: 't', user: { id: 'u' } },
      user: { id: 'u' },
      loading: false,
      emailVerified: true,
    });
  });

  it('redirects non-admin to /no-such-page', async () => {
    mockAccount.mockReturnValue({ data: { user: { role: 'user' } }, loading: false });
    shell('/app/admin', <RequireAdmin><p>Admin inside</p></RequireAdmin>);
    await waitFor(() => expect(screen.getByText('Not found')).toBeInTheDocument());
  });

  it('redirects to /app/account/security when admin has no verified factor', async () => {
    mockAccount.mockReturnValue({ data: { user: { role: 'admin' } }, loading: false });
    listFactors.mockResolvedValue({ data: { all: [] }, error: null });
    getAal.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null });
    shell('/app/admin', <RequireAdmin><p>Admin inside</p></RequireAdmin>);
    await waitFor(() =>
      expect(screen.getByTestId('loc')).toHaveTextContent('/app/account/security'),
    );
    expect(screen.getByTestId('loc')).toHaveTextContent('return=');
  });

  it('redirects to /login?mfa_required=1 when admin has factor but aal1', async () => {
    mockAccount.mockReturnValue({ data: { user: { role: 'admin' } }, loading: false });
    listFactors.mockResolvedValue({
      data: {
        all: [
          { id: 'f1', factor_type: 'totp', status: 'verified', created_at: '2026-05-03T00:00:00Z' },
        ],
      },
      error: null,
    });
    getAal.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null });
    shell('/app/admin', <RequireAdmin><p>Admin inside</p></RequireAdmin>);
    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/login'));
    expect(screen.getByTestId('loc')).toHaveTextContent('mfa_required=1');
  });

  it('renders children when role=admin, verified factor, and aal2', async () => {
    mockAccount.mockReturnValue({ data: { user: { role: 'admin' } }, loading: false });
    listFactors.mockResolvedValue({
      data: {
        all: [
          { id: 'f1', factor_type: 'totp', status: 'verified', created_at: '2026-05-03T00:00:00Z' },
        ],
      },
      error: null,
    });
    getAal.mockResolvedValue({ data: { currentLevel: 'aal2', nextLevel: 'aal2' }, error: null });
    shell('/app/admin', <RequireAdmin><p>Admin inside</p></RequireAdmin>);
    await waitFor(() => expect(screen.getByText('Admin inside')).toBeInTheDocument());
  });
});
