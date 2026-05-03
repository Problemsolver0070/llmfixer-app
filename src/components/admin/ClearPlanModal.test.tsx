import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ClearPlanModal } from './ClearPlanModal';
import type { AdminUserDetail } from '@/hooks/useAdminUser';

const baseUser: AdminUserDetail = {
  id: 'u-1',
  email: 'a@b.c',
  full_name: null,
  role: 'user',
  status: 'active',
  plan_id: 'SOLO_WEEKLY',
  seat_count: 1,
  paypal_sub_id: 'I-1',
  paypal_sub_status: 'ACTIVE',
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

describe('ClearPlanModal', () => {
  it('disables submit until reason + CLEAR typed', async () => {
    render(
      <ClearPlanModal
        open
        user={baseUser}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const submit = screen.getByRole('button', { name: /^clear plan$/i });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/reason/i), 'fraud');
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/type CLEAR/i), 'CLEAR');
    expect(submit).not.toBeDisabled();
  });

  it('typed confirmation is case-sensitive', async () => {
    render(
      <ClearPlanModal
        open
        user={baseUser}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    await userEvent.type(screen.getByLabelText(/reason/i), 'r');
    await userEvent.type(screen.getByLabelText(/type CLEAR/i), 'clear');
    expect(screen.getByRole('button', { name: /^clear plan$/i })).toBeDisabled();
  });

  it('submits the toggles + reason', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <ClearPlanModal
        open
        user={baseUser}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    await userEvent.click(screen.getByLabelText(/refund the most recent/i));
    await userEvent.type(screen.getByLabelText(/reason/i), 'chargeback');
    await userEvent.type(screen.getByLabelText(/type CLEAR/i), 'CLEAR');
    await userEvent.click(screen.getByRole('button', { name: /^clear plan$/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      cancel_paypal_sub: true,
      refund_recent_charge: true,
      reason: 'chargeback',
    });
    expect(onClose).toHaveBeenCalled();
  });
});
