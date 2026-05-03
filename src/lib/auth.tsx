import { type ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';
import { useAccount } from '@/hooks/useAccount';
import { useAdminIdleTimeout } from '@/lib/idleTimeout';
import { supabase } from '@/lib/supabase';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, emailVerified } = useSession();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <RequireAdminInner>{children}</RequireAdminInner>
    </RequireAuth>
  );
}

interface MfaState {
  loading: boolean;
  hasVerifiedFactor: boolean;
  aal: 'aal1' | 'aal2' | null;
  error: boolean;
}

function useAdminMfaGate(enabled: boolean): MfaState {
  const [state, setState] = useState<MfaState>({
    loading: enabled,
    hasVerifiedFactor: false,
    aal: null,
    error: false,
  });

  useEffect(() => {
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset gate state when admin role drops
      setState({ loading: false, hasVerifiedFactor: false, aal: null, error: false });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    (async () => {
      try {
        const [factorsRes, aalRes] = await Promise.all([
          supabase.auth.mfa.listFactors(),
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        ]);
        if (cancelled) return;
        const verified =
          (factorsRes.data?.all ?? []).some(
            (f) => f.factor_type === 'totp' && f.status === 'verified',
          );
        const currentLevel =
          (aalRes.data?.currentLevel as 'aal1' | 'aal2' | null | undefined) ?? null;
        setState({
          loading: false,
          hasVerifiedFactor: verified,
          aal: currentLevel,
          error: Boolean(factorsRes.error || aalRes.error),
        });
      } catch {
        if (cancelled) return;
        setState({ loading: false, hasVerifiedFactor: false, aal: null, error: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}

function RequireAdminInner({ children }: { children: ReactNode }) {
  const { data, loading } = useAccount();
  const location = useLocation();
  const isAdmin = data?.user.role === 'admin';
  const mfa = useAdminMfaGate(!loading && isAdmin);

  // Idle timeout is mounted unconditionally for the admin tree, but the hook
  // itself no-ops outside /app/admin/* paths.
  useAdminIdleTimeout();

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/no-such-page" replace />;
  // Guard the transitional render where useAccount just finished but the
  // useAdminMfaGate effect has not run yet: state is still { loading: false,
  // aal: null }. Without aal !== null, we'd false-redirect to /security on
  // every fresh mount of an admin route.
  if (mfa.loading || mfa.aal === null) return null;

  const here = encodeURIComponent(location.pathname + location.search);

  if (!mfa.hasVerifiedFactor) {
    return <Navigate to={`/app/account/security?return=${here}`} replace />;
  }
  if (mfa.aal !== 'aal2') {
    return <Navigate to={`/login?mfa_required=1&return=${here}`} replace />;
  }
  return <>{children}</>;
}
