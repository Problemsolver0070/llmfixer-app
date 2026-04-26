import { useCallback, useState } from 'react';
import { api } from '@/lib/api';

export interface AdminUserRow {
  id: string;
  email: string;
  role: 'user' | 'admin';
  status: string;
  trial_ends_at: string | null;
  paypal_sub_id: string | null;
  cancels_at: string | null;
  comp_until: string | null;
  created_at: string;
}

export function useAdminUsers() {
  const [results, setResults] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const out = await api<{ items: AdminUserRow[]; total: number }>(
        `/v1/admin/users?q=${encodeURIComponent(q)}&limit=50&offset=0`,
      );
      setResults(out.items);
    } finally {
      setLoading(false);
    }
  }, []);

  const comp = useCallback(async (id: string, days: number) => {
    await api(`/v1/admin/users/${id}/comp`, { method: 'POST', body: { days } });
  }, []);

  const extendTrial = useCallback(async (id: string, days: number) => {
    await api(`/v1/admin/users/${id}/extend-trial`, { method: 'POST', body: { days } });
  }, []);

  const lock = useCallback(async (id: string) => {
    await api(`/v1/admin/users/${id}/lock`, { method: 'POST' });
  }, []);

  return { results, loading, search, comp, extendTrial, lock };
}
