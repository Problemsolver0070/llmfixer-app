import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { RefundChargeModal } from './RefundChargeModal';
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

describe('RefundChargeModal', () => {
  it('disables submit when capture id, reason, or REFUND is missing', async () => {
    render(
      <RefundChargeModal
        open
        user={baseUser}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const submit = screen.getByRole('button', { name: /issue refund/i });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/capture id/i), 'CAP-1');
    await userEvent.type(screen.getByLabelText(/reason/i), 'duplicate');
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/type REFUND/i), 'REFUND');
    expect(submit).not.toBeDisabled();
  });

  it('submits a full refund (no amount)', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <RefundChargeModal
        open
        user={baseUser}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    await userEvent.type(screen.getByLabelText(/capture id/i), 'CAP-1');
    await userEvent.type(screen.getByLabelText(/reason/i), 'duplicate');
    await userEvent.type(screen.getByLabelText(/type REFUND/i), 'REFUND');
    await userEvent.click(screen.getByRole('button', { name: /issue refund/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      capture_id: 'CAP-1',
      reason: 'duplicate',
    });
  });

  it('submits a partial refund', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <RefundChargeModal
        open
        user={baseUser}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    await userEvent.type(screen.getByLabelText(/capture id/i), 'CAP-2');
    await userEvent.type(screen.getByLabelText(/amount/i), '500');
    await userEvent.type(screen.getByLabelText(/reason/i), 'partial');
    await userEvent.type(screen.getByLabelText(/type REFUND/i), 'REFUND');
    await userEvent.click(screen.getByRole('button', { name: /issue refund/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      capture_id: 'CAP-2',
      amount_cents: 500,
      reason: 'partial',
    });
  });
});
