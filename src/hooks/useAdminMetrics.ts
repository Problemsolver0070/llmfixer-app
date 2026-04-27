import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface MetricsData {
  total_users: number;
  verified_users: number;
  active_subs: number;
  mrr_cents: number;
  signups_7d: number;
  cancellations_7d: number;
}

export interface UseAdminMetricsResult {
  data: MetricsData | null;
  loading: boolean;
  error: Error | null;
}

export function useAdminMetrics(): UseAdminMetricsResult {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<MetricsData>('/v1/admin/metrics').then(
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
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
