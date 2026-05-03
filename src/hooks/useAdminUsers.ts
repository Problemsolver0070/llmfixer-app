import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

/**
 * Row shape returned by `GET /v1/admin/users`. Mirrors the user-list view
 * exposed by the api repo (see `app.routers.admin.users.list_users`). Fields
 * on the backend row that the UI does not consume are intentionally omitted
 * from the type to keep the surface small.
 */
export interface AdminUserRow {
  id: string;
  email: string;
  role?: 'user' | 'admin';
  status: string;
  plan_id: string | null;
  seat_count: number | null;
  paypal_sub_id: string | null;
  paypal_sub_status: string | null;
  cancels_at: string | null;
  comp_until: string | null;
  trial_ends_at: string | null;
  requests_this_week: number | null;
  output_tokens_this_week: number | null;
  created_at: string;
  last_active_at: string | null;
}

export interface AdminUsersListResult {
  rows: AdminUserRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface UseAdminUsersFilters {
  q?: string | null;
  limit?: number;
  offset?: number;
}

/**
 * Paginated, server-side list of users via `GET /v1/admin/users`.
 *
 * The hook re-fetches whenever any filter primitive changes and aborts any
 * in-flight request when the dependency set changes or the consumer
 * unmounts. The backend supports only `q` (case-insensitive email substring)
 * plus `limit` / `offset`; status and plan filtering are applied client-side
 * by the caller (see `Users.tsx`).
 */
export function useAdminUsers(filters: UseAdminUsersFilters = {}): {
  rows: AdminUserRow[];
  total: number;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const q = filters.q ?? null;
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
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
      if (q && q.trim().length > 0) params.set('q', q.trim());
      params.set('limit', String(limit));
      params.set('offset', String(offset));

      const res = await api<AdminUsersListResult>(
        `/v1/admin/users?${params.toString()}`,
        { signal: ctrl.signal },
      );
      if (ctrl.signal.aborted) return;
      setRows(res.rows ?? []);
      setTotal(res.total ?? 0);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      // The fetch wrapper rethrows AbortError as a generic Error; treat any
      // signal abort as a no-op so React state stays consistent.
      if ((e as { name?: string })?.name === 'AbortError') return;
      setError(e instanceof Error ? e : new Error(String(e)));
      setRows([]);
      setTotal(0);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [q, limit, offset]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchOnce();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchOnce]);

  return { rows, total, loading, error, refresh: fetchOnce };
}

/**
 * Single-user mutations against the admin endpoints. Kept in this module so
 * the parallel UserDetail page can import them from the same place. The list
 * view (`Users.tsx`) does not call these; row-level actions live on the
 * detail page.
 */
export function useAdminUserActions(): {
  comp: (id: string, days: number) => Promise<void>;
  extendTrial: (id: string, days: number) => Promise<void>;
  lock: (id: string) => Promise<void>;
} {
  const comp = useCallback(async (id: string, days: number) => {
    await api(`/v1/admin/users/${id}/comp`, { method: 'POST', body: { days } });
  }, []);

  const extendTrial = useCallback(async (id: string, days: number) => {
    await api(`/v1/admin/users/${id}/extend-trial`, {
      method: 'POST',
      body: { days },
    });
  }, []);

  const lock = useCallback(async (id: string) => {
    await api(`/v1/admin/users/${id}/lock`, { method: 'POST' });
  }, []);

  return { comp, extendTrial, lock };
}
