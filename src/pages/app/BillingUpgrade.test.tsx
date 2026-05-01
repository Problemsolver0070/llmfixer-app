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
    ],
    loading: false, error: null, refresh: vi.fn(),
  }),
}));
const changePlan = vi.fn(async () => {});
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ subscription: null, loading: false, changePlan, activate: vi.fn(), cancel: vi.fn(), redeem: vi.fn() }),
}));
vi.mock('@/hooks/useAccount', () => ({
  useAccount: () => ({ data: { user: { id: 'u', email: 'a', status: 'active', plan_id: 'solo-weekly', seat_count: 1, paypal_sub_id: 'SUB-1' }, requests_this_week: 0, active_key_count: 0 }, loading: false, refresh: vi.fn() }),
}));

describe('BillingUpgrade', () => {
  it('confirms the change-plan call when user picks a different SKU and clicks confirm', async () => {
    render(<MemoryRouter><BillingUpgrade /></MemoryRouter>);
    fireEvent.click(screen.getByRole('tab', { name: /monthly/i }));
    fireEvent.click(screen.getByTestId('plan-row-solo-monthly'));
    fireEvent.click(screen.getByRole('button', { name: /confirm change/i }));
    await waitFor(() => expect(changePlan).toHaveBeenCalledWith('solo-monthly', 1));
  });
});
