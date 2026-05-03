import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * Discount code (percentage-off coupon) shape returned by
 * `GET /v1/admin/codes/discount` and the mint endpoints. Mirrors the row in
 * `public.discount_codes` with a server-computed `status` field.
 *
 * Discount codes apply post-charge: the user picks a paid plan, applies the
 * code at checkout, and the percentage off is realized as a `comp_until` push
 * on the first paid charge (Path B). `applies_to_plan_skus` empty means the
 * code applies to every active SKU (solo + workspace).
 */
export interface DiscountCode {
  id: string;
  code: string;
  discount_pct: number;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  applies_to_plan_skus: string[];
  batch_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  status?: 'active' | 'exhausted' | 'expired';
}

export interface MintDiscountCodeInput {
  code?: string | null;
  discount_pct: number;
  max_uses?: number;
  expires_at?: string | null;
  applies_to_plan_skus?: string[];
  notes?: string | null;
  reason: string;
}

export interface MintDiscountCodeBatchInput {
  count: number;
  discount_pct: number;
  max_uses?: number;
  expires_at?: string | null;
  applies_to_plan_skus?: string[];
  notes?: string | null;
  reason: string;
}

export interface MintDiscountBatchResult {
  // Backend returns the list under the key `codes`. Matches
  // `DiscountCodeBatchResponse.codes` in the api repo.
  codes: DiscountCode[];
  batch_id: string;
  count: number;
}

export interface DiscountCodesListFilters {
  status?: 'active' | 'exhausted' | 'expired' | 'all';
  batch_id?: string | null;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface DiscountCodesListResult {
  rows: DiscountCode[];
  total: number;
}

/** Mint a single discount code via `POST /v1/admin/codes/discount`. */
export function useMintDiscountCode(): {
  mint: (input: MintDiscountCodeInput) => Promise<DiscountCode>;
  loading: boolean;
  error: Error | null;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mint = useCallback(async (input: MintDiscountCodeInput) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<DiscountCode>('/v1/admin/codes/discount', {
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

/** Mint a batch of discount codes via `POST /v1/admin/codes/discount/batch`. */
export function useMintDiscountCodeBatch(): {
  mintBatch: (input: MintDiscountCodeBatchInput) => Promise<MintDiscountBatchResult>;
  loading: boolean;
  error: Error | null;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mintBatch = useCallback(async (input: MintDiscountCodeBatchInput) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<MintDiscountBatchResult>(
        '/v1/admin/codes/discount/batch',
        {
          method: 'POST',
          body: input,
        },
      );
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
 * Paginated list of discount codes via `GET /v1/admin/codes/discount`.
 *
 * Re-fetches whenever the filter set changes. Call `refresh()` after a
 * successful mint to pick up the new rows.
 */
export function useDiscountCodesList(filters: DiscountCodesListFilters): {
  rows: DiscountCode[];
  total: number;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [rows, setRows] = useState<DiscountCode[]>([]);
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
      const res = await api<DiscountCodesListResult>(
        `/v1/admin/codes/discount?${params.toString()}`,
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
