import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface MetricsRevenue {
  mrr_cents: number;
  arr_cents: number;
  active_subs: number;
  trial_users: number;
  comped_users: number;
  churn_30d_pct: number;
}

export interface MetricsFunnel {
  signups_30d: number;
  trial_started_30d: number;
  first_paid_charge_30d: number;
}

export interface MetricsEngagement {
  dau: number;
  wau: number;
  mau: number;
}

export interface TopBurner {
  user_id: string;
  email: string;
  output_tokens_this_week: number;
  requests_this_week: number;
}

export interface MetricsData {
  revenue: MetricsRevenue;
  funnel: MetricsFunnel;
  engagement: MetricsEngagement;
  top_burners: TopBurner[];
  computed_at: string;
}

export interface UseAdminMetricsResult {
  data: MetricsData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * How often the dashboard re-fetches `/v1/admin/metrics` while mounted.
 * The backend caches the heavy joins per-minute on its side, so 60s is
 * the natural refresh cadence; anything faster would just hammer the
 * cache layer for the same payload.
 */
export const METRICS_POLL_INTERVAL_MS = 60_000;

export function useAdminMetrics(): UseAdminMetricsResult {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track the in-flight request so a manual refresh during polling does not
  // race with the scheduled tick (later result wins).
  const cancelledRef = useRef(false);

  const fetchOnce = useCallback(async () => {
    try {
      const d = await api<MetricsData>('/v1/admin/metrics');
      if (cancelledRef.current) return;
      setData(d);
      setError(null);
    } catch (e: unknown) {
      if (cancelledRef.current) return;
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchOnce();
    const id = window.setInterval(() => {
      void fetchOnce();
    }, METRICS_POLL_INTERVAL_MS);
    return () => {
      cancelledRef.current = true;
      window.clearInterval(id);
    };
  }, [fetchOnce]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchOnce();
  }, [fetchOnce]);

  return { data, loading, error, refresh };
}
