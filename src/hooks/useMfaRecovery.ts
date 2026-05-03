import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

/**
 * Shape of the response from `POST /v1/account/mfa/recovery-codes/mint`.
 *
 * The plaintext codes appear here exactly once. Persist them to disk
 * (download) or clipboard before navigating away, the backend cannot
 * surface them again.
 */
export interface MintResponse {
  codes: string[];
  minted_at: string;
  invalidated_count: number;
}

/** Shape of `GET /v1/account/mfa/recovery-codes/status`. */
export interface RecoveryStatus {
  remaining: number;
  last_minted_at: string | null;
}

/** Shape of `POST /v1/auth/mfa/recovery-redeem`. */
export interface RedeemResponse {
  re_enroll_required: boolean;
  factors_deleted: number;
}

/**
 * Mint or regenerate the caller's recovery codes.
 *
 * Requires an aal2 session. The frontend handles the 403/aal2 path by
 * surfacing a TOTP step-up modal before retrying.
 */
export async function mintRecoveryCodes(): Promise<MintResponse> {
  return api<MintResponse>('/v1/account/mfa/recovery-codes/mint', {
    method: 'POST',
    body: {},
  });
}

/** Read remaining-count + last-minted-at without exposing any hashes. */
export async function fetchRecoveryStatus(): Promise<RecoveryStatus> {
  return api<RecoveryStatus>('/v1/account/mfa/recovery-codes/status');
}

/**
 * Redeem a recovery code on behalf of the caller.
 *
 * Caller is signed in (aal1 ok). On success the user's TOTP factor(s)
 * are deleted server-side; the frontend signs the user out and back
 * in so the JWT no longer asserts aal2, then routes them to
 * `/app/account/security?step=re-enroll` to set up a new factor.
 */
export async function redeemRecoveryCode(code: string): Promise<RedeemResponse> {
  return api<RedeemResponse>('/v1/auth/mfa/recovery-redeem', {
    method: 'POST',
    body: { code },
  });
}

/**
 * React hook: fetch + cache the caller's recovery-code status.
 *
 * Re-runs `fetchRecoveryStatus` whenever `key` changes (caller bumps
 * the key after a mint/regenerate so the chip updates without a page
 * reload). Errors set `error` and leave `status` at whatever the last
 * good read returned.
 */
export function useMfaRecoveryStatus(key: number = 0): {
  status: RecoveryStatus | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [status, setStatus] = useState<RecoveryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bump, setBump] = useState(0);

  const reload = useCallback(() => setBump((b) => b + 1), []);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount; pattern matches Security.tsx reload flow
    setLoading(true);
    setError(null);
    fetchRecoveryStatus()
      .then((s) => {
        if (cancelled) return;
        setStatus(s);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 403) {
          // aal2 not satisfied yet; treat as null so the page can
          // gracefully prompt the user instead of showing an error.
          setStatus(null);
          setError('mfa_required');
          return;
        }
        setError(e instanceof Error ? e.message : 'Could not load recovery status');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, bump]);

  return { status, loading, error, reload };
}
