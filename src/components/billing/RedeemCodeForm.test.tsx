import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();

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
  return { api: (...a: unknown[]) => apiCall(...a), ApiError };
});

import { RedeemCodeForm } from './RedeemCodeForm';
import { ApiError } from '@/lib/api';

const SUCCESS_PAYLOAD = {
  granted_plan_id: 'solo-monthly',
  granted_seat_count: 1,
  granted_seconds: 2_592_000,
  new_comp_until: '2026-06-02T12:00:00Z',
  new_status: 'comped',
};

function getRedeemButton() {
  return screen.getByRole('button', { name: /redeem/i });
}

describe('RedeemCodeForm', () => {
  beforeEach(() => {
    apiCall.mockReset();
  });

  it('disables the button on empty input', () => {
    render(<RedeemCodeForm />);
    expect(getRedeemButton()).toBeDisabled();
  });

  it('disables the button on whitespace-only input', async () => {
    render(<RedeemCodeForm />);
    const input = screen.getByLabelText(/^code$/i);
    await userEvent.type(input, '   ');
    expect(getRedeemButton()).toBeDisabled();
  });

  it('uppercases the code as the user types', async () => {
    render(<RedeemCodeForm />);
    const input = screen.getByLabelText(/^code$/i) as HTMLInputElement;
    await userEvent.type(input, 'abc123');
    expect(input.value).toBe('ABC123');
  });

  it('sends the trimmed code, fires onRedeemed, and renders success block', async () => {
    apiCall.mockResolvedValueOnce(SUCCESS_PAYLOAD);
    const onRedeemed = vi.fn();
    render(<RedeemCodeForm onRedeemed={onRedeemed} />);
    const input = screen.getByLabelText(/^code$/i);
    await userEvent.type(input, '  GIFT30  ');
    await userEvent.click(getRedeemButton());

    await waitFor(() => {
      expect(apiCall).toHaveBeenCalledWith('/v1/codes/redeem', {
        method: 'POST',
        body: { code: 'GIFT30', reason: null },
      });
    });
    expect(onRedeemed).toHaveBeenCalledWith(SUCCESS_PAYLOAD);

    const status = await screen.findByRole('status');
    // 2_592_000s = 30 days
    expect(status).toHaveTextContent(/30 days of access added/i);
    expect(status).toHaveTextContent(/new expiry:/i);
    // Field is cleared on success.
    expect((input as HTMLInputElement).value).toBe('');
  });

  it.each([
    ['code_not_found', /couldn't find that code/i],
    ['code_expired', /code has expired/i],
    ['code_exhausted', /usage limit/i],
    ['code_bound_to_other_user', /different account/i],
    ['code_already_redeemed', /already redeemed/i],
    ['code_blocked_active_subscription', /active subscription/i],
    ['code_plan_unavailable', /no longer available/i],
  ])('renders user-facing copy for error_code=%s', async (errorCode, expected) => {
    apiCall.mockRejectedValueOnce(
      new ApiError(409, { detail: { error_code: errorCode, message: 'backend copy' } }),
    );
    render(<RedeemCodeForm />);
    await userEvent.type(screen.getByLabelText(/^code$/i), 'BADCODE');
    await userEvent.click(getRedeemButton());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(expected);
  });

  it('renders the generic fallback for an unknown error_code', async () => {
    apiCall.mockRejectedValueOnce(
      new ApiError(500, { detail: { error_code: 'mystery', message: 'huh' } }),
    );
    render(<RedeemCodeForm />);
    await userEvent.type(screen.getByLabelText(/^code$/i), 'X');
    await userEvent.click(getRedeemButton());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/something went wrong/i);
  });

  it('renders the generic fallback for a network error', async () => {
    apiCall.mockRejectedValueOnce(new Error('network down'));
    render(<RedeemCodeForm />);
    await userEvent.type(screen.getByLabelText(/^code$/i), 'X');
    await userEvent.click(getRedeemButton());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/something went wrong/i);
  });

  it('clears the inline error when the user edits the field again', async () => {
    apiCall.mockRejectedValueOnce(
      new ApiError(404, { detail: { error_code: 'code_not_found', message: 'no' } }),
    );
    render(<RedeemCodeForm />);
    const input = screen.getByLabelText(/^code$/i);
    await userEvent.type(input, 'NOPE');
    await userEvent.click(getRedeemButton());
    await screen.findByRole('alert');
    await userEvent.type(input, 'X');
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('does not POST when the input is whitespace only (button disabled)', async () => {
    render(<RedeemCodeForm />);
    const input = screen.getByLabelText(/^code$/i);
    await userEvent.type(input, '   ');
    // The submit button is disabled, so click is a no-op.
    await userEvent.click(getRedeemButton());
    expect(apiCall).not.toHaveBeenCalled();
  });
});
