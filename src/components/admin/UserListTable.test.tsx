import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AdminUserRow } from '@/hooks/useAdminUsers';
import { UserListTable } from './UserListTable';

function makeRow(overrides: Partial<AdminUserRow> = {}): AdminUserRow {
  return {
    id: 'u1',
    email: 'a@b.c',
    role: 'user',
    status: 'trial',
    plan_id: null,
    seat_count: null,
    paypal_sub_id: null,
    paypal_sub_status: null,
    cancels_at: null,
    comp_until: null,
    trial_ends_at: null,
    requests_this_week: 0,
    output_tokens_this_week: 0,
    created_at: '2026-04-01T00:00:00Z',
    last_active_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useRealTimers();
});

describe('UserListTable', () => {
  it('renders the loading state when loading is true', () => {
    render(
      <UserListTable rows={[]} loading={true} error={null} onRowClick={vi.fn()} />,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders the empty state when there are no rows', () => {
    render(
      <UserListTable rows={[]} loading={false} error={null} onRowClick={vi.fn()} />,
    );
    expect(
      screen.getByText(/no users match these filters/i),
    ).toBeInTheDocument();
  });

  it('renders the error message when error is set', () => {
    render(
      <UserListTable
        rows={[]}
        loading={false}
        error={new Error('boom')}
        onRowClick={vi.fn()}
      />,
    );
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('renders email, status badge, plan, and last-active columns', () => {
    const rows = [
      makeRow({
        id: 'u1',
        email: 'alice@example.com',
        status: 'active',
        plan_id: 'solo-monthly',
        requests_this_week: 42,
        last_active_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      }),
      makeRow({
        id: 'u2',
        email: 'team@example.com',
        status: 'comped',
        plan_id: 'workspace-monthly',
        seat_count: 4,
        last_active_at: null,
      }),
    ];

    render(
      <UserListTable
        rows={rows}
        loading={false}
        error={null}
        onRowClick={vi.fn()}
      />,
    );

    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('team@example.com')).toBeInTheDocument();
    // Status badge text is exact lowercase match. The "Last active" column
    // header also contains the substring "active", so scope to the cell.
    const aliceRow = screen.getByText('alice@example.com').closest('tr');
    const teamRow = screen.getByText('team@example.com').closest('tr');
    expect(aliceRow).not.toBeNull();
    expect(teamRow).not.toBeNull();
    expect(aliceRow!.textContent).toMatch(/active/i);
    expect(teamRow!.textContent).toMatch(/comped/i);
    expect(screen.getByText('s-monthly')).toBeInTheDocument();
    expect(screen.getByText(/ws-monthly \(4 seats\)/)).toBeInTheDocument();
    expect(screen.getByText(/2h ago/)).toBeInTheDocument();
    expect(screen.getByText(/^never$/)).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('fires onRowClick when the row is clicked', async () => {
    const onRowClick = vi.fn();
    const row = makeRow({ id: 'click-id', email: 'click@example.com' });

    render(
      <UserListTable
        rows={[row]}
        loading={false}
        error={null}
        onRowClick={onRowClick}
      />,
    );

    await userEvent.click(screen.getByText('click@example.com'));
    expect(onRowClick).toHaveBeenCalledWith(row);
  });

  it('shows the copy button on hover and copies the email', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });

    const row = makeRow({ id: 'u1', email: 'hover@example.com' });
    render(
      <UserListTable
        rows={[row]}
        loading={false}
        error={null}
        onRowClick={vi.fn()}
      />,
    );

    const cell = screen.getByText('hover@example.com');
    await userEvent.hover(cell);

    const copyBtn = await screen.findByRole('button', {
      name: /copy hover@example\.com/i,
    });
    await userEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('hover@example.com');
    });
  });
});
