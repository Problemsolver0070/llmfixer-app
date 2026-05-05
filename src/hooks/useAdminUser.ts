import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * Detailed admin user record returned by `GET /v1/admin/users/{user_id}`.
 *
 * Mirrors `AdminUserDetailResponse` in the api repo. The list view shape is
 * `AdminUserRow` over in `useAdminUsers.ts`; this hook is for the per-user
 * detail page where we need plan, seats, counters, and override fields.
 */
export interface AdminUserDetail {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
  status: string;
  plan_id: string | null;
  seat_count: number;
  paypal_sub_id: string | null;
  paypal_sub_status: string | null;
  comp_until: string | null;
  trial_ends_at: string | null;
  cancels_at: string | null;
  output_tokens_this_week: number;
  requests_this_week: number;
  output_token_override_per_week: number | null;
  requests_override_per_week: number | null;
  created_at: string;
  last_active_at: string | null;
}

export interface StateOverrideInput {
  comp_until?: string | null;
  status?: string;
  set_comp_until_to_null?: boolean;
  reason: string;
}

export interface CapOverrideInput {
  output_token_override_per_week?: number | null;
  requests_override_per_week?: number | null;
  set_output_to_null?: boolean;
  set_requests_to_null?: boolean;
  reason: string;
}

export interface ChangePlanInput {
  new_plan_sku: string;
  new_seat_count?: number;
  prorate?: boolean;
  reason: string;
}

export interface ClearPlanInput {
  cancel_paypal_sub?: boolean;
  refund_recent_charge?: boolean;
  reason: string;
}

export interface CancelSubInput {
  refund?: boolean;
  reason: string;
}

export interface RefundInput {
  capture_id: string;
  amount_cents?: number | null;
  reason: string;
}

/**
 * Fetch + cache the detail payload for a single user. Refresh after any
 * successful mutation to pick up updated counters / status.
 */
export function useAdminUser(userId: string | null): {
  user: AdminUserDetail | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(userId !== null);
  const [error, setError] = useState<Error | null>(null);

  const fetchOnce = useCallback(async () => {
    if (!userId) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api<AdminUserDetail>(
        `/v1/admin/users/${encodeURIComponent(userId)}`,
      );
      setUser(res);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchOnce();
  }, [fetchOnce]);

  return { user, loading, error, refresh: fetchOnce };
}

/**
 * Mutation surface for the UserDetail page. Each function returns a Promise;
 * the calling component owns its own per-action loading/error UI. All routes
 * are POST under `/v1/admin/users/{user_id}/...` except `deleteUser`, which is
 * DELETE on the bare user resource.
 */
export function useAdminUserMutations(userId: string): {
  stateOverride: (input: StateOverrideInput) => Promise<void>;
  capOverride: (input: CapOverrideInput) => Promise<void>;
  changePlan: (input: ChangePlanInput) => Promise<void>;
  clearPlan: (input: ClearPlanInput) => Promise<void>;
  cancelSub: (input: CancelSubInput) => Promise<void>;
  refund: (input: RefundInput) => Promise<void>;
  comp: (days: number, reason: string) => Promise<void>;
  extendTrial: (days: number, reason: string) => Promise<void>;
  lock: (reason: string) => Promise<void>;
  deleteUser: (reason: string) => Promise<void>;
} {
  const base = `/v1/admin/users/${encodeURIComponent(userId)}`;

  const stateOverride = useCallback(
    async (input: StateOverrideInput) => {
      await api(`${base}/state-override`, { method: 'POST', body: input });
    },
    [base],
  );

  const capOverride = useCallback(
    async (input: CapOverrideInput) => {
      await api(`${base}/cap-override`, { method: 'POST', body: input });
    },
    [base],
  );

  const changePlan = useCallback(
    async (input: ChangePlanInput) => {
      await api(`${base}/change-plan`, { method: 'POST', body: input });
    },
    [base],
  );

  const clearPlan = useCallback(
    async (input: ClearPlanInput) => {
      await api(`${base}/clear-plan`, { method: 'POST', body: input });
    },
    [base],
  );

  const cancelSub = useCallback(
    async (input: CancelSubInput) => {
      await api(`${base}/cancel-sub`, { method: 'POST', body: input });
    },
    [base],
  );

  const refund = useCallback(
    async (input: RefundInput) => {
      await api(`${base}/refund`, { method: 'POST', body: input });
    },
    [base],
  );

  const comp = useCallback(
    async (days: number, reason: string) => {
      await api(`${base}/comp`, {
        method: 'POST',
        body: { days, reason },
      });
    },
    [base],
  );

  const extendTrial = useCallback(
    async (days: number, reason: string) => {
      await api(`${base}/extend-trial`, {
        method: 'POST',
        body: { days, reason },
      });
    },
    [base],
  );

  const lock = useCallback(
    async (reason: string) => {
      await api(`${base}/lock`, { method: 'POST', body: { reason } });
    },
    [base],
  );

  const deleteUser = useCallback(
    async (reason: string) => {
      await api(base, { method: 'DELETE', body: { reason } });
    },
    [base],
  );

  return {
    stateOverride,
    capOverride,
    changePlan,
    clearPlan,
    cancelSub,
    refund,
    comp,
    extendTrial,
    lock,
    deleteUser,
  };
}
