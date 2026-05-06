import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';

/**
 * Row shape returned by `GET /v1/support/requests` and
 * `POST /v1/support/requests`. Mirrors the `support_requests` table per
 * `llmfixer-api/docs/superpowers/specs/2026-05-06-support-requests-design.md`.
 */
export type SupportRequestKind = 'bug' | 'suggestion' | 'demo';

export type SupportRequestStatus =
  | 'open'
  | 'approved'
  | 'declined'
  | 'resolved';

export interface SupportRequest {
  id: string;
  user_id: string;
  kind: SupportRequestKind;
  subject: string;
  body: string;
  status: SupportRequestStatus;
  decided_by: string | null;
  decided_at: string | null;
  decision_notes: string | null;
  granted_hours: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSupportRequestPayload {
  kind: SupportRequestKind;
  subject: string;
  body: string;
}

/**
 * Closed set of typed error codes surfaced from `useSupportRequestActions`.
 * The backend returns 409 when a same-kind open request already exists per
 * the partial unique index `idx_one_open_per_user_kind`. The 429 is the
 * existing rate-limit middleware (3/hour/user).
 */
export type SupportRequestErrorType =
  | 'conflict_open_request_exists'
  | 'rate_limited'
  | 'unknown';

export interface SupportRequestError {
  type: SupportRequestErrorType;
  message: string;
  status: number | null;
}

const GENERIC_ERROR = 'Something went wrong. Please try again.';

/**
 * Map an unknown thrown error from `api()` into the typed
 * `SupportRequestError` discriminated union.
 */
export function parseSupportRequestError(caught: unknown): SupportRequestError {
  if (caught instanceof ApiError) {
    if (caught.status === 409) {
      return {
        type: 'conflict_open_request_exists',
        message: 'You already have an open request of that kind.',
        status: 409,
      };
    }
    if (caught.status === 429) {
      return {
        type: 'rate_limited',
        message: 'Too many requests, try again later.',
        status: 429,
      };
    }
    return {
      type: 'unknown',
      message: caught.message || GENERIC_ERROR,
      status: caught.status,
    };
  }
  return {
    type: 'unknown',
    message: caught instanceof Error ? caught.message : GENERIC_ERROR,
    status: null,
  };
}

interface UseSupportRequestsOptions {
  limit?: number;
  offset?: number;
}

export interface UseSupportRequestsResult {
  data: SupportRequest[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  /**
   * Optimistically prepend a freshly-created row to the in-memory list so
   * the consumer can avoid a round-trip after `create()`.
   */
  prepend: (row: SupportRequest) => void;
}

/**
 * Paginated list of the caller's own support requests, newest first.
 *
 * Mirrors the fetch-hook pattern used by `useAdminUsers`: a single in-flight
 * `AbortController` per dependency tuple; abort on unmount and on filter
 * changes; `refresh()` re-fires the same fetch.
 */
export function useSupportRequests(
  opts: UseSupportRequestsOptions = {},
): UseSupportRequestsResult {
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const [data, setData] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchOnce = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      const res = await api<
        | SupportRequest[]
        | { items?: SupportRequest[]; rows?: SupportRequest[] }
      >(
        `/v1/support/requests?${params.toString()}`,
        { signal: ctrl.signal },
      );
      if (ctrl.signal.aborted) return;
      // Backend returns the {items, total, limit, offset} envelope per the
      // SupportRequestListResponse schema. Accept bare arrays and the older
      // {rows: []} envelope too so the hook stays robust to shape drift.
      const rows = Array.isArray(res)
        ? res
        : (res?.items ?? res?.rows ?? []);
      setData(rows);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      if ((e as { name?: string })?.name === 'AbortError') return;
      setError(e instanceof Error ? e : new Error(String(e)));
      setData([]);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchOnce();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchOnce]);

  const prepend = useCallback((row: SupportRequest) => {
    setData((prev) => [row, ...prev]);
  }, []);

  return { data, loading, error, refresh: fetchOnce, prepend };
}

export interface UseSupportRequestActionsResult {
  create: (payload: CreateSupportRequestPayload) => Promise<SupportRequest>;
}

/**
 * Mutating actions on `/v1/support/requests`. Today this is just `create`.
 * The hook does not own list state: the consumer is expected to call
 * `useSupportRequests().prepend(row)` (or `refresh()`) on success.
 */
export function useSupportRequestActions(): UseSupportRequestActionsResult {
  const create = useCallback(
    async (payload: CreateSupportRequestPayload): Promise<SupportRequest> => {
      try {
        return await api<SupportRequest>('/v1/support/requests', {
          method: 'POST',
          body: payload,
        });
      } catch (caught) {
        // Re-raise the parsed error so the caller can switch on `type`.
        // The original ApiError is preserved on `cause` for logging.
        const parsed = parseSupportRequestError(caught);
        const wrapped = new Error(parsed.message) as Error & {
          type: SupportRequestErrorType;
          status: number | null;
        };
        wrapped.type = parsed.type;
        wrapped.status = parsed.status;
        throw wrapped;
      }
    },
    [],
  );

  return { create };
}
