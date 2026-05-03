import { useCallback, useState } from 'react';
import { api } from '@/lib/api';

/**
 * Closed set of segments the admin bulk-comms API accepts. Mirror of
 * `SegmentLiteral` in `llmfixer-api/src/app/schemas/admin_comms.py` so a
 * typo on either side fails at compile time.
 */
export type Segment =
  | 'all_users'
  | 'paid_users'
  | 'trial_users'
  | 'comped_users'
  | 'churned_users'
  | 'workspace_admins';

/**
 * UI labels for the segment dropdown. Kept here so the page component does
 * not have to map enum values to display copy itself, and so a new segment
 * is one edit (here + the api) rather than three (here + page + label map).
 */
export const SEGMENT_OPTIONS: ReadonlyArray<{ value: Segment; label: string }> =
  [
    { value: 'all_users', label: 'All users (with email)' },
    { value: 'paid_users', label: 'Paid (active PayPal subs)' },
    { value: 'trial_users', label: 'Trial (active, not yet expired)' },
    { value: 'comped_users', label: 'Comped (active comp window)' },
    {
      value: 'churned_users',
      label: 'Churned (cancelled, suspended, expired)',
    },
    { value: 'workspace_admins', label: 'Workspace admins' },
  ];

export interface PreviewInput {
  segment: Segment;
  subject: string;
  html: string;
}

export interface PreviewResult {
  matched_count: number;
  first_5_emails: string[];
}

export interface SendInput extends PreviewInput {
  reason: string;
  dry_run: boolean;
}

export interface SendResult {
  segment: Segment;
  recipient_count: number;
  dry_run: boolean;
  sent: number;
  failed: number;
  audit_log_id: number | null;
}

/**
 * Two thin wrappers around `POST /v1/admin/comms/preview` and
 * `POST /v1/admin/comms/send`. Component owns its own loading / error UI;
 * this hook just provides idempotent fetchers + the last result.
 *
 * `lastPreview` is a convenience cache (resets on a new preview() call) the
 * Send button uses to render its label as "Send to N recipients" without
 * a second round-trip. `lastSend` is exposed so the parent can render the
 * success toast with the audit-log id and the resend counters.
 */
export function useAdminComms(): {
  preview: (input: PreviewInput) => Promise<PreviewResult>;
  send: (input: SendInput) => Promise<SendResult>;
  lastPreview: PreviewResult | null;
  lastSend: SendResult | null;
  resetPreview: () => void;
} {
  const [lastPreview, setLastPreview] = useState<PreviewResult | null>(null);
  const [lastSend, setLastSend] = useState<SendResult | null>(null);

  const preview = useCallback(async (input: PreviewInput) => {
    const res = await api<PreviewResult>('/v1/admin/comms/preview', {
      method: 'POST',
      body: input,
    });
    setLastPreview(res);
    return res;
  }, []);

  const send = useCallback(async (input: SendInput) => {
    const res = await api<SendResult>('/v1/admin/comms/send', {
      method: 'POST',
      body: input,
    });
    setLastSend(res);
    return res;
  }, []);

  const resetPreview = useCallback(() => setLastPreview(null), []);

  return { preview, send, lastPreview, lastSend, resetPreview };
}
