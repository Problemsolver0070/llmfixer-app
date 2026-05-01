import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BillingUpgrade from './BillingUpgrade';

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
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ subscription: null, loading: false, changePlan, activate: vi.fn(), cancel: vi.fn(), redeem: vi.fn() }),
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
});
