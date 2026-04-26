import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CreatePromoForm } from './CreatePromoForm';

describe('CreatePromoForm', () => {
  it('submits a free_time promo with required fields', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<CreatePromoForm onCreate={onCreate} />);
    await userEvent.type(screen.getByLabelText(/code/i), 'GIFT');
    await userEvent.selectOptions(screen.getByLabelText(/type/i), 'free_time');
    await userEvent.clear(screen.getByLabelText(/amount/i));
    await userEvent.type(screen.getByLabelText(/amount/i), '14');
    await userEvent.click(screen.getByRole('button', { name: /create promo/i }));
    expect(onCreate).toHaveBeenCalledWith({
      code: 'GIFT',
      type: 'free_time',
      amount_int: 14,
      max_redemptions: null,
      expires_at: null,
      active: true,
    });
  });
});
