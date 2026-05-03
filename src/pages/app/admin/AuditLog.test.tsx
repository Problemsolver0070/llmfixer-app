import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiMock = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => apiMock(...args) }));

import AuditLog from './AuditLog';

const sampleRow = {
  id: 42,
  actor_id: 'admin-1',
  action: 'user.comp',
  target_user_id: 'u-9',
  metadata: {
    target_type: 'user',
    target_id: 'u-9',
    before: { comp_until: null },
    after: { comp_until: '2026-06-01T00:00:00Z' },
    reason: 'goodwill credit for migration friction',
    ip_address: '203.0.113.1',
    user_agent: 'Mozilla/5.0',
  },
  paypal_event_id: null,
  created_at: '2026-05-03T12:00:00Z',
};

const systemRow = {
  id: 43,
  actor_id: null,
  action: 'discount_credit.applied',
  target_user_id: null,
  metadata: { target_type: 'subscription', target_id: 'sub-1' },
  paypal_event_id: 'evt-1',
  created_at: '2026-05-03T13:00:00Z',
};

beforeEach(() => {
  apiMock.mockReset();
});

describe('AuditLog page', () => {
  it('fetches the default page on first load with no filters set', async () => {
    apiMock.mockResolvedValueOnce({ rows: [sampleRow], total: 1 });
    render(<AuditLog />);
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    const url = apiMock.mock.calls[0][0] as string;
    expect(url).toContain('/v1/admin/audit-log?');
    expect(url).toContain('limit=50');
    expect(url).toContain('offset=0');
    expect(url).not.toContain('target_type=');
    expect(await screen.findByText('user.comp')).toBeInTheDocument();
    expect(screen.getByText('Showing 1 to 1 of 1.')).toBeInTheDocument();
  });

  it('renders system actor for null actor_id and shows hyphen target when metadata is bare', async () => {
    apiMock.mockResolvedValueOnce({
      rows: [{ ...systemRow, metadata: {}, target_user_id: null }],
      total: 1,
    });
    render(<AuditLog />);
    expect(await screen.findByText('discount_credit.applied')).toBeInTheDocument();
    expect(screen.getByText('system')).toBeInTheDocument();
  });

  it('expand button reveals before/after JSON blocks', async () => {
    apiMock.mockResolvedValueOnce({ rows: [sampleRow], total: 1 });
    render(<AuditLog />);
    const expand = await screen.findByRole('button', { name: /expand details/i });
    await userEvent.click(expand);
    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
    // JSON.stringify of after.comp_until should be visible.
    expect(screen.getByText(/2026-06-01T00:00:00Z/)).toBeInTheDocument();
    // ip_address footer.
    expect(screen.getByText('203.0.113.1')).toBeInTheDocument();
  });

  it('applies submitted filters into the next request URL', async () => {
    apiMock.mockResolvedValue({ rows: [], total: 0 });
    render(<AuditLog />);
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    apiMock.mockClear();

    await userEvent.selectOptions(
      screen.getByLabelText(/target type/i),
      'user',
    );
    await userEvent.type(screen.getByLabelText(/target id/i), 'u-9');
    await userEvent.type(
      screen.getByLabelText(/action \(prefix ok\)/i),
      'user.',
    );
    await userEvent.type(
      screen.getByLabelText(/admin user id/i),
      'admin-1',
    );
    await userEvent.click(
      screen.getByRole('button', { name: /apply filters/i }),
    );

    await waitFor(() => {
      const url = apiMock.mock.calls[apiMock.mock.calls.length - 1][0] as string;
      expect(url).toContain('target_type=user');
      expect(url).toContain('target_id=u-9');
      expect(url).toContain('action=user.');
      expect(url).toContain('admin_user_id=admin-1');
    });
  });

  it('reset clears applied filters back to defaults', async () => {
    apiMock.mockResolvedValue({ rows: [], total: 0 });
    render(<AuditLog />);
    await waitFor(() => expect(apiMock).toHaveBeenCalled());

    await userEvent.type(screen.getByLabelText(/target id/i), 'u-9');
    await userEvent.click(
      screen.getByRole('button', { name: /apply filters/i }),
    );
    await waitFor(() => {
      const url = apiMock.mock.calls[apiMock.mock.calls.length - 1][0] as string;
      expect(url).toContain('target_id=u-9');
    });

    apiMock.mockClear();
    await userEvent.click(screen.getByRole('button', { name: /^reset$/i }));
    await waitFor(() => {
      expect(apiMock).toHaveBeenCalled();
      const url = apiMock.mock.calls[apiMock.mock.calls.length - 1][0] as string;
      expect(url).not.toContain('target_id=');
    });
  });

  it('shows the empty-state copy when no rows match', async () => {
    apiMock.mockResolvedValueOnce({ rows: [], total: 0 });
    render(<AuditLog />);
    expect(
      await screen.findByText(/no audit log entries match these filters/i),
    ).toBeInTheDocument();
  });

  it('paginates with prev/next disabled at boundaries', async () => {
    apiMock.mockResolvedValueOnce({
      rows: Array.from({ length: 50 }, (_, i) => ({
        ...sampleRow,
        id: i + 1,
      })),
      total: 120,
    });
    render(<AuditLog />);
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    expect(
      await screen.findByText(/showing 1 to 50 of 120\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^prev$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^next$/i })).not.toBeDisabled();

    apiMock.mockResolvedValueOnce({
      rows: Array.from({ length: 50 }, (_, i) => ({
        ...sampleRow,
        id: i + 51,
      })),
      total: 120,
    });
    await userEvent.click(screen.getByRole('button', { name: /^next$/i }));
    await waitFor(() => {
      const url = apiMock.mock.calls[apiMock.mock.calls.length - 1][0] as string;
      expect(url).toContain('offset=50');
    });
  });

  it('renders only one JSON block when only after is set', async () => {
    apiMock.mockResolvedValueOnce({
      rows: [
        {
          ...sampleRow,
          metadata: {
            target_type: 'user',
            target_id: 'u-9',
            after: { status: 'locked' },
            reason: 'abuse',
          },
        },
      ],
      total: 1,
    });
    render(<AuditLog />);
    const expand = await screen.findByRole('button', { name: /expand details/i });
    await userEvent.click(expand);
    expect(screen.getByText('After')).toBeInTheDocument();
    expect(screen.queryByText('Before')).not.toBeInTheDocument();
  });

  it('truncates long reason strings in the table cell but keeps full value as title', async () => {
    const long = 'x'.repeat(120);
    apiMock.mockResolvedValueOnce({
      rows: [{ ...sampleRow, metadata: { ...sampleRow.metadata, reason: long } }],
      total: 1,
    });
    render(<AuditLog />);
    const reasonCell = await screen.findByTitle(long);
    const visibleText = within(reasonCell).getByText(/^x+\.\.\.$/);
    expect(visibleText.textContent!.length).toBeLessThan(long.length);
  });
});
