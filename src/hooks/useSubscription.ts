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
    type: 'paid_usage_grant';
    days_added?: number;
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

  useEffect(() => {
    // Initial fetch on mount; setState within async callback is intentional here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSubscription();
  }, [fetchSubscription]);

  const activate = useCallback(
    async (
      paypalSubId: string,
      planId = 'solo-weekly',
      seatCount = 1,
      discountCode: string | null = null,
    ) => {
      const body: {
        paypal_sub_id: string;
        plan_id: string;
        seat_count: number;
        discount_code?: string;
      } = { paypal_sub_id: paypalSubId, plan_id: planId, seat_count: seatCount };
      const trimmed = discountCode?.trim();
      if (trimmed) body.discount_code = trimmed;
      await api('/v1/billing/subscriptions/activate', {
        method: 'POST',
        body,
      });
      await refresh();
      await fetchSubscription();
    },
    [refresh, fetchSubscription],
  );

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

  const changePlan = useCallback(
    async (planId: string, seatCount: number) => {
      await api('/v1/billing/subscriptions/change-plan', {
        method: 'POST',
        body: { plan_id: planId, seat_count: seatCount },
      });
      await refresh();
      await fetchSubscription();
    },
    [refresh, fetchSubscription],
  );

  const activateWithCard = useCallback(
    async (
      planId: string,
      seatCount: number,
      vaultSetupToken: string,
      discountCode: string | null = null,
    ) => {
      const body: {
        plan_id: string;
        seat_count: number;
        vault_setup_token: string;
        discount_code?: string;
      } = { plan_id: planId, seat_count: seatCount, vault_setup_token: vaultSetupToken };
      const trimmed = discountCode?.trim();
      if (trimmed) body.discount_code = trimmed;
      await api('/v1/billing/subscriptions/activate-with-card', {
        method: 'POST',
        body,
      });
      await refresh();
      await fetchSubscription();
    },
    [refresh, fetchSubscription],
  );

  return { subscription, loading, activate, activateWithCard, cancel, redeem, changePlan };
}
