/**
 * Hooks for the admin system-health dashboard (R8).
 *
 * Each hook polls its `/v1/admin/system/*` endpoint every 60s. Polling
 * is intentional: the dashboard is a "what's happening right now"
 * surface, not a realtime feed, so a 60s refresh interval keeps the
 * traffic gentle and the data fresh enough to be useful.
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const POLL_INTERVAL_MS = 60_000;

// ---------------------------------------------------------------------------
// Shared types (mirror app/schemas/system_health.py)
// ---------------------------------------------------------------------------

export type CronLastStatus = 'success' | 'failed' | 'running' | null;

export interface CronStatusItem {
  name: string;
  last_run_at: string | null;
  last_status: CronLastStatus;
  success_count_24h: number;
  failed_count_24h: number;
  last_log_line: string;
}

export interface CronStatusResponse {
  items: CronStatusItem[];
  window_hours: number;
}

export interface WebhookItem {
  id: number;
  created_at: string | null;
  action: string;
  paypal_event_id: string | null;
  target_user_id: string | null;
  event_type: string | null;
  summary: string | null;
}

export interface WebhooksResponse {
  items: WebhookItem[];
  limit: number;
}

export type EmailStatus = 'sent' | 'failed' | 'skipped';

export interface EmailLogItem {
  id: number;
  to_email: string;
  subject: string;
  status: EmailStatus;
  error_message: string | null;
  resend_id: string | null;
  sent_at: string | null;
}

export interface EmailLogResponse {
  items: EmailLogItem[];
  limit: number;
}

export interface ErrorRateResponse {
  error_count_24h: number;
  total_actions_24h: number;
  error_rate_pct: number;
  window_hours: number;
}

export interface PollingResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

// ---------------------------------------------------------------------------
// usePolling: shared scaffold so each endpoint hook is one-liner thin.
// ---------------------------------------------------------------------------

function usePolling<T>(path: string): PollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const fetchOnce = (): void => {
      api<T>(path).then(
        (d) => {
          if (cancelled) return;
          setData(d);
          setError(null);
          setLoading(false);
        },
        (e: unknown) => {
          if (cancelled) return;
          setError(e instanceof Error ? e : new Error(String(e)));
          setLoading(false);
        },
      );
    };
    fetchOnce();
    timer = window.setInterval(fetchOnce, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
    };
    // tick is included so callers can force a refresh; path is a stable
    // string per hook so it never changes after first render.
  }, [path, tick]);

  return {
    data,
    loading,
    error,
    refresh: () => setTick((t) => t + 1),
  };
}

// ---------------------------------------------------------------------------
// Per-endpoint hooks
// ---------------------------------------------------------------------------

export function useAdminSystemCrons(): PollingResult<CronStatusResponse> {
  return usePolling<CronStatusResponse>('/v1/admin/system/crons');
}

export function useAdminSystemWebhooks(): PollingResult<WebhooksResponse> {
  return usePolling<WebhooksResponse>('/v1/admin/system/webhooks');
}

export function useAdminSystemEmails(): PollingResult<EmailLogResponse> {
  return usePolling<EmailLogResponse>('/v1/admin/system/email-log');
}

export function useAdminSystemErrorRate(): PollingResult<ErrorRateResponse> {
  return usePolling<ErrorRateResponse>('/v1/admin/system/error-rate');
}
