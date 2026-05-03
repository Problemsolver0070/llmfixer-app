import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

/**
 * Shape returned by `GET /v1/users/me` (R3, T3.1).
 *
 * Mirrors `UserResponse` in `llmfixer-api/src/app/schemas/users.py`. Used by
 * `PostSignupGate` and `TrialGate` to decide whether the caller has chat /
 * proxy access (active subscription, demo window, or trial window).
 */
export interface UserMeData {
  id: string;
  email: string;
  full_name: string | null;
  referral_code: string | null;
  referred_by_user_id: string | null;
  demo_expires_at: string | null;
  trial_expires_at: string | null;
  first_paid_charge_at: string | null;
  referral_credit_seconds_accumulated: number;
  is_eligible_to_refer: boolean;
  has_active_subscription: boolean;
  in_demo_window: boolean;
  in_trial_window: boolean;
}

export interface UseUserMeResult {
  data: UserMeData | null;
  loading: boolean;
  error: Error | null;
  isEligibleToRefer: boolean;
  hasActiveSubscription: boolean;
  inDemoWindow: boolean;
  inTrialWindow: boolean;
  /** True iff at least one of the three access windows is open. */
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
      // hourly silent rotation does not change the user's trial / demo
      // state, and we do not want to thrash the API.
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
  const inDemoWindow = Boolean(data?.in_demo_window);
  const inTrialWindow = Boolean(data?.in_trial_window);
  const hasAccess = hasActiveSubscription || inDemoWindow || inTrialWindow;

  return {
    data,
    loading,
    error,
    isEligibleToRefer,
    hasActiveSubscription,
    inDemoWindow,
    inTrialWindow,
    hasAccess,
    refresh: fetchOnce,
  };
}
