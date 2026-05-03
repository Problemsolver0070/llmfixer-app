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

import { MintCompCodeForm } from './MintCompCodeForm';

beforeEach(() => {
  apiMock.mockReset();
});

describe('MintCompCodeForm', () => {
  it('lists only solo SKUs in the plan dropdown', async () => {
    render(<MintCompCodeForm />);
    const select = (await screen.findByLabelText(/plan/i)) as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toContain('solo-weekly');
    expect(optionValues).toContain('solo-monthly');
    expect(optionValues).not.toContain('workspace-monthly');
  });

  it('rejects submit when reason is missing', async () => {
    render(<MintCompCodeForm />);
    await userEvent.click(screen.getByRole('button', { name: /mint code/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/reason is required/i);
    expect(apiMock).not.toHaveBeenCalled();
  });

  it('caps duration at 90 days', async () => {
    render(<MintCompCodeForm />);
    const days = screen.getByLabelText(/duration \(days/i);
    await userEvent.clear(days);
    await userEvent.type(days, '120');
    await userEvent.type(screen.getByLabelText(/reason/i), 'test');
    await userEvent.click(screen.getByRole('button', { name: /mint code/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot exceed 90/i);
  });

  it('calls POST /v1/admin/codes/comp on single submit and shows the minted code', async () => {
    const onMinted = vi.fn();
    apiMock.mockResolvedValueOnce({
      id: 'c1',
      code: 'ABCD1234XY',
      granted_plan_id: 'solo-weekly',
      granted_seat_count: 1,
      granted_seconds: 7 * 86400,
      max_uses: 1,
      used_count: 0,
      expires_at: null,
      bound_user_id: null,
      batch_id: null,
      notes: null,
      created_by: 'admin1',
      created_at: '2026-05-03T00:00:00Z',
    });

    render(<MintCompCodeForm onMinted={onMinted} />);
    await userEvent.type(screen.getByLabelText(/reason/i), 'manual test');
    await userEvent.click(screen.getByRole('button', { name: /mint code/i }));

    await waitFor(() => expect(apiMock).toHaveBeenCalledTimes(1));
    const call = apiMock.mock.calls[0];
    expect(call[0]).toBe('/v1/admin/codes/comp');
    expect(call[1].method).toBe('POST');
    expect(call[1].body).toMatchObject({
      granted_plan_id: 'solo-weekly',
      granted_seconds: 7 * 86400,
      max_uses: 1,
      reason: 'manual test',
    });
    expect(await screen.findByText('ABCD1234XY')).toBeInTheDocument();
    expect(onMinted).toHaveBeenCalled();
  });

  it('switches to batch mode and posts to /batch with count', async () => {
    apiMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'b1',
          code: 'CODE001',
          granted_plan_id: 'solo-weekly',
          granted_seat_count: 1,
          granted_seconds: 7 * 86400,
          max_uses: 1,
          used_count: 0,
          expires_at: null,
          bound_user_id: null,
          batch_id: 'batch-uuid',
          notes: null,
          created_by: 'admin1',
          created_at: '2026-05-03T00:00:00Z',
        },
      ],
      batch_id: 'batch-uuid',
      count: 1,
    });

    render(<MintCompCodeForm />);
    await userEvent.click(screen.getByRole('tab', { name: /batch/i }));
    const countField = await screen.findByLabelText(/count/i);
    await userEvent.clear(countField);
    await userEvent.type(countField, '5');
    await userEvent.type(screen.getByLabelText(/reason/i), 'Q2 promo');
    await userEvent.click(screen.getByRole('button', { name: /mint batch/i }));

    await waitFor(() => expect(apiMock).toHaveBeenCalledTimes(1));
    expect(apiMock.mock.calls[0][0]).toBe('/v1/admin/codes/comp/batch');
    expect(apiMock.mock.calls[0][1].body).toMatchObject({
      count: 5,
      granted_plan_id: 'solo-weekly',
      reason: 'Q2 promo',
    });
    expect(await screen.findByText('CODE001')).toBeInTheDocument();
  });
});
