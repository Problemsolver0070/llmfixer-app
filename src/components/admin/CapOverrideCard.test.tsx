import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CapOverrideCard } from './CapOverrideCard';
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

describe('CapOverrideCard', () => {
  it('disables save when reason is empty', () => {
    render(<CapOverrideCard user={baseUser} onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: /save caps/i })).toBeDisabled();
  });

  it('sends numeric overrides', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CapOverrideCard user={baseUser} onSubmit={onSubmit} />);
    await userEvent.type(
      screen.getByLabelText(/output tokens override/i),
      '50000',
    );
    await userEvent.type(screen.getByLabelText(/reason/i), 'bump');
    await userEvent.click(screen.getByRole('button', { name: /save caps/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      output_token_override_per_week: 50000,
      reason: 'bump',
    });
  });

  it('clear toggle sends set_output_to_null', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <CapOverrideCard
        user={{ ...baseUser, output_token_override_per_week: 100 }}
        onSubmit={onSubmit}
      />,
    );
    await userEvent.click(
      screen.getAllByLabelText(/clear override/i)[0],
    );
    await userEvent.type(screen.getByLabelText(/reason/i), 'reset');
    await userEvent.click(screen.getByRole('button', { name: /save caps/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      set_output_to_null: true,
      reason: 'reset',
    });
  });

  it('rejects negative numbers', async () => {
    const onSubmit = vi.fn();
    render(<CapOverrideCard user={baseUser} onSubmit={onSubmit} />);
    const input = screen.getByLabelText(/output tokens override/i);
    // Negative number input behavior varies; type directly with fireEvent-like
    // approach via userEvent.
    await userEvent.type(input, '-5');
    await userEvent.type(screen.getByLabelText(/reason/i), 'r');
    await userEvent.click(screen.getByRole('button', { name: /save caps/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /non-negative/i,
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
