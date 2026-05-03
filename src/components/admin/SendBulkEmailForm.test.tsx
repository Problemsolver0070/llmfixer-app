import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiCall = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => apiCall(...args) }));

import { SendBulkEmailForm } from './SendBulkEmailForm';

beforeEach(() => apiCall.mockReset());

describe('SendBulkEmailForm', () => {
  it('preview button calls /v1/admin/comms/preview and renders count + samples', async () => {
    apiCall.mockResolvedValueOnce({
      matched_count: 12,
      first_5_emails: ['a@x.io', 'b@x.io', 'c@x.io'],
    });
    render(<SendBulkEmailForm />);
    await userEvent.click(
      screen.getByRole('button', { name: /preview matched/i }),
    );
    await waitFor(() =>
      expect(screen.getByText(/12 matched/i)).toBeInTheDocument(),
    );
    expect(screen.getByText('a@x.io')).toBeInTheDocument();
    expect(screen.getByText('b@x.io')).toBeInTheDocument();
    expect(apiCall).toHaveBeenCalledWith(
      '/v1/admin/comms/preview',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = (apiCall.mock.calls[0]?.[1] as { body: unknown }).body as {
      segment: string;
    };
    expect(body.segment).toBe('all_users');
  });

  it('send-to-N button is disabled until subject + html + reason are filled', async () => {
    render(<SendBulkEmailForm />);
    const submit = screen.getByRole('button', { name: /send to/i });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/^subject$/i), 'hi');
    await userEvent.type(screen.getByLabelText(/html body/i), '<p>hi</p>');
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/^reason$/i), 'newsletter');
    expect(submit).not.toBeDisabled();
  });

  it('changing the segment clears the previous preview count', async () => {
    apiCall.mockResolvedValueOnce({
      matched_count: 12,
      first_5_emails: ['a@x.io'],
    });
    render(<SendBulkEmailForm />);
    await userEvent.click(
      screen.getByRole('button', { name: /preview matched/i }),
    );
    await waitFor(() =>
      expect(screen.getByText(/12 matched/i)).toBeInTheDocument(),
    );
    await userEvent.selectOptions(screen.getByLabelText(/segment/i), 'paid_users');
    expect(screen.queryByText(/12 matched/i)).not.toBeInTheDocument();
  });

  it('opens the destructive-confirm modal on submit and gates send on typed SEND', async () => {
    render(<SendBulkEmailForm />);
    await userEvent.type(screen.getByLabelText(/^subject$/i), 'hi');
    await userEvent.type(screen.getByLabelText(/html body/i), '<p>hi</p>');
    await userEvent.type(screen.getByLabelText(/^reason$/i), 'newsletter');
    await userEvent.click(screen.getByRole('button', { name: /send to/i }));
    expect(
      await screen.findByRole('heading', { name: /confirm bulk send/i }),
    ).toBeInTheDocument();
    const sendNow = screen.getByRole('button', { name: /send now/i });
    expect(sendNow).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/type SEND/i), 'SEND');
    expect(sendNow).not.toBeDisabled();
  });

  it('clicking Send now POSTs to /v1/admin/comms/send and fires onSent', async () => {
    apiCall.mockResolvedValueOnce({
      segment: 'all_users',
      recipient_count: 5,
      dry_run: false,
      sent: 5,
      failed: 0,
      audit_log_id: 12,
    });
    const onSent = vi.fn();
    render(<SendBulkEmailForm onSent={onSent} />);
    await userEvent.type(screen.getByLabelText(/^subject$/i), 'hi');
    await userEvent.type(screen.getByLabelText(/html body/i), '<p>hi</p>');
    await userEvent.type(screen.getByLabelText(/^reason$/i), 'newsletter');
    await userEvent.click(screen.getByRole('button', { name: /send to/i }));
    await userEvent.type(screen.getByLabelText(/type SEND/i), 'SEND');
    await userEvent.click(screen.getByRole('button', { name: /send now/i }));
    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
    expect(onSent).toHaveBeenCalledWith(
      expect.objectContaining({ sent: 5, audit_log_id: 12 }),
    );
    const sendCall = apiCall.mock.calls.find(
      ([url]) => url === '/v1/admin/comms/send',
    );
    expect(sendCall).toBeDefined();
    const body = (sendCall?.[1] as { body: unknown }).body as {
      reason: string;
      dry_run: boolean;
    };
    expect(body.reason).toBe('newsletter');
    expect(body.dry_run).toBe(false);
  });

  it('dry-run checkbox flips the modal title and request body', async () => {
    apiCall.mockResolvedValueOnce({
      segment: 'all_users',
      recipient_count: 0,
      dry_run: true,
      sent: 0,
      failed: 0,
      audit_log_id: 1,
    });
    render(<SendBulkEmailForm />);
    await userEvent.type(screen.getByLabelText(/^subject$/i), 'hi');
    await userEvent.type(screen.getByLabelText(/html body/i), '<p>hi</p>');
    await userEvent.type(screen.getByLabelText(/^reason$/i), 'audit-only');
    await userEvent.click(screen.getByLabelText(/dry run/i));
    await userEvent.click(screen.getByRole('button', { name: /send to/i }));
    expect(
      await screen.findByRole('heading', { name: /confirm dry run/i }),
    ).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/type SEND/i), 'SEND');
    await userEvent.click(
      screen.getByRole('button', { name: /confirm dry run/i }),
    );
    await waitFor(() => {
      const sendCall = apiCall.mock.calls.find(
        ([url]) => url === '/v1/admin/comms/send',
      );
      expect(sendCall).toBeDefined();
      const body = (sendCall?.[1] as { body: unknown }).body as {
        dry_run: boolean;
      };
      expect(body.dry_run).toBe(true);
    });
  });
});
