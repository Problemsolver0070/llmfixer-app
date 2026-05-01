import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface Plan {
  sku: string;
  tier: 'solo' | 'workspace';
  cadence: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  paypal_plan_id: string;
  base_price_cents: number;
  per_seat_price_cents: number | null;
  included_seats: number;
  display_price: string;
  discount_pct: number;
  trial_days: number;
}

interface PlansResponse { plans: Plan[]; }

let cache: Plan[] | null = null;
let inflight: Promise<Plan[]> | null = null;

export function _resetPlansCache(): void {
  cache = null;
  inflight = null;
}

async function fetchPlans(): Promise<Plan[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const out = await api<PlansResponse>('/v1/billing/plans', { auth: false });
    cache = out.plans;
    inflight = null;
    return cache;
  })();
  return inflight;
}

export function usePlans(): {
  plans: Plan[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
} {
  const [plans, setPlans] = useState<Plan[]>(cache ?? []);
  const [loading, setLoading] = useState<boolean>(cache === null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Cache-hit path: state was already initialized from `cache` in useState
    // above, so there's nothing to do until a refresh() is triggered.
    if (cache) return;
    let alive = true;
    fetchPlans()
      .then((p) => {
        if (!alive) return;
        setPlans(p);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setPlans([]);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  function refresh(): void {
    _resetPlansCache();
    setLoading(true);
    fetchPlans()
      .then(setPlans)
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => setLoading(false));
  }

  return { plans, loading, error, refresh };
}
