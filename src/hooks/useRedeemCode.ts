import { useCallback, useState } from 'react';
import { api, ApiError } from '@/lib/api';

/**
 * Shape returned by `POST /v1/codes/redeem` (R2.T2.5, R3.T3.3).
 *
 * Mirrors the success response from the backend's paid-usage code redemption
 * endpoint. On redeem, the user is granted `granted_seconds` of access on
 * `granted_plan_id` with `granted_seat_count` seats; their `comp_until` is
 * pushed to `new_comp_until` and their status flips to `new_status`
 * (typically `comped`).
 */
export interface RedeemCodeResult {
  granted_plan_id: string;
  granted_seat_count: number;
  granted_seconds: number;
  new_comp_until: string;
  new_status: string;
}

/**
 * Closed set of error codes returned by `POST /v1/codes/redeem` on 4xx,
 * inside the FastAPI HTTPException detail object: `{ error_code, message }`.
 */
export type RedeemErrorCode =
  | 'code_not_found'
  | 'code_expired'
  | 'code_exhausted'
  | 'code_bound_to_other_user'
  | 'code_already_redeemed'
  | 'code_blocked_active_subscription'
  | 'code_plan_unavailable';

export interface RedeemError {
  /** Known backend error_code, or null for unknown / network / parse errors. */
  error_code: RedeemErrorCode | null;
  /** User-facing message, ready to render. */
  message: string;
}

/**
 * Map a backend `error_code` to user-friendly copy. Unknown codes (and
 * network errors that never reach the backend) render the generic fallback.
 */
const ERROR_MESSAGES: Record<RedeemErrorCode, string> = {
  code_not_found: "We couldn't find that code. Check for typos and try again.",
  code_expired: 'This code has expired.',
  code_exhausted: 'This code has reached its usage limit.',
  code_bound_to_other_user: 'This code is reserved for a different account.',
  code_already_redeemed: "You've already redeemed this code.",
  code_blocked_active_subscription:
    'You have an active subscription. Cancel it first or wait until it ends to redeem a code.',
  code_plan_unavailable:
    'This code references a plan that is no longer available. Contact support.',
};

const GENERIC_FALLBACK = 'Something went wrong. Please try again.';

function isKnownErrorCode(value: unknown): value is RedeemErrorCode {
  return typeof value === 'string' && value in ERROR_MESSAGES;
}

/**
 * Extract the typed `RedeemError` from a thrown ApiError or unknown error.
 * The backend wraps the error in `{ detail: { error_code, message } }` per
 * FastAPI's HTTPException convention.
 */
export function parseRedeemError(caught: unknown): RedeemError {
  const body = caught instanceof ApiError ? caught.body : null;
  if (body && typeof body === 'object') {
    const detail = (body as { detail?: unknown }).detail;
    if (detail && typeof detail === 'object') {
      const code = (detail as { error_code?: unknown }).error_code;
      if (isKnownErrorCode(code)) {
        return { error_code: code, message: ERROR_MESSAGES[code] };
      }
    }
  }
  return { error_code: null, message: GENERIC_FALLBACK };
}

export interface UseRedeemCodeResult {
  redeem: (code: string, reason?: string | null) => Promise<RedeemCodeResult>;
  loading: boolean;
  lastResult: RedeemCodeResult | null;
  lastError: RedeemError | null;
  reset: () => void;
}

/**
 * Tiny single-source-of-truth hook for `POST /v1/codes/redeem`.
 *
 * Components consume `redeem(code)` and read `loading` / `lastResult` /
 * `lastError`. The hook does not refresh user state itself: callers are
 * expected to call `useUserMe().refresh()` (or `useAccount().refresh()`)
 * after a successful redeem, so the rest of the page reflects the new
 * `comp_until` / `status` / `plan_id` / `seat_count`.
 */
export function useRedeemCode(): UseRedeemCodeResult {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<RedeemCodeResult | null>(null);
  const [lastError, setLastError] = useState<RedeemError | null>(null);

  const redeem = useCallback(
    async (code: string, reason: string | null = null): Promise<RedeemCodeResult> => {
      setLoading(true);
      setLastError(null);
      try {
        const out = await api<RedeemCodeResult>('/v1/codes/redeem', {
          method: 'POST',
          body: { code, reason },
        });
        setLastResult(out);
        return out;
      } catch (caught) {
        const parsed = parseRedeemError(caught);
        setLastError(parsed);
        throw caught;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setLastError(null);
    setLastResult(null);
  }, []);

  return { redeem, loading, lastResult, lastError, reset };
}
