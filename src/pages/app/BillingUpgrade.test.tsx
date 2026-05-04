import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  const api = vi.fn(async (path: string) => {
    if (path === '/v1/billing/paypal/setup-token') return { setup_token: 'SETUP-TOKEN-1' };
    if (path === '/v1/billing/subscriptions/activate-with-card') return { account: {} };
    return {};
  });
  return { api, ApiError };
});

import BillingUpgrade from './BillingUpgrade';
import { ApiError } from '@/lib/api';

let onApproveCapture: null | ((data: { orderID: string }) => Promise<void>) = null;
vi.mock('@paypal/react-paypal-js', () => ({
  PayPalCardFieldsProvider: (props: { createVaultSetupToken?: unknown; onApprove?: unknown; onError?: unknown; children?: unknown }) => {
    onApproveCapture = props.onApprove as typeof onApproveCapture;
    return <div data-testid="card-fields-provider">{props.children as React.ReactNode}</div>;
  },
  PayPalNumberField: () => <div data-testid="paypal-number-field" />,
  PayPalNameField: () => <div data-testid="paypal-name-field" />,
  PayPalExpiryField: () => <div data-testid="paypal-expiry-field" />,
  PayPalCVVField: () => <div data-testid="paypal-cvv-field" />,
  usePayPalCardFields: () => ({
    cardFieldsForm: {
      submit: async () => {
        await onApproveCapture?.({ orderID: 'SETUP-TOKEN-1' });
      },
    },
  }),
  PayPalScriptProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePayPalScriptReducer: () => [{ isInitial: false }, vi.fn()],
  DISPATCH_ACTION: { LOADING_STATUS: 'setLoadingStatus' },
  SCRIPT_LOADING_STATE: { INITIAL: 'initial', PENDING: 'pending', RESOLVED: 'resolved', REJECTED: 'rejected' },
}));

vi.mock('@/hooks/usePlans', () => ({
  usePlans: () => ({
    plans: [
      { sku: 'solo-weekly', tier: 'solo', cadence: 'weekly', paypal_plan_id: 'P-SW',
        base_price_cents: 1999, per_seat_price_cents: null, included_seats: 1,
        display_price: '$19.99 / week', discount_pct: 0, trial_days: 2 },
      { sku: 'solo-monthly', tier: 'solo', cadence: 'monthly', paypal_plan_id: 'P-SM',
        base_price_cents: 7900, per_seat_price_cents: null, included_seats: 1,
        display_price: '$79 / month', discount_pct: 9, trial_days: 2 },
      { sku: 'workspace-monthly', tier: 'workspace', cadence: 'monthly', paypal_plan_id: 'P-WM',
        base_price_cents: 15900, per_seat_price_cents: 4900, included_seats: 4,
        display_price: '$159 / month', discount_pct: 9, trial_days: 2 },
    ],
    loading: false, error: null, refresh: vi.fn(),
  }),
}));
const changePlan = vi.fn(async () => {});
const activateWithCard = vi.fn(async () => {});
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ subscription: null, loading: false, changePlan, activateWithCard, cancel: vi.fn(), redeem: vi.fn() }),
}));
const useAccountMock = vi.fn();
vi.mock('@/hooks/useAccount', () => ({
  useAccount: () => useAccountMock(),
}));
const useWorkspaceMock = vi.fn();
vi.mock('@/hooks/useWorkspace', () => ({
  useWorkspace: () => useWorkspaceMock(),
}));
vi.mock('@/hooks/usePayPalClientToken', () => ({
  usePayPalClientToken: () => ({ clientToken: 'test-client-token', loading: false, error: null }),
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

  it('renders Card Fields when account has no existing subscription', () => {
    useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
    useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
    render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=solo-weekly"]}><BillingUpgrade /></MemoryRouter>);
    expect(screen.getByText(/Pick a plan/)).toBeInTheDocument();
    expect(screen.getByText(/Start with a 24-hour free trial/)).toBeInTheDocument();
    expect(screen.getByTestId('card-fields-provider')).toBeInTheDocument();
    expect(screen.getByTestId('paypal-name-field')).toBeInTheDocument();
    expect(screen.getByTestId('paypal-number-field')).toBeInTheDocument();
    expect(screen.getByTestId('paypal-expiry-field')).toBeInTheDocument();
    expect(screen.getByTestId('paypal-cvv-field')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm change/i })).not.toBeInTheDocument();
  });

  it('calls activateWithCard with the picked SKU and qty=1 for solo on submit', async () => {
    activateWithCard.mockClear();
    useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
    useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
    render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=solo-weekly"]}><BillingUpgrade /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /pay and start trial/i }));
    await waitFor(() => expect(activateWithCard).toHaveBeenCalledWith('solo-weekly', 1, 'SETUP-TOKEN-1', null));
  });

  it('calls activateWithCard with correct seat count for workspace plans', async () => {
    activateWithCard.mockClear();
    useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
    useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
    render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=workspace-monthly"]}><BillingUpgrade /></MemoryRouter>);
    expect(screen.getByText(/4 seats/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /pay and start trial/i }));
    await waitFor(() => expect(activateWithCard).toHaveBeenCalledWith('workspace-monthly', 4, 'SETUP-TOKEN-1', null));
  });

  it('passes the discount code to activateWithCard when filled in', async () => {
    activateWithCard.mockClear();
    activateWithCard.mockResolvedValueOnce(undefined);
    useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
    useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
    render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=solo-weekly"]}><BillingUpgrade /></MemoryRouter>);
    const field = screen.getByLabelText(/discount code/i);
    await userEvent.type(field, 'PROMO10');
    fireEvent.click(screen.getByRole('button', { name: /pay and start trial/i }));
    await waitFor(() =>
      expect(activateWithCard).toHaveBeenCalledWith('solo-weekly', 1, 'SETUP-TOKEN-1', 'PROMO10'),
    );
  });

  it('uppercases the discount code as the user types', async () => {
    useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
    useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
    render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=solo-weekly"]}><BillingUpgrade /></MemoryRouter>);
    const field = screen.getByLabelText(/discount code/i) as HTMLInputElement;
    await userEvent.type(field, 'promo30');
    expect(field.value).toBe('PROMO30');
  });

  it('surfaces discount_code_not_found inline below the discount field, not as the activate-level error', async () => {
    activateWithCard.mockClear();
    activateWithCard.mockRejectedValueOnce(
      new ApiError(400, {
        detail: { error_code: 'discount_code_not_found', message: 'no such code' },
      }),
    );
    useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
    useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
    render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=solo-weekly"]}><BillingUpgrade /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/discount code/i), 'BADCODE');
    fireEvent.click(screen.getByRole('button', { name: /pay and start trial/i }));
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      const found = alerts.some((el) =>
        /couldn't find that code/i.test(el.textContent ?? ''),
      );
      expect(found).toBe(true);
    });
    // The activate-level generic error block must not have rendered.
    expect(screen.queryByText(/^error:/i)).toBeNull();
  });

  it('surfaces discount_code_not_applicable_to_plan inline', async () => {
    activateWithCard.mockClear();
    activateWithCard.mockRejectedValueOnce(
      new ApiError(400, {
        detail: {
          error_code: 'discount_code_not_applicable_to_plan',
          message: 'wrong plan',
        },
      }),
    );
    useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
    useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
    render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=solo-weekly"]}><BillingUpgrade /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/discount code/i), 'WRONGSKU');
    fireEvent.click(screen.getByRole('button', { name: /pay and start trial/i }));
    const alert = await screen.findByText(/doesn't apply to the plan/i);
    expect(alert).toBeInTheDocument();
  });

  it('clears the inline discount error when the user edits the field again', async () => {
    activateWithCard.mockClear();
    activateWithCard.mockRejectedValueOnce(
      new ApiError(400, {
        detail: { error_code: 'discount_code_expired', message: 'expired' },
      }),
    );
    useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
    useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
    render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=solo-weekly"]}><BillingUpgrade /></MemoryRouter>);
    const field = screen.getByLabelText(/discount code/i);
    await userEvent.type(field, 'OLDCODE');
    fireEvent.click(screen.getByRole('button', { name: /pay and start trial/i }));
    await screen.findByText(/code has expired/i);
    await userEvent.type(field, 'X');
    await waitFor(() => {
      expect(screen.queryByText(/code has expired/i)).toBeNull();
    });
  });
});
