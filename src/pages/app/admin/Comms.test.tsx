import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => apiCall(...args) }));

import Comms from './Comms';

beforeEach(() => apiCall.mockReset());

describe('Comms page', () => {
  it('renders the bulk-email form heading + description', () => {
    render(<Comms />);
    expect(
      screen.getByRole('heading', { name: /bulk email/i, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /send bulk email/i }),
    ).toBeInTheDocument();
  });

  it('shows a success ribbon after a real send completes', async () => {
    apiCall.mockResolvedValueOnce({
      segment: 'all_users',
      recipient_count: 4,
      dry_run: false,
      sent: 4,
      failed: 0,
      audit_log_id: 21,
    });
    render(<Comms />);
    await userEvent.type(screen.getByLabelText(/^subject$/i), 'hi');
    await userEvent.type(screen.getByLabelText(/html body/i), '<p>hi</p>');
    await userEvent.type(screen.getByLabelText(/^reason$/i), 'launch');
    await userEvent.click(screen.getByRole('button', { name: /send to/i }));
    await userEvent.type(screen.getByLabelText(/type SEND/i), 'SEND');
    await userEvent.click(screen.getByRole('button', { name: /send now/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/Send queued for 4 recipients/i),
      ).toBeInTheDocument(),
    );
    // Both the form's last-send ribbon and the page-level toast surface
    // the audit-row link, so we expect 2 matches (not 1).
    expect(screen.getAllByText(/Audit row #21/i)).toHaveLength(2);
  });

  it('flags failures in the success ribbon when any envelopes failed', async () => {
    apiCall.mockResolvedValueOnce({
      segment: 'all_users',
      recipient_count: 4,
      dry_run: false,
      sent: 3,
      failed: 1,
      audit_log_id: 22,
    });
    render(<Comms />);
    await userEvent.type(screen.getByLabelText(/^subject$/i), 'hi');
    await userEvent.type(screen.getByLabelText(/html body/i), '<p>hi</p>');
    await userEvent.type(screen.getByLabelText(/^reason$/i), 'launch');
    await userEvent.click(screen.getByRole('button', { name: /send to/i }));
    await userEvent.type(screen.getByLabelText(/type SEND/i), 'SEND');
    await userEvent.click(screen.getByRole('button', { name: /send now/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/1 envelopes failed/i),
      ).toBeInTheDocument(),
    );
  });
});
