import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const mockUserMe = vi.fn();
vi.mock('@/hooks/useUserMe', () => ({
  useUserMe: () => mockUserMe(),
}));

import { PostSignupGate } from './PostSignupGate';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/post-signup" element={<PostSignupGate />} />
        <Route path="/app/setup" element={<p>Setup page</p>} />
        <Route path="/app/billing/upgrade" element={<p>Billing upgrade</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PostSignupGate', () => {
  it('shows a loading state while useUserMe is loading', () => {
    mockUserMe.mockReturnValue({
      loading: true,
      error: null,
      hasActiveSubscription: false,
    });
    renderAt('/app/post-signup');
    expect(screen.getByRole('status')).toHaveTextContent(/setting up/i);
  });

  it('redirects to /app/setup when user has active subscription', async () => {
    mockUserMe.mockReturnValue({
      loading: false,
      error: null,
      hasActiveSubscription: true,
    });
    renderAt('/app/post-signup');
    await waitFor(() =>
      expect(screen.getByText('Setup page')).toBeInTheDocument(),
    );
  });

  it('redirects to /app/billing/upgrade when no active subscription', async () => {
    mockUserMe.mockReturnValue({
      loading: false,
      error: null,
      hasActiveSubscription: false,
    });
    renderAt('/app/post-signup');
    await waitFor(() =>
      expect(screen.getByText('Billing upgrade')).toBeInTheDocument(),
    );
  });

  it('redirects to /app/billing/upgrade on API error', async () => {
    mockUserMe.mockReturnValue({
      loading: false,
      error: new Error('boom'),
      hasActiveSubscription: false,
    });
    renderAt('/app/post-signup');
    await waitFor(() =>
      expect(screen.getByText('Billing upgrade')).toBeInTheDocument(),
    );
  });
});
