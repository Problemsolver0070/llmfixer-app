import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => apiCall(...args) }));

import { UserAuditHistory } from './UserAuditHistory';

const sampleRows = [
  {
    id: 1,
    created_at: '2026-05-01T12:00:00Z',
    actor_id: 'admin-1',
    action: 'user.comp',
    target_user_id: 'u-1',
    paypal_event_id: null,
    metadata: {
      target_type: 'user',
      target_id: 'u-1',
      reason: 'apology',
      before: { comp_until: null },
      after: { comp_until: '2026-05-08T00:00:00Z' },
    },
  },
  {
    id: 2,
    created_at: '2026-05-01T13:00:00Z',
    actor_id: null,
    action: 'user.cron.warning',
    target_user_id: 'u-1',
    paypal_event_id: null,
    metadata: {
      target_type: 'user',
      target_id: 'u-1',
      before: null,
      after: { warned_at: '2026-05-01T13:00:00Z' },
    },
  },
];

beforeEach(() => apiCall.mockReset());

describe('UserAuditHistory', () => {
  it('renders rows from /v1/admin/audit-log', async () => {
    apiCall.mockResolvedValue({ rows: sampleRows, total: 2 });
    render(<UserAuditHistory userId="u-1" />);
    await waitFor(() => expect(apiCall).toHaveBeenCalled());
    expect(apiCall).toHaveBeenCalledWith(
      '/v1/admin/audit-log?target_type=user&target_id=u-1&limit=50&offset=0',
    );
    expect(screen.getByText('user.comp')).toBeInTheDocument();
    expect(screen.getByText('admin-1')).toBeInTheDocument();
    expect(screen.getByText('system')).toBeInTheDocument();
  });

  it('shows empty state when there are no rows', async () => {
    apiCall.mockResolvedValue({ rows: [], total: 0 });
    render(<UserAuditHistory userId="u-1" />);
    await waitFor(() =>
      expect(screen.getByText(/no audit entries/i)).toBeInTheDocument(),
    );
  });

  it('expands a row to show before / after JSON', async () => {
    apiCall.mockResolvedValue({ rows: sampleRows, total: 2 });
    render(<UserAuditHistory userId="u-1" />);
    await waitFor(() => expect(screen.getByText('user.comp')).toBeInTheDocument());
    await userEvent.click(screen.getByText('user.comp'));
    const expanded = await screen.findByTestId('audit-row-1-expanded');
    expect(expanded).toBeInTheDocument();
    // The expanded row contains the before / after JSON snapshots; both
    // include "comp_until" so we just check the expanded content directly.
    expect(expanded.textContent).toContain('comp_until');
  });

  it('renders an error and a retry button', async () => {
    apiCall.mockRejectedValueOnce(new Error('forbidden'));
    render(<UserAuditHistory userId="u-1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/forbidden/i);
  });
});
