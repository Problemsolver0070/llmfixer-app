import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const useAccount = vi.fn();
vi.mock('@/hooks/useAccount', () => ({ useAccount: () => useAccount() }));

import Dashboard from './Dashboard';

function setup(overrides: Partial<Record<string, unknown>>) {
  useAccount.mockReturnValue({
    data: {
      user: {
        id: 'u', email: 'a@b.c', role: 'user', status: 'trial',
        trial_ends_at: '2099-01-01T00:00:00Z',
        paypal_sub_id: null, cancels_at: null, comp_until: null,
        ...overrides,
      },
      requests_this_week: 42, active_key_count: 2,
    },
    loading: false, error: null, refresh: async () => {},
  });
  return render(<MemoryRouter><Dashboard /></MemoryRouter>);
}

describe('Dashboard', () => {
  it('shows trial card with hours remaining', () => {
    setup({ status: 'trial' });
    expect(screen.getByText(/trial/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /subscribe/i })).toBeInTheDocument();
  });

  it('shows subscribed card when status is active', () => {
    setup({ status: 'active', paypal_sub_id: 'I-1' });
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  it('shows paywall card when trial expired', () => {
    setup({ status: 'trial_expired' });
    expect(screen.getByText(/your trial ended/i)).toBeInTheDocument();
  });

  it('renders this-week request count', () => {
    setup({ status: 'active' });
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
