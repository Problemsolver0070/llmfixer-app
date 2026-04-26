import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: unknown, message?: string) {
      super(message ?? `API error ${status}`);
      this.status = status;
      this.body = body;
    }
  },
  api: vi.fn(),
}));

import { RedeemPromoForm } from './RedeemPromoForm';

describe('RedeemPromoForm', () => {
  it('submits the code and shows the success message from applied_effect', async () => {
    const redeem = vi.fn().mockResolvedValue({
      applied_effect: { type: 'free_time', days_added: 30, new_trial_ends_at: '2026-05-27T11:36:00Z' },
    });
    render(<RedeemPromoForm onRedeem={redeem} />);
    await userEvent.type(screen.getByLabelText(/promo code/i), 'PARTY30');
    await userEvent.click(screen.getByRole('button', { name: /redeem/i }));
    expect(redeem).toHaveBeenCalledWith('PARTY30');
    await waitFor(() => expect(screen.getByText(/30 days/i)).toBeInTheDocument());
  });

  it('shows the server-supplied error reason verbatim', async () => {
    const err = Object.assign(new Error('400'), {
      status: 400,
      body: { reason: 'invalid' },
    });
    const redeem = vi.fn().mockRejectedValue(err);
    render(<RedeemPromoForm onRedeem={redeem} />);
    await userEvent.type(screen.getByLabelText(/promo code/i), 'NOPE');
    await userEvent.click(screen.getByRole('button', { name: /redeem/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/not valid/i));
  });
});
