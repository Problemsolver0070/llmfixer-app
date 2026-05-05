import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { StateOverrideCard } from './StateOverrideCard';
import type { AdminUserDetail } from '@/hooks/useAdminUser';

const baseUser: AdminUserDetail = {
  id: 'u-1',
  email: 'a@b.c',
  full_name: null,
  role: 'user',
  status: 'active',
  plan_id: null,
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

describe('StateOverrideCard', () => {
  it('disables save when reason is empty', () => {
    render(<StateOverrideCard user={baseUser} onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: /save state/i })).toBeDisabled();
  });

  it('rejects save with no changes', async () => {
    const onSubmit = vi.fn();
    render(<StateOverrideCard user={baseUser} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/reason/i), 'something');
    await userEvent.click(screen.getByRole('button', { name: /save state/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no changes/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clear toggle sends set_comp_until_to_null', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onSaved = vi.fn();
    render(
      <StateOverrideCard
        user={{ ...baseUser, comp_until: '2099-01-01T00:00:00Z' }}
        onSubmit={onSubmit}
        onSaved={onSaved}
      />,
    );
    await userEvent.click(
      screen.getByLabelText(/clear comp_until/i),
    );
    await userEvent.type(screen.getByLabelText(/reason/i), 'expired');
    await userEvent.click(screen.getByRole('button', { name: /save state/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      set_comp_until_to_null: true,
      reason: 'expired',
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it('status change is sent in the body', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<StateOverrideCard user={baseUser} onSubmit={onSubmit} />);
    await userEvent.selectOptions(
      screen.getByLabelText(/^status$/i),
      'expired',
    );
    await userEvent.type(screen.getByLabelText(/reason/i), 'fraud');
    await userEvent.click(screen.getByRole('button', { name: /save state/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ status: 'expired', reason: 'fraud' });
  });

  it('surfaces backend errors', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('boom'));
    render(<StateOverrideCard user={baseUser} onSubmit={onSubmit} />);
    await userEvent.selectOptions(
      screen.getByLabelText(/^status$/i),
      'expired',
    );
    await userEvent.type(screen.getByLabelText(/reason/i), 'r');
    await userEvent.click(screen.getByRole('button', { name: /save state/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/boom/i);
  });
});
