import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

/**
 * Shape returned by `GET /v1/users/me`.
 *
 * Mirrors `UserResponse` in `llmfixer-api/src/app/schemas/users.py`. The
 * backend collapsed access state to a single binary: `has_active_subscription`
 * (true iff admin_chat_grant OR paypal_sub_status='ACTIVE' OR comp_until > now()).
 */
export interface UserMeData {
  id: string;
  email: string;
  full_name: string | null;
  referral_code: string | null;
  referred_by_user_id: string | null;
  first_paid_charge_at: string | null;
  referral_credit_seconds_accumulated: number;
  is_eligible_to_refer: boolean;
  has_active_subscription: boolean;
  comp_until: string | null;
  plan_id: string | null;
}

export interface UseUserMeResult {
  data: UserMeData | null;
  loading: boolean;
  error: Error | null;
  isEligibleToRefer: boolean;
  hasActiveSubscription: boolean;
  /** True iff the user has paid usage (subscription, comp, or admin grant). */
  hasAccess: boolean;
  refresh: () => Promise<void>;
}

export function useUserMe(): UseUserMeResult {
  const [data, setData] = useState<UserMeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOnce = useCallback(async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    try {
      const result = await api<UserMeData>('/v1/users/me');
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
      // Refresh on auth events that indicate the active user changed. We
      // skip TOKEN_REFRESHED for the same reason `useAccount` does: the
      // hourly silent rotation does not change the user's access state,
      // and we do not want to thrash the API.
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

  const isEligibleToRefer = Boolean(data?.is_eligible_to_refer);
  const hasActiveSubscription = Boolean(data?.has_active_subscription);
  const hasAccess = hasActiveSubscription;

  return {
    data,
    loading,
    error,
    isEligibleToRefer,
    hasActiveSubscription,
    hasAccess,
    refresh: fetchOnce,
  };
}
