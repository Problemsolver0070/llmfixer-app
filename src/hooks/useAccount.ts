import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export interface AccountData {
  user: {
    id: string;
    email: string;
    role: 'user' | 'admin';
    status: string;
    trial_ends_at: string | null;
    paypal_sub_id: string | null;
    cancels_at: string | null;
    comp_until: string | null;
    plan_id: string | null;
    seat_count: number;
    workspace_admin_id: string | null;
  };
  requests_this_week: number;
  active_key_count: number;
}

export interface UseAccountResult {
  data: AccountData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useAccount(): UseAccountResult {
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOnce = useCallback(async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setData(null);
      setLoading(false);
      return;
    }
    try {
      const result = await api<AccountData>('/v1/account');
      setData(result);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch on mount; setState within async callback is intentional here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchOnce();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setData(null);
        setError(null);
        setLoading(false);
        return;
      }
      // Refresh on auth events that indicate the active session/user changed.
      // SIGNED_IN fires after a magic-link / password sign-in (the session
      // arrives via URL fragment); USER_UPDATED fires after email change /
      // password reset; INITIAL_SESSION fires on tab restore. We skip
      // TOKEN_REFRESHED (hourly silent rotation) because the user/account
      // payload is unchanged and we don't want to thrash the API.
      if (
        event === 'SIGNED_IN' ||
        event === 'USER_UPDATED' ||
        event === 'INITIAL_SESSION'
      ) {
        void fetchOnce();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [fetchOnce]);

  return { data, loading, error, refresh: fetchOnce };
}
