import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export interface ApiKey {
  id: string;
  label: string | null;
  key_prefix: string;
  status: 'active' | 'revoked';
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface CreatedKey {
  id: string;
  key_prefix: string;
  key: string;
}

export function useKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, label, key_prefix, status, created_at, last_used_at, revoked_at')
      .order('created_at', { ascending: false });
    if (error) setError(error as unknown as Error);
    else setKeys((data ?? []) as ApiKey[]);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount; refresh is stable (useCallback with [])
  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (label?: string): Promise<CreatedKey> => {
    const out = await api<CreatedKey>('/v1/keys', { method: 'POST', body: { label } });
    await refresh();
    return out;
  }, [refresh]);

  const revoke = useCallback(async (id: string) => {
    await api(`/v1/keys/${id}`, { method: 'DELETE' });
    await refresh();
  }, [refresh]);

  return { keys, loading, error, create, revoke, refresh };
}
