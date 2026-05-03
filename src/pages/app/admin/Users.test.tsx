import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AdminUserRow } from '@/hooks/useAdminUsers';

const useAdminUsersMock = vi.fn();
vi.mock('@/hooks/useAdminUsers', () => ({
  useAdminUsers: (filters: unknown) => useAdminUsersMock(filters),
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

import Users from './Users';

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
    trial_ends_at: '2099-01-01T00:00:00Z',
    requests_this_week: 12,
    output_tokens_this_week: 4500,
    created_at: '2026-04-01T00:00:00Z',
    last_active_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  useAdminUsersMock.mockReset();
  navigateMock.mockReset();
});

function renderWithProviders(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Admin Users list view', () => {
  it('fetches and renders the full user list on mount', async () => {
    const rows = [
      makeRow({ id: 'u1', email: 'alice@example.com' }),
      makeRow({ id: 'u2', email: 'bob@example.com', status: 'active' }),
    ];
    useAdminUsersMock.mockReturnValue({
      rows,
      total: 2,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    renderWithProviders(<Users />);

    expect(useAdminUsersMock).toHaveBeenCalledWith(
      expect.objectContaining({ q: null, limit: 50, offset: 0 }),
    );
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Showing 1-2 of 2/)).toBeInTheDocument();
  });

  it('debounces search input and passes q to the hook', async () => {
    useAdminUsersMock.mockReturnValue({
      rows: [],
      total: 0,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderWithProviders(<Users />);
      const input = screen.getByPlaceholderText(/search by email/i);
      const user = userEvent.setup({
        advanceTimers: vi.advanceTimersByTime.bind(vi),
      });
      await user.type(input, 'alice');

      // Before the debounce flush, q should still be null.
      const beforeFlush = useAdminUsersMock.mock.calls.at(-1)?.[0];
      expect(beforeFlush).toMatchObject({ q: null });

      vi.advanceTimersByTime(350);

      await waitFor(() => {
        const last = useAdminUsersMock.mock.calls.at(-1)?.[0];
        expect(last).toMatchObject({ q: 'alice', offset: 0 });
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('applies the status filter chip client-side', async () => {
    const rows = [
      makeRow({ id: 'u1', email: 'alice@example.com', status: 'trial' }),
      makeRow({ id: 'u2', email: 'bob@example.com', status: 'active' }),
    ];
    useAdminUsersMock.mockReturnValue({
      rows,
      total: 2,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    renderWithProviders(<Users />);
    const user = userEvent.setup();

    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /status: active/i }));

    await waitFor(() => {
      expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument();
    });
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('applies the plan and subscription filter chips client-side', async () => {
    const rows = [
      makeRow({
        id: 'u1',
        email: 'solo@example.com',
        plan_id: 'solo-monthly',
        paypal_sub_status: 'ACTIVE',
      }),
      makeRow({
        id: 'u2',
        email: 'ws@example.com',
        plan_id: 'workspace-monthly',
        seat_count: 3,
        paypal_sub_status: 'CANCELLED',
      }),
      makeRow({ id: 'u3', email: 'free@example.com', plan_id: null }),
    ];
    useAdminUsersMock.mockReturnValue({
      rows,
      total: 3,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    renderWithProviders(<Users />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('radio', { name: /plan: workspace/i }));
    await waitFor(() => {
      expect(screen.getByText('ws@example.com')).toBeInTheDocument();
      expect(screen.queryByText('solo@example.com')).not.toBeInTheDocument();
      expect(screen.queryByText('free@example.com')).not.toBeInTheDocument();
    });

    // Reset the plan filter, then apply only-active subscription.
    await user.click(screen.getByRole('radio', { name: /plan: all/i }));
    await user.click(
      screen.getByRole('radio', { name: /subscription: only active/i }),
    );

    await waitFor(() => {
      expect(screen.getByText('solo@example.com')).toBeInTheDocument();
      expect(screen.queryByText('ws@example.com')).not.toBeInTheDocument();
      expect(screen.queryByText('free@example.com')).not.toBeInTheDocument();
    });
  });

  it('paginates with offset=50 when next is clicked', async () => {
    useAdminUsersMock.mockReturnValue({
      rows: [makeRow()],
      total: 120,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    renderWithProviders(<Users />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      const last = useAdminUsersMock.mock.calls.at(-1)?.[0];
      expect(last).toMatchObject({ offset: 50, limit: 50 });
    });
  });

  it('navigates to the user detail page when a row is clicked', async () => {
    useAdminUsersMock.mockReturnValue({
      rows: [makeRow({ id: 'user-xyz', email: 'click@example.com' })],
      total: 1,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    renderWithProviders(<Users />);
    const user = userEvent.setup();

    await user.click(screen.getByText('click@example.com'));
    expect(navigateMock).toHaveBeenCalledWith('/app/admin/users/user-xyz');
  });

  it('shows the empty state when zero rows match', () => {
    useAdminUsersMock.mockReturnValue({
      rows: [],
      total: 0,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    renderWithProviders(<Users />);
    expect(screen.getByText(/no users match these filters/i)).toBeInTheDocument();
    expect(screen.getByText(/Showing 0 of 0/)).toBeInTheDocument();
  });
});
