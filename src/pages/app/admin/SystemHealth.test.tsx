import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const useAdminSystemCrons = vi.fn();
const useAdminSystemWebhooks = vi.fn();
const useAdminSystemEmails = vi.fn();
const useAdminSystemErrorRate = vi.fn();

vi.mock('@/hooks/useAdminSystem', () => ({
  useAdminSystemCrons: () => useAdminSystemCrons(),
  useAdminSystemWebhooks: () => useAdminSystemWebhooks(),
  useAdminSystemEmails: () => useAdminSystemEmails(),
  useAdminSystemErrorRate: () => useAdminSystemErrorRate(),
}));

import SystemHealth from './SystemHealth';

describe('SystemHealth page', () => {
  it('renders error rate, cron rows, webhook rows, and email rows', () => {
    useAdminSystemErrorRate.mockReturnValue({
      data: {
        error_count_24h: 3,
        total_actions_24h: 120,
        error_rate_pct: 2.5,
        window_hours: 24,
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    useAdminSystemCrons.mockReturnValue({
      data: {
        items: [
          {
            name: 'expire_trials',
            last_run_at: '2026-05-03T08:00:00Z',
            last_status: 'success',
            success_count_24h: 24,
            failed_count_24h: 0,
            last_log_line: 'success (affected=2)',
          },
          {
            name: 'reconcile_paypal',
            last_run_at: '2026-05-03T07:00:00Z',
            last_status: 'failed',
            success_count_24h: 23,
            failed_count_24h: 1,
            last_log_line: 'failed: paypal 502',
          },
        ],
        window_hours: 24,
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    useAdminSystemWebhooks.mockReturnValue({
      data: {
        items: [
          {
            id: 1,
            created_at: '2026-05-03T08:00:00Z',
            action: 'billing.activated',
            paypal_event_id: 'WH-1',
            target_user_id: 'u1',
            event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
            summary: 'plan changed',
          },
        ],
        limit: 50,
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    useAdminSystemEmails.mockReturnValue({
      data: {
        items: [
          {
            id: 1,
            to_email: 'a@b.c',
            subject: 'Trial ending soon',
            status: 'sent',
            error_message: null,
            resend_id: 'rs_1',
            sent_at: '2026-05-03T08:00:00Z',
          },
        ],
        limit: 50,
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<SystemHealth />);

    // Error rate top stat.
    expect(screen.getByText('2.5%')).toBeInTheDocument();
    expect(screen.getByText(/3 errors \/ 120 total/)).toBeInTheDocument();

    // Cron rows.
    expect(screen.getByText('expire_trials')).toBeInTheDocument();
    expect(screen.getByText('reconcile_paypal')).toBeInTheDocument();
    expect(screen.getByText(/paypal 502/)).toBeInTheDocument();
    expect(screen.getByText(/1 failed/)).toBeInTheDocument();

    // Webhook row.
    expect(screen.getByText('BILLING.SUBSCRIPTION.ACTIVATED')).toBeInTheDocument();
    expect(screen.getByText('billing.activated')).toBeInTheDocument();
    expect(screen.getByText('plan changed')).toBeInTheDocument();

    // Email row.
    expect(screen.getByText('a@b.c')).toBeInTheDocument();
    expect(screen.getByText('Trial ending soon')).toBeInTheDocument();
    expect(screen.getByText('sent')).toBeInTheDocument();
  });

  it('shows error message on error-rate failure', () => {
    useAdminSystemErrorRate.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('boom'),
      refresh: vi.fn(),
    });
    useAdminSystemCrons.mockReturnValue({
      data: { items: [], window_hours: 24 },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    useAdminSystemWebhooks.mockReturnValue({
      data: { items: [], limit: 50 },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    useAdminSystemEmails.mockReturnValue({
      data: { items: [], limit: 50 },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<SystemHealth />);
    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((a) => a.textContent?.includes('boom'))).toBe(true);
    // Empty-state copy for the empty sections.
    expect(screen.getByText('No cron data.')).toBeInTheDocument();
    expect(screen.getByText('No webhook events captured.')).toBeInTheDocument();
    expect(screen.getByText('No email attempts captured.')).toBeInTheDocument();
  });

  it('renders loading placeholders until each hook resolves', () => {
    useAdminSystemErrorRate.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refresh: vi.fn(),
    });
    useAdminSystemCrons.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refresh: vi.fn(),
    });
    useAdminSystemWebhooks.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refresh: vi.fn(),
    });
    useAdminSystemEmails.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refresh: vi.fn(),
    });
    render(<SystemHealth />);
    const loaders = screen.getAllByText('Loading...');
    expect(loaders.length).toBeGreaterThanOrEqual(4);
  });
});
