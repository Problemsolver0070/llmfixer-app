import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const useAccount = vi.fn();
vi.mock('@/hooks/useAccount', () => ({ useAccount: () => useAccount() }));

import Dashboard from './Dashboard';

function setup(overrides: Partial<Record<string, unknown>> = {}, hasActiveSub = false) {
  useAccount.mockReturnValue({
    data: {
      user: {
        id: 'u', email: 'a@b.c', role: 'user', status: 'active',
        paypal_sub_id: null, cancels_at: null, comp_until: null,
        ...overrides,
      },
      requests_this_week: 42, active_key_count: 2,
    },
    loading: false, error: null, hasActiveSubscription: hasActiveSub, refresh: async () => {},
  });
  return render(<MemoryRouter><Dashboard /></MemoryRouter>);
}

describe('Dashboard', () => {
  it('shows subscribe CTA when user has no active subscription', () => {
    setup({ status: 'expired' }, false);
    expect(screen.getByText(/no active subscription/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /subscribe/i })).toBeInTheDocument();
  });

  it('shows active card when user has active subscription', () => {
    setup({ status: 'active', paypal_sub_id: 'I-1' }, true);
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  it('renders this-week request count', () => {
    setup({ status: 'active' }, true);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows The Fixer AI card regardless of subscription status', () => {
    setup({ status: 'expired' }, false);
    expect(screen.getByTestId('fixer-ai-card')).toBeInTheDocument();
  });

  it('shows free demo announcement with support link', () => {
    setup({ status: 'expired' }, false);
    expect(screen.getByText(/want to see the fixer/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ask for a free demo/i })).toHaveAttribute(
      'href',
      '/app/support',
    );
  });

  it('shows comp_until date for comp users', () => {
    setup({ status: 'active', comp_until: '2026-06-01T00:00:00Z', paypal_sub_id: null }, true);
    expect(screen.getByText(/paid through/i)).toBeInTheDocument();
  });

  it('shows cancelling state when cancels_at is set', () => {
    setup({ status: 'active', cancels_at: '2026-06-01T00:00:00Z', paypal_sub_id: 'I-1' }, true);
    expect(screen.getByText(/cancelling/i)).toBeInTheDocument();
  });
});
