import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock `@/lib/env` and `@/lib/supabase` first so the transitive
// `useStreamMessage` -> `@/lib/supabase` -> `@/lib/env` import chain inside
// `<SupportChat />` does not blow up when CI runs `npm test` without
// VITE_SUPABASE_URL et al. (env.ts throws at module load on missing vars
// by design; only the test mocks bypass it.)
vi.mock('@/lib/env', () => ({
  env: {
    supabaseUrl: 'http://localhost',
    supabaseAnonKey: 'test',
    apiBase: 'http://localhost',
    paypalClientId: 'test',
    paypalPlanId: 'P-test',
  },
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { access_token: 'test-jwt' } } })),
    },
  },
}));

vi.mock('@/hooks/useSupportThreads', () => ({
  useSupportThreads: () => ({
    threads: [], loading: false, error: null,
    create: vi.fn(), rename: vi.fn(), archive: vi.fn(), remove: vi.fn(), refetch: vi.fn(),
  }),
}));

const useKeysMock = vi.fn();
vi.mock('@/hooks/useKeys', () => ({ useKeys: () => useKeysMock() }));

import { Setup } from './Setup';

describe('Setup page', () => {
  it('renders both reference and support panes', () => {
    useKeysMock.mockReturnValue({
      keys: [{ id: 'k1', label: 'prod', key_prefix: 'opto_alpha', status: 'active' }],
      loading: false, error: null,
      create: vi.fn(), revoke: vi.fn(), refresh: vi.fn(),
    });
    render(<MemoryRouter><Setup /></MemoryRouter>);
    expect(screen.getByText(/proxy Anthropic models via Microsoft AI Foundry/i)).toBeInTheDocument();
    // Empty-state hero is "Ask anything." with a mono subtitle. Both surfaces
    // appear when there are no threads in the mock.
    expect(
      screen.getByRole('heading', { name: /ask anything\.?/i, level: 2 }),
    ).toBeInTheDocument();
  });
});
