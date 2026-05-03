import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CancelSubModal } from './CancelSubModal';
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

describe('CancelSubModal', () => {
  it('requires CANCEL typed and a reason', async () => {
    render(
      <CancelSubModal
        open
        user={baseUser}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const submit = screen.getByRole('button', { name: /cancel subscription/i });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/reason/i), 'r');
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/type CANCEL/i), 'CANCEL');
    expect(submit).not.toBeDisabled();
  });

  it('submits refund + reason', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <CancelSubModal
        open
        user={baseUser}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    await userEvent.click(screen.getByLabelText(/refund the most recent/i));
    await userEvent.type(screen.getByLabelText(/reason/i), 'churn');
    await userEvent.type(screen.getByLabelText(/type CANCEL/i), 'CANCEL');
    await userEvent.click(
      screen.getByRole('button', { name: /cancel subscription/i }),
    );
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ refund: true, reason: 'churn' });
  });
});
