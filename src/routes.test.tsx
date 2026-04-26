import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({ session: null, user: null, loading: false, emailVerified: false }),
}));
vi.mock('@/hooks/useAccount', () => ({
  useAccount: () => ({ data: null, loading: false, error: null, refresh: async () => {} }),
}));

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
    expect(screen.getByText(/landing/i)).toBeInTheDocument();
  });
});

void MemoryRouter; // keep the import alive for future tests
