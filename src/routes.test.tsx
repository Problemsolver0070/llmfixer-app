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
vi.mock('@/hooks/useUserMe', () => ({
  useUserMe: () => ({
    data: null,
    loading: false,
    error: null,
    isEligibleToRefer: false,
    hasActiveSubscription: false,
    inDemoWindow: false,
    inTrialWindow: false,
    hasAccess: false,
    refresh: vi.fn(),
  }),
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
vi.mock('@/hooks/useReferrals', () => ({
  useReferrals: () => ({ data: null, loading: false, error: null, refresh: vi.fn() }),
}));
vi.mock('@/lib/paypal', () => ({ AppPayPalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@paypal/react-paypal-js', () => ({
  PayPalCardFieldsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PayPalNumberField: () => null,
  PayPalNameField: () => null,
  PayPalExpiryField: () => null,
  PayPalCVVField: () => null,
  usePayPalCardFields: () => ({ cardFieldsForm: null }),
  PayPalScriptProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/hooks/usePayPalClientToken', () => ({
  usePayPalClientToken: () => ({ clientToken: null, loading: true, error: null }),
}));
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

  it('redirects unauthenticated user from /app/post-signup to /login', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/post-signup'] });
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });

  it('redirects unauthenticated user from /app/refer to /login', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/refer'] });
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });

  it('redirects unauthenticated user from /app/setup to /login (TrialGate sits inside RequireAuth)', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/setup'] });
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });

  it('redirects unauthenticated user from /app/profile to /login', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/app/profile'] });
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });

  it('profile route element is not wrapped in TrialGate', () => {
    function findRoute(table: typeof routes, path: string): unknown {
      for (const r of table) {
        if (r.path === path) return r;
        const nested = (r as { children?: typeof routes }).children;
        if (nested) {
          for (const child of nested) {
            const fullPath = child.path && r.path === '/app' ? `/app/${child.path}` : child.path;
            if (fullPath === path) return child;
          }
        }
      }
      return null;
    }
    const profileRoute = findRoute(routes, '/app/profile') as { element?: { type?: { name?: string } } };
    // The route uses Component (not element with TrialGate); element is undefined.
    expect(profileRoute?.element).toBeUndefined();
  });

  it('billing/upgrade route element is not wrapped in TrialGate', () => {
    // Inspect the route table directly: a TrialGate wrapper would surface
    // the gate component name in the element's React tree. Verifying by
    // structure (rather than rendering) keeps the test stable against
    // future changes to the auth'd surfaces' children mocks.
    function findRoute(table: typeof routes, path: string): unknown {
      for (const r of table) {
        if (r.path === path) return r;
        const nested = (r as { children?: typeof routes }).children;
        if (nested) {
          for (const child of nested) {
            const fullPath = child.path && r.path === '/app' ? `/app/${child.path}` : child.path;
            if (fullPath === path) return child;
          }
        }
      }
      return null;
    }
    const setupRoute = findRoute(routes, '/app/setup') as { element?: { type?: { name?: string } } };
    const billingUpgradeRoute = findRoute(routes, '/app/billing/upgrade') as { element?: { type?: { name?: string } } };
    expect(setupRoute?.element?.type?.name).toBe('TrialGate');
    expect(billingUpgradeRoute?.element?.type?.name).not.toBe('TrialGate');
  });
});

void MemoryRouter; // keep the import alive for future tests
