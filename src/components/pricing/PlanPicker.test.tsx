import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PlanPicker } from './PlanPicker';

const PLANS = [
  { sku: 'solo-weekly', tier: 'solo', cadence: 'weekly', display_price: '$19.99 / week', included_seats: 1, paypal_plan_id: 'P-SW', base_price_cents: 1999, per_seat_price_cents: null, discount_pct: 0, trial_days: 2 },
  { sku: 'workspace-weekly', tier: 'workspace', cadence: 'weekly', display_price: '$39.99 / week + $9.99 / extra seat', included_seats: 4, paypal_plan_id: 'P-WW', base_price_cents: 3999, per_seat_price_cents: 999, discount_pct: 0, trial_days: 2 },
];

describe('PlanPicker', () => {
  it('renders one row per plan and marks the current SKU', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<PlanPicker plans={PLANS as any} currentSku="solo-weekly" cadence="weekly" seatCount={1} onPickPlan={() => {}} onSeatCountChange={() => {}} />);
    expect(screen.getByText(/solo-weekly/)).toBeInTheDocument();
    expect(screen.getByTestId('plan-row-solo-weekly')).toHaveAttribute('data-current', 'true');
    expect(screen.getByTestId('plan-row-workspace-weekly')).toHaveAttribute('data-current', 'false');
  });

  it('fires onPickPlan with the SKU', () => {
    const onPickPlan = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<PlanPicker plans={PLANS as any} currentSku="solo-weekly" cadence="weekly" seatCount={1} onPickPlan={onPickPlan} onSeatCountChange={() => {}} />);
    fireEvent.click(screen.getByTestId('plan-row-workspace-weekly'));
    expect(onPickPlan).toHaveBeenCalledWith('workspace-weekly');
  });
});
