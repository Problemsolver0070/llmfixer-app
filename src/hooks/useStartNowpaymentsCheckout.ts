import { useCallback, useState } from 'react';
import { api, ApiError } from '@/lib/api';

/**
 * Response shape for `POST /v1/billing/nowpayments/checkout`.
 *
 * The backend mints a NOWPayments-hosted invoice and returns the URL
 * the user must be redirected to plus the upstream invoice id (kept
 * for forensics so support can correlate a partial payment back to
 * the source invoice).
 */
export interface NowpaymentsCheckoutResult {
  invoice_url: string;
  invoice_id: string;
}

/**
 * Closed set of HTTP statuses the backend returns from this route.
 * Mapped to user-facing copy in `mapNowpaymentsErrorMessage` so the
 * component does not echo raw stack traces or upstream error bodies.
 */
const ERROR_MESSAGES: Record<number, string> = {
  400: 'That plan is not available for crypto checkout. Pick another plan.',
  413: 'Request too large.',
  422: 'Invalid plan or seat count.',
  429: 'Too many checkout attempts. Wait a minute and try again.',
  502: 'Crypto payment service is having trouble. Try again, or pick another method.',
  503: 'Crypto payment provider unavailable. Try again or pick another method.',
};

const GENERIC_FALLBACK = 'Something went wrong. Please try again.';

/**
 * Map an arbitrary thrown error from the checkout call to user-facing
 * copy. The backend wraps errors in `{ detail: string }`; we surface
 * a sanitized status-keyed message rather than the raw detail to
 * avoid leaking upstream-provider strings into the UI.
 */
export function mapNowpaymentsErrorMessage(caught: unknown): string {
  if (caught instanceof ApiError) {
    return ERROR_MESSAGES[caught.status] ?? GENERIC_FALLBACK;
  }
  return GENERIC_FALLBACK;
}

export interface UseStartNowpaymentsCheckoutResult {
  mutate: (planId: string, seatCount?: number) => Promise<NowpaymentsCheckoutResult>;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Thin mutation-style wrapper around `POST /v1/billing/nowpayments/checkout`.
 *
 * Components consume `mutate(plan_id, seat_count)` which returns a
 * promise resolving to `{ invoice_url, invoice_id }`. The component is
 * responsible for the redirect (`window.location = invoice_url`) so
 * the hook stays free of side effects on `window` and is trivial to
 * unit-test against a mocked `@/lib/api`.
 */
export function useStartNowpaymentsCheckout(): UseStartNowpaymentsCheckoutResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (planId: string, seatCount = 1): Promise<NowpaymentsCheckoutResult> => {
      setLoading(true);
      setError(null);
      try {
        const out = await api<NowpaymentsCheckoutResult>(
          '/v1/billing/nowpayments/checkout',
          {
            method: 'POST',
            body: { plan_id: planId, seat_count: seatCount },
          },
        );
        return out;
      } catch (caught) {
        setError(mapNowpaymentsErrorMessage(caught));
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
