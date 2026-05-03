import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

/**
 * Shape returned by `GET /v1/referrals/me` (R3 commit 15b790d).
 *
 * Mirrors the dashboard summary used by the `/app/refer` surface:
 * the caller's referral code + share link, the eligibility flag, the
 * pending-cap counters, the lifetime credit ledger, and one row per
 * referral (referee email masked).
 */
export interface ReferralRow {
  id: string;
  referee_email_masked: string;
  status: 'pending' | 'claimed' | 'expired';
  created_at: string;
  claimed_at: string | null;
  expires_at: string | null;
  credit_seconds_granted: number;
}

export interface ReferralsData {
  referral_code: string | null;
  referral_link: string | null;
  is_eligible_to_refer: boolean;
  pending_count: number;
  pending_slots_remaining: number;
  accumulated_credit_seconds: number;
  lifetime_cap_remaining_seconds: number;
  referrals: ReferralRow[];
}

export interface UseReferralsResult {
  data: ReferralsData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

// Module-level cache. Mirrors the pattern used by `useModels` etc.: the
// page can be re-mounted without re-firing the network call, but a manual
// `refresh()` always re-fetches.
let cachedData: ReferralsData | null = null;
let inflight: Promise<ReferralsData> | null = null;

function clearCache(): void {
  cachedData = null;
  inflight = null;
}

async function fetchReferrals(): Promise<ReferralsData> {
  if (inflight) return inflight;
  inflight = api<ReferralsData>('/v1/referrals/me')
    .then((result) => {
      cachedData = result;
      return result;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useReferrals(): UseReferralsResult {
  const [data, setData] = useState<ReferralsData | null>(cachedData);
  const [loading, setLoading] = useState<boolean>(cachedData === null);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async (force: boolean) => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      clearCache();
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    if (!force && cachedData !== null) {
      setData(cachedData);
      setError(null);
      setLoading(false);
      return;
    }
    if (force) {
      cachedData = null;
      inflight = null;
    }
    try {
      const result = await fetchReferrals();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  useEffect(() => {
    // Initial fetch on mount; setState within async callback is intentional here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(false);
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearCache();
        setData(null);
        setError(null);
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  return { data, loading, error, refresh };
}

// Test-only hook to wipe the module cache between tests.
export function __resetReferralsCacheForTests(): void {
  clearCache();
}
