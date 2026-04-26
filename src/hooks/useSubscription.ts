import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAccount } from '@/hooks/useAccount';

export interface PaypalSubscription {
  paypal_sub_id: string;
  status: string;
  next_billing_time: string | null;
  plan_id: string;
}

export interface RedeemResult {
  applied_effect: {
    type: 'free_time' | 'full_comp' | 'trial_extension';
    days_added?: number;
    new_trial_ends_at?: string;
    comp_until?: string;
  };
}

export function useSubscription() {
  const { data: account, refresh } = useAccount();
  const [subscription, setSubscription] = useState<PaypalSubscription | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (!account?.user.paypal_sub_id) {
      setSubscription(null);
      return;
    }
    setLoading(true);
    try {
      const out = await api<PaypalSubscription>('/v1/billing/subscription');
      setSubscription(out);
    } finally {
      setLoading(false);
    }
  }, [account?.user.paypal_sub_id]);

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

  const activate = useCallback(async (paypalSubId: string) => {
    await api('/v1/billing/subscriptions/activate', {
      method: 'POST',
      body: { paypal_sub_id: paypalSubId },
    });
    await refresh();
    await fetchSubscription();
  }, [refresh, fetchSubscription]);

  const cancel = useCallback(async () => {
    await api('/v1/billing/subscriptions/cancel', { method: 'POST' });
    await refresh();
    await fetchSubscription();
  }, [refresh, fetchSubscription]);

  const redeem = useCallback(async (code: string): Promise<RedeemResult> => {
    const out = await api<RedeemResult>('/v1/promos/redeem', {
      method: 'POST', body: { code },
    });
    await refresh();
    return out;
  }, [refresh]);

  return { subscription, loading, activate, cancel, redeem };
}
