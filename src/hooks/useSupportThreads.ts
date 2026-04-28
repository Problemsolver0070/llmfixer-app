import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export type SupportThread = {
  id: string;
  title: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

type ThreadsResponse = { threads: SupportThread[] };

export function useSupportThreads() {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api<ThreadsResponse>('/v1/support/threads');
      setThreads(data.threads);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount; refetch is stable (useCallback with [])
  useEffect(() => { void refetch(); }, [refetch]);

  const create = useCallback(async (): Promise<SupportThread> => {
    const created = await api<SupportThread>('/v1/support/threads', { method: 'POST' });
    await refetch();
    return created;
  }, [refetch]);

  const rename = useCallback(async (id: string, title: string) => {
    await api<SupportThread>(`/v1/support/threads/${id}`, { method: 'PATCH', body: { title } });
    await refetch();
  }, [refetch]);

  const archive = useCallback(async (id: string) => {
    await api<SupportThread>(`/v1/support/threads/${id}`, { method: 'PATCH', body: { archived: true } });
    await refetch();
  }, [refetch]);

  const remove = useCallback(async (id: string) => {
    await api<undefined>(`/v1/support/threads/${id}`, { method: 'DELETE' });
    await refetch();
  }, [refetch]);

  return { threads, loading, error, create, rename, archive, remove, refetch };
}
