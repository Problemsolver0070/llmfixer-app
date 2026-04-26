import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export interface PromoCode {
  id: string;
  code: string;
  type: 'free_time' | 'full_comp' | 'trial_extension';
  amount_int: number;
  max_redemptions: number | null;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

export interface CreatePromoInput {
  code: string;
  type: PromoCode['type'];
  amount_int: number;
  max_redemptions: number | null;
  expires_at: string | null;
  active: boolean;
}

export function useAdminPromos() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('promo_codes')
      .select('id, code, type, amount_int, max_redemptions, expires_at, active, created_at')
      .order('created_at', { ascending: false });
    setPromos((data ?? []) as PromoCode[]);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount; refresh is stable (useCallback with [])
  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: CreatePromoInput) => {
    await api('/v1/admin/promos', { method: 'POST', body: input });
    await refresh();
  }, [refresh]);

  const toggleActive = useCallback(async (id: string, active: boolean) => {
    await api(`/v1/admin/promos/${id}`, { method: 'PATCH', body: { active } });
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await api(`/v1/admin/promos/${id}`, { method: 'DELETE' });
    await refresh();
  }, [refresh]);

  return { promos, loading, create, toggleActive, remove, refresh };
}
