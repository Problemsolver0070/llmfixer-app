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

export function useAdminMetrics() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<MetricsData>('/v1/admin/metrics').then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  return { data, loading };
}
