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
  return { ApiError };
});

import BillingUpgrade from './BillingUpgrade';
import { ApiError } from '@/lib/api';

const paypalCreateSubscription = vi.fn();
const paypalOnApprove = vi.fn();
vi.mock('@paypal/react-paypal-js', () => ({
  PayPalButtons: (props: { createSubscription?: unknown; onApprove?: unknown; disabled?: boolean }) => {
    paypalCreateSubscription.mockImplementation(props.createSubscription as never);
    paypalOnApprove.mockImplementation(props.onApprove as never);
    return (
      <button
        type="button"
        data-testid="paypal-buttons-mock"
        disabled={props.disabled}
        onClick={async () => {
          const fakeActions = { subscription: { create: vi.fn(async () => 'SUB-NEW') } };
          await (props.createSubscription as (data: unknown, actions: unknown) => unknown)?.({}, fakeActions);
          await (props.onApprove as (data: { subscriptionID: string }) => Promise<void>)?.({ subscriptionID: 'SUB-NEW' });
        }}
      >
        PayPal Subscribe
      </button>
    );
  },
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
const activate = vi.fn(async () => {});
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ subscription: null, loading: false, changePlan, activate, cancel: vi.fn(), redeem: vi.fn() }),
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
    // Pick solo-weekly explicitly via the row.
    fireEvent.click(screen.getByTestId('plan-row-solo-weekly'));
    fireEvent.click(screen.getByRole('button', { name: /confirm change/i }));
    // Dialog must appear instead of immediately calling changePlan.
    expect(screen.getByText(/End workspace access for 1 member\?/)).toBeInTheDocument();
    expect(screen.getByText(/immediately/)).toBeInTheDocument();
    expect(changePlan).not.toHaveBeenCalled();
    // Confirm via the dialog destructive button.
    fireEvent.click(screen.getByRole('button', { name: /Downgrade to Solo/i }));
    await waitFor(() => expect(changePlan).toHaveBeenCalledWith('solo-weekly', 1));
  });

  it('renders PayPal Subscribe button when account has no existing subscription', () => {
    useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
    useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
    render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=solo-weekly"]}><BillingUpgrade /></MemoryRouter>);
    expect(screen.getByText(/Pick a plan/)).toBeInTheDocument();
    expect(screen.getByText(/Start with a 2-day free trial/)).toBeInTheDocument();
    expect(screen.getByTestId('paypal-buttons-mock')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm change/i })).not.toBeInTheDocument();
  });

  it('drives PayPal createSubscription with the picked SKU plan_id and qty=1 for solo', async () => {
    activate.mockClear();
    useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
    useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
    render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=solo-weekly"]}><BillingUpgrade /></MemoryRouter>);
    fireEvent.click(screen.getByTestId('paypal-buttons-mock'));
    await waitFor(() => expect(activate).toHaveBeenCalledWith('SUB-NEW', 'solo-weekly', 1, null));
  });

  it('drives PayPal createSubscription with TIERED quantity for workspace plans', async () => {
    activate.mockClear();
    useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
    useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
    render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=workspace-monthly"]}><BillingUpgrade /></MemoryRouter>);
    expect(screen.getByText(/4 seats/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('paypal-buttons-mock'));
    await waitFor(() => expect(activate).toHaveBeenCalledWith('SUB-NEW', 'workspace-monthly', 4, null));
  });

  it('passes the discount code to activate when filled in', async () => {
    activate.mockClear();
    activate.mockResolvedValueOnce(undefined);
    useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
    useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
    render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=solo-weekly"]}><BillingUpgrade /></MemoryRouter>);
    const field = screen.getByLabelText(/discount code/i);
    await userEvent.type(field, 'PROMO10');
    fireEvent.click(screen.getByTestId('paypal-buttons-mock'));
    await waitFor(() =>
      expect(activate).toHaveBeenCalledWith('SUB-NEW', 'solo-weekly', 1, 'PROMO10'),
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
    activate.mockClear();
    activate.mockRejectedValueOnce(
      new ApiError(400, {
        detail: { error_code: 'discount_code_not_found', message: 'no such code' },
      }),
    );
    useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
    useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
    render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=solo-weekly"]}><BillingUpgrade /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/discount code/i), 'BADCODE');
    fireEvent.click(screen.getByTestId('paypal-buttons-mock'));
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
    activate.mockClear();
    activate.mockRejectedValueOnce(
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
    fireEvent.click(screen.getByTestId('paypal-buttons-mock'));
    const alert = await screen.findByText(/doesn't apply to the plan/i);
    expect(alert).toBeInTheDocument();
  });

  it('clears the inline discount error when the user edits the field again', async () => {
    activate.mockClear();
    activate.mockRejectedValueOnce(
      new ApiError(400, {
        detail: { error_code: 'discount_code_expired', message: 'expired' },
      }),
    );
    useAccountMock.mockReturnValue(TRIAL_ACCOUNT);
    useWorkspaceMock.mockReturnValue(NO_WORKSPACE);
    render(<MemoryRouter initialEntries={["/app/billing/upgrade?plan=solo-weekly"]}><BillingUpgrade /></MemoryRouter>);
    const field = screen.getByLabelText(/discount code/i);
    await userEvent.type(field, 'OLDCODE');
    fireEvent.click(screen.getByTestId('paypal-buttons-mock'));
    await screen.findByText(/code has expired/i);
    await userEvent.type(field, 'X');
    await waitFor(() => {
      expect(screen.queryByText(/code has expired/i)).toBeNull();
    });
  });
});
