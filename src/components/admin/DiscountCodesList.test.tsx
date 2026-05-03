import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => apiMock(...args) }));

import { DiscountCodesList } from './DiscountCodesList';

const sampleRow = {
  id: 'd1',
  code: 'PROMO10',
  discount_pct: 10,
  max_uses: 5,
  used_count: 1,
  expires_at: null as string | null,
  applies_to_plan_skus: ['solo-monthly', 'solo-quarterly'],
  batch_id: null as string | null,
  notes: 'Q2 launch',
  created_by: 'admin1',
  created_at: '2026-05-03T00:00:00Z',
  status: 'active' as const,
};

beforeEach(() => {
  apiMock.mockReset();
});

describe('DiscountCodesList', () => {
  it('renders rows with discount %, used/max, applies-to chips, and copy button', async () => {
    apiMock.mockResolvedValueOnce({ rows: [sampleRow], total: 1 });
    render(<DiscountCodesList />);
    expect(await screen.findByText('PROMO10')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('1 / 5')).toBeInTheDocument();
    expect(screen.getByText('solo-monthly')).toBeInTheDocument();
    expect(screen.getByText('solo-quarterly')).toBeInTheDocument();
    const row = screen.getByText('PROMO10').closest('tr')!;
    const { getAllByText } = within(row);
    expect(getAllByText(/active/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /copy PROMO10/i })).toBeInTheDocument();
  });

  it('renders "All" when applies_to_plan_skus is empty', async () => {
    apiMock.mockResolvedValueOnce({
      rows: [{ ...sampleRow, applies_to_plan_skus: [] }],
      total: 1,
    });
    render(<DiscountCodesList />);
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    const row = (await screen.findByText('PROMO10')).closest('tr')!;
    expect(within(row).getByText(/^all$/i)).toBeInTheDocument();
  });

  it('builds the query string from filter chips and search', async () => {
    apiMock.mockResolvedValue({ rows: [], total: 0 });
    render(<DiscountCodesList />);
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    apiMock.mockClear();

    await userEvent.click(
      screen.getByRole('button', { name: /^exhausted$/i, pressed: false }),
    );
    await waitFor(() => {
      expect(apiMock).toHaveBeenCalled();
      const url = apiMock.mock.calls[apiMock.mock.calls.length - 1][0] as string;
      expect(url).toContain('status=exhausted');
      expect(url).toContain('/v1/admin/codes/discount');
    });

    apiMock.mockClear();
    const searchInput = screen.getByPlaceholderText(/search by code prefix/i);
    await userEvent.type(searchInput, 'pro');
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }));
    await waitFor(() => {
      const url = apiMock.mock.calls[apiMock.mock.calls.length - 1][0] as string;
      expect(url).toContain('search=PRO');
    });
  });

  it('shows empty-state copy when no rows match', async () => {
    apiMock.mockResolvedValueOnce({ rows: [], total: 0 });
    render(<DiscountCodesList />);
    expect(await screen.findByText(/no codes match/i)).toBeInTheDocument();
  });

  it('refreshes when refreshTick prop changes', async () => {
    apiMock.mockResolvedValue({ rows: [sampleRow], total: 1 });
    const { rerender } = render(<DiscountCodesList refreshTick={0} />);
    await waitFor(() => expect(apiMock).toHaveBeenCalledTimes(1));
    rerender(<DiscountCodesList refreshTick={1} />);
    await waitFor(() => expect(apiMock.mock.calls.length).toBeGreaterThan(1));
  });
});
