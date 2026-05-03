import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * Comp code (paid-usage code) shape returned by `GET /v1/admin/codes/comp` and
 * the mint endpoints. Mirrors the row in `public.comp_codes` with a server-
 * computed `status` field.
 */
export interface CompCode {
  id: string;
  code: string;
  granted_plan_id: string;
  granted_seat_count: number;
  granted_seconds: number;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  bound_user_id: string | null;
  bound_user_email?: string | null;
  batch_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  status?: 'active' | 'exhausted' | 'expired';
}

export interface MintCompCodeInput {
  code?: string | null;
  granted_plan_id: string;
  granted_seconds: number;
  max_uses?: number;
  expires_at?: string | null;
  bound_user_id?: string | null;
  notes?: string | null;
  reason: string;
}

export interface MintCompCodeBatchInput {
  count: number;
  granted_plan_id: string;
  granted_seconds: number;
  max_uses?: number;
  expires_at?: string | null;
  notes?: string | null;
  reason: string;
}

export interface MintBatchResult {
  rows: CompCode[];
  batch_id: string;
  count: number;
}

export interface CompCodesListFilters {
  status?: 'active' | 'exhausted' | 'expired' | 'all';
  batch_id?: string | null;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CompCodesListResult {
  rows: CompCode[];
  total: number;
}

/** Mint a single comp code via `POST /v1/admin/codes/comp`. */
export function useMintCompCode(): {
  mint: (input: MintCompCodeInput) => Promise<CompCode>;
  loading: boolean;
  error: Error | null;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mint = useCallback(async (input: MintCompCodeInput) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<CompCode>('/v1/admin/codes/comp', {
        method: 'POST',
        body: input,
      });
      return res;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mint, loading, error };
}

/** Mint a batch of comp codes via `POST /v1/admin/codes/comp/batch`. */
export function useMintCompCodeBatch(): {
  mintBatch: (input: MintCompCodeBatchInput) => Promise<MintBatchResult>;
  loading: boolean;
  error: Error | null;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mintBatch = useCallback(async (input: MintCompCodeBatchInput) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<MintBatchResult>('/v1/admin/codes/comp/batch', {
        method: 'POST',
        body: input,
      });
      return res;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mintBatch, loading, error };
}

/**
 * Paginated list of comp codes via `GET /v1/admin/codes/comp`.
 *
 * Caches by filter set in component state. Call `refresh()` after a successful
 * mint to pick up the new rows.
 */
export function useCompCodesList(filters: CompCodesListFilters): {
  rows: CompCode[];
  total: number;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [rows, setRows] = useState<CompCode[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const status = filters.status ?? 'active';
  const batchId = filters.batch_id ?? null;
  const search = filters.search ?? '';
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const fetchOnce = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('status', status);
      if (batchId) params.set('batch_id', batchId);
      if (search) params.set('search', search);
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      const res = await api<CompCodesListResult>(
        `/v1/admin/codes/comp?${params.toString()}`,
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
  }, [status, batchId, search, limit, offset]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchOnce();
  }, [fetchOnce]);

  return { rows, total, loading, error, refresh: fetchOnce };
}
