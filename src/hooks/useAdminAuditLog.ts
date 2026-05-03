import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * One row from `GET /v1/admin/audit-log`. Mirrors `public.admin_audit_log`,
 * with the metadata blob exposed as a typed (but loose) object so callers can
 * render before/after JSON without losing fidelity.
 */
export interface AuditLogRow {
  id: number;
  actor_id: string | null;
  action: string;
  target_user_id: string | null;
  metadata: AuditLogMetadata;
  paypal_event_id: string | null;
  created_at: string;
}

export interface AuditLogMetadata {
  target_type?: string;
  target_id?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  // Allow arbitrary extra fields so the UI does not drop unknown metadata.
  [key: string]: unknown;
}

export interface AuditLogFilters {
  target_type?: string;
  target_id?: string;
  action?: string;
  admin_user_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogResult {
  rows: AuditLogRow[];
  total: number;
}

/**
 * Paginated audit-log fetcher for the admin viewer page. Re-fetches whenever
 * any of the filter primitives change. Call `refresh()` to force a re-fetch
 * without changing filters.
 */
export function useAdminAuditLog(filters: AuditLogFilters): {
  rows: AuditLogRow[];
  total: number;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const targetType = filters.target_type ?? '';
  const targetId = filters.target_id ?? '';
  const action = filters.action ?? '';
  const adminUserId = filters.admin_user_id ?? '';
  const dateFrom = filters.date_from ?? '';
  const dateTo = filters.date_to ?? '';
  const search = filters.search ?? '';
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const fetchOnce = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (targetType) params.set('target_type', targetType);
      if (targetId) params.set('target_id', targetId);
      if (action) params.set('action', action);
      if (adminUserId) params.set('admin_user_id', adminUserId);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (search) params.set('search', search);
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      const res = await api<AuditLogResult>(
        `/v1/admin/audit-log?${params.toString()}`,
      );
      setRows(res.rows);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    targetType,
    targetId,
    action,
    adminUserId,
    dateFrom,
    dateTo,
    search,
    limit,
    offset,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchOnce();
  }, [fetchOnce]);

  return { rows, total, loading, error, refresh: fetchOnce };
}
