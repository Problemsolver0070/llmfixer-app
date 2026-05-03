import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => apiMock(...args) }));

const planList = [
  {
    sku: 'solo-weekly',
    tier: 'solo' as const,
    cadence: 'weekly' as const,
    paypal_plan_id: 'P-W',
    base_price_cents: 999,
    per_seat_price_cents: null,
    included_seats: 1,
    display_price: '$9.99/wk',
    discount_pct: 0,
    trial_days: 2,
  },
  {
    sku: 'solo-monthly',
    tier: 'solo' as const,
    cadence: 'monthly' as const,
    paypal_plan_id: 'P-M',
    base_price_cents: 3499,
    per_seat_price_cents: null,
    included_seats: 1,
    display_price: '$34.99/mo',
    discount_pct: 9,
    trial_days: 2,
  },
  {
    sku: 'workspace-monthly',
    tier: 'workspace' as const,
    cadence: 'monthly' as const,
    paypal_plan_id: 'P-WS',
    base_price_cents: 9999,
    per_seat_price_cents: 1999,
    included_seats: 4,
    display_price: '$99.99/mo',
    discount_pct: 9,
    trial_days: 2,
  },
];
vi.mock('@/hooks/usePlans', () => ({
  usePlans: () => ({ plans: planList, loading: false, error: null, refresh: vi.fn() }),
}));

import { MintDiscountCodeForm } from './MintDiscountCodeForm';

beforeEach(() => {
  apiMock.mockReset();
});

describe('MintDiscountCodeForm', () => {
  it('lists every SKU (solo + workspace) as a multi-select chip', async () => {
    render(<MintDiscountCodeForm />);
    expect(await screen.findByTestId('applies-to-solo-weekly')).toBeInTheDocument();
    expect(screen.getByTestId('applies-to-solo-monthly')).toBeInTheDocument();
    expect(screen.getByTestId('applies-to-workspace-monthly')).toBeInTheDocument();
    expect(screen.getByText(/applies to all plans\.?/i)).toBeInTheDocument();
  });

  it('rejects submit when reason is missing', async () => {
    render(<MintDiscountCodeForm />);
    await userEvent.click(screen.getByRole('button', { name: /mint code/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/reason is required/i);
    expect(apiMock).not.toHaveBeenCalled();
  });

  it('rejects discount_pct below 1', async () => {
    render(<MintDiscountCodeForm />);
    const pct = screen.getByLabelText(/discount %/i);
    await userEvent.clear(pct);
    await userEvent.type(pct, '0');
    await userEvent.type(screen.getByLabelText(/reason/i), 'test');
    await userEvent.click(screen.getByRole('button', { name: /mint code/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 1%/i);
  });

  it('rejects discount_pct above 100', async () => {
    render(<MintDiscountCodeForm />);
    const pct = screen.getByLabelText(/discount %/i);
    await userEvent.clear(pct);
    await userEvent.type(pct, '120');
    await userEvent.type(screen.getByLabelText(/reason/i), 'test');
    await userEvent.click(screen.getByRole('button', { name: /mint code/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot exceed 100/i);
  });

  it('toggles applies_to chips and submits the picked SKUs', async () => {
    apiMock.mockResolvedValueOnce({
      id: 'd1',
      code: 'PROMO10AA',
      discount_pct: 10,
      max_uses: 1,
      used_count: 0,
      expires_at: null,
      applies_to_plan_skus: ['solo-monthly', 'workspace-monthly'],
      batch_id: null,
      notes: null,
      created_by: 'admin1',
      created_at: '2026-05-03T00:00:00Z',
    });
    render(<MintDiscountCodeForm />);
    await userEvent.click(screen.getByTestId('applies-to-solo-monthly'));
    await userEvent.click(screen.getByTestId('applies-to-workspace-monthly'));
    expect(screen.getByText(/restricted to 2 plans\.?/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/reason/i), 'launch');
    await userEvent.click(screen.getByRole('button', { name: /mint code/i }));

    await waitFor(() => expect(apiMock).toHaveBeenCalledTimes(1));
    expect(apiMock.mock.calls[0][0]).toBe('/v1/admin/codes/discount');
    expect(apiMock.mock.calls[0][1].body).toMatchObject({
      discount_pct: 10,
      max_uses: 1,
      applies_to_plan_skus: ['solo-monthly', 'workspace-monthly'],
      reason: 'launch',
    });
    expect(await screen.findByText('PROMO10AA')).toBeInTheDocument();
    expect(screen.getByText(/discount code minted \(10% off\)/i)).toBeInTheDocument();
  });

  it('un-toggling a chip removes the SKU from the submitted list', async () => {
    apiMock.mockResolvedValueOnce({
      id: 'd2',
      code: 'XYZ',
      discount_pct: 15,
      max_uses: 1,
      used_count: 0,
      expires_at: null,
      applies_to_plan_skus: [],
      batch_id: null,
      notes: null,
      created_by: 'admin1',
      created_at: '2026-05-03T00:00:00Z',
    });
    render(<MintDiscountCodeForm />);
    const chip = screen.getByTestId('applies-to-solo-weekly');
    await userEvent.click(chip);
    await userEvent.click(chip); // toggle off
    expect(screen.getByText(/applies to all plans\.?/i)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/discount %/i));
    await userEvent.type(screen.getByLabelText(/discount %/i), '15');
    await userEvent.type(screen.getByLabelText(/reason/i), 'r1');
    await userEvent.click(screen.getByRole('button', { name: /mint code/i }));
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    expect(apiMock.mock.calls[0][1].body.applies_to_plan_skus).toEqual([]);
  });

  it('switches to batch mode and posts to /batch with count + discount_pct', async () => {
    apiMock.mockResolvedValueOnce({
      codes: [
        {
          id: 'b1',
          code: 'CODE001',
          discount_pct: 25,
          max_uses: 1,
          used_count: 0,
          expires_at: null,
          applies_to_plan_skus: [],
          batch_id: 'batch-uuid',
          notes: null,
          created_by: 'admin1',
          created_at: '2026-05-03T00:00:00Z',
        },
      ],
      batch_id: 'batch-uuid',
      count: 1,
    });

    render(<MintDiscountCodeForm />);
    await userEvent.click(screen.getByRole('tab', { name: /batch/i }));
    const countField = await screen.findByLabelText(/^count/i);
    await userEvent.clear(countField);
    await userEvent.type(countField, '5');
    await userEvent.clear(screen.getByLabelText(/discount %/i));
    await userEvent.type(screen.getByLabelText(/discount %/i), '25');
    await userEvent.type(screen.getByLabelText(/reason/i), 'Q2 promo');
    await userEvent.click(screen.getByRole('button', { name: /mint batch/i }));

    await waitFor(() => expect(apiMock).toHaveBeenCalledTimes(1));
    expect(apiMock.mock.calls[0][0]).toBe('/v1/admin/codes/discount/batch');
    expect(apiMock.mock.calls[0][1].body).toMatchObject({
      count: 5,
      discount_pct: 25,
      reason: 'Q2 promo',
    });
    expect(await screen.findByText('CODE001')).toBeInTheDocument();
  });
});
