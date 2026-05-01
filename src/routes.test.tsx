import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router-dom';

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: vi.fn(), signUp: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn(), resend: vi.fn(), signOut: vi.fn() } },
}));
vi.mock('@/lib/api', () => ({ api: vi.fn() }));
vi.mock('@/hooks/useKeys', () => ({
  useKeys: () => ({ keys: [], loading: false, error: null, create: vi.fn(), revoke: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({ session: null, user: null, loading: false, emailVerified: false }),
}));
vi.mock('@/hooks/useAccount', () => ({
  useAccount: () => ({ data: null, loading: false, error: null, refresh: async () => {} }),
}));
vi.mock('@/hooks/useWorkspace', () => ({
  useWorkspace: () => ({
    workspace: null,
    loading: false,
    error: null,
    refresh: vi.fn(),
    invite: vi.fn(),
    refundInvite: vi.fn(),
    removeSeat: vi.fn(),
    leave: vi.fn(),
  }),
}));
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ subscription: null, loading: false, activate: vi.fn(), cancel: vi.fn(), redeem: vi.fn() }),
}));
vi.mock('@/lib/paypal', () => ({ AppPayPalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@paypal/react-paypal-js', () => ({ PayPalButtons: () => null }));
vi.mock('@/lib/env', () => ({ env: { paypalClientId: 'test', supabaseUrl: 'http://localhost', supabaseAnonKey: 'test', apiBase: 'http://localhost' } }));

import { routes } from './routes';

describe('routes', () => {
  it('redirects unauthenticated user from /app/dashboard to /login', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/dashboard'] });
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });

  it('renders the public landing at /', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/'] });
    render(<RouterProvider router={router} />);
    expect(screen.getByText(/frontier models forget/i)).toBeInTheDocument();
  });

  it('redirects unauthenticated user from /app/workspace to /login', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/workspace'] });
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });

  it('redirects unauthenticated user from /app/workspace/accept to /login', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/workspace/accept?token=T'] });
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });
});

void MemoryRouter; // keep the import alive for future tests
