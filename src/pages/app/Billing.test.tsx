import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/paypal', () => ({ AppPayPalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@paypal/react-paypal-js', () => ({
  PayPalButtons: (props: { createSubscription: (...a: unknown[]) => unknown; onApprove: (...a: unknown[]) => unknown }) => (
    <button
      data-testid="paypal-stub"
      onClick={async () => {
        await props.createSubscription({}, { subscription: { create: async (a: unknown) => { void a; return 'I-NEW'; } } });
        await props.onApprove({ subscriptionID: 'I-NEW' }, {});
      }}
    >
      PayPal stub subscribe
    </button>
  ),
}));

const useAccount = vi.fn();
const useSubscription = vi.fn();
vi.mock('@/hooks/useAccount', () => ({ useAccount: () => useAccount() }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => useSubscription() }));
vi.mock('@/lib/env', () => ({ env: { paypalPlanId: 'P-test' } }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: vi.fn(), signOut: vi.fn() } } }));
vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: unknown, message?: string) {
      super(message ?? `API error ${status}`);
      this.status = status;
      this.body = body;
    }
  },
  api: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
}));

import Billing from './Billing';

function setup(status: string, overrides: Record<string, unknown> = {}) {
  const activate = vi.fn().mockResolvedValue(undefined);
  const cancel = vi.fn().mockResolvedValue(undefined);
  const redeem = vi.fn().mockResolvedValue({ applied_effect: { type: 'free_time', days_added: 7 } });
  useAccount.mockReturnValue({
    data: {
      user: {
        id: 'u', email: 'a@b.c', role: 'user', status,
        trial_ends_at: status === 'trial' ? '2099-01-01' : null,
        paypal_sub_id: status === 'active' ? 'I-1' : null,
        cancels_at: null, comp_until: null,
        ...overrides,
      },
      requests_this_week: 0, active_key_count: 0,
    },
    loading: false, error: null, refresh: async () => {},
  });
  useSubscription.mockReturnValue({
    subscription: status === 'active' ? { paypal_sub_id: 'I-1', status: 'ACTIVE', plan_id: 'P-test', next_billing_time: '2099-05-01T00:00:00Z' } : null,
    loading: false, activate, cancel, redeem,
  });
  return { activate, cancel, redeem, ...render(<MemoryRouter><Billing /></MemoryRouter>) };
}

describe('Billing page', () => {
  it('shows the PayPal subscribe button when on trial', () => {
    setup('trial');
    expect(screen.getByTestId('paypal-stub')).toBeInTheDocument();
  });

  it('calls activate on PayPal approval', async () => {
    const { activate } = setup('trial');
    await userEvent.click(screen.getByTestId('paypal-stub'));
    await waitFor(() => expect(activate).toHaveBeenCalledWith('I-NEW'));
  });

  it('shows the cancel button when active', async () => {
    const { cancel } = setup('active');
    await userEvent.click(screen.getByRole('button', { name: /cancel subscription/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirm cancel/i }));
    await waitFor(() => expect(cancel).toHaveBeenCalled());
  });

  it('renders the redeem form', () => {
    setup('trial');
    expect(screen.getByLabelText(/promo code/i)).toBeInTheDocument();
  });
});
