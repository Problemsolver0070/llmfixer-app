import { useCallback, useState } from 'react';
import { api, ApiError } from '@/lib/api';

/**
 * Response shape for `POST /v1/billing/razorpay/subscription`.
 *
 * `short_url` is the Razorpay-hosted checkout URL; for v1 this is the
 * only redirect path wired in the UI. If the upstream returns null we
 * surface a 502-style error to the user (per the brief's instructions
 * for the v1 cutover scope).
 */
export interface RazorpaySubscriptionResult {
  subscription_id: string;
  short_url: string | null;
}

/**
 * Closed set of HTTP statuses the backend returns from this route.
 * `501` is special: Razorpay workspace tiers are v1-deferred, so the
 * UI shows a friendly coming-soon hint that recommends the crypto
 * (NOWPayments) flow for workspace plans.
 */
const ERROR_MESSAGES: Record<number, string> = {
  400: 'That plan is not available for Razorpay. Pick another plan.',
  413: 'Request too large.',
  422: 'Invalid plan or seat count.',
  429: 'Too many checkout attempts. Wait a minute and try again.',
  501: 'Razorpay workspace tiers coming soon, please use crypto payment for workspace plans.',
  502: 'Razorpay is having trouble. Try again, or pick another method.',
  503: 'Razorpay unavailable. Try again or pick another method.',
};

const GENERIC_FALLBACK = 'Something went wrong. Please try again.';

/**
 * Map an arbitrary thrown error from the Razorpay subscription call
 * to user-facing copy. The backend wraps errors in `{ detail: string }`;
 * we surface a sanitized status-keyed message so the UI never echoes
 * raw upstream error bodies.
 */
export function mapRazorpayErrorMessage(caught: unknown): string {
  if (caught instanceof ApiError) {
    return ERROR_MESSAGES[caught.status] ?? GENERIC_FALLBACK;
  }
  return GENERIC_FALLBACK;
}

export interface UseStartRazorpaySubscriptionResult {
  mutate: (planId: string, seatCount?: number) => Promise<RazorpaySubscriptionResult>;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Thin mutation-style wrapper around `POST /v1/billing/razorpay/subscription`.
 *
 * Components consume `mutate(plan_id, seat_count)` which returns a
 * promise resolving to `{ subscription_id, short_url }`. The component
 * is responsible for redirecting to `short_url` so the hook stays
 * free of side effects on `window` and is trivial to unit-test against
 * a mocked `@/lib/api`.
 *
 * v1 scope: the short_url path is the only one wired. If `short_url`
 * is null the component should surface a 502-style error rather than
 * fall back to Razorpay's `Checkout.js` (that secondary path is a
 * post-v1 follow-up, not in this PR).
 */
export function useStartRazorpaySubscription(): UseStartRazorpaySubscriptionResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (planId: string, seatCount = 1): Promise<RazorpaySubscriptionResult> => {
      setLoading(true);
      setError(null);
      try {
        const out = await api<RazorpaySubscriptionResult>(
          '/v1/billing/razorpay/subscription',
          {
            method: 'POST',
            body: { plan_id: planId, seat_count: seatCount },
          },
        );
        return out;
      } catch (caught) {
        setError(mapRazorpayErrorMessage(caught));
        throw caught;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { mutate, loading, error, reset };
}
