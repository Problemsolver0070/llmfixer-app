import { Navigate } from 'react-router-dom';
import { useUserMe } from '@/hooks/useUserMe';

/**
 * Post-signup landing gate (Round 4, T4.3).
 *
 * Mounted at `/app/post-signup`, this is the destination that the email
 * confirmation link routes to. It reads `/v1/users/me` and routes the
 * caller to the right next surface:
 *
 *   - demo window open (referral applied at signup) -> /app/setup
 *   - trial open or active subscription              -> /app/setup
 *   - none of the above                              -> /app/billing/upgrade
 *
 * `RequireAuth` (the parent route) already handles unauthenticated and
 * unverified callers, so this component only runs once the caller has a
 * verified Supabase session.
 */
export function PostSignupGate() {
  const { loading, error, hasAccess } = useUserMe();

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          letterSpacing: '0.08em',
          color: 'var(--color-text-dim)',
        }}
      >
        Setting up your account...
      </div>
    );
  }

  if (error) {
    // Soft-fail: bounce to billing so the caller has a recoverable next
    // step. A 401 has already triggered sign-out in the api wrapper.
    return <Navigate to="/app/billing/upgrade" replace />;
  }

  if (hasAccess) {
    return <Navigate to="/app/setup" replace />;
  }
  return <Navigate to="/app/billing/upgrade" replace />;
}

export default PostSignupGate;
