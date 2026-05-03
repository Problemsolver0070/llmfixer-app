import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * Audit log row returned by `GET /v1/admin/audit-log`.
 *
 * The `before` and `after` fields are arbitrary JSON snapshots of whichever
 * resource was mutated, so they're typed as `unknown`. The History tab
 * renders them as `JSON.stringify(_, null, 2)` inside an expandable row.
 */
export interface AdminAuditLogRow {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  before: unknown;
  after: unknown;
}

export interface AdminAuditLogFilters {
  target_type?: string;
  target_id?: string;
  actor_user_id?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

interface AuditLogResponse {
  rows: AdminAuditLogRow[];
  total: number;
}

function buildQuery(filters: AdminAuditLogFilters): string {
  const params = new URLSearchParams();
  if (filters.target_type) params.set('target_type', filters.target_type);
  if (filters.target_id) params.set('target_id', filters.target_id);
  if (filters.actor_user_id) params.set('actor_user_id', filters.actor_user_id);
  if (filters.action) params.set('action', filters.action);
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  if (filters.offset !== undefined) params.set('offset', String(filters.offset));
  const q = params.toString();
  return q.length > 0 ? `?${q}` : '';
}

/**
 * Read the audit log with the given filters. Returns the same shape as the
 * comp/discount list hooks: `{ rows, total, loading, error, refresh }`.
 *
 * Re-fetches whenever the stable primitive fields of the filter change. The
 * caller can also call `refresh()` manually after a mutation to pick up the
 * row that was just appended server-side.
 */
export function useAdminAuditLog(filters: AdminAuditLogFilters): {
  rows: AdminAuditLogRow[];
  total: number;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [rows, setRows] = useState<AdminAuditLogRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const query = buildQuery(filters);

  const fetchOnce = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<AuditLogResponse>(`/v1/admin/audit-log${query}`);
      setRows(res.rows ?? []);
      setTotal(res.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchOnce();
  }, [fetchOnce]);

  return { rows, total, loading, error, refresh: fetchOnce };
}
