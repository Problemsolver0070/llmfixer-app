import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const useAdminMetrics = vi.fn();
vi.mock('@/hooks/useAdminMetrics', () => ({
  useAdminMetrics: () => useAdminMetrics(),
  METRICS_POLL_INTERVAL_MS: 60_000,
}));

import Metrics from './Metrics';

const fullPayload = {
  revenue: {
    mrr_cents: 599700,
    arr_cents: 7196400,
    active_subs: 30,
    trial_users: 8,
    comped_users: 4,
    churn_30d_pct: 3.2,
  },
  funnel: {
    signups_30d: 200,
    trial_started_30d: 140,
    first_paid_charge_30d: 60,
  },
  engagement: { dau: 22, wau: 80, mau: 180 },
  top_burners: [
    {
      user_id: 'u1',
      email: 'a@example.com',
      output_tokens_this_week: 12345,
      requests_this_week: 67,
    },
    {
      user_id: 'u2',
      email: 'b@example.com',
      output_tokens_this_week: 99999,
      requests_this_week: 200,
    },
  ],
  computed_at: '2026-05-03T12:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <Metrics />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAdminMetrics.mockReset();
});

describe('Metrics page', () => {
  it('shows loading state when data is not yet available', () => {
    useAdminMetrics.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refresh: vi.fn(),
    });
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders the four stat cards with formatted values', () => {
    useAdminMetrics.mockReturnValue({
      data: fullPayload,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    renderPage();

    // MRR card
    expect(screen.getByText('MRR')).toBeInTheDocument();
    expect(screen.getByText('$5,997.00')).toBeInTheDocument();
    expect(screen.getByText('ARR: $71,964.00')).toBeInTheDocument();

    // Active subs card
    expect(screen.getByText('Active subscriptions')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('8 trial / 4 comped')).toBeInTheDocument();

    // Churn card
    expect(screen.getByText('Churn (30d)')).toBeInTheDocument();
    expect(screen.getByText('3.2%')).toBeInTheDocument();

    // Engagement card
    expect(screen.getByText('DAU / WAU / MAU')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /engagement sparkline/i })).toBeInTheDocument();
  });

  it('renders the funnel section with all three stages', () => {
    useAdminMetrics.mockReturnValue({
      data: fullPayload,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('Signups (30d)')).toBeInTheDocument();
    expect(screen.getByText('Trial started (30d)')).toBeInTheDocument();
    expect(screen.getByText('First paid charge (30d)')).toBeInTheDocument();
    // The funnel renders the signup count next to its label.
    const signupsRow = screen.getByText('Signups (30d)').closest('[role="listitem"]');
    expect(signupsRow).not.toBeNull();
    expect(signupsRow).toHaveTextContent(/\b200\b/);
    expect(screen.getByText('140')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
  });

  it('renders the top burners table sorted desc with email links', () => {
    useAdminMetrics.mockReturnValue({
      data: fullPayload,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    renderPage();
    const links = screen.getAllByRole('link');
    // First link should be the highest-burner row.
    expect(links[0]).toHaveAttribute('href', '/app/admin/users/u2');
    expect(links[0]).toHaveTextContent('b@example.com');
    expect(links[1]).toHaveAttribute('href', '/app/admin/users/u1');
  });

  it('shows footer copy with refresh cadence', () => {
    useAdminMetrics.mockReturnValue({
      data: fullPayload,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    renderPage();
    expect(screen.getByText(/refreshes every 60s/i)).toBeInTheDocument();
  });

  it('calls refresh() when the refresh button is clicked', async () => {
    const refresh = vi.fn();
    useAdminMetrics.mockReturnValue({
      data: fullPayload,
      loading: false,
      error: null,
      refresh,
    });
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /refresh metrics/i }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("shows an error message when the hook reports an error and there's no data", () => {
    useAdminMetrics.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('boom'),
      refresh: vi.fn(),
    });
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn'?t load metrics/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/boom/);
  });
});
