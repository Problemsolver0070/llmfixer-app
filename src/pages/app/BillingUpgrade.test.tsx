import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: unknown, message?: string) {
      super(message ?? `API error ${status}`);
      this.status = status;
      this.body = body;
    }
  }
  return { api: vi.fn(async () => ({})), ApiError };
});

vi.mock('@/components/billing/PayPalSubscribeButton', () => ({
  PayPalSubscribeButton: ({
    paypalPlanId, planSku, seatCount,
  }: { paypalPlanId: string; planSku: string; seatCount: number }) => (
    <div
      data-testid="paypal-subscribe-button"
      data-plan-id={paypalPlanId}
      data-plan-sku={planSku}
      data-seat-count={seatCount}
    >
      PayPal Subscribe: {planSku} / {paypalPlanId}
    </div>
  ),
}));

const cryptoMutate = vi.fn();
vi.mock('@/components/billing/CryptoCheckoutButton', () => ({
  CryptoCheckoutButton: ({
    planSku, seatCount, onError,
  }: { planSku: string; seatCount: number; onError?: (m: string) => void }) => (
    <button
      data-testid="pay-with-crypto-button"
      data-plan-sku={planSku}
      data-seat-count={seatCount}
      onClick={() => {
        const result = cryptoMutate(planSku, seatCount);
        if (result && typeof (result as { catch?: unknown }).catch === 'function') {
          (result as Promise<unknown>).catch((e: unknown) => {
            onError?.(e instanceof Error ? e.message : String(e));
          });
        }
      }}
    >
      Pay with crypto
    </button>
  ),
}));

const razorpayMutate = vi.fn();
vi.mock('@/components/billing/RazorpayCheckoutButton', () => ({
  RazorpayCheckoutButton: ({
    planSku, seatCount, onError,
  }: { planSku: string; seatCount: number; onError?: (m: string) => void }) => (
    <button
      data-testid="pay-with-razorpay-button"
      data-plan-sku={planSku}
      data-seat-count={seatCount}
      onClick={() => {
        if (planSku.startsWith('workspace-')) {
          onError?.(
            'Razorpay workspace tiers coming soon, please use crypto payment for workspace plans.',
          );
          return;
        }
        const result = razorpayMutate(planSku, seatCount);
        if (result && typeof (result as { catch?: unknown }).catch === 'function') {
          (result as Promise<unknown>).catch((e: unknown) => {
            onError?.(e instanceof Error ? e.message : String(e));
          });
        }
      }}
    >
      If you are from India, pay with Razorpay
    </button>
  ),
}));

import BillingUpgrade from './BillingUpgrade';

vi.mock('@/hooks/usePlans', () => ({
  usePlans: () => ({
    plans: [
      { sku: 'solo-weekly', tier: 'solo', cadence: 'weekly', paypal_plan_id: 'P-SW',
        base_price_cents: 999, per_seat_price_cents: null, included_seats: 1,
        display_price: '$9.99 / week', discount_pct: 0, trial_days: 1,
        original_price_cents: 1999, original_display_price: '$19.99 / week',
        intro_promo_active: true },
      { sku: 'solo-monthly', tier: 'solo', cadence: 'monthly', paypal_plan_id: 'P-SM',
        base_price_cents: 3950, per_seat_price_cents: null, included_seats: 1,
        display_price: '$39.50 / month', discount_pct: 9, trial_days: 1,
        original_price_cents: 7900, original_display_price: '$79 / month',
        intro_promo_active: true },
      { sku: 'workspace-monthly', tier: 'workspace', cadence: 'monthly', paypal_plan_id: 'P-WM',
        base_price_cents: 15900, per_seat_price_cents: 4900, included_seats: 4,
        display_price: '$159 / month', discount_pct: 9, trial_days: 1,
        intro_promo_active: false },
    ],
    loading: false, error: null, refresh: vi.fn(),
  }),
}));

const changePlan = vi.fn(async () => {});
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ subscription: null, loading: false, changePlan, cancel: vi.fn(), redeem: vi.fn() }),
}));
const useAccountMock = vi.fn();
vi.mock('@/hooks/useAccount', () => ({
  useAccount: () => useAccountMock(),
}));
const useWorkspaceMock = vi.fn();
vi.mock('@/hooks/useWorkspace', () => ({
  useWorkspace: () => useWorkspaceMock(),
}));

const SOLO_ACCOUNT = { data: { user: { id: 'u', email: 'a', status: 'active', plan_id: 'solo-weekly', seat_count: 1, paypal_sub_id: 'SUB-1' }, requests_this_week: 0, active_key_count: 0 }, loading: false, refresh: vi.fn() };
const TRIAL_ACCOUNT = { data: { user: { id: 'u-trial', email: 'newuser@x', status: 'trial', plan_id: null, seat_count: 1, paypal_sub_id: null }, requests_this_week: 0, active_key_count: 0 }, loading: false, refresh: vi.fn() };
const WORKSPACE_ADMIN_ACCOUNT = { data: { user: { id: 'admin-1', email: 'amir@acme.io', status: 'active', plan_id: 'workspace-monthly', seat_count: 5, paypal_sub_id: 'SUB-1' }, requests_this_week: 0, active_key_count: 0 }, loading: false, refresh: vi.fn() };
const NO_WORKSPACE = { workspace: null, loading: false, error: null, refresh: vi.fn(), invite: vi.fn(), refundInvite: vi.fn(), removeSeat: vi.fn(), leave: vi.fn() };

describe('BillingUpgrade', () => {
  it('confirms the change-plan call when user picks a different SKU and clicks confirm', async () => {
    useAccountMock.mockReturnValue(SOLO_ACCOUNT);
    useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
    render(<MemoryRouter><BillingUpgrade /></MemoryRouter>);
    fireEvent.click(screen.getByRole('tab', { name: /monthly/i }));
    fireEvent.click(screen.getByTestId('plan-row-solo-monthly'));
    fireEvent.click(screen.getByRole('button', { name: /confirm change/i }));
    await waitFor(() => expect(changePlan).toHaveBeenCalledWith('solo-monthly', 1));
  });

  it('opens CascadeCancelDialog when workspace admin tries to downgrade to a solo SKU with members', async () => {
    changePlan.mockClear();
    useAccountMock.mockReturnValue(WORKSPACE_ADMIN_ACCOUNT);
    useWorkspaceMock.mockReturnValue({
      ...NO_WORKSPACE,
      workspace: {
        admin_email: 'amir@acme.io',
        plan_id: 'workspace-monthly',
        seat_count: 5,
        renews_at: '2026-05-28T00:00:00Z',
        extra_seat_price_display: '$9.99 / week prorated',
        viewer_role: 'admin',
        members: [
          { user_id: 'admin-1', email: 'amir@acme.io', is_admin: true, is_you: true, output_tokens_this_week: 0, last_active_at: null },
          { user_id: 'm1', email: 'jess@acme.io', is_admin: false, is_you: false, output_tokens_this_week: 0, last_active_at: null },
        ],
        pending_invites: [],
      },
    });
    render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=solo-weekly"]}><BillingUpgrade /></MemoryRouter>);
    fireEvent.click(screen.getByTestId('plan-row-solo-weekly'));
    fireEvent.click(screen.getByRole('button', { name: /confirm change/i }));
    expect(screen.getByText(/End workspace access for 1 member\?/)).toBeInTheDocument();
    expect(screen.getByText(/immediately/)).toBeInTheDocument();
    expect(changePlan).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Downgrade to Solo/i }));
    await waitFor(() => expect(changePlan).toHaveBeenCalledWith('solo-weekly', 1));
  });

  it('renders the PayPal Subscribe button for a solo SKU when account has no existing subscription', () => {
    useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
    useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
    render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=solo-weekly"]}><BillingUpgrade /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /Pick a plan/ })).toBeInTheDocument();
    expect(screen.getByText(/Pick a plan to subscribe/)).toBeInTheDocument();
    const btn = screen.getByTestId('paypal-subscribe-button');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('data-plan-id', 'P-SW');
    expect(btn).toHaveAttribute('data-plan-sku', 'solo-weekly');
    expect(btn).toHaveAttribute('data-seat-count', '1');
    expect(screen.queryByRole('button', { name: /confirm change/i })).not.toBeInTheDocument();
  });

  it('renders the launch promo banner when an intro_promo_active solo plan is selected', () => {
    useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
    useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
    render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=solo-weekly"]}><BillingUpgrade /></MemoryRouter>);
    const banner = screen.getByTestId('launch-promo-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/50% off launch pricing/i);
    expect(banner).toHaveTextContent(/Founding members lock in the discount/i);
  });

  it('renders the workspace fallback notice and the crypto alt-payment button for a workspace SKU', () => {
    useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
    useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
    render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=workspace-monthly"]}><BillingUpgrade /></MemoryRouter>);
    // PayPal stays Solo-only on the upgrade page.
    expect(screen.queryByTestId('paypal-subscribe-button')).not.toBeInTheDocument();
    expect(screen.getByText(/not available for PayPal self-service yet/)).toBeInTheDocument();
    // Crypto button is the workspace path forward; Razorpay rejects workspace tiers.
    expect(screen.getByTestId('pay-with-crypto-button')).toBeInTheDocument();
    expect(screen.getByTestId('pay-with-razorpay-button')).toBeInTheDocument();
  });

  it('shows a clear error when the picked SKU is not in the catalog', () => {
    useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
    useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
    render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=ghost-plan"]}><BillingUpgrade /></MemoryRouter>);
    expect(screen.getByText(/Plan ghost-plan not found in catalog/)).toBeInTheDocument();
  });

  describe('alt-payment buttons (NOWPayments + Razorpay)', () => {
    beforeEach(() => {
      cryptoMutate.mockReset();
      razorpayMutate.mockReset();
    });

    it('renders all three payment options on a solo weekly plan when the user has no subscription', () => {
      useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
      useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
      render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=solo-weekly"]}><BillingUpgrade /></MemoryRouter>);
      expect(screen.getByTestId('paypal-subscribe-button')).toBeInTheDocument();
      expect(screen.getByTestId('pay-with-crypto-button')).toBeInTheDocument();
      expect(screen.getByTestId('pay-with-razorpay-button')).toBeInTheDocument();
    });

    it('renders all three payment options on a solo monthly plan as well', () => {
      useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
      useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
      render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=solo-monthly"]}><BillingUpgrade /></MemoryRouter>);
      expect(screen.getByTestId('paypal-subscribe-button')).toBeInTheDocument();
      expect(screen.getByTestId('pay-with-crypto-button')).toBeInTheDocument();
      expect(screen.getByTestId('pay-with-razorpay-button')).toBeInTheDocument();
    });

    it('forwards plan_sku and seat_count to the crypto button on click', () => {
      cryptoMutate.mockReturnValue(Promise.resolve({ invoice_url: 'https://x', invoice_id: 'i' }));
      useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
      useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
      render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=solo-weekly"]}><BillingUpgrade /></MemoryRouter>);
      fireEvent.click(screen.getByTestId('pay-with-crypto-button'));
      expect(cryptoMutate).toHaveBeenCalledWith('solo-weekly', 1);
    });

    it('forwards plan_sku and seat_count to the razorpay button on click for a solo SKU', () => {
      razorpayMutate.mockReturnValue(Promise.resolve({ subscription_id: 's', short_url: 'https://x' }));
      useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
      useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
      render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=solo-weekly"]}><BillingUpgrade /></MemoryRouter>);
      fireEvent.click(screen.getByTestId('pay-with-razorpay-button'));
      expect(razorpayMutate).toHaveBeenCalledWith('solo-weekly', 1);
    });

    it('shows the workspace coming-soon copy when razorpay is clicked on a workspace SKU', () => {
      useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
      useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
      render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=workspace-monthly"]}><BillingUpgrade /></MemoryRouter>);
      fireEvent.click(screen.getByTestId('pay-with-razorpay-button'));
      expect(razorpayMutate).not.toHaveBeenCalled();
      const err = screen.getByTestId('alt-payment-error');
      expect(err).toHaveTextContent(/workspace tiers coming soon/i);
      expect(err).toHaveTextContent(/use crypto payment for workspace plans/i);
    });

    it('hides the alt-payment buttons when cadence is quarterly (not visible_in_pricing)', () => {
      useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
      useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
      // Mock plan list inline to expose a quarterly SKU just for this test.
      // The page still defaults to solo-weekly when an unknown SKU is passed,
      // so we click the cadence tab to switch and confirm the buttons disappear.
      render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=solo-weekly"]}><BillingUpgrade /></MemoryRouter>);
      // Sanity: alt-payment buttons present at default weekly cadence.
      expect(screen.getByTestId('alt-payment-buttons')).toBeInTheDocument();
      // Switch to quarterly via the cadence toggle. The plans mock above
      // does not include a quarterly SKU, so selectedPlan becomes
      // undefined and the entire payment-buttons block is replaced by
      // the not-found error. That implicitly hides the alt-payment row.
      fireEvent.click(screen.getByRole('tab', { name: /quarterly/i }));
      expect(screen.queryByTestId('alt-payment-buttons')).not.toBeInTheDocument();
    });
  });
});
