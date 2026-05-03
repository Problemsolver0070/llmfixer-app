import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/hooks/usePlans', () => ({
  usePlans: () => ({
    plans: [
      {
        sku: 'SOLO_WEEKLY',
        tier: 'solo',
        cadence: 'weekly',
        paypal_plan_id: 'P-1',
        base_price_cents: 999,
        per_seat_price_cents: null,
        included_seats: 1,
        display_price: '$9.99/wk',
        discount_pct: 0,
        trial_days: 2,
      },
      {
        sku: 'WORKSPACE_MONTHLY',
        tier: 'workspace',
        cadence: 'monthly',
        paypal_plan_id: 'P-2',
        base_price_cents: 4999,
        per_seat_price_cents: 999,
        included_seats: 1,
        display_price: '$49.99/mo',
        discount_pct: 9,
        trial_days: 2,
      },
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

import { ChangePlanModal } from './ChangePlanModal';
import type { AdminUserDetail } from '@/hooks/useAdminUser';

const baseUser: AdminUserDetail = {
  id: 'u-1',
  email: 'a@b.c',
  full_name: null,
  role: 'user',
  status: 'active',
  plan_id: 'SOLO_WEEKLY',
  seat_count: 1,
  paypal_sub_id: null,
  paypal_sub_status: null,
  comp_until: null,
  trial_ends_at: null,
  cancels_at: null,
  output_tokens_this_week: 0,
  requests_this_week: 0,
  output_token_override_per_week: null,
  requests_override_per_week: null,
  created_at: '2026-01-01T00:00:00Z',
  last_active_at: null,
};

describe('ChangePlanModal', () => {
  it('shows the active PayPal warning when applicable', () => {
    render(
      <ChangePlanModal
        open
        user={{
          ...baseUser,
          paypal_sub_id: 'I-99',
          paypal_sub_status: 'ACTIVE',
        }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/active PayPal/i);
  });

  it('disables submit until plan + reason are filled', async () => {
    render(
      <ChangePlanModal
        open
        user={baseUser}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const submit = screen.getByRole('button', { name: /change plan/i });
    expect(submit).toBeDisabled();
    await userEvent.selectOptions(
      screen.getByLabelText(/^new plan$/i),
      'SOLO_WEEKLY',
    );
    await userEvent.type(screen.getByLabelText(/reason/i), 'r');
    expect(submit).not.toBeDisabled();
  });

  it('submits new_plan_sku + prorate + reason', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <ChangePlanModal
        open
        user={baseUser}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    await userEvent.selectOptions(
      screen.getByLabelText(/^new plan$/i),
      'SOLO_WEEKLY',
    );
    await userEvent.type(screen.getByLabelText(/reason/i), 'requested upgrade');
    await userEvent.click(screen.getByRole('button', { name: /change plan/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      new_plan_sku: 'SOLO_WEEKLY',
      prorate: true,
      reason: 'requested upgrade',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('requires seat count for workspace plans', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ChangePlanModal
        open
        user={baseUser}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    await userEvent.selectOptions(
      screen.getByLabelText(/^new plan$/i),
      'WORKSPACE_MONTHLY',
    );
    expect(screen.getByLabelText(/seat count/i)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/seat count/i));
    await userEvent.type(screen.getByLabelText(/seat count/i), '3');
    await userEvent.type(screen.getByLabelText(/reason/i), 'team plan');
    await userEvent.click(screen.getByRole('button', { name: /change plan/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      new_plan_sku: 'WORKSPACE_MONTHLY',
      prorate: true,
      new_seat_count: 3,
      reason: 'team plan',
    });
  });
});
