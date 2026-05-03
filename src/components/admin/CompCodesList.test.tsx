import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => apiMock(...args) }));

import { CompCodesList } from './CompCodesList';

const sampleRow = {
  id: 'c1',
  code: 'ABCD1234XY',
  granted_plan_id: 'solo-weekly',
  granted_seat_count: 1,
  granted_seconds: 7 * 86400,
  max_uses: 1,
  used_count: 0,
  expires_at: null as string | null,
  bound_user_id: null as string | null,
  batch_id: null as string | null,
  notes: 'Q2 promo',
  created_by: 'admin1',
  created_at: '2026-05-03T00:00:00Z',
  status: 'active' as const,
};

beforeEach(() => {
  apiMock.mockReset();
});

describe('CompCodesList', () => {
  it('renders rows from the list endpoint with status badge and copy button', async () => {
    apiMock.mockResolvedValueOnce({ rows: [sampleRow], total: 1 });
    render(<CompCodesList />);
    expect(await screen.findByText('ABCD1234XY')).toBeInTheDocument();
    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.getByText('0 / 1')).toBeInTheDocument();
    // "active" appears both as a filter chip and as a status badge inside the row.
    // The badge is in a `<td>` cell, so scope to the row's status column.
    const row = screen.getByText('ABCD1234XY').closest('tr')!;
    const { getAllByText } = within(row);
    expect(getAllByText(/active/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /copy ABCD1234XY/i })).toBeInTheDocument();
  });

  it('builds the query string from filter chips and search', async () => {
    apiMock.mockResolvedValue({ rows: [], total: 0 });
    render(<CompCodesList />);
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    apiMock.mockClear();

    await userEvent.click(screen.getByRole('button', { name: /^exhausted$/i, pressed: false }));
    await waitFor(() => {
      expect(apiMock).toHaveBeenCalled();
      const url = apiMock.mock.calls[apiMock.mock.calls.length - 1][0] as string;
      expect(url).toContain('status=exhausted');
    });

    apiMock.mockClear();
    const searchInput = screen.getByPlaceholderText(/search by code prefix/i);
    await userEvent.type(searchInput, 'abcd');
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }));
    await waitFor(() => {
      const url = apiMock.mock.calls[apiMock.mock.calls.length - 1][0] as string;
      expect(url).toContain('search=ABCD');
    });
  });

  it('shows empty-state copy when no rows match', async () => {
    apiMock.mockResolvedValueOnce({ rows: [], total: 0 });
    render(<CompCodesList />);
    expect(await screen.findByText(/no codes match/i)).toBeInTheDocument();
  });

  it('refreshes when refreshTick prop changes', async () => {
    apiMock.mockResolvedValue({ rows: [sampleRow], total: 1 });
    const { rerender } = render(<CompCodesList refreshTick={0} />);
    await waitFor(() => expect(apiMock).toHaveBeenCalledTimes(1));
    rerender(<CompCodesList refreshTick={1} />);
    await waitFor(() => expect(apiMock.mock.calls.length).toBeGreaterThan(1));
  });
});
